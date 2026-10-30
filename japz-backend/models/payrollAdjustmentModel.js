import { DataTypes } from "sequelize";
import { sequelize } from "./db.js";

/**
 * PayrollAdjustment — Post-PAID corrections to a payroll entry.
 *
 * RULE: Once a PayrollEntry is PAID or LOCKED, it is IMMUTABLE.
 * Corrections are recorded here as separate adjustment records.
 * They do NOT modify the original PayrollEntry.
 *
 * Adjustments are typically processed in the next payroll period
 * or as an off-cycle payment.
 */
export const PayrollAdjustment = sequelize.define(
  "PayrollAdjustment",
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    payrollEntryId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      comment: "FK → PayrollEntries.id — the entry being adjusted"
    },
    adjustmentType: {
      type: DataTypes.ENUM("earning", "deduction"),
      allowNull: false,
      comment: "'earning' adds to pay, 'deduction' subtracts from pay"
    },
    description: {
      type: DataTypes.STRING,
      allowNull: false,
      comment: "What this adjustment is for (e.g. 'Missed overtime Oct 15')"
    },
    amount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      comment: "The adjustment amount. Always positive — type determines +/-."
    },
    reason: {
      type: DataTypes.TEXT,
      allowNull: false,
      comment: "Required written explanation for audit purposes"
    },
    createdBy: {
      type: DataTypes.INTEGER,
      allowNull: false,
      comment: "FK → Users.id — admin who created this adjustment"
    }
  },
  {
    tableName: "payroll_adjustments",
    timestamps: true,
    indexes: [
      { fields: ["payrollEntryId"] }
    ]
  }
);
