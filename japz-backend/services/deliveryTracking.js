import crypto from 'node:crypto';

export const MAX_PROOF_BYTES = 6 * 1024 * 1024;
export const LOCATION_STALE_SECONDS = 90;
const MAX_SAMPLE_AGE_MS = 120000;
const MAX_FUTURE_SKEW_MS = 30000;

/** Browser-provided MIME is checked against the file itself before storage. */
export function validateProofPhoto(buffer, mime) {
  if (!Buffer.isBuffer(buffer) || !buffer.length) throw new Error('A proof-of-delivery photo is required.');
  if (buffer.length > MAX_PROOF_BYTES) throw new Error('That photo is larger than 6MB.');
  let detected = null;
  if (buffer.length >= 12 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff &&
      buffer[buffer.length - 2] === 0xff && buffer[buffer.length - 1] === 0xd9) detected = 'image/jpeg';
  if (buffer.length >= 45 && buffer.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])) &&
      buffer.readUInt32BE(8) === 13 && buffer.toString('ascii', 12, 16) === 'IHDR' &&
      buffer.readUInt32BE(16) > 0 && buffer.readUInt32BE(20) > 0 &&
      buffer.subarray(-12).equals(Buffer.from('0000000049454e44ae426082', 'hex'))) detected = 'image/png';
  if (buffer.length >= 20 && buffer.toString('ascii', 0, 4) === 'RIFF' &&
      buffer.toString('ascii', 8, 12) === 'WEBP' && ['VP8 ', 'VP8L', 'VP8X'].includes(buffer.toString('ascii', 12, 16)) &&
      buffer.readUInt32LE(4) + 8 === buffer.length) detected = 'image/webp';
  if (!detected || detected !== mime) throw new Error('Proof must contain a valid JPG, PNG or WebP photo matching its file type.');
  return { mime: detected, size: buffer.length, sha256: crypto.createHash('sha256').update(buffer).digest('hex') };
}

export function legacyProofFilename(value) {
  if (typeof value !== 'string' || value.includes('..')) return null;
  return /^\/uploads\/pod\/([a-zA-Z0-9][a-zA-Z0-9._-]*\.(?:jpe?g|png|webp))$/i.exec(value)?.[1] ?? null;
}

export const proofPhotoUrl = delivery => delivery && (delivery.proofPhotoSize > 0 || legacyProofFilename(delivery.proofPhotoUrl))
  ? `/api/deliveries/${delivery.id}/proof` : null;

/** One latest sample per delivery, never a location history. */
export const clearedLocation = () => ({
  locationSharing: false, locationLat: null, locationLng: null, locationAccuracy: null,
  locationCapturedAt: null, locationUpdatedAt: null, locationStoppedAt: null,
});

export function validateLocationSample(body, now = new Date()) {
  const { lat, lng, accuracy, capturedAt } = body || {};
  if (typeof lat !== 'number' || !Number.isFinite(lat) || Math.abs(lat) > 90 ||
      typeof lng !== 'number' || !Number.isFinite(lng) || Math.abs(lng) > 180) {
    throw new Error('A valid latitude and longitude are required.');
  }
  if (typeof accuracy !== 'number' || !Number.isFinite(accuracy) || accuracy < 0 || accuracy > 10000) {
    throw new Error('GPS accuracy must be between 0 and 10000 metres.');
  }
  const captured = typeof capturedAt === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?Z$/.test(capturedAt)
    ? new Date(capturedAt) : new Date(NaN);
  const age = now.getTime() - captured.getTime();
  if (!Number.isFinite(age) || captured.toISOString().slice(0, 19) !== capturedAt.slice(0, 19) || age > MAX_SAMPLE_AGE_MS || age < -MAX_FUTURE_SKEW_MS) {
    throw new Error('GPS timestamp must be recent and use an ISO UTC timestamp.');
  }
  return { locationSharing: true, locationLat: lat, locationLng: lng, locationAccuracy: accuracy,
    locationCapturedAt: captured, locationUpdatedAt: now };
}

export function serializeDeliveryLocation(delivery, orderStatus, now = new Date()) {
  const unavailable = { status: 'unavailable', lat: null, lng: null, accuracy: null,
    capturedAt: null, updatedAt: null, staleAfterSeconds: LOCATION_STALE_SECONDS };
  if (!delivery || delivery.status !== 'out-for-delivery' || orderStatus !== 'out-for-delivery' || !delivery.locationSharing) return unavailable;
  const captured = new Date(delivery.locationCapturedAt);
  const updated = new Date(delivery.locationUpdatedAt);
  const lat = Number(delivery.locationLat), lng = Number(delivery.locationLng), accuracy = Number(delivery.locationAccuracy);
  if (delivery.locationLat == null || delivery.locationLng == null || delivery.locationAccuracy == null ||
      !delivery.locationCapturedAt || !delivery.locationUpdatedAt || !Number.isFinite(captured.getTime()) || !Number.isFinite(updated.getTime()) ||
      !Number.isFinite(lat) || Math.abs(lat) > 90 || !Number.isFinite(lng) || Math.abs(lng) > 180 ||
      !Number.isFinite(accuracy) || accuracy < 0 || accuracy > 10000) return unavailable;
  const stale = now - updated > LOCATION_STALE_SECONDS * 1000 || now - captured > LOCATION_STALE_SECONDS * 1000 ||
    captured - now > MAX_FUTURE_SKEW_MS || updated - now > MAX_FUTURE_SKEW_MS;
  return { status: stale ? 'stale' : 'live', lat: stale ? null : lat, lng: stale ? null : lng,
    accuracy: stale ? null : accuracy, capturedAt: captured.toISOString(), updatedAt: updated.toISOString(),
    staleAfterSeconds: LOCATION_STALE_SECONDS };
}
