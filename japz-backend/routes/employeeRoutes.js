/**
 * Employee-facing Routes (Clock In/Out, Payslips)
 *
 * All routes require: verifyToken (but NOT requireAdmin)
 * Mounted in routes/index.js via:
 *   import employeeRouter from './employeeRoutes.js';
 *   router.use('/api/employee', verifyToken, employeeRouter);
 */
import express from 'express';
import * as payrollController from '../controllers/payrollController.js';

const employeeRouter = express.Router();

// ── Attendance ────────────────────────────────────────────────────────────────
employeeRouter.get('/today',      payrollController.getMyTodayAttendance);
employeeRouter.post('/clock-in',  payrollController.clockIn);
employeeRouter.post('/clock-out', payrollController.clockOut);

// ── Payslips ──────────────────────────────────────────────────────────────────
employeeRouter.get('/payslips',   payrollController.getMyPayslips);

export default employeeRouter;
