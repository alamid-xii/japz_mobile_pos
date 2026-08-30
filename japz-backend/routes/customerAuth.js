import express from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { Op } from "sequelize";
import { User } from "../models/userModel.js";
import { Order } from "../models/orderModel.js";
import { OrderItem } from "../models/orderItemModel.js";
import { CustomerAddress } from "../models/customerAddressModel.js";
import { sendVerificationCode, verifyCode } from "../services/emailService.js";

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key-change-in-production";

// ========== STOREFRONT CUSTOMER ACCOUNTS ==========
// Separate from staff auth on purpose. Staff sign-up creates a 'pending'
// account that an admin must approve; a customer cannot wait for approval to
// order, so customer accounts are usable immediately and can never be used to
// reach the POS, kitchen or admin areas.

/** Rejects any token that is not a storefront customer. */
export const verifyCustomer = (req, res, next) => {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) return res.status(401).json({ error: 'Please sign in to continue.' });

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    if (decoded.role !== 'customer') {
      // A staff token must not act as a customer, and vice versa.
      return res.status(403).json({ error: 'This account cannot be used for online ordering.' });
    }
    req.customer = decoded;
    next();
  } catch {
    return res.status(401).json({ error: 'Your session has expired. Please sign in again.' });
  }
};

const publicUser = (u) => ({
  id: u.id,
  name: u.name,
  email: u.email,
  phone: u.phone || '',
});

const issueToken = (user) => jwt.sign(
  { id: user.id, email: user.email, name: user.name, role: 'customer' },
  JWT_SECRET,
  { expiresIn: '30d' },
);

const PHONE_RE = /^[0-9+()\s-]{7,20}$/;

// Sending email costs money and can be abused, so OTP requests are throttled
// per email address and per client IP.
const otpSends = new Map();
const OTP_WINDOW_MS = 60 * 60 * 1000;   // one hour
const OTP_MAX_PER_EMAIL = 5;
const OTP_COOLDOWN_MS = 60 * 1000;      // one minute between sends

setInterval(() => {
  const now = Date.now();
  for (const [key, times] of otpSends) {
    const recent = times.filter(t => now - t < OTP_WINDOW_MS);
    if (recent.length === 0) otpSends.delete(key);
    else otpSends.set(key, recent);
  }
}, OTP_WINDOW_MS).unref();

const otpGate = (key) => {
  const now = Date.now();
  const recent = (otpSends.get(key) || []).filter(t => now - t < OTP_WINDOW_MS);
  if (recent.length >= OTP_MAX_PER_EMAIL) {
    return { ok: false, error: 'Too many codes requested. Please try again later.' };
  }
  const last = recent[recent.length - 1];
  if (last && now - last < OTP_COOLDOWN_MS) {
    const wait = Math.ceil((OTP_COOLDOWN_MS - (now - last)) / 1000);
    return { ok: false, error: `Please wait ${wait}s before requesting another code.` };
  }
  recent.push(now);
  otpSends.set(key, recent);
  return { ok: true };
};

/**
 * Step 1 of sign-up: email a 6-digit code.
 *
 * Everything is validated here so the customer is not asked for a code before
 * we know the details are usable.
 */
