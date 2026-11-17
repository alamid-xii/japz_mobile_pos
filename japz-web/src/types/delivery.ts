export interface RiderLocation {
  status: 'live' | 'stale' | 'unavailable';
  lat: number | null;
  lng: number | null;
  accuracy: number | null;
  capturedAt: string | null;
  updatedAt: string | null;
  staleAfterSeconds: number;
}

export function isFreshRiderLocation(location?: RiderLocation | null, now = Date.now()) {
  if (!location || location.status !== 'live' || location.lat == null || location.lng == null) return false;
  if (!Number.isFinite(location.lat) || Math.abs(location.lat) > 90 || !Number.isFinite(location.lng) || Math.abs(location.lng) > 180) return false;
  const captured = Date.parse(location.capturedAt || '');
  const updated = Date.parse(location.updatedAt || '');
  const ttl = Math.min(90, Math.max(1, location.staleAfterSeconds || 90)) * 1000;
  return Number.isFinite(captured) && Number.isFinite(updated) && now - captured <= ttl && now - updated <= ttl && captured <= now + 30000 && updated <= now + 30000;
}
