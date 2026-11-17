import { Op } from 'sequelize';
import { sequelize } from '../models/db.js';
import { Attendance, Log } from '../models/index.js';
import { BusinessHours } from '../models/businessHoursModel.js';
import { getPayrollConfig } from './payrollConfigService.js';
import { attendanceTotals, closingAfter } from './attendanceTime.js';
import { attendancePayrollLocked } from './attendancePayrollLock.js';

export async function autoClockOutDueShifts({ now = new Date() } = {}) {
  const hours = await BusinessHours.findOne({ order:[['id','ASC']] });
  if (hours && !hours.autoClockOutEnabled) return { closed:0, enabled:false };
  const closing = hours?.closeTime || '20:00:00';
  const config = await getPayrollConfig();
  const candidates = await Attendance.findAll({ attributes:['id'], where:{ clockOut:null, clockIn:{ [Op.ne]:null } }, order:[['id','ASC']] });
  let closed = 0, skippedProtected = 0;
  for (const candidate of candidates) {
    const changed = await sequelize.transaction(async transaction => {
      // Serializes scheduled runs, manager approvals/corrections and manual
      // punches across processes. A second worker sees the committed result.
      const record = await Attendance.findByPk(candidate.id,{ transaction,lock:transaction.LOCK.UPDATE });
      if (!record || record.clockOut || !record.clockIn || (record.overtimeApprovedAt && record.overtimeApprovedBy)) return false;
      const cutoff = closingAfter(record.clockIn,closing);
      if (!cutoff || cutoff > now) return false;
      if (await attendancePayrollLocked(record.date,transaction)) { skippedProtected++; return false; }
      record.set({ ...attendanceTotals(record.clockIn,cutoff,config), clockOut:cutoff, clockOutSource:'auto', autoClockedOutAt:now, autoClockOutOriginalTime:cutoff });
      await record.save({ transaction });
      await Log.create({ action:'OTHER',module:'attendance',entityType:'Attendance',entityId:record.id,userName:'System scheduler',status:'success',description:`Auto clocked out employee #${record.employeeId} at ${cutoff.toISOString()} (Asia/Manila closing ${closing})`,changes:{ before:{ clockOut:null },after:{ clockOut:cutoff,totalHours:record.totalHours,clockOutSource:'auto' } } },{ transaction });
      return true;
    });
    if (changed) closed++;
  }
  return { closed, skippedProtected, enabled:true };
}

export function startAttendanceScheduler({ intervalMs = 60000, run = autoClockOutDueShifts, onError = error => console.error('Attendance auto clock-out:',error.message) } = {}) {
  let running = false, stopped = false;
  const tick = async () => {
    if (running || stopped) return;
    running = true;
    try { await run(); } catch (error) { onError(error); } finally { running = false; }
  };
  void tick(); // Catch up missed closing times after a server restart.
  const timer = setInterval(tick,intervalMs);
  timer.unref?.();
  return () => { stopped = true; clearInterval(timer); };
}
