import { DataTypes } from "sequelize";
import { sequelize } from "./db.js";

/**
 * One PayMongo hosted-checkout session per payment attempt.
 *
 * Kept separate from Payment so a customer who abandons checkout and tries
 * again leaves an honest trail of attempts, rather than one row being
 * overwritten until something finally succeeds.
 */
export const PaymentSession = sequelize.define(
  "PaymentSession",
  {
    orderId: { type: DataTypes.INTEGER, allowNull: false },
    orderNumber: { type: DataTypes.STRING(32), allowNull: false },
    // PayMongo's checkout session id (cs_...).
    sessionId: { type: DataTypes.STRING(64), allowNull: false, unique: true },
    checkoutUrl: { type: DataTypes.STRING(512), allowNull: false },
    // Centavos, matching what was actually sent to PayMongo.
    amount: { type: DataTypes.INTEGER, allowNull: false },
    methods: { type: DataTypes.STRING(128), allowNull: true, defaultValue: null },
    status: {
      type: DataTypes.ENUM('pending', 'paid', 'failed', 'expired', 'cancelled'),
      allowNull: false,
      defaultValue: 'pending',
    },
    // Where the payment was started, so POS and online attempts are separable.
    source: { type: DataTypes.ENUM('online', 'pos'), allowNull: false, defaultValue: 'online' },
    // PayMongo's payment id (pay_...), only once actually paid.
    paymentId: { type: DataTypes.STRING(64), allowNull: true, defaultValue: null },
    paidMethod: { type: DataTypes.STRING(32), allowNull: true, defaultValue: null },
    paidAt: { type: DataTypes.DATE, allowNull: true, defaultValue: null },
    // How we learned it was paid: 'webhook' or 'readback'. Useful when a
    // webhook could not reach the server and the redirect check settled it.
    confirmedVia: { type: DataTypes.STRING(16), allowNull: true, defaultValue: null },
    createdByUserId: { type: DataTypes.INTEGER, allowNull: true, defaultValue: null },
    lastError: { type: DataTypes.STRING(255), allowNull: true, defaultValue: null },
  },
  { tableName: "payment_sessions", timestamps: true },
);
