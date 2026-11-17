import { afterEach,describe,it,expect,vi } from 'vitest';
import { startAttendanceScheduler } from '../services/attendanceAutoClockOut.js';
vi.mock('../models/db.js',() => ({sequelize:{}}));
vi.mock('../models/index.js',() => ({Attendance:{},Log:{}}));
vi.mock('../models/businessHoursModel.js',() => ({BusinessHours:{}}));
vi.mock('../services/payrollConfigService.js',() => ({getPayrollConfig:vi.fn()}));
vi.mock('../services/attendancePayrollLock.js',() => ({attendancePayrollLocked:vi.fn()}));
afterEach(() => vi.useRealTimers());
describe('server attendance scheduler without a browser',() => {
  it('catches up immediately, checks each minute and stops with the server',async () => {
    vi.useFakeTimers(); const run=vi.fn().mockResolvedValue(undefined);
    const stop=startAttendanceScheduler({run}); expect(run).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(60000); expect(run).toHaveBeenCalledTimes(2);
    stop(); await vi.advanceTimersByTimeAsync(120000); expect(run).toHaveBeenCalledTimes(2);
  });
  it('does not overlap a slow database run',async () => {
    vi.useFakeTimers(); let release;
    const run=vi.fn().mockImplementationOnce(() => new Promise(resolve => {release=resolve;})).mockResolvedValue(undefined);
    const stop=startAttendanceScheduler({run}); await vi.advanceTimersByTimeAsync(120000); expect(run).toHaveBeenCalledTimes(1);
    release(); await vi.advanceTimersByTimeAsync(60000); expect(run).toHaveBeenCalledTimes(2); stop();
  });
  it('reports a failure and recovers on the next scheduled check',async () => {
    vi.useFakeTimers(); const failure=new Error('Temporary database failure');
    const run=vi.fn().mockRejectedValueOnce(failure).mockResolvedValue(undefined),onError=vi.fn();
    const stop=startAttendanceScheduler({run,onError}); await vi.advanceTimersByTimeAsync(60000);
    expect(onError).toHaveBeenCalledWith(failure); expect(run).toHaveBeenCalledTimes(2); stop();
  });
});
