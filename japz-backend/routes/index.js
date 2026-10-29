import express from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { randomBytes } from "node:crypto";
import { Op } from "sequelize";
import { sequelize } from "../models/db.js";
import { User } from "../models/userModel.js";
import {
  Reservation,
  ReservationSettings,
} from "../models/reservationModel.js";
import {
  ReservationError,
  availableSlots,
  validateBooking,
  validateSettings,
  bookingStart,
  STATUS_TRANSITIONS,
  localDate,
  seatsRemaining,
  timeMinutes,
} from "../services/reservationRules.js";
import {
  sendPasswordResetCode,
  verifyPasswordResetCode,
} from "../services/emailService.js";

const router = express.Router();
const secret = () => process.env.JWT_SECRET || "japz-local-development-only";
const route = (handler) => async (req, res, next) => {
  try {
    await handler(req, res);
  } catch (error) {
    next(error);
  }
};
function rateLimit(maximum, windowMs) {
  const attempts = new Map();
  const cleanup = setInterval(() => {
    for (const [key, value] of attempts)
      if (value.until <= Date.now()) attempts.delete(key);
  }, windowMs);
  cleanup.unref();
  return (req, res, next) => {
    let entry = attempts.get(req.ip);
    if (!entry || entry.until <= Date.now()) {
      entry = { count: 0, until: Date.now() + windowMs };
      attempts.set(req.ip, entry);
    }
    if (++entry.count > maximum) {
      res.set(
        "Retry-After",
        String(Math.ceil((entry.until - Date.now()) / 1000)),
      );
      return res
        .status(429)
        .json({
          error: "Too many attempts. Please try again in a few minutes.",
        });
    }
    next();
  };
}
const guestLimit = rateLimit(40, 15 * 60 * 1000);
const loginLimit = rateLimit(15, 15 * 60 * 1000);
const admin = async (req, res, next) => {
  try {
    let decoded;
    try {
      decoded = jwt.verify(
        req.headers.authorization?.replace(/^Bearer /, "") || "",
        secret(),
      );
    } catch {
      throw new ReservationError("Please sign in to manage reservations.", 401);
    }
    const user = await User.findByPk(decoded.id);
    if (!user || user.role !== "admin" || user.status !== "approved")
      throw new ReservationError(
        "An approved Japz administrator account is required.",
        403,
      );
    req.user = user;
    next();
  } catch (error) {
    next(error);
  }
};
const safeUser = (user) => ({
  id: user.id,
  name: user.name,
  email: user.email,
  role: user.role,
});
const safeReservation = (reservation) => {
  const { requestKey, ...value } = reservation.toJSON
    ? reservation.toJSON()
    : reservation;
  return value;
};
const settings = (transaction) =>
  ReservationSettings.findByPk(
    1,
    transaction ? { transaction, lock: transaction.LOCK.UPDATE } : {},
  );
const dayBookings = (date, transaction, excludeId) =>
  Reservation.findAll({
    where: { date, ...(excludeId ? { id: { [Op.ne]: excludeId } } : {}) },
    transaction,
  });
const emailValue = (value) =>
  typeof value === "string" ? value.trim().toLowerCase() : "";
