import { DataTypes } from 'sequelize';
import { pathToFileURL } from 'node:url';
/** Additive and repeatable. Does not alter any payroll-period or payslip schema. */
export async function runAttendanceAutoClockOutMigration(sequelize) {
  const query = sequelize.getQueryInterface();
  const tables = (await query.showAllTables()).map(value => typeof value === 'string' ? value : value.tableName);
  const addMissing = async (table, fields) => {
    const actual = tables.find(name => name.toLowerCase() === table.toLowerCase());
    if (!actual) throw new Error(`Required ${table} table is missing. Set up the existing application schema first.`);
    const columns = await query.describeTable(actual);
    for (const [name, definition] of Object.entries(fields)) if (!columns[name]) await query.addColumn(actual,name,definition);
  };
  await addMissing('Attendances', {
    clockOutSource:{ type:DataTypes.STRING(16), allowNull:false, defaultValue:'manual' },
    autoClockedOutAt:{ type:DataTypes.DATE, allowNull:true },
    autoClockOutOriginalTime:{ type:DataTypes.DATE, allowNull:true },
    overtimeApprovedAt:{ type:DataTypes.DATE, allowNull:true },
    overtimeApprovedBy:{ type:DataTypes.INTEGER, allowNull:true },
    overtimeApprovalReason:{ type:DataTypes.STRING(255), allowNull:true },
  });
  await addMissing('business_hours',{ autoClockOutEnabled:{ type:DataTypes.BOOLEAN, allowNull:false, defaultValue:true } });
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const { sequelize } = await import('../models/db.js');
  try { await runAttendanceAutoClockOutMigration(sequelize); console.log('Attendance auto clock-out schema ready. Existing punches and financial schemas preserved.'); }
  catch (error) { console.error(error.message); process.exitCode = 1; }
  finally { await sequelize.close(); }
}
