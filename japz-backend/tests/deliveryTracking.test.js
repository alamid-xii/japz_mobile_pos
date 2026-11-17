import test from 'node:test';
import assert from 'node:assert/strict';
import { blockPublicProofFiles } from '../middleware/privateProofFiles.js';
import { MAX_PROOF_BYTES, clearedLocation, legacyProofFilename, proofPhotoUrl, serializeDeliveryLocation, validateLocationSample, validateProofPhoto } from '../services/deliveryTracking.js';

const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+j4z8AAAAASUVORK5CYII=', 'base64');
const now = new Date('2026-11-17T09:00:00.000Z');
const sample = { lat: 0, lng: 0, accuracy: 0, capturedAt: now.toISOString() };

test('location validation preserves zero and rejects coercion, bad ranges, accuracy and stale/future times', () => {
  assert.equal(validateLocationSample(sample, now).locationLat, 0);
  for (const change of [{ lat: '' }, { lat: '13.4' }, { lat: null }, { lat: 91 }, { lng: -181 }, { accuracy: -1 }, { accuracy: 10001 }, { accuracy: null }, { capturedAt: 'bad' }, { capturedAt: '2026-11-17T08:57:59.999Z' }, { capturedAt: '2026-11-17T09:00:30.001Z' }]) {
    assert.throws(() => validateLocationSample({ ...sample, ...change }, now));
  }
  assert.throws(() => validateLocationSample({ ...sample, capturedAt: '2026-02-31T09:00:00Z' }, new Date('2026-03-03T09:00:00Z')));
});

test('stale, stopped and completed deliveries never serialize coordinates', () => {
  const delivery = { status: 'out-for-delivery', ...validateLocationSample(sample, now) };
  assert.equal(serializeDeliveryLocation(delivery, 'out-for-delivery', now).status, 'live');
  assert.equal(serializeDeliveryLocation(delivery, 'out-for-delivery', now).lat, 0);
  const stale = serializeDeliveryLocation(delivery, 'out-for-delivery', new Date(now.getTime() + 90001));
  assert.equal(stale.status, 'stale'); assert.equal(stale.lat, null); assert.equal(stale.lng, null);
  for (const [record, orderStatus] of [[{ ...delivery, ...clearedLocation() }, 'out-for-delivery'], [delivery, 'completed'], [{ ...delivery, status: 'delivered' }, 'out-for-delivery']]) {
    const result = serializeDeliveryLocation(record, orderStatus, now);
    assert.equal(result.status, 'unavailable'); assert.equal(result.lat, null); assert.equal(result.updatedAt, null);
  }
});

test('proof content must match its MIME and fit the upload limit', () => {
  const result = validateProofPhoto(png, 'image/png');
  assert.equal(result.size, png.length); assert.match(result.sha256, /^[a-f0-9]{64}$/);
  for (const [bytes, mime] of [[png, 'image/jpeg'], [png.subarray(0, 33), 'image/png'], [Buffer.from('<svg/>'), 'image/png'], [Buffer.alloc(0), 'image/png'], [Buffer.alloc(MAX_PROOF_BYTES + 1), 'image/png']]) {
    assert.throws(() => validateProofPhoto(bytes, mime));
  }
});

test('proof DTOs only expose private API paths and legacy sources reject traversal', () => {
  assert.equal(proofPhotoUrl({ id: 9, proofPhotoSize: png.length }), '/api/deliveries/9/proof');
  assert.equal(proofPhotoUrl({ id: 9, proofPhotoUrl: '/uploads/pod/pod-test.png' }), '/api/deliveries/9/proof');
  for (const source of ['/uploads/pod/../secret.jpg', '/uploads/pod/a..jpg', '/uploads/pod/a.jpg?token=1', '/uploads/pod/%2e%2e.jpg', 'https://example.com/a.jpg', '/other/a.jpg']) {
    assert.equal(legacyProofFilename(source), null); assert.equal(proofPhotoUrl({ id: 9, proofPhotoUrl: source }), null);
  }
});

test('static proof protection rejects encoded, mixed-case and normalized path variants', () => {
  for (const source of ['/uploads/pod/a.png', '/uploads/POD/a.png', '/uploads%2fpod/a.png', '/uploads/%70od/a.png', '/uploads/other/../pod/a.png', '/uploads%5cpod%5ca.png', '/uploads/pod']) {
    let status, next = false;
    blockPublicProofFiles({ path: source }, { sendStatus: code => { status = code; } }, () => { next = true; });
    assert.equal(status, 404, source); assert.equal(next, false, source);
  }
  let next = false;
  blockPublicProofFiles({ path: '/uploads/menu/a.png' }, {}, () => { next = true; });
  assert.equal(next, true);
});
