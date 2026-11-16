import { DataTypes } from "sequelize";
import { sequelize } from "./db.js";

/** A physical table that can be reserved. */
export const RestaurantTable = sequelize.define(
  "RestaurantTable",
  {
    name: { type: DataTypes.STRING(32), allowNull: false },
    capacity: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 2 },
    area: { type: DataTypes.STRING(32), allowNull: true, defaultValue: null },
    status: {
      type: DataTypes.ENUM('active', 'inactive'),
      allowNull: false,
      defaultValue: 'active',
    },
    notes: { type: DataTypes.STRING(255), allowNull: true, defaultValue: null },
  },
  { tableName: "restaurant_tables", timestamps: true },
);

/**
 * A table booking. Requests arrive as 'pending' and a staff member confirms or
 * declines: the restaurant keeps the final say, so a slot is never promised
 * automatically. A table is only held once the booking is confirmed.
 */
export const Reservation = sequelize.define(
  "Reservation",
  {
    code: { type: DataTypes.STRING(24), allowNull: false, unique: true },
    // Null for a walk-in or phone booking typed in by staff.
    customerUserId: { type: DataTypes.INTEGER, allowNull: true, defaultValue: null },
    customerName: { type: DataTypes.STRING(128), allowNull: false },
    customerPhone: { type: DataTypes.STRING(32), allowNull: true, defaultValue: null },
    customerEmail: { type: DataTypes.STRING(128), allowNull: true, defaultValue: null },
    partySize: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 2 },
    reservationDate: { type: DataTypes.DATEONLY, allowNull: false },
    startTime: { type: DataTypes.TIME, allowNull: false },
    durationMinutes: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 90 },
    tableId: { type: DataTypes.INTEGER, allowNull: true, defaultValue: null },
    status: {
      type: DataTypes.ENUM('pending', 'confirmed', 'seated', 'completed', 'cancelled', 'declined', 'no-show'),
      allowNull: false,
      defaultValue: 'pending',
    },
    source: { type: DataTypes.ENUM('online', 'staff'), allowNull: false, defaultValue: 'online' },
    notes: { type: DataTypes.STRING(255), allowNull: true, defaultValue: null },
    // Why a booking was declined or cancelled, shown back to the customer.
    staffMessage: { type: DataTypes.STRING(255), allowNull: true, defaultValue: null },
    createdByUserId: { type: DataTypes.INTEGER, allowNull: true, defaultValue: null },
    confirmedByUserId: { type: DataTypes.INTEGER, allowNull: true, defaultValue: null },
    confirmedAt: { type: DataTypes.DATE, allowNull: true, defaultValue: null },
    seatedAt: { type: DataTypes.DATE, allowNull: true, defaultValue: null },
    closedAt: { type: DataTypes.DATE, allowNull: true, defaultValue: null },
  },
  { tableName: "reservations", timestamps: true, indexes: [{ fields: ["reservationDate", "startTime"] }, { fields: ["tableId", "reservationDate"] }, { fields: ["customerUserId"] }] },
);

/** Append-only trail of who changed a booking, and when. */
export const ReservationEvent = sequelize.define(
  "ReservationEvent",
  {
    reservationId: { type: DataTypes.INTEGER, allowNull: false },
    actorUserId: { type: DataTypes.INTEGER, allowNull: true, defaultValue: null },
    actorRole: { type: DataTypes.STRING(32), allowNull: true, defaultValue: null },
    event: { type: DataTypes.STRING(64), allowNull: false },
    detail: { type: DataTypes.TEXT, allowNull: true, defaultValue: null },
  },
  { tableName: "reservation_events", timestamps: true, updatedAt: false },
);
