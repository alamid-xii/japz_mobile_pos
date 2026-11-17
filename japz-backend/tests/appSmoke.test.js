import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import mysql from 'mysql2/promise';
import jwt from 'jsonwebtoken';

const database = `japz_app_test_${Date.now()}_${process.pid}`;
const password = crypto.randomBytes(24).toString('base64url');
let connection, sequelize, server, base;
before(async () => {
  connection = await mysql.createConnection({ host: process.env.DB_HOST || '127.0.0.1', port: Number(process.env.DB_PORT) || 3306, user: process.env.DB_USER || 'root', password: process.env.DB_PASSWORD || '' });
  await connection.query(`CREATE DATABASE \`${database}\``);
  for (const key of Object.keys(process.env)) if (key.startsWith('MYSQL') || key === 'DATABASE_URL') delete process.env[key];
  process.env.DB_DATABASE = database;
  process.env.JWT_SECRET = crypto.randomBytes(48).toString('base64url');
  process.env.BOOTSTRAP_ADMIN_EMAIL = 'admin@app-integration.test';
  process.env.BOOTSTRAP_ADMIN_PASSWORD = password;
  process.env.ELECTRON = '1';
  process.env.NODE_ENV = 'test';
  const app = (await import('../index.js')).default;
  ({ sequelize } = await import('../models/db.js'));
  server = app.listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  base = `http://127.0.0.1:${server.address().port}`;
});
after(async () => {
  if (server) await new Promise(resolve => server.close(resolve));
  if (sequelize) await sequelize.close();
  if (connection) { assert.match(database, /^japz_app_test_\d+_\d+$/); await connection.query(`DROP DATABASE \`${database}\``); await connection.end(); }
});
test('full application starts with health and public ordering endpoints', async () => {
  const health = await fetch(base + '/api/health'); assert.equal(health.status, 200);
  assert.equal((await health.json()).status, 'ok');
  const status = await fetch(base + '/api/public/status'); assert.equal(status.status, 200);
  assert.equal(typeof (await status.json()).acceptingOrders, 'boolean');
  const popular = await fetch(base + '/api/public/popular'); assert.equal(popular.status, 200);
  assert.ok(Array.isArray((await popular.json()).popular));
});
test('hardened bootstrap login reaches the dedicated payroll module', async () => {
  const login = await fetch(base + '/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: 'admin@app-integration.test', password }) });
  assert.equal(login.status, 200);
  const { token, user } = await login.json(); assert.equal(user.role, 'admin');
  const periods = await fetch(base + '/api/payroll/periods', { headers: { Authorization: `Bearer ${token}` } });
  assert.equal(periods.status, 200);
});

test('each staff station requires attendance, preserves roles, and locks again after clock-out', async () => {
  const { User, Employee, Attendance } = await import('../models/index.js');
  const endpoints = { cashier: '/api/orders', kitchen: '/api/kitchen/orders', inventory: '/api/inventory/summary', rider: '/api/rider/deliveries' };
  // A different employee with the same primary key must never lend a user access.
  const unrelated = await Employee.create({ id: 2, name: 'Unrelated', email: 'unrelated@test.local', phone: '', password: 'unused', role: 'cashier' });
  await Attendance.create({ employeeId: unrelated.id, date: '2020-01-01', clockIn: new Date('2020-01-01T09:00:00Z') });
  for (const [role, endpoint] of Object.entries(endpoints)) {
    const user = await User.create({ name: `Shift ${role}`, email: `${role}@shift-test.local`, password: 'unused', role, status: 'approved' });
    const token = jwt.sign({ id: user.id, role }, process.env.JWT_SECRET);
    const call = (path, method = 'GET', body) => fetch(base + path, { method, headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, ...(body ? { body: JSON.stringify(body) } : {}) });
    const blocked = await call(endpoint);
    assert.equal(blocked.status, 403);
    assert.equal((await blocked.json()).code, 'CLOCK_IN_REQUIRED');
    assert.equal((await call('/api/auth/user')).status, 200);
    assert.equal((await (await call('/api/employee/today')).json()).data.isClockedIn, false);
    // Even a spoofed target/time must use this staff member and server time.
    const punches = await Promise.all([call('/api/employee/clock-in', 'POST', { employeeId: 1, clockInTime: '2000-01-01' }), call('/api/employee/clock-in', 'POST')]);
    assert.deepEqual(punches.map(response => response.status).sort(), [201, 400]);
    const ownProfile = await Employee.findOne({ where: { userId: user.id } });
    assert.ok(ownProfile);
    assert.equal(await Attendance.count({ where: { employeeId: ownProfile.id } }), 1);
    assert.equal((await call(endpoint)).status, 200);
    if (role === 'rider') {
      await user.update({ availability: 'available' });
      assert.equal((await call('/api/employee/clock-out', 'POST')).status, 400);
      assert.equal((await call(endpoint)).status, 200);
      await user.update({ availability: 'offline' });
    }
    assert.equal((await (await call('/api/employee/today')).json()).data.isClockedIn, true);
    const ownAttendance = await Attendance.findOne({ where: { employeeId: ownProfile.id } });
    // An open overnight shift must still grant access and be clockable out.
    if (role === 'cashier') {
      const yesterday = new Date(Date.now() - 86400000);
      await ownAttendance.update({ date: yesterday.toISOString().slice(0, 10), clockIn: yesterday });
    }
    assert.equal((await (await call('/api/employee/today')).json()).data.record.id, ownAttendance.id);
    assert.equal((await call('/api/employee/clock-out', 'POST')).status, 200);
    assert.equal((await call(endpoint)).status, 403);
    if (role !== 'cashier') assert.equal((await call('/api/employee/clock-in', 'POST')).status, 400);
    assert.equal((await call('/api/auth/logout', 'POST')).status, 200);
  }
});
