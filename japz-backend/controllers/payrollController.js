/**
 * PayrollController — Thin HTTP layer for payroll routes.
 *
 * RULES:
 *   - No business logic here — delegate entirely to payrollService / attendanceService
 *   - All responses use standardized { success, data, message } format
 *   - All async functions are wrapped in try/catch
 *   - Authorization is enforced via requireAdmin middleware on the routes
 */
import * as payrollService from '../services/payrollService.js';
import * as attendanceService from '../services/attendanceService.js';
import * as payrollConfigService from '../services/payrollConfigService.js';
import * as payrollReportService from '../services/payrollReportService.js';
import * as employeePayrollService from '../services/employeePayrollService.js';

// ─── PAYROLL PERIODS ──────────────────────────────────────────────────────────

export const getAllPeriods = async (req, res) => {
  try {
    const periods = await payrollService.getAllPeriods();
    res.status(200).json({ success: true, data: periods });
  } catch (error) {
    console.error('getAllPeriods error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch payroll periods' });
  }
};

export const getPeriodById = async (req, res) => {
  try {
    const period = await payrollService.getPeriodById(req.params.id);
    if (!period) return res.status(404).json({ success: false, message: 'Payroll period not found' });
    res.status(200).json({ success: true, data: period });
  } catch (error) {
    console.error('getPeriodById error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch payroll period' });
  }
};

export const createPeriod = async (req, res) => {
  try {
    const { periodStart, periodEnd, description } = req.body;
    if (!periodStart || !periodEnd) {
      return res.status(400).json({ success: false, message: 'periodStart and periodEnd are required' });
    }
    const period = await payrollService.createPayrollPeriod(
      periodStart, periodEnd, description, req.user
    );
    res.status(201).json({ success: true, data: period, message: 'Payroll period created' });
  } catch (error) {
    console.error('createPeriod error:', error);
    const status = error.message.includes('overlap') ? 409 : 400;
    res.status(status).json({ success: false, message: error.message });
  }
};

export const calculatePayroll = async (req, res) => {
  try {
    const result = await payrollService.calculatePayroll(req.params.id, req.user);
    res.status(200).json({
      success: true,
      data: result,
      message: `Payroll calculated for ${result.entryCount} employees`
    });
  } catch (error) {
    console.error('calculatePayroll error:', error);
    res.status(400).json({ success: false, message: error.message });
  }
};

export const markUnderReview = async (req, res) => {
  try {
    const period = await payrollService.markUnderReview(req.params.id, req.user);
    res.status(200).json({ success: true, data: period, message: 'Period moved to review' });
  } catch (error) {
    console.error('markUnderReview error:', error);
    res.status(400).json({ success: false, message: error.message });
  }
};

export const approvePayroll = async (req, res) => {
  try {
    const period = await payrollService.approvePayroll(req.params.id, req.user);
    res.status(200).json({ success: true, data: period, message: 'Payroll approved' });
  } catch (error) {
    console.error('approvePayroll error:', error);
    res.status(400).json({ success: false, message: error.message });
  }
};

export const markPaid = async (req, res) => {
  try {
    const period = await payrollService.markPayrollPaid(req.params.id, req.user);
    res.status(200).json({ success: true, data: period, message: 'Payroll marked as paid' });
  } catch (error) {
    console.error('markPaid error:', error);
    res.status(400).json({ success: false, message: error.message });
  }
};

export const lockPayroll = async (req, res) => {
  try {
    const period = await payrollService.lockPayroll(req.params.id, req.user);
    res.status(200).json({ success: true, data: period, message: 'Payroll locked' });
  } catch (error) {
    console.error('lockPayroll error:', error);
    res.status(400).json({ success: false, message: error.message });
  }
};

export const reopenPayroll = async (req, res) => {
  try {
    const { reason } = req.body;
    if (!reason) return res.status(400).json({ success: false, message: 'reason is required to reopen payroll' });
    const period = await payrollService.reopenPayroll(req.params.id, reason, req.user);
    res.status(200).json({ success: true, data: period, message: 'Payroll period reopened' });
  } catch (error) {
    console.error('reopenPayroll error:', error);
    res.status(400).json({ success: false, message: error.message });
  }
};

export const cancelPayroll = async (req, res) => {
  try {
    const { reason } = req.body;
    if (!reason) return res.status(400).json({ success: false, message: 'reason is required to cancel payroll' });
    const period = await payrollService.cancelPayroll(req.params.id, reason, req.user);
    res.status(200).json({ success: true, data: period, message: 'Payroll period cancelled' });
  } catch (error) {
    console.error('cancelPayroll error:', error);
    res.status(400).json({ success: false, message: error.message });
  }
};

