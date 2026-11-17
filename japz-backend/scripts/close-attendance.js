import { sequelize } from '../models/db.js';
import { autoClockOutDueShifts } from '../services/attendanceAutoClockOut.js';
try { console.log(await autoClockOutDueShifts()); }
catch (error) { console.error(error.message); process.exitCode = 1; }
finally { await sequelize.close(); }
