import { DataTypes } from "sequelize";
import { sequelize } from "./db.js";

/**
 * One row per shift. Written when a staff member clocks in and closed when they
 * clock out, so payroll is computed from recorded attendance rather than from
 * numbers typed in by hand.
 */
export const AttendanceLog = sequelize.define(
  "AttendanceLog",
  {
    userId: { type: DataTypes.INTEGER, allowNull: false },
    workDate: { type: DataTypes.DATEONLY, allowNull: false },
    clockInAt: { type: DataTypes.DATE, allowNull: false },
    clockOutAt: { type: DataTypes.DATE, allowNull: true, defaultValue: null },
    // Stored once on clock-out. Recomputing later from timestamps would let a
    // timezone or clock change silently rewrite a paid shift.
    minutesWorked: { type: DataTypes.INTEGER, allowNull: true, defaultValue: null },
    // Set when the shift is closed by an admin rather than by the staff member.
    closedByUserId: { type: DataTypes.INTEGER, allowNull: true, defaultValue: null },
    notes: { type: DataTypes.STRING(255), allowNull: true, defaultValue: null },
  },
  { tableName: "attendance_logs", timestamps: true },
);

/** A pay period. Payslips are generated into it, then it is finalized. */
export const PayrollPeriod = sequelize.define(
  "PayrollPeriod",
  {
    label: { type: DataTypes.STRING(64), allowNull: false },
    startDate: { type: DataTypes.DATEONLY, allowNull: false },
    endDate: { type: DataTypes.DATEONLY, allowNull: false },
    status: {
      type: DataTypes.ENUM('draft', 'finalized'),
      allowNull: false,
      defaultValue: 'draft',
    },
    createdById: { type: DataTypes.INTEGER, allowNull: true, defaultValue: null },
    finalizedById: { type: DataTypes.INTEGER, allowNull: true, defaultValue: null },
    finalizedAt: { type: DataTypes.DATE, allowNull: true, defaultValue: null },
  },
  { tableName: "payroll_periods", timestamps: true },
);

/**
 * One payslip per employee per period. Pay rate and every deduction rate are
 * SNAPSHOT here at generation time: changing a rate later must never rewrite a
 * payslip that has already been issued.
 */
export const Payslip = sequelize.define(
  "Payslip",
  {
    periodId: { type: DataTypes.INTEGER, allowNull: false },
    userId: { type: DataTypes.INTEGER, allowNull: false },
    employeeName: { type: DataTypes.STRING(128), allowNull: false },
    payType: { type: DataTypes.ENUM('hourly', 'monthly'), allowNull: false, defaultValue: 'hourly' },
    payRate: { type: DataTypes.DECIMAL(10, 2), allowNull: false, defaultValue: 0 },
    daysWorked: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    regularHours: { type: DataTypes.DECIMAL(8, 2), allowNull: false, defaultValue: 0 },
    overtimeHours: { type: DataTypes.DECIMAL(8, 2), allowNull: false, defaultValue: 0 },
    overtimeMultiplier: { type: DataTypes.DECIMAL(4, 2), allowNull: false, defaultValue: 1.25 },
    basicPay: { type: DataTypes.DECIMAL(10, 2), allowNull: false, defaultValue: 0 },
    overtimePay: { type: DataTypes.DECIMAL(10, 2), allowNull: false, defaultValue: 0 },
    grossPay: { type: DataTypes.DECIMAL(10, 2), allowNull: false, defaultValue: 0 },
    // [{ label, rate, amount }] - the rates used, kept with the payslip.
    deductions: { type: DataTypes.JSON, allowNull: true, defaultValue: null },
    otherDeductionLabel: { type: DataTypes.STRING(64), allowNull: true, defaultValue: null },
    otherDeductionAmount: { type: DataTypes.DECIMAL(10, 2), allowNull: false, defaultValue: 0 },
    totalDeductions: { type: DataTypes.DECIMAL(10, 2), allowNull: false, defaultValue: 0 },
    netPay: { type: DataTypes.DECIMAL(10, 2), allowNull: false, defaultValue: 0 },
    notes: { type: DataTypes.STRING(255), allowNull: true, defaultValue: null },
  },
  { tableName: "payslips", timestamps: true },
);

/**
 * Single-row settings. Contribution rates are deliberately NOT seeded with real
 * SSS / PhilHealth / Pag-IBIG / BIR figures: those are published bracket tables
 * that change, and a wrong number on a payslip is worse than a blank one.
 * `ratesConfigured` stays false until an admin saves their own values, and the
 * UI warns for as long as it is false.
 */
export const PayrollSetting = sequelize.define(
  "PayrollSetting",
  {
    standardHoursPerDay: { type: DataTypes.DECIMAL(4, 2), allowNull: false, defaultValue: 8 },
    overtimeMultiplier: { type: DataTypes.DECIMAL(4, 2), allowNull: false, defaultValue: 1.25 },
    // Percentages of gross pay, employee share. 0 until configured.
    sssRate: { type: DataTypes.DECIMAL(6, 4), allowNull: false, defaultValue: 0 },
    philhealthRate: { type: DataTypes.DECIMAL(6, 4), allowNull: false, defaultValue: 0 },
    pagibigRate: { type: DataTypes.DECIMAL(6, 4), allowNull: false, defaultValue: 0 },
    taxRate: { type: DataTypes.DECIMAL(6, 4), allowNull: false, defaultValue: 0 },
    // Divisor for the hourly equivalent of a monthly salary (22 vs 26 days is
    // a house convention, so it is set here rather than hardcoded).
    monthlyWorkingDays: { type: DataTypes.DECIMAL(4, 1), allowNull: false, defaultValue: 22 },
    ratesConfigured: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
  },
  { tableName: "payroll_settings", timestamps: true },
);
