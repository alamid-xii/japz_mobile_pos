const dateFormatter = new Intl.DateTimeFormat('en-CA', { timeZone:'Asia/Manila', year:'numeric',month:'2-digit',day:'2-digit' });
export function philippineDate(value) {
  const parts = Object.fromEntries(dateFormatter.formatToParts(new Date(value)).map(part => [part.type,part.value]));
  return `${parts.year}-${parts.month}-${parts.day}`;
}
export function validTime(value) { return typeof value === 'string' && /^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/.test(value); }
/** The first closing after the punch; independent of the server's timezone. */
export function closingAfter(clockIn, closeTime) {
  if (!validTime(closeTime)) throw new Error('Closing time must use HH:MM or HH:MM:SS.');
  const start = new Date(clockIn);
  if (!Number.isFinite(start.getTime())) return null;
  const time = closeTime.length === 5 ? closeTime + ':00' : closeTime;
  let cutoff = new Date(`${philippineDate(start)}T${time}+08:00`);
  if (cutoff <= start) cutoff = new Date(cutoff.getTime() + 86400000);
  return cutoff;
}
export function attendanceTotals(clockIn, clockOut, config) {
  const hours = (new Date(clockOut) - new Date(clockIn)) / 3600000;
  if (!Number.isFinite(hours) || hours <= 0) throw new Error('Clock-out time must be after clock-in time.');
  const totalHours = Math.round(Math.max(0,hours - (hours >= 5 ? Number(config.breakMinutes) / 60 : 0)) * 100) / 100;
  return { totalHours, undertimeMinutes:totalHours < config.regularHoursPerDay ? Math.round((config.regularHoursPerDay - totalHours) * 60) : 0 };
}
