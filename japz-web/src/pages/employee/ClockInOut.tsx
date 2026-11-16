import { useState, useEffect, useCallback } from 'react';
import { Clock, CheckCircle, AlertCircle, Sparkles, Activity, ShieldCheck, UserCheck } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { attendanceAPI, employeeAPI } from '../../services/api';

interface TodayRecord {
    id: number;
    clockIn: string | null;
    clockOut: string | null;
    totalHours: number;
    lateMinutes: number;
    undertimeMinutes: number;
}

export default function ClockInOut() {
    const { user } = useAuth();
    const [currentTime, setCurrentTime] = useState(new Date());
    const [loading, setLoading] = useState(false);
    const [fetchingStatus, setFetchingStatus] = useState(true);
    const [success, setSuccess] = useState('');
    const [error, setError] = useState('');
    const [todayRecord, setTodayRecord] = useState<TodayRecord | null>(null);

    // Live clock timer
    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    // Fetch today's attendance status
    const loadStatus = useCallback(async () => {
        try {
            setFetchingStatus(true);
            const res = await employeeAPI.getMyTodayAttendance();
            if (res.data?.success && res.data.data?.record) {
                setTodayRecord(res.data.data.record);
            } else {
                setTodayRecord(null);
            }
        } catch {
            // Keep silent if error fetching status
        } finally {
            setFetchingStatus(false);
        }
    }, []);

    useEffect(() => {
        loadStatus();
    }, [loadStatus]);

    const isClockedIn = Boolean(todayRecord?.clockIn && !todayRecord?.clockOut);
    const isCompleted = Boolean(todayRecord?.clockIn && todayRecord?.clockOut);

    // Calculate elapsed shift time if currently on duty
    const elapsedShiftTime = () => {
        if (!todayRecord?.clockIn || todayRecord.clockOut) return null;
        const start = new Date(todayRecord.clockIn).getTime();
        const diffMs = Math.max(0, currentTime.getTime() - start);
        const hours = Math.floor(diffMs / (1000 * 60 * 60));
        const mins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
        const secs = Math.floor((diffMs % (1000 * 60)) / 1000);
        return `${hours}h ${mins}m ${secs}s`;
    };

    const formatClockTime = (isoString?: string | null) => {
        if (!isoString) return '—';
        const d = new Date(isoString);
        return d.toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit', hour12: true });
    };

    const handleClockIn = async () => {
        if (!user || isClockedIn || isCompleted) return;
        setLoading(true);
        setError('');
        setSuccess('');
        try {
            await attendanceAPI.clockIn(user.id);
            setSuccess('Successfully clocked in! Have a great shift.');
            await loadStatus();
            setTimeout(() => setSuccess(''), 4000);
        } catch (err: unknown) {
            const apiErr = err as { response?: { data?: { message?: string } } };
            setError(apiErr.response?.data?.message || 'Failed to clock in');
        } finally {
            setLoading(false);
        }
    };

    const handleClockOut = async () => {
        if (!user || !isClockedIn) return;
        setLoading(true);
        setError('');
        setSuccess('');
        try {
            await attendanceAPI.clockOut(user.id);
            setSuccess('Successfully clocked out. Have a restful evening!');
            await loadStatus();
            setTimeout(() => setSuccess(''), 4000);
        } catch (err: unknown) {
            const apiErr = err as { response?: { data?: { message?: string } } };
            setError(apiErr.response?.data?.message || 'Failed to clock out');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="p-6 max-w-lg mx-auto w-full h-full flex flex-col justify-center">
            <div className="bg-white rounded-3xl border border-gray-100 shadow-xl overflow-hidden p-8 text-center relative">
                {/* Decorative background glow */}
                <div className="absolute -top-12 -right-12 w-40 h-40 bg-yellow-100/50 rounded-full blur-3xl pointer-events-none" />
                <div className="absolute -bottom-12 -left-12 w-40 h-40 bg-amber-100/50 rounded-full blur-3xl pointer-events-none" />

                {/* Status Badge */}
                <div className="flex justify-center mb-6">
                    {fetchingStatus ? (
                        <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold bg-gray-100 text-gray-500 animate-pulse">
                            Checking duty status...
                        </span>
                    ) : isClockedIn ? (
                        <span className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-bold bg-green-100 text-green-800 border border-green-200 shadow-sm animate-pulse">
                            <span className="w-2 h-2 rounded-full bg-green-500" />
                            ON DUTY — CLOCKED IN ({formatClockTime(todayRecord?.clockIn)})
                        </span>
                    ) : isCompleted ? (
                        <span className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-bold bg-blue-100 text-blue-800 border border-blue-200 shadow-sm">
                            <CheckCircle size={14} className="text-blue-600" />
                            SHIFT COMPLETED TODAY ({todayRecord?.totalHours} hrs)
                        </span>
                    ) : (
                        <span className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-200 shadow-sm">
                            <Activity size={14} className="text-amber-600" />
                            NOT CLOCKED IN
                        </span>
                    )}
                </div>

                {/* Clock Icon */}
                <div className="w-20 h-20 rounded-2xl bg-gradient-to-tr from-amber-400 to-yellow-300 mx-auto flex items-center justify-center mb-5 shadow-lg shadow-amber-200/60 transform transition-transform hover:scale-105">
                    <Clock size={42} className="text-gray-900" />
                </div>
                
                {/* Live Current Time */}
                <h1 className="text-5xl font-black text-gray-900 mb-2 font-mono tracking-tight">
                    {currentTime.toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                </h1>
                <p className="text-xs font-semibold text-gray-400 mb-6 uppercase tracking-widest">
                    {currentTime.toLocaleDateString('en-PH', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
                </p>

                {/* Live Shift Duration Card (when on duty) */}
                {isClockedIn && (
                    <div className="mb-6 p-4 bg-gradient-to-r from-emerald-50 to-green-50 border border-emerald-200/80 rounded-2xl flex items-center justify-between text-left">
                        <div>
                            <p className="text-xs font-semibold text-emerald-700 uppercase tracking-wider">Current Shift Elapsed</p>
                            <p className="text-2xl font-black text-emerald-900 font-mono mt-0.5">{elapsedShiftTime()}</p>
                        </div>
                        <div className="text-right">
                            <p className="text-xs text-emerald-600 font-medium">Clock-in Time</p>
                            <p className="text-sm font-bold text-emerald-800">{formatClockTime(todayRecord?.clockIn)}</p>
                        </div>
                    </div>
                )}

                {/* Shift Completed Summary Card */}
                {isCompleted && (
                    <div className="mb-6 p-4 bg-blue-50/80 border border-blue-200 rounded-2xl flex items-center justify-between text-left">
                        <div>
                            <p className="text-xs font-semibold text-blue-700 uppercase tracking-wider">Shift Summary</p>
                            <p className="text-lg font-bold text-blue-900 mt-0.5">{todayRecord?.totalHours} Regular Hours</p>
                        </div>
                        <div className="text-right text-xs text-blue-700">
                            <p>In: {formatClockTime(todayRecord?.clockIn)}</p>
                            <p>Out: {formatClockTime(todayRecord?.clockOut)}</p>
                        </div>
                    </div>
                )}

                {/* Notifications */}
                {error && (
                    <div className="mb-6 p-3.5 bg-red-50 border border-red-200 text-red-700 rounded-2xl text-sm flex items-center justify-center gap-2">
                        <AlertCircle size={18} className="shrink-0" />
                        <span>{error}</span>
                    </div>
                )}
                {success && (
                    <div className="mb-6 p-3.5 bg-green-50 border border-green-200 text-green-700 rounded-2xl text-sm flex items-center justify-center gap-2">
                        <CheckCircle size={18} className="shrink-0" />
                        <span>{success}</span>
                    </div>
                )}

                {/* Interactive Punch Buttons */}
                <div className="grid grid-cols-2 gap-4">
                    <button
                        onClick={handleClockIn}
                        disabled={loading || isClockedIn || isCompleted}
                        className={`py-4 font-extrabold rounded-2xl transition-all text-base shadow-sm flex items-center justify-center gap-2 ${
                            isClockedIn || isCompleted
                                ? 'bg-gray-100 text-gray-400 cursor-not-allowed border border-gray-200'
                                : 'bg-emerald-500 hover:bg-emerald-600 active:bg-emerald-700 text-white shadow-emerald-200 hover:shadow-md'
                        }`}
                    >
                        <UserCheck size={20} />
                        Clock In
                    </button>
                    <button
                        onClick={handleClockOut}
                        disabled={loading || !isClockedIn}
                        className={`py-4 font-extrabold rounded-2xl transition-all text-base shadow-sm flex items-center justify-center gap-2 ${
                            !isClockedIn
                                ? 'bg-gray-100 text-gray-400 cursor-not-allowed border border-gray-200'
                                : 'bg-rose-500 hover:bg-rose-600 active:bg-rose-700 text-white shadow-rose-200 hover:shadow-md'
                        }`}
                    >
                        <ShieldCheck size={20} />
                        Clock Out
                    </button>
                </div>
                
                {/* Employee Note */}
                <p className="text-xs text-gray-400 mt-6 leading-relaxed flex items-center justify-center gap-1.5">
                    <Sparkles size={14} className="text-amber-400 shrink-0" />
                    <span>Your timestamps are synchronized with the secure JAPZ POS attendance server.</span>
                </p>
            </div>
        </div>
    );
}
