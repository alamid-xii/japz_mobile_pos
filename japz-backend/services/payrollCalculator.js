/**
 * PayrollCalculator — Pure payroll calculation engine.
 *
 * RULES (from AI_AGENT_RULES.md):
 *   ✅ Pure function — same inputs always produce same outputs
 *   ✅ Zero database calls
 *   ✅ Zero side effects
 *   ✅ All monetary values rounded with roundMoney()
 *   ✅ All time values use decimal hours, never HH:MM strings
 *   ✅ netPay is always >= 0
 *
 * All formulas are sourced from: docs/payroll/PAYROLL_FORMULAS.md
 */

// ─── UTILITIES ────────────────────────────────────────────────────────────────

/**
 * Round a monetary value to exactly 2 decimal places.
 * Use this for EVERY monetary calculation result before returning.
 * @param {number} value
 * @returns {number}
 */
export const roundMoney = (value) => Math.round(value * 100) / 100;

/**
 * Convert a duration in milliseconds to decimal hours.
 * e.g. 30600000ms (8h 30m) → 8.5
 * @param {number} ms - Duration in milliseconds
 * @returns {number}
 */
export const toDecimalHours = (ms) => ms / (1000 * 60 * 60);

/**
 * Convert decimal hours to minutes.
 * @param {number} decimalHours
 * @returns {number}
 */
export const hoursToMinutes = (decimalHours) => decimalHours * 60;

// ─── DEFAULT CONFIG VALUES ─────────────────────────────────────────────────────
// These match the seeds in payrollConfigService.js.
// Always loaded from DB via config param — never hardcoded in production.

export const DEFAULT_CONFIG = {
  regularHoursPerDay: 8,
  gracePeriodMinutes: 5,
  overtimeMultiplier: 1.25,
  restDayMultiplier: 1.30,
  breakMinutes: 60,         // unpaid break per day
  workingDays: [1, 2, 3, 4, 5, 6], // Mon-Sat (0=Sun, 6=Sat)
  deductAbsenceDailyRate: true,
};

// ─── ATTENDANCE AGGREGATOR ─────────────────────────────────────────────────────

/**
 * Aggregate raw attendance records into totals for the pay period.
 *
 * @param {Array} attendanceRecords - Array of validated attendance rows from DB
 *   Each: { date, clockIn, clockOut, totalHours, lateMinutes, undertimeMinutes }
 * @returns {{ totalRegularHours, totalOvertimeHours, totalLateMinutes, totalUndertimeMinutes }}
 */
export const aggregateAttendance = (attendanceRecords, config = DEFAULT_CONFIG) => {
  let totalRegularHours = 0;
  let totalOvertimeHours = 0;
  let totalLateMinutes = 0;
  let totalUndertimeMinutes = 0;

  for (const record of attendanceRecords) {
    const hoursWorked = parseFloat(record.totalHours) || 0;
    const regularHoursPerDay = config.regularHoursPerDay;

    // record.totalHours is already net of break (deducted at clock-out/recording)
    if (hoursWorked <= regularHoursPerDay) {
      totalRegularHours += hoursWorked;
    } else {
      totalRegularHours += regularHoursPerDay;
      totalOvertimeHours += hoursWorked - regularHoursPerDay;
    }

    totalLateMinutes += parseInt(record.lateMinutes) || 0;
    totalUndertimeMinutes += parseInt(record.undertimeMinutes) || 0;
  }

  return {
    totalRegularHours: Math.round(totalRegularHours * 100) / 100,
    totalOvertimeHours: Math.round(totalOvertimeHours * 100) / 100,
    totalLateMinutes: Math.round(totalLateMinutes),
    totalUndertimeMinutes: Math.round(totalUndertimeMinutes),
  };
};

// ─── ABSENCE COUNTER ──────────────────────────────────────────────────────────

/**
 * Count absent working days in a period.
 * A day is absent if it's a working day with no attendance record and no approved leave.
 * Future dates beyond asOfDate are NEVER counted as absent.
 *
 * @param {string} periodStart - 'YYYY-MM-DD'
 * @param {string} periodEnd   - 'YYYY-MM-DD'
 * @param {Array}  attendanceDates - Array of 'YYYY-MM-DD' strings where employee attended
 * @param {Array}  workingDays - Array of day-of-week ints that are working days [0=Sun...6=Sat]
 * @param {string|Date|null} asOfDate - If provided, cutoff date for evaluating past absences
 * @returns {number} - Number of absent working days
 */
export const countAbsentDays = (
  periodStart,
  periodEnd,
  attendanceDates,
  workingDays = DEFAULT_CONFIG.workingDays,
  asOfDate = null
) => {
  const start = new Date(periodStart);
  let end = new Date(periodEnd);

  // If asOfDate is provided, cap the evaluation to asOfDate
  // An employee cannot be absent on dates that have not yet occurred!
  if (asOfDate) {
    const asOf = new Date(asOfDate);
    if (end > asOf) {
      end = asOf;
    }
  }

  // If start is after end (e.g. period entirely in the future), 0 absences
  if (start > end) {
    return 0;
  }

  const attendedSet = new Set(attendanceDates);
  let absentDays = 0;
  const cursor = new Date(start);

  while (cursor <= end) {
    const dayOfWeek = cursor.getDay(); // 0=Sun, 6=Sat
    const dateStr = cursor.toISOString().split('T')[0];

    if (workingDays.includes(dayOfWeek) && !attendedSet.has(dateStr)) {
      absentDays++;
    }

    cursor.setDate(cursor.getDate() + 1);
  }

  return absentDays;
};

