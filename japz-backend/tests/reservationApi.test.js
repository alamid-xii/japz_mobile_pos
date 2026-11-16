import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import mysql from 'mysql2/promise';
import express from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';

process.env.JWT_SECRET = crypto.randomBytes(48).toString('base64url');
const database = `japz_reservation_test_${Date.now()}_${process.pid}`;
let connection, sequelize, models, server, base, table;
const people = {}, tokens = {};
const pending = [];
function futureDate(offset = 1) {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Manila', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date());
  const value = ['year', 'month', 'day'].map(type => parts.find(part => part.type === type).value).join('-');
  const date = new Date(`${value}T00:00:00Z`); date.setUTCDate(date.getUTCDate() + offset);
  return date.toISOString().slice(0, 10);
}
const slot = (offset = 1) => ({ partySize: 4, reservationDate: futureDate(offset), startTime: '12:00', durationMinutes: 90 });
before(async () => {
  connection = await mysql.createConnection({ host: process.env.DB_HOST || '127.0.0.1', port: Number(process.env.DB_PORT) || 3306, user: process.env.DB_USER || 'root', password: process.env.DB_PASSWORD || '' });
  await connection.query(`CREATE DATABASE \`${database}\``);
  for (const key of Object.keys(process.env)) if (key.startsWith('MYSQL') || key === 'DATABASE_URL') delete process.env[key];
  process.env.DB_DATABASE = database;
  ({ sequelize } = await import('../models/db.js'));
  models = await import('../models/index.js');
  const router = (await import('../routes/reservations.js')).default;
  await sequelize.sync({ alter: false });
  for (const role of ['admin', 'cashier', 'customer', 'othercustomer', 'rider', 'inventory']) {
    const actualRole = role === 'othercustomer' ? 'customer' : role;
    people[role] = await models.User.create({ name: role, email: `${role}@reservation-test.local`, password: await bcrypt.hash('ReservationTestPassword123!', 4), phone: '09123456789', role: actualRole, status: 'approved' });
    tokens[role] = jwt.sign({ id: people[role].id, role: actualRole }, process.env.JWT_SECRET);
  }
  await models.BusinessHours.create({ openTime: '09:00:00', closeTime: '22:00:00', applyCashier: false, applyKitchen: false });
  table = await models.RestaurantTable.create({ name: 'Physical table A', capacity: 4, status: 'active' });
  const app = express(); app.use(express.json()); app.use(router);
  server = app.listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  base = `http://127.0.0.1:${server.address().port}`;
});
after(async () => {
  if (server) await new Promise(resolve => server.close(resolve));
  if (sequelize) await sequelize.close();
  if (connection) {
    assert.match(database, /^japz_reservation_test_\d+_\d+$/);
    await connection.query(`DROP DATABASE \`${database}\``); await connection.end();
  }
});
async function call(role, method, path, body) {
  const response = await fetch(base + path, { method, headers: { 'Content-Type': 'application/json', ...(role ? { Authorization: `Bearer ${tokens[role]}` } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}) });
  return { status: response.status, data: await response.json() };
}

test('staff reservation APIs require approved staff and exclude customers, riders and inventory', async () => {
  assert.equal((await call(null, 'GET', '/api/reservations')).status, 401);
  for (const role of ['customer', 'rider', 'inventory']) assert.equal((await call(role, 'GET', '/api/reservations')).status, 403);
  await people.cashier.update({ status: 'inactive' });
  assert.equal((await call('cashier', 'GET', '/api/reservations')).status, 401);
  await people.cashier.update({ status: 'approved' });
});
test('table bookings reject impossible dates, invalid quantities and closing-time overruns', async () => {
  for (const patch of [{ reservationDate: '2026-02-30' }, { partySize: 0 }, { partySize: 1.5 }, { durationMinutes: 0 }, { startTime: '21:00' }]) {
    assert.equal((await call('customer', 'POST', '/api/public/reservations', { ...slot(), ...patch })).status, 400);
  }
  assert.equal(await models.Reservation.count(), 0);
});
test('public availability uses physical table capacity without exposing guest information', async () => {
  const result = await call(null, 'GET', `/api/public/reservations/availability?date=${futureDate()}&time=12:00&partySize=4`);
  assert.equal(result.status, 200); assert.equal(result.data.available, true); assert.equal(result.data.tablesAvailable, 1);
  assert.equal(result.data.customerName, undefined);
  const tooLarge = await call(null, 'GET', `/api/public/reservations/availability?date=${futureDate()}&time=12:00&partySize=5`);
  assert.equal(tooLarge.data.available, false);
});
test('customer requests remain pending and retain account ownership', async () => {
  for (const role of ['customer', 'othercustomer']) {
    const result = await call(role, 'POST', '/api/public/reservations', slot());
    assert.equal(result.status, 200, JSON.stringify(result.data)); assert.equal(result.data.reservation.status, 'pending');
    pending.push(result.data.reservation);
  }
  assert.equal((await call('customer', 'GET', '/api/public/reservations/mine')).data.reservations.length, 1);
  const duplicate = await call('customer', 'POST', '/api/public/reservations', slot());
  assert.equal(duplicate.status, 409);
});
test('concurrent confirmations cannot assign overlapping visits to the same physical table', async () => {
  const results = await Promise.all(pending.map(row => call('admin', 'PUT', `/api/reservations/${row.id}/confirm`, { tableId: table.id })));
  assert.deepEqual(results.map(result => result.status).sort(), [200, 409]);
  assert.equal(await models.Reservation.count({ where: { status: 'confirmed', tableId: table.id } }), 1);
  assert.equal(await models.Reservation.count({ where: { status: 'pending' } }), 1);
});
test('concurrent phone bookings share the same physical-table lock', async () => {
  const results = await Promise.all(['First caller', 'Second caller'].map(customerName => call('cashier', 'POST', '/api/reservations', { ...slot(2), tableId: table.id, customerName })));
  assert.deepEqual(results.map(result => result.status).sort(), [200, 409]);
  assert.equal(await models.Reservation.count({ where: { reservationDate: futureDate(2), status: 'confirmed' } }), 1);
});
test('booking lifecycle preserves audit events and releases a completed table', async () => {
  const booking = await models.Reservation.findOne({ where: { reservationDate: futureDate(), status: 'confirmed' } });
  assert.equal((await call('admin', 'PUT', `/api/reservations/${booking.id}/status`, { status: 'seated' })).status, 200);
  assert.equal((await call('admin', 'PUT', `/api/reservations/${booking.id}/status`, { status: 'completed' })).status, 200);
  const free = await call(null, 'GET', `/api/public/reservations/availability?date=${futureDate()}&time=12:00&partySize=4`);
  assert.equal(free.data.available, true);
  assert.ok(await models.ReservationEvent.count({ where: { reservationId: booking.id } }) >= 3);
});