router.post("/api/public/auth/send-otp", async (req, res) => {
  try {
    const { name, email, phone } = req.body;

    if (!String(name || '').trim()) return res.status(400).json({ error: 'Please enter your name.' });
    if (!/\S+@\S+\.\S+/.test(String(email || ''))) return res.status(400).json({ error: 'Please enter a valid email address.' });
    if (!PHONE_RE.test(String(phone || '').trim())) return res.status(400).json({ error: 'Please enter a valid contact number.' });

    const normalisedEmail = String(email).trim().toLowerCase();

    const existing = await User.findOne({ where: { email: normalisedEmail } });
    if (existing) {
      return res.status(400).json({ error: 'That email is already registered. Please sign in instead.' });
    }

    const gate = otpGate(normalisedEmail);
    if (!gate.ok) return res.status(429).json({ error: gate.error });

    try {
      await sendVerificationCode(normalisedEmail, String(name).trim());
    } catch (mailErr) {
      // Surface a clear operational message rather than a raw provider dump.
      console.error('OTP send failed:', mailErr.message);
      return res.status(502).json({ error: 'We could not send the code right now. Please try again shortly.' });
    }

    res.json({ sent: true, expiresInMinutes: 10 });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post("/api/public/auth/register", async (req, res) => {
  try {
    const { name, email, phone, password, verificationCode } = req.body;

    if (!String(name || '').trim()) return res.status(400).json({ error: 'Please enter your name.' });
    if (!/\S+@\S+\.\S+/.test(String(email || ''))) return res.status(400).json({ error: 'Please enter a valid email address.' });
    if (!PHONE_RE.test(String(phone || '').trim())) return res.status(400).json({ error: 'Please enter a valid contact number.' });
    if (String(password || '').length < 8) return res.status(400).json({ error: 'Password must be at least 8 characters.' });

    const normalisedEmail = String(email).trim().toLowerCase();
    const existing = await User.findOne({ where: { email: normalisedEmail } });
    if (existing) {
      // Deliberately identical wording whatever the existing account's role, so
      // this endpoint cannot be used to discover staff email addresses.
      return res.status(400).json({ error: 'That email is already registered. Please sign in instead.' });
    }

    // The emailed code proves the address belongs to whoever is signing up.
    // Checked last so an attacker cannot use timing here to probe addresses.
    if (!String(verificationCode || '').trim()) {
      return res.status(400).json({ error: 'Please enter the verification code we emailed you.' });
    }
    const check = verifyCode(normalisedEmail, String(verificationCode).trim());
    if (!check.valid) return res.status(400).json({ error: check.error });

    const user = await User.create({
      name: String(name).trim(),
      email: normalisedEmail,
      phone: String(phone).trim(),
      password: await bcrypt.hash(password, 10),
      role: 'customer',
      status: 'approved', // customers never need admin approval
    });

    res.status(201).json({ token: issueToken(user), user: publicUser(user) });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post("/api/public/auth/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Email and password are required.' });

    const user = await User.findOne({ where: { email: String(email).trim().toLowerCase() } });

    // One message for every failure mode, so this cannot be used to enumerate
    // accounts or to detect that an email belongs to a staff member.
    const reject = () => res.status(401).json({ error: 'Incorrect email or password.' });

    if (!user || user.role !== 'customer') return reject();
    if (!(await bcrypt.compare(password, user.password))) return reject();
    if (user.status !== 'approved') return res.status(403).json({ error: 'This account is not active. Please contact us.' });

    res.json({ token: issueToken(user), user: publicUser(user) });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get("/api/public/auth/me", verifyCustomer, async (req, res) => {
  try {
    const user = await User.findByPk(req.customer.id);
    if (!user || user.role !== 'customer') return res.status(404).json({ error: 'Account not found.' });
    res.json({ user: publicUser(user) });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.put("/api/public/auth/profile", verifyCustomer, async (req, res) => {
  try {
    const user = await User.findByPk(req.customer.id);
    if (!user || user.role !== 'customer') return res.status(404).json({ error: 'Account not found.' });

    const { name, phone, currentPassword, newPassword } = req.body;

    if (name !== undefined) {
      if (!String(name).trim()) return res.status(400).json({ error: 'Name cannot be empty.' });
      user.name = String(name).trim();
    }
    if (phone !== undefined) {
      if (!PHONE_RE.test(String(phone).trim())) return res.status(400).json({ error: 'Please enter a valid contact number.' });
      user.phone = String(phone).trim();
    }
    if (newPassword) {
      if (!currentPassword) return res.status(400).json({ error: 'Enter your current password to change it.' });
      if (!(await bcrypt.compare(currentPassword, user.password))) {
        return res.status(400).json({ error: 'Your current password is incorrect.' });
      }
      if (String(newPassword).length < 8) return res.status(400).json({ error: 'New password must be at least 8 characters.' });
      user.password = await bcrypt.hash(newPassword, 10);
    }
    // Email is intentionally not editable: it is the login identity and there is
    // no verification step on this route to prove the new address.

    await user.save();
    res.json({ user: publicUser(user) });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/** This customer's own order history. */
router.get("/api/public/my-orders", verifyCustomer, async (req, res) => {
  try {
    const orders = await Order.findAll({
      where: { customerUserId: req.customer.id },
      order: [['createdAt', 'DESC']],
      limit: 50,
    });

    const withItems = await Promise.all(orders.map(async (o) => {
      const items = await OrderItem.findAll({ where: { orderId: o.id } });
      return {
        orderNumber: o.orderNumber,
        status: o.status,
        orderType: o.orderType,
        tableNumber: o.tableNumber,
        total: o.total,
        placedAt: o.createdAt,
        completedAt: o.completedAt,
        itemCount: items.reduce((n, i) => n + i.quantity, 0),
        preview: items.slice(0, 3).map(i => i.name),
      };
    }));

    res.json({ orders: withItems });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Notifications are derived from the customer's own orders rather than stored
 * separately: any order whose status differs from the last one they
 * acknowledged is an unread update.
 */
const STATUS_COPY = {
  pending: { title: 'Order received', body: 'We have your order and will start shortly.' },
  preparing: { title: 'Being prepared', body: 'The kitchen has started on your order.' },
  ready: { title: 'Ready for collection', body: 'Your order is ready at the counter.' },
  completed: { title: 'Order completed', body: 'Thanks for ordering. Enjoy!' },
  cancelled: { title: 'Order cancelled', body: 'Please speak to our staff if this looks wrong.' },
};

router.get("/api/public/notifications", verifyCustomer, async (req, res) => {
  try {
    const orders = await Order.findAll({
      where: { customerUserId: req.customer.id },
      order: [['updatedAt', 'DESC']],
      limit: 20,
    });

    const notifications = orders.map(o => {
      const copy = STATUS_COPY[o.status] || { title: 'Order update', body: `Status: ${o.status}` };
      return {
        orderNumber: o.orderNumber,
        status: o.status,
        title: copy.title,
        body: copy.body,
        at: o.updatedAt,
        unread: o.customerSeenStatus !== o.status,
      };
    });

    res.json({ notifications, unreadCount: notifications.filter(n => n.unread).length });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/** Marks every current status as seen. */
router.post("/api/public/notifications/read", verifyCustomer, async (req, res) => {
  try {
    const orders = await Order.findAll({
      where: { customerUserId: req.customer.id, status: { [Op.ne]: null } },
    });
    await Promise.all(orders.map(o => o.update({ customerSeenStatus: o.status })));
    res.json({ ok: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ========== SAVED DELIVERY ADDRESSES ==========
// Every query is filtered by the signed-in customer's id, so one account can
// never read or modify another's addresses.

const MAX_ADDRESSES = 8;

const publicAddress = (a) => ({
  id: a.id,
  label: a.label,
  address: a.address,
  lat: a.lat != null ? Number(a.lat) : null,
  lng: a.lng != null ? Number(a.lng) : null,
  isDefault: !!a.isDefault,
  lastUsedAt: a.lastUsedAt,
});

const validCoord = (lat, lng) => {
  if (lat == null || lng == null) return null;
  const la = Number(lat), ln = Number(lng);
  if (!Number.isFinite(la) || !Number.isFinite(ln)) return null;
  if (Math.abs(la) > 90 || Math.abs(ln) > 180) return null;
  return { la, ln };
};

/** Most recently used first, so the usual address is at the top. */
router.get("/api/public/addresses", verifyCustomer, async (req, res) => {
  try {
    const rows = await CustomerAddress.findAll({
      where: { userId: req.customer.id },
      order: [
        ['isDefault', 'DESC'],
        ['lastUsedAt', 'DESC'],
        ['createdAt', 'DESC'],
      ],
    });
    res.json({ addresses: rows.map(publicAddress) });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post("/api/public/addresses", verifyCustomer, async (req, res) => {
  try {
    const { label, address, lat, lng, isDefault } = req.body;
    if (!String(address || '').trim()) {
      return res.status(400).json({ error: 'Please enter an address.' });
    }

    const count = await CustomerAddress.count({ where: { userId: req.customer.id } });
    if (count >= MAX_ADDRESSES) {
      return res.status(400).json({ error: `You can save up to ${MAX_ADDRESSES} addresses. Remove one first.` });
    }

    const coord = validCoord(lat, lng);
    if (isDefault) {
      await CustomerAddress.update({ isDefault: false }, { where: { userId: req.customer.id } });
    }

    const row = await CustomerAddress.create({
      userId: req.customer.id,
      label: String(label || '').trim().slice(0, 64) || null,
      address: String(address).trim().slice(0, 500),
      lat: coord ? coord.la : null,
      lng: coord ? coord.ln : null,
      isDefault: !!isDefault || count === 0, // the first one saved becomes default
    });

    res.status(201).json({ address: publicAddress(row) });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.put("/api/public/addresses/:id", verifyCustomer, async (req, res) => {
  try {
    const row = await CustomerAddress.findOne({
      where: { id: req.params.id, userId: req.customer.id },
    });
    if (!row) return res.status(404).json({ error: 'Address not found.' });

    const { label, address, lat, lng, isDefault } = req.body;
    if (label !== undefined) row.label = String(label || '').trim().slice(0, 64) || null;
    if (address !== undefined) {
      if (!String(address).trim()) return res.status(400).json({ error: 'Address cannot be empty.' });
      row.address = String(address).trim().slice(0, 500);
    }
    if (lat !== undefined || lng !== undefined) {
      const coord = validCoord(lat, lng);
      row.lat = coord ? coord.la : null;
      row.lng = coord ? coord.ln : null;
    }
    if (isDefault) {
      await CustomerAddress.update({ isDefault: false }, { where: { userId: req.customer.id } });
      row.isDefault = true;
    }

    await row.save();
    res.json({ address: publicAddress(row) });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.delete("/api/public/addresses/:id", verifyCustomer, async (req, res) => {
  try {
    const row = await CustomerAddress.findOne({
      where: { id: req.params.id, userId: req.customer.id },
    });
    if (!row) return res.status(404).json({ error: 'Address not found.' });

    const wasDefault = row.isDefault;
    await row.destroy();

    // Promote the next most recent so the customer always has a default.
    if (wasDefault) {
      const next = await CustomerAddress.findOne({
        where: { userId: req.customer.id },
        order: [['lastUsedAt', 'DESC'], ['createdAt', 'DESC']],
      });
      if (next) await next.update({ isDefault: true });
    }

    res.json({ ok: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
