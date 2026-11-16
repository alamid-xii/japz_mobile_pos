import express from "express";
import jwt from "jsonwebtoken";
import QRCode from "qrcode";
import { Op } from "sequelize";
import { Order } from "../models/orderModel.js";
import { OrderItem } from "../models/orderItemModel.js";
import { MenuItem } from "../models/menuItemModel.js";
import { Payment } from "../models/paymentModel.js";
import { PaymentSession } from "../models/paymentSessionModel.js";
import { verifyCustomer } from "./customerAuth.js";
import * as paymongo from "../services/paymongoService.js";

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key-change-in-production";

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

/** Where PayMongo sends the customer back to. */
const appOrigin = (req) =>
  (process.env.APP_ORIGIN || req.headers.origin || `${req.protocol}://${req.get('host')}`).replace(/\/$/, '');

// ========== SETTLEMENT ==========

/**
 * Marks a session paid, and only then lets the order into the kitchen queue.
 *
 * Idempotent on purpose: the webhook and the customer's return trip race each
 * other, and PayMongo retries webhooks. Whichever arrives first settles the
 * order; the rest are no-ops.
 */
const settleSession = async (session, info, via) => {
  if (session.status === 'paid') return { alreadySettled: true };

  await session.update({
    status: 'paid',
    paymentId: info.paymentId ?? null,
    paidMethod: info.method ?? null,
    paidAt: new Date(),
    confirmedVia: via,
  });

  const order = await Order.findByPk(session.orderId);
  if (!order) return { alreadySettled: false, order: null };

  const payment = await Payment.findOne({ where: { orderId: order.id } });
  if (payment) {
    await payment.update({
      status: 'completed',
      gatewayPaymentId: info.paymentId ?? null,
      paidAt: new Date(),
      provider: info.method === 'gcash' ? 'GCash' : (info.method || 'PayMongo'),
      amountReceived: order.total,
      change: 0,
    });
  }

  // The only place an order leaves awaiting-payment. Anything further along was
  // already released by an earlier confirmation, so it is left alone.
  if (order.status === 'awaiting-payment') {
    await order.update({ status: 'pending' });
  }
  return { alreadySettled: false, order };
};

/** Releases the stock an abandoned or failed checkout was holding. */
const failSession = async (session, reason, status = 'failed') => {
  if (session.status === 'paid') return false;
  await session.update({ status, lastError: reason ? String(reason).slice(0, 255) : null });

  const order = await Order.findByPk(session.orderId);
  if (!order || order.status !== 'awaiting-payment') return false;

  // Another attempt may still be running for this order; only release when
  // nothing else is outstanding.
  const stillOpen = await PaymentSession.count({
    where: { orderId: order.id, status: 'pending', id: { [Op.ne]: session.id } },
  });
  if (stillOpen > 0) return false;

  const items = await OrderItem.findAll({ where: { orderId: order.id } });
  for (const it of items) {
    if (!it.menuItemId) continue;
    const menuItem = await MenuItem.findByPk(it.menuItemId);
    if (menuItem?.trackStock && menuItem.stock !== null) {
      await menuItem.update({ stock: menuItem.stock + it.quantity });
    }
  }
  await order.update({ status: 'cancelled' });
  await Payment.update({ status: 'failed' }, { where: { orderId: order.id } });
  return true;
};

/**
 * Asks PayMongo directly what happened. Used when the customer returns from
 * checkout and as the fallback wherever webhooks cannot reach this server —
 * which is every local machine without a public URL.
 */
const reconcile = async (session) => {
  if (session.status === 'paid') return { paid: true, settled: false };
  try {
    const info = await paymongo.retrieveCheckoutSession(session.sessionId);
    if (info.paid) {
      await settleSession(session, info, 'readback');
      return { paid: true, settled: true };
    }
    if (info.sessionStatus === 'expired') {
      await failSession(session, 'Checkout session expired.', 'expired');
      return { paid: false, expired: true };
    }
    return { paid: false };
  } catch (err) {
    return { paid: false, error: err.message };
  }
};

// ========== WEBHOOK ==========

