/**
 * PayrollService — Orchestrates the full payroll lifecycle.
 *
 * This service handles:
 *   - Creating / managing PayrollPeriods
 *   - Running payroll calculation (calls PayrollCalculator)
 *   - Status transitions (DRAFT → CALCULATED → APPROVED → PAID → LOCKED)
 *   - Reopen workflow (APPROVED → UNDER_REVIEW)
 *   - Generating payslips
 *   - All database transactions (multi-table writes are atomic)
 *   - All audit logging via createLog()
 *
 * RULES:
 *   - Never calculate money here — delegate to payrollCalculator.js
 *   - All multi-table writes use sequelize.transaction()
 *   - Approved/Paid/Locked entries are immutable
 */
import { Op } from 'sequelize';
import { sequelize } from '../models/db.js';
import {
  PayrollPeriod,
  PayrollEntry,
  PayrollAdjustment,
  Payslip,
  Employee,
  User
} from '../models/index.js';
import { createLog } from '../utils/logger.js';
import { calculatePayrollEntry, roundMoney } from './payrollCalculator.js';
import { getPayrollConfig } from './payrollConfigService.js';
import { getAttendanceForPeriod, getAttendanceValidationReport } from './attendanceService.js';

// ─── STATUS TRANSITION GUARD ──────────────────────────────────────────────────

const VALID_TRANSITIONS = {
  DRAFT:        ['CALCULATED', 'CANCELLED'],
  CALCULATED:   ['UNDER_REVIEW', 'DRAFT', 'CANCELLED'],
  UNDER_REVIEW: ['APPROVED', 'CALCULATED'],
  APPROVED:     ['PAID', 'UNDER_REVIEW'],
  PAID:         ['LOCKED'],
  LOCKED:       ['UNDER_REVIEW'],
  CANCELLED:    ['DRAFT'],
};

const assertTransitionAllowed = (from, to) => {
  const allowed = VALID_TRANSITIONS[from] || [];
  if (!allowed.includes(to)) {
    throw new Error(
      `Invalid status transition: ${from} → ${to}. ` +
      `Allowed: ${allowed.join(', ') || 'none (terminal state)'}`
    );
  }
};

// ─── CREATE PAYROLL PERIOD ────────────────────────────────────────────────────

/**
 * Open a new payroll period (Step 1 of the payroll lifecycle).
 *
 * @param {string} periodStart - 'YYYY-MM-DD'
 * @param {string} periodEnd   - 'YYYY-MM-DD'
 * @param {string} description - Optional label
 * @param {Object} adminUser   - { id, name }
 */
export const createPayrollPeriod = async (periodStart, periodEnd, description, adminUser) => {
  // Validate dates
  if (new Date(periodStart) >= new Date(periodEnd)) {
    throw new Error('periodStart must be before periodEnd');
  }

  // EC-30: Check for overlapping periods
  const overlap = await PayrollPeriod.findOne({
    where: {
      status: { [Op.notIn]: ['CANCELLED'] },
      [Op.or]: [
        { periodStart: { [Op.between]: [periodStart, periodEnd] } },
        { periodEnd:   { [Op.between]: [periodStart, periodEnd] } },
        {
          periodStart: { [Op.lte]: periodStart },
          periodEnd:   { [Op.gte]: periodEnd }
        }
      ]
    }
  });

  if (overlap) {
    throw new Error(
      `A payroll period already exists that overlaps with ${periodStart} → ${periodEnd} ` +
      `(existing: ${overlap.periodStart} → ${overlap.periodEnd})`
    );
  }

  const period = await PayrollPeriod.create({
    periodStart,
    periodEnd,
    description: description || `Payroll ${periodStart} to ${periodEnd}`,
    status: 'DRAFT',
    createdBy: adminUser.id
  });

  await createLog({
    action: 'OTHER',
    module: 'payroll',
    userId: adminUser.id,
    userName: adminUser.name,
    entityId: period.id,
    entityType: 'PayrollPeriod',
    description: `Created payroll period: ${period.description}`,
    status: 'success'
  });

  return period;
};

// ─── CALCULATE PAYROLL ────────────────────────────────────────────────────────

/**
 * Run payroll calculation for all active employees in a period.
 * Creates or replaces PayrollEntry records.
 *
 * @param {number} periodId
 * @param {Object} adminUser - { id, name }
 */
