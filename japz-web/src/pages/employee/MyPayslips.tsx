import { useState, useEffect, useCallback, useMemo } from 'react';
import {
    FileText,
    DollarSign,
    Clock,
    Printer,
    Download,
    CheckCircle2,
    AlertCircle,
    RefreshCw,
    Calendar,
    ShieldCheck,
    Sparkles,
    Copy,
    Check,
    TrendingUp,
    TrendingDown,
    Building2,
    Info
} from 'lucide-react';
import { employeeAPI } from '../../services/api';

interface PayrollAdjustmentItem {
    adjustmentType: string;
    amount: string;
    description: string;
    reason?: string;
}

interface PayrollPeriodInfo {
    id?: number;
    periodStart: string;
    periodEnd: string;
    payDate?: string;
    description: string;
    status?: string;
}

interface PayrollEntryInfo {
    id?: number;
    snapshotEmployeeName: string;
    snapshotRole: string;
    snapshotHourlyRate: string;
    regularHours: string;
    overtimeHours: string;
    basicPay: string;
    overtimePay: string;
    holidayPay: string;
    restDayPay: string;
    allowances: string;
    bonuses: string;
    grossPay: string;
    lateMinutes: number;
    lateDeduction: string;
    undertimeMinutes: number;
    undertimeDeduction: string;
    absenceDays: string;
    absenceDeduction: string;
    cashAdvanceDeduction: string;
    otherDeductions: string;
    totalDeductions: string;
    netPay: string;
    notes?: string;
    status?: string;
    payrollPeriod?: PayrollPeriodInfo;
    adjustments?: PayrollAdjustmentItem[];
}

interface Payslip {
    id: number;
    employeeId: number;
    payrollEntryId: number;
    generatedAt: string;
    isSuperseded: boolean;
    payrollEntry: PayrollEntryInfo;
}

