import { authenticate, allowRoles } from '../middleware/access.js';
import { requireJwtSecret } from '../services/securityConfig.js';
import express from "express";
import jwt from "jsonwebtoken";
import { Op } from "sequelize";
import { User } from "../models/userModel.js";
import { BusinessHours } from "../models/businessHoursModel.js";
import { RestaurantTable, Reservation, ReservationEvent } from "../models/reservationModel.js";
import { verifyCustomer } from "./customerAuth.js";

const router = express.Router();
const JWT_SECRET = requireJwtSecret();

const STAFF_ROLES = ['admin', 'cashier'];
/** A table is only held once a booking is confirmed or the party is seated. */
const HOLDING_STATUSES = ['confirmed', 'seated'];

const requireRole = (...roles) => [authenticate, allowRoles(...roles)];

const logEvent = async (reservationId, actor, event, detail = null) => {
  try {
    await ReservationEvent.create({
      reservationId,
      actorUserId: actor?.id ?? null,
      actorRole: actor?.role ?? null,
      event,
      detail,
    });
  } catch (e) {
    console.error('Reservation audit failed:', e.message);
  }
};

const makeCode = () => `RSV-${Math.floor(10000000 + Math.random() * 90000000)}`;

/** 'HH:MM' or 'HH:MM:SS' -> minutes from midnight. */
const toMinutes = (t) => {
  const m = /^(\d{1,2}):(\d{2})/.exec(String(t || ''));
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (h > 23 || min > 59) return null;
  return h * 60 + min;
};
const toTime = (mins) =>
  `${String(Math.floor(mins / 60)).padStart(2, '0')}:${String(mins % 60).padStart(2, '0')}:00`;

const localDate = (d = new Date()) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

/** Two bookings clash when their time ranges overlap at all. */
const overlaps = (aStart, aDur, bStart, bDur) =>
  aStart < bStart + bDur && bStart < aStart + aDur;

/**
 * Tables that can seat this party, free for the whole slot.
 * `ignoreId` lets an existing booking be re-checked without clashing with itself.
 */
const findFreeTables = async (date, startMinutes, durationMinutes, partySize, ignoreId = null) => {
  const tables = await RestaurantTable.findAll({
    where: { status: 'active', capacity: { [Op.gte]: partySize } },
    order: [['capacity', 'ASC'], ['name', 'ASC']],
  });
  if (!tables.length) return [];

  const where = {
    reservationDate: date,
    status: { [Op.in]: HOLDING_STATUSES },
    tableId: { [Op.ne]: null },
  };
  if (ignoreId) where.id = { [Op.ne]: ignoreId };
  const booked = await Reservation.findAll({ where });

  const busy = new Set();
  for (const b of booked) {
    const bStart = toMinutes(b.startTime);
    if (bStart == null) continue;
    if (overlaps(startMinutes, durationMinutes, bStart, b.durationMinutes)) {
      busy.add(b.tableId);
    }
  }
  return tables.filter(t => !busy.has(t.id));
};

/** Bookings must sit inside opening hours. */
const withinHours = async (startMinutes, durationMinutes) => {
  const hours = await BusinessHours.findOne();
  if (!hours) return { ok: true };
  const open = toMinutes(hours.openTime);
  const close = toMinutes(hours.closeTime);
  if (open == null || close == null) return { ok: true };
  if (startMinutes < open || startMinutes + durationMinutes > close) {
    return {
      ok: false,
      message: `Bookings must fall between ${String(hours.openTime).slice(0, 5)} and ${String(hours.closeTime).slice(0, 5)}.`,
    };
  }
  return { ok: true };
};

const shape = (r, table) => ({
  id: r.id,
  code: r.code,
  customerName: r.customerName,
  customerPhone: r.customerPhone,
  partySize: r.partySize,
  reservationDate: r.reservationDate,
  startTime: String(r.startTime).slice(0, 5),
  durationMinutes: r.durationMinutes,
  status: r.status,
  source: r.source,
  notes: r.notes,
  staffMessage: r.staffMessage,
  table: table ? { id: table.id, name: table.name, capacity: table.capacity, area: table.area } : null,
  confirmedAt: r.confirmedAt,
  seatedAt: r.seatedAt,
  createdAt: r.createdAt,
});

