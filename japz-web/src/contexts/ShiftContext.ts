import { createContext, useContext } from 'react';

export interface AttendanceRecord {
  id: number;
  date: string;
  clockIn: string | null;
  clockOut: string | null;
  totalHours: number | string;
  autoClockedOutAt?: string | null;
  clockOutSource?: string;
}
interface ShiftContextValue {
  record: AttendanceRecord | null;
  loading: boolean;
  busy: boolean;
  error: string;
  onDuty: boolean;
  refresh: () => Promise<void>;
  punch: (action: 'in' | 'out') => Promise<void>;
}
export const ShiftContext = createContext<ShiftContextValue | null>(null);
export function useShift() {
  const context = useContext(ShiftContext);
  if (!context) throw new Error('useShift must be used within ShiftProvider');
  return context;
}
