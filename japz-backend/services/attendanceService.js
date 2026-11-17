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
import { Attendance, Employee, User, Log } from '../models/index.js';
import { createLog, getClientIp } from '../utils/logger.js';
import { getPayrollConfig } from './payrollConfigService.js';
import { philippineDate, attendanceTotals } from './attendanceTime.js';
import { requireEditableAttendance } from './attendancePayrollLock.js';

// ─── HELPERS ──────────────────────────────────────────────────────────────────

/**
 * Convert a Date to a YYYY-MM-DD string (local date).
 */
const toDateString = philippineDate;

/**
 * Round decimal to 2 places.
 */
const round2 = (v) => Math.round(v * 100) / 100;

// Users and Employees have independent primary keys. Resolve by the explicit
// link (or matching email for legacy staff), never by a coincidental numeric ID.
const resolveAttendanceEmployee = async (userId, { create = false, transaction } = {}) => {
  const user = await User.findByPk(userId, {
    transaction,
    ...(transaction ? { lock: transaction.LOCK.UPDATE } : {}),
  });
  if (!user || user.status !== 'approved' || !['admin', 'cashier', 'kitchen', 'rider', 'inventory'].includes(user.role)) {
    throw new Error('An approved staff account is required to record attendance.');
  }
  let employee = await Employee.findOne({ where: { userId: user.id }, transaction });
  if (!employee) {
    employee = await Employee.findOne({ where: { email: user.email }, transaction });
    if (employee?.userId && employee.userId !== user.id) throw new Error('Your employee profile needs a manager review.');
    if (employee && create && !employee.userId) await employee.update({ userId: user.id }, { transaction });
  }
  if (!employee && create) {
    employee = await Employee.create({
      userId: user.id, name: user.name, email: user.email, phone: user.phone || '',
      password: user.password, role: user.role, status: 'active', hourlyRate: user.hourlyRate || 0,
    }, { transaction });
  }
  if (employee?.status === 'inactive') throw new Error('Your employee profile is inactive. Contact your manager.');
  return employee;
};

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

  const record = await sequelize.transaction(async transaction => {
    // Serialize simultaneous punches on this user's row, including first use.
    const employee = await resolveAttendanceEmployee(employeeId, { create: true, transaction });
    const effectiveEmployeeId = employee.id;
    const openShift = await Attendance.findOne({ where: { employeeId: effectiveEmployeeId, clockOut: null }, transaction });
    if (openShift) throw new Error('Employee already has an open clock-in. Please clock out first.');
    const existingToday = await Attendance.findOne({ where: { employeeId: effectiveEmployeeId, date: dateStr }, transaction });
    if (existingToday) throw new Error('An attendance record already exists for this employee today.');
    return Attendance.create({ employeeId: effectiveEmployeeId, date: dateStr, clockIn: clockInDate, totalHours: 0, lateMinutes: 0, undertimeMinutes: 0 }, { transaction });
  });

  await createLog({
    action: 'OTHER',
    module: 'attendance',
    userId: employeeId,
    entityId: record.id,
    entityType: 'Attendance',
    description: `Employee #${record.employeeId} clocked in at ${clockInDate.toISOString()}`,
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
  const emp = await resolveAttendanceEmployee(employeeId);
  if (!emp) throw new Error('No employee attendance profile found. Please clock in first.');
  const account = await User.findByPk(employeeId, { attributes: ['role', 'availability'] });
  if (account.role === 'rider' && account.availability !== 'offline') throw new Error('Set your delivery status to Offline before clocking out. Finish any assigned delivery first.');
  const record = await sequelize.transaction(async transaction => {
    const current = await Attendance.findOne({ where:{employeeId:emp.id,clockOut:null},order:[['clockIn','DESC']],transaction,lock:transaction.LOCK.UPDATE });
    if (!current) throw new Error('No open clock-in found for this employee. Please clock in first.');
    await requireEditableAttendance(current.date,transaction);
    current.set({ ...attendanceTotals(current.clockIn,clockOutDate,config),clockOut:clockOutDate,clockOutSource:'manual' });
    await current.save({transaction});
    return current;
  });
  await createLog({ action:'OTHER',module:'attendance',userId:employeeId,entityId:record.id,entityType:'Attendance',description:`Employee #${emp.id} clocked out. Hours: ${record.totalHours}h, Late: ${record.lateMinutes}min, Undertime: ${record.undertimeMinutes}min`,ipAddress:req ? getClientIp(req) : null,status:'success' });
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
        clockOutSource:r.clockOutSource, autoClockedOutAt:r.autoClockedOutAt, autoClockOutOriginalTime:r.autoClockOutOriginalTime,
        overtimeApprovedAt:r.overtimeApprovedAt, overtimeApprovedBy:r.overtimeApprovedBy, overtimeApprovalReason:r.overtimeApprovalReason,
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
        clockOutSource:r.clockOutSource, autoClockedOutAt:r.autoClockedOutAt, autoClockOutOriginalTime:r.autoClockOutOriginalTime,
        overtimeApprovedAt:r.overtimeApprovedAt, overtimeApprovedBy:r.overtimeApprovedBy, overtimeApprovalReason:r.overtimeApprovalReason,
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
  if (adminUser?.role !== 'admin') throw new Error('Only an owner or manager with an admin account can correct attendance.');
  return sequelize.transaction(async transaction => {
  const record = await Attendance.findByPk(attendanceId, { transaction, lock:transaction.LOCK.UPDATE });
  if (!record) throw new Error('Attendance record not found');
  await requireEditableAttendance(record.date,transaction);

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
  if (updates.clockIn || updates.clockOut) record.clockOutSource = 'corrected';

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

  await record.save({ transaction });

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
  });
};

/** A per-shift exception; payroll eligibility alone is not an approval. */
export const approveShiftOvertime = async (attendanceId, { approved, reason }, adminUser, req = null) => {
  if (adminUser?.role !== 'admin') throw new Error('Only an owner or manager with an admin account can approve overtime.');
  if (typeof approved !== 'boolean') throw new Error('approved must be true or false.');
  const explanation = String(reason || '').trim();
  if (!explanation || explanation.length > 255) throw new Error('Enter an approval reason of 1–255 characters.');
  return sequelize.transaction(async transaction => {
    const record = await Attendance.findByPk(attendanceId,{ transaction,lock:transaction.LOCK.UPDATE });
    if (!record) throw new Error('Attendance record not found.');
    await requireEditableAttendance(record.date,transaction);
    if (!record.clockIn || record.clockOut) throw new Error('Overtime can only be approved for an open shift.');
    const before = { approvedBy:record.overtimeApprovedBy,approvedAt:record.overtimeApprovedAt };
    record.set({ overtimeApprovedBy:approved ? adminUser.id : null,overtimeApprovedAt:approved ? new Date() : null,overtimeApprovalReason:explanation });
    await record.save({transaction});
    await Log.create({ action:'OTHER',module:'attendance',entityType:'Attendance',entityId:record.id,userId:adminUser.id,userName:adminUser.name,status:'success',description:approved ? 'Manager approved overtime; skip automatic clock-out for this shift.' : 'Manager revoked the overtime exception.',changes:{before,after:{approvedBy:record.overtimeApprovedBy,approvedAt:record.overtimeApprovedAt,reason:explanation}},ipAddress:req ? getClientIp(req) : null },{transaction});
    return record;
  });
};

/**
 * Get current day attendance status for an employee.
 */
export const getMyTodayAttendance = async (userIdOrEmployeeId) => {
  const emp = await resolveAttendanceEmployee(userIdOrEmployeeId);
  const today = toDateString(new Date());
  // Prefer an open shift even if it started before midnight.
  const openShift = emp ? await Attendance.findOne({ where: { employeeId: emp.id, clockOut: null, clockIn: { [Op.ne]: null } }, order: [['clockIn', 'DESC']] }) : null;
  const record = openShift || (emp ? await Attendance.findOne({
    where: {
      employeeId: emp.id,
      date: today
    },
    order: [['createdAt', 'DESC']]
  }) : null);

  return {
    date: today,
    isClockedIn: !!(record && record.clockIn && !record.clockOut),
    isCompleted: !!(record && record.clockIn && record.clockOut),
    record: record || null
  };
};