// ─── MAIN CALCULATOR ──────────────────────────────────────────────────────────

/**
 * Calculate a single employee's payroll entry for a pay period.
 *
 * This is the ONLY authoritative payroll calculation function.
 * All other code must call this. Do not duplicate this logic elsewhere.
 *
 * @param {Object} employeeSnapshot - { hourlyRate, name, role }
 * @param {Object} payrollPeriod    - { periodStart, periodEnd } (date strings)
 * @param {Array}  attendanceRecords - Validated attendance from DB
 * @param {Object} config           - Payroll config from PayrollConfigService
 * @param {Object} extras           - { allowances, bonuses, cashAdvanceDeduction, otherDeductions }
 *
 * @returns {Object} - Complete payroll entry values ready for DB insertion
 */
export const calculatePayrollEntry = (
  employeeSnapshot,
  payrollPeriod,
  attendanceRecords,
  config = DEFAULT_CONFIG,
  extras = {}
) => {
  const {
    hourlyRate,
    name: employeeName,
    role: employeeRole,
  } = employeeSnapshot;

  const rate = parseFloat(hourlyRate) || 0;
  const perMinuteRate = rate / 60; // Formula: PMR = HR / 60

  // ── Step 1: Aggregate attendance ────────────────────────────────
  const {
    totalRegularHours,
    totalOvertimeHours,
    totalLateMinutes,
    totalUndertimeMinutes,
  } = aggregateAttendance(attendanceRecords, config);

  // ── Step 2: Count absent days ────────────────────────────────────
  const attendanceDates = attendanceRecords.map((r) => r.date);
  const absenceDays = countAbsentDays(
    payrollPeriod.periodStart,
    payrollPeriod.periodEnd,
    attendanceDates,
    config.workingDays,
    payrollPeriod.asOfDate || null
  );

  // ── Step 3: Earnings ─────────────────────────────────────────────
  // BasicPay = HR × RH
  const basicPay = roundMoney(rate * totalRegularHours);

  // OvertimePay = HR × OT_MULT × OH (if employee is eligible for overtime)
  const isOvertimeAllowed = employeeSnapshot.overtimeAllowed !== false;
  const overtimePay = isOvertimeAllowed
    ? roundMoney(rate * (parseFloat(config.overtimeMultiplier) || 1.25) * totalOvertimeHours)
    : 0;

  const holidayPay       = roundMoney(parseFloat(extras.holidayPay) || 0);
  const restDayPay       = roundMoney(parseFloat(extras.restDayPay) || 0);
  const employeeMonthlyAllow = parseFloat(employeeSnapshot.monthlyAllowance) || 0;
  const employeeDailyAllow   = (parseFloat(employeeSnapshot.dailyAllowance) || 0) * attendanceDates.length;
  const allowances       = roundMoney((parseFloat(extras.allowances) || 0) + employeeMonthlyAllow + employeeDailyAllow);
  const bonuses          = roundMoney(parseFloat(extras.bonuses) || 0);

  // GrossPay = sum of all earnings
  const grossPay = roundMoney(
    basicPay + overtimePay + holidayPay + restDayPay + allowances + bonuses
  );

  // ── Step 4: Deductions ───────────────────────────────────────────
  // LateDeduction = PMR × LM
  const lateDeduction = roundMoney(perMinuteRate * totalLateMinutes);

  // UndertimeDeduction = PMR × UM
  const undertimeDeduction = roundMoney(perMinuteRate * totalUndertimeMinutes);

  // AbsenceDeduction = DR × AD  where DR = HR × regularHoursPerDay
  // Can be disabled via config (deductAbsenceDailyRate: false) for hourly staff under No Work No Pay
  const dailyRate = rate * (parseFloat(config.regularHoursPerDay) || 8);
  const isAbsenceDeductionDisabled =
    config.deductAbsenceDailyRate === false ||
    config.deductAbsenceDailyRate === 'false';

  const absenceDeduction = isAbsenceDeductionDisabled
    ? 0
    : roundMoney(dailyRate * absenceDays);

  const cashAdvanceDeduction = roundMoney(parseFloat(extras.cashAdvanceDeduction) || 0);
  const employeeCustomDed    = parseFloat(employeeSnapshot.customDeduction) || 0;
  const otherDeductions      = roundMoney((parseFloat(extras.otherDeductions) || 0) + employeeCustomDed);

  // TotalDeductions = sum of all deductions
  const totalDeductions = roundMoney(
    lateDeduction + undertimeDeduction + absenceDeduction +
    cashAdvanceDeduction + otherDeductions
  );

  // ── Step 5: Net Pay ──────────────────────────────────────────────
  // NetPay = GrossPay - TotalDeductions (NEVER negative)
  const netPay = roundMoney(Math.max(0, grossPay - totalDeductions));

  // ── Return structured result ─────────────────────────────────────
  return {
    // Snapshot
    snapshotEmployeeName: employeeName,
    snapshotRole:         employeeRole,
    snapshotHourlyRate:   rate,

    // Hours
    regularHours:  totalRegularHours,
    overtimeHours: totalOvertimeHours,

    // Earnings
    basicPay,
    overtimePay,
    holidayPay,
    restDayPay,
    allowances,
    bonuses,
    grossPay,

    // Deduction breakdown
    lateMinutes:       totalLateMinutes,
    undertimeMinutes:  totalUndertimeMinutes,
    absenceDays,
    lateDeduction,
    undertimeDeduction,
    absenceDeduction,
    cashAdvanceDeduction,
    otherDeductions,
    totalDeductions,

    // Net
    netPay,
  };
};
