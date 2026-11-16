import express from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import crypto from "crypto";
import jwt from "jsonwebtoken";
import { Op } from "sequelize";
import { sequelize } from "../models/db.js";
import { User } from "../models/userModel.js";
import { Order } from "../models/orderModel.js";
import { OrderItem } from "../models/orderItemModel.js";
import { Payment } from "../models/paymentModel.js";
import { Delivery, DeliveryEvent } from "../models/deliveryModel.js";

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key-change-in-production";

// ========== KITCHEN → CASHIER → RIDER WORKFLOW ==========

/** Verifies a staff token and, optionally, that the role is allowed here. */
const requireRole = (...roles) => (req, res, next) => {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) return res.status(401).json({ error: 'No token provided' });
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    if (roles.length && !roles.includes(decoded.role)) {
      return res.status(403).json({ error: 'You do not have access to this.' });
    }
    req.user = decoded;
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid token' });
  }
};

/** Append-only audit trail. Never updated, never deleted. */
const logEvent = async (orderId, deliveryId, actor, event, detail = null) => {
  try {
    await DeliveryEvent.create({
      orderId,
      deliveryId,
      actorUserId: actor?.id ?? null,
      actorRole: actor?.role ?? null,
      event,
      detail,
    });
  } catch (e) {
    console.error('Audit log failed:', e.message);
  }
};

/** An order is ready only when every one of its items is ready. */
const recomputeOrderReadiness = async (order, actor) => {
  const items = await OrderItem.findAll({ where: { orderId: order.id } });
  if (items.length === 0) return order;

  const allReady = items.every(i => i.status === 'ready');
  const anyStarted = items.some(i => i.status !== 'pending');

  let next = order.status;
  if (allReady) next = 'ready';
  else if (anyStarted) next = 'preparing';

  // Never walk an order backwards out of a later stage.
  if (['out-for-delivery', 'completed', 'cancelled'].includes(order.status)) return order;

  if (next !== order.status) {
    const from = order.status;
    await order.update({ status: next });
    await logEvent(order.id, null, actor, `order:${next}`, `from ${from}`);
  }
  return order;
};

// ---------- KITCHEN ----------

