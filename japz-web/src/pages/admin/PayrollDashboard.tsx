import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Calendar, ChevronRight, CheckCircle, Clock, AlertCircle,
    XCircle, DollarSign, Users, TrendingUp, Lock, RefreshCw, BarChart3,
    Sparkles, Zap
} from 'lucide-react';
import { payrollAPI } from '../../services/api';

interface PayrollPeriod {
    id: number;
    periodStart: string;
    periodEnd: string;
    payDate?: string;
    status: 'DRAFT' | 'CALCULATED' | 'UNDER_REVIEW' | 'APPROVED' | 'PAID' | 'LOCKED' | 'CANCELLED';
    description: string;
    entries?: { netPay: string }[];
    createdAt: string;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ElementType }> = {
    DRAFT:        { label: 'Draft',        color: 'bg-gray-100 text-gray-600',    icon: Clock },
    CALCULATED:   { label: 'Calculated',   color: 'bg-blue-100 text-blue-700',    icon: RefreshCw },
    UNDER_REVIEW: { label: 'Under Review', color: 'bg-amber-100 text-amber-700',  icon: AlertCircle },
    APPROVED:     { label: 'Approved',     color: 'bg-green-100 text-green-700',  icon: CheckCircle },
    PAID:         { label: 'Paid',         color: 'bg-emerald-100 text-emerald-700', icon: DollarSign },
    LOCKED:       { label: 'Locked',       color: 'bg-purple-100 text-purple-700',icon: Lock },
    CANCELLED:    { label: 'Cancelled',    color: 'bg-red-100 text-red-600',      icon: XCircle },
};

const formatPeso = (v: number) => `₱${v.toLocaleString('en-PH', { minimumFractionDigits: 2 })}`;
const formatDate = (d: string) => new Date(d).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' });

