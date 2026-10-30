import { DataTypes } from "sequelize";
import { sequelize } from "./db.js";

/**
 * PayrollPeriod — Defines a pay cycle (e.g. October 2026).
 * One record per month. Tracks the overall lifecycle status of a payroll run.
 * PayrollEntries belong to a PayrollPeriod.
 *
 * Status machine:
 *   DRAFT → CALCULATED → UNDER_REVIEW → APPROVED → PAID → LOCKED
 *   Any state (before PAID) → CANCELLED
 */
export const PayrollPeriod = sequelize.define(
  "PayrollPeriod",
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    periodStart: {
      type: DataTypes.DATEONLY,
      allowNull: false,
      comment: "First day of the pay period (e.g. 2026-10-01)"
    },
    periodEnd: {
      type: DataTypes.DATEONLY,
      allowNull: false,
      comment: "Last day / cutoff date of the pay period (e.g. 2026-10-31)"
    },
    payDate: {
      type: DataTypes.DATEONLY,
      allowNull: true,
      comment: "Scheduled date for salary disbursement"
    },
    status: {
      type: DataTypes.ENUM(
        "DRAFT",
        "CALCULATED",
        "UNDER_REVIEW",
        "APPROVED",
        "PAID",
        "LOCKED",
        "CANCELLED"
      ),
      allowNull: false,
      defaultValue: "DRAFT",
      comment: "Current lifecycle status of this payroll period"
    },
    description: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: "Optional human-readable label e.g. 'October 2026 Payroll'"
    },
    createdBy: {
      type: DataTypes.INTEGER,
      allowNull: false,
      comment: "FK → Users.id — admin who opened this period"
    },
    approvedBy: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: "FK → Users.id — admin who approved this period"
    },
    approvedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: "Timestamp when status changed to APPROVED"
    },
    paidAt: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: "Timestamp when status changed to PAID"
    },
    cancelReason: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: "Required explanation if period is CANCELLED"
    }
  },
  {
    tableName: "payroll_periods",
    timestamps: true,
    indexes: [
      { fields: ["status"] },
      { fields: ["periodStart"] },
      { fields: ["periodEnd"] }
    ]
  }
);