const withTables = async (rows) => {
  const ids = [...new Set(rows.map(r => r.tableId).filter(Boolean))];
  const tables = ids.length ? await RestaurantTable.findAll({ where: { id: { [Op.in]: ids } } }) : [];
  const byId = Object.fromEntries(tables.map(t => [t.id, t]));
  return rows.map(r => shape(r, r.tableId ? byId[r.tableId] : null));
};

/** Shared validation for a new booking, from either the storefront or staff. */
const validateSlot = async (body) => {
  const partySize = Number(body.partySize);
  const date = String(body.reservationDate || '');
  const startMinutes = toMinutes(body.startTime);
  const durationMinutes = Number(body.durationMinutes) || 90;

  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return { error: 'Pick a date for the booking.' };
  if (startMinutes == null) return { error: 'Pick a time for the booking.' };
  if (!Number.isInteger(partySize) || partySize < 1 || partySize > 50) {
    return { error: 'Party size must be between 1 and 50.' };
  }
  if (durationMinutes < 30 || durationMinutes > 360) {
    return { error: 'Duration must be between 30 minutes and 6 hours.' };
  }
  if (date < localDate()) return { error: 'That date has already passed.' };

  const hours = await withinHours(startMinutes, durationMinutes);
  if (!hours.ok) return { error: hours.message };

  const tableCount = await RestaurantTable.count({ where: { status: 'active' } });
  if (tableCount === 0) {
    return { error: 'Reservations are not available yet — no tables have been set up.' };
  }

  return { partySize, date, startMinutes, durationMinutes };
};

// ========== PUBLIC (customer) ==========

