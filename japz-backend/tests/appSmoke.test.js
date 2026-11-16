import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import mysql from 'mysql2/promise';

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