// ─── PAYROLL ENTRIES ──────────────────────────────────────────────────────────

export const getEntryById = async (req, res) => {
  try {
    const entry = await payrollService.getEntryById(req.params.id);
    if (!entry) return res.status(404).json({ success: false, message: 'Payroll entry not found' });
    res.status(200).json({ success: true, data: entry });
  } catch (error) {
    console.error('getEntryById error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch payroll entry' });
  }
};

export const addAdjustment = async (req, res) => {
  try {
    const { adjustmentType, description, amount, reason } = req.body;
    if (!adjustmentType || !description || !amount || !reason) {
      return res.status(400).json({
        success: false,
        message: 'adjustmentType, description, amount, and reason are all required'
      });
    }
    const adjustment = await payrollService.addAdjustment(req.params.id, req.body, req.user);
    res.status(201).json({ success: true, data: adjustment, message: 'Adjustment added' });
  } catch (error) {
    console.error('addAdjustment error:', error);
    res.status(400).json({ success: false, message: error.message });
  }
};

// ─── PAYSLIPS ─────────────────────────────────────────────────────────────────

export const generatePayslips = async (req, res) => {
  try {
    const payslips = await payrollService.generatePayslips(req.params.id, req.user);
    res.status(200).json({
      success: true,
      data: payslips,
      message: `Generated ${payslips.length} payslips`
    });
  } catch (error) {
    console.error('generatePayslips error:', error);
    res.status(400).json({ success: false, message: error.message });
  }
};

export const getMyPayslips = async (req, res) => {
  try {
    // req.user contains the authenticated user. We pass their id.
    const payslips = await payrollService.getMyPayslips(req.user.id);
    res.status(200).json({ success: true, data: payslips });
  } catch (error) {
    console.error('getMyPayslips error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch payslips' });
  }
};


// ─── ATTENDANCE ───────────────────────────────────────────────────────────────

export const clockIn = async (req, res) => {
  try {
    // Non-admins can only clock in for themselves (prevent spoofing)
    const isAdmin = req.user?.role === 'admin';
    const employeeId = (isAdmin && req.body.employeeId)
      ? req.body.employeeId
      : req.user.id;
    if (!employeeId) return res.status(400).json({ success: false, message: 'employeeId is required' });

    // Only administrators can supply a custom backdated/manual timestamp
    const clockInTime = (isAdmin && req.body.clockInTime) ? req.body.clockInTime : new Date();
    const record = await attendanceService.clockIn(employeeId, clockInTime, req);
    res.status(201).json({ success: true, data: record, message: 'Clocked in successfully' });
  } catch (error) {
    console.error('clockIn error:', error);
    res.status(400).json({ success: false, message: error.message });
  }
};

export const clockOut = async (req, res) => {
  try {
    // Non-admins can only clock out for themselves (prevent spoofing)
    const isAdmin = req.user?.role === 'admin';
    const employeeId = (isAdmin && req.body.employeeId)
      ? req.body.employeeId
      : req.user.id;
    if (!employeeId) return res.status(400).json({ success: false, message: 'employeeId is required' });

    // Only administrators can supply a custom backdated/manual timestamp
    const clockOutTime = (isAdmin && req.body.clockOutTime) ? req.body.clockOutTime : new Date();
    const record = await attendanceService.clockOut(employeeId, clockOutTime, req);
    res.status(200).json({ success: true, data: record, message: 'Clocked out successfully' });
  } catch (error) {
    console.error('clockOut error:', error);
    res.status(400).json({ success: false, message: error.message });
  }
};

