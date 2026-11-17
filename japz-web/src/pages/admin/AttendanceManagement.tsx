import { useState, useEffect, useCallback, useMemo } from 'react';
import {
    Calendar as CalendarIcon, List, AlertCircle, CheckCircle,
    ChevronLeft, ChevronRight, Clock, Edit3, Search,
    X, Save, Users, UserCheck, ShieldAlert
} from 'lucide-react';
import { attendanceAPI, payrollAPI } from '../../services/api';
import Modal from '../../components/Modal';

interface AttendanceRecord {
    id: number;
    employeeId: number;
    employeeName: string;
    employeeRole: string;
    date: string; // 'YYYY-MM-DD'
    clockIn: string | null;
    clockOut: string | null;
    totalHours: number;
    lateMinutes: number;
    undertimeMinutes: number;
    notes?: string;
    clockOutSource?: string;
    autoClockedOutAt?: string | null;
    autoClockOutOriginalTime?: string | null;
    overtimeApprovedAt?: string | null;
    overtimeApprovedBy?: number | null;
    overtimeApprovalReason?: string | null;
    status: 'ON_TIME' | 'LATE' | 'UNDERTIME' | 'MISSING_CLOCK_OUT' | 'MISSING_CLOCK_IN';
}

interface ValidationIssue {
    type: string;
    employeeName: string;
    date: string;
    message: string;
    attendanceId: number;
    clockIn?: string;
    clockOut?: string;
}

const DAYS_OF_WEEK = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const formatTime = (iso?: string | null) => {
    if (!iso) return '—';
    const d = new Date(iso);
    if (isNaN(d.getTime())) return '—';
    return d.toLocaleTimeString('en-PH', { timeZone:'Asia/Manila', hour: '2-digit', minute: '2-digit', hour12: true });
};

