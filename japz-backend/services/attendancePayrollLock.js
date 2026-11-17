import { Op } from 'sequelize';
import { PayrollPeriod } from '../models/payrollPeriodModel.js';
export async function attendancePayrollLocked(date,transaction) {
  return Boolean(await PayrollPeriod.findOne({ attributes:['id'],where:{periodStart:{[Op.lte]:date},periodEnd:{[Op.gte]:date},status:{[Op.in]:['APPROVED','PAID','LOCKED']}},transaction,...(transaction ? {lock:transaction.LOCK.UPDATE} : {}) }));
}
export async function requireEditableAttendance(date,transaction) {
  if (await attendancePayrollLocked(date,transaction)) throw new Error('This attendance belongs to approved, paid or locked payroll. Reopen the payroll period before correcting attendance.');
}