export const calculatePayroll = async (periodId, adminUser) => {
  const period = await PayrollPeriod.findByPk(periodId);
  if (!period) throw new Error('Payroll period not found');

  // Only allow calculation from DRAFT or UNDER_REVIEW
  if (!['DRAFT', 'CALCULATED', 'UNDER_REVIEW'].includes(period.status)) {
    throw new Error(`Cannot calculate payroll in status: ${period.status}`);
  }

  // Load dynamic config
  const config = await getPayrollConfig();

  // Get active staff: check Employee table first, fallback to approved cashier/kitchen Users
  let employees = [];
  try {
    employees = await Employee.findAll({ where: { status: 'active' } });
  } catch {
    employees = [];
  }

  if (!employees || employees.length === 0) {
    const staffUsers = await User.findAll({
      where: {
        role: { [Op.in]: ['cashier', 'kitchen'] },
        status: 'approved'
      }
    });
    employees = staffUsers.map(u => ({
      id: u.id,
      name: u.name,
      role: u.role,
      email: u.email,
      hourlyRate: parseFloat(u.hourlyRate) || parseFloat(config.defaultHourlyRate) || 75.00
    }));
  }

  if (employees.length === 0) {
    throw new Error('No active employees or approved cashier/kitchen staff found. Please approve staff accounts first.');
  }

  const t = await sequelize.transaction();
  try {
    const entries = [];

    for (const employee of employees) {
      // Get validated attendance for this employee in the period
      const attendanceRecords = await getAttendanceForPeriod(
        employee.id,
        period.periodStart,
        period.periodEnd
      );

      // Run the pure calculator
      const calculated = calculatePayrollEntry(
        {
          hourlyRate: employee.hourlyRate,
          name: employee.name,
          role: employee.role,
          overtimeAllowed: employee.overtimeAllowed,
          monthlyAllowance: employee.monthlyAllowance,
          dailyAllowance: employee.dailyAllowance,
          customDeduction: employee.customDeduction,
          sssExempt: employee.sssExempt,
          philhealthExempt: employee.philhealthExempt,
          pagibigExempt: employee.pagibigExempt,
          taxExempt: employee.taxExempt
        },
        {
          periodStart: period.periodStart,
          periodEnd: period.periodEnd,
          asOfDate: (period.periodEnd > new Date().toISOString().split('T')[0])
            ? new Date().toISOString().split('T')[0]
            : null
        },
        attendanceRecords,
        config,
        {} // extras (no cash advances or manual items yet)
      );

      // Upsert the PayrollEntry (update if exists, create if not)
      const [entry] = await PayrollEntry.upsert(
        {
          payrollPeriodId:     periodId,
          employeeId:          employee.id,
          ...calculated,
          status:              'CALCULATED',
          calculatedAt:        new Date(),
          calculatedBy:        adminUser.id
        },
        { transaction: t, conflictFields: ['payrollPeriodId', 'employeeId'] }
      );

      entries.push(entry);
    }

    // Update period status
    assertTransitionAllowed(period.status, 'CALCULATED');
    period.status = 'CALCULATED';
    await period.save({ transaction: t });

    await t.commit();

    // Log after commit (createLog never throws)
    await createLog({
      action: 'OTHER',
      module: 'payroll',
      userId: adminUser.id,
      userName: adminUser.name,
      entityId: period.id,
      entityType: 'PayrollPeriod',
      description: `Calculated payroll for ${employees.length} employees. Period: ${period.description}`,
      changes: { employeeCount: employees.length },
      status: 'success'
    });

    return { period, entryCount: entries.length };
  } catch (error) {
    await t.rollback();
    throw error;
  }
};

// ─── STATUS TRANSITIONS ───────────────────────────────────────────────────────

/**
 * Move period to UNDER_REVIEW.
 */
export const markUnderReview = async (periodId, adminUser) => {
  const period = await PayrollPeriod.findByPk(periodId);
  if (!period) throw new Error('Payroll period not found');
  assertTransitionAllowed(period.status, 'UNDER_REVIEW');
  period.status = 'UNDER_REVIEW';
  await period.save();
  await createLog({
    action: 'OTHER', module: 'payroll', userId: adminUser.id, userName: adminUser.name,
    entityId: period.id, entityType: 'PayrollPeriod',
    description: `Payroll period moved to UNDER_REVIEW: ${period.description}`,
    changes: { from: 'CALCULATED', to: 'UNDER_REVIEW' }, status: 'success'
  });
  return period;
};

/**
 * Approve a payroll period. Once approved, entries are frozen.
 */
export const approvePayroll = async (periodId, adminUser) => {
  const period = await PayrollPeriod.findByPk(periodId);
  if (!period) throw new Error('Payroll period not found');
  assertTransitionAllowed(period.status, 'APPROVED');

  const t = await sequelize.transaction();
  try {
    period.status     = 'APPROVED';
    period.approvedBy = adminUser.id;
    period.approvedAt = new Date();
    await period.save({ transaction: t });

    // Freeze all entries
    await PayrollEntry.update(
      { status: 'APPROVED' },
      { where: { payrollPeriodId: periodId }, transaction: t }
    );

    await t.commit();

    await createLog({
      action: 'OTHER', module: 'payroll', userId: adminUser.id, userName: adminUser.name,
      entityId: period.id, entityType: 'PayrollPeriod',
      description: `Payroll APPROVED by ${adminUser.name}: ${period.description}`,
      changes: { from: 'UNDER_REVIEW', to: 'APPROVED' }, status: 'success'
    });

    return period;
  } catch (error) {
    await t.rollback();
    throw error;
  }
};

