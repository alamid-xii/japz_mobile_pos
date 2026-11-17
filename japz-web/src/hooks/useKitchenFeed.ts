import { useCallback, useEffect, useRef, useState } from 'react';
import { isAxiosError } from 'axios';

const messageFor = (error: unknown, fallback: string) => isAxiosError<{ error?: string; message?: string }>(error)
  ? error.response?.data?.error || error.response?.data?.message || fallback : fallback;

/** Keep the last server snapshot visible; ignore reads started before an action. */
export function useKitchenFeed<T>(load: () => Promise<T[]>, interval: number) {
  const [orders, setOrders] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [actionError, setActionError] = useState('');
  const [notice, setNotice] = useState('');
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);
  const [busy, setBusy] = useState<Set<number>>(new Set());
  const pending = useRef(new Set<number>());
  const generation = useRef(0);
  const mounted = useRef(false);

  const refresh = useCallback(async () => {
    const request = ++generation.current;
    setRefreshing(true);
    try {
      const snapshot = await load();
      if (!Array.isArray(snapshot)) throw new Error('Invalid order response');
      if (mounted.current && request === generation.current) {
        setOrders(snapshot);
        setError('');
        setUpdatedAt(new Date());
        return true;
      }
    } catch (failure) {
      if (mounted.current && request === generation.current) {
        setError(messageFor(failure, 'Orders could not be refreshed. Check your connection and retry.'));
      }
    } finally {
      if (mounted.current && request === generation.current) { setLoading(false); setRefreshing(false); }
    }
    return false;
  }, [load]);

  useEffect(() => {
    mounted.current = true;
    void refresh();
    const check = () => { if (document.visibilityState === 'visible' && !pending.current.size) void refresh(); };
    const timer = window.setInterval(check, interval);
    window.addEventListener('focus', check);
    document.addEventListener('visibilitychange', check);
    return () => {
      mounted.current = false;
      clearInterval(timer);
      window.removeEventListener('focus', check);
      document.removeEventListener('visibilitychange', check);
    };
  }, [refresh, interval]);

  const act = async (id: number, action: () => Promise<unknown>, success: string) => {
    // Ref guards are synchronous, so a quick double tap cannot send two writes.
    if (pending.current.has(id)) return false;
    pending.current.add(id);
    ++generation.current;
    setBusy(new Set(pending.current));
    setNotice('');
    setActionError('');
    try {
      await action();
      if (!mounted.current) return false;
      setNotice(success);
      await refresh();
      return true;
    } catch (failure) {
      if (mounted.current) setActionError(messageFor(failure, 'The change was not saved. Refresh the orders and try again.'));
      return false;
    } finally {
      pending.current.delete(id);
      if (mounted.current) setBusy(new Set(pending.current));
    }
  };
  const retry = useCallback(async () => { if (await refresh()) setActionError(''); }, [refresh]);
  return { orders, loading, refreshing, error: actionError || error, notice, updatedAt, busy, refresh: retry, act };
}
