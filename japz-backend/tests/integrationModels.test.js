import test from 'node:test';
import assert from 'node:assert/strict';
import { User, Employee, PayrollPeriod, Payslip, Reservation, PaymentSession, Order } from '../models/index.js';
import { sequelize } from '../models/db.js';
test('dedicated payroll and online ordering register a single canonical set of models', () => {
  assert.equal(PayrollPeriod.getTableName(), 'payroll_periods');
  assert.ok(PayrollPeriod.rawAttributes.periodStart);
  assert.equal(PayrollPeriod.rawAttributes.startDate, undefined);
  assert.ok(Payslip.rawAttributes.payrollEntryId);
  assert.equal(Payslip.rawAttributes.periodId, undefined);
  assert.ok(PaymentSession.associations.order);
  assert.ok(Order.rawAttributes.status.values.includes('awaiting-payment'));
});
test('table reservations retain physical tables and customer accounts', () => {
  assert.ok(Reservation.rawAttributes.tableId);
  assert.ok(Reservation.associations.table);
  assert.ok(Reservation.associations.customer);
  assert.equal(Reservation.rawAttributes.guests, undefined);
});
test('staff, customer and delivery roles remain distinct', () => {
  for (const role of ['admin', 'cashier', 'kitchen', 'customer', 'rider', 'inventory']) assert.ok(User.rawAttributes.role.values.includes(role));
  for (const role of ['admin', 'cashier', 'kitchen', 'rider', 'inventory']) assert.ok(Employee.rawAttributes.role.values.includes(role));
  assert.ok(!Employee.rawAttributes.role.values.includes('customer'));
});
test.after(async () => { await sequelize.close(); });