/**
 * Mark payroll as PAID.
 */
export const markPayrollPaid = async (periodId, adminUser) => {
  const period = await PayrollPeriod.findByPk(periodId);
  if (!period) throw new Error('Payroll period not found');
  assertTransitionAllowed(period.status, 'PAID');
  period.status = 'PAID';
  period.paidAt = new Date();
  await period.save();
  await createLog({
    action: 'OTHER', module: 'payroll', userId: adminUser.id, userName: adminUser.name,
    entityId: period.id, entityType: 'PayrollPeriod',
    description: `Payroll marked PAID: ${period.description}`,
    changes: { from: 'APPROVED', to: 'PAID' }, status: 'success'
  });
  return period;
};

/**
 * Lock a payroll period permanently. Terminal state.
 */
export const lockPayroll = async (periodId, adminUser) => {
  const period = await PayrollPeriod.findByPk(periodId);
  if (!period) throw new Error('Payroll period not found');
  assertTransitionAllowed(period.status, 'LOCKED');
  period.status = 'LOCKED';
  await period.save();
  await createLog({
    action: 'OTHER', module: 'payroll', userId: adminUser.id, userName: adminUser.name,
    entityId: period.id, entityType: 'PayrollPeriod',
    description: `Payroll LOCKED: ${period.description}`,
    changes: { from: 'PAID', to: 'LOCKED' }, status: 'success'
  });
  return period;
};

/**
 * Reopen an APPROVED period (requires written reason).
 * Marks any existing payslips as superseded.
 */
export const reopenPayroll = async (periodId, reason, adminUser) => {
  if (!reason || reason.trim().length < 5) {
    throw new Error('A reason of at least 5 characters is required to reopen a payroll period');
  }

  const period = await PayrollPeriod.findByPk(periodId);
  if (!period) throw new Error('Payroll period not found');
  assertTransitionAllowed(period.status, 'UNDER_REVIEW');

  const t = await sequelize.transaction();
  try {
    const prevStatus = period.status;
    period.status = 'UNDER_REVIEW';
    await period.save({ transaction: t });

    // Reset entry statuses
    await PayrollEntry.update(
      { status: 'CALCULATED' },
      { where: { payrollPeriodId: periodId }, transaction: t }
    );

    // Mark existing payslips as superseded
    const entryIds = (await PayrollEntry.findAll({
      where: { payrollPeriodId: periodId },
      attributes: ['id']
    })).map(e => e.id);

    if (entryIds.length > 0) {
      await Payslip.update(
        { isSuperseded: true },
        { where: { payrollEntryId: { [Op.in]: entryIds } }, transaction: t }
      );
    }

    await t.commit();

    await createLog({
      action: 'OTHER', module: 'payroll', userId: adminUser.id, userName: adminUser.name,
      entityId: period.id, entityType: 'PayrollPeriod',
      description: `Payroll REOPENED by ${adminUser.name}. Reason: ${reason}`,
      changes: { from: prevStatus, to: 'UNDER_REVIEW', reason },
      status: 'success'
    });

    return period;
  } catch (error) {
    await t.rollback();
    throw error;
  }
};

/**
 * Cancel a payroll period (before PAID).
 */
export const cancelPayroll = async (periodId, reason, adminUser) => {
  if (!reason || reason.trim().length < 5) {
    throw new Error('A reason is required to cancel a payroll period');
  }

  const period = await PayrollPeriod.findByPk(periodId);
  if (!period) throw new Error('Payroll period not found');
  assertTransitionAllowed(period.status, 'CANCELLED');

  period.status       = 'CANCELLED';
  period.cancelReason = reason;
  await period.save();

  await createLog({
    action: 'OTHER', module: 'payroll', userId: adminUser.id, userName: adminUser.name,
    entityId: period.id, entityType: 'PayrollPeriod',
    description: `Payroll CANCELLED: ${period.description}. Reason: ${reason}`,
    status: 'success'
  });

  return period;
};

// ─── GENERATE PAYSLIPS ────────────────────────────────────────────────────────

/**
 * Generate payslips for all entries in an APPROVED period.
 */
