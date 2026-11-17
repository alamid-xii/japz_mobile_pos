import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import mysql from 'mysql2/promise';
import express from 'express';
import jwt from 'jsonwebtoken';
import { mkdtemp, readFile, writeFile, rm } from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { runDeliveryLiveTrackingMigration } from '../migrations/add-delivery-live-tracking.js';
import { importLegacyDeliveryProofs } from '../scripts/import-legacy-delivery-proofs.js';

// This harness never imports the application startup or opens its database.
// Only its generated schema can be mutated or dropped.
const database = `japz_delivery_test_${Date.now()}_${process.pid}`;
const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+j4z8AAAAASUVORK5CYII=', 'base64');
let connection, sequelize, models, Delivery, changeOrderStatus, server, base, sequence = 0;
const people = {}, tokens = {};
before(async () => {
  connection = await mysql.createConnection({ host: process.env.DB_HOST || '127.0.0.1', port: Number(process.env.DB_PORT) || 3306, user: process.env.DB_USER || 'root', password: process.env.DB_PASSWORD || '' });
  assert.match(database, /^japz_delivery_test_\d+_\d+$/);
  await connection.query(`CREATE DATABASE \`${database}\``);
  for (const key of Object.keys(process.env)) if (key.startsWith('MYSQL') || key === 'DATABASE_URL') delete process.env[key];
  process.env.DB_DATABASE = database;
  process.env.JWT_SECRET = crypto.randomBytes(48).toString('base64url');
  process.env.NODE_ENV = 'test';
  ({ sequelize } = await import('../models/db.js'));
  assert.equal(sequelize.getDatabaseName(), database);
  models = await import('../models/index.js');
  ({ Delivery } = await import('../models/deliveryModel.js'));
  const deliveryRouter = (await import('../routes/delivery.js')).default;
  const publicRouter = (await import('../routes/publicOrders.js')).default;
  ({ changeOrderStatus } = await import('../services/inventoryOrders.js'));
  // Begin with the previous delivery schema to exercise the actual additive DDL.
  await sequelize.query(`CREATE TABLE deliveries (
    id INT AUTO_INCREMENT PRIMARY KEY, orderId INT NOT NULL UNIQUE, riderId INT NOT NULL,
    assignedByUserId INT NULL, status ENUM('assigned','out-for-delivery','delivered','failed') NOT NULL DEFAULT 'assigned',
    assignedAt DATETIME NOT NULL, startedAt DATETIME NULL, deliveredAt DATETIME NULL,
    proofPhotoUrl VARCHAR(255) NULL, proofLat DECIMAL(10,7) NULL, proofLng DECIMAL(10,7) NULL,
    notes TEXT NULL, createdAt DATETIME NOT NULL, updatedAt DATETIME NOT NULL)`);
  assert.equal((await runDeliveryLiveTrackingMigration(sequelize)).added.length, 11);
  assert.deepEqual((await runDeliveryLiveTrackingMigration(sequelize)).added, []);
  await sequelize.sync({ alter: false });
  for (const label of ['admin', 'cashier', 'kitchen', 'customer', 'othercustomer', 'rider', 'otherrider']) {
    const role = label === 'othercustomer' ? 'customer' : label === 'otherrider' ? 'rider' : label;
    const user = await models.User.create({ name: label, email: `${label}@delivery-test.local`, password: 'unused', phone: '09123456789', role, status: 'approved', availability: role === 'rider' ? 'on-delivery' : 'offline' });
    people[label] = user;
    tokens[label] = jwt.sign({ id: user.id, role }, process.env.JWT_SECRET);
    if (['cashier', 'kitchen', 'rider'].includes(role)) {
      const employee = await models.Employee.create({ userId: user.id, name: label, email: user.email, password: 'unused', phone: '', role });
      await models.Attendance.create({ employeeId: employee.id, date: new Date().toISOString().slice(0, 10), clockIn: new Date() });
    }
  }
  await models.BusinessHours.create({ openTime: '00:00:00', closeTime: '23:59:00', applyCashier: false, applyKitchen: false });
  const app = express(); app.use(express.json()); app.use(deliveryRouter); app.use(publicRouter);
  server = app.listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  base = `http://127.0.0.1:${server.address().port}`;
});
after(async () => {
  if (server) await new Promise(resolve => server.close(resolve));
  if (sequelize) await sequelize.close();
  if (connection) {
    assert.match(database, /^japz_delivery_test_\d+_\d+$/);
    await connection.query(`DROP DATABASE \`${database}\``);
    await connection.end();
  }
});
async function call(role, method, endpoint, body) {
  const response = await fetch(base + endpoint, { method, headers: { 'Content-Type': 'application/json', ...(role ? { Authorization: `Bearer ${tokens[role]}` } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}) });
  return { status: response.status, data: await response.json() };
}
async function fixture(status = 'out-for-delivery', customer = people.customer.id) {
  const order = await models.Order.create({ orderNumber: `DELIVERY-TEST-${++sequence}`, status, source: 'online', orderType: 'delivery', customerUserId: customer, customerName: 'Customer', deliveryAddress: 'Test address', total: 100 });
  const delivery = await Delivery.create({ orderId: order.id, riderId: people.rider.id, status: status === 'ready' ? 'assigned' : status === 'completed' ? 'delivered' : status, assignedAt: new Date() });
  return { order, delivery, endpoint: `/api/rider/deliveries/${delivery.id}` };
}
const sample = (offset = 0) => ({ lat: 13.4, lng: 121.2, accuracy: 12, capturedAt: new Date(Date.now() + offset).toISOString() });
async function upload(endpoint, bytes = png, mime = 'image/png') {
  const form = new FormData(); form.append('proof', new Blob([bytes], { type: mime }), 'proof.png'); form.append('notes', 'Received');
  const response = await fetch(base + endpoint + '/deliver', { method: 'POST', headers: { Authorization: `Bearer ${tokens.rider}` }, body: form });
  return { status: response.status, data: await response.json() };
}

