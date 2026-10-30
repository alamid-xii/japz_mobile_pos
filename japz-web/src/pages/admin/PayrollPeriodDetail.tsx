import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
    ArrowLeft, Play, Eye, CheckCircle, DollarSign, Lock, RotateCcw,
    XCircle, AlertCircle, Clock, TrendingUp, TrendingDown,
    FileText, Loader2, ChevronDown, ChevronUp, Download
} from 'lucide-react';
import { payrollAPI } from '../../services/api';

interface PayrollEntry {
    id: number;
    employeeId: number;
    snapshotEmployeeName: string;
    snapshotRole: string;
    snapshotHourlyRate: string;
    regularHours: string;
    overtimeHours: string;
    grossPay: string;
    totalDeductions: string;
    netPay: string;
    lateMinutes: number;
    undertimeMinutes: number;
    absenceDays: string;
    status: string;
    employee?: { name: string; role: string; email: string };
}

interface Period {
    id: number;
    description: string;
    periodStart: string;
    periodEnd: string;
    status: string;
    approvedBy?: number;
    approvedAt?: string;
    entries: PayrollEntry[];
}

const formatPeso = (v: string | number) =>
    `₱${parseFloat(String(v)).toLocaleString('en-PH', { minimumFractionDigits: 2 })}`;
const formatDate = (d: string) =>
    new Date(d).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' });

const STATUS_ACTIONS: Record<string, { label: string; next: string; color: string; icon: React.ElementType }[]> = {
    DRAFT:        [{ label: 'Run Calculation', next: 'calculate', color: 'bg-blue-500 hover:bg-blue-600 text-white', icon: Play }],
    CALCULATED:   [
        { label: 'Send for Review', next: 'review', color: 'bg-amber-400 hover:bg-amber-500 text-amber-900', icon: Eye },
        { label: 'Recalculate',     next: 'calculate', color: 'bg-gray-100 hover:bg-gray-200 text-gray-700', icon: RotateCcw },
    ],
    UNDER_REVIEW: [
        { label: 'Approve Payroll', next: 'approve', color: 'bg-green-500 hover:bg-green-600 text-white', icon: CheckCircle },
        { label: 'Recalculate',     next: 'calculate', color: 'bg-gray-100 hover:bg-gray-200 text-gray-700', icon: RotateCcw },
    ],
    APPROVED:     [
        { label: 'Generate Payslips', next: 'payslips', color: 'bg-purple-500 hover:bg-purple-600 text-white', icon: FileText },
        { label: 'Mark as Paid',      next: 'paid',     color: 'bg-emerald-500 hover:bg-emerald-600 text-white', icon: DollarSign },
    ],
    PAID:         [{ label: 'Lock Period', next: 'lock', color: 'bg-purple-600 hover:bg-purple-700 text-white', icon: Lock }],
};

