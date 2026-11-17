import { useCallback, useEffect, useRef, useState } from 'react';
import { workflowAPI } from '../services/api';

interface Point { lat: number; lng: number; accuracy: number; capturedAt: string }
interface ShareState { key: string; sentAt: string | null; error: string | null }
const message = (error: unknown) => (error as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Live location could not be sent. Check your connection; the app will retry.';

/** Foreground browser GPS only. Publishes a latest snapshot, never a route history. */
export function useRiderLocationSharing(deliveryIds: number[], enabled: boolean, mapOpen: boolean) {
  const [visible, setVisible] = useState(() => document.visibilityState === 'visible');
  const key = enabled && visible ? deliveryIds.slice().sort((a,b) => a-b).join(',') : '';
  const watching = visible && (Boolean(key) || mapOpen);
  const supported = Boolean(navigator.geolocation && window.isSecureContext);
  const targets = useRef<number[]>([]);
  const mounted = useRef(true);
  const generation = useRef(0);
  const captureAfter = useRef(0);
  const pending = useRef<Promise<void> | null>(null);
  const stopBarrier = useRef<Promise<void>>(Promise.resolve());
  const stopping = useRef(0);
  const lastAttempt = useRef(0);
  const [position, setPosition] = useState<Point | null>(null);
  const [positionError, setPositionError] = useState<string | null>(null);
  const [state, setState] = useState<ShareState>({ key, sentAt: null, error: null });
  if (state.key !== key) setState({ key, sentAt: null, error: null });

  const stop = useCallback((ids: number[]) => {
    if (!ids.length) return;
    stopping.current++;
    const previous = stopBarrier.current;
    const publishing = pending.current || Promise.resolve();
    stopBarrier.current = Promise.all([previous, publishing])
      .then(() => Promise.allSettled(ids.map(id => workflowAPI.stopRiderLocation(id))))
      .then(() => {}).finally(() => { stopping.current--; });
  }, []);

  const publish = useCallback((point: Point) => {
    // Allow scheduler/GPS latency around the 10s heartbeat without skipping a whole beat.
    if (!mounted.current || document.visibilityState !== 'visible' || !targets.current.length || pending.current || stopping.current || Date.now() - lastAttempt.current < 9000) return;
    const captured = Date.parse(point.capturedAt);
    if (!Number.isFinite(captured) || captured < captureAfter.current || Date.now() - captured > 60000 || !Number.isFinite(point.accuracy) || point.accuracy < 0 || point.accuracy > 10000) return;
    lastAttempt.current = Date.now();
    const epoch = generation.current;
    const targetKey = targets.current.join(',');
    const request = Promise.allSettled(targets.current.map(id => workflowAPI.shareRiderLocation(id, point))).then(results => {
      if (!mounted.current || epoch !== generation.current) return;
      const failed = results.find(result => result.status === 'rejected');
      setState(previous => ({ key: targetKey, sentAt: failed ? previous.sentAt : new Date().toISOString(), error: failed?.status === 'rejected' ? message(failed.reason) : null }));
    }).finally(() => { pending.current = null; });
    pending.current = request;
  }, []);

  useEffect(() => {
    const changed = () => setVisible(document.visibilityState === 'visible');
    document.addEventListener('visibilitychange', changed);
    return () => document.removeEventListener('visibilitychange', changed);
  }, []);

  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; const ids = targets.current; targets.current = []; stop(ids); };
  }, [stop]);

  useEffect(() => {
    const next = key ? key.split(',').map(Number) : [];
    const removed = targets.current.filter(id => !next.includes(id));
    const epoch = ++generation.current;
    targets.current = next;
    stop(removed);
    lastAttempt.current = 0;
    let cancelled = false;
    // Wait for any prior Pause to reach the server, then request a fresh post-Pause fix.
    void Promise.all([stopBarrier.current, pending.current || Promise.resolve()]).then(() => {
      if (cancelled || !mounted.current || epoch !== generation.current || !next.length || !supported) return;
      captureAfter.current = Date.now();
      navigator.geolocation.getCurrentPosition(sample => {
        if (cancelled || epoch !== generation.current) return;
        const point = { lat: sample.coords.latitude, lng: sample.coords.longitude, accuracy: sample.coords.accuracy, capturedAt: new Date(sample.timestamp).toISOString() };
        setPosition(point);
        publish(point);
      }, () => {}, { enableHighAccuracy: true, maximumAge: 0, timeout: 15000 });
    });
    return () => { cancelled = true; };
  }, [key, publish, stop, supported]);

  useEffect(() => {
    if (!watching || !supported) return;
    let cancelled = false;
    const received = (sample: GeolocationPosition) => {
      if (cancelled) return;
      const point = { lat: sample.coords.latitude, lng: sample.coords.longitude, accuracy: sample.coords.accuracy, capturedAt: new Date(sample.timestamp).toISOString() };
      if (!Number.isFinite(point.lat) || !Number.isFinite(point.lng) || !Number.isFinite(point.accuracy) || point.accuracy > 10000) { setPositionError('GPS accuracy is too low. Move outdoors and try again.'); return; }
      setPosition(point);
      setPositionError(null);
      publish(point);
    };
    const failed = (error: GeolocationPositionError) => {
      if (!cancelled) { setPosition(null); setPositionError(error.code === 1 ? 'Location permission is blocked. Allow location in your browser, then pause and resume sharing.' : 'GPS is unavailable. Move to a clearer area; location will retry.'); }
    };
    const options = { enableHighAccuracy: true, maximumAge: 10000, timeout: 15000 };
    const watch = navigator.geolocation.watchPosition(received, failed, options);
    const heartbeat = window.setInterval(() => navigator.geolocation.getCurrentPosition(received, failed, options), 10000);
    const reconnect = () => navigator.geolocation.getCurrentPosition(received, failed, { ...options, maximumAge: 0 });
    window.addEventListener('online', reconnect);
    return () => { cancelled = true; navigator.geolocation.clearWatch(watch); clearInterval(heartbeat); window.removeEventListener('online', reconnect); };
  }, [watching, publish, supported]);

  return { position, lastSharedAt: state.key === key ? state.sentAt : null, error: watching && !supported ? 'Location requires HTTPS (or localhost) and a device with GPS.' : positionError || (state.key === key ? state.error : null) };
}