/** Orders the kitchen still has work on, with per-item state. */
router.get("/api/kitchen/orders", requireRole('kitchen', 'admin', 'cashier'), async (req, res) => {
  try {
    const orders = await Order.findAll({
      where: { status: { [Op.in]: ['pending', 'preparing', 'ready'] } },
      order: [['createdAt', 'ASC']],
      limit: 100,
    });

    const withItems = await Promise.all(orders.map(async (o) => {
      const items = await OrderItem.findAll({ where: { orderId: o.id }, order: [['id', 'ASC']] });
      return {
        id: o.id,
        orderNumber: o.orderNumber,
        customerName: o.customerName,
        orderType: o.orderType,
        source: o.source,
        tableNumber: o.tableNumber,
        notes: o.notes,
        status: o.status,
        placedAt: o.createdAt,
        allReady: items.length > 0 && items.every(i => i.status === 'ready'),
        items: items.map(i => ({
          id: i.id,
          name: i.name,
          quantity: i.quantity,
          modifiers: i.modifiers,
          status: i.status,
          readyAt: i.readyAt,
        })),
      };
    }));

    res.json({ orders: withItems });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/** Moves one item along pending → preparing → ready. */
router.put("/api/kitchen/items/:itemId/status", requireRole('kitchen', 'admin'), async (req, res) => {
  try {
    const { status } = req.body;
    if (!['pending', 'preparing', 'ready'].includes(status)) {
      return res.status(400).json({ error: 'Invalid item status.' });
    }

    const item = await OrderItem.findByPk(req.params.itemId);
    if (!item) return res.status(404).json({ error: 'Item not found.' });

    const order = await Order.findByPk(item.orderId);
    if (!order) return res.status(404).json({ error: 'Order not found.' });
    if (['completed', 'cancelled', 'out-for-delivery'].includes(order.status)) {
      return res.status(409).json({ error: 'That order has already left the kitchen.' });
    }

    await item.update({
      status,
      readyAt: status === 'ready' ? new Date() : null,
      preparedById: status === 'ready' ? req.user.id : item.preparedById,
    });
    await logEvent(order.id, null, req.user, `item:${status}`, `${item.name} ×${item.quantity}`);

    await recomputeOrderReadiness(order, req.user);
    const refreshed = await Order.findByPk(order.id);
    const items = await OrderItem.findAll({ where: { orderId: order.id } });

    res.json({
      orderStatus: refreshed.status,
      allReady: items.every(i => i.status === 'ready'),
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ---------- CASHIER ----------

/** Orders whose items are all ready and which still need the cashier. */
router.get("/api/cashier/ready-orders", requireRole('cashier', 'admin'), async (req, res) => {
  try {
    const orders = await Order.findAll({
      where: { status: 'ready' },
      order: [['createdAt', 'ASC']],
      limit: 100,
    });

    const rows = await Promise.all(orders.map(async (o) => {
      const items = await OrderItem.findAll({ where: { orderId: o.id } });
      const payment = await Payment.findOne({ where: { orderId: o.id } });
      const delivery = await Delivery.findOne({ where: { orderId: o.id } });
      let rider = null;
      if (delivery) rider = await User.findByPk(delivery.riderId);

      return {
        id: o.id,
        orderNumber: o.orderNumber,
        customerName: o.customerName,
        customerPhone: o.customerPhone,
        orderType: o.orderType,
        tableNumber: o.tableNumber,
        deliveryAddress: o.deliveryAddress,
        total: o.total,
        placedAt: o.createdAt,
        itemCount: items.reduce((n, i) => n + i.quantity, 0),
        allReady: items.length > 0 && items.every(i => i.status === 'ready'),
        payment: payment
          ? { method: payment.method, provider: payment.provider, reference: payment.reference, status: payment.status }
          : null,
        delivery: delivery
          ? {
              id: delivery.id,
              status: delivery.status,
              assignedAt: delivery.assignedAt,
              rider: rider ? { id: rider.id, name: rider.name, phone: rider.phone } : null,
            }
          : null,
      };
    }));

    res.json({ orders: rows });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/** Riders the cashier may assign right now. */
router.get("/api/cashier/available-riders", requireRole('cashier', 'admin'), async (req, res) => {
  try {
    const riders = await User.findAll({
      where: { role: 'rider', status: 'approved', availability: 'available' },
      order: [['name', 'ASC']],
    });
    res.json({ riders: riders.map(r => ({ id: r.id, name: r.name, phone: r.phone || '' })) });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/** Assigns a delivery order to an available rider. */
router.post("/api/cashier/orders/:orderId/assign-rider", requireRole('cashier', 'admin'), async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const { riderId } = req.body;
    const order = await Order.findByPk(req.params.orderId, { transaction: t });
    if (!order) { await t.rollback(); return res.status(404).json({ error: 'Order not found.' }); }

    if (order.orderType !== 'delivery') {
      await t.rollback();
      return res.status(400).json({ error: 'Only delivery orders can be assigned to a rider.' });
    }

    // Rule 1: nothing may leave the kitchen before every item is ready.
    const items = await OrderItem.findAll({ where: { orderId: order.id }, transaction: t });
    if (items.length === 0 || !items.every(i => i.status === 'ready')) {
      await t.rollback();
      return res.status(409).json({ error: 'All items must be ready before assigning a rider.' });
    }

    const existing = await Delivery.findOne({ where: { orderId: order.id }, transaction: t });
    if (existing) {
      await t.rollback();
      return res.status(409).json({ error: 'This order already has a rider assigned.' });
    }

    const rider = await User.findByPk(riderId, { transaction: t });
    if (!rider || rider.role !== 'rider') {
      await t.rollback();
      return res.status(400).json({ error: 'That rider does not exist.' });
    }
    // Rule 1 again: never assign to someone unavailable or deactivated.
    if (rider.status !== 'approved' || rider.availability !== 'available') {
      await t.rollback();
      return res.status(409).json({ error: `${rider.name} is not available right now.` });
    }

    const delivery = await Delivery.create({
      orderId: order.id,
      riderId: rider.id,
      assignedByUserId: req.user.id,
      status: 'assigned',
      assignedAt: new Date(),
    }, { transaction: t });

    await rider.update({ availability: 'on-delivery' }, { transaction: t });
    await t.commit();

    await logEvent(order.id, delivery.id, req.user, 'delivery:assigned', `to ${rider.name}`);
    res.status(201).json({ delivery: { id: delivery.id, riderId: rider.id, riderName: rider.name } });
  } catch (error) {
    await t.rollback();
    res.status(500).json({ error: error.message });
  }
});

/** Hands a non-delivery order to the customer. */
router.post("/api/cashier/orders/:orderId/complete", requireRole('cashier', 'admin'), async (req, res) => {
  try {
    const order = await Order.findByPk(req.params.orderId);
    if (!order) return res.status(404).json({ error: 'Order not found.' });

    const items = await OrderItem.findAll({ where: { orderId: order.id } });
    if (items.length === 0 || !items.every(i => i.status === 'ready')) {
      return res.status(409).json({ error: 'All items must be ready first.' });
    }
    if (order.orderType === 'delivery') {
      return res.status(400).json({ error: 'Delivery orders are completed by the rider.' });
    }

    await order.update({ status: 'completed', completedAt: new Date() });
    await logEvent(order.id, null, req.user, 'order:completed', 'handed to customer');
    res.json({ ok: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ---------- RIDER ----------

const UPLOAD_DIR = path.join(process.cwd(), "public", "uploads", "pod");
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const ALLOWED = { 'image/jpeg': '.jpg', 'image/png': '.png', 'image/webp': '.webp' };
const podUpload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => cb(null, UPLOAD_DIR),
    filename: (req, file, cb) => {
      const ext = ALLOWED[file.mimetype] || '.jpg';
      cb(null, `pod-${Date.now()}-${crypto.randomBytes(6).toString('hex')}${ext}`);
    },
  }),
  limits: { fileSize: 6 * 1024 * 1024, files: 1 },
  fileFilter: (req, file, cb) => {
    if (!ALLOWED[file.mimetype]) return cb(new Error('Proof must be a JPG, PNG or WebP photo.'));
    cb(null, true);
  },
});

/** Rider's own deliveries. Scoped by token id — never by a client-supplied id. */
router.get("/api/rider/deliveries", requireRole('rider'), async (req, res) => {
  try {
    const active = await Delivery.findAll({
      where: { riderId: req.user.id, status: { [Op.in]: ['assigned', 'out-for-delivery'] } },
      order: [['assignedAt', 'ASC']],
    });
    const history = await Delivery.findAll({
      where: { riderId: req.user.id, status: 'delivered' },
      order: [['deliveredAt', 'DESC']],
      limit: 30,
    });

    const shape = async (d) => {
      const o = await Order.findByPk(d.orderId);
      const items = await OrderItem.findAll({ where: { orderId: d.orderId } });
      return {
        deliveryId: d.id,
        status: d.status,
        assignedAt: d.assignedAt,
        startedAt: d.startedAt,
        deliveredAt: d.deliveredAt,
        proofPhotoUrl: d.proofPhotoUrl,
        order: o && {
          orderNumber: o.orderNumber,
          customerName: o.customerName,
          customerPhone: o.customerPhone,
          deliveryAddress: o.deliveryAddress,
          deliveryLat: o.deliveryLat != null ? Number(o.deliveryLat) : null,
          deliveryLng: o.deliveryLng != null ? Number(o.deliveryLng) : null,
          total: o.total,
          notes: o.notes,
          items: items.map(i => ({ name: i.name, quantity: i.quantity })),
        },
      };
    };

    const me = await User.findByPk(req.user.id);
    res.json({
      availability: me?.availability ?? 'offline',
      active: await Promise.all(active.map(shape)),
      history: await Promise.all(history.map(shape)),
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/** assigned → out-for-delivery. The only forward move a rider may make here. */
router.post("/api/rider/deliveries/:id/start", requireRole('rider'), async (req, res) => {
  try {
    const delivery = await Delivery.findOne({ where: { id: req.params.id, riderId: req.user.id } });
    if (!delivery) return res.status(404).json({ error: 'Delivery not found.' });
    if (delivery.status !== 'assigned') {
      return res.status(409).json({ error: 'This delivery has already been started.' });
    }

    await delivery.update({ status: 'out-for-delivery', startedAt: new Date() });

    const order = await Order.findByPk(delivery.orderId);
    if (order && !['completed', 'cancelled'].includes(order.status)) {
      await order.update({ status: 'out-for-delivery', outForDeliveryAt: new Date(), riderName: req.user.name });
    }
    await logEvent(delivery.orderId, delivery.id, req.user, 'delivery:started');

    res.json({ ok: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * out-for-delivery → delivered, with proof.
 *
 * Rule 5: the photo is required. Rule 6: a delivered record is never rewritten.
 */
router.post("/api/rider/deliveries/:id/deliver", requireRole('rider'), (req, res) => {
  podUpload.single('proof')(req, res, async (err) => {
    if (err) {
      const message = err.code === 'LIMIT_FILE_SIZE'
        ? 'That photo is larger than 6MB.'
        : err.message || 'Upload failed.';
      return res.status(400).json({ error: message });
    }

    const cleanup = () => { if (req.file) fs.unlink(req.file.path, () => {}); };

    try {
      const delivery = await Delivery.findOne({ where: { id: req.params.id, riderId: req.user.id } });
      if (!delivery) { cleanup(); return res.status(404).json({ error: 'Delivery not found.' }); }

      if (delivery.status === 'delivered') {
        cleanup();
        return res.status(409).json({ error: 'This delivery is already recorded as delivered.' });
      }
      if (delivery.status !== 'out-for-delivery') {
        cleanup();
        return res.status(409).json({ error: 'Start the delivery before marking it delivered.' });
      }
      if (!req.file) {
        return res.status(400).json({ error: 'A proof-of-delivery photo is required.' });
      }

      const lat = Number(req.body.lat);
      const lng = Number(req.body.lng);
      const hasFix = Number.isFinite(lat) && Number.isFinite(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180;

      await delivery.update({
        status: 'delivered',
        deliveredAt: new Date(),
        proofPhotoUrl: `/uploads/pod/${req.file.filename}`,
        proofLat: hasFix ? lat : null,
        proofLng: hasFix ? lng : null,
        notes: req.body.notes ? String(req.body.notes).trim().slice(0, 500) : null,
      });

      const order = await Order.findByPk(delivery.orderId);
      if (order) await order.update({ status: 'completed', completedAt: new Date() });

      // Rule 10: the rider frees up again automatically.
      const rider = await User.findByPk(req.user.id);
      if (rider) await rider.update({ availability: 'available' });

      await logEvent(delivery.orderId, delivery.id, req.user, 'delivery:delivered',
        hasFix ? `at ${lat.toFixed(5)},${lng.toFixed(5)}` : 'no location fix');

      res.json({ ok: true, proofPhotoUrl: delivery.proofPhotoUrl });
    } catch (error) {
      cleanup();
      res.status(500).json({ error: error.message });
    }
  });
});

/** Rider toggles their own availability between available and offline. */
router.put("/api/rider/availability", requireRole('rider'), async (req, res) => {
  try {
    const { availability } = req.body;
    if (!['available', 'offline'].includes(availability)) {
      return res.status(400).json({ error: 'You can only set yourself available or offline.' });
    }
    const rider = await User.findByPk(req.user.id);
    if (!rider) return res.status(404).json({ error: 'Account not found.' });

    // Never let a rider go offline mid-delivery and disappear from the board.
    if (rider.availability === 'on-delivery') {
      return res.status(409).json({ error: 'Finish your current delivery first.' });
    }
    await rider.update({ availability });
    res.json({ availability: rider.availability });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Receipt for one order.
 *
 * Readable by the rider carrying it, by staff, and by the customer who placed
 * it — each proven from their own token, never from a query parameter. Amounts
 * come from the stored order lines, so a receipt always reflects what was
 * actually charged.
 */
router.get("/api/receipts/:orderNumber", async (req, res) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];
    let actor = null;
    try { actor = token ? jwt.verify(token, JWT_SECRET) : null; } catch { actor = null; }
    if (!actor) return res.status(401).json({ error: 'Sign in to view this receipt.' });

    const order = await Order.findOne({ where: { orderNumber: req.params.orderNumber } });
    if (!order) return res.status(404).json({ error: 'Order not found.' });

    const delivery = await Delivery.findOne({ where: { orderId: order.id } });

    // Who may see it: staff, the assigned rider, or the customer who ordered.
    const isStaff = ['admin', 'cashier', 'kitchen'].includes(actor.role);
    const isTheRider = actor.role === 'rider' && delivery && delivery.riderId === actor.id;
    const isTheCustomer = actor.role === 'customer' && order.customerUserId === actor.id;
    if (!isStaff && !isTheRider && !isTheCustomer) {
      return res.status(404).json({ error: 'Order not found.' });
    }

    const items = await OrderItem.findAll({ where: { orderId: order.id }, order: [['id', 'ASC']] });
    const payment = await Payment.findOne({ where: { orderId: order.id } });
    const rider = delivery ? await User.findByPk(delivery.riderId) : null;
    const cashier = order.cashierId ? await User.findByPk(order.cashierId) : null;

    res.json({
      receipt: {
        orderNumber: order.orderNumber,
        source: order.source,
        cashierName: cashier?.name ?? null,
        placedAt: order.createdAt,
        completedAt: order.completedAt,
        status: order.status,
        orderType: order.orderType,
        tableNumber: order.tableNumber,
        customerName: order.customerName,
        customerPhone: order.customerPhone,
        deliveryAddress: order.deliveryAddress,
        notes: order.notes,
        items: items.map(i => ({
          name: i.name,
          quantity: i.quantity,
          price: Number(i.price),
          total: Number(i.total),
          modifiers: i.modifiers,
        })),
        subtotal: Number(order.subtotal),
        discount: Number(order.discount),
        total: Number(order.total),
        payment: payment ? {
          method: payment.method,
          provider: payment.provider,
          reference: payment.reference,
          status: payment.status,
          amount: Number(payment.amount),
          // Only meaningful for cash already tendered at the counter.
          amountReceived: payment.amountReceived != null ? Number(payment.amountReceived) : null,
          change: payment.change != null ? Number(payment.change) : null,
        } : null,
        delivery: delivery ? {
          status: delivery.status,
          riderName: rider?.name ?? null,
          riderPhone: rider?.phone ?? null,
          assignedAt: delivery.assignedAt,
          startedAt: delivery.startedAt,
          deliveredAt: delivery.deliveredAt,
          proofPhotoUrl: delivery.proofPhotoUrl,
          proofLat: delivery.proofLat != null ? Number(delivery.proofLat) : null,
          proofLng: delivery.proofLng != null ? Number(delivery.proofLng) : null,
        } : null,
      },
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ---------- ADMIN ----------

/** Full delivery history with proof, for audit. */
router.get("/api/admin/deliveries", requireRole('admin', 'cashier'), async (req, res) => {
  try {
    const rows = await Delivery.findAll({ order: [['assignedAt', 'DESC']], limit: 200 });
    const out = await Promise.all(rows.map(async (d) => {
      const o = await Order.findByPk(d.orderId);
      const rider = await User.findByPk(d.riderId);
      return {
        deliveryId: d.id,
        orderNumber: o?.orderNumber ?? null,
        customerName: o?.customerName ?? null,
        deliveryAddress: o?.deliveryAddress ?? null,
        total: o?.total ?? null,
        rider: rider ? { id: rider.id, name: rider.name, phone: rider.phone } : null,
        status: d.status,
        assignedAt: d.assignedAt,
        startedAt: d.startedAt,
        deliveredAt: d.deliveredAt,
        proofPhotoUrl: d.proofPhotoUrl,
        proofLat: d.proofLat != null ? Number(d.proofLat) : null,
        proofLng: d.proofLng != null ? Number(d.proofLng) : null,
      };
    }));
    res.json({ deliveries: out });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/** Audit trail for one order. */
router.get("/api/admin/orders/:orderId/events", requireRole('admin', 'cashier'), async (req, res) => {
  try {
    const events = await DeliveryEvent.findAll({
      where: { orderId: req.params.orderId },
      order: [['createdAt', 'ASC']],
    });
    res.json({ events });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/** Admin manages rider accounts. */
router.get("/api/admin/riders", requireRole('admin'), async (req, res) => {
  try {
    const riders = await User.findAll({ where: { role: 'rider' }, order: [['name', 'ASC']] });
    res.json({
      riders: riders.map(r => ({
        id: r.id, name: r.name, email: r.email, phone: r.phone || '',
        status: r.status, availability: r.availability,
      })),
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.put("/api/admin/riders/:id", requireRole('admin'), async (req, res) => {
  try {
    const rider = await User.findByPk(req.params.id);
    if (!rider || rider.role !== 'rider') return res.status(404).json({ error: 'Rider not found.' });

    const { name, phone, status, availability } = req.body;
    if (name !== undefined) rider.name = String(name).trim() || rider.name;
    if (phone !== undefined) rider.phone = String(phone).trim() || null;
    if (status !== undefined && ['approved', 'inactive', 'rejected'].includes(status)) rider.status = status;
    if (availability !== undefined && ['available', 'offline', 'inactive'].includes(availability)) {
      if (rider.availability === 'on-delivery') {
        return res.status(409).json({ error: 'That rider is mid-delivery.' });
      }
      rider.availability = availability;
    }
    await rider.save();
    res.json({ ok: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
