import { useCallback, useEffect, useState } from 'react';
import { Clock, LogIn, LogOut, History } from 'lucide-react';
import { attendanceAPI } from '../services/api';

interface OpenShift { id: number; clockInAt: string; workDate: string }
interface ShiftRow {
    id: number;
    workDate: string;
    clockInAt: string;
    clockOutAt: string | null;
    minutesWorked: number | null;
    closedByAdmin: boolean;
}

const clock = (iso: string | null) =>
    iso ? new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—';
const day = (d: string) => new Date(d + 'T00:00:00').toLocaleDateString([], { month: 'short', day: 'numeric' });
const hm = (mins: number) => `${Math.floor(mins / 60)}h ${String(mins % 60).padStart(2, '0')}m`;

/**
 * Clock in / clock out. Shown on every staff profile, so attendance is recorded
 * by the person working rather than typed in later by an admin.
 */
export default function TimeClock() {
    const [open, setOpen] = useState<OpenShift | null>(null);
    const [recent, setRecent] = useState<ShiftRow[]>([]);
    const [recentHours, setRecentHours] = useState(0);
    const [loading, setLoading] = useState(true);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [showLog, setShowLog] = useState(false);
    const [now, setNow] = useState(Date.now());

    const load = useCallback(async () => {
        try {
            const res = await attendanceAPI.me();
            setOpen(res.data.open);
            setRecent(res.data.recent || []);
            setRecentHours(res.data.recentHours || 0);
            setError(null);
        } catch (err: any) {
            setError(err?.response?.data?.error || 'Could not load your time records.');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { load(); }, [load]);

    // Ticks only while a shift is open, so an idle screen does no work.
    useEffect(() => {
        if (!open) return;
        const id = setInterval(() => setNow(Date.now()), 1000);
        return () => clearInterval(id);
    }, [open]);

    const act = async (fn: () => Promise<unknown>) => {
        setBusy(true);
        setError(null);
        try {
            await fn();
            await load();
        } catch (err: any) {
            setError(err?.response?.data?.error || 'That did not work. Try again.');
        } finally {
            setBusy(false);
        }
    };

    if (loading) {
        return <div className="bg-white rounded-2xl border border-gray-100 p-5 animate-pulse h-32" />;
    }

    const elapsed = open ? Math.max(0, Math.floor((now - new Date(open.clockInAt).getTime()) / 60000)) : 0;

    return (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <div className="flex items-center gap-2 mb-4">
                <Clock size={17} className="text-slate-500" />
                <p className="font-extrabold text-slate-900">Time clock</p>
                {open && (
                    <span className="ml-auto text-[10px] font-extrabold bg-emerald-100 text-emerald-700 rounded-full px-2.5 py-1">
                        ON SHIFT
                    </span>
                )}
            </div>

            {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-3 py-2 text-sm mb-3">{error}</div>
            )}

            {open ? (
                <>
                    <div className="text-center py-3">
                        <p className="text-3xl font-extrabold text-slate-900 tabular-nums">{hm(elapsed)}</p>
                        <p className="text-xs text-slate-500 mt-1">Clocked in at {clock(open.clockInAt)}</p>
                    </div>
                    <button
                        onClick={() => act(() => attendanceAPI.clockOut())}
                        disabled={busy}
                        className="w-full flex items-center justify-center gap-2 rounded-2xl py-3.5 font-extrabold bg-slate-900 text-white disabled:opacity-50"
                    >
                        <LogOut size={17} /> {busy ? 'Saving…' : 'Clock out'}
                    </button>
                </>
            ) : (
                <>
                    <p className="text-sm text-slate-500 text-center py-3">You are not clocked in.</p>
                    <button
                        onClick={() => act(() => attendanceAPI.clockIn())}
                        disabled={busy}
                        className="w-full flex items-center justify-center gap-2 rounded-2xl py-3.5 font-extrabold bg-brand text-slate-900 disabled:opacity-50"
                    >
                        <LogIn size={17} /> {busy ? 'Saving…' : 'Clock in'}
                    </button>
                </>
            )}

            <div className="mt-4 pt-4 border-t border-gray-100">
                <button
                    onClick={() => setShowLog(v => !v)}
                    className="w-full flex items-center justify-between text-sm"
                >
                    <span className="flex items-center gap-2 text-slate-600">
                        <History size={15} /> Recent shifts
                    </span>
                    <span className="font-bold text-slate-900">{recentHours}h logged</span>
                </button>

                {showLog && (
                    <ul className="mt-3 space-y-1.5 max-h-56 overflow-y-auto">
                        {recent.length === 0 && <li className="text-sm text-slate-400">No shifts recorded yet.</li>}
                        {recent.map(r => (
                            <li key={r.id} className="flex items-center justify-between text-xs py-1.5 border-b border-gray-50 last:border-0">
                                <span className="font-semibold text-slate-700">{day(r.workDate)}</span>
                                <span className="text-slate-500">
                                    {clock(r.clockInAt)} – {clock(r.clockOutAt)}
                                    {r.closedByAdmin && <span className="text-amber-600"> (closed by admin)</span>}
                                </span>
                                <span className="font-bold text-slate-900 tabular-nums">
                                    {r.minutesWorked != null ? hm(r.minutesWorked) : 'open'}
                                </span>
                            </li>
                        ))}
                    </ul>
                )}
            </div>
        </div>
    );
}
