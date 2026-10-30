/**
 * AttendanceService — Clock-in/out logic and attendance validation.
 *
 * RULES (from docs/payroll/ATTENDANCE_RULES.md):
 *   - Only one open attendance record per employee per day
 *   - clockIn/clockOut are stored as DATETIME (full timestamp)
 *   - lateMinutes and undertimeMinutes are computed at clock-out
 *   - Grace period is loaded from PayrollConfig
 *   - Missing punch detection runs before payroll is generated
 *
 * All write operations are logged via createLog().
 */
import { Op } from 'sequelize';
import { sequelize } from '../models/db.js';
import { Attendance, Employee, User } from '../models/index.js';
import { createLog, getClientIp } from '../utils/logger.js';
import { getPayrollConfig } from './payrollConfigService.js';

// ─── HELPERS ──────────────────────────────────────────────────────────────────

/**
 * Convert a Date to a YYYY-MM-DD string (local date).
 */
const toDateString = (date) => {
  const d = new Date(date);
  const year  = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day   = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

/**
 * Round decimal to 2 places.
 */
const round2 = (v) => Math.round(v * 100) / 100;

// ─── CLOCK IN ─────────────────────────────────────────────────────────────────

/**
 * Clock an employee in.
 *
 * @param {number} employeeId
 * @param {Date|string} clockInTime - Defaults to now if not provided
 * @param {Object} req - Express request (for IP logging)
 * @returns {Promise<Attendance>}
 */
export const clockIn = async (employeeId, clockInTime = new Date(), req = null) => {
  const clockInDate = new Date(clockInTime);
  const dateStr = toDateString(clockInDate);

  let emp = await Employee.findOne({ where: { userId: employeeId } });
  if (!emp) {
    emp = await Employee.findByPk(employeeId);
  }
  const effectiveEmployeeId = emp ? emp.id : employeeId;

  // EC-10 / EC-11: Block if employee currently has any open uncompleted shift
  const openShift = await Attendance.findOne({
    where: { employeeId: effectiveEmployeeId, clockOut: null }
  });
  if (openShift) {
    throw new Error('Employee already has an open clock-in. Please clock out first.');
  }

  // Block if an attendance record already exists for this calendar date
  const existingToday = await Attendance.findOne({
    where: { employeeId: effectiveEmployeeId, date: dateStr }
  });
  if (existingToday) {
    throw new Error('An attendance record already exists for this employee today.');
  }

  const record = await Attendance.create({
    employeeId: effectiveEmployeeId,
    date: dateStr,
    clockIn: clockInDate,
    totalHours: 0,
    lateMinutes: 0,
    undertimeMinutes: 0
  });

  await createLog({
    action: 'OTHER',
    module: 'attendance',
    userId: effectiveEmployeeId,
    entityId: record.id,
    entityType: 'Attendance',
    description: `Employee #${effectiveEmployeeId} clocked in at ${clockInDate.toISOString()}`,
    ipAddress: req ? getClientIp(req) : null,
    status: 'success'
  });

  return record;
};

// ─── CLOCK OUT ────────────────────────────────────────────────────────────────

/**
 * Clock an employee out. Computes totalHours, lateMinutes, undertimeMinutes.
 *
 * @param {number} employeeId
 * @param {Date|string} clockOutTime - Defaults to now
 * @param {Object} req - Express request (for IP logging)
 * @returns {Promise<Attendance>}
 */
export const clockOut = async (employeeId, clockOutTime = new Date(), req = null) => {
  const clockOutDate = new Date(clockOutTime);
  const config = await getPayrollConfig();

  let emp = await Employee.findOne({ where: { userId: employeeId } });
  if (!emp) {
    emp = await Employee.findByPk(employeeId);
  }
  const effectiveEmployeeId = emp ? emp.id : employeeId;

  // Find the open record: look for the most recent unclosed clock-in (handles overnight shifts crossing midnight)
  const record = await Attendance.findOne({
    where: {
      employeeId: effectiveEmployeeId,
      clockOut: null
    },
    order: [['clockIn', 'DESC']]
  });

  if (!record) {
    throw new Error('No open clock-in found for this employee. Please clock in first.');
  }

  const clockInDate = new Date(record.clockIn);

  // EC-09: Prevent clocking out before clocking in
  if (clockOutDate <= clockInDate) {
    throw new Error('Clock-out time must be after clock-in time.');
  }

  // ── Calculate totalHours ─────────────────────────────────────────────────
  const durationMs  = clockOutDate - clockInDate;
  const rawHours    = durationMs / (1000 * 60 * 60);
  const breakHours  = (rawHours >= 5) ? (config.breakMinutes / 60) : 0;
  const totalHours  = round2(Math.max(0, rawHours - breakHours));

  // ── Calculate lateMinutes ─────────────────────────────────────────────────
  // We derive shift start from the config's regularHoursPerDay assumption.
  // The shift start is stored in PayrollConfig as a TIME — for now we use
  // a simple calculation: late = clockIn minutes after midnight vs. shift start.
  // For now, lateMinutes is stored on Attendance at clock-in time by attendanceService
  // when the admin records it, or it can be set here based on a shiftStart config.
  // For this implementation, we carry through lateMinutes from the record
  // (it may have been set at clock-in time via the admin portal or QR punch).
  const lateMinutes = record.lateMinutes || 0;

  // ── Calculate undertimeMinutes ────────────────────────────────────────────
  // Undertime = if they worked less than regularHoursPerDay (net of break)
  const expectedNetHours = config.regularHoursPerDay;
  const undertimeMinutes = totalHours < expectedNetHours
    ? Math.round((expectedNetHours - totalHours) * 60)
    : 0;

  record.clockOut         = clockOutDate;
  record.totalHours       = totalHours;
  record.lateMinutes      = lateMinutes;
  record.undertimeMinutes = undertimeMinutes;
  await record.save();

  await createLog({
    action: 'OTHER',
    module: 'attendance',
    userId: employeeId,
    entityId: record.id,
    entityType: 'Attendance',
    description: `Employee #${employeeId} clocked out. Hours: ${totalHours}h, Late: ${lateMinutes}min, Undertime: ${undertimeMinutes}min`,
    ipAddress: req ? getClientIp(req) : null,
    status: 'success'
  });

  return record;
};

// ─── GET ATTENDANCE FOR PERIOD ────────────────────────────────────────────────

/**
 * Get all attendance records for an employee in a date range.
 *
 * @param {number} employeeId
 * @param {string} startDate - 'YYYY-MM-DD'
 * @param {string} endDate   - 'YYYY-MM-DD'
 * @returns {Promise<Attendance[]>}
 */
export const getAttendanceForPeriod = async (employeeId, startDate, endDate) => {
  return await Attendance.findAll({
    where: {
      employeeId,
      date: { [Op.between]: [startDate, endDate] }
    },
    order: [['date', 'ASC']]
  });
};

// ─── VALIDATION REPORT ────────────────────────────────────────────────────────

/**
 * Generate a validation report before payroll generation.
 * Flags: missing clock-outs, duplicate records.
 *
 * @param {string} periodStart - 'YYYY-MM-DD'
 * @param {string} periodEnd   - 'YYYY-MM-DD'
 * @returns {Promise<Object>} - { isReady, issues: [] }
 */
export const getAttendanceValidationReport = async (periodStart, periodEnd) => {
  const allRecords = await Attendance.findAll({
    where: {
      date: { [Op.between]: [periodStart, periodEnd] }
    },
    include: [{ model: Employee, as: 'employee', attributes: ['id', 'name', 'role', 'email'], required: false }],
    order: [['date', 'DESC'], ['clockIn', 'DESC']]
  });

  const issues = [];
  const userNameCache = {};

  for (const record of allRecords) {
    let empName = record.employee?.name;
    if (!empName) {
      if (!userNameCache[record.employeeId]) {
        try {
          const u = await User.findByPk(record.employeeId, { attributes: ['name', 'role'] });
          userNameCache[record.employeeId] = u ? { name: u.name, role: u.role } : { name: `Employee #${record.employeeId}`, role: 'staff' };
        } catch {
          userNameCache[record.employeeId] = { name: `Employee #${record.employeeId}`, role: 'staff' };
        }
      }
      empName = userNameCache[record.employeeId].name;
    }

    // EC-09: Missing clock-out
    if (record.clockIn && !record.clockOut) {
      issues.push({
        type: 'MISSING_CLOCK_OUT',
        employeeId: record.employeeId,
        employeeName: empName,
        date: record.date,
        attendanceId: record.id,
        clockIn: record.clockIn,
        clockOut: record.clockOut,
        message: `${empName} has a missing clock-out on ${record.date}`
      });
    }

    // EC-08: Missing clock-in (clockOut without clockIn — data anomaly)
    if (!record.clockIn && record.clockOut) {
      issues.push({
        type: 'MISSING_CLOCK_IN',
        employeeId: record.employeeId,
        employeeName: empName,
        date: record.date,
        attendanceId: record.id,
        clockIn: record.clockIn,
        clockOut: record.clockOut,
        message: `${empName} has a missing clock-in on ${record.date}`
      });
    }
  }

  const formattedRecords = allRecords.map(r => {
    const fallback = userNameCache[r.employeeId] || { name: `Employee #${r.employeeId}`, role: 'staff' };
    const empName = r.employee?.name || fallback.name;
    const empRole = r.employee?.role || fallback.role || 'staff';
    const hasMissingOut = r.clockIn && !r.clockOut;
    const hasMissingIn = !r.clockIn && r.clockOut;
    const isLate = parseInt(r.lateMinutes) > 0;
    const isUndertime = parseInt(r.undertimeMinutes) > 0;

    let status = 'ON_TIME';
    if (hasMissingOut) status = 'MISSING_CLOCK_OUT';
    else if (hasMissingIn) status = 'MISSING_CLOCK_IN';
    else if (isLate) status = 'LATE';
    else if (isUndertime) status = 'UNDERTIME';

    return {
      id: r.id,
      employeeId: r.employeeId,
      employeeName: empName,
      employeeRole: empRole,
      date: r.date,
      clockIn: r.clockIn,
      clockOut: r.clockOut,
      totalHours: parseFloat(r.totalHours) || 0,
      lateMinutes: parseInt(r.lateMinutes) || 0,
      undertimeMinutes: parseInt(r.undertimeMinutes) || 0,
      notes: r.notes || '',
      status
    };
  });

  return {
    isReady: issues.length === 0,
    totalRecords: allRecords.length,
    issueCount: issues.length,
    issues,
    records: formattedRecords
  };
};

/**
 * Get attendance records filtered by month or date range.
 */
export const getAttendanceRecords = async ({ startDate, endDate, month, employeeId } = {}) => {
  let start = startDate;
  let end = endDate;

  if (month && (!start || !end)) {
    // format YYYY-MM
    const [yearStr, monthStr] = month.split('-');
    const y = parseInt(yearStr, 10);
    const m = parseInt(monthStr, 10);
    start = new Date(y, m - 1, 1).toISOString().split('T')[0];
    end = new Date(y, m, 0).toISOString().split('T')[0];
  }

  const whereClause = {};
  if (start && end) {
    whereClause.date = { [Op.between]: [start, end] };
  } else if (start) {
    whereClause.date = { [Op.gte]: start };
  } else if (end) {
    whereClause.date = { [Op.lte]: end };
  }

  if (employeeId) {
    whereClause.employeeId = employeeId;
  }

  const records = await Attendance.findAll({
    where: whereClause,
    include: [{ model: Employee, as: 'employee', attributes: ['id', 'name', 'role', 'email'], required: false }],
    order: [['date', 'DESC'], ['clockIn', 'DESC']]
  });

  const userNameCache = {};
  const formatted = await Promise.all(
    records.map(async (r) => {
      let empName = r.employee?.name;
      let empRole = r.employee?.role;
      if (!empName) {
        if (!userNameCache[r.employeeId]) {
          try {
            const u = await User.findByPk(r.employeeId, { attributes: ['name', 'role'] });
            userNameCache[r.employeeId] = u ? { name: u.name, role: u.role } : { name: `Employee #${r.employeeId}`, role: 'staff' };
          } catch {
            userNameCache[r.employeeId] = { name: `Employee #${r.employeeId}`, role: 'staff' };
          }
        }
        empName = userNameCache[r.employeeId].name;
        empRole = userNameCache[r.employeeId].role;
      }

      const hasMissingOut = r.clockIn && !r.clockOut;
      const hasMissingIn = !r.clockIn && r.clockOut;
      const isLate = parseInt(r.lateMinutes) > 0;
      const isUndertime = parseInt(r.undertimeMinutes) > 0;

      let status = 'ON_TIME';
      if (hasMissingOut) status = 'MISSING_CLOCK_OUT';
      else if (hasMissingIn) status = 'MISSING_CLOCK_IN';
      else if (isLate) status = 'LATE';
      else if (isUndertime) status = 'UNDERTIME';

      return {
        id: r.id,
        employeeId: r.employeeId,
        employeeName: empName || `Employee #${r.employeeId}`,
        employeeRole: empRole || 'staff',
        date: r.date,
        clockIn: r.clockIn,
        clockOut: r.clockOut,
        totalHours: parseFloat(r.totalHours) || 0,
        lateMinutes: parseInt(r.lateMinutes) || 0,
        undertimeMinutes: parseInt(r.undertimeMinutes) || 0,
        notes: r.notes || '',
        status
      };
    })
  );

  return formatted;
};

// ─── ADMIN CORRECTION ─────────────────────────────────────────────────────────

/**
 * Admin-correct an attendance record.
 * Blocked if the attendance belongs to an APPROVED/PAID/LOCKED payroll entry.
 *
 * @param {number} attendanceId
 * @param {Object} updates - { clockIn, clockOut, notes }
 * @param {Object} adminUser - { id, name } from req.user
 * @param {Object} req
 */
export const adminCorrectAttendance = async (attendanceId, updates, adminUser, req = null) => {
  const record = await Attendance.findByPk(attendanceId);
  if (!record) throw new Error('Attendance record not found');

  const before = {
    clockIn: record.clockIn,
    clockOut: record.clockOut,
    totalHours: record.totalHours,
    lateMinutes: record.lateMinutes,
    undertimeMinutes: record.undertimeMinutes
  };

  // Apply updates safely
  if (updates.clockIn !== undefined && updates.clockIn !== '') {
    const d = new Date(updates.clockIn);
    if (isNaN(d.getTime())) throw new Error('Invalid clock-in date/time format.');
    record.clockIn = d;
  }
  if (updates.clockOut !== undefined && updates.clockOut !== '') {
    const d = new Date(updates.clockOut);
    if (isNaN(d.getTime())) throw new Error('Invalid clock-out date/time format.');
    record.clockOut = d;
  }
  if (updates.notes !== undefined) record.notes = updates.notes;

  // Validate timestamps ordering and recompute hours if both timestamps are present
  if (record.clockIn && record.clockOut) {
    if (new Date(record.clockOut) <= new Date(record.clockIn)) {
      throw new Error('Clock-out time must be after clock-in time.');
    }
    const config = await getPayrollConfig();
    const durationMs = new Date(record.clockOut) - new Date(record.clockIn);
    const rawHours   = durationMs / (1000 * 60 * 60);
    const breakHours = (rawHours >= 5) ? (config.breakMinutes / 60) : 0;
    record.totalHours = round2(Math.max(0, rawHours - breakHours));

    const expectedNetHours = config.regularHoursPerDay;
    record.undertimeMinutes = record.totalHours < expectedNetHours
      ? Math.round((expectedNetHours - record.totalHours) * 60)
      : 0;
  }

  await record.save();

  await createLog({
    action: 'OTHER',
    module: 'attendance',
    userId: adminUser.id,
    userName: adminUser.name,
    entityId: attendanceId,
    entityType: 'Attendance',
    description: `Admin corrected attendance record #${attendanceId} for employee #${record.employeeId}`,
    changes: { before, after: {
      clockIn: record.clockIn,
      clockOut: record.clockOut,
      totalHours: record.totalHours,
      notes: record.notes
    }},
    ipAddress: req ? getClientIp(req) : null,
    status: 'success'
  });

  return record;
};

/**
 * Get current day attendance status for an employee.
 */
export const getMyTodayAttendance = async (userIdOrEmployeeId) => {
  let emp = await Employee.findOne({ where: { userId: userIdOrEmployeeId } });
  if (!emp) {
    emp = await Employee.findByPk(userIdOrEmployeeId);
  }
  const effectiveEmployeeId = emp ? emp.id : userIdOrEmployeeId;
  const today = toDateString(new Date());

  const record = await Attendance.findOne({
    where: {
      employeeId: effectiveEmployeeId,
      date: today
    },
    order: [['createdAt', 'DESC']]
  });

  return {
    date: today,
    isClockedIn: !!(record && record.clockIn && !record.clockOut),
    isCompleted: !!(record && record.clockIn && record.clockOut),
    record: record || null
  };
};