async function findGuest(reference, email, transaction) {
  if (typeof reference !== "string" || typeof email !== "string")
    throw new ReservationError("Enter your reference code and booking email.");
  const reservation = await Reservation.findOne({
    where: {
      reference: reference.trim().toUpperCase(),
      email: emailValue(email),
    },
    transaction,
  });
  if (!reservation)
    throw new ReservationError(
      "No reservation matches that reference and email.",
      404,
    );
  return reservation;
}
function canGuestChange(reservation, config) {
  if (!["pending", "confirmed"].includes(reservation.status))
    throw new ReservationError(
      "This reservation can no longer be changed.",
      409,
    );
  if (
    bookingStart(reservation.date, reservation.time).getTime() <
    Date.now() + config.leadTimeMinutes * 60000
  )
    throw new ReservationError(
      `Online changes close ${config.leadTimeMinutes} minutes before your visit. Please contact Japz.`,
      409,
    );
}
router.get("/api/health", (req, res) =>
  res.json({ service: "Japz online reservations", status: "ok" }),
);
router.post(
  "/api/auth/login",
  loginLimit,
  route(async (req, res) => {
    const { password } = req.body;
    if (typeof password !== "string" || password.length > 200)
      throw new ReservationError("Enter your email and password.");
    const user = await User.findOne({
      where: { email: emailValue(req.body.email) },
    });
    if (!user || !(await bcrypt.compare(password, user.password)))
      throw new ReservationError("Incorrect email or password.", 401);
    if (user.role !== "admin" || user.status !== "approved")
      throw new ReservationError(
        "An approved Japz administrator account is required.",
        403,
      );
    res.json({
      token: jwt.sign({ id: user.id, role: user.role }, secret(), {
        expiresIn: "8h",
      }),
      user: safeUser(user),
    });
  }),
);
router.get("/api/auth/user", admin, (req, res) =>
  res.json({ user: safeUser(req.user) }),
);
router.post("/api/auth/logout", (req, res) =>
  res.json({ message: "Signed out." }),
);
router.post(
  "/api/auth/forgot-password",
  loginLimit,
  route(async (req, res) => {
    const email = emailValue(req.body.email);
    const user = await User.findOne({
      where: { email, role: "admin", status: "approved" },
    });
    if (user) await sendPasswordResetCode(email, user.name);
    res.json({
      message: "If an eligible account exists, a reset code has been sent.",
    });
  }),
);
router.post(
  "/api/auth/reset-password",
  loginLimit,
  route(async (req, res) => {
    const { code, newPassword } = req.body;
    const email = emailValue(req.body.email);
    if (
      typeof newPassword !== "string" ||
      newPassword.length < 12 ||
      newPassword.length > 200 ||
      !/[A-Z]/.test(newPassword) ||
      !/\d/.test(newPassword)
    )
      throw new ReservationError(
        "Use at least 12 characters, an uppercase letter, and a number.",
      );
    const user = await User.findOne({
      where: { email, role: "admin", status: "approved" },
    });
    const verification =
      typeof code === "string"
        ? verifyPasswordResetCode(email, code)
        : { valid: false };
    if (!user || !verification.valid)
      throw new ReservationError("Invalid or expired reset code.");
    await user.update({ password: await bcrypt.hash(newPassword, 12) });
    res.json({ message: "Password updated. Please sign in." });
  }),
);
router.get(
  "/api/reservation-settings",
  route(async (req, res) => res.json(await settings())),
);
router.get(
  "/api/reservations/availability",
  route(async (req, res) => {
    const config = await settings();
    // Validate query values before using them in a database query.
    availableSlots(req.query.date, req.query.guests, [], config);
    res
      .set("Cache-Control", "no-store")
      .json({
        slots: availableSlots(
          req.query.date,
          req.query.guests,
          await dayBookings(req.query.date),
          config,
        ),
      });
  }),
);
router.post(
  "/api/reservations",
  guestLimit,
  route(async (req, res) => {
    const { requestKey } = req.body;
    if (
      typeof requestKey !== "string" ||
      !/^[a-zA-Z0-9-]{16,64}$/.test(requestKey)
    )
      throw new ReservationError("A valid booking request key is required.");
    const result = await sequelize.transaction(async (transaction) => {
      // All capacity-changing operations lock this singleton row, including across server processes.
      const config = await settings(transaction);
      const existing = await Reservation.findOne({
        where: { requestKey },
        transaction,
      });
      if (existing) {
        if (existing.email !== emailValue(req.body.email))
          throw new ReservationError(
            "This booking request key is already in use.",
            409,
          );
        return { reservation: safeReservation(existing), repeated: true };
      }
      const data = validateBooking(req.body, config);
      const slots = availableSlots(
        data.date,
        data.guests,
        await dayBookings(data.date, transaction),
        config,
      );
      if (!slots.some((slot) => slot.time === data.time && slot.available))
        throw new ReservationError(
          "That time just filled up. Please choose another available time.",
          409,
        );
      const reservation = await Reservation.create(
        {
          ...data,
          requestKey,
          reference: `JPZ-${randomBytes(8).toString("hex").toUpperCase()}`,
          durationMinutes: config.durationMinutes,
        },
        { transaction },
      );
      return { reservation: safeReservation(reservation), repeated: false };
    });
    res.status(result.repeated ? 200 : 201).json(result);
  }),
);
router.post(
  "/api/reservations/lookup",
  guestLimit,
  route(async (req, res) => {
    res
      .set("Cache-Control", "no-store")
      .json({
        reservation: safeReservation(
          await findGuest(req.body.reference, req.body.email),
        ),
      });
  }),
);
router.post(
  "/api/reservations/guest-availability",
  guestLimit,
  route(async (req, res) => {
    const config = await settings();
    const current = await findGuest(req.body.reference, req.body.email);
    canGuestChange(current, config);
    availableSlots(req.body.date, req.body.guests, [], config);
    res
      .set("Cache-Control", "no-store")
      .json({
        slots: availableSlots(
          req.body.date,
          req.body.guests,
          await dayBookings(req.body.date, undefined, current.id),
          config,
        ),
      });
  }),
);
router.patch(
  "/api/reservations/:reference",
  guestLimit,
  route(async (req, res) => {
    const reservation = await sequelize.transaction(async (transaction) => {
      const config = await settings(transaction);
      const current = await findGuest(
        req.params.reference,
        req.body.email,
        transaction,
      );
      canGuestChange(current, config);
      const data = validateBooking(
        {
          ...current.toJSON(),
          date: req.body.date,
          time: req.body.time,
          guests: req.body.guests,
          notes: req.body.notes,
        },
        config,
      );
      if (
        !availableSlots(
          data.date,
          data.guests,
          await dayBookings(data.date, transaction, current.id),
          config,
        ).some((slot) => slot.time === data.time && slot.available)
      )
        throw new ReservationError(
          "That time is no longer available. Choose another time.",
          409,
        );
      await current.update(
        { ...data, status: "pending", durationMinutes: config.durationMinutes },
        { transaction },
      );
      return safeReservation(current);
    });
    res.json({ reservation });
  }),
);
router.post(
  "/api/reservations/:reference/cancel",
  guestLimit,
  route(async (req, res) => {
    const reservation = await sequelize.transaction(async (transaction) => {
      const config = await settings(transaction);
      const current = await findGuest(
        req.params.reference,
        req.body.email,
        transaction,
      );
      if (current.status !== "cancelled") {
        canGuestChange(current, config);
        await current.update({ status: "cancelled" }, { transaction });
      }
      return safeReservation(current);
    });
    res.json({ reservation });
  }),
);
router.get(
  "/api/admin/reservations",
  admin,
  route(async (req, res) => {
    const date =
      typeof req.query.date === "string" ? req.query.date : localDate();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date))
      throw new ReservationError("Choose a valid date.");
    const reservations = await Reservation.findAll({
      where: { date },
      order: [
        ["time", "ASC"],
        ["createdAt", "ASC"],
      ],
    });
    res
      .set("Cache-Control", "no-store")
      .json({ reservations: reservations.map(safeReservation) });
  }),
);
router.patch(
  "/api/admin/reservations/:id/status",
  admin,
  route(async (req, res) => {
    const reservation = await sequelize.transaction(async (transaction) => {
      await settings(transaction);
      const current = await Reservation.findByPk(req.params.id, {
        transaction,
      });
      if (!current) throw new ReservationError("Reservation not found.", 404);
      const status = req.body.status;
      if (
        typeof status !== "string" ||
        !STATUS_TRANSITIONS[current.status].includes(status)
      )
        throw new ReservationError("This status change is not allowed.", 409);
      const future =
        bookingStart(current.date, current.time).getTime() > Date.now();
      if (status === "no_show" && future)
        throw new ReservationError(
          "A guest can be marked as no-show only after their reservation time.",
        );
      if (status === "seated" && current.date > localDate())
        throw new ReservationError(
          "Guests can be seated on the day of their reservation.",
        );
      if (status === "confirmed" && !future)
        throw new ReservationError("Past reservations cannot be confirmed.");
      await current.update({ status }, { transaction });
      return safeReservation(current);
    });
    res.json({ reservation });
  }),
);
router.put(
  "/api/admin/reservation-settings",
  admin,
  route(async (req, res) => {
    const data = validateSettings(req.body);
    const config = await sequelize.transaction(async (transaction) => {
      const current = await settings(transaction);
      const active = await Reservation.findAll({
        where: {
          date: { [Op.gte]: localDate() },
          status: ["pending", "confirmed", "seated"],
        },
        transaction,
      });
      for (const booking of active) {
        const others = active.filter(
          (other) => other.date === booking.date && other.id !== booking.id,
        );
        if (
          seatsRemaining(
            others,
            timeMinutes(booking.time),
            booking.durationMinutes,
            data.capacity,
          ) < booking.guests
        )
          throw new ReservationError(
            "Capacity cannot be reduced below existing reservations.",
          );
      }
      await current.update(data, { transaction });
      return current;
    });
    res.json(config);
  }),
);
router.use((req, res) =>
  res
    .status(404)
    .json({ error: "This endpoint is not part of Japz online reservations." }),
);
router.use((error, req, res, next) => {
  if (res.headersSent) return next(error);
  if (!(error instanceof ReservationError))
    console.error("Reservation request failed:", error.message);
  res
    .status(error.status || 503)
    .json({
      error:
        error instanceof ReservationError
          ? error.message
          : "Japz reservations are temporarily unavailable. Please try again shortly.",
    });
});
export default router;
