import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { useAuth } from './useAuth';
import { employeeAPI } from '../services/api';
import { needsClockIn } from '../utils/stations';
import { ShiftContext, type AttendanceRecord } from '../contexts/ShiftContext';

const errorMessage = (error: unknown) => {
  const response = error as { response?: { data?: { message?: string; error?: string } } };
  return response.response?.data?.message || response.response?.data?.error || 'Attendance is unavailable. Check your connection and try again.';
};

export function ShiftProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const userId = user?.id;
  const [state, setState] = useState<{ userId?: number; record: AttendanceRecord | null; loading: boolean; error: string }>({ record: null, loading: true, error: '' });
  const [busy, setBusy] = useState(false);
  const identity = useRef(user?.id);
  identity.current = user?.id;
  const generation = useRef(0);
  const punching = useRef(false);
  const required = needsClockIn(user);

  const refresh = useCallback(async () => {
    if (!userId || !required || punching.current) return;
    const request = ++generation.current;
    try {
      const result = await employeeAPI.getMyTodayAttendance();
      if (!result.data?.success) throw new Error('Invalid attendance response');
      if (identity.current === userId && request === generation.current) {
        setState({ userId, record: result.data.data?.record || null, loading: false, error: '' });
      }
    } catch (error) {
      if (identity.current === userId && request === generation.current) {
        setState(previous => ({ ...previous, userId, loading: false, error: errorMessage(error) }));
      }
    }
  }, [userId, required]);

  useEffect(() => {
    if (!required) return;
    void refresh();
    const check = () => { if (document.visibilityState === 'visible') void refresh(); };
    const storage = (event: StorageEvent) => { if (event.key === 'japz.shiftChanged') void refresh(); };
    const invalidated = () => {
      ++generation.current;
      setState(previous => ({ ...previous, record: null, loading: true }));
      void refresh();
    };
    const timer = window.setInterval(check, 30000);
    window.addEventListener('focus', check);
    document.addEventListener('visibilitychange', check);
    window.addEventListener('storage', storage);
    window.addEventListener('japz:clock-in-required', invalidated);
    return () => {
      clearInterval(timer);
      window.removeEventListener('focus', check);
      document.removeEventListener('visibilitychange', check);
      window.removeEventListener('storage', storage);
      window.removeEventListener('japz:clock-in-required', invalidated);
    };
  }, [required, refresh]);

  const punch = async (action: 'in' | 'out') => {
    if (!user || punching.current) return;
    punching.current = true;
    setBusy(true);
    ++generation.current;
    try {
      const result = await (action === 'in' ? employeeAPI.clockIn() : employeeAPI.clockOut());
      if (!result.data?.success || !result.data.data?.id) throw new Error('Invalid attendance response');
      if (identity.current === user.id) setState({ userId: user.id, record: result.data.data, loading: false, error: '' });
      localStorage.setItem('japz.shiftChanged', `${Date.now()}:${action}`);
    } catch (error) {
      throw new Error(errorMessage(error));
    } finally {
      punching.current = false;
      setBusy(false);
    }
  };
  const record = state.userId === user?.id ? state.record : null;
  return <ShiftContext.Provider value={{ record, loading: required && (state.userId !== user?.id || state.loading), busy, error: state.userId === user?.id ? state.error : '', onDuty: Boolean(record?.clockIn && !record.clockOut), refresh, punch }}>{children}</ShiftContext.Provider>;
}
