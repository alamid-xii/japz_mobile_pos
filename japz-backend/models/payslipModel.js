import { DataTypes } from "sequelize";
import { sequelize } from "./db.js";

/**
 * Payslip — Employee-facing record generated from a PayrollEntry.
 * One payslip per PayrollEntry (1-to-1 relationship).
 *
 * If a period is reopened after a payslip is generated,
 * the old payslip is marked isSuperseded = true so the
 * employee knows to refer to the new one.
 */
export const Payslip = sequelize.define(
  "Payslip",
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    payrollEntryId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      unique: true,
      comment: "FK → PayrollEntries.id (1-to-1)"
    },
    employeeId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      comment: "FK → Employees.id (denormalized for quick lookup)"
    },
    generatedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      comment: "Timestamp when this payslip was generated"
    },
    generatedBy: {
      type: DataTypes.INTEGER,
      allowNull: false,
      comment: "FK → Users.id — admin who generated this payslip"
    },
    isSuperseded: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      comment: "True if the payroll period was reopened after this payslip was generated"
    }
  },
  {
    tableName: "payslips",
    timestamps: true,
    indexes: [
      { fields: ["employeeId"] },
      { fields: ["payrollEntryId"] }
    ]
  }
);