test('location updates require active attendance, assigned ownership and an active delivery/order', async () => {
  const { delivery, endpoint } = await fixture('ready');
  assert.equal((await call(null, 'PUT', endpoint + '/location', sample())).status, 401);
  assert.equal((await call('customer', 'PUT', endpoint + '/location', sample())).status, 403);
  assert.equal((await call('otherrider', 'PUT', endpoint + '/location', sample())).status, 404);
  assert.equal((await call('rider', 'PUT', endpoint + '/location', sample())).status, 409);
  assert.equal((await call('rider', 'POST', endpoint + '/start')).status, 200);
  assert.equal((await call('rider', 'PUT', endpoint + '/location', sample(-10))).status, 200);
  const employee = await models.Employee.findOne({ where: { userId: people.rider.id } });
  await models.Attendance.update({ clockOut: new Date() }, { where: { employeeId: employee.id } });
  assert.equal((await call('rider', 'PUT', endpoint + '/location', sample())).status, 403);
  await models.Attendance.update({ clockOut: null }, { where: { employeeId: employee.id } });
  await people.rider.update({ status: 'inactive' });
  assert.equal((await call('rider', 'PUT', endpoint + '/location', sample())).status, 401);
  await people.rider.update({ status: 'approved' });
  assert.equal((await Delivery.findByPk(delivery.id)).locationSharing, true);
});

test('GPS validation, monotonic timestamps and server stop barrier prevent invalid or late snapshots', async () => {
  const { delivery, endpoint } = await fixture();
  for (const patch of [{ lat: 91 }, { lng: '121.2' }, { accuracy: -1 }, { capturedAt: new Date(Date.now() - 121000).toISOString() }, { capturedAt: new Date(Date.now() + 31000).toISOString() }]) {
    assert.equal((await call('rider', 'PUT', endpoint + '/location', { ...sample(), ...patch })).status, 400);
  }
  const first = sample(-200);
  const result = await call('rider', 'PUT', endpoint + '/location', { ...first, updatedAt: '2000-01-01', locationUpdatedAt: '2000-01-01' });
  assert.equal(result.status, 200); assert.equal(result.data.location.status, 'live');
  assert.ok(new Date(result.data.location.updatedAt).getFullYear() >= 2026);
  assert.equal((await call('rider', 'PUT', endpoint + '/location', first)).status, 409);
  assert.equal((await call('rider', 'DELETE', endpoint + '/location')).data.location.status, 'unavailable');
  const stopped = await Delivery.findByPk(delivery.id);
  assert.equal(stopped.locationLat, null); assert.equal(stopped.locationCapturedAt, null); assert.ok(stopped.locationStoppedAt);
  assert.equal((await call('rider', 'PUT', endpoint + '/location', first)).status, 409);
  assert.equal((await call('rider', 'PUT', endpoint + '/location', sample(1))).status, 200);
});

