import express from "express";
import axios from "axios";
import jwt from "jsonwebtoken";
import { sequelize } from "../models/db.js";
import { MenuItem } from "../models/menuItemModel.js";
import { User } from "../models/userModel.js";
import { Order } from "../models/orderModel.js";
import { OrderItem } from "../models/orderItemModel.js";
import { Payment } from "../models/paymentModel.js";
import { BusinessHours } from "../models/businessHoursModel.js";
import * as paymongo from "../services/paymongoService.js";
import { Discount } from "../models/discountModel.js";
import { Voucher } from "../models/voucherModel.js";
import { Op } from "sequelize";
import { verifyCustomer } from "./customerAuth.js";
import { CustomerAddress } from "../models/customerAddressModel.js";
import { Feedback } from "../models/feedbackModel.js";
import { buildFeedbackAnalysis } from "../services/feedbackService.js";

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key-change-in-production";

// ========== ONLINE (CUSTOMER SELF-SERVICE) ORDERING ==========
// Menu and status are open; placing and viewing orders requires a customer account.
// Because anyone can call them, nothing price-related is taken from the
// request body — every amount is recomputed from the database.

const ONLINE_ORDER_MAX_ITEMS = 50;
const ONLINE_ORDER_MAX_QTY_PER_ITEM = 20;

// Simple in-memory throttle, keyed by client IP. Enough to stop a runaway
// script or a double-tapped submit button; not a substitute for a real
// rate limiter behind a proxy.
const submissionTimes = new Map();
const THROTTLE_WINDOW_MS = 60 * 1000;
const THROTTLE_MAX = 5;

const throttle = (req, res, next) => {
  const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.socket.remoteAddress || 'unknown';
  const now = Date.now();
  const recent = (submissionTimes.get(ip) || []).filter(t => now - t < THROTTLE_WINDOW_MS);
  if (recent.length >= THROTTLE_MAX) {
    return res.status(429).json({ error: 'Too many orders placed. Please wait a moment and try again.' });
  }
  recent.push(now);
  submissionTimes.set(ip, recent);
  next();
};

// Drop stale throttle entries so the map cannot grow without bound.
setInterval(() => {
  const now = Date.now();
  for (const [ip, times] of submissionTimes) {
    const recent = times.filter(t => now - t < THROTTLE_WINDOW_MS);
    if (recent.length === 0) submissionTimes.delete(ip);
    else submissionTimes.set(ip, recent);
  }
}, THROTTLE_WINDOW_MS).unref();

// Resolve the unit price for a line, honouring size variants.
// Returns { price, label } or { error }.
const resolveLinePrice = (menuItem, modifiers) => {
  const base = Number(menuItem.price || 0);
  if (!menuItem.hasSize) return { price: base };

  const sizes = Array.isArray(menuItem.sizes) ? menuItem.sizes : [];
  if (sizes.length === 0) return { price: base };

  const wanted = modifiers?.size;
  if (!wanted) return { error: `Please choose a size for ${menuItem.name}` };

  // Sizes are stored either as objects or as "Large - ₱120" strings.
  for (const s of sizes) {
    if (typeof s === 'string') {
      const m = s.match(/(.+?)\s*-\s*₱?([\d.]+)/);
      const name = m ? m[1].trim() : s.trim();
      if (name.toLowerCase() === String(wanted).toLowerCase()) {
        return { price: m ? Number(m[2]) : base, label: name };
      }
    } else if (s?.name && String(s.name).toLowerCase() === String(wanted).toLowerCase()) {
      return { price: Number(s.price ?? base), label: s.name };
    }
  }
  return { error: `"${wanted}" is not a valid size for ${menuItem.name}` };
};

const isWithinBusinessHours = async () => {
  const hours = await BusinessHours.findOne();
  if (!hours) return { open: true };

  const now = new Date();
  const minutesNow = now.getHours() * 60 + now.getMinutes();
  const [oh, om] = String(hours.openTime).split(':').map(Number);
  const [ch, cm] = String(hours.closeTime).split(':').map(Number);
  const open = oh * 60 + om;
  const close = ch * 60 + cm;

  // A close time earlier than the open time means the window crosses midnight.
  const within = close >= open
    ? minutesNow >= open && minutesNow <= close
    : minutesNow >= open || minutesNow <= close;

  return { open: within, openTime: hours.openTime, closeTime: hours.closeTime };
};

