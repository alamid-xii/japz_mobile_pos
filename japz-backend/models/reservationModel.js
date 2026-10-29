import { DataTypes } from "sequelize";
import { sequelize } from "./db.js";
import { DEFAULT_SETTINGS } from "../services/reservationRules.js";

export const Reservation = sequelize.define(
  "Reservation",
  {
    reference: { type: DataTypes.STRING(24), allowNull: false, unique: true },
    requestKey: { type: DataTypes.STRING(64), allowNull: false, unique: true },
    name: { type: DataTypes.STRING(100), allowNull: false },
    email: { type: DataTypes.STRING(254), allowNull: false },
    phone: { type: DataTypes.STRING(25), allowNull: false },
    date: { type: DataTypes.DATEONLY, allowNull: false },
    time: { type: DataTypes.STRING(5), allowNull: false },
    guests: { type: DataTypes.INTEGER, allowNull: false },
    durationMinutes: { type: DataTypes.INTEGER, allowNull: false },
    occasion: {
      type: DataTypes.STRING(40),
      allowNull: false,
      defaultValue: "Just dining",
    },
    notes: { type: DataTypes.TEXT, allowNull: false, defaultValue: "" },
    status: {
      type: DataTypes.ENUM(
        "pending",
        "confirmed",
        "seated",
        "completed",
        "cancelled",
        "no_show",
      ),
      allowNull: false,
      defaultValue: "pending",
    },
  },
  { tableName: "reservations", indexes: [{ fields: ["date", "status"] }] },
);

export const ReservationSettings = sequelize.define(
  "ReservationSettings",
  {
    id: { type: DataTypes.INTEGER, primaryKey: true },
    ...Object.fromEntries(
      [
        "capacity",
        "maxPartySize",
        "durationMinutes",
        "slotIntervalMinutes",
        "leadTimeMinutes",
        "advanceDays",
      ].map((key) => [
        key,
        {
          type: DataTypes.INTEGER,
          allowNull: false,
          defaultValue: DEFAULT_SETTINGS[key],
        },
      ]),
    ),
    openTime: {
      type: DataTypes.STRING(5),
      allowNull: false,
      defaultValue: DEFAULT_SETTINGS.openTime,
    },
    closeTime: {
      type: DataTypes.STRING(5),
      allowNull: false,
      defaultValue: DEFAULT_SETTINGS.closeTime,
    },
    timeZone: {
      type: DataTypes.STRING(40),
      allowNull: false,
      defaultValue: DEFAULT_SETTINGS.timeZone,
    },
  },
  { tableName: "reservation_settings" },
);
