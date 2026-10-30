import { DataTypes } from "sequelize";
import { sequelize } from "./db.js";

/**
 * PayrollEntry — One record per employee per pay period.
 *
 * CRITICAL RULES:
 *   1. Snapshot fields (snapshotHourlyRate, snapshotEmployeeName, snapshotRole)
 *      are COPIED from the Employee record at calculation time and must NEVER
 *      be updated after the entry is APPROVED. This ensures historical accuracy.
 *   2. All monetary fields use DECIMAL(10,2) — never FLOAT.
 *   3. netPay is always >= 0.
 *
 * This model REPLACES the basic Payroll model (TD-02 fix).
 */
export const PayrollEntry = sequelize.define(
  "PayrollEntry",
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    payrollPeriodId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      comment: "FK → PayrollPeriods.id"
    },
    employeeId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      comment: "FK → Employees.id"
    },

    // ── SNAPSHOT FIELDS ──────────────────────────────────────────
    // Copied from Employee at calculation time. Immutable after APPROVED.
    snapshotEmployeeName: {
      type: DataTypes.STRING,
      allowNull: false,
      comment: "Employee name at time of calculation"
    },
    snapshotRole: {
      type: DataTypes.STRING,
      allowNull: false,
      comment: "Employee role at time of calculation"
    },
    snapshotHourlyRate: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      comment: "Hourly rate used for THIS payroll calculation (historical snapshot)"
    },

    // ── HOURS ─────────────────────────────────────────────────────
    regularHours: {
      type: DataTypes.DECIMAL(7, 2),
      allowNull: false,
      defaultValue: 0.00,
      comment: "Total regular (non-overtime) hours worked in this period"
    },
    overtimeHours: {
      type: DataTypes.DECIMAL(7, 2),
      allowNull: false,
      defaultValue: 0.00,
      comment: "Total overtime hours worked in this period"
    },

    // ── EARNINGS ──────────────────────────────────────────────────
    basicPay: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0.00,
      comment: "hourlyRate × regularHours"
    },
    overtimePay: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0.00,
      comment: "hourlyRate × overtimeMultiplier × overtimeHours"
    },
    holidayPay: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0.00
    },
    restDayPay: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0.00
    },
    allowances: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0.00
    },
    bonuses: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0.00
    },
    grossPay: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0.00,
      comment: "Sum of all earnings fields"
    },

    // ── DEDUCTION BREAKDOWN ───────────────────────────────────────
    lateMinutes: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      comment: "Total late minutes across all attendance in this period"
    },
    undertimeMinutes: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      comment: "Total undertime minutes across all attendance in this period"
    },
    absenceDays: {
      type: DataTypes.DECIMAL(4, 1),
      allowNull: false,
      defaultValue: 0.0,
      comment: "Number of absent working days (0.5 for half-days)"
    },
    lateDeduction: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0.00,
      comment: "(hourlyRate / 60) × lateMinutes"
    },
    undertimeDeduction: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0.00,
      comment: "(hourlyRate / 60) × undertimeMinutes"
    },
    absenceDeduction: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0.00,
      comment: "(hourlyRate × regularHoursPerDay) × absenceDays"
    },
    cashAdvanceDeduction: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0.00
    },
    otherDeductions: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0.00
    },
    totalDeductions: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0.00,
      comment: "Sum of all deduction fields"
    },

    // ── NET PAY ───────────────────────────────────────────────────
    netPay: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0.00,
      comment: "grossPay - totalDeductions. Always >= 0."
    },

    // ── METADATA ──────────────────────────────────────────────────
    status: {
      type: DataTypes.ENUM("DRAFT", "CALCULATED", "APPROVED"),
      allowNull: false,
      defaultValue: "DRAFT",
      comment: "Entry-level status (mirrors parent period status for this employee)"
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: "Admin notes for manual adjustments or corrections"
    },
    calculatedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: "Timestamp of the last calculation run"
    },
    calculatedBy: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: "FK → Users.id — admin who triggered the calculation"
    }
  },
  {
    tableName: "payroll_entries",
    timestamps: true,
    indexes: [
      {
        // One entry per employee per period — enforce at DB level
        unique: true,
        fields: ["payrollPeriodId", "employeeId"],
        name: "unique_period_employee"
      },
      { fields: ["payrollPeriodId"] },
      { fields: ["employeeId"] },
      { fields: ["status"] }
    ]
  }
);
