import express from "express";
import jwt from "jsonwebtoken";
import { Op } from "sequelize";
import { User } from "../models/userModel.js";
import { AttendanceLog, PayrollPeriod, Payslip, PayrollSetting } from "../models/payrollModel.js";

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key-change-in-production";

// Roles that draw a wage. Customers are never included.
const STAFF_ROLES = ['admin', 'cashier', 'kitchen', 'rider'];

const requireRole = (...roles) => (req, res, next) => {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) return res.status(401).json({ error: 'No token provided' });
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    if (roles.length && !roles.includes(decoded.role)) {
      return res.status(403).json({ error: 'You do not have access to this.' });
    }
    req.user = decoded;
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid token' });
  }
};

const money = (n) => Math.round(Number(n) * 100) / 100;
const hours = (mins) => Math.round((mins / 60) * 100) / 100;
/** Local YYYY-MM-DD. Using toISOString here would shift the date in PH time. */
const localDate = (d = new Date()) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

const getSettings = async () => {
  let s = await PayrollSetting.findOne();
  if (!s) s = await PayrollSetting.create({});
  return s;
};

// ========== ATTENDANCE (staff, own record) ==========

/** The caller's open shift, plus their recent history. */
router.get("/api/attendance/me", requireRole(...STAFF_ROLES), async (req, res) => {
  try {
    const open = await AttendanceLog.findOne({
      where: { userId: req.user.id, clockOutAt: null },
      order: [['clockInAt', 'DESC']],
    });
    const recent = await AttendanceLog.findAll({
      where: { userId: req.user.id },
      order: [['clockInAt', 'DESC']],
      limit: 30,
    });
    const totalMinutes = recent
      .filter(r => r.minutesWorked != null)
      .reduce((n, r) => n + r.minutesWorked, 0);

    res.json({
      open: open ? { id: open.id, clockInAt: open.clockInAt, workDate: open.workDate } : null,
      recent: recent.map(r => ({
        id: r.id,
        workDate: r.workDate,
        clockInAt: r.clockInAt,
        clockOutAt: r.clockOutAt,
        minutesWorked: r.minutesWorked,
        closedByAdmin: r.closedByUserId != null,
      })),
      recentHours: hours(totalMinutes),
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post("/api/attendance/clock-in", requireRole(...STAFF_ROLES), async (req, res) => {
  try {
    const existing = await AttendanceLog.findOne({
      where: { userId: req.user.id, clockOutAt: null },
    });
    if (existing) {
      return res.status(409).json({ error: 'You are already clocked in.' });
    }
    const now = new Date();
    const log = await AttendanceLog.create({
      userId: req.user.id,
      workDate: localDate(now),
      clockInAt: now,
    });
    res.json({ ok: true, open: { id: log.id, clockInAt: log.clockInAt, workDate: log.workDate } });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post("/api/attendance/clock-out", requireRole(...STAFF_ROLES), async (req, res) => {
  try {
    const open = await AttendanceLog.findOne({
      where: { userId: req.user.id, clockOutAt: null },
      order: [['clockInAt', 'DESC']],
    });
    if (!open) return res.status(409).json({ error: 'You are not clocked in.' });

    const now = new Date();
    const minutes = Math.max(0, Math.round((now - new Date(open.clockInAt)) / 60000));
    await open.update({ clockOutAt: now, minutesWorked: minutes });
    res.json({ ok: true, minutesWorked: minutes, hoursWorked: hours(minutes) });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ========== ATTENDANCE (admin view) ==========

router.get("/api/payroll/attendance", requireRole('admin'), async (req, res) => {
  try {
    const { from, to, userId } = req.query;
    const where = {};
    if (from && to) where.workDate = { [Op.between]: [from, to] };
    else if (from) where.workDate = { [Op.gte]: from };
    if (userId) where.userId = Number(userId);

    const logs = await AttendanceLog.findAll({
      where,
      order: [['clockInAt', 'DESC']],
      limit: 500,
    });
    const staff = await User.findAll({ where: { role: { [Op.in]: STAFF_ROLES } } });
    const byId = Object.fromEntries(staff.map(u => [u.id, u.name]));

    res.json({
      logs: logs.map(l => ({
        id: l.id,
        userId: l.userId,
        employeeName: byId[l.userId] || `User #${l.userId}`,
        workDate: l.workDate,
        clockInAt: l.clockInAt,
        clockOutAt: l.clockOutAt,
        minutesWorked: l.minutesWorked,
        hoursWorked: l.minutesWorked != null ? hours(l.minutesWorked) : null,
        closedByAdmin: l.closedByUserId != null,
      })),
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/** Closes a shift someone forgot to clock out of. Recorded as admin-closed. */
router.put("/api/payroll/attendance/:id/close", requireRole('admin'), async (req, res) => {
  try {
    const log = await AttendanceLog.findByPk(req.params.id);
    if (!log) return res.status(404).json({ error: 'Shift not found.' });
    if (log.clockOutAt) return res.status(409).json({ error: 'That shift is already closed.' });

    const at = req.body.clockOutAt ? new Date(req.body.clockOutAt) : new Date();
    if (Number.isNaN(at.getTime())) return res.status(400).json({ error: 'Invalid time.' });
    if (at <= new Date(log.clockInAt)) {
      return res.status(400).json({ error: 'Clock-out must be after clock-in.' });
    }

    const minutes = Math.max(0, Math.round((at - new Date(log.clockInAt)) / 60000));
    await log.update({
      clockOutAt: at,
      minutesWorked: minutes,
      closedByUserId: req.user.id,
      notes: req.body.notes ? String(req.body.notes).slice(0, 255) : 'Closed by admin',
    });
    res.json({ ok: true, hoursWorked: hours(minutes) });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ========== SETTINGS & PAY RATES ==========

router.get("/api/payroll/settings", requireRole('admin'), async (req, res) => {
  try {
    const s = await getSettings();
    res.json({
      settings: {
        standardHoursPerDay: Number(s.standardHoursPerDay),
        overtimeMultiplier: Number(s.overtimeMultiplier),
        sssRate: Number(s.sssRate),
        philhealthRate: Number(s.philhealthRate),
        pagibigRate: Number(s.pagibigRate),
        taxRate: Number(s.taxRate),
        monthlyWorkingDays: Number(s.monthlyWorkingDays),
        ratesConfigured: !!s.ratesConfigured,
      },
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.put("/api/payroll/settings", requireRole('admin'), async (req, res) => {
  try {
    const s = await getSettings();
    const num = (v, fallback) => {
      const n = Number(v);
      return Number.isFinite(n) && n >= 0 ? n : fallback;
    };
    // Rates are entered as percentages in the UI and stored as fractions.
    const rate = (v, fallback) => {
      const n = Number(v);
      return Number.isFinite(n) && n >= 0 && n <= 100 ? n / 100 : fallback;
    };

    await s.update({
      standardHoursPerDay: num(req.body.standardHoursPerDay, s.standardHoursPerDay),
      overtimeMultiplier: num(req.body.overtimeMultiplier, s.overtimeMultiplier),
      monthlyWorkingDays: num(req.body.monthlyWorkingDays, s.monthlyWorkingDays),
      sssRate: rate(req.body.sssRate, s.sssRate),
      philhealthRate: rate(req.body.philhealthRate, s.philhealthRate),
      pagibigRate: rate(req.body.pagibigRate, s.pagibigRate),
      taxRate: rate(req.body.taxRate, s.taxRate),
      ratesConfigured: true,
    });
    res.json({ ok: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/** Staff with their pay rates, for the admin's rate table. */
router.get("/api/payroll/staff", requireRole('admin'), async (req, res) => {
  try {
    const staff = await User.findAll({
      where: { role: { [Op.in]: STAFF_ROLES }, status: 'approved' },
      order: [['name', 'ASC']],
    });
    res.json({
      staff: staff.map(u => ({
        id: u.id,
        name: u.name,
        email: u.email,
        role: u.role,
        payType: u.payType,
        payRate: Number(u.payRate),
      })),
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.put("/api/payroll/staff/:id/rate", requireRole('admin'), async (req, res) => {
  try {
    const user = await User.findByPk(req.params.id);
    if (!user || !STAFF_ROLES.includes(user.role)) {
      return res.status(404).json({ error: 'Employee not found.' });
    }
    const { payType, payRate } = req.body;
    if (!['hourly', 'monthly'].includes(payType)) {
      return res.status(400).json({ error: 'Pay type must be hourly or monthly.' });
    }
    const n = Number(payRate);
    if (!Number.isFinite(n) || n < 0) return res.status(400).json({ error: 'Invalid pay rate.' });

    await user.update({ payType, payRate: money(n) });
    res.json({ ok: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ========== PERIODS & PAYSLIPS ==========

router.get("/api/payroll/periods", requireRole('admin'), async (req, res) => {
  try {
    const periods = await PayrollPeriod.findAll({ order: [['startDate', 'DESC']], limit: 60 });
    const rows = await Promise.all(periods.map(async (p) => {
      const slips = await Payslip.findAll({ where: { periodId: p.id } });
      return {
        id: p.id,
        label: p.label,
        startDate: p.startDate,
        endDate: p.endDate,
        status: p.status,
        finalizedAt: p.finalizedAt,
        payslipCount: slips.length,
        totalNet: money(slips.reduce((n, s) => n + Number(s.netPay), 0)),
      };
    }));
    res.json({ periods: rows });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post("/api/payroll/periods", requireRole('admin'), async (req, res) => {
  try {
    const { label, startDate, endDate } = req.body;
    if (!label || !startDate || !endDate) {
      return res.status(400).json({ error: 'Label, start date and end date are required.' });
    }
    if (endDate < startDate) {
      return res.status(400).json({ error: 'End date cannot be before the start date.' });
    }
    const period = await PayrollPeriod.create({
      label: String(label).slice(0, 64),
      startDate,
      endDate,
      createdById: req.user.id,
    });
    res.json({ ok: true, periodId: period.id });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Builds payslips for a draft period from recorded attendance.
 *
 * Overtime is computed per DAY, not across the whole period: an employee who
 * works 10h on Monday and 6h on Tuesday has 2h of overtime, not zero.
 */
router.post("/api/payroll/periods/:id/generate", requireRole('admin'), async (req, res) => {
  try {
    const period = await PayrollPeriod.findByPk(req.params.id);
    if (!period) return res.status(404).json({ error: 'Period not found.' });
    if (period.status === 'finalized') {
      return res.status(409).json({ error: 'That period is finalized and cannot be regenerated.' });
    }

    const s = await getSettings();
    const stdMinutes = Number(s.standardHoursPerDay) * 60;
    const otMult = Number(s.overtimeMultiplier);

    const staff = await User.findAll({
      where: { role: { [Op.in]: STAFF_ROLES }, status: 'approved' },
      order: [['name', 'ASC']],
    });

    // Regenerating replaces the draft's slips so edits are not double-counted.
    await Payslip.destroy({ where: { periodId: period.id } });

    const created = [];
    for (const user of staff) {
      const logs = await AttendanceLog.findAll({
        where: {
          userId: user.id,
          workDate: { [Op.between]: [period.startDate, period.endDate] },
          clockOutAt: { [Op.ne]: null },
        },
      });
      if (!logs.length) continue;

      const perDay = {};
      for (const l of logs) {
        perDay[l.workDate] = (perDay[l.workDate] || 0) + (l.minutesWorked || 0);
      }

      let regularMinutes = 0;
      let overtimeMinutes = 0;
      let daysWorked = 0;
      for (const mins of Object.values(perDay)) {
        if (mins <= 0) continue;
        daysWorked += 1;
        regularMinutes += Math.min(mins, stdMinutes);
        overtimeMinutes += Math.max(0, mins - stdMinutes);
      }

      const regularHours = hours(regularMinutes);
      const overtimeHours = hours(overtimeMinutes);
      const rate = Number(user.payRate);

      // Monthly staff draw their salary for the period; overtime uses an
      // hourly equivalent from the configured working-days divisor.
      const hourlyEquivalent = user.payType === 'monthly'
        ? rate / (Number(s.monthlyWorkingDays) * Number(s.standardHoursPerDay) || 1)
        : rate;

      const basicPay = user.payType === 'monthly' ? money(rate) : money(regularHours * rate);
      const overtimePay = money(overtimeHours * hourlyEquivalent * otMult);
      const grossPay = money(basicPay + overtimePay);

      const deductions = [
        { label: 'SSS', rate: Number(s.sssRate), amount: money(grossPay * Number(s.sssRate)) },
        { label: 'PhilHealth', rate: Number(s.philhealthRate), amount: money(grossPay * Number(s.philhealthRate)) },
        { label: 'Pag-IBIG', rate: Number(s.pagibigRate), amount: money(grossPay * Number(s.pagibigRate)) },
        { label: 'Withholding Tax', rate: Number(s.taxRate), amount: money(grossPay * Number(s.taxRate)) },
      ];
      const totalDeductions = money(deductions.reduce((n, d) => n + d.amount, 0));

      const slip = await Payslip.create({
        periodId: period.id,
        userId: user.id,
        employeeName: user.name,
        payType: user.payType,
        payRate: money(rate),
        daysWorked,
        regularHours,
        overtimeHours,
        overtimeMultiplier: otMult,
        basicPay,
        overtimePay,
        grossPay,
        deductions,
        totalDeductions,
        netPay: money(grossPay - totalDeductions),
      });
      created.push(slip.id);
    }

    res.json({ ok: true, generated: created.length, ratesConfigured: !!s.ratesConfigured });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get("/api/payroll/periods/:id", requireRole('admin'), async (req, res) => {
  try {
    const period = await PayrollPeriod.findByPk(req.params.id);
    if (!period) return res.status(404).json({ error: 'Period not found.' });

    const slips = await Payslip.findAll({ where: { periodId: period.id }, order: [['employeeName', 'ASC']] });
    const s = await getSettings();

    res.json({
      period: {
        id: period.id,
        label: period.label,
        startDate: period.startDate,
        endDate: period.endDate,
        status: period.status,
        finalizedAt: period.finalizedAt,
      },
      ratesConfigured: !!s.ratesConfigured,
      payslips: slips.map(p => ({
        id: p.id,
        userId: p.userId,
        employeeName: p.employeeName,
        payType: p.payType,
        payRate: Number(p.payRate),
        daysWorked: p.daysWorked,
        regularHours: Number(p.regularHours),
        overtimeHours: Number(p.overtimeHours),
        basicPay: Number(p.basicPay),
        overtimePay: Number(p.overtimePay),
        grossPay: Number(p.grossPay),
        deductions: p.deductions || [],
        otherDeductionLabel: p.otherDeductionLabel,
        otherDeductionAmount: Number(p.otherDeductionAmount),
        totalDeductions: Number(p.totalDeductions),
        netPay: Number(p.netPay),
        notes: p.notes,
      })),
      totals: {
        gross: money(slips.reduce((n, p) => n + Number(p.grossPay), 0)),
        deductions: money(slips.reduce((n, p) => n + Number(p.totalDeductions), 0)),
        net: money(slips.reduce((n, p) => n + Number(p.netPay), 0)),
      },
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/** Adjusts a single payslip. Only while the period is a draft. */
router.put("/api/payroll/payslips/:id", requireRole('admin'), async (req, res) => {
  try {
    const slip = await Payslip.findByPk(req.params.id);
    if (!slip) return res.status(404).json({ error: 'Payslip not found.' });

    const period = await PayrollPeriod.findByPk(slip.periodId);
    if (period?.status === 'finalized') {
      return res.status(409).json({ error: 'This period is finalized. Payslips can no longer be changed.' });
    }

    const amount = Number(req.body.otherDeductionAmount);
    if (!Number.isFinite(amount) || amount < 0) {
      return res.status(400).json({ error: 'Invalid deduction amount.' });
    }
    if (amount > Number(slip.grossPay)) {
      return res.status(400).json({ error: 'A deduction cannot exceed gross pay.' });
    }

    const base = (slip.deductions || []).reduce((n, d) => n + Number(d.amount), 0);
    const total = money(base + amount);
    await slip.update({
      otherDeductionLabel: req.body.otherDeductionLabel
        ? String(req.body.otherDeductionLabel).slice(0, 64) : null,
      otherDeductionAmount: money(amount),
      totalDeductions: total,
      netPay: money(Number(slip.grossPay) - total),
      notes: req.body.notes ? String(req.body.notes).slice(0, 255) : slip.notes,
    });
    res.json({ ok: true, netPay: Number(slip.netPay) });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/** Locks the period. Payslips become read-only from here on. */
router.post("/api/payroll/periods/:id/finalize", requireRole('admin'), async (req, res) => {
  try {
    const period = await PayrollPeriod.findByPk(req.params.id);
    if (!period) return res.status(404).json({ error: 'Period not found.' });
    if (period.status === 'finalized') {
      return res.status(409).json({ error: 'That period is already finalized.' });
    }

    const s = await getSettings();
    if (!s.ratesConfigured) {
      return res.status(409).json({
        error: 'Set your SSS, PhilHealth, Pag-IBIG and tax rates before finalizing.',
      });
    }

    const count = await Payslip.count({ where: { periodId: period.id } });
    if (count === 0) {
      return res.status(409).json({ error: 'Generate payslips before finalizing.' });
    }

    await period.update({ status: 'finalized', finalizedAt: new Date(), finalizedById: req.user.id });
    res.json({ ok: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.delete("/api/payroll/periods/:id", requireRole('admin'), async (req, res) => {
  try {
    const period = await PayrollPeriod.findByPk(req.params.id);
    if (!period) return res.status(404).json({ error: 'Period not found.' });
    if (period.status === 'finalized') {
      return res.status(409).json({ error: 'A finalized period cannot be deleted.' });
    }
    await Payslip.destroy({ where: { periodId: period.id } });
    await period.destroy();
    res.json({ ok: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/** A staff member's own finalized payslips. */
router.get("/api/payroll/my-payslips", requireRole(...STAFF_ROLES), async (req, res) => {
  try {
    const periods = await PayrollPeriod.findAll({ where: { status: 'finalized' } });
    const byId = Object.fromEntries(periods.map(p => [p.id, p]));
    const slips = await Payslip.findAll({
      where: { userId: req.user.id, periodId: { [Op.in]: periods.map(p => p.id) } },
      order: [['createdAt', 'DESC']],
    });
    res.json({
      payslips: slips.map(p => ({
        id: p.id,
        period: byId[p.periodId]?.label ?? '',
        startDate: byId[p.periodId]?.startDate ?? null,
        endDate: byId[p.periodId]?.endDate ?? null,
        daysWorked: p.daysWorked,
        regularHours: Number(p.regularHours),
        overtimeHours: Number(p.overtimeHours),
        grossPay: Number(p.grossPay),
        deductions: p.deductions || [],
        otherDeductionLabel: p.otherDeductionLabel,
        otherDeductionAmount: Number(p.otherDeductionAmount),
        totalDeductions: Number(p.totalDeductions),
        netPay: Number(p.netPay),
      })),
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