export const getMyTodayAttendance = async (req, res) => {
  try {
    const data = await attendanceService.getMyTodayAttendance(req.user.id);
    res.status(200).json({ success: true, data });
  } catch (error) {
    console.error('getMyTodayAttendance error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};


export const getAttendanceValidationReport = async (req, res) => {
  try {
    let { periodStart, periodEnd } = req.query;

    // Support loading dates by period ID param if not explicitly in query
    if ((!periodStart || !periodEnd) && req.params.id) {
      const period = await payrollService.getPeriodById(req.params.id);
      if (period) {
        periodStart = period.periodStart;
        periodEnd = period.periodEnd;
      }
    }

    if (!periodStart || !periodEnd) {
      return res.status(400).json({
        success: false,
        message: 'periodStart and periodEnd query params (or a valid period ID) are required'
      });
    }
    const report = await attendanceService.getAttendanceValidationReport(periodStart, periodEnd);
    res.status(200).json({ success: true, data: report });
  } catch (error) {
    console.error('getAttendanceValidationReport error:', error);
    res.status(500).json({ success: false, message: 'Failed to generate validation report' });
  }
};

export const correctAttendance = async (req, res) => {
  try {
    const record = await attendanceService.adminCorrectAttendance(
      req.params.id, req.body, req.user, req
    );
    res.status(200).json({ success: true, data: record, message: 'Attendance corrected' });
  } catch (error) {
    console.error('correctAttendance error:', error);
    res.status(400).json({ success: false, message: error.message });
  }
};

export const approveShiftOvertime = async (req,res) => {
  try {
    const record = await attendanceService.approveShiftOvertime(req.params.id,req.body,req.user,req);
    res.json({success:true,data:record});
  } catch (error) { res.status(400).json({success:false,message:error.message}); }
};

// ─── PAYROLL CONFIG ───────────────────────────────────────────────────────────

export const getPayrollConfigs = async (req, res) => {
  try {
    const configs = await payrollConfigService.getAllConfigRows();
    res.status(200).json({ success: true, data: configs });
  } catch (error) {
    console.error('getPayrollConfigs error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch payroll configuration' });
  }
};

export const updatePayrollConfig = async (req, res) => {
  try {
    const { configKey } = req.params;
    const { configValue } = req.body;
    if (!configValue && configValue !== 0) {
      return res.status(400).json({ success: false, message: 'configValue is required' });
    }
    const config = await payrollConfigService.updateConfig(
      configKey, configValue, req.user.id, req.user.name
    );
    res.status(200).json({ success: true, data: config, message: 'Config updated' });
  } catch (error) {
    console.error('updatePayrollConfig error:', error);
    res.status(400).json({ success: false, message: error.message });
  }
};

// ─── REPORTS & EXPORTS ────────────────────────────────────────────────────────

export const getPayrollAnalytics = async (req, res) => {
  try {
    const { periodId, year } = req.query;
    const analytics = await payrollReportService.getPayrollAnalytics({
      periodId: periodId ? parseInt(periodId, 10) : undefined,
      year: year ? parseInt(year, 10) : undefined,
    });
    res.status(200).json({ success: true, data: analytics });
  } catch (error) {
    console.error('getPayrollAnalytics error:', error);
    res.status(500).json({ success: false, message: error.message || 'Failed to fetch payroll analytics' });
  }
};

export const exportPeriodCSV = async (req, res) => {
  try {
    const { id } = req.params;
    const { filename, csv } = await payrollReportService.generatePeriodCSV(parseInt(id, 10));
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.status(200).send(csv);
  } catch (error) {
    console.error('exportPeriodCSV error:', error);
    res.status(400).json({ success: false, message: error.message || 'Failed to export period CSV' });
  }
};

// ─── ATTENDANCE RECORDS ───────────────────────────────────────────────────────

export const getAttendanceRecords = async (req, res) => {
  try {
    const records = await attendanceService.getAttendanceRecords(req.query);
    res.status(200).json({ success: true, data: records });
  } catch (error) {
    console.error('getAttendanceRecords error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch attendance records' });
  }
};

// ─── EMPLOYEE PAYROLL MANAGEMENT ──────────────────────────────────────────────

export const getAllEmployees = async (req, res) => {
  try {
    const employees = await employeePayrollService.getAllEmployees();
    res.status(200).json({ success: true, data: employees });
  } catch (error) {
    console.error('getAllEmployees error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch employees' });
  }
};

export const updateEmployeePayConfig = async (req, res) => {
  try {
    const updated = await employeePayrollService.updateEmployeePayConfig(
      req.params.id,
      req.body,
      req.user,
      req
    );
    res.status(200).json({ success: true, data: updated, message: 'Employee pay configuration updated' });
  } catch (error) {
    console.error('updateEmployeePayConfig error:', error);
    res.status(400).json({ success: false, message: error.message });
  }
};

export const syncEmployeesFromUsers = async (req, res) => {
  try {
    const result = await employeePayrollService.syncEmployeesFromUsers(req.user, req);
    res.status(200).json({
      success: true,
      data: result,
      message: `Successfully synced ${result.createdCount} new employee(s) and updated ${result.updatedCount}`
    });
  } catch (error) {
    console.error('syncEmployeesFromUsers error:', error);
    res.status(500).json({ success: false, message: error.message || 'Failed to sync employees from users' });
  }
};