/**
 * PayMongo's callback. This is the authoritative confirmation: a customer who
 * pays and immediately closes the tab never triggers the return trip, so the
 * order would otherwise sit unpaid forever.
 *
 * Always answers 200 once the signature checks out — a non-2xx makes PayMongo
 * retry, and a bug of ours is not a reason to be re-sent the same event.
 */
router.post("/api/payments/webhook", async (req, res) => {
  const check = paymongo.verifyWebhookSignature(req.rawBody, req.headers['paymongo-signature']);
  if (!check.ok) {
    console.warn('PayMongo webhook rejected:', check.reason);
    return res.status(401).json({ error: 'Invalid signature' });
  }

  try {
    const event = req.body?.data?.attributes ?? {};
    const type = event.type;
    const resource = event.data ?? {};
    const attrs = resource.attributes ?? {};

    // The reference number is our own order number, set when the session was
    // created. Metadata is the fallback for payment.* events.
    const reference =
      attrs.reference_number
      ?? attrs.metadata?.orderNumber
      ?? attrs.payment_intent?.attributes?.metadata?.orderNumber
      ?? null;

    let session = null;
    if (resource.id) session = await PaymentSession.findOne({ where: { sessionId: resource.id } });
    if (!session && reference) {
      session = await PaymentSession.findOne({
        where: { orderNumber: reference, status: 'pending' },
        order: [['createdAt', 'DESC']],
      });
    }

    if (!session) {
      console.warn('PayMongo webhook for unknown session:', type, resource.id, reference);
      return res.json({ received: true });
    }

    if (type === 'checkout_session.payment.paid' || type === 'payment.paid') {
      const payments = attrs.payments || [];
      const paid = payments.find(p => p?.attributes?.status === 'paid');
      await settleSession(session, {
        paymentId: paid?.id ?? (type === 'payment.paid' ? resource.id : null),
        method: paid?.attributes?.source?.type ?? attrs.source?.type ?? null,
      }, 'webhook');
      console.log(`PayMongo: ${session.orderNumber} paid (${type})`);
    } else if (type === 'payment.failed') {
      await failSession(session, attrs.last_payment_error || 'Payment failed.');
      console.log(`PayMongo: ${session.orderNumber} failed`);
    }

    res.json({ received: true });
  } catch (error) {
    // Signature was valid, so the event is genuine; swallow our own failure
    // rather than inviting an endless retry loop.
    console.error('PayMongo webhook handler error:', error.message);
    res.json({ received: true });
  }
});

// ========== SHARED CHECKOUT CREATION ==========

const startCheckout = async ({ order, methods, source, actorUserId, origin, customerEmail }) => {
  if (!paymongo.isConfigured()) {
    return { error: 'Online payment is not set up yet.', status: 503 };
  }
  if (order.status !== 'awaiting-payment') {
    return { error: 'That order is not waiting for payment.', status: 409 };
  }

  const centavos = paymongo.toCentavos(order.total);
  const min = paymongo.minimumCentavos();
  if (min > 0 && centavos < min) {
    return {
      error: `Online payment needs at least ₱${(min / 100).toFixed(2)}. Please choose cash for this order.`,
      status: 400,
    };
  }

  // Any earlier attempt is abandoned before a new one starts, so a stale link
  // cannot be paid after the customer has moved on.
  const previous = await PaymentSession.findAll({ where: { orderId: order.id, status: 'pending' } });
  for (const p of previous) {
    try { await paymongo.expireCheckoutSession(p.sessionId); } catch { /* already gone */ }
    await p.update({ status: 'cancelled', lastError: 'Replaced by a newer attempt.' });
  }

  const items = await OrderItem.findAll({ where: { orderId: order.id }, order: [['id', 'ASC']] });

  // One line per order item. PayMongo re-adds the quantities itself, so the
  // total shown on their page must match ours exactly.
  const lineItems = items.map(i => ({
    name: i.name,
    amount: Number(i.total) / i.quantity,
    quantity: i.quantity,
  }));

  const sum = lineItems.reduce((n, l) => n + paymongo.toCentavos(l.amount) * l.quantity, 0);
  if (sum !== centavos) {
    // A discount or rounding difference would make PayMongo charge a different
    // amount from the order total. Charge one line for the true total instead.
    lineItems.length = 0;
    lineItems.push({ name: `Order ${order.orderNumber}`, amount: Number(order.total), quantity: 1 });
  }

  try {
    const session = await paymongo.createCheckoutSession({
      lineItems,
      referenceNumber: order.orderNumber,
      description: `JAPZ Grill order ${order.orderNumber}`,
      successUrl: `${origin}/japz/pay/return?order=${encodeURIComponent(order.orderNumber)}`,
      cancelUrl: `${origin}/japz/pay/return?order=${encodeURIComponent(order.orderNumber)}&cancelled=1`,
      methods,
      metadata: { orderNumber: order.orderNumber, source },
      customerEmail,
    });

    if (!session.id || !session.checkoutUrl) {
      return { error: 'PayMongo did not return a checkout link.', status: 502 };
    }

    const row = await PaymentSession.create({
      orderId: order.id,
      orderNumber: order.orderNumber,
      sessionId: session.id,
      checkoutUrl: session.checkoutUrl,
      amount: centavos,
      methods: (methods || paymongo.enabledMethods()).join(','),
      source,
      createdByUserId: actorUserId ?? null,
    });

    return { session: row };
  } catch (err) {
    return { error: err.message || 'Could not start the payment.', status: err.status === 400 ? 400 : 502 };
  }
};

