/**
 * Payroll & Attendance Routes
 *
 * All routes require: verifyToken + requireAdmin (defined in routes/index.js)
 * These are mounted in routes/index.js via:
 *   import payrollRouter from './payrollRoutes.js';
 *   router.use('/api', verifyToken, requireAdmin, payrollRouter);
 *
 * API Endpoints:
 *
 * PAYROLL CONFIG
 *   GET  /api/payroll/config             → getPayrollConfigs
 *   PUT  /api/payroll/config/:configKey  → updatePayrollConfig
 *
 * PAYROLL PERIODS
 *   GET  /api/payroll/periods            → getAllPeriods
 *   POST /api/payroll/periods            → createPeriod
 *   GET  /api/payroll/periods/:id        → getPeriodById
 *   POST /api/payroll/periods/:id/calculate   → calculatePayroll
 *   PUT  /api/payroll/periods/:id/review      → markUnderReview
 *   PUT  /api/payroll/periods/:id/approve     → approvePayroll
 *   PUT  /api/payroll/periods/:id/paid        → markPaid
 *   PUT  /api/payroll/periods/:id/lock        → lockPayroll
 *   PUT  /api/payroll/periods/:id/reopen      → reopenPayroll
 *   PUT  /api/payroll/periods/:id/cancel      → cancelPayroll
 *   POST /api/payroll/periods/:id/payslips    → generatePayslips
 *   GET  /api/payroll/periods/:id/validate    → getAttendanceValidationReport
 *
 * PAYROLL ENTRIES
 *   GET  /api/payroll/entries/:id        → getEntryById
 *   POST /api/payroll/entries/:id/adjust → addAdjustment
 *
 * ATTENDANCE
 *   POST /api/attendance/clock-in        → clockIn
 *   POST /api/attendance/clock-out       → clockOut
 *   PUT  /api/attendance/:id/correct     → correctAttendance
 */
import express from 'express';
import * as payrollController from '../controllers/payrollController.js';

const payrollRouter = express.Router();

// ── Payroll Config ────────────────────────────────────────────────────────────
payrollRouter.get( '/payroll/config',                   payrollController.getPayrollConfigs);
payrollRouter.put( '/payroll/config/:configKey',        payrollController.updatePayrollConfig);

// ── Payroll Periods ───────────────────────────────────────────────────────────
payrollRouter.get( '/payroll/periods',                  payrollController.getAllPeriods);
payrollRouter.post('/payroll/periods',                  payrollController.createPeriod);
payrollRouter.get( '/payroll/periods/validate',         payrollController.getAttendanceValidationReport);
payrollRouter.get( '/payroll/attendance/validate',      payrollController.getAttendanceValidationReport);
payrollRouter.get( '/payroll/periods/:id/validate',     payrollController.getAttendanceValidationReport);
payrollRouter.get( '/payroll/periods/:id',              payrollController.getPeriodById);
payrollRouter.post('/payroll/periods/:id/calculate',    payrollController.calculatePayroll);
payrollRouter.put( '/payroll/periods/:id/review',       payrollController.markUnderReview);
payrollRouter.put( '/payroll/periods/:id/approve',      payrollController.approvePayroll);
payrollRouter.put( '/payroll/periods/:id/paid',         payrollController.markPaid);
payrollRouter.put( '/payroll/periods/:id/lock',         payrollController.lockPayroll);
payrollRouter.put( '/payroll/periods/:id/reopen',       payrollController.reopenPayroll);
payrollRouter.put( '/payroll/periods/:id/cancel',       payrollController.cancelPayroll);
payrollRouter.post('/payroll/periods/:id/payslips',     payrollController.generatePayslips);

// ── Payroll Entries ───────────────────────────────────────────────────────────
payrollRouter.get( '/payroll/entries/:id',              payrollController.getEntryById);
payrollRouter.post('/payroll/entries/:id/adjust',       payrollController.addAdjustment);

// ── Attendance ────────────────────────────────────────────────────────────────
payrollRouter.get( '/attendance/records',               payrollController.getAttendanceRecords);
payrollRouter.get( '/payroll/attendance/records',       payrollController.getAttendanceRecords);
payrollRouter.put( '/attendance/:id/correct',           payrollController.correctAttendance);

// ── Employee Pay Management & Sync ───────────────────────────────────────────
payrollRouter.get( '/payroll/employees',                payrollController.getAllEmployees);
payrollRouter.put( '/payroll/employees/:id/pay-config', payrollController.updateEmployeePayConfig);
payrollRouter.post('/payroll/employees/sync',           payrollController.syncEmployeesFromUsers);

// ── Reports & Exports ────────────────────────────────────────────────────────
payrollRouter.get( '/payroll/reports/analytics',        payrollController.getPayrollAnalytics);
payrollRouter.get( '/payroll/periods/:id/export/csv',   payrollController.exportPeriodCSV);

export default payrollRouter;

