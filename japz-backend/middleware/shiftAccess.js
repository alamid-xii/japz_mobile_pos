import { getMyTodayAttendance } from '../services/attendanceService.js';

const staffRoles = new Set(['cashier', 'kitchen', 'inventory', 'rider']);
const selfService = new Set([
  '/api/auth/user', '/api/auth/profile', '/api/auth/logout',
  '/api/employee/today', '/api/employee/clock-in', '/api/employee/clock-out', '/api/employee/payslips',
  '/api/attendance/clock-in', '/api/attendance/clock-out', '/api/business-hours',
]);

// Check the saved attendance on every protected station request. A token alone
// must not keep a station available after another tab or a manager clocks out.
export async function requireActiveShift(req, res, next) {
  const path = (req.originalUrl || req.url || '').split('?')[0].replace(/\/$/, '');
  if (!staffRoles.has(req.user?.role) || selfService.has(path)) return next();
  try {
    const status = await getMyTodayAttendance(req.user.id);
    if (!status.isClockedIn) return res.status(403).json({
      code: 'CLOCK_IN_REQUIRED',
      error: 'Clock in before using your station.',
    });
    next();
  } catch (error) {
    console.error('Attendance access check failed:', error.message);
    return res.status(503).json({ error: 'Attendance could not be checked. Please try again.' });
  }
}