const formatPeso = (v: string | number | undefined | null) => {
    const num = parseFloat(String(v || 0));
    return `₱${num.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

const formatDate = (d: string | undefined | null) => {
    if (!d) return 'N/A';
    return new Date(d).toLocaleDateString('en-PH', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
    });
};

const formatFullDate = (d: string | undefined | null) => {
    if (!d) return 'N/A';
    return new Date(d).toLocaleDateString('en-PH', {
        weekday: 'short',
        month: 'long',
        day: 'numeric',
        year: 'numeric'
    });
};

export default function MyPayslips() {
    const [payslips, setPayslips] = useState<Payslip[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState('');
    const [selectedPayslip, setSelectedPayslip] = useState<Payslip | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [copied, setCopied] = useState(false);

    const fetchPayslips = useCallback(async (isManualRefresh = false) => {
        if (isManualRefresh) setRefreshing(true);
        else setLoading(true);
        setError('');

        try {
            const res = await employeeAPI.getMyPayslips();
            const list: Payslip[] = res.data?.data || [];
            setPayslips(list);
            if (list.length > 0) {
                // Keep currently selected if it exists in the new list, otherwise pick latest
                setSelectedPayslip(prev => {
                    if (!prev) return list[0];
                    const matched = list.find(p => p.id === prev.id);
                    return matched || list[0];
                });
            } else {
                setSelectedPayslip(null);
            }
        } catch (err: unknown) {
            console.error('Failed to load payslips:', err);
            setError('Unable to load your payslip records. Please ensure your connection is active or try again.');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useEffect(() => {
        fetchPayslips();
    }, [fetchPayslips]);

    const filteredPayslips = useMemo(() => {
        if (!searchQuery.trim()) return payslips;
        const q = searchQuery.toLowerCase();
        return payslips.filter(p => {
            const desc = p.payrollEntry?.payrollPeriod?.description?.toLowerCase() || '';
            const name = p.payrollEntry?.snapshotEmployeeName?.toLowerCase() || '';
            const dateStr = `${formatDate(p.payrollEntry?.payrollPeriod?.periodStart)} ${formatDate(p.payrollEntry?.payrollPeriod?.periodEnd)}`.toLowerCase();
            return desc.includes(q) || name.includes(q) || dateStr.includes(q);
        });
    }, [payslips, searchQuery]);

    const handlePrint = () => {
        window.print();
    };

    const handleCopySummary = () => {
        if (!selectedPayslip) return;
        const e = selectedPayslip.payrollEntry;
        const p = e?.payrollPeriod;
        const text = [
            `--- JAPZ OFFICIAL PAYSLIP ---`,
            `Payslip Ref: #PAY-${selectedPayslip.id.toString().padStart(5, '0')}`,
            `Employee: ${e?.snapshotEmployeeName} (${e?.snapshotRole?.toUpperCase()})`,
            `Period: ${p?.description || 'N/A'} (${formatDate(p?.periodStart)} - ${formatDate(p?.periodEnd)})`,
            `Hourly Rate: ${formatPeso(e?.snapshotHourlyRate)}/hr`,
            `Regular Hours: ${parseFloat(e?.regularHours || '0').toFixed(1)} hrs`,
            `Overtime Hours: ${parseFloat(e?.overtimeHours || '0').toFixed(1)} hrs`,
            `--------------------------------`,
            `Gross Pay:        ${formatPeso(e?.grossPay)}`,
            `Total Deductions: -${formatPeso(e?.totalDeductions)}`,
            `NET TAKE-HOME:    ${formatPeso(e?.netPay)}`,
            `--------------------------------`,
            `Generated on: ${formatDate(selectedPayslip.generatedAt)}`
        ].join('\n');

        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2500);
    };

    const handleDownloadReceipt = () => {
        if (!selectedPayslip) return;
        const e = selectedPayslip.payrollEntry;
        const p = e?.payrollPeriod;
        const text = [
            `============================================================`,
            `                      JAPZ RESTAURANT                       `,
            `          EMPLOYEE PAYROLL SLIP & REMITTANCE ADVICE         `,
            `============================================================`,
            `Reference #: PAY-${selectedPayslip.id.toString().padStart(6, '0')}`,
            `Generated:   ${formatFullDate(selectedPayslip.generatedAt)}`,
            `Status:      ${selectedPayslip.isSuperseded ? 'SUPERSEDED' : 'OFFICIAL / VALID'}`,
            `------------------------------------------------------------`,
            `EMPLOYEE INFORMATION:`,
            `  Name:        ${e?.snapshotEmployeeName}`,
            `  Role:        ${e?.snapshotRole?.toUpperCase()}`,
            `  Hourly Rate: ${formatPeso(e?.snapshotHourlyRate)}/hr`,
            `------------------------------------------------------------`,
            `PAY PERIOD DETAILS:`,
            `  Period Name: ${p?.description || 'Payroll Period'}`,
            `  Duration:    ${formatDate(p?.periodStart)} to ${formatDate(p?.periodEnd)}`,
            `  Reg Hours:   ${parseFloat(e?.regularHours || '0').toFixed(2)} hrs`,
            `  OT Hours:    ${parseFloat(e?.overtimeHours || '0').toFixed(2)} hrs`,
            `------------------------------------------------------------`,
            `EARNINGS BREAKDOWN:`,
            `  Basic Pay:         ${formatPeso(e?.basicPay)}`,
            `  Overtime Pay:      ${formatPeso(e?.overtimePay)}`,
            `  Holiday Pay:       ${formatPeso(e?.holidayPay)}`,
            `  Rest Day Pay:      ${formatPeso(e?.restDayPay)}`,
            `  Allowances:        ${formatPeso(e?.allowances)}`,
            `  Bonuses:           ${formatPeso(e?.bonuses)}`,
            ...(e?.adjustments || [])
                .filter(a => a.adjustmentType === 'earning')
                .map(a => `  ${a.description}: ${formatPeso(a.amount)}`),
            `  ----------------------------------------------------------`,
            `  GROSS PAY:         ${formatPeso(e?.grossPay)}`,
            `------------------------------------------------------------`,
            `DEDUCTIONS BREAKDOWN:`,
            `  Late (${e?.lateMinutes || 0} mins):          -${formatPeso(e?.lateDeduction)}`,
            `  Undertime (${e?.undertimeMinutes || 0} mins):     -${formatPeso(e?.undertimeDeduction)}`,
            `  Absence (${e?.absenceDays || 0} days):        -${formatPeso(e?.absenceDeduction)}`,
            `  Cash Advance:      -${formatPeso(e?.cashAdvanceDeduction)}`,
            `  Other Deductions:  -${formatPeso(e?.otherDeductions)}`,
            ...(e?.adjustments || [])
                .filter(a => a.adjustmentType === 'deduction')
                .map(a => `  ${a.description}: -${formatPeso(a.amount)}`),
            `  ----------------------------------------------------------`,
            `  TOTAL DEDUCTIONS:  -${formatPeso(e?.totalDeductions)}`,
            `============================================================`,
            `  NET TAKE-HOME PAY: ${formatPeso(e?.netPay)}`,
            `============================================================`,
            `This slip is computer generated and valid without signature.`,
            `Report any discrepancy to HR/Admin within 3 business days.`
        ].join('\n');

        const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Payslip_${e?.snapshotEmployeeName?.replace(/\s+/g, '_')}_${p?.description?.replace(/\s+/g, '_') || selectedPayslip.id}.txt`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    if (loading) {
        return (
            <div className="flex-1 h-full flex flex-col items-center justify-center p-8 bg-gray-50/50">
                <div className="w-16 h-16 rounded-2xl bg-amber-100 flex items-center justify-center mb-4 animate-pulse">
                    <FileText className="text-amber-600 animate-bounce" size={32} />
                </div>
                <h3 className="text-base font-bold text-gray-800">Loading Payslips</h3>
                <p className="text-xs text-gray-400 mt-1">Retrieving official salary and remittance records...</p>
            </div>
        );
    }

    return (
        <div className="flex-1 h-full overflow-hidden flex flex-col bg-slate-50/70">
            {/* Custom Print Style */}
            <style>{`
                @media print {
                    body {
                        background: white !important;
                        color: black !important;
                    }
                    /* Hide sidebars, layouts, headers, and buttons */
                    header, aside, nav, button, .print\\:hidden, #sidebar-payslips, #action-toolbar {
                        display: none !important;
                    }
                    /* Ensure print voucher occupies full width */
                    #payslip-print-card {
                        box-shadow: none !important;
                        border: 1px solid #ddd !important;
                        margin: 0 !important;
                        padding: 24px !important;
                        width: 100% !important;
                        max-width: 100% !important;
                        background: white !important;
                    }
                    .print\\:block {
                        display: block !important;
                    }
                }
            `}</style>

            {/* Top Bar */}
            <header className="px-5 py-3.5 bg-white border-b border-gray-200/80 flex items-center justify-between shrink-0 shadow-sm">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-500 to-yellow-400 flex items-center justify-center text-white shadow-md shadow-amber-500/20">
                        <FileText size={20} />
                    </div>
                    <div>
                        <h1 className="text-lg font-bold text-gray-900 leading-tight flex items-center gap-2">
                            My Payslips
                            <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200/60">
                                {payslips.length} Record{payslips.length === 1 ? '' : 's'}
                            </span>
                        </h1>
                        <p className="text-xs text-gray-500 mt-0.5">
                            Official compensation, earnings, and statutory deductions
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2 print:hidden">
                    <button
                        onClick={() => fetchPayslips(true)}
                        disabled={refreshing}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-semibold rounded-xl transition-all disabled:opacity-50"
                        title="Reload payslips from server"
                    >
                        <RefreshCw size={14} className={refreshing ? 'animate-spin text-amber-600' : ''} />
                        <span className="hidden sm:inline">{refreshing ? 'Updating...' : 'Refresh'}</span>
                    </button>
                </div>
            </header>

            {/* Error Notification */}
            {error && (
                <div className="mx-6 mt-4 p-4 rounded-2xl bg-red-50 border border-red-200 text-red-800 text-sm flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                        <AlertCircle size={18} className="text-red-500 shrink-0" />
                        <span>{error}</span>
                    </div>
                    <button
                        onClick={() => fetchPayslips(true)}
                        className="px-3 py-1 bg-red-600 text-white text-xs font-bold rounded-lg hover:bg-red-700"
                    >
                        Retry
                    </button>
                </div>
            )}

            {/* Main Content Layout */}
            <div className="flex-1 overflow-hidden p-4 md:p-6 flex flex-col md:flex-row gap-5">
                
                {/* ── Left Column: Payslip List ── */}
                <div id="sidebar-payslips" className="w-full md:w-80 shrink-0 flex flex-col gap-3 h-full">
                    
                    {/* Search / Filter */}
                    {payslips.length > 1 && (
                        <div className="relative">
                            <input
                                type="text"
                                placeholder="Search by period or date..."
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                                className="w-full pl-3 pr-8 py-2 bg-white border border-gray-200 rounded-xl text-xs text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-400 transition"
                            />
                            {searchQuery && (
                                <button
                                    onClick={() => setSearchQuery('')}
                                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-xs font-bold"
                                >
                                    ✕
                                </button>
                            )}
                        </div>
                    )}

                    {/* Payslips Feed */}
                    {payslips.length === 0 ? (
                        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center bg-white rounded-2xl border border-dashed border-gray-200 shadow-sm">
                            <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-500 flex items-center justify-center mb-3">
                                <Building2 size={24} />
                            </div>
                            <h4 className="font-bold text-sm text-gray-800">No Payslips Yet</h4>
                            <p className="text-xs text-gray-500 mt-1 max-w-[200px]">
                                Your payslip will automatically appear here once management approves and generates payroll.
                            </p>
                            <div className="mt-4 p-2.5 bg-slate-50 rounded-xl text-[11px] text-gray-500 text-left border border-gray-100 flex items-start gap-2">
                                <Info size={14} className="text-amber-500 shrink-0 mt-0.5" />
                                <span>Remember to clock in & out daily so your hours are included in the upcoming cutoff!</span>
                            </div>
                        </div>
                    ) : filteredPayslips.length === 0 ? (
                        <div className="p-8 text-center bg-white rounded-2xl border border-gray-200">
                            <p className="text-xs text-gray-500">No payslips match "{searchQuery}"</p>
                            <button
                                onClick={() => setSearchQuery('')}
                                className="mt-2 text-xs text-amber-600 font-bold hover:underline"
                            >
                                Clear search
                            </button>
                        </div>
                    ) : (
                        <div className="flex-1 overflow-y-auto space-y-2.5 pr-1">
                            {filteredPayslips.map(payslip => {
                                const entry = payslip.payrollEntry;
                                const isSelected = selectedPayslip?.id === payslip.id;
                                const period = entry?.payrollPeriod;

                                return (
                                    <button
                                        key={payslip.id}
                                        onClick={() => setSelectedPayslip(payslip)}
                                        className={`w-full text-left p-3.5 rounded-2xl border transition-all relative overflow-hidden group ${
                                            isSelected
                                                ? 'bg-gradient-to-r from-amber-500/10 via-amber-50/50 to-white border-amber-400 shadow-md shadow-amber-500/5 ring-1 ring-amber-400'
                                                : 'bg-white border-gray-200/80 hover:border-gray-300 hover:shadow-sm'
                                        }`}
                                    >
                                        {/* Status Tag */}
                                        <div className="flex items-center justify-between mb-2">
                                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider flex items-center gap-1 ${
                                                payslip.isSuperseded
                                                    ? 'bg-red-100 text-red-700'
                                                    : 'bg-emerald-100 text-emerald-800'
                                            }`}>
                                                {payslip.isSuperseded ? (
                                                    <>Superseded</>
                                                ) : (
                                                    <>
                                                        <CheckCircle2 size={10} /> Official
                                                    </>
                                                )}
                                            </span>
                                            <span className="text-[10px] text-gray-400 font-medium">
                                                Ref #{payslip.id}
                                            </span>
                                        </div>

                                        {/* Period Title */}
                                        <h4 className={`text-sm font-bold leading-tight ${isSelected ? 'text-amber-950' : 'text-gray-900'}`}>
                                            {period?.description || 'Payroll Period'}
                                        </h4>

                                        {/* Dates */}
                                        <p className="text-[11px] text-gray-500 flex items-center gap-1 mt-1">
                                            <Calendar size={12} className="text-gray-400" />
                                            {formatDate(period?.periodStart)} — {formatDate(period?.periodEnd)}
                                        </p>

                                        {/* Net Pay Callout */}
                                        <div className="mt-3 pt-2.5 border-t border-gray-100 flex items-end justify-between">
                                            <div>
                                                <span className="text-[10px] uppercase font-bold text-gray-400 block tracking-wider">
                                                    Net Take-Home
                                                </span>
                                                <span className={`text-base font-extrabold ${isSelected ? 'text-amber-600' : 'text-gray-900'}`}>
                                                    {formatPeso(entry?.netPay)}
                                                </span>
                                            </div>
                                            <div className="text-right">
                                                <span className="text-[10px] text-gray-400 font-medium block">
                                                    {parseFloat(entry?.regularHours || '0').toFixed(0)}h Reg
                                                    {parseFloat(entry?.overtimeHours || '0') > 0 && ` + ${parseFloat(entry?.overtimeHours || '0').toFixed(0)}h OT`}
                                                </span>
                                            </div>
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* ── Right Column: Selected Payslip Document Stage ── */}
                <div className="flex-1 min-w-0 h-full flex flex-col bg-white rounded-3xl border border-gray-200/80 shadow-sm overflow-hidden">
                    {selectedPayslip ? (
                        <>
                            {/* Action Toolbar */}
                            <div id="action-toolbar" className="px-6 py-3 border-b border-gray-100 bg-slate-50/70 flex flex-wrap items-center justify-between gap-3 shrink-0 print:hidden">
                                <div className="flex items-center gap-2">
                                    <span className="text-xs font-semibold text-gray-600">
                                        Payslip Document
                                    </span>
                                    <span className="text-[11px] px-2 py-0.5 rounded-md bg-gray-200/70 text-gray-700 font-mono font-medium">
                                        PAY-{selectedPayslip.id.toString().padStart(5, '0')}
                                    </span>
                                </div>

                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={handleCopySummary}
                                        className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 text-xs font-bold rounded-xl shadow-xs transition"
                                        title="Copy summary text"
                                    >
                                        {copied ? (
                                            <>
                                                <Check size={14} className="text-emerald-600" />
                                                <span className="text-emerald-700">Copied!</span>
                                            </>
                                        ) : (
                                            <>
                                                <Copy size={14} className="text-gray-500" />
                                                <span>Copy Summary</span>
                                            </>
                                        )}
                                    </button>

                                    <button
                                        onClick={handleDownloadReceipt}
                                        className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 text-xs font-bold rounded-xl shadow-xs transition"
                                        title="Download text receipt"
                                    >
                                        <Download size={14} className="text-gray-500" />
                                        <span>Download Slip</span>
                                    </button>

                                    <button
                                        onClick={handlePrint}
                                        className="flex items-center gap-1.5 px-4 py-1.5 bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold rounded-xl shadow-sm shadow-amber-500/20 transition"
                                    >
                                        <Printer size={14} />
                                        <span>Print Official Voucher</span>
                                    </button>
                                </div>
                            </div>

                            {/* Scrollable Document Area */}
                            <div className="flex-1 overflow-y-auto p-6 md:p-8">
                                <div
                                    id="payslip-print-card"
                                    className="max-w-3xl mx-auto bg-white rounded-2xl border border-gray-200 p-6 md:p-8 shadow-xs"
                                >
                                    {/* Voucher Formal Header */}
                                    <div className="flex flex-col sm:flex-row justify-between items-start gap-4 pb-6 border-b border-gray-200">
                                        <div className="flex items-start gap-3">
                                            <img
                                                src="/logo.jpg"
                                                alt="JAPZ Logo"
                                                className="w-12 h-12 rounded-xl border border-gray-200 object-cover shadow-xs"
                                                onError={(e) => {
                                                    // Fallback icon if logo not loaded
                                                    e.currentTarget.style.display = 'none';
                                                }}
                                            />
                                            <div>
                                                <h2 className="text-xl font-black text-gray-900 tracking-tight leading-none">
                                                    JAPZ RESTAURANT & POS
                                                </h2>
                                                <p className="text-[11px] font-bold text-amber-600 uppercase tracking-widest mt-1">
                                                    Official Payroll Remittance Advice
                                                </p>
                                                <p className="text-[11px] text-gray-400 mt-0.5">
                                                    Ref ID: #PAY-{selectedPayslip.id.toString().padStart(6, '0')} • Generated on {formatDate(selectedPayslip.generatedAt)}
                                                </p>
                                            </div>
                                        </div>

                                        <div className="sm:text-right">
                                            <span className={`inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider ${
                                                selectedPayslip.isSuperseded
                                                    ? 'bg-red-100 text-red-700'
                                                    : 'bg-emerald-100 text-emerald-800'
                                            }`}>
                                                <ShieldCheck size={14} />
                                                {selectedPayslip.isSuperseded ? 'Superseded' : 'Verified Official'}
                                            </span>
                                            <p className="text-[11px] text-gray-500 mt-1 font-medium">
                                                Status: {selectedPayslip.payrollEntry?.status || 'APPROVED'}
                                            </p>
                                        </div>
                                    </div>

                                    {/* Employee Snapshot Details */}
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 my-6 p-4 rounded-xl bg-slate-50/80 border border-gray-200/70 text-xs">
                                        <div>
                                            <span className="text-[10px] uppercase font-bold text-gray-400 block tracking-wider">
                                                Employee Name
                                            </span>
                                            <p className="font-extrabold text-gray-900 mt-0.5 text-sm">
                                                {selectedPayslip.payrollEntry?.snapshotEmployeeName || 'N/A'}
                                            </p>
                                            <span className="text-[11px] text-amber-700 font-semibold uppercase">
                                                {selectedPayslip.payrollEntry?.snapshotRole || 'Staff'}
                                            </span>
                                        </div>

                                        <div>
                                            <span className="text-[10px] uppercase font-bold text-gray-400 block tracking-wider">
                                                Base Hourly Rate
                                            </span>
                                            <p className="font-extrabold text-gray-900 mt-0.5 text-sm">
                                                {formatPeso(selectedPayslip.payrollEntry?.snapshotHourlyRate)}
                                                <span className="text-[10px] font-normal text-gray-500">/hr</span>
                                            </p>
                                            <span className="text-[10px] text-gray-400 block mt-0.5">
                                                Standard 8h Shift
                                            </span>
                                        </div>

                                        <div>
                                            <span className="text-[10px] uppercase font-bold text-gray-400 block tracking-wider">
                                                Payroll Cut-Off
                                            </span>
                                            <p className="font-extrabold text-gray-900 mt-0.5 text-xs">
                                                {formatDate(selectedPayslip.payrollEntry?.payrollPeriod?.periodStart)}
                                            </p>
                                            <p className="text-[11px] text-gray-500">
                                                to {formatDate(selectedPayslip.payrollEntry?.payrollPeriod?.periodEnd)}
                                            </p>
                                        </div>

                                        <div>
                                            <span className="text-[10px] uppercase font-bold text-gray-400 block tracking-wider">
                                                Total Hours Rendered
                                            </span>
                                            <p className="font-extrabold text-gray-900 mt-0.5 text-sm">
                                                {(
                                                    parseFloat(selectedPayslip.payrollEntry?.regularHours || '0') +
                                                    parseFloat(selectedPayslip.payrollEntry?.overtimeHours || '0')
                                                ).toFixed(1)} hrs
                                            </p>
                                            <span className="text-[10px] text-gray-500 block mt-0.5">
                                                {parseFloat(selectedPayslip.payrollEntry?.regularHours || '0').toFixed(1)}h reg • {parseFloat(selectedPayslip.payrollEntry?.overtimeHours || '0').toFixed(1)}h OT
                                            </span>
                                        </div>
                                    </div>

                                    {/* Financial Highlight Cards */}
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-6">
                                        <div className="p-4 rounded-xl bg-emerald-50/70 border border-emerald-200/80">
                                            <div className="flex items-center justify-between">
                                                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800">
                                                    Gross Earnings
                                                </span>
                                                <TrendingUp size={16} className="text-emerald-600" />
                                            </div>
                                            <p className="text-xl font-extrabold text-emerald-900 mt-1">
                                                {formatPeso(selectedPayslip.payrollEntry?.grossPay)}
                                            </p>
                                            <span className="text-[10px] text-emerald-700/80 block mt-0.5">
                                                Base + Overtime + Allowances
                                            </span>
                                        </div>

                                        <div className="p-4 rounded-xl bg-rose-50/70 border border-rose-200/80">
                                            <div className="flex items-center justify-between">
                                                <span className="text-[10px] font-bold uppercase tracking-wider text-rose-800">
                                                    Total Deductions
                                                </span>
                                                <TrendingDown size={16} className="text-rose-600" />
                                            </div>
                                            <p className="text-xl font-extrabold text-rose-900 mt-1">
                                                -{formatPeso(selectedPayslip.payrollEntry?.totalDeductions)}
                                            </p>
                                            <span className="text-[10px] text-rose-700/80 block mt-0.5">
                                                Lates, Absences & Advances
                                            </span>
                                        </div>

                                        <div className="p-4 rounded-xl bg-gradient-to-tr from-amber-500 via-amber-400 to-yellow-400 text-white shadow-md shadow-amber-500/10">
                                            <div className="flex items-center justify-between">
                                                <span className="text-[10px] font-bold uppercase tracking-wider text-amber-100">
                                                    Net Take-Home Pay
                                                </span>
                                                <Sparkles size={16} className="text-yellow-100" />
                                            </div>
                                            <p className="text-2xl font-black mt-1 tracking-tight text-white drop-shadow-xs">
                                                {formatPeso(selectedPayslip.payrollEntry?.netPay)}
                                            </p>
                                            <span className="text-[10px] text-amber-100/90 block mt-0.5 font-medium">
                                                Official Net Payable
                                            </span>
                                        </div>
                                    </div>

                                    {/* Itemized Grid: Earnings vs Deductions */}
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 my-6">
                                        
                                        {/* Left Side: Earnings Breakdown */}
                                        <div className="border border-gray-200/80 rounded-xl p-4 bg-white">
                                            <div className="flex items-center justify-between pb-2 mb-3 border-b border-gray-100">
                                                <h3 className="text-xs font-bold uppercase tracking-wider text-gray-800 flex items-center gap-1.5">
                                                    <DollarSign size={14} className="text-emerald-500" />
                                                    Itemized Earnings
                                                </h3>
                                                <span className="text-[10px] font-bold text-gray-400 uppercase">Amount</span>
                                            </div>

                                            <div className="space-y-2 text-xs">
                                                <div className="flex justify-between items-center py-1">
                                                    <div>
                                                        <span className="font-semibold text-gray-800">Basic Regular Pay</span>
                                                        <span className="text-[10px] text-gray-400 block">
                                                            {parseFloat(selectedPayslip.payrollEntry.regularHours).toFixed(1)} hrs @ {formatPeso(selectedPayslip.payrollEntry.snapshotHourlyRate)}/hr
                                                        </span>
                                                    </div>
                                                    <span className="font-bold text-gray-900">
                                                        {formatPeso(selectedPayslip.payrollEntry.basicPay)}
                                                    </span>
                                                </div>

                                                {parseFloat(selectedPayslip.payrollEntry.overtimePay) > 0 && (
                                                    <div className="flex justify-between items-center py-1 border-t border-gray-50">
                                                        <div>
                                                            <span className="font-semibold text-gray-800">Overtime Premium</span>
                                                            <span className="text-[10px] text-gray-400 block">
                                                                {parseFloat(selectedPayslip.payrollEntry.overtimeHours).toFixed(1)} OT hrs
                                                            </span>
                                                        </div>
                                                        <span className="font-bold text-gray-900">
                                                            {formatPeso(selectedPayslip.payrollEntry.overtimePay)}
                                                        </span>
                                                    </div>
                                                )}

                                                {parseFloat(selectedPayslip.payrollEntry.holidayPay) > 0 && (
                                                    <div className="flex justify-between items-center py-1 border-t border-gray-50">
                                                        <span className="font-semibold text-gray-800">Holiday Pay</span>
                                                        <span className="font-bold text-gray-900">
                                                            {formatPeso(selectedPayslip.payrollEntry.holidayPay)}
                                                        </span>
                                                    </div>
                                                )}

                                                {parseFloat(selectedPayslip.payrollEntry.restDayPay) > 0 && (
                                                    <div className="flex justify-between items-center py-1 border-t border-gray-50">
                                                        <span className="font-semibold text-gray-800">Rest Day Work</span>
                                                        <span className="font-bold text-gray-900">
                                                            {formatPeso(selectedPayslip.payrollEntry.restDayPay)}
                                                        </span>
                                                    </div>
                                                )}

                                                {parseFloat(selectedPayslip.payrollEntry.allowances) > 0 && (
                                                    <div className="flex justify-between items-center py-1 border-t border-gray-50">
                                                        <span className="font-semibold text-gray-800">Meal / Daily Allowance</span>
                                                        <span className="font-bold text-gray-900">
                                                            {formatPeso(selectedPayslip.payrollEntry.allowances)}
                                                        </span>
                                                    </div>
                                                )}

                                                {parseFloat(selectedPayslip.payrollEntry.bonuses) > 0 && (
                                                    <div className="flex justify-between items-center py-1 border-t border-gray-50">
                                                        <span className="font-semibold text-gray-800">Performance Bonus</span>
                                                        <span className="font-bold text-gray-900">
                                                            {formatPeso(selectedPayslip.payrollEntry.bonuses)}
                                                        </span>
                                                    </div>
                                                )}

                                                {(selectedPayslip.payrollEntry.adjustments || [])
                                                    .filter(a => a.adjustmentType === 'earning')
                                                    .map((adj, i) => (
                                                        <div key={i} className="flex justify-between items-center py-1 border-t border-gray-50">
                                                            <div>
                                                                <span className="font-semibold text-emerald-800">{adj.description}</span>
                                                                {adj.reason && <span className="text-[10px] text-gray-400 block">{adj.reason}</span>}
                                                            </div>
                                                            <span className="font-bold text-emerald-700">+{formatPeso(adj.amount)}</span>
                                                        </div>
                                                    ))}
                                            </div>

                                            <div className="mt-4 pt-3 border-t border-gray-200 flex justify-between items-center font-bold text-sm bg-slate-50/70 p-2.5 rounded-lg">
                                                <span className="text-gray-900">Total Gross Earnings</span>
                                                <span className="text-emerald-700">{formatPeso(selectedPayslip.payrollEntry.grossPay)}</span>
                                            </div>
                                        </div>

                                        {/* Right Side: Deductions Breakdown */}
                                        <div className="border border-gray-200/80 rounded-xl p-4 bg-white">
                                            <div className="flex items-center justify-between pb-2 mb-3 border-b border-gray-100">
                                                <h3 className="text-xs font-bold uppercase tracking-wider text-gray-800 flex items-center gap-1.5">
                                                    <Clock size={14} className="text-rose-500" />
                                                    Itemized Deductions
                                                </h3>
                                                <span className="text-[10px] font-bold text-gray-400 uppercase">Deduction</span>
                                            </div>

                                            <div className="space-y-2 text-xs">
                                                {parseFloat(selectedPayslip.payrollEntry.lateDeduction) > 0 ? (
                                                    <div className="flex justify-between items-center py-1">
                                                        <div>
                                                            <span className="font-semibold text-gray-800">Tardiness / Late Penalty</span>
                                                            <span className="text-[10px] text-gray-400 block">
                                                                {selectedPayslip.payrollEntry.lateMinutes} total late minutes
                                                            </span>
                                                        </div>
                                                        <span className="font-bold text-rose-600">
                                                            -{formatPeso(selectedPayslip.payrollEntry.lateDeduction)}
                                                        </span>
                                                    </div>
                                                ) : null}

                                                {parseFloat(selectedPayslip.payrollEntry.undertimeDeduction) > 0 ? (
                                                    <div className="flex justify-between items-center py-1 border-t border-gray-50">
                                                        <div>
                                                            <span className="font-semibold text-gray-800">Undertime Penalty</span>
                                                            <span className="text-[10px] text-gray-400 block">
                                                                {selectedPayslip.payrollEntry.undertimeMinutes} undertime minutes
                                                            </span>
                                                        </div>
                                                        <span className="font-bold text-rose-600">
                                                            -{formatPeso(selectedPayslip.payrollEntry.undertimeDeduction)}
                                                        </span>
                                                    </div>
                                                ) : null}

                                                {parseFloat(selectedPayslip.payrollEntry.absenceDeduction) > 0 ? (
                                                    <div className="flex justify-between items-center py-1 border-t border-gray-50">
                                                        <div>
                                                            <span className="font-semibold text-gray-800">Absences Without Leave</span>
                                                            <span className="text-[10px] text-gray-400 block">
                                                                {selectedPayslip.payrollEntry.absenceDays} day(s) absent
                                                            </span>
                                                        </div>
                                                        <span className="font-bold text-rose-600">
                                                            -{formatPeso(selectedPayslip.payrollEntry.absenceDeduction)}
                                                        </span>
                                                    </div>
                                                ) : null}

                                                {parseFloat(selectedPayslip.payrollEntry.cashAdvanceDeduction) > 0 ? (
                                                    <div className="flex justify-between items-center py-1 border-t border-gray-50">
                                                        <span className="font-semibold text-gray-800">Cash Advance Amortization</span>
                                                        <span className="font-bold text-rose-600">
                                                            -{formatPeso(selectedPayslip.payrollEntry.cashAdvanceDeduction)}
                                                        </span>
                                                    </div>
                                                ) : null}

                                                {parseFloat(selectedPayslip.payrollEntry.otherDeductions) > 0 ? (
                                                    <div className="flex justify-between items-center py-1 border-t border-gray-50">
                                                        <span className="font-semibold text-gray-800">Other Deductions</span>
                                                        <span className="font-bold text-rose-600">
                                                            -{formatPeso(selectedPayslip.payrollEntry.otherDeductions)}
                                                        </span>
                                                    </div>
                                                ) : null}

                                                {(selectedPayslip.payrollEntry.adjustments || [])
                                                    .filter(a => a.adjustmentType === 'deduction')
                                                    .map((adj, i) => (
                                                        <div key={i} className="flex justify-between items-center py-1 border-t border-gray-50">
                                                            <div>
                                                                <span className="font-semibold text-rose-800">{adj.description}</span>
                                                                {adj.reason && <span className="text-[10px] text-gray-400 block">{adj.reason}</span>}
                                                            </div>
                                                            <span className="font-bold text-rose-600">-{formatPeso(adj.amount)}</span>
                                                        </div>
                                                    ))}

                                                {parseFloat(selectedPayslip.payrollEntry.totalDeductions) === 0 && (
                                                    <div className="py-4 text-center text-gray-400 italic">
                                                        ✓ Perfect attendance — No deductions applied for this pay cycle.
                                                    </div>
                                                )}
                                            </div>

                                            <div className="mt-4 pt-3 border-t border-gray-200 flex justify-between items-center font-bold text-sm bg-slate-50/70 p-2.5 rounded-lg">
                                                <span className="text-gray-900">Total Deductions</span>
                                                <span className="text-rose-600">-{formatPeso(selectedPayslip.payrollEntry.totalDeductions)}</span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Visual Math Reconciliation Equation */}
                                    <div className="p-4 rounded-xl bg-amber-50/60 border border-amber-200/60 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
                                        <div className="flex items-center gap-2">
                                            <div className="w-6 h-6 rounded-lg bg-amber-500 text-white flex items-center justify-center font-bold text-xs">
                                                ₱
                                            </div>
                                            <div className="font-semibold text-amber-950">
                                                Net Pay Computation:
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2 text-gray-700 font-mono text-[11px] sm:text-xs">
                                            <span>Gross ({formatPeso(selectedPayslip.payrollEntry.grossPay)})</span>
                                            <span className="text-gray-400 font-sans font-bold">—</span>
                                            <span className="text-rose-600">Deductions ({formatPeso(selectedPayslip.payrollEntry.totalDeductions)})</span>
                                            <span className="text-gray-400 font-sans font-bold">=</span>
                                            <span className="font-black text-amber-600 bg-white px-2 py-0.5 rounded-md border border-amber-200">
                                                {formatPeso(selectedPayslip.payrollEntry.netPay)}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Admin Notes if present */}
                                    {selectedPayslip.payrollEntry.notes && (
                                        <div className="mt-4 p-3 bg-yellow-50/50 rounded-xl border border-yellow-100 text-xs text-yellow-900">
                                            <span className="font-bold uppercase tracking-wider text-[10px] text-yellow-700 block mb-1">
                                                Payroll Notes from Admin:
                                            </span>
                                            {selectedPayslip.payrollEntry.notes}
                                        </div>
                                    )}

                                    {/* Legal & Disclaimers Footer */}
                                    <div className="mt-8 pt-6 border-t border-dashed border-gray-200 text-[10px] text-gray-400 space-y-4">
                                        <p className="leading-relaxed">
                                            NOTICE: This payslip voucher is electronically generated from the JAPZ POS Payroll System. 
                                            All computations adhere to national labor guidelines, overtime rates, and company compensation policies. 
                                            For discrepancies or questions regarding this pay slip, please submit a written review request to the branch manager within 72 hours of issuance.
                                        </p>

                                        {/* Physical Signature lines for Printout Mode */}
                                        <div className="hidden print:grid grid-cols-2 gap-12 pt-8 text-black">
                                            <div className="border-t border-black pt-1">
                                                <p className="font-bold text-xs uppercase">Prepared & Approved By</p>
                                                <p className="text-[10px] text-gray-600">Branch Management / Payroll Officer</p>
                                            </div>
                                            <div className="border-t border-black pt-1">
                                                <p className="font-bold text-xs uppercase">Received & Acknowledged By</p>
                                                <p className="text-[10px] text-gray-600">{selectedPayslip.payrollEntry.snapshotEmployeeName} (Employee Signature / Date)</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </>
                    ) : (
                        <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-gray-400">
                            <FileText size={48} className="text-gray-200 mb-3" />
                            <p className="font-bold text-sm text-gray-700">Select a Payslip</p>
                            <p className="text-xs text-gray-400 mt-1">Choose a pay period from the left menu to view detailed compensation info.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