// Whether the shop is currently accepting online orders.
router.get("/api/public/status", async (req, res) => {
  try {
    const hours = await isWithinBusinessHours();
    const settings = await BusinessHours.findOne();

    // GCash is offered only when staff have actually configured a number, so a
    // customer is never shown an account to send money to that we invented.
    const paymentMethods = [
      { key: 'cash', label: 'Cash', hint: 'Pay with cash on pickup or delivery' },
    ];

    // With a gateway key configured, card and GCash are charged for real
    // through PayMongo. Without one they fall back to what staff settle by
    // hand, so nothing ever claims to charge a card that it cannot.
    const gatewayMethods = paymongo.isConfigured() ? paymongo.enabledMethods() : [];
    if (gatewayMethods.includes('card')) {
      paymentMethods.push({
        key: 'paymongo_card',
        label: 'Credit / Debit Card',
        hint: 'Pay now, securely on PayMongo',
        gateway: true,
      });
    } else {
      paymentMethods.push({ key: 'card', label: 'Card', hint: 'Pay by card at the counter' });
    }

    if (gatewayMethods.includes('gcash')) {
      paymentMethods.push({
        key: 'paymongo_gcash',
        label: 'GCash',
        hint: 'Pay now through GCash',
        gateway: true,
      });
    } else if (settings?.gcashNumber) {
      paymentMethods.push({
        key: 'gcash',
        label: 'GCash',
        hint: 'Send the exact total, then enter your reference number',
        account: settings.gcashNumber,
        accountName: settings.gcashName || null,
      });
    }

    res.json({
      acceptingOrders: hours.open,
      openTime: hours.openTime,
      closeTime: hours.closeTime,
      paymentMethods,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Best sellers, computed from completed orders in the last 30 days.
// Returns menu item ids only; the client already has the full menu, so this
// stays cheap and leaks nothing about order volumes or customers.
router.get("/api/public/popular", async (req, res) => {
  try {
    const since = new Date();
    since.setDate(since.getDate() - 30);

    const [rows] = await sequelize.query(`
      SELECT oi.menuItemId AS id, SUM(oi.quantity) AS sold
      FROM orderitems oi
      JOIN orders o ON o.id = oi.orderId
      WHERE o.status = 'completed'
        AND o.createdAt >= :since
        AND oi.menuItemId IS NOT NULL
      GROUP BY oi.menuItemId
      ORDER BY sold DESC
      LIMIT 8
    `, { replacements: { since } });

    res.json({ popular: rows.map(r => ({ id: r.id, sold: Number(r.sold) })) });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});


/**
 * Live promotions for the storefront banner.
 *
 * Returns only what staff have actually created and enabled. When there is no
 * active promo the list is empty and the UI hides the section — nothing here
 * invents a deal, because a price claim shown to a customer has to be real.
 */
router.get("/api/public/promos", async (req, res) => {
  try {
    const now = new Date();

    const discounts = await Discount.findAll({ where: { enabled: true }, limit: 5 });

    const vouchers = await Voucher.findAll({
      where: {
        enabled: true,
        used: false,
        [Op.and]: [
          { [Op.or]: [{ startDate: null }, { startDate: { [Op.lte]: now } }] },
          { [Op.or]: [{ endDate: null }, { endDate: { [Op.gte]: now } }] },
        ],
      },
      limit: 5,
    });

    const promos = [
      ...discounts.map(d => ({
        kind: 'discount',
        title: d.name,
        detail: `${Number(d.percentage)}% off`,
        code: null,
      })),
      ...vouchers.map(v => ({
        kind: 'voucher',
        title: v.name,
        detail: `₱${Number(v.amount).toFixed(2)} off`,
        code: v.code,
      })),
    ];

    res.json({ promos });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Reverse geocoding for the checkout pin, proxied through the server.
 *
 * Done here rather than in the browser so we can send the User-Agent that
 * OpenStreetMap's Nominatim requires, cache repeat lookups, and keep our usage
 * inside their fair-use policy. No API key and no paid service involved.
 *
 * The result is a STARTING POINT for the address field, not a precise one:
 * open data rarely has house numbers outside cities, so the customer is still
 * expected to add their house number and a landmark.
 */
const geocodeCache = new Map();          // "lat,lng" (4dp) -> { at, address }
const GEOCODE_TTL_MS = 24 * 60 * 60 * 1000;
const geocodeHits = new Map();           // ip -> timestamps
const GEOCODE_WINDOW_MS = 60 * 1000;
const GEOCODE_MAX = 12;

setInterval(() => {
  const now = Date.now();
  for (const [k, v] of geocodeCache) if (now - v.at > GEOCODE_TTL_MS) geocodeCache.delete(k);
  for (const [ip, times] of geocodeHits) {
    const recent = times.filter(t => now - t < GEOCODE_WINDOW_MS);
    if (recent.length === 0) geocodeHits.delete(ip);
    else geocodeHits.set(ip, recent);
  }
}, GEOCODE_WINDOW_MS).unref();

/** Builds a Philippine-style address line from Nominatim's parts. */
const formatAddress = (a, fallback) => {
  if (!a) return fallback || null;
  const parts = [
    [a.house_number, a.road].filter(Boolean).join(' '),
    a.neighbourhood || a.hamlet || a.quarter,
    a.village || a.suburb,                       // barangay
    a.town || a.city || a.municipality,
    a.state || a.province,
  ];
  const seen = new Set();
  const cleaned = parts
    .map(p => (p || '').trim())
    .filter(p => p && !seen.has(p.toLowerCase()) && seen.add(p.toLowerCase()));
  return cleaned.length ? cleaned.join(', ') : (fallback || null);
};

router.get("/api/public/reverse-geocode", async (req, res) => {
  try {
    const lat = Number(req.query.lat);
    const lng = Number(req.query.lng);
    if (!Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) {
      return res.status(400).json({ error: 'Invalid coordinates.' });
    }

    const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.socket.remoteAddress || 'unknown';
    const now = Date.now();
    const recent = (geocodeHits.get(ip) || []).filter(t => now - t < GEOCODE_WINDOW_MS);
    if (recent.length >= GEOCODE_MAX) {
      return res.status(429).json({ error: 'Too many lookups. Please try again shortly.' });
    }
    recent.push(now);
    geocodeHits.set(ip, recent);

    // ~11 m of precision is plenty for a doorstep and keeps the cache useful.
    const key = `${lat.toFixed(4)},${lng.toFixed(4)}`;
    const cached = geocodeCache.get(key);
    if (cached && now - cached.at < GEOCODE_TTL_MS) {
      return res.json({ address: cached.address, cached: true });
    }

    const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`;
    const { data } = await axios.get(url, {
      timeout: 8000,
      headers: {
        // Nominatim's policy requires a real identifying User-Agent.
        'User-Agent': 'JAPZ-Grill-Online-Ordering/1.0',
        'Accept-Language': 'en',
      },
    });

    const address = formatAddress(data?.address, data?.display_name);
    if (!address) return res.status(404).json({ error: 'No address found for that spot.' });

    geocodeCache.set(key, { at: now, address });
    res.json({ address, cached: false });
  } catch (error) {
    // A geocoding failure must never block ordering: the customer can type it.
    console.error('Reverse geocode failed:', error.message);
    res.status(502).json({ error: 'Could not look up that location.' });
  }
});

/**
 * Road route between two points, for the delivery map.
 *
 * Proxied so the provider can be swapped without touching the client, and so
 * results are cached and rate-limited. Uses OSRM by default (no API key); set
 * OSRM_URL to point at your own instance or another OSRM-compatible service.
 *
 * A failure here is not an error condition: the map falls back to a straight
 * line, clearly labelled as such.
 */
const OSRM_BASE = process.env.OSRM_URL || 'https://router.project-osrm.org';
const routeCache = new Map();
const ROUTE_TTL_MS = 6 * 60 * 60 * 1000;
const routeHits = new Map();
const ROUTE_WINDOW_MS = 60 * 1000;
const ROUTE_MAX = 20;

setInterval(() => {
  const now = Date.now();
  for (const [k, v] of routeCache) if (now - v.at > ROUTE_TTL_MS) routeCache.delete(k);
  for (const [ip, times] of routeHits) {
    const recent = times.filter(t => now - t < ROUTE_WINDOW_MS);
    if (recent.length === 0) routeHits.delete(ip);
    else routeHits.set(ip, recent);
  }
}, ROUTE_WINDOW_MS).unref();

router.get("/api/public/route", async (req, res) => {
  try {
    const nums = ['fromLat', 'fromLng', 'toLat', 'toLng'].map(k => Number(req.query[k]));
    const [fromLat, fromLng, toLat, toLng] = nums;
    if (nums.some(n => !Number.isFinite(n)) ||
        Math.abs(fromLat) > 90 || Math.abs(toLat) > 90 ||
        Math.abs(fromLng) > 180 || Math.abs(toLng) > 180) {
      return res.status(400).json({ error: 'Invalid coordinates.' });
    }

    const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.socket.remoteAddress || 'unknown';
    const now = Date.now();
    const recent = (routeHits.get(ip) || []).filter(t => now - t < ROUTE_WINDOW_MS);
    if (recent.length >= ROUTE_MAX) {
      return res.status(429).json({ error: 'Too many route lookups.' });
    }
    recent.push(now);
    routeHits.set(ip, recent);

    const key = [fromLat, fromLng, toLat, toLng].map(n => n.toFixed(5)).join(',');
    const cached = routeCache.get(key);
    if (cached && now - cached.at < ROUTE_TTL_MS) {
      return res.json({ ...cached.payload, cached: true });
    }

    const url = `${OSRM_BASE}/route/v1/driving/${fromLng},${fromLat};${toLng},${toLat}` +
                `?overview=full&geometries=geojson`;
    const { data } = await axios.get(url, {
      timeout: 8000,
      headers: { 'User-Agent': 'JAPZ-Grill-Online-Ordering/1.0' },
    });

    const route = data?.routes?.[0];
    if (data?.code !== 'Ok' || !route?.geometry?.coordinates?.length) {
      return res.status(404).json({ error: 'No road route found.' });
    }

    const payload = {
      // GeoJSON is [lng, lat]; the client wants [lat, lng].
      points: route.geometry.coordinates.map(([lng, lat]) => [lat, lng]),
      distanceMeters: Math.round(route.distance),
      durationSeconds: Math.round(route.duration),
    };

    routeCache.set(key, { at: now, payload });
    res.json({ ...payload, cached: false });
  } catch (error) {
    console.error('Route lookup failed:', error.message);
    res.status(502).json({ error: 'Could not work out a road route.' });
  }
});

// Ordering now requires a storefront account.
router.post("/api/public/orders", verifyCustomer, throttle, async (req, res) => {
  const transaction = await sequelize.transaction();
  try {
    const { items, orderType, tableNumber, deliveryAddress, deliveryLat, deliveryLng, deliveryAddressId, saveAddress, addressLabel, customerName, customerPhone, notes, paymentMethod, paymentReference } = req.body;

    if (!Array.isArray(items) || items.length === 0) {
      await transaction.rollback();
      return res.status(400).json({ error: 'Your cart is empty.' });
    }
    if (items.length > ONLINE_ORDER_MAX_ITEMS) {
      await transaction.rollback();
      return res.status(400).json({ error: 'Too many distinct items in one order.' });
    }
    if (!['dine-in', 'take-out', 'delivery'].includes(orderType)) {
      await transaction.rollback();
      return res.status(400).json({ error: 'Please choose how you want your order served.' });
    }
    if (orderType === 'dine-in' && !String(tableNumber || '').trim()) {
      await transaction.rollback();
      return res.status(400).json({ error: 'Table number is required for dine-in orders.' });
    }
    if (orderType === 'delivery' && !String(deliveryAddress || '').trim() && !deliveryAddressId) {
      await transaction.rollback();
      return res.status(400).json({ error: 'Delivery address is required for delivery orders.' });
    }
    // Identity comes from the signed-in account; the body is only a fallback
    // for the contact number if the profile has none saved.
    const account = await User.findByPk(req.customer.id);
    if (!account || account.role !== 'customer') {
      await transaction.rollback();
      return res.status(401).json({ error: 'Please sign in again.' });
    }
    const orderName = account.name;
    const orderPhone = String(account.phone || customerPhone || '').trim();
    if (!/^[0-9+()\s-]{7,20}$/.test(orderPhone)) {
      await transaction.rollback();
      return res.status(400).json({ error: 'Please add a valid contact number to your profile.' });
    }
    // No gateway is wired up, so none of these CHARGE the customer. They record
    // how the customer intends to pay; staff confirm it on handover.
    const chosenMethod = paymentMethod || 'cash';
    const GATEWAY_METHODS = { paymongo_card: 'card', paymongo_gcash: 'gcash' };
    const isGateway = Object.prototype.hasOwnProperty.call(GATEWAY_METHODS, chosenMethod);
    if (isGateway && !paymongo.isConfigured()) {
      await transaction.rollback();
      return res.status(400).json({ error: 'Online payment is not available right now. Please choose cash.' });
    }
    if (!isGateway && !['cash', 'card', 'gcash', 'counter'].includes(chosenMethod)) {
      await transaction.rollback();
      return res.status(400).json({ error: 'That payment method is not available.' });
    }

    const settings = await BusinessHours.findOne();
    if (chosenMethod === 'gcash') {  // manual transfer only; the gateway needs no reference
      // Refuse GCash outright if no destination is configured, rather than
      // taking an order the customer cannot actually pay for.
      if (!settings?.gcashNumber) {
        await transaction.rollback();
        return res.status(400).json({ error: 'GCash is not available right now. Please choose another method.' });
      }
      if (!String(paymentReference || '').trim()) {
        await transaction.rollback();
        return res.status(400).json({ error: 'Please enter your GCash reference number.' });
      }
    }

    // Coordinates are optional; when present they must be a real point on Earth.
    let pinLat = null, pinLng = null;
    if (orderType === 'delivery' && deliveryLat != null && deliveryLng != null) {
      const la = Number(deliveryLat), ln = Number(deliveryLng);
      if (Number.isFinite(la) && Number.isFinite(ln) && Math.abs(la) <= 90 && Math.abs(ln) <= 180) {
        pinLat = la; pinLng = ln;
      }
    }

    // A picked saved address wins over anything in the body, and is only
    // accepted if it belongs to this customer.
    let resolvedAddress = orderType === 'delivery' ? String(deliveryAddress || '').trim() : null;
    let savedAddressRow = null;
    if (orderType === 'delivery' && deliveryAddressId) {
      savedAddressRow = await CustomerAddress.findOne({
        where: { id: deliveryAddressId, userId: req.customer.id },
      });
      if (!savedAddressRow) {
        await transaction.rollback();
        return res.status(400).json({ error: 'That saved address could not be found.' });
      }
      resolvedAddress = savedAddressRow.address;
      if (savedAddressRow.lat != null && savedAddressRow.lng != null) {
        pinLat = Number(savedAddressRow.lat);
        pinLng = Number(savedAddressRow.lng);
      }
    }

    const hours = await isWithinBusinessHours();
    if (!hours.open) {
      await transaction.rollback();
      return res.status(409).json({
        error: `We're closed right now. Online ordering is open ${hours.openTime} to ${hours.closeTime}.`,
      });
    }

    // Recompute the whole order from the database. Client prices are ignored.
    const priced = [];
    for (const line of items) {
      const qty = parseInt(line.quantity, 10);
      if (!Number.isInteger(qty) || qty < 1 || qty > ONLINE_ORDER_MAX_QTY_PER_ITEM) {
        await transaction.rollback();
        return res.status(400).json({ error: 'Invalid quantity in your cart.' });
      }

      const menuItem = await MenuItem.findByPk(parseInt(line.id, 10), { transaction });
      if (!menuItem) {
        await transaction.rollback();
        return res.status(400).json({ error: 'One of the items in your cart no longer exists.' });
      }
      if (menuItem.status !== 'available' || menuItem.archived) {
        await transaction.rollback();
        return res.status(409).json({ error: `${menuItem.name} is currently unavailable.` });
      }
      if (menuItem.trackStock && menuItem.stock !== null && menuItem.stock < qty) {
        await transaction.rollback();
        return res.status(409).json({ error: `Only ${menuItem.stock} left of ${menuItem.name}.` });
      }

      const { price, label, error } = resolveLinePrice(menuItem, line.modifiers);
      if (error) {
        await transaction.rollback();
        return res.status(400).json({ error });
      }

      const modifiers = { ...(line.modifiers || {}) };
      if (label) modifiers.size = label;

      priced.push({
        menuItem,
        quantity: qty,
        price,
        total: Number((price * qty).toFixed(2)),
        modifiers: Object.keys(modifiers).length ? modifiers : null,
      });
    }

    const subtotal = Number(priced.reduce((sum, l) => sum + l.total, 0).toFixed(2));

    // Order numbers are generated server-side so two customers cannot collide
    // and nobody can choose their own. Format matches the POS: ORD-XXXXXXXX.
    let orderNumber;
    for (let attempt = 0; attempt < 5; attempt++) {
      const candidate = `ORD-${Date.now().toString().slice(-6)}${Math.floor(10 + Math.random() * 90)}`;
      const clash = await Order.findOne({ where: { orderNumber: candidate }, transaction });
      if (!clash) { orderNumber = candidate; break; }
    }
    if (!orderNumber) {
      await transaction.rollback();
      return res.status(500).json({ error: 'Could not generate an order number. Please try again.' });
    }

    const order = await Order.create({
      orderNumber,
      cashierId: null,
      customerName: orderName,
      customerPhone: orderPhone,
      customerUserId: account.id,
      subtotal,
      discount: 0,
      total: subtotal,
      // A gateway order must not reach the kitchen before it is paid for.
      status: isGateway ? 'awaiting-payment' : 'pending',
      source: 'online',
      orderType,
      tableNumber: orderType === 'dine-in' ? String(tableNumber).trim() : null,
      deliveryAddress: resolvedAddress,
      deliveryAddressId: savedAddressRow ? savedAddressRow.id : null,
      deliveryLat: pinLat,
      deliveryLng: pinLng,
      notes: notes ? String(notes).trim().slice(0, 500) : null,
    }, { transaction });

    await Promise.all(priced.map(l => OrderItem.create({
      orderId: order.id,
      menuItemId: l.menuItem.id,
      name: l.menuItem.name,
      price: l.price,
      quantity: l.quantity,
      total: l.total,
      modifiers: l.modifiers,
    }, { transaction })));

    for (const l of priced) {
      if (l.menuItem.trackStock && l.menuItem.stock !== null) {
        await l.menuItem.update(
          { stock: Math.max(0, l.menuItem.stock - l.quantity) },
          { transaction }
        );
      }
    }

    // Unpaid until a human confirms it: cash and card are settled on handover,
    // and a GCash reference still has to be checked against the store's own app.
    const METHOD_MAP = {
      cash: 'cash', counter: 'cash', card: 'card', gcash: 'digital',
      paymongo_card: 'card', paymongo_gcash: 'digital',
    };
    await Payment.create({
      orderId: order.id,
      method: METHOD_MAP[chosenMethod] || 'cash',
      provider: chosenMethod === 'gcash' ? 'GCash'
        : chosenMethod === 'paymongo_gcash' ? 'GCash'
        : chosenMethod === 'paymongo_card' ? 'Card'
        : null,
      reference: chosenMethod === 'gcash' ? String(paymentReference).trim().slice(0, 64) : null,
      amount: subtotal,
      // Still pending for a gateway order: only PayMongo's own confirmation
      // may mark it completed.
      status: 'pending',
    }, { transaction });

    await transaction.commit();

    // Remember the address so the next order is one tap. Done after commit so a
    // bookkeeping failure can never lose a paid-for order.
    try {
      if (orderType === 'delivery') {
        if (savedAddressRow) {
          await savedAddressRow.update({ lastUsedAt: new Date() });
        } else if (saveAddress && resolvedAddress) {
          const count = await CustomerAddress.count({ where: { userId: account.id } });
          if (count < 8) {
            await CustomerAddress.create({
              userId: account.id,
              label: String(addressLabel || '').trim().slice(0, 64) || null,
              address: resolvedAddress.slice(0, 500),
              lat: pinLat,
              lng: pinLng,
              isDefault: count === 0,
              lastUsedAt: new Date(),
            });
          }
        }
      }
    } catch (e) {
      console.error('Could not save delivery address for reuse:', e.message);
    }

    res.status(201).json({
      message: isGateway ? 'Order created, payment required' : 'Order placed',
      // The client uses this to send the customer on to PayMongo instead of
      // straight to the tracking page.
      requiresPayment: isGateway,
      gatewayMethod: isGateway ? GATEWAY_METHODS[chosenMethod] : null,
      order: {
        orderNumber: order.orderNumber,
        status: order.status,
        total: order.total,
        orderType: order.orderType,
        placedAt: order.createdAt,
      },
    });
  } catch (error) {
    await transaction.rollback();
    res.status(500).json({ error: error.message });
  }
});

/**
 * Feedback on a finished order, left from inside the app.
 *
 * Only the customer who placed it can rate it, and only once it is actually
 * completed — rating food you have not received yet is not a real review.
 * The record is built with the same analysis helper the QR form uses, so it
 * appears identically in the admin Feedback Hub.
 */
router.post("/api/public/orders/:orderNumber/feedback", verifyCustomer, async (req, res) => {
  try {
    const { rating, comment, tags } = req.body;

    const stars = parseInt(rating, 10);
    if (!Number.isInteger(stars) || stars < 1 || stars > 5) {
      return res.status(400).json({ error: 'Please choose a rating from 1 to 5.' });
    }

    const order = await Order.findOne({
      where: { orderNumber: req.params.orderNumber, source: 'online' },
    });
    // Same 404 for "not yours" as for "does not exist", so order numbers
    // cannot be probed through this endpoint either.
    if (!order || order.customerUserId !== req.customer.id) {
      return res.status(404).json({ error: 'Order not found.' });
    }

    if (order.status !== 'completed') {
      return res.status(409).json({
        error: "You can rate this once it's been completed.",
      });
    }

    const existing = await Feedback.findOne({ where: { orderId: order.id } });
    if (existing) {
      return res.status(409).json({ error: "You've already rated this order. Thank you!" });
    }

    const trimmed = String(comment || '').trim().slice(0, 1000);
    const { sentiment, themes, aiAnalysis } = buildFeedbackAnalysis(stars, trimmed);

    await Feedback.create({
      orderId: order.id,
      orderNumber: order.orderNumber,
      rating: stars,
      tags: Array.isArray(tags) ? tags.slice(0, 10) : [],
      comment: trimmed || null,
      source: 'direct',          // left in-app, not via the QR form
      status: 'pending',
      sentiment,
      themes,
      aiAnalysis,
    });

    res.status(201).json({ ok: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Track an order. Deliberately returns only what a customer needs to see —
// no staff names, no internal ids, no other customers' data.
router.get("/api/public/orders/:orderNumber", async (req, res) => {
  try {
    const order = await Order.findOne({
      where: { orderNumber: req.params.orderNumber, source: 'online' },
    });
    if (!order) return res.status(404).json({ error: 'Order not found.' });

    // An order belongs to the account that placed it. Anyone else gets the same
    // 404 as a non-existent order, so order numbers cannot be probed.
    if (order.customerUserId) {
      const token = req.headers.authorization?.split(' ')[1];
      let viewerId = null;
      try { viewerId = token ? jwt.verify(token, JWT_SECRET).id : null; } catch { viewerId = null; }
      if (viewerId !== order.customerUserId) {
        return res.status(404).json({ error: 'Order not found.' });
      }
    }

    const items = await OrderItem.findAll({ where: { orderId: order.id } });
    const existingFeedback = await Feedback.findOne({ where: { orderId: order.id } });

    // The estimate is a window the restaurant configures, counted from dispatch.
    // It is not a live prediction: nothing here knows where the rider is.
    let delivery = null;
    if (order.orderType === 'delivery') {
      const hours = await BusinessHours.findOne();
      const minM = hours?.deliveryEtaMinMinutes ?? 30;
      const maxM = hours?.deliveryEtaMaxMinutes ?? 45;
      const dispatched = order.outForDeliveryAt ? new Date(order.outForDeliveryAt) : null;
      delivery = {
        address: order.deliveryAddress,
        storeLat: hours?.storeLat != null ? Number(hours.storeLat) : null,
        storeLng: hours?.storeLng != null ? Number(hours.storeLng) : null,
        lat: order.deliveryLat != null ? Number(order.deliveryLat) : null,
        lng: order.deliveryLng != null ? Number(order.deliveryLng) : null,
        riderName: order.riderName,
        riderPhone: order.riderPhone,
        dispatchedAt: order.outForDeliveryAt,
        etaMinMinutes: minM,
        etaMaxMinutes: maxM,
        etaFrom: dispatched ? new Date(dispatched.getTime() + minM * 60000) : null,
        etaTo: dispatched ? new Date(dispatched.getTime() + maxM * 60000) : null,
      };
    }

    res.json({
      order: {
        orderNumber: order.orderNumber,
        status: order.status,
        orderType: order.orderType,
        tableNumber: order.tableNumber,
        customerName: order.customerName,
        total: order.total,
        notes: order.notes,
        placedAt: order.createdAt,
        completedAt: order.completedAt,
        canRate: order.status === 'completed' && !existingFeedback,
        rated: !!existingFeedback,
        delivery,
        items: items.map(i => ({
          name: i.name,
          quantity: i.quantity,
          price: i.price,
          total: i.total,
          modifiers: i.modifiers,
        })),
      },
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