const formatDateFull = (dateStr: string) => {
    const d = new Date(dateStr + 'T00:00:00');
    return d.toLocaleDateString('en-PH', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
};

const formatForInput = (iso?: string | null) => {
    if (!iso) return '';
    const d = new Date(iso);
    if (isNaN(d.getTime())) return '';
    const parts = Object.fromEntries(new Intl.DateTimeFormat('en-CA',{ timeZone:'Asia/Manila',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23' }).formatToParts(d).map(part => [part.type,part.value]));
    return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}`;
};

export default function AttendanceManagement() {
    // Current month view state
    const [currentDate, setCurrentDate] = useState(() => new Date());
    const [viewMode, setViewMode] = useState<'calendar' | 'table' | 'issues'>('calendar');

    // Data state
    const [records, setRecords] = useState<AttendanceRecord[]>([]);
    const [validation, setValidation] = useState<{ isReady: boolean; issues: ValidationIssue[]; totalRecords: number } | null>(null);
    const [loading, setLoading] = useState(false);
    const [selectedDate, setSelectedDate] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');

    // Correction modal state
    const [editingRecord, setEditingRecord] = useState<AttendanceRecord | null>(null);
    const [editForm, setEditForm] = useState({ clockIn: '', clockOut: '', notes: '' });
    const [saving, setSaving] = useState(false);
    const [overtimeApproved, setOvertimeApproved] = useState(false);
    const [overtimeReason, setOvertimeReason] = useState('');
    const [overtimeSaving, setOvertimeSaving] = useState(false);
    const [overtimeMessage, setOvertimeMessage] = useState('');
    const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

    // Derived year and month strings
    const currentYear = currentDate.getFullYear();
    const currentMonthIndex = currentDate.getMonth(); // 0-indexed
    const monthKey = `${currentYear}-${String(currentMonthIndex + 1).padStart(2, '0')}`;

    // Fetch attendance data for current month
    const fetchAttendanceData = useCallback(async () => {
        setLoading(true);
        try {
            // First day and last day of month
            const prefix = `${currentYear}-${String(currentMonthIndex + 1).padStart(2,'0')}`;
            const firstDay = `${prefix}-01`;
            const lastDay = `${prefix}-${new Date(currentYear,currentMonthIndex + 1,0).getDate()}`;

            const [recordsRes, validationRes] = await Promise.all([
                attendanceAPI.getRecords({ startDate: firstDay, endDate: lastDay }),
                payrollAPI.validateAttendance(undefined, { periodStart: firstDay, periodEnd: lastDay })
            ]);

            const recs: AttendanceRecord[] = recordsRes.data?.data || [];
            setRecords(recs);
            setValidation(validationRes.data?.data || null);

            // Auto-select latest day with records if none selected
            if (recs.length > 0 && !selectedDate) {
                setSelectedDate(recs[0].date);
            }
        } catch {
            setNotification({ type: 'error', message: 'Failed to load attendance records' });
        } finally {
            setLoading(false);
        }
    }, [currentYear, currentMonthIndex, selectedDate]);

    useEffect(() => {
        fetchAttendanceData();
    }, [fetchAttendanceData]);

    // Calendar generation
    const calendarDays = useMemo(() => {
        const firstDayOfMonth = new Date(currentYear, currentMonthIndex, 1);
        const startDayOfWeek = firstDayOfMonth.getDay(); // 0 is Sunday
        const daysInMonth = new Date(currentYear, currentMonthIndex + 1, 0).getDate();

        // Group records by 'YYYY-MM-DD'
        const recordsByDate: Record<string, AttendanceRecord[]> = {};
        for (const rec of records) {
            if (!recordsByDate[rec.date]) {
                recordsByDate[rec.date] = [];
            }
            recordsByDate[rec.date].push(rec);
        }

        const days = [];
        // Empty slots for days before 1st of month
        for (let i = 0; i < startDayOfWeek; i++) {
            days.push({ dayNumber: 0, dateStr: '', records: [] });
        }

        const todayStr = new Date().toISOString().split('T')[0];

        // Actual days of month
        for (let day = 1; day <= daysInMonth; day++) {
            const dateStr = `${currentYear}-${String(currentMonthIndex + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            days.push({
                dayNumber: day,
                dateStr,
                isToday: dateStr === todayStr,
                records: recordsByDate[dateStr] || []
            });
        }

        return days;
    }, [currentYear, currentMonthIndex, records]);

    // Selected day records
    const selectedDayRecords = useMemo(() => {
        if (!selectedDate) return [];
        return records.filter(r => r.date === selectedDate);
    }, [records, selectedDate]);

    // Navigation functions
    const prevMonth = () => {
        setCurrentDate(new Date(currentYear, currentMonthIndex - 1, 1));
        setSelectedDate(null);
    };

    const nextMonth = () => {
        setCurrentDate(new Date(currentYear, currentMonthIndex + 1, 1));
        setSelectedDate(null);
    };

    const goToToday = () => {
        const today = new Date();
        setCurrentDate(new Date(today.getFullYear(), today.getMonth(), 1));
        setSelectedDate(today.toISOString().split('T')[0]);
    };

    // Open correction modal
    const startEdit = (record: AttendanceRecord) => {
        setEditingRecord(record);
        setOvertimeApproved(Boolean(record.overtimeApprovedAt && record.overtimeApprovedBy));
        setOvertimeReason(record.overtimeApprovalReason || '');
        setOvertimeMessage('');
        setEditForm({
            clockIn: formatForInput(record.clockIn),
            clockOut: formatForInput(record.clockOut),
            notes: record.notes || ''
        });
    };

    const saveCorrection = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingRecord) return;

        setSaving(true);
        try {
            await attendanceAPI.correct(editingRecord.id, {
                clockIn: editForm.clockIn ? `${editForm.clockIn}+08:00` : undefined,
                clockOut: editForm.clockOut ? `${editForm.clockOut}+08:00` : undefined,
                notes: editForm.notes || undefined
            });

            setNotification({ type: 'success', message: `Shift punch corrected for ${editingRecord.employeeName}` });
            setEditingRecord(null);
            fetchAttendanceData();
        } catch (err: unknown) {
            const apiErr = err as { response?: { data?: { message?: string } } };
            setNotification({ type: 'error', message: apiErr.response?.data?.message || 'Failed to update attendance' });
        } finally {
            setSaving(false);
        }
    };

    const saveOvertime = async () => {
        if (!editingRecord || overtimeSaving) return;
        setOvertimeSaving(true); setOvertimeMessage('');
        try {
            const response = await attendanceAPI.approveOvertime(editingRecord.id,{ approved:overtimeApproved,reason:overtimeReason });
            setEditingRecord(previous => previous ? { ...previous,...response.data.data } : null);
            setOvertimeMessage(overtimeApproved ? 'Overtime approved. This shift will stay open until staff clock out.' : 'Overtime exception removed. The closing-time rule applies again.');
            await fetchAttendanceData();
        } catch (error) { setOvertimeMessage(error instanceof Error ? 'Could not save the overtime decision. Check that the shift is still open and enter a reason.' : 'Could not save overtime.'); }
        finally { setOvertimeSaving(false); }
    };

    // Monthly summary stats
    const totalMonthShifts = records.length;
    const totalMonthHours = records.reduce((s, r) => s + (r.totalHours || 0), 0);
    const onTimeShifts = records.filter(r => r.status === 'ON_TIME').length;
    const issueCount = validation?.issues?.length || records.filter(r => r.status !== 'ON_TIME').length;

    const filteredRecords = records.filter(r =>
        r.employeeName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.date.includes(searchQuery)
    );

    const issues = validation?.issues || [];

    return (
        <div className="p-6 max-w-6xl mx-auto space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Attendance & Shifts</h1>
                    <p className="text-sm text-gray-500 mt-0.5">
                        Interactive attendance calendar, punch auditing, and shift breakdown
                    </p>
                </div>

                {/* View switcher tabs */}
                <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-2xl border border-gray-200">
                    <button
                        onClick={() => setViewMode('calendar')}
                        className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all ${
                            viewMode === 'calendar' ? 'bg-white text-gray-900 shadow-xs' : 'text-gray-500 hover:text-gray-800'
                        }`}
                    >
                        <CalendarIcon size={14} />
                        Calendar View
                    </button>
                    <button
                        onClick={() => setViewMode('table')}
                        className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all ${
                            viewMode === 'table' ? 'bg-white text-gray-900 shadow-xs' : 'text-gray-500 hover:text-gray-800'
                        }`}
                    >
                        <List size={14} />
                        All Shifts ({records.length})
                    </button>
                    <button
                        onClick={() => setViewMode('issues')}
                        className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all ${
                            viewMode === 'issues' ? 'bg-white text-gray-900 shadow-xs' : 'text-gray-500 hover:text-gray-800'
                        }`}
                    >
                        <ShieldAlert size={14} className={issues.length > 0 ? 'text-amber-500' : ''} />
                        Validation Issues
                        {issues.length > 0 && (
                            <span className="px-1.5 py-0.2 bg-amber-100 text-amber-800 rounded-full text-[10px] font-bold">
                                {issues.length}
                            </span>
                        )}
                    </button>
                </div>
            </div>

            {/* Notification alert */}
            {notification && (
                <div className={`p-4 rounded-2xl flex items-center justify-between gap-3 text-sm transition-all ${
                    notification.type === 'success'
                        ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                        : 'bg-red-50 text-red-800 border border-red-200'
                }`}>
                    <div className="flex items-center gap-2">
                        {notification.type === 'success' ? <CheckCircle size={18} /> : <AlertCircle size={18} />}
                        <span>{notification.message}</span>
                    </div>
                    <button onClick={() => setNotification(null)} className="text-gray-400 hover:text-gray-600">
                        <X size={16} />
                    </button>
                </div>
            )}

            {/* Monthly KPI Overview */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 rounded-xl bg-yellow-50 text-yellow-700">
                            <Clock size={20} />
                        </div>
                        <div>
                            <p className="text-xs text-gray-500 font-medium">Shifts in Month</p>
                            <p className="text-xl font-bold text-gray-900">{totalMonthShifts}</p>
                        </div>
                    </div>
                </div>

                <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 rounded-xl bg-blue-50 text-blue-700">
                            <Users size={20} />
                        </div>
                        <div>
                            <p className="text-xs text-gray-500 font-medium">Total Hours Worked</p>
                            <p className="text-xl font-bold text-gray-900">{totalMonthHours.toFixed(1)} hrs</p>
                        </div>
                    </div>
                </div>

                <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 rounded-xl bg-emerald-50 text-emerald-700">
                            <UserCheck size={20} />
                        </div>
                        <div>
                            <p className="text-xs text-gray-500 font-medium">On-Time Shifts</p>
                            <p className="text-xl font-bold text-gray-900">{onTimeShifts}</p>
                        </div>
                    </div>
                </div>

                <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
                    <div className="flex items-center gap-3">
                        <div className={`p-2.5 rounded-xl ${issues.length > 0 ? 'bg-amber-50 text-amber-700' : 'bg-emerald-50 text-emerald-700'}`}>
                            <AlertCircle size={20} />
                        </div>
                        <div>
                            <p className="text-xs text-gray-500 font-medium">Flagged Issues</p>
                            <p className="text-xl font-bold text-gray-900">{issueCount}</p>
                        </div>
                    </div>
                </div>
            </div>

            {loading ? (
                <div className="py-20 flex justify-center"><div className="spinner" /></div>
            ) : (
                <>
                    {/* CALENDAR VIEW */}
                    {viewMode === 'calendar' && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Calendar Grid (2 cols on large screen) */}
                    <div className="lg:col-span-2 bg-white rounded-3xl border border-gray-100 shadow-sm p-6 space-y-4">
                        {/* Month navigation header */}
                        <div className="flex items-center justify-between pb-3 border-b border-gray-100">
                            <div className="flex items-center gap-2">
                                <h2 className="text-lg font-bold text-gray-900">
                                    {currentDate.toLocaleDateString('en-PH', { month: 'long', year: 'numeric' })}
                                </h2>
                                <button
                                    onClick={goToToday}
                                    className="px-2.5 py-1 text-xs font-semibold bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors"
                                >
                                    Today
                                </button>
                            </div>
                            <div className="flex items-center gap-1">
                                <button
                                    onClick={prevMonth}
                                    className="p-2 rounded-xl text-gray-500 hover:text-gray-900 hover:bg-gray-100 transition-colors"
                                    title="Previous Month"
                                >
                                    <ChevronLeft size={18} />
                                </button>
                                <button
                                    onClick={nextMonth}
                                    className="p-2 rounded-xl text-gray-500 hover:text-gray-900 hover:bg-gray-100 transition-colors"
                                    title="Next Month"
                                >
                                    <ChevronRight size={18} />
                                </button>
                            </div>
                        </div>

                        {/* Day names row */}
                        <div className="grid grid-cols-7 gap-2 text-center text-xs font-bold text-gray-400 uppercase tracking-wider py-1">
                            {DAYS_OF_WEEK.map(d => (
                                <div key={d}>{d}</div>
                            ))}
                        </div>

                        {/* Month days grid */}
                        <div className="grid grid-cols-7 gap-2">
                            {calendarDays.map((cell, idx) => {
                                if (cell.dayNumber === 0) {
                                    return <div key={`empty-${idx}`} className="h-24 rounded-2xl bg-gray-50/40" />;
                                }

                                const isSelected = cell.dateStr === selectedDate;
                                const hasRecords = cell.records.length > 0;
                                const hasIssues = cell.records.some(r => r.status !== 'ON_TIME');

                                return (
                                    <div
                                        key={cell.dateStr}
                                        onClick={() => setSelectedDate(cell.dateStr)}
                                        className={`h-24 p-2 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between ${
                                            isSelected
                                                ? 'border-yellow-400 bg-yellow-50/40 shadow-xs ring-2 ring-yellow-400/30'
                                                : hasRecords
                                                ? 'border-gray-200 bg-white hover:border-yellow-300 hover:shadow-xs'
                                                : 'border-gray-100 bg-gray-50/20 hover:bg-white text-gray-400'
                                        }`}
                                    >
                                        {/* Date number & Today dot */}
                                        <div className="flex items-center justify-between">
                                            <span className={`text-xs font-bold ${
                                                cell.isToday
                                                    ? 'w-6 h-6 rounded-full bg-yellow-400 text-yellow-950 flex items-center justify-center font-extrabold'
                                                    : isSelected
                                                    ? 'text-yellow-950'
                                                    : 'text-gray-700'
                                            }`}>
                                                {cell.dayNumber}
                                            </span>

                                            {hasIssues && (
                                                <span className="w-2 h-2 rounded-full bg-amber-500" title="Shift punch warning" />
                                            )}
                                        </div>

                                        {/* Attendance Badges / Avatars */}
                                        {hasRecords ? (
                                            <div className="space-y-1">
                                                <div className="flex items-center justify-between">
                                                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md flex items-center gap-1 ${
                                                        hasIssues ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'
                                                    }`}>
                                                        {cell.records.length} present
                                                    </span>
                                                </div>

                                                {/* Mini avatars */}
                                                <div className="flex items-center -space-x-1 overflow-hidden">
                                                    {cell.records.slice(0, 3).map((r, i) => (
                                                        <div
                                                            key={i}
                                                            title={`${r.employeeName} (${r.employeeRole}): ${formatTime(r.clockIn)} - ${formatTime(r.clockOut)}`}
                                                            className={`w-5 h-5 rounded-full border border-white text-[9px] font-bold flex items-center justify-center ${
                                                                r.employeeRole === 'cashier' ? 'bg-amber-300 text-amber-900' : 'bg-orange-300 text-orange-900'
                                                            }`}
                                                        >
                                                            {r.employeeName.charAt(0).toUpperCase()}
                                                        </div>
                                                    ))}
                                                    {cell.records.length > 3 && (
                                                        <div className="w-5 h-5 rounded-full bg-gray-200 border border-white text-[9px] font-bold text-gray-600 flex items-center justify-center">
                                                            +{cell.records.length - 3}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        ) : (
                                            <span className="text-[10px] text-gray-300 italic">No shifts</span>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Day Attendance Inspector Drawer (1 col) */}
                    <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6 space-y-4">
                        <div className="pb-3 border-b border-gray-100">
                            <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider">
                                Daily Attendance Roster
                            </h3>
                            <p className="text-base font-bold text-gray-900 mt-1">
                                {selectedDate ? formatDateFull(selectedDate) : 'Select a date from calendar'}
                            </p>
                        </div>

                        {selectedDayRecords.length === 0 ? (
                            <div className="py-16 text-center text-gray-400">
                                <Users size={36} className="mx-auto mb-2 opacity-30" />
                                <p className="text-sm font-semibold text-gray-600">No attendance logged</p>
                                <p className="text-xs text-gray-400 mt-1">No employees clocked in on this calendar date.</p>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {selectedDayRecords.map(rec => (
                                    <div
                                        key={rec.id}
                                        className="p-3.5 rounded-2xl border border-gray-150 hover:border-yellow-300 bg-gray-50/50 transition-all space-y-2.5"
                                    >
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2.5">
                                                <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold text-xs ${
                                                    rec.employeeRole === 'cashier' ? 'bg-amber-100 text-amber-800' : 'bg-orange-100 text-orange-800'
                                                }`}>
                                                    {rec.employeeName.charAt(0).toUpperCase()}
                                                </div>
                                                <div>
                                                    <p className="text-xs font-bold text-gray-900">{rec.employeeName}</p>
                                                    <span className="text-[10px] text-gray-400 capitalize">{rec.employeeRole}</span>
                                                </div>
                                            </div>

                                            <button
                                                onClick={() => startEdit(rec)}
                                                className="p-1.5 rounded-xl text-gray-400 hover:text-yellow-700 hover:bg-yellow-100 transition-colors"
                                                title="Correct Shift"
                                            >
                                                <Edit3 size={14} />
                                            </button>
                                        </div>

                                        {/* Shift Time Badge */}
                                        <div className="bg-white p-2.5 rounded-xl border border-gray-100 flex items-center justify-between text-xs">
                                            <div className="flex items-center gap-1.5 text-gray-700 font-medium">
                                                <Clock size={13} className="text-gray-400" />
                                                <span>{formatTime(rec.clockIn)} – {formatTime(rec.clockOut)}{rec.autoClockedOutAt && <small className="block text-amber-700">Auto clocked out{rec.clockOutSource === 'corrected' ? ' · corrected' : ''}</small>}{rec.overtimeApprovedAt && rec.overtimeApprovedBy && <small className="block text-amber-700">Overtime approved</small>}</span>
                                            </div>
                                            <span className="font-bold text-yellow-800 bg-yellow-50 px-2 py-0.5 rounded-md text-[11px]">
                                                {rec.totalHours.toFixed(2)} hrs
                                            </span>
                                        </div>

                                        {/* Shift Status Tag */}
                                        <div className="flex items-center justify-between text-[11px]">
                                            <span className={`px-2 py-0.5 rounded-md font-semibold ${
                                                rec.status === 'ON_TIME'
                                                    ? 'bg-emerald-50 text-emerald-700'
                                                    : rec.status === 'LATE'
                                                    ? 'bg-amber-50 text-amber-700'
                                                    : rec.status === 'UNDERTIME'
                                                    ? 'bg-blue-50 text-blue-700'
                                                    : 'bg-red-50 text-red-700'
                                            }`}>
                                                {rec.status === 'ON_TIME' && '✓ On Time'}
                                                {rec.status === 'LATE' && `⚠️ Late (${rec.lateMinutes} min)`}
                                                {rec.status === 'UNDERTIME' && `Undertime (${rec.undertimeMinutes} min)`}
                                                {rec.status === 'MISSING_CLOCK_OUT' && 'Missing Clock-Out'}
                                                {rec.status === 'MISSING_CLOCK_IN' && 'Missing Clock-In'}
                                            </span>

                                            {rec.notes && (
                                                <span className="text-gray-400 italic truncate max-w-[140px]" title={rec.notes}>
                                                    "{rec.notes}"
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* TABLE VIEW */}
            {viewMode === 'table' && (
                <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
                    {/* Search bar */}
                    <div className="p-4 border-b border-gray-100 flex items-center justify-between gap-4">
                        <div className="relative w-full max-w-sm">
                            <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Filter by staff name or YYYY-MM-DD..."
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                                className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-yellow-400"
                            />
                        </div>
                        <span className="text-xs text-gray-400 font-medium">{filteredRecords.length} shifts recorded</span>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs">
                            <thead className="bg-gray-50 border-b border-gray-100 text-gray-500 font-bold uppercase tracking-wider text-[10px]">
                                <tr>
                                    <th className="py-3 px-4">Staff Member</th>
                                    <th className="py-3 px-4">Date</th>
                                    <th className="py-3 px-4">Clock In</th>
                                    <th className="py-3 px-4">Clock Out</th>
                                    <th className="py-3 px-4">Total Hours</th>
                                    <th className="py-3 px-4">Status</th>
                                    <th className="py-3 px-4 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 text-gray-700">
                                {filteredRecords.map(rec => (
                                    <tr key={rec.id} className="hover:bg-gray-50/70 transition-colors">
                                        <td className="py-3 px-4 font-semibold text-gray-900">
                                            <div className="flex items-center gap-2">
                                                <div className="w-7 h-7 rounded-lg bg-yellow-100 text-yellow-800 font-bold flex items-center justify-center text-xs">
                                                    {rec.employeeName.charAt(0)}
                                                </div>
                                                <div>
                                                    <span>{rec.employeeName}</span>
                                                    <span className="block text-[10px] text-gray-400 font-normal capitalize">{rec.employeeRole}</span>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="py-3 px-4 font-medium">{rec.date}</td>
                                        <td className="py-3 px-4">{formatTime(rec.clockIn)}</td>
                                        <td className="py-3 px-4">{formatTime(rec.clockOut)}{rec.autoClockedOutAt && <small className="block text-amber-700">Auto clocked out{rec.clockOutSource === 'corrected' ? ' · corrected' : ''}</small>}{rec.overtimeApprovedAt && rec.overtimeApprovedBy && <small className="block text-amber-700">Overtime approved</small>}</td>
                                        <td className="py-3 px-4 font-bold text-gray-900">{rec.totalHours.toFixed(2)} hrs</td>
                                        <td className="py-3 px-4">
                                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                                rec.status === 'ON_TIME'
                                                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                                    : rec.status === 'LATE'
                                                    ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                                    : 'bg-red-50 text-red-700 border border-red-200'
                                            }`}>
                                                {rec.status.replace(/_/g, ' ')}
                                            </span>
                                        </td>
                                        <td className="py-3 px-4 text-right">
                                            <button
                                                onClick={() => startEdit(rec)}
                                                className="px-2.5 py-1 text-xs font-semibold text-yellow-800 bg-yellow-100 hover:bg-yellow-200 rounded-lg transition-colors"
                                            >
                                                Correct
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* VALIDATION & ISSUES VIEW */}
            {viewMode === 'issues' && (
                <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6 space-y-4">
                    <div className="flex items-center gap-3 pb-3 border-b border-gray-100">
                        {validation?.isReady ? (
                            <CheckCircle size={22} className="text-emerald-500" />
                        ) : (
                            <AlertCircle size={22} className="text-amber-500" />
                        )}
                        <div>
                            <h3 className="font-bold text-gray-900">
                                {validation?.isReady
                                    ? `All ${records.length} attendance records are clean — ready for payroll!`
                                    : `${issues.length} issue(s) need attention`}
                            </h3>
                            <p className="text-xs text-gray-500">
                                {records.length} records verified for period {monthKey}
                            </p>
                        </div>
                    </div>

                    {issues.length === 0 ? (
                        <div className="py-12 text-center text-gray-400">
                            <CheckCircle size={40} className="mx-auto mb-2 text-emerald-400 opacity-60" />
                            <p className="font-semibold text-gray-700">Clean Attendance Slate</p>
                            <p className="text-xs text-gray-400 mt-1">All clock-ins have valid timestamps and are ready for calculation.</p>
                        </div>
                    ) : (
                        <div className="divide-y divide-gray-100">
                            {issues.map(issue => (
                                <div key={issue.attendanceId} className="py-3.5 flex items-center justify-between gap-4">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 rounded-xl bg-amber-50 text-amber-700">
                                            <AlertCircle size={16} />
                                        </div>
                                        <div>
                                            <p className="text-sm font-bold text-gray-900">{issue.employeeName}</p>
                                            <p className="text-xs text-gray-500">{issue.message} ({issue.date})</p>
                                        </div>
                                    </div>

                                    <button
                                        onClick={() => {
                                            const match = records.find(r => r.id === issue.attendanceId);
                                            if (match) startEdit(match);
                                        }}
                                        className="px-3 py-1.5 bg-yellow-400 hover:bg-yellow-500 text-yellow-950 font-bold rounded-xl text-xs transition-colors"
                                    >
                                        Fix Punch
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}
                </>
            )}

            {/* Shift Correction Modal */}
            {editingRecord && (
                <Modal label="Correct Shift Attendance" onClose={() => setEditingRecord(null)}>
                    <div className="space-y-4">
                        <div className="flex items-center justify-between pb-3 border-b border-gray-100">
                            <div>
                                <h3 className="font-bold text-gray-900">Correct Shift Attendance</h3>
                                <p className="text-xs text-gray-500 mt-0.5">
                                    {editingRecord.employeeName} on {editingRecord.date}
                                </p>
                            </div>
                            <button aria-label="Close attendance editor" onClick={() => setEditingRecord(null)} className="min-w-11 min-h-11 grid place-items-center text-gray-400 hover:text-gray-600">
                                <X size={20} />
                            </button>
                        </div>

                        <p className="text-xs text-gray-500">All times are Philippine time (Asia/Manila).</p>{editingRecord.autoClockedOutAt && <p className="text-sm text-amber-700">Auto clocked out at {formatTime(editingRecord.autoClockOutOriginalTime)}. Corrections retain the original automatic punch in the audit history.</p>}
                        <form onSubmit={saveCorrection} className="space-y-4">
                            <div>
                                <label className="block text-xs font-semibold text-gray-700 mb-1">
                                    Clock In (Date & Time, PH)
                                </label>
                                <input
                                    aria-label="Clock In (Philippine time)" type="datetime-local"
                                    required
                                    value={editForm.clockIn}
                                    onChange={e => setEditForm(f => ({ ...f, clockIn: e.target.value }))}
                                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-yellow-400"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-gray-700 mb-1">
                                    Clock Out (Date & Time, PH)
                                </label>
                                <input
                                    aria-label="Clock Out (Philippine time)" type="datetime-local"
                                    required
                                    value={editForm.clockOut}
                                    onChange={e => setEditForm(f => ({ ...f, clockOut: e.target.value }))}
                                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-yellow-400"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-gray-700 mb-1">
                                    Correction Reason / Note
                                </label>
                                <input
                                    type="text"
                                    placeholder="e.g. Employee forgot to punch out after overtime..."
                                    value={editForm.notes}
                                    onChange={e => setEditForm(f => ({ ...f, notes: e.target.value }))}
                                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-yellow-400"
                                />
                            </div>

                            <div className="pt-3 border-t border-gray-100 flex items-center justify-end gap-2">
                                <button
                                    type="button"
                                    onClick={() => setEditingRecord(null)}
                                    className="px-4 py-2 border border-gray-200 rounded-xl text-xs font-semibold text-gray-600 hover:bg-gray-50"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={saving}
                                    className="flex items-center gap-1.5 px-5 py-2 bg-yellow-400 hover:bg-yellow-500 text-yellow-950 font-bold rounded-xl text-xs shadow-sm disabled:opacity-50"
                                >
                                    <Save size={13} />
                                    {saving ? 'Saving...' : 'Update Record'}
                                </button>
                            </div>
                        </form>
                        {!editingRecord.clockOut && <section className="border-t border-gray-200 pt-4 space-y-3">
                            <h4 className="font-bold text-sm">Overtime for this shift</h4>
                            <label className="flex items-start gap-3 text-sm"><input type="checkbox" checked={overtimeApproved} onChange={event => setOvertimeApproved(event.target.checked)} />Keep this shift open after closing time</label>
                            <label className="block text-xs font-semibold">Approval reason<input aria-label="Overtime approval reason" maxLength={255} value={overtimeReason} onChange={event => setOvertimeReason(event.target.value)} className="mt-1 w-full border border-gray-200 rounded-lg p-3" /></label>
                            <button type="button" disabled={overtimeSaving || !overtimeReason.trim()} onClick={() => void saveOvertime()} className="w-full min-h-12 p-3 bg-brand text-brand-dark font-semibold rounded-lg">{overtimeSaving ? 'Saving overtime…' : 'Save overtime decision'}</button>
                            <p className="text-xs text-gray-500">Only an owner or manager with an admin account can approve this exception. Staff must clock out manually afterward.</p>
                            {overtimeMessage && <p role="status" className="text-sm">{overtimeMessage}</p>}
                        </section>}
                    </div>
                </Modal>
            )}
        </div>
    );
}
