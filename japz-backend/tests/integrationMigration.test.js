import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import mysql from 'mysql2/promise';

const execute = promisify(execFile);
const prefix = `japz_schema_test_${Date.now()}`;
const databases = [];
let connection;
before(async () => {
  connection = await mysql.createConnection({ host: process.env.DB_HOST || '127.0.0.1', port: Number(process.env.DB_PORT) || 3306, user: process.env.DB_USER || 'root', password: process.env.DB_PASSWORD || '', multipleStatements: true });
});
after(async () => {
  if (!connection) return;
  for (const database of databases) {
    assert.ok(database.startsWith(prefix + '_') && /^japz_schema_test_\d+_[a-z]+$/.test(database));
    await connection.query(`DROP DATABASE \`${database}\``);
  }
  await connection.end();
});
async function createDatabase(suffix) {
  const database = `${prefix}_${suffix}`;
  await connection.query(`CREATE DATABASE \`${database}\``);
  databases.push(database);
  await connection.query(`USE \`${database}\``);
  return database;
}
async function migrate(database) {
  const env = { ...process.env, DB_DATABASE: database };
  for (const key of Object.keys(env)) if (key.startsWith('MYSQL') || key === 'DATABASE_URL') delete env[key];
  return execute(process.execPath, ['--input-type=module', '-e', `import { migrateIntegration } from './migrations/integrate-branches.js'; import { sequelize } from './models/db.js'; try { console.log(JSON.stringify(await migrateIntegration())); } finally { await sequelize.close(); }`], { cwd: new URL('../', import.meta.url), env, windowsHide: true });
}

test('fresh schema creates canonical payroll and physical-table reservations and is repeatable', async () => {
  const database = await createDatabase('fresh');
  await migrate(database);
  const [periodColumns] = await connection.query('SHOW COLUMNS FROM payroll_periods');
  assert.ok(periodColumns.some(column => column.Field === 'periodStart'));
  assert.ok(!periodColumns.some(column => column.Field === 'startDate'));
  const [slipColumns] = await connection.query('SHOW COLUMNS FROM payslips');
  assert.ok(slipColumns.some(column => column.Field === 'payrollEntryId'));
  const [reservationColumns] = await connection.query('SHOW COLUMNS FROM reservations');
  assert.ok(reservationColumns.some(column => column.Field === 'tableId'));
  const [tablesBefore] = await connection.query('SHOW TABLES');
  await migrate(database);
  const [tablesAfter] = await connection.query('SHOW TABLES');
  assert.deepEqual(tablesAfter, tablesBefore);
});

test('legacy issued payroll amounts, ids and relationships survive migration and repeat runs', async () => {
  const database = await createDatabase('legacy');
  await connection.query(await readFile(new URL('./fixtures/legacy-online-payroll.sql', import.meta.url), 'utf8'));
  await connection.query("ALTER TABLE payslips ADD CONSTRAINT legacy_period_link FOREIGN KEY (periodId) REFERENCES payroll_periods(id) ON DELETE RESTRICT");
  await connection.query("INSERT INTO payroll_periods (id,label,startDate,endDate,status,createdAt,updatedAt) VALUES (17,'Paid historical period','2026-08-01','2026-08-15','finalized',NOW(),NOW())");
  await connection.query("INSERT INTO payslips (id,periodId,userId,employeeName,grossPay,totalDeductions,netPay,deductions,createdAt,updatedAt) VALUES (23,17,41,'Historical employee',1234.56,234.55,1000.01,JSON_ARRAY(JSON_OBJECT('label','Original deduction','amount',234.55)),NOW(),NOW())");
  const [beforePeriods] = await connection.query('SELECT * FROM payroll_periods');
  const [beforeSlips] = await connection.query('SELECT * FROM payslips');
  await migrate(database);
  await migrate(database);
  const [afterPeriods] = await connection.query('SELECT * FROM legacy_online_payroll_periods');
  const [afterSlips] = await connection.query('SELECT * FROM legacy_online_payslips');
  assert.deepEqual(afterPeriods, beforePeriods);
  assert.deepEqual(afterSlips, beforeSlips);
  const [links] = await connection.query("SELECT REFERENCED_TABLE_NAME FROM information_schema.KEY_COLUMN_USAGE WHERE TABLE_SCHEMA=? AND TABLE_NAME='legacy_online_payslips' AND COLUMN_NAME='periodId' AND REFERENCED_TABLE_NAME IS NOT NULL", [database]);
  assert.equal(links[0].REFERENCED_TABLE_NAME, 'legacy_online_payroll_periods');
  const [canonical] = await connection.query('SELECT COUNT(*) AS count FROM payslips');
  assert.equal(canonical[0].count, 0);
});

test('capacity-based reservations stop migration before any schema mutation', async () => {
  const database = await createDatabase('capacity');
  await connection.query('CREATE TABLE reservations (id INT PRIMARY KEY, reference VARCHAR(24), date DATE, time VARCHAR(5), guests INT)');
  await assert.rejects(() => migrate(database), /Unsupported or mixed reservations/);
  const [tables] = await connection.query('SHOW TABLES');
  assert.equal(tables.length, 1);
});

test('an existing legacy archive prevents overwriting or partial renames', async () => {
  const database = await createDatabase('collision');
  await connection.query(await readFile(new URL('./fixtures/legacy-online-payroll.sql', import.meta.url), 'utf8'));
  await connection.query('CREATE TABLE legacy_online_payslips (id INT PRIMARY KEY)');
  await assert.rejects(() => migrate(database), /already exists/);
  const [tables] = await connection.query('SHOW TABLES');
  assert.equal(tables.length, 3);
  assert.ok(tables.some(row => Object.values(row).includes('payroll_periods')));
});