export default function PayrollPeriodDetail() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [period, setPeriod] = useState<Period | null>(null);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState('');
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [expandedEntry, setExpandedEntry] = useState<number | null>(null);
    const [reopenReason, setReopenReason] = useState('');
    const [cancelReason, setCancelReason] = useState('');
    const [showReopen, setShowReopen] = useState(false);
    const [showCancel, setShowCancel] = useState(false);

    const fetchPeriod = useCallback(async () => {
        try {
            const res = await payrollAPI.getPeriodById(id!);
            setPeriod(res.data?.data);
        } catch { setError('Failed to load payroll period'); }
        finally { setLoading(false); }
    }, [id]);

    useEffect(() => { fetchPeriod(); }, [fetchPeriod]);

    const handleAction = async (action: string) => {
        setActionLoading(action);
        setError('');
        setSuccess('');
        try {
            if (action === 'calculate')  {
                await payrollAPI.calculate(id!);
                setSuccess('Payroll calculated successfully!');
            }
            else if (action === 'review') {
                await payrollAPI.markReview(id!);
                setSuccess('Period submitted for review.');
            }
            else if (action === 'approve') {
                await payrollAPI.approve(id!);
                setSuccess('Payroll period approved!');
            }
            else if (action === 'paid') {
                await payrollAPI.markPaid(id!);
                setSuccess('Payroll marked as paid!');
            }
            else if (action === 'lock') {
                await payrollAPI.lock(id!);
                setSuccess('Payroll period locked.');
            }
            else if (action === 'payslips') {
                await payrollAPI.generatePayslips(id!);
                setSuccess('Payslips generated successfully for this period!');
            }
            await fetchPeriod();
            setTimeout(() => setSuccess(''), 5000);
        } catch (err: unknown) {
            const apiErr = err as { response?: { data?: { message?: string } } };
            setError(apiErr.response?.data?.message || `Failed to execute: ${action}`);
        } finally { setActionLoading(''); }
    };

    const handleReopen = async () => {
        if (!reopenReason.trim()) return;
        setActionLoading('reopen');
        try {
            await payrollAPI.reopen(id!, reopenReason);
            setShowReopen(false);
            setReopenReason('');
            fetchPeriod();
        } catch (err: unknown) {
            const apiErr = err as { response?: { data?: { message?: string } } };
            setError(apiErr.response?.data?.message || 'Failed to reopen period');
        } finally { setActionLoading(''); }
    };

    const handleCancel = async () => {
        if (!cancelReason.trim()) return;
        setActionLoading('cancel');
        try {
            await payrollAPI.cancel(id!, cancelReason);
            setShowCancel(false);
            setCancelReason('');
            fetchPeriod();
        } catch (err: unknown) {
            const apiErr = err as { response?: { data?: { message?: string } } };
            setError(apiErr.response?.data?.message || 'Failed to cancel period');
        } finally { setActionLoading(''); }
    };

    const handleExportCSV = async () => {
        if (!period) return;
        try {
            const res = await payrollAPI.exportCSV(period.id);
            const blob = new Blob([res.data], { type: 'text/csv' });
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `payroll_${period.id}_${period.periodStart}_to_${period.periodEnd}.csv`);
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(url);
        } catch {
            setError('Failed to export payroll CSV');
        }
    };

    if (loading) return <div className="spinner h-full" />;
    if (!period) return <div className="p-6 text-gray-500">Period not found</div>;

    const entries = period.entries || [];
    const totalNet = entries.reduce((s, e) => s + parseFloat(e.netPay || '0'), 0);
    const totalGross = entries.reduce((s, e) => s + parseFloat(e.grossPay || '0'), 0);
    const totalDeductions = entries.reduce((s, e) => s + parseFloat(e.totalDeductions || '0'), 0);
    const actions = STATUS_ACTIONS[period.status] || [];
    const canReopen = ['APPROVED'].includes(period.status);
    const canCancel = !['PAID', 'LOCKED', 'CANCELLED'].includes(period.status);

    return (
        <div className="p-6 max-w-5xl mx-auto">
            {/* Back + Header */}
            <div className="flex items-start justify-between mb-6">
                <div className="flex items-start gap-3">
                    <button onClick={() => navigate('/admin/payroll')}
                        className="p-2 rounded-xl hover:bg-gray-100 text-gray-400 hover:text-gray-700 transition-colors mt-0.5">
                        <ArrowLeft size={20} />
                    </button>
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">{period.description}</h1>
                        <p className="text-sm text-gray-400 mt-0.5">
                            {formatDate(period.periodStart)} — {formatDate(period.periodEnd)}
                        </p>
                    </div>
                </div>
                <span className={`px-3 py-1.5 rounded-full text-xs font-bold ${
                    period.status === 'APPROVED'     ? 'bg-green-100 text-green-700' :
                    period.status === 'PAID'         ? 'bg-emerald-100 text-emerald-700' :
                    period.status === 'LOCKED'       ? 'bg-purple-100 text-purple-700' :
                    period.status === 'CANCELLED'    ? 'bg-red-100 text-red-600' :
                    period.status === 'UNDER_REVIEW' ? 'bg-amber-100 text-amber-700' :
                    period.status === 'CALCULATED'   ? 'bg-blue-100 text-blue-700' :
                    'bg-gray-100 text-gray-600'
                }`}>{period.status.replace('_', ' ')}</span>
            </div>

            {error && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-sm flex items-center gap-2">
                    <AlertCircle size={16} /> {error}
                </div>
            )}

            {success && (
                <div className="mb-4 p-3 bg-green-50 border border-green-200 text-green-700 rounded-xl text-sm flex items-center gap-2 animate-fade-in">
                    <CheckCircle size={16} /> {success}
                </div>
            )}

            {/* Summary Totals */}
            {entries.length > 0 && (
                <div className="grid grid-cols-3 gap-4 mb-6">
                    {[
                        { label: 'Gross Pay', value: formatPeso(totalGross), icon: TrendingUp, color: 'text-blue-600 bg-blue-50' },
                        { label: 'Deductions', value: formatPeso(totalDeductions), icon: TrendingDown, color: 'text-red-500 bg-red-50' },
                        { label: 'Net Pay', value: formatPeso(totalNet), icon: DollarSign, color: 'text-green-600 bg-green-50' },
                    ].map(s => (
                        <div key={s.label} className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
                            <div className="flex items-center gap-3">
                                <div className={`p-2 rounded-xl ${s.color}`}><s.icon size={18} /></div>
                                <div>
                                    <p className="text-xs text-gray-500 font-medium">{s.label}</p>
                                    <p className="text-lg font-bold text-gray-900">{s.value}</p>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Action Buttons */}
            {actions.length > 0 && (
                <div className="flex gap-3 mb-6 flex-wrap">
                    {actions.map(action => (
                        <button key={action.next}
                            onClick={() => handleAction(action.next)}
                            disabled={!!actionLoading}
                            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all disabled:opacity-50 ${action.color}`}>
                            {actionLoading === action.next
                                ? <Loader2 size={16} className="animate-spin" />
                                : <action.icon size={16} />}
                            {action.label}
                        </button>
                    ))}
                    {canReopen && (
                        <button onClick={() => setShowReopen(true)}
                            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold border border-gray-200 text-gray-600 hover:bg-gray-50">
                            <RotateCcw size={16} /> Reopen
                        </button>
                    )}
                    {canCancel && (
                        <button onClick={() => setShowCancel(true)}
                            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold border border-red-200 text-red-500 hover:bg-red-50">
                            <XCircle size={16} /> Cancel
                        </button>
                    )}
                </div>
            )}

            {/* Entries Table */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
                    <div>
                        <h2 className="font-semibold text-gray-900">Employee Payroll Entries</h2>
                        <span className="text-xs text-gray-400">{entries.length} employees</span>
                    </div>
                    {entries.length > 0 && (
                        <button
                            onClick={handleExportCSV}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-50 hover:bg-yellow-100 text-gray-700 hover:text-yellow-800 border border-gray-200 rounded-xl text-xs font-semibold transition-all">
                            <Download size={14} /> Export CSV
                        </button>
                    )}
                </div>
                {entries.length === 0 ? (
                    <div className="py-12 text-center text-gray-400">
                        <Clock size={32} className="mx-auto mb-2 opacity-30" />
                        <p className="text-sm">No entries yet. Run calculation to generate entries.</p>
                    </div>
                ) : (
                    <div className="divide-y divide-gray-50">
                        {entries.map(entry => (
                            <div key={entry.id}>
                                <button className="w-full px-5 py-3.5 flex items-center justify-between hover:bg-gray-50 text-left transition-colors"
                                    onClick={() => setExpandedEntry(expandedEntry === entry.id ? null : entry.id)}>
                                    <div className="flex items-center gap-3">
                                        <div className="w-9 h-9 rounded-xl bg-yellow-50 flex items-center justify-center text-yellow-700 font-bold text-sm">
                                            {entry.snapshotEmployeeName?.charAt(0) || '?'}
                                        </div>
                                        <div>
                                            <p className="font-semibold text-gray-900 text-sm">{entry.snapshotEmployeeName}</p>
                                            <p className="text-xs text-gray-400 capitalize">{entry.snapshotRole} · ₱{parseFloat(entry.snapshotHourlyRate).toFixed(2)}/hr</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <div className="text-right">
                                            <p className="text-sm font-bold text-gray-900">{formatPeso(entry.netPay)}</p>
                                            <p className="text-xs text-gray-400">net pay</p>
                                        </div>
                                        {expandedEntry === entry.id ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
                                    </div>
                                </button>
                                {expandedEntry === entry.id && (
                                    <div className="px-5 pb-4 bg-gray-50 grid grid-cols-2 md:grid-cols-4 gap-3">
                                        {[
                                            { label: 'Regular Hours', value: `${parseFloat(entry.regularHours).toFixed(2)}h` },
                                            { label: 'OT Hours', value: `${parseFloat(entry.overtimeHours).toFixed(2)}h` },
                                            { label: 'Gross Pay', value: formatPeso(entry.grossPay) },
                                            { label: 'Deductions', value: formatPeso(entry.totalDeductions) },
                                            { label: 'Late (min)', value: entry.lateMinutes },
                                            { label: 'Undertime (min)', value: entry.undertimeMinutes },
                                            { label: 'Absences', value: `${entry.absenceDays} day(s)` },
                                            { label: 'Net Pay', value: formatPeso(entry.netPay) },
                                        ].map(row => (
                                            <div key={row.label} className="bg-white rounded-xl p-3 border border-gray-100">
                                                <p className="text-[10px] text-gray-400 font-medium mb-0.5">{row.label}</p>
                                                <p className="text-sm font-bold text-gray-900">{row.value}</p>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Reopen Modal */}
            {showReopen && (
                <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
                        <h3 className="font-bold text-gray-900 mb-1">Reopen Payroll Period</h3>
                        <p className="text-sm text-gray-500 mb-4">This will reset the period to Under Review. Please provide a reason.</p>
                        <textarea value={reopenReason} onChange={e => setReopenReason(e.target.value)}
                            placeholder="Reason for reopening…" rows={3}
                            className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-yellow-300 resize-none mb-4" />
                        <div className="flex gap-3">
                            <button onClick={() => setShowReopen(false)} className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-600">Cancel</button>
                            <button onClick={handleReopen} disabled={!reopenReason.trim() || !!actionLoading}
                                className="flex-1 py-2.5 bg-amber-400 hover:bg-amber-500 text-amber-900 font-semibold rounded-xl text-sm disabled:opacity-50">
                                {actionLoading === 'reopen' ? 'Reopening…' : 'Reopen'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Cancel Modal */}
            {showCancel && (
                <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
                        <h3 className="font-bold text-gray-900 mb-1">Cancel Payroll Period</h3>
                        <p className="text-sm text-red-500 mb-4">This action cannot be undone. The period will be permanently cancelled.</p>
                        <textarea value={cancelReason} onChange={e => setCancelReason(e.target.value)}
                            placeholder="Reason for cancellation…" rows={3}
                            className="w-full px-3 py-2 border border-red-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-300 resize-none mb-4" />
                        <div className="flex gap-3">
                            <button onClick={() => setShowCancel(false)} className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-600">Cancel</button>
                            <button onClick={handleCancel} disabled={!cancelReason.trim() || !!actionLoading}
                                className="flex-1 py-2.5 bg-red-500 hover:bg-red-600 text-white font-semibold rounded-xl text-sm disabled:opacity-50">
                                {actionLoading === 'cancel' ? 'Cancelling…' : 'Confirm Cancel'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