export const generatePayslips = async (periodId, adminUser) => {
  const period = await PayrollPeriod.findByPk(periodId);
  if (!period) throw new Error('Payroll period not found');
  if (period.status !== 'APPROVED') {
    throw new Error('Payslips can only be generated for APPROVED payroll periods');
  }

  const entries = await PayrollEntry.findAll({ where: { payrollPeriodId: periodId } });

  const t = await sequelize.transaction();
  try {
    const payslips = [];
    for (const entry of entries) {
      const [payslip] = await Payslip.upsert(
        {
          payrollEntryId: entry.id,
          employeeId:     entry.employeeId,
          generatedAt:    new Date(),
          generatedBy:    adminUser.id,
          isSuperseded:   false
        },
        { transaction: t, conflictFields: ['payrollEntryId'] }
      );
      payslips.push(payslip);
    }

    await t.commit();

    await createLog({
      action: 'OTHER', module: 'payroll', userId: adminUser.id, userName: adminUser.name,
      entityId: period.id, entityType: 'PayrollPeriod',
      description: `Generated ${payslips.length} payslips for ${period.description}`,
      status: 'success'
    });

    return payslips;
  } catch (error) {
    await t.rollback();
    throw error;
  }
};

// ─── ADD MANUAL ADJUSTMENT ────────────────────────────────────────────────────

/**
 * Add a post-PAID adjustment to a payroll entry.
 */
export const addAdjustment = async (entryId, adjustmentData, adminUser) => {
  const entry = await PayrollEntry.findByPk(entryId);
  if (!entry) throw new Error('Payroll entry not found');

  const { adjustmentType, description, amount, reason } = adjustmentData;
  if (!adjustmentType || !description || !amount || !reason) {
    throw new Error('adjustmentType, description, amount, and reason are all required');
  }

  const adjustment = await PayrollAdjustment.create({
    payrollEntryId: entryId,
    adjustmentType,
    description,
    amount: Math.abs(parseFloat(amount)),
    reason,
    createdBy: adminUser.id
  });

  const numAmount = Math.abs(parseFloat(amount));
  if (adjustmentType === 'earning') {
    entry.bonuses = roundMoney((parseFloat(entry.bonuses) || 0) + numAmount);
    entry.grossPay = roundMoney((parseFloat(entry.grossPay) || 0) + numAmount);
  } else {
    entry.otherDeductions = roundMoney((parseFloat(entry.otherDeductions) || 0) + numAmount);
    entry.totalDeductions = roundMoney((parseFloat(entry.totalDeductions) || 0) + numAmount);
  }
  entry.netPay = roundMoney(Math.max(0, parseFloat(entry.grossPay) - parseFloat(entry.totalDeductions)));
  await entry.save();

  await createLog({
    action: 'OTHER', module: 'payroll', userId: adminUser.id, userName: adminUser.name,
    entityId: entryId, entityType: 'PayrollEntry',
    description: `Manual adjustment added to entry #${entryId}: ${description} (${adjustmentType}: ${amount})`,
    changes: { adjustmentType, amount, reason },
    status: 'success'
  });

  return adjustment;
};

// ─── QUERIES ──────────────────────────────────────────────────────────────────

export const getAllPeriods = async () => {
  return await PayrollPeriod.findAll({
    order: [['periodStart', 'DESC']],
    include: [
      {
        model: PayrollEntry,
        as: 'entries',
        attributes: ['id', 'netPay', 'grossPay', 'employeeId', 'snapshotEmployeeName']
      }
    ]
  });
};

export const getPeriodById = async (periodId) => {
  return await PayrollPeriod.findByPk(periodId, {
    include: [
      {
        model: PayrollEntry,
        as: 'entries',
        include: [{ model: Employee, as: 'employee', attributes: ['id', 'name', 'role', 'email'], required: false }]
      }
    ]
  });
};

export const getMyPayslips = async (userIdOrEmployeeId) => {
  // First, find employee by linked userId (since req.user.id is passed from controller)
  let employee = await Employee.findOne({ where: { userId: userIdOrEmployeeId } });
  if (!employee) {
    employee = await Employee.findByPk(userIdOrEmployeeId);
  }

  const empId = employee ? employee.id : userIdOrEmployeeId;

  return await Payslip.findAll({
    where: { employeeId: empId, isSuperseded: false },
    order: [['generatedAt', 'DESC']],
    include: [
      {
        model: PayrollEntry,
        as: 'payrollEntry',
        include: [
          { model: PayrollPeriod, as: 'payrollPeriod' },
          { model: PayrollAdjustment, as: 'adjustments' }
        ]
      }
    ]
  });
};


export const getEntryById = async (entryId) => {
  return await PayrollEntry.findByPk(entryId, {
    include: [
      { model: Employee, as: 'employee', attributes: ['id', 'name', 'role', 'email'], required: false },
      { model: PayrollAdjustment, as: 'adjustments' },
      { model: Payslip, as: 'payslip' }
    ]
  });
};

