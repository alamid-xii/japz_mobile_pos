import { useState, useEffect, useCallback } from 'react';
import {
    BarChart3, DollarSign, TrendingUp, Users, Clock,
    Download, RefreshCw, AlertCircle, CheckCircle,
    Calendar, ShieldCheck, ChevronDown, ChevronUp,
    FileSpreadsheet, Activity
} from 'lucide-react';
import { payrollAPI, logsAPI } from '../../services/api';

interface AnalyticsSummary {
    totalGrossPay: number;
    totalNetPay: number;
    totalBasicPay: number;
    totalOvertimePay: number;
    totalDeductions: number;
    totalRegularHours: number;
    totalOvertimeHours: number;
    totalPosSales: number;
    laborCostPercentage: number;
}

interface RoleBreakdown {
    role: string;
    headcount: number;
    regularHours: number;
    overtimeHours: number;
    grossPay: number;
    netPay: number;
    sharePercentage: number;
}

interface PeriodTrend {
    periodId: number;
    description: string;
    periodStart: string;
    periodEnd: string;
    status: string;
    employeeCount: number;
    grossPay: number;
    netPay: number;
    overtimePay: number;
    regularHours: number;
    overtimeHours: number;
    deductions: number;
    posSales: number;
    laborCostPercentage: number;
}

interface AnalyticsData {
    year: number;
    periodCount: number;
    summary: AnalyticsSummary;
    roleBreakdown: RoleBreakdown[];
    periodTrends: PeriodTrend[];
}

interface AuditLog {
    id: number;
    action: string;
    module: string;
    userName?: string;
    description?: string;
    changes?: Record<string, unknown>;
    status: string;
    createdAt: string;
}

