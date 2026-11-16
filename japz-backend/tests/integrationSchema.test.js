import test from 'node:test';
import assert from 'node:assert/strict';
import { planProtectedSchema, preserveLegacyPayroll, PROTECTED_TABLES } from '../services/integrationSchema.js';
const shape = keys => Object.fromEntries(keys.map(key => [key, { type: 'INT' }]));
const canonical = () => Object.fromEntries(Object.entries(PROTECTED_TABLES).map(([name, value]) => [name, shape(value.canonical)]));
const legacy = () => ({ payroll_periods: shape(PROTECTED_TABLES.payroll_periods.legacy), payslips: shape(PROTECTED_TABLES.payslips.legacy), reservations: shape(PROTECTED_TABLES.reservations.canonical) });
test('empty database needs no historical table rename', () => assert.deepEqual(planProtectedSchema({}).archives, []));
test('canonical tables can be checked repeatedly without mutations', () => {
  assert.deepEqual(planProtectedSchema(canonical()).archives, []);
  assert.deepEqual(planProtectedSchema(canonical()).archives, []);
});
test('legacy payroll is archived together, preserving financial rows', () => {
  assert.deepEqual(planProtectedSchema(legacy()).archives, [{ from: 'payroll_periods', to: 'legacy_online_payroll_periods' }, { from: 'payslips', to: 'legacy_online_payslips' }]);
});
test('an existing archive is never overwritten', () => assert.throws(() => planProtectedSchema({ ...legacy(), legacy_online_payslips: {} }), /already exists/));
test('capacity reservations require a separate reviewed conversion', () => assert.throws(() => planProtectedSchema({ reservations: shape(['id', 'reference', 'date', 'time', 'guests']) }), /separate reviewed/));
test('mixed payroll layouts fail before migration', () => assert.throws(() => planProtectedSchema({ ...legacy(), payroll_periods: canonical().payroll_periods }), /mixed payroll/));
test('unknown payroll columns are not guessed', () => assert.throws(() => planProtectedSchema({ payslips: { id: {} } }), /Unsupported/));
test('legacy tables are renamed in one atomic statement without modifying amounts', async () => {
  const tables = legacy();
  const statements = [];
  const query = { showAllTables: async () => Object.keys(tables), describeTable: async name => tables[name], queryGenerator: { quoteTable: name => '`' + name + '`' } };
  const db = { getQueryInterface: () => query, query: async sql => statements.push(sql) };
  await preserveLegacyPayroll(db);
  assert.deepEqual(statements, ['RENAME TABLE `payroll_periods` TO `legacy_online_payroll_periods`, `payslips` TO `legacy_online_payslips`']);
});
test('all tables are validated before any historical rename', async () => {
  const tables = { ...legacy(), reservations: { id: {} } };
  let mutations = 0;
  const db = { getQueryInterface: () => ({ showAllTables: async () => Object.keys(tables), describeTable: async name => tables[name] }), query: async () => mutations++ };
  await assert.rejects(() => preserveLegacyPayroll(db), /Unsupported/);
  assert.equal(mutations, 0);
});
