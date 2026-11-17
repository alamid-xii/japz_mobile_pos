import { beforeEach, describe, expect, it, vi } from 'vitest';
import { requireActiveShift } from '../middleware/shiftAccess.js';
import { getMyTodayAttendance } from '../services/attendanceService.js';
vi.mock('../services/attendanceService.js', () => ({ getMyTodayAttendance: vi.fn() }));

describe('station attendance access', () => {
  beforeEach(() => vi.clearAllMocks());
  const request = (role = 'cashier', path = '/api/orders') => {
    const req = { user: { id: 42, role }, originalUrl: path };
    const res = { status: vi.fn().mockReturnThis(), json: vi.fn() };
    const next = vi.fn();
    return { req, res, next };
  };
  it.each(['cashier', 'kitchen', 'inventory', 'rider'])('requires an open shift for %s', async role => {
    const { req, res, next } = request(role);
    getMyTodayAttendance.mockResolvedValue({ isClockedIn: false });
    await requireActiveShift(req, res, next);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ code: 'CLOCK_IN_REQUIRED' }));
    expect(next).not.toHaveBeenCalled();
  });
  it('allows a saved open shift', async () => {
    const { req, res, next } = request();
    getMyTodayAttendance.mockResolvedValue({ isClockedIn: true });
    await requireActiveShift(req, res, next);
    expect(next).toHaveBeenCalledOnce();
    expect(res.status).not.toHaveBeenCalled();
  });
  it.each(['/api/auth/user', '/api/auth/logout', '/api/employee/today', '/api/employee/clock-in', '/api/employee/clock-out', '/api/employee/payslips', '/api/attendance/clock-in'])('keeps self-service reachable: %s', async path => {
    const { req, res, next } = request('cashier', path + '?check=1');
    await requireActiveShift(req, res, next);
    expect(next).toHaveBeenCalledOnce();
    expect(getMyTodayAttendance).not.toHaveBeenCalled();
  });
  it.each(['admin', 'customer'])('preserves the separate %s workflow', async role => {
    const { req, res, next } = request(role);
    await requireActiveShift(req, res, next);
    expect(next).toHaveBeenCalledOnce();
    expect(getMyTodayAttendance).not.toHaveBeenCalled();
  });
  it('fails closed when attendance cannot be read', async () => {
    const { req, res, next } = request();
    const log = vi.spyOn(console, 'error').mockImplementation(() => {});
    getMyTodayAttendance.mockRejectedValue(new Error('offline'));
    await requireActiveShift(req, res, next);
    expect(res.status).toHaveBeenCalledWith(503);
    expect(next).not.toHaveBeenCalled();
    log.mockRestore();
  });
});