test('customer tracking restricts GPS to its current approved owner and hides stale snapshots', async () => {
  const { order, delivery, endpoint } = await fixture();
  await call('rider', 'PUT', endpoint + '/location', sample(-10));
  const url = `/api/public/orders/${order.orderNumber}`;
  assert.equal((await call('customer', 'GET', url)).data.order.delivery.location.status, 'live');
  for (const role of [null, 'othercustomer', 'admin']) assert.equal((await call(role, 'GET', url)).status, 404);
  await people.customer.update({ status: 'inactive' });
  assert.equal((await call('customer', 'GET', url)).status, 404);
  await people.customer.update({ status: 'approved' });
  await delivery.update({ locationCapturedAt: new Date(Date.now() - 91000), locationUpdatedAt: new Date(Date.now() - 91000) });
  const stale = (await call('customer', 'GET', url)).data.order.delivery.location;
  assert.equal(stale.status, 'stale'); assert.equal(stale.lat, null); assert.equal(stale.lng, null);
  const guest = await fixture('out-for-delivery', null);
  await call('rider', 'PUT', guest.endpoint + '/location', sample(-10));
  const legacy = await call(null, 'GET', `/api/public/orders/${guest.order.orderNumber}`);
  assert.equal(legacy.status, 200); assert.equal(legacy.data.order.delivery.location.status, 'unavailable');
});

test('invalid proof never completes an order and transaction failure rolls photo and GPS back', async () => {
  const { order, delivery, endpoint } = await fixture();
  await call('rider', 'PUT', endpoint + '/location', sample(-10));
  assert.equal((await upload(endpoint, Buffer.from('not a photo'))).status, 400);
  assert.equal((await upload(endpoint, png, 'image/jpeg')).status, 400);
  models.Order.addHook('beforeUpdate', 'delivery-test-rollback', changed => {
    if (changed.id === order.id && changed.status === 'completed') throw new Error('Injected delivery completion failure');
  });
  try { assert.equal((await upload(endpoint)).status, 500); }
  finally { models.Order.removeHook('beforeUpdate', 'delivery-test-rollback'); }
  const stored = await Delivery.scope('withProof').findByPk(delivery.id);
  assert.equal(stored.status, 'out-for-delivery'); assert.equal(stored.proofPhotoData, null); assert.equal(stored.locationSharing, true);
  assert.equal((await models.Order.findByPk(order.id)).status, 'out-for-delivery');
});

test('completion stores one private DB proof, clears GPS, and protects downloads and receipts', async () => {
  const { order, delivery, endpoint } = await fixture();
  await call('rider', 'PUT', endpoint + '/location', sample(-10));
  const results = await Promise.all([upload(endpoint), upload(endpoint)]);
  assert.deepEqual(results.map(result => result.status).sort(), [200, 409]);
  const url = `/api/deliveries/${delivery.id}/proof`;
  assert.equal(results.find(result => result.status === 200).data.proofPhotoUrl, url);
  const stored = await Delivery.scope('withProof').findByPk(delivery.id);
  assert.deepEqual(stored.proofPhotoData, png); assert.equal(stored.proofPhotoUrl, null); assert.equal(stored.proofPhotoSize, png.length);
  assert.equal(stored.locationLat, null); assert.equal(stored.locationSharing, false);
  const beforeStop = stored.toJSON();
  assert.equal((await call('rider', 'DELETE', endpoint + '/location')).data.location.status, 'unavailable');
  assert.deepEqual((await Delivery.scope('withProof').findByPk(delivery.id)).toJSON(), beforeStop);
  assert.equal((await models.Order.findByPk(order.id)).status, 'completed');
  assert.equal((await call('rider', 'PUT', endpoint + '/location', sample())).status, 409);
  assert.equal((await call('customer', 'GET', `/api/public/orders/${order.orderNumber}`)).data.order.delivery.location.status, 'unavailable');
  for (const role of ['customer', 'rider', 'admin', 'cashier']) {
    const response = await fetch(base + url, { headers: { Authorization: `Bearer ${tokens[role]}` } });
    assert.equal(response.status, 200, role); assert.equal(response.headers.get('content-type'), 'image/png');
    assert.match(response.headers.get('cache-control'), /no-store/); assert.equal(response.headers.get('x-content-type-options'), 'nosniff');
    assert.deepEqual(Buffer.from(await response.arrayBuffer()), png);
    const receipt = await call(role, 'GET', `/api/receipts/${order.orderNumber}`);
    assert.equal(receipt.status, 200); assert.equal(receipt.data.receipt.delivery.proofPhotoUrl, url);
  }
  for (const [role, status] of [[null, 401], ['othercustomer', 404], ['otherrider', 404], ['kitchen', 404]]) {
    assert.equal((await fetch(base + url, { headers: role ? { Authorization: `Bearer ${tokens[role]}` } : {} })).status, status);
  }
  assert.equal((await call('kitchen', 'GET', `/api/receipts/${order.orderNumber}`)).data.receipt.delivery.proofPhotoUrl, null);
  const sql = [];
  const list = await Delivery.findAll({ logging: statement => sql.push(statement) });
  assert.equal(list.find(d => d.id === delivery.id).toJSON().proofPhotoData, undefined);
  assert.ok(sql.every(statement => !statement.includes('proofPhotoData')));
  assert.equal((await call('rider', 'GET', '/api/rider/deliveries')).data.history.find(d => d.deliveryId === delivery.id).proofPhotoUrl, url);
});