/** Whether a slot has room, without revealing the table layout. */
router.get("/api/public/reservations/availability", async (req, res) => {
  try {
    const partySize = Number(req.query.partySize) || 2;
    const date = String(req.query.date || '');
    const startMinutes = toMinutes(req.query.time);
    const durationMinutes = Number(req.query.durationMinutes) || 90;

    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || startMinutes == null) {
      return res.status(400).json({ error: 'A date and time are required.' });
    }

    const anyTables = await RestaurantTable.count({ where: { status: 'active' } });
    if (anyTables === 0) {
      return res.json({ available: false, seatsAvailable: 0, reason: 'no-tables' });
    }

    const hours = await withinHours(startMinutes, durationMinutes);
    if (!hours.ok) return res.json({ available: false, seatsAvailable: 0, reason: 'closed', message: hours.message });

    const free = await findFreeTables(date, startMinutes, durationMinutes, partySize);
    res.json({
      available: free.length > 0,
      tablesAvailable: free.length,
      largestTable: free.reduce((n, t) => Math.max(n, t.capacity), 0),
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/** Customer requests a table. Always lands as pending for staff to confirm. */
router.post("/api/public/reservations", verifyCustomer, async (req, res) => {
  try {
    const v = await validateSlot(req.body);
    if (v.error) return res.status(400).json({ error: v.error });

    const user = await User.findByPk(req.customer.id);
    if (!user) return res.status(401).json({ error: 'Please sign in again.' });

    const free = await findFreeTables(v.date, v.startMinutes, v.durationMinutes, v.partySize);
    if (!free.length) {
      return res.status(409).json({ error: 'That slot is fully booked. Please try another time.' });
    }

    // One open booking per customer per day keeps the queue honest.
    const existing = await Reservation.findOne({
      where: {
        customerUserId: user.id,
        reservationDate: v.date,
        status: { [Op.in]: ['pending', 'confirmed', 'seated'] },
      },
    });
    if (existing) {
      return res.status(409).json({ error: `You already have a booking for that day (${existing.code}).` });
    }

    const reservation = await Reservation.create({
      code: makeCode(),
      customerUserId: user.id,
      customerName: user.name,
      customerPhone: req.body.customerPhone ? String(req.body.customerPhone).slice(0, 32) : user.phone,
      customerEmail: user.email,
      partySize: v.partySize,
      reservationDate: v.date,
      startTime: toTime(v.startMinutes),
      durationMinutes: v.durationMinutes,
      status: 'pending',
      source: 'online',
      notes: req.body.notes ? String(req.body.notes).slice(0, 255) : null,
    });
    await logEvent(reservation.id, { id: user.id, role: 'customer' }, 'reservation:requested',
      `${v.partySize} pax on ${v.date} ${toTime(v.startMinutes).slice(0, 5)}`);

    res.json({ ok: true, reservation: shape(reservation, null) });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get("/api/public/reservations/mine", verifyCustomer, async (req, res) => {
  try {
    const rows = await Reservation.findAll({
      where: { customerUserId: req.customer.id },
      order: [['reservationDate', 'DESC'], ['startTime', 'DESC']],
      limit: 40,
    });
    res.json({ reservations: await withTables(rows) });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post("/api/public/reservations/:code/cancel", verifyCustomer, async (req, res) => {
  try {
    const r = await Reservation.findOne({
      where: { code: req.params.code, customerUserId: req.customer.id },
    });
    if (!r) return res.status(404).json({ error: 'Booking not found.' });
    if (!['pending', 'confirmed'].includes(r.status)) {
      return res.status(409).json({ error: 'That booking can no longer be cancelled.' });
    }
    await r.update({ status: 'cancelled', closedAt: new Date() });
    await logEvent(r.id, { id: req.customer.id, role: 'customer' }, 'reservation:cancelled', 'by customer');
    res.json({ ok: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ========== STAFF ==========

router.get("/api/reservations", requireRole(...STAFF_ROLES), async (req, res) => {
  try {
    const { date, status } = req.query;
    const where = {};
    if (date) where.reservationDate = date;
    if (status) where.status = status;

    const rows = await Reservation.findAll({
      where,
      order: [['reservationDate', 'ASC'], ['startTime', 'ASC']],
      limit: 300,
    });
    const pendingCount = await Reservation.count({ where: { status: 'pending' } });
    res.json({ reservations: await withTables(rows), pendingCount });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/** Staff record a phone-in or walk-in booking. Confirmed straight away. */
router.post("/api/reservations", requireRole(...STAFF_ROLES), async (req, res) => {
  try {
    const v = await validateSlot(req.body);
    if (v.error) return res.status(400).json({ error: v.error });
    if (!req.body.customerName) return res.status(400).json({ error: 'A name is required.' });

    const free = await findFreeTables(v.date, v.startMinutes, v.durationMinutes, v.partySize);
    if (!free.length) return res.status(409).json({ error: 'No table is free for that slot.' });

    const wanted = req.body.tableId ? free.find(t => t.id === Number(req.body.tableId)) : free[0];
    if (!wanted) return res.status(409).json({ error: 'That table is not free for the slot.' });

    const reservation = await Reservation.create({
      code: makeCode(),
      customerName: String(req.body.customerName).slice(0, 128),
      customerPhone: req.body.customerPhone ? String(req.body.customerPhone).slice(0, 32) : null,
      partySize: v.partySize,
      reservationDate: v.date,
      startTime: toTime(v.startMinutes),
      durationMinutes: v.durationMinutes,
      tableId: wanted.id,
      status: 'confirmed',
      source: 'staff',
      notes: req.body.notes ? String(req.body.notes).slice(0, 255) : null,
      createdByUserId: req.user.id,
      confirmedByUserId: req.user.id,
      confirmedAt: new Date(),
    });
    await logEvent(reservation.id, req.user, 'reservation:created', `walk-in / phone, table ${wanted.name}`);
    res.json({ ok: true, reservation: shape(reservation, wanted) });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/** Confirms a pending request and holds a table for it. */
router.put("/api/reservations/:id/confirm", requireRole(...STAFF_ROLES), async (req, res) => {
  try {
    const r = await Reservation.findByPk(req.params.id);
    if (!r) return res.status(404).json({ error: 'Booking not found.' });
    if (r.status !== 'pending') {
      return res.status(409).json({ error: `That booking is already ${r.status}.` });
    }

    const startMinutes = toMinutes(r.startTime);
    const free = await findFreeTables(r.reservationDate, startMinutes, r.durationMinutes, r.partySize, r.id);
    if (!free.length) {
      return res.status(409).json({ error: 'No table is free any more for that slot. Decline it, or move the time.' });
    }

    const wanted = req.body.tableId ? free.find(t => t.id === Number(req.body.tableId)) : free[0];
    if (!wanted) return res.status(409).json({ error: 'That table is not free for the slot.' });

    await r.update({
      status: 'confirmed',
      tableId: wanted.id,
      confirmedByUserId: req.user.id,
      confirmedAt: new Date(),
      staffMessage: req.body.message ? String(req.body.message).slice(0, 255) : null,
    });
    await logEvent(r.id, req.user, 'reservation:confirmed', `table ${wanted.name}`);
    res.json({ ok: true, table: { id: wanted.id, name: wanted.name } });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.put("/api/reservations/:id/decline", requireRole(...STAFF_ROLES), async (req, res) => {
  try {
    const r = await Reservation.findByPk(req.params.id);
    if (!r) return res.status(404).json({ error: 'Booking not found.' });
    if (r.status !== 'pending') {
      return res.status(409).json({ error: `That booking is already ${r.status}.` });
    }
    await r.update({
      status: 'declined',
      closedAt: new Date(),
      staffMessage: req.body.message ? String(req.body.message).slice(0, 255) : null,
    });
    await logEvent(r.id, req.user, 'reservation:declined', req.body.message || null);
    res.json({ ok: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/** Moves a booking along: seated -> completed / no-show / cancelled. */
router.put("/api/reservations/:id/status", requireRole(...STAFF_ROLES), async (req, res) => {
  try {
    const { status } = req.body;
    const allowed = {
      seated: ['confirmed'],
      completed: ['seated'],
      'no-show': ['confirmed'],
      cancelled: ['pending', 'confirmed'],
    };
    if (!allowed[status]) return res.status(400).json({ error: 'Unknown status.' });

    const r = await Reservation.findByPk(req.params.id);
    if (!r) return res.status(404).json({ error: 'Booking not found.' });
    if (!allowed[status].includes(r.status)) {
      return res.status(409).json({ error: `A ${r.status} booking cannot be marked ${status}.` });
    }

    const now = new Date();
    await r.update({
      status,
      seatedAt: status === 'seated' ? now : r.seatedAt,
      closedAt: ['completed', 'no-show', 'cancelled'].includes(status) ? now : r.closedAt,
      staffMessage: req.body.message ? String(req.body.message).slice(0, 255) : r.staffMessage,
    });
    await logEvent(r.id, req.user, `reservation:${status}`, req.body.message || null);
    res.json({ ok: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Tables free for an arbitrary slot, so staff can choose one while entering a
 * walk-in or phone booking rather than being handed whichever came first.
 */
router.get("/api/reservations-free-tables", requireRole(...STAFF_ROLES), async (req, res) => {
  try {
    const partySize = Number(req.query.partySize) || 2;
    const date = String(req.query.date || '');
    const startMinutes = toMinutes(req.query.time);
    const durationMinutes = Number(req.query.durationMinutes) || 90;

    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || startMinutes == null) {
      return res.status(400).json({ error: 'A date and time are required.' });
    }

    const hours = await withinHours(startMinutes, durationMinutes);
    if (!hours.ok) return res.json({ tables: [], reason: 'closed', message: hours.message });

    const free = await findFreeTables(date, startMinutes, durationMinutes, partySize);
    res.json({ tables: free.map(t => ({ id: t.id, name: t.name, capacity: t.capacity, area: t.area })) });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/** Tables free for a slot, so staff can pick one when confirming. */
router.get("/api/reservations/:id/free-tables", requireRole(...STAFF_ROLES), async (req, res) => {
  try {
    const r = await Reservation.findByPk(req.params.id);
    if (!r) return res.status(404).json({ error: 'Booking not found.' });
    const free = await findFreeTables(r.reservationDate, toMinutes(r.startTime), r.durationMinutes, r.partySize, r.id);
    res.json({ tables: free.map(t => ({ id: t.id, name: t.name, capacity: t.capacity, area: t.area })) });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ========== TABLES ==========

router.get("/api/reservations-tables", requireRole('admin', 'cashier'), async (req, res) => {
  try {
    const tables = await RestaurantTable.findAll({ order: [['name', 'ASC']] });
    res.json({
      tables: tables.map(t => ({
        id: t.id, name: t.name, capacity: t.capacity, area: t.area, status: t.status, notes: t.notes,
      })),
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post("/api/reservations-tables", requireRole('admin'), async (req, res) => {
  try {
    const name = String(req.body.name || '').trim();
    const capacity = Number(req.body.capacity);
    if (!name) return res.status(400).json({ error: 'A table name is required.' });
    if (!Number.isInteger(capacity) || capacity < 1 || capacity > 50) {
      return res.status(400).json({ error: 'Capacity must be between 1 and 50.' });
    }
    const clash = await RestaurantTable.findOne({ where: { name } });
    if (clash) return res.status(409).json({ error: 'A table with that name already exists.' });

    const table = await RestaurantTable.create({
      name: name.slice(0, 32),
      capacity,
      area: req.body.area ? String(req.body.area).slice(0, 32) : null,
      notes: req.body.notes ? String(req.body.notes).slice(0, 255) : null,
    });
    res.json({ ok: true, id: table.id });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.put("/api/reservations-tables/:id", requireRole('admin'), async (req, res) => {
  try {
    const table = await RestaurantTable.findByPk(req.params.id);
    if (!table) return res.status(404).json({ error: 'Table not found.' });

    const patch = {};
    if (req.body.name != null) {
      const name = String(req.body.name).trim();
      if (!name) return res.status(400).json({ error: 'A table name is required.' });
      const clash = await RestaurantTable.findOne({ where: { name, id: { [Op.ne]: table.id } } });
      if (clash) return res.status(409).json({ error: 'A table with that name already exists.' });
      patch.name = name.slice(0, 32);
    }
    if (req.body.capacity != null) {
      const capacity = Number(req.body.capacity);
      if (!Number.isInteger(capacity) || capacity < 1 || capacity > 50) {
        return res.status(400).json({ error: 'Capacity must be between 1 and 50.' });
      }
      patch.capacity = capacity;
    }
    if (req.body.area !== undefined) patch.area = req.body.area ? String(req.body.area).slice(0, 32) : null;
    if (req.body.status && ['active', 'inactive'].includes(req.body.status)) patch.status = req.body.status;

    // Taking a table out of service must not strand a booking already on it.
    if (patch.status === 'inactive') {
      const held = await Reservation.count({
        where: {
          tableId: table.id,
          status: { [Op.in]: HOLDING_STATUSES },
          reservationDate: { [Op.gte]: localDate() },
        },
      });
      if (held > 0) {
        return res.status(409).json({
          error: `That table has ${held} upcoming booking(s). Move or cancel them first.`,
        });
      }
    }

    await table.update(patch);
    res.json({ ok: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.delete("/api/reservations-tables/:id", requireRole('admin'), async (req, res) => {
  try {
    const table = await RestaurantTable.findByPk(req.params.id);
    if (!table) return res.status(404).json({ error: 'Table not found.' });

    const used = await Reservation.count({ where: { tableId: table.id } });
    if (used > 0) {
      return res.status(409).json({
        error: 'That table has booking history. Set it to inactive instead of deleting it.',
      });
    }
    await table.destroy();
    res.json({ ok: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
