import { DataTypes } from "sequelize";
import { sequelize } from "./db.js";

/**
 * PayrollConfig — Dynamic payroll calculation rules.
 * Admin can update these through the Payroll Settings UI.
 * Pattern mirrors businessHoursModel.js for consistency.
 *
 * Keys and their default values:
 *   regularHoursPerDay   → "8"     (hours)
 *   gracePeriodMinutes   → "5"     (minutes)
 *   overtimeMultiplier   → "1.25"  (multiplier)
 *   restDayMultiplier    → "1.30"  (multiplier)
 *   workingDays          → "1,2,3,4,5,6"  (0=Sun,1=Mon...6=Sat)
 *   breakMinutes         → "60"    (unpaid break minutes per day)
 */
export const PayrollConfig = sequelize.define(
  "PayrollConfig",
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    configKey: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
      comment: "The name of the configuration rule (e.g. gracePeriodMinutes)"
    },
    configValue: {
      type: DataTypes.STRING,
      allowNull: false,
      comment: "The value as a string. Cast to appropriate type when reading."
    },
    description: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: "Human-readable description of what this config controls"
    },
    updatedBy: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: "FK → Users.id — admin who last updated this config"
    }
  },
  {
    tableName: "payroll_configs",
    timestamps: true
  }
);