// ========== PUBLIC (customer) ==========

/** What the storefront should offer. Safe to call signed out. */
router.get("/api/public/payments/config", (req, res) => {
  res.json({
    enabled: paymongo.isConfigured(),
    testMode: paymongo.isTestMode(),
    methods: paymongo.isConfigured() ? paymongo.enabledMethods() : [],
    minimumAmount: paymongo.minimumCentavos() / 100,
  });
});

router.post("/api/public/payments/checkout", verifyCustomer, async (req, res) => {
  try {
    const order = await Order.findOne({
      where: { orderNumber: String(req.body.orderNumber || ''), customerUserId: req.customer.id },
    });
    if (!order) return res.status(404).json({ error: 'Order not found.' });

    const wanted = String(req.body.method || '').toLowerCase();
    const methods = paymongo.enabledMethods().includes(wanted) ? [wanted] : paymongo.enabledMethods();

    const out = await startCheckout({
      order,
      methods,
      source: 'online',
      origin: appOrigin(req),
      customerEmail: req.customer.email,
    });
    if (out.error) return res.status(out.status).json({ error: out.error });

    res.json({ checkoutUrl: out.session.checkoutUrl, sessionId: out.session.sessionId });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/** Server-side confirmation. The redirect is only a hint to come and ask. */
router.get("/api/public/payments/status/:orderNumber", verifyCustomer, async (req, res) => {
  try {
    const order = await Order.findOne({
      where: { orderNumber: req.params.orderNumber, customerUserId: req.customer.id },
    });
    if (!order) return res.status(404).json({ error: 'Order not found.' });

    const session = await PaymentSession.findOne({
      where: { orderId: order.id },
      order: [['createdAt', 'DESC']],
    });
    if (session) await reconcile(session);

    const fresh = await Order.findByPk(order.id);
    const freshSession = session ? await PaymentSession.findByPk(session.id) : null;

    res.json({
      orderNumber: fresh.orderNumber,
      orderStatus: fresh.status,
      paid: freshSession?.status === 'paid',
      paymentStatus: freshSession?.status ?? 'none',
      confirmedVia: freshSession?.confirmedVia ?? null,
      checkoutUrl: freshSession?.status === 'pending' ? freshSession.checkoutUrl : null,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/** Customer walks away from an unpaid order and frees the stock. */
router.post("/api/public/payments/cancel/:orderNumber", verifyCustomer, async (req, res) => {
  try {
    const order = await Order.findOne({
      where: { orderNumber: req.params.orderNumber, customerUserId: req.customer.id },
    });
    if (!order) return res.status(404).json({ error: 'Order not found.' });
    if (order.status !== 'awaiting-payment') {
      return res.status(409).json({ error: 'That order can no longer be cancelled here.' });
    }

    const sessions = await PaymentSession.findAll({ where: { orderId: order.id, status: 'pending' } });
    for (const s of sessions) {
      // Confirm nothing was paid in the meantime before releasing anything.
      const check = await reconcile(s);
      if (check.paid) return res.json({ ok: false, paid: true });
      try { await paymongo.expireCheckoutSession(s.sessionId); } catch { /* already gone */ }
      await failSession(s, 'Cancelled by the customer.', 'cancelled');
    }
    res.json({ ok: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ========== POS (cashier) ==========

/**
 * Cashier starts a gateway payment for an order at the counter. Returns a QR
 * of the checkout link for the customer to scan with their own phone.
 */
router.post("/api/payments/pos/checkout", requireRole('cashier', 'admin'), async (req, res) => {
  try {
    const order = await Order.findOne({ where: { orderNumber: String(req.body.orderNumber || '') } });
    if (!order) return res.status(404).json({ error: 'Order not found.' });

    const wanted = String(req.body.method || '').toLowerCase();
    const methods = paymongo.enabledMethods().includes(wanted) ? [wanted] : paymongo.enabledMethods();

    const out = await startCheckout({
      order, methods, source: 'pos', actorUserId: req.user.id, origin: appOrigin(req),
    });
    if (out.error) return res.status(out.status).json({ error: out.error });

    const qr = await QRCode.toDataURL(out.session.checkoutUrl, { width: 320, margin: 1 });
    res.json({
      checkoutUrl: out.session.checkoutUrl,
      sessionId: out.session.sessionId,
      qr,
      amount: Number(order.total),
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get("/api/payments/pos/status/:orderNumber", requireRole('cashier', 'admin'), async (req, res) => {
  try {
    const order = await Order.findOne({ where: { orderNumber: req.params.orderNumber } });
    if (!order) return res.status(404).json({ error: 'Order not found.' });

    const session = await PaymentSession.findOne({
      where: { orderId: order.id },
      order: [['createdAt', 'DESC']],
    });
    if (session) await reconcile(session);

    const fresh = await Order.findByPk(order.id);
    const freshSession = session ? await PaymentSession.findByPk(session.id) : null;
    res.json({
      orderStatus: fresh.status,
      paid: freshSession?.status === 'paid',
      paymentStatus: freshSession?.status ?? 'none',
      confirmedVia: freshSession?.confirmedVia ?? null,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/** Cashier abandons a counter payment the customer decided against. */
router.post("/api/payments/pos/cancel/:orderNumber", requireRole('cashier', 'admin'), async (req, res) => {
  try {
    const order = await Order.findOne({ where: { orderNumber: req.params.orderNumber } });
    if (!order) return res.status(404).json({ error: 'Order not found.' });

    const sessions = await PaymentSession.findAll({ where: { orderId: order.id, status: 'pending' } });
    for (const s of sessions) {
      const check = await reconcile(s);
      if (check.paid) return res.json({ ok: false, paid: true });
      try { await paymongo.expireCheckoutSession(s.sessionId); } catch { /* already gone */ }
      await failSession(s, 'Cancelled at the counter.', 'cancelled');
    }
    res.json({ ok: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/** Admin/cashier view of gateway attempts, for reconciliation. */
router.get("/api/payments/sessions", requireRole('admin', 'cashier'), async (req, res) => {
  try {
    const rows = await PaymentSession.findAll({ order: [['createdAt', 'DESC']], limit: 200 });
    res.json({
      sessions: rows.map(s => ({
        id: s.id,
        orderNumber: s.orderNumber,
        amount: s.amount / 100,
        status: s.status,
        source: s.source,
        methods: s.methods,
        paymentId: s.paymentId,
        paidMethod: s.paidMethod,
        paidAt: s.paidAt,
        confirmedVia: s.confirmedVia,
        lastError: s.lastError,
        createdAt: s.createdAt,
      })),
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