export default function PayrollDashboard() {
    const navigate = useNavigate();
    const [periods, setPeriods] = useState<PayrollPeriod[]>([]);
    const [loading, setLoading] = useState(true);
    const [showCreate, setShowCreate] = useState(false);
    const [creating, setCreating] = useState(false);
    const [error, setError] = useState('');
    const [form, setForm] = useState({ periodStart: '', periodEnd: '', description: '' });
    const [autoCalculateAfterCreate, setAutoCalculateAfterCreate] = useState(true);
    const [selectedPresetId, setSelectedPresetId] = useState<string>('');

    const [employeeCount, setEmployeeCount] = useState<number>(0);

    const presets = useMemo(() => {
        const now = new Date();
        const year = now.getFullYear();
        const month = now.getMonth();
        const day = now.getDate();
        const monthName = now.toLocaleString('en-PH', { month: 'long' });
        const shortMonth = now.toLocaleString('en-PH', { month: 'short' });

        const pad = (n: number) => String(n).padStart(2, '0');
        const toYMD = (y: number, m: number, d: number) => `${y}-${pad(m + 1)}-${pad(d)}`;

        const lastDayOfMonth = new Date(year, month + 1, 0).getDate();

        // 1. Current Auto Cutoff
        const isFirstHalf = day <= 15;
        const autoStart = isFirstHalf ? toYMD(year, month, 1) : toYMD(year, month, 16);
        const autoEnd = isFirstHalf ? toYMD(year, month, 15) : toYMD(year, month, lastDayOfMonth);
        const autoDesc = isFirstHalf
            ? `${shortMonth} 1–15, ${year} (1st Half)`
            : `${shortMonth} 16–${lastDayOfMonth}, ${year} (2nd Half)`;

        // 2. 1st Half
        const semi1Start = toYMD(year, month, 1);
        const semi1End = toYMD(year, month, 15);
        const semi1Desc = `${shortMonth} 1–15, ${year} (1st Half)`;

        // 3. 2nd Half
        const semi2Start = toYMD(year, month, 16);
        const semi2End = toYMD(year, month, lastDayOfMonth);
        const semi2Desc = `${shortMonth} 16–${lastDayOfMonth}, ${year} (2nd Half)`;

        // 4. Last 7 Days
        const d7 = new Date(now);
        d7.setDate(now.getDate() - 6);
        const weekStart = toYMD(d7.getFullYear(), d7.getMonth(), d7.getDate());
        const weekEnd = toYMD(year, month, day);
        const weekDesc = `Weekly (${shortMonth} ${d7.getDate()}–${day}, ${year})`;

        // 5. Full Month
        const monthStart = toYMD(year, month, 1);
        const monthEnd = toYMD(year, month, lastDayOfMonth);
        const monthDesc = `${monthName} ${year} Monthly Payroll`;

        // 6. Previous Month
        const prevMonthDate = new Date(year, month, 0);
        const prevYear = prevMonthDate.getFullYear();
        const prevMonth = prevMonthDate.getMonth();
        const prevLastDay = prevMonthDate.getDate();
        const prevMonthName = prevMonthDate.toLocaleString('en-PH', { month: 'short' });
        const prevMonthStart = toYMD(prevYear, prevMonth, 1);
        const prevMonthEnd = toYMD(prevYear, prevMonth, prevLastDay);
        const prevMonthDesc = `${prevMonthName} 1–${prevLastDay}, ${prevYear} (Previous Month)`;

        return [
            {
                id: 'auto_cutoff',
                label: '⚡ Auto-Detect Current Cutoff',
                badge: isFirstHalf ? '1st–15th' : '16th–End',
                popular: true,
                data: { periodStart: autoStart, periodEnd: autoEnd, description: autoDesc }
            },
            {
                id: 'semi_1',
                label: 'Semi-Monthly (1st – 15th)',
                badge: '15 Days',
                popular: false,
                data: { periodStart: semi1Start, periodEnd: semi1End, description: semi1Desc }
            },
            {
                id: 'semi_2',
                label: 'Semi-Monthly (16th – End)',
                badge: `${lastDayOfMonth - 15} Days`,
                popular: false,
                data: { periodStart: semi2Start, periodEnd: semi2End, description: semi2Desc }
            },
            {
                id: 'weekly',
                label: 'Weekly (Last 7 Days)',
                badge: '7 Days',
                popular: false,
                data: { periodStart: weekStart, periodEnd: weekEnd, description: weekDesc }
            },
            {
                id: 'monthly',
                label: 'Monthly (Full Calendar)',
                badge: `${lastDayOfMonth} Days`,
                popular: false,
                data: { periodStart: monthStart, periodEnd: monthEnd, description: monthDesc }
            },
            {
                id: 'prev_month',
                label: 'Previous Month Cycle',
                badge: 'Past Month',
                popular: false,
                data: { periodStart: prevMonthStart, periodEnd: prevMonthEnd, description: prevMonthDesc }
            }
        ];
    }, []);

    const fetchPeriods = useCallback(async () => {
        try {
            const [periodsRes, employeesRes] = await Promise.allSettled([
                payrollAPI.getPeriods(),
                payrollAPI.getEmployees()
            ]);

            if (periodsRes.status === 'fulfilled') {
                setPeriods(periodsRes.value.data?.data || []);
            } else {
                setError('Failed to load payroll periods');
            }

            if (employeesRes.status === 'fulfilled') {
                const emps = employeesRes.value.data?.data || [];
                const activeEmps = emps.filter((e: { status?: string }) => e.status === 'active');
                setEmployeeCount(activeEmps.length || emps.length);
            }
        } catch { setError('Failed to load payroll data'); }
        finally { setLoading(false); }
    }, []);

    useEffect(() => { fetchPeriods(); }, [fetchPeriods]);

    const handleApplyPreset = (presetId: string) => {
        const found = presets.find(p => p.id === presetId);
        if (!found) return;
        setSelectedPresetId(presetId);
        setForm(found.data);
    };

    const handleOpenCreateWithAuto = () => {
        const auto = presets[0];
        setSelectedPresetId(auto.id);
        setForm(auto.data);
        setError('');
        setShowCreate(true);
    };

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        setCreating(true);
        setError('');
        try {
            const res = await payrollAPI.createPeriod(form);
            const newPeriodId = res.data?.data?.id;
            
            // Immediately calculate entries if option is selected
            if (autoCalculateAfterCreate && newPeriodId) {
                try {
                    await payrollAPI.calculate(newPeriodId);
                } catch (calcErr) {
                    console.warn('Auto-calculation error after create:', calcErr);
                }
            }

            setShowCreate(false);
            setForm({ periodStart: '', periodEnd: '', description: '' });
            fetchPeriods();
        } catch (err: unknown) {
            const apiErr = err as { response?: { data?: { message?: string } } };
            setError(apiErr.response?.data?.message || 'Failed to create period');
        } finally { setCreating(false); }
    };

    // Calculate days duration in current form
    const formDurationDays = useMemo(() => {
        if (!form.periodStart || !form.periodEnd) return null;
        const diffMs = new Date(form.periodEnd).getTime() - new Date(form.periodStart).getTime();
        if (diffMs < 0) return null;
        return Math.round(diffMs / (1000 * 60 * 60 * 24)) + 1;
    }, [form.periodStart, form.periodEnd]);

    // Summary stats
    const activePeriods = periods.filter(p => !['CANCELLED', 'LOCKED'].includes(p.status));
    const totalPaid = periods
        .filter(p => ['PAID', 'LOCKED'].includes(p.status))
        .reduce((sum, p) => sum + (p.entries?.reduce((s, e) => s + parseFloat(e.netPay || '0'), 0) || 0), 0);

    return (
        <div className="p-6 max-w-5xl mx-auto">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Payroll Management</h1>
                    <p className="text-sm text-gray-500 mt-0.5">Manage staff cycles, compensation stubs, and disbursements</p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                    <button
                        onClick={() => navigate('/admin/payroll-staff')}
                        className="flex items-center gap-2 px-3 py-2 bg-gray-50 hover:bg-gray-100 text-gray-700 font-semibold rounded-xl text-xs border border-gray-200 transition-all shadow-2xs"
                    >
                        <Users size={15} /> Staff Pay
                    </button>
                    <button
                        onClick={() => navigate('/admin/payroll-reports')}
                        className="flex items-center gap-2 px-3 py-2 bg-gray-50 hover:bg-gray-100 text-gray-700 font-semibold rounded-xl text-xs border border-gray-200 transition-all shadow-2xs"
                    >
                        <BarChart3 size={15} /> Reports
                    </button>
                    <button
                        onClick={() => navigate('/admin/payroll-settings')}
                        className="flex items-center gap-2 px-3 py-2 bg-gray-50 hover:bg-gray-100 text-gray-700 font-semibold rounded-xl text-xs border border-gray-200 transition-all shadow-2xs"
                    >
                        <Zap size={15} /> Settings
                    </button>
                    <button
                        onClick={handleOpenCreateWithAuto}
                        className="flex items-center gap-2 px-4 py-2 bg-amber-400 hover:bg-amber-500 text-amber-950 font-bold rounded-xl text-xs transition-all shadow-sm shadow-amber-400/20"
                        title="Auto-detect current cycle and create"
                    >
                        <Sparkles size={15} /> Auto-Generate Period
                    </button>
                </div>
            </div>

            {/* Stats Row */}
            <div className="grid grid-cols-3 gap-4 mb-6">
                {[
                    { label: 'Active Periods', value: activePeriods.length, icon: Calendar, color: 'text-blue-600 bg-blue-50' },
                    { label: 'Total Employees', value: employeeCount > 0 ? employeeCount : (periods[0]?.entries?.length ?? '—'), icon: Users, color: 'text-purple-600 bg-purple-50' },
                    { label: 'Total Disbursed', value: formatPeso(totalPaid), icon: TrendingUp, color: 'text-green-600 bg-green-50' },
                ].map(stat => (
                    <div key={stat.label} className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
                        <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-xl ${stat.color}`}>
                                <stat.icon size={18} />
                            </div>
                            <div>
                                <p className="text-xs text-gray-500 font-medium">{stat.label}</p>
                                <p className="text-lg font-bold text-gray-900">{stat.value}</p>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Error */}
            {error && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-sm flex items-center gap-2">
                    <AlertCircle size={16} /> {error}
                </div>
            )}

            {/* Periods List */}
            {loading ? (
                <div className="flex justify-center py-16"><div className="spinner" /></div>
            ) : periods.length === 0 ? (
                <div className="text-center py-16 text-gray-400 bg-white rounded-2xl border border-dashed border-gray-200">
                    <Calendar size={48} className="mx-auto mb-3 opacity-30 text-amber-500" />
                    <p className="font-bold text-gray-700">No payroll periods yet</p>
                    <p className="text-xs mt-1 text-gray-400">Click below to auto-generate standard weekly or semi-monthly payroll cycles.</p>
                    <button
                        onClick={handleOpenCreateWithAuto}
                        className="mt-4 px-4 py-2 bg-amber-400 hover:bg-amber-500 text-amber-950 font-bold text-xs rounded-xl transition"
                    >
                        Auto-Generate Current Period
                    </button>
                </div>
            ) : (
                <div className="space-y-3">
                    {periods.map(period => {
                        const cfg = STATUS_CONFIG[period.status] || STATUS_CONFIG.DRAFT;
                        const Icon = cfg.icon;
                        const totalNet = period.entries?.reduce((s, e) => s + parseFloat(e.netPay || '0'), 0) || 0;
                        return (
                            <button
                                key={period.id}
                                onClick={() => navigate(`/admin/payroll/${period.id}`)}
                                className="w-full bg-white rounded-2xl border border-gray-100 p-4 shadow-sm hover:shadow-md hover:border-yellow-200 transition-all text-left group"
                            >
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-xl bg-yellow-50 flex items-center justify-center">
                                            <Calendar size={20} className="text-yellow-600" />
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <p className="font-semibold text-gray-900 text-sm">{period.description}</p>
                                                <span className="text-[10px] text-gray-400 font-mono">#{period.id}</span>
                                            </div>
                                            <p className="text-xs text-gray-400 mt-0.5">
                                                {formatDate(period.periodStart)} — {formatDate(period.periodEnd)}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <div className="text-right">
                                            {totalNet > 0 && (
                                                <p className="text-sm font-bold text-gray-800">{formatPeso(totalNet)}</p>
                                            )}
                                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${cfg.color}`}>
                                                <Icon size={11} />
                                                {cfg.label}
                                            </span>
                                        </div>
                                        <ChevronRight size={18} className="text-gray-300 group-hover:text-gray-500 transition-colors" />
                                    </div>
                                </div>
                            </button>
                        );
                    })}
                </div>
            )}

            {/* Create Period Modal with Auto-Generation Presets */}
            {showCreate && (
                <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden border border-gray-100 animate-in fade-in zoom-in-95 duration-150">
                        
                        {/* Modal Header */}
                        <div className="p-6 border-b border-gray-100 bg-slate-50/70 flex items-start justify-between">
                            <div>
                                <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                                    <Sparkles size={18} className="text-amber-500" />
                                    New Payroll Period
                                </h2>
                                <p className="text-xs text-gray-500 mt-0.5">
                                    Pick an auto-generated cutoff preset or customize exact dates
                                </p>
                            </div>
                            <button
                                onClick={() => { setShowCreate(false); setError(''); }}
                                className="w-8 h-8 rounded-full bg-gray-100 text-gray-500 hover:bg-gray-200 flex items-center justify-center text-sm font-bold"
                            >
                                ✕
                            </button>
                        </div>

                        <form onSubmit={handleCreate} className="p-6 space-y-4">
                            {error && (
                                <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl flex items-center gap-2">
                                    <AlertCircle size={15} className="shrink-0" />
                                    <span>{error}</span>
                                </div>
                            )}

                            {/* Preset Buttons */}
                            <div>
                                <label className="text-xs font-bold text-gray-700 mb-2 flex items-center justify-between">
                                    <span>Auto-Generate Presets</span>
                                    <span className="text-[10px] text-gray-400 font-normal">Click to auto-populate</span>
                                </label>
                                <div className="grid grid-cols-2 gap-2">
                                    {presets.map(preset => {
                                        const isSelected = selectedPresetId === preset.id;
                                        return (
                                            <button
                                                key={preset.id}
                                                type="button"
                                                onClick={() => handleApplyPreset(preset.id)}
                                                className={`p-2.5 rounded-xl border text-left transition-all relative ${
                                                    isSelected
                                                        ? 'bg-amber-50/80 border-amber-400 text-amber-950 ring-1 ring-amber-300'
                                                        : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
                                                }`}
                                            >
                                                <div className="flex items-center justify-between">
                                                    <span className="text-xs font-bold truncate block pr-1">{preset.label}</span>
                                                    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-md ${
                                                        isSelected ? 'bg-amber-200 text-amber-900' : 'bg-gray-100 text-gray-500'
                                                    }`}>
                                                        {preset.badge}
                                                    </span>
                                                </div>
                                                <span className="text-[10px] text-gray-400 block mt-1">
                                                    {preset.data.periodStart} → {preset.data.periodEnd}
                                                </span>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Dates Input */}
                            <div className="pt-2 border-t border-gray-100">
                                <div className="grid grid-cols-2 gap-3 mb-3">
                                    <div>
                                        <label className="text-xs font-semibold text-gray-600 mb-1 block">Period Start</label>
                                        <input
                                            type="date"
                                            required
                                            value={form.periodStart}
                                            onChange={e => {
                                                setSelectedPresetId('');
                                                setForm(f => ({ ...f, periodStart: e.target.value }));
                                            }}
                                            className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-yellow-300"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-xs font-semibold text-gray-600 mb-1 block">Period End</label>
                                        <input
                                            type="date"
                                            required
                                            value={form.periodEnd}
                                            onChange={e => {
                                                setSelectedPresetId('');
                                                setForm(f => ({ ...f, periodEnd: e.target.value }));
                                            }}
                                            className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-yellow-300"
                                        />
                                    </div>
                                </div>

                                {formDurationDays !== null && (
                                    <div className="flex items-center justify-between text-[11px] text-gray-500 mb-3 px-1">
                                        <span>Duration: <strong className="text-gray-800">{formDurationDays} calendar days</strong></span>
                                        {new Date(form.periodEnd) > new Date() && (
                                            <span className="text-amber-600 font-medium">⚡ Active Cycle (capping evaluations up to today)</span>
                                        )}
                                    </div>
                                )}

                                <div>
                                    <label className="text-xs font-semibold text-gray-600 mb-1 block">Cycle Description / Label</label>
                                    <input
                                        type="text"
                                        placeholder="e.g. October 1-15, 2026 (1st Half)"
                                        value={form.description}
                                        onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                                        className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-yellow-300"
                                    />
                                </div>
                            </div>

                            {/* Options Checkbox */}
                            <div className="p-3 bg-amber-50/50 rounded-xl border border-amber-100 flex items-start gap-2.5">
                                <input
                                    type="checkbox"
                                    id="autoCalc"
                                    checked={autoCalculateAfterCreate}
                                    onChange={e => setAutoCalculateAfterCreate(e.target.checked)}
                                    className="mt-0.5 rounded text-amber-500 focus:ring-amber-400"
                                />
                                <label htmlFor="autoCalc" className="text-xs text-amber-950 font-medium cursor-pointer">
                                    Calculate employee entries immediately upon creation
                                    <span className="text-[10px] text-amber-700 block mt-0.5">
                                        Automatically aggregates all current clock-in hours and attendance records into the new cycle.
                                    </span>
                                </label>
                            </div>

                            {/* Action Buttons */}
                            <div className="flex gap-3 pt-2">
                                <button
                                    type="button"
                                    onClick={() => { setShowCreate(false); setError(''); }}
                                    className="flex-1 py-2.5 border border-gray-200 rounded-xl text-xs font-bold text-gray-600 hover:bg-gray-50 transition"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={creating}
                                    className="flex-1 py-2.5 bg-amber-400 hover:bg-amber-500 text-amber-950 font-bold rounded-xl text-xs transition-all disabled:opacity-50 shadow-sm"
                                >
                                    {creating ? 'Creating & Calculating…' : 'Create Payroll Period'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