const formatPeso = (v: number) => `₱${(v || 0).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const formatDate = (d: string) => new Date(d).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' });
const formatDateTime = (dt: string) => new Date(dt).toLocaleString('en-PH', {
    month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
});

export default function PayrollReports() {
    const [activeTab, setActiveTab] = useState<'analytics' | 'audit'>('analytics');
    const [selectedYear, setSelectedYear] = useState<number>(() => new Date().getFullYear());
    const [data, setData] = useState<AnalyticsData | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [exportingId, setExportingId] = useState<number | null>(null);

    // Audit logs state
    const [logs, setLogs] = useState<AuditLog[]>([]);
    const [logsLoading, setLogsLoading] = useState(false);
    const [expandedLogId, setExpandedLogId] = useState<number | null>(null);

    const loadAnalytics = useCallback(async () => {
        setLoading(true);
        setError('');
        try {
            const res = await payrollAPI.getAnalytics({ year: selectedYear });
            setData(res.data.data);
        } catch (err: unknown) {
            const apiErr = err as { response?: { data?: { message?: string } } };
            setError(apiErr.response?.data?.message || 'Failed to load payroll analytics');
        } finally {
            setLoading(false);
        }
    }, [selectedYear]);

    const loadLogs = useCallback(async () => {
        setLogsLoading(true);
        try {
            const res = await logsAPI.getAll({ module: 'payroll', limit: 100 });
            setLogs(res.data.logs || []);
        } catch {
            // non-fatal
        } finally {
            setLogsLoading(false);
        }
    }, []);

    useEffect(() => {
        loadAnalytics();
    }, [loadAnalytics]);

    useEffect(() => {
        if (activeTab === 'audit') {
            loadLogs();
        }
    }, [activeTab, loadLogs]);

    const handleExportCSV = async (periodId: number, filenamePrefix: string) => {
        setExportingId(periodId);
        try {
            const res = await payrollAPI.exportCSV(periodId);
            const blob = new Blob([res.data], { type: 'text/csv' });
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `${filenamePrefix}.csv`);
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(url);
        } catch {
            alert('Failed to download CSV export');
        } finally {
            setExportingId(null);
        }
    };

    const summary = data?.summary;
    const roleBreakdown = data?.roleBreakdown || [];
    const trends = data?.periodTrends || [];

    // Labor Cost benchmark indicator
    const laborPct = summary?.laborCostPercentage || 0;
    const getLaborStatus = (pct: number) => {
        if (pct === 0) return { label: 'No Sales Data', color: 'text-gray-500 bg-gray-50 border-gray-200' };
        if (pct < 20) return { label: 'Low Labor Ratio', color: 'text-blue-700 bg-blue-50 border-blue-200' };
        if (pct <= 35) return { label: 'Optimal (20–35% Benchmark)', color: 'text-emerald-700 bg-emerald-50 border-emerald-200' };
        return { label: 'High Alert (>35%)', color: 'text-amber-700 bg-amber-50 border-amber-200' };
    };
    const laborStatus = getLaborStatus(laborPct);

    return (
        <div className="p-6 max-w-6xl mx-auto">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                        <BarChart3 className="text-yellow-600" /> Payroll Analytics & Reports
                    </h1>
                    <p className="text-sm text-gray-500 mt-0.5">
                        Labor cost ratios, department distribution, and financial summaries
                    </p>
                </div>

                <div className="flex items-center gap-3">
                    {/* View Switcher */}
                    <div className="flex bg-gray-100 p-1 rounded-xl">
                        <button
                            onClick={() => setActiveTab('analytics')}
                            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                                activeTab === 'analytics'
                                    ? 'bg-white text-gray-900 shadow-sm'
                                    : 'text-gray-500 hover:text-gray-700'
                            }`}>
                            Analytics
                        </button>
                        <button
                            onClick={() => setActiveTab('audit')}
                            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                                activeTab === 'audit'
                                    ? 'bg-white text-gray-900 shadow-sm'
                                    : 'text-gray-500 hover:text-gray-700'
                            }`}>
                            Audit Trail
                        </button>
                    </div>

                    {/* Year Filter */}
                    {activeTab === 'analytics' && (
                        <select
                            value={selectedYear}
                            onChange={(e) => setSelectedYear(parseInt(e.target.value, 10))}
                            className="px-3 py-2 border border-gray-200 bg-white rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-yellow-300">
                            {[2024, 2025, 2026, 2027].map((yr) => (
                                <option key={yr} value={yr}>
                                    FY {yr}
                                </option>
                            ))}
                        </select>
                    )}

                    <button
                        onClick={activeTab === 'analytics' ? loadAnalytics : loadLogs}
                        className="p-2 border border-gray-200 bg-white hover:bg-gray-50 rounded-xl text-gray-600 transition-colors"
                        title="Refresh">
                        <RefreshCw size={15} className={loading || logsLoading ? 'animate-spin' : ''} />
                    </button>
                </div>
            </div>

            {error && (
                <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded-2xl text-sm flex items-center gap-2">
                    <AlertCircle size={18} /> {error}
                </div>
            )}

            {activeTab === 'analytics' ? (
                <>
                    {loading && !data ? (
                        <div className="flex justify-center py-24"><div className="spinner" /></div>
                    ) : (
                        <>
                            {/* KPI Metrics Grid */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                                <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
                                    <div className="flex items-center justify-between mb-3">
                                        <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Gross Payroll</span>
                                        <div className="p-2 rounded-xl bg-blue-50 text-blue-600"><DollarSign size={18} /></div>
                                    </div>
                                    <p className="text-2xl font-bold text-gray-900">{formatPeso(summary?.totalGrossPay || 0)}</p>
                                    <p className="text-xs text-gray-500 mt-1">Disbursed Net: {formatPeso(summary?.totalNetPay || 0)}</p>
                                </div>

                                <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
                                    <div className="flex items-center justify-between mb-3">
                                        <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Labor Cost %</span>
                                        <div className="p-2 rounded-xl bg-yellow-50 text-yellow-600"><TrendingUp size={18} /></div>
                                    </div>
                                    <div className="flex items-baseline gap-2">
                                        <p className="text-2xl font-bold text-gray-900">{laborPct.toFixed(1)}%</p>
                                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${laborStatus.color}`}>
                                            {laborStatus.label}
                                        </span>
                                    </div>
                                    <p className="text-xs text-gray-500 mt-1">POS Sales: {formatPeso(summary?.totalPosSales || 0)}</p>
                                </div>

                                <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
                                    <div className="flex items-center justify-between mb-3">
                                        <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Hours Worked</span>
                                        <div className="p-2 rounded-xl bg-purple-50 text-purple-600"><Clock size={18} /></div>
                                    </div>
                                    <p className="text-2xl font-bold text-gray-900">
                                        {((summary?.totalRegularHours || 0) + (summary?.totalOvertimeHours || 0)).toFixed(1)} hrs
                                    </p>
                                    <p className="text-xs text-gray-500 mt-1">
                                        Regular: {(summary?.totalRegularHours || 0).toFixed(1)}h · OT: {(summary?.totalOvertimeHours || 0).toFixed(1)}h
                                    </p>
                                </div>

                                <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
                                    <div className="flex items-center justify-between mb-3">
                                        <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Total Deductions</span>
                                        <div className="p-2 rounded-xl bg-red-50 text-red-500"><Activity size={18} /></div>
                                    </div>
                                    <p className="text-2xl font-bold text-gray-900">{formatPeso(summary?.totalDeductions || 0)}</p>
                                    <p className="text-xs text-gray-500 mt-1">Overtime Paid: {formatPeso(summary?.totalOvertimePay || 0)}</p>
                                </div>
                            </div>

                            {/* Labor Efficiency & Intelligence Card */}
                            <div className="bg-gradient-to-r from-yellow-500/10 via-amber-500/5 to-transparent border border-yellow-200/60 rounded-2xl p-5 mb-6">
                                <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                                    <div>
                                        <h3 className="font-bold text-gray-900 text-sm flex items-center gap-1.5">
                                            <ShieldCheck size={18} className="text-yellow-600" /> Restaurant Prime Cost Labor Benchmark
                                        </h3>
                                        <p className="text-xs text-gray-600 mt-1 max-w-2xl">
                                            Healthy quick-service and casual dining labor cost typically targets <strong>20% to 35%</strong> of gross sales.
                                            {laborPct > 0 && laborPct <= 35 ? (
                                                <span className="text-emerald-700 font-semibold"> Your current labor cost is well within the optimal operating range.</span>
                                            ) : laborPct > 35 ? (
                                                <span className="text-amber-800 font-semibold"> Labor is currently higher than 35% — consider reviewing shift scheduling during off-peak hours.</span>
                                            ) : null}
                                        </p>
                                    </div>

                                    {/* Visual Gauge */}
                                    <div className="w-full md:w-56 bg-white/80 p-3 rounded-xl border border-yellow-200 shrink-0">
                                        <div className="flex justify-between text-[11px] font-semibold text-gray-500 mb-1">
                                            <span>Labor Ratio</span>
                                            <span className="font-bold text-gray-900">{laborPct.toFixed(1)}%</span>
                                        </div>
                                        <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden flex">
                                            <div
                                                className={`h-full rounded-full transition-all duration-500 ${
                                                    laborPct <= 35 ? 'bg-emerald-500' : 'bg-amber-500'
                                                }`}
                                                style={{ width: `${Math.min(laborPct, 100)}%` }}
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Role Distribution & Period Trends Grid */}
                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
                                {/* Role / Department Breakdown */}
                                <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
                                    <h2 className="font-bold text-gray-900 text-sm mb-4 flex items-center gap-2">
                                        <Users size={16} className="text-gray-400" /> Department Distribution
                                    </h2>
                                    {roleBreakdown.length === 0 ? (
                                        <p className="text-xs text-gray-400 py-6 text-center">No role records available</p>
                                    ) : (
                                        <div className="space-y-4">
                                            {roleBreakdown.map((r) => (
                                                <div key={r.role}>
                                                    <div className="flex items-center justify-between text-xs mb-1">
                                                        <span className="font-semibold text-gray-800 capitalize">{r.role}</span>
                                                        <span className="text-gray-500">{formatPeso(r.grossPay)} ({r.sharePercentage.toFixed(0)}%)</span>
                                                    </div>
                                                    <div className="w-full bg-gray-100 rounded-full h-1.5 overflow-hidden">
                                                        <div
                                                            className="bg-yellow-400 h-full rounded-full"
                                                            style={{ width: `${r.sharePercentage}%` }}
                                                        />
                                                    </div>
                                                    <div className="flex justify-between text-[10px] text-gray-400 mt-0.5">
                                                        <span>{r.headcount} employee{r.headcount !== 1 ? 's' : ''}</span>
                                                        <span>{r.regularHours.toFixed(1)}h reg · {r.overtimeHours.toFixed(1)}h OT</span>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                {/* Historical Period Trends Table */}
                                <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden flex flex-col">
                                    <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
                                        <h2 className="font-bold text-gray-900 text-sm flex items-center gap-2">
                                            <Calendar size={16} className="text-gray-400" /> Pay Period Records ({trends.length})
                                        </h2>
                                        <span className="text-xs text-gray-400 font-medium">FY {selectedYear}</span>
                                    </div>

                                    {trends.length === 0 ? (
                                        <div className="py-16 text-center text-gray-400">
                                            <FileSpreadsheet size={32} className="mx-auto mb-2 opacity-30" />
                                            <p className="text-xs">No payroll periods found for {selectedYear}</p>
                                        </div>
                                    ) : (
                                        <div className="overflow-x-auto flex-1">
                                            <table className="w-full text-left text-xs">
                                                <thead className="bg-gray-50/75 border-b border-gray-100 text-gray-400 font-semibold uppercase text-[10px]">
                                                    <tr>
                                                        <th className="px-4 py-3">Period</th>
                                                        <th className="px-3 py-3">Staff</th>
                                                        <th className="px-3 py-3">Gross</th>
                                                        <th className="px-3 py-3">Net</th>
                                                        <th className="px-3 py-3">POS Sales</th>
                                                        <th className="px-3 py-3">Labor %</th>
                                                        <th className="px-3 py-3 text-right">Export</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-gray-50">
                                                    {trends.map((t) => (
                                                        <tr key={t.periodId} className="hover:bg-gray-50/60 transition-colors">
                                                            <td className="px-4 py-3">
                                                                <p className="font-semibold text-gray-900">{t.description}</p>
                                                                <p className="text-[10px] text-gray-400">
                                                                    {formatDate(t.periodStart)} – {formatDate(t.periodEnd)}
                                                                </p>
                                                            </td>
                                                            <td className="px-3 py-3 text-gray-600 font-medium">{t.employeeCount}</td>
                                                            <td className="px-3 py-3 font-semibold text-gray-900">{formatPeso(t.grossPay)}</td>
                                                            <td className="px-3 py-3 font-semibold text-emerald-700">{formatPeso(t.netPay)}</td>
                                                            <td className="px-3 py-3 text-gray-600">{formatPeso(t.posSales)}</td>
                                                            <td className="px-3 py-3 font-bold text-gray-800">
                                                                {t.posSales > 0 ? `${t.laborCostPercentage.toFixed(1)}%` : '—'}
                                                            </td>
                                                            <td className="px-3 py-3 text-right">
                                                                <button
                                                                    onClick={() => handleExportCSV(t.periodId, `payroll_${t.periodId}_${t.periodStart}`)}
                                                                    disabled={exportingId === t.periodId}
                                                                    className="inline-flex items-center gap-1 px-2.5 py-1 bg-gray-50 hover:bg-yellow-100 hover:text-yellow-800 text-gray-600 rounded-lg text-[11px] font-semibold border border-gray-200 transition-colors disabled:opacity-50">
                                                                    <Download size={12} />
                                                                    {exportingId === t.periodId ? 'Exporting…' : 'CSV'}
                                                                </button>
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </>
                    )}
                </>
            ) : (
                /* Step 18: Audit Trail Viewer Tab */
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                    <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
                        <div>
                            <h2 className="font-bold text-gray-900 text-sm flex items-center gap-2">
                                <ShieldCheck size={16} className="text-yellow-600" /> Payroll Audit Log Trail
                            </h2>
                            <p className="text-xs text-gray-400 mt-0.5">Immutable record of all payroll and attendance operations</p>
                        </div>
                        <span className="text-xs text-gray-400">{logs.length} events logged</span>
                    </div>

                    {logsLoading ? (
                        <div className="flex justify-center py-20"><div className="spinner" /></div>
                    ) : logs.length === 0 ? (
                        <div className="py-20 text-center text-gray-400">
                            <CheckCircle size={32} className="mx-auto mb-2 opacity-30 text-emerald-500" />
                            <p className="text-xs">No payroll logs found</p>
                        </div>
                    ) : (
                        <div className="divide-y divide-gray-50">
                            {logs.map((log) => (
                                <div key={log.id} className="p-4 hover:bg-gray-50/60 transition-colors">
                                    <div className="flex items-start justify-between gap-4">
                                        <div className="flex items-start gap-3">
                                            <div className="mt-0.5 p-1.5 rounded-lg bg-yellow-50 text-yellow-700">
                                                <Activity size={14} />
                                            </div>
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <span className="font-semibold text-gray-900 text-xs">
                                                        {log.userName || 'System / Admin'}
                                                    </span>
                                                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-gray-100 text-gray-700">
                                                        {log.action}
                                                    </span>
                                                    <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded ${
                                                        log.status === 'success' ? 'text-green-700 bg-green-50' : 'text-red-700 bg-red-50'
                                                    }`}>
                                                        {log.status}
                                                    </span>
                                                </div>
                                                <p className="text-xs text-gray-600 mt-1">{log.description}</p>
                                                <p className="text-[10px] text-gray-400 mt-0.5">{formatDateTime(log.createdAt)}</p>
                                            </div>
                                        </div>

                                        {log.changes && (
                                            <button
                                                onClick={() => setExpandedLogId(expandedLogId === log.id ? null : log.id)}
                                                className="flex items-center gap-1 text-[11px] text-gray-500 hover:text-gray-800 font-medium p-1">
                                                {expandedLogId === log.id ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                                                Details
                                            </button>
                                        )}
                                    </div>

                                    {/* Expandable Changes JSON */}
                                    {expandedLogId === log.id && log.changes && (
                                        <div className="mt-3 ml-8 bg-gray-900 text-emerald-400 font-mono text-[11px] p-3 rounded-xl overflow-x-auto">
                                            <pre>{JSON.stringify(log.changes, null, 2)}</pre>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
