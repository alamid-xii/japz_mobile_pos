import { DataTypes } from "sequelize";
import { sequelize } from "./db.js";

/**
 * One delivery per order. Holds the assignment, the hand-off timestamps and the
 * proof of delivery, so there is an auditable record separate from the order's
 * own status.
 */
export const Delivery = sequelize.define(
  "Delivery",
  {
    orderId: { type: DataTypes.INTEGER, allowNull: false, unique: true },
    riderId: { type: DataTypes.INTEGER, allowNull: false },
    assignedByUserId: { type: DataTypes.INTEGER, allowNull: true, defaultValue: null },
    status: {
      type: DataTypes.ENUM('assigned', 'out-for-delivery', 'delivered', 'failed'),
      allowNull: false,
      defaultValue: 'assigned',
    },
    assignedAt: { type: DataTypes.DATE, allowNull: false },
    startedAt: { type: DataTypes.DATE, allowNull: true, defaultValue: null },
    deliveredAt: { type: DataTypes.DATE, allowNull: true, defaultValue: null },
    // Proof of delivery: required before a rider can mark an order delivered.
    proofPhotoUrl: { type: DataTypes.STRING, allowNull: true, defaultValue: null },
    proofPhotoData: { type: DataTypes.BLOB('long'), allowNull: true, defaultValue: null },
    proofPhotoMime: { type: DataTypes.STRING(32), allowNull: true, defaultValue: null },
    proofPhotoSize: { type: DataTypes.INTEGER, allowNull: true, defaultValue: null },
    proofPhotoSha256: { type: DataTypes.CHAR(64), allowNull: true, defaultValue: null },
    proofLat: { type: DataTypes.DECIMAL(10, 7), allowNull: true, defaultValue: null },
    proofLng: { type: DataTypes.DECIMAL(10, 7), allowNull: true, defaultValue: null },
    locationSharing: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    locationLat: { type: DataTypes.DECIMAL(10, 7), allowNull: true, defaultValue: null },
    locationLng: { type: DataTypes.DECIMAL(10, 7), allowNull: true, defaultValue: null },
    locationAccuracy: { type: DataTypes.FLOAT, allowNull: true, defaultValue: null },
    locationCapturedAt: { type: DataTypes.DATE(3), allowNull: true, defaultValue: null },
    locationUpdatedAt: { type: DataTypes.DATE(3), allowNull: true, defaultValue: null },
    locationStoppedAt: { type: DataTypes.DATE(3), allowNull: true, defaultValue: null },
    notes: { type: DataTypes.TEXT, allowNull: true, defaultValue: null },
  },
  { tableName: "deliveries", timestamps: true,
    // Lists, receipts and location polling must never fetch multi-megabyte images.
    defaultScope: { attributes: { exclude: ['proofPhotoData'] } },
    scopes: { withProof: {} },
  },
);

/** Append-only trail of who changed what, and when. */
export const DeliveryEvent = sequelize.define(
  "DeliveryEvent",
  {
    orderId: { type: DataTypes.INTEGER, allowNull: false },
    deliveryId: { type: DataTypes.INTEGER, allowNull: true, defaultValue: null },
    actorUserId: { type: DataTypes.INTEGER, allowNull: true, defaultValue: null },
    actorRole: { type: DataTypes.STRING(32), allowNull: true, defaultValue: null },
    event: { type: DataTypes.STRING(64), allowNull: false },
    detail: { type: DataTypes.TEXT, allowNull: true, defaultValue: null },
  },
  { tableName: "delivery_events", timestamps: true, updatedAt: false },
);

export { sequelize };