test('legacy import copies only missing proofs into the disposable database and preserves files', async () => {
  const { delivery } = await fixture('completed');
  const root = await mkdtemp(path.join(os.tmpdir(), 'japz-delivery-db-test-'));
  const file = path.join(root, 'original.png');
  try {
    await writeFile(file, png); await delivery.update({ proofPhotoUrl: '/uploads/pod/original.png' });
    assert.equal((await importLegacyDeliveryProofs(sequelize, { root })).eligible, 1);
    assert.equal((await Delivery.scope('withProof').findByPk(delivery.id)).proofPhotoData, null);
    assert.equal((await importLegacyDeliveryProofs(sequelize, { root, apply: true })).imported, 1);
    assert.equal((await importLegacyDeliveryProofs(sequelize, { root, apply: true })).scanned, 0);
    const stored = await Delivery.scope('withProof').findByPk(delivery.id);
    assert.deepEqual(stored.proofPhotoData, png); assert.equal(stored.proofPhotoUrl, '/uploads/pod/original.png');
    assert.deepEqual(await readFile(file), png);
  } finally {
    assert.match(path.basename(root), /^japz-delivery-db-test-/);
    await rm(root, { recursive: true, force: true });
  }
});

test('private legacy fallback reads only confined photo files before optional backfill', async () => {
  const { delivery } = await fixture('completed');
  const root = await mkdtemp(path.join(os.tmpdir(), 'japz-delivery-fallback-test-'));
  const originalCwd = process.cwd();
  try {
    const { mkdir } = await import('node:fs/promises');
    const uploads = path.join(root, 'public', 'uploads', 'pod');
    await mkdir(uploads, { recursive: true });
    await writeFile(path.join(uploads, 'legacy.png'), png);
    await delivery.update({ proofPhotoUrl: '/uploads/pod/legacy.png' });
    // Point the legacy reader at temporary fixtures, never at real POD files.
    process.chdir(root);
    const url = base + `/api/deliveries/${delivery.id}/proof`;
    const headers = { Authorization: `Bearer ${tokens.customer}` };
    const response = await fetch(url, { headers });
    assert.equal(response.status, 200); assert.deepEqual(Buffer.from(await response.arrayBuffer()), png);
    await delivery.update({ proofPhotoUrl: '/uploads/pod/../legacy.png' });
    assert.equal((await fetch(url, { headers })).status, 404);
    assert.deepEqual(await readFile(path.join(uploads, 'legacy.png')), png);
  } finally {
    process.chdir(originalCwd);
    assert.match(path.basename(root), /^japz-delivery-fallback-test-/);
    await rm(root, { recursive: true, force: true });
  }
});

test('generic completion requires delivery proof flow while preserving other handoffs and permissions', async () => {
  for (const status of ['ready', 'out-for-delivery']) {
    const { order, delivery } = await fixture(status);
    const item = await models.OrderItem.create({ orderId: order.id, name: 'Guarded delivery', quantity: 1, price: 100, total: 100, status: 'ready' });
    const beforeOrder = (await order.reload()).toJSON();
    const beforeDelivery = (await Delivery.scope('withProof').findByPk(delivery.id)).toJSON();
    const beforeItem = (await item.reload()).toJSON();
    for (const role of ['admin', 'cashier']) {
      await assert.rejects(() => changeOrderStatus(order.id, 'completed', people[role]), error => error.status === 409 && /assigned rider.*proof-of-delivery photo/.test(error.message));
      assert.deepEqual((await models.Order.findByPk(order.id)).toJSON(), beforeOrder);
      assert.deepEqual((await Delivery.scope('withProof').findByPk(delivery.id)).toJSON(), beforeDelivery);
      assert.deepEqual((await models.OrderItem.findByPk(item.id)).toJSON(), beforeItem);
    }
    await assert.rejects(() => changeOrderStatus(order.id, 'completed', people.kitchen), error => error.status === 403);
  }
  for (const orderType of ['take-out', 'dine-in']) {
    for (const role of ['cashier', 'admin']) {
      const order = await models.Order.create({ orderNumber: `NONDELIVERY-TEST-${++sequence}`, orderType, status: 'ready', source: 'online', total: 100 });
      const result = await changeOrderStatus(order.id, 'completed', people[role]);
      assert.equal(result.order.status, 'completed'); assert.ok(result.order.completedAt);
      // Existing completed requests remain idempotent for historic orders.
      assert.match((await changeOrderStatus(order.id, 'completed', people[role])).message, /already up to date/);
    }
  }
});
