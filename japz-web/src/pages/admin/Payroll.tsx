import { useCallback, useEffect, useState } from 'react';
import {
    Wallet, CalendarRange, Users, Clock, Plus, RefreshCw, Lock, Trash2,
    AlertTriangle, ChevronLeft, Save, Percent, X,
} from 'lucide-react';
import { payrollAPI } from '../../services/api';

interface Period {
    id: number; label: string; startDate: string; endDate: string;
    status: 'draft' | 'finalized'; finalizedAt: string | null;
    payslipCount: number; totalNet: number;
}
interface Deduction { label: string; rate: number; amount: number }
interface Payslip {
    id: number; userId: number; employeeName: string;
    payType: 'hourly' | 'monthly'; payRate: number;
    daysWorked: number; regularHours: number; overtimeHours: number;
    basicPay: number; overtimePay: number; grossPay: number;
    deductions: Deduction[];
    otherDeductionLabel: string | null; otherDeductionAmount: number;
    totalDeductions: number; netPay: number; notes: string | null;
}
interface StaffRow {
    id: number; name: string; email: string; role: string;
    payType: 'hourly' | 'monthly'; payRate: number;
}
interface ShiftRow {
    id: number; userId: number; employeeName: string; workDate: string;
    clockInAt: string; clockOutAt: string | null; minutesWorked: number | null;
    hoursWorked: number | null; closedByAdmin: boolean;
}

const peso = (n: number) => `₱${Number(n).toFixed(2)}`;
const pct = (n: number) => `${(Number(n) * 100).toFixed(2)}%`;
const clock = (iso: string | null) =>
    iso ? new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—';
const day = (d: string) => new Date(d + 'T00:00:00').toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });

export default function Payroll() {
    const [tab, setTab] = useState<'periods' | 'rates' | 'attendance'>('periods');
    const [error, setError] = useState<string | null>(null);
    const [notice, setNotice] = useState<string | null>(null);

    const [periods, setPeriods] = useState<Period[]>([]);
    const [openPeriod, setOpenPeriod] = useState<number | null>(null);
    const [detail, setDetail] = useState<{ period: Period; payslips: Payslip[]; totals: { gross: number; deductions: number; net: number }; ratesConfigured: boolean } | null>(null);

    const [staff, setStaff] = useState<StaffRow[]>([]);
    const [shifts, setShifts] = useState<ShiftRow[]>([]);
    const [settings, setSettings] = useState<Record<string, number | boolean> | null>(null);

    const [showNew, setShowNew] = useState(false);
    const [form, setForm] = useState({ label: '', startDate: '', endDate: '' });
    const [busy, setBusy] = useState(false);
    const [editSlip, setEditSlip] = useState<Payslip | null>(null);
    const [slipForm, setSlipForm] = useState({ label: '', amount: '' });

    const say = (msg: string) => { setNotice(msg); setTimeout(() => setNotice(null), 3500); };
    const fail = (err: any, fallback: string) => setError(err?.response?.data?.error || fallback);

    const loadPeriods = useCallback(async () => {
        try { setPeriods((await payrollAPI.periods()).data.periods); }
        catch (err) { fail(err, 'Could not load pay periods.'); }
    }, []);

    const loadDetail = useCallback(async (id: number) => {
        try { setDetail((await payrollAPI.period(id)).data); }
        catch (err) { fail(err, 'Could not load that period.'); }
    }, []);

    useEffect(() => { loadPeriods(); }, [loadPeriods]);
    useEffect(() => { if (openPeriod) loadDetail(openPeriod); }, [openPeriod, loadDetail]);

    useEffect(() => {
        if (tab !== 'rates') return;
        payrollAPI.staff().then(r => setStaff(r.data.staff)).catch(e => fail(e, 'Could not load staff.'));
        payrollAPI.getSettings().then(r => setSettings(r.data.settings)).catch(e => fail(e, 'Could not load settings.'));
    }, [tab]);

    useEffect(() => {
        if (tab !== 'attendance') return;
        payrollAPI.attendance().then(r => setShifts(r.data.logs)).catch(e => fail(e, 'Could not load attendance.'));
    }, [tab]);

    const createPeriod = async () => {
        setBusy(true); setError(null);
        try {
            await payrollAPI.createPeriod(form);
            setShowNew(false);
            setForm({ label: '', startDate: '', endDate: '' });
            await loadPeriods();
            say('Pay period created.');
        } catch (err) { fail(err, 'Could not create the period.'); }
        finally { setBusy(false); }
    };

    const act = async (fn: () => Promise<unknown>, msg: string) => {
        setBusy(true); setError(null);
        try {
            await fn();
            await loadPeriods();
            if (openPeriod) await loadDetail(openPeriod);
            say(msg);
        } catch (err) { fail(err, 'That did not work.'); }
        finally { setBusy(false); }
    };

    const saveSlip = async () => {
        if (!editSlip) return;
        setBusy(true); setError(null);
        try {
            await payrollAPI.updatePayslip(editSlip.id, {
                otherDeductionLabel: slipForm.label || null,
                otherDeductionAmount: Number(slipForm.amount) || 0,
            });
            setEditSlip(null);
            if (openPeriod) await loadDetail(openPeriod);
            say('Payslip updated.');
        } catch (err) { fail(err, 'Could not update the payslip.'); }
        finally { setBusy(false); }
    };

    const saveRates = async () => {
        if (!settings) return;
        setBusy(true); setError(null);
        try {
            await payrollAPI.saveSettings({
                standardHoursPerDay: Number(settings.standardHoursPerDay),
                overtimeMultiplier: Number(settings.overtimeMultiplier),
                monthlyWorkingDays: Number(settings.monthlyWorkingDays),
                // Stored as fractions; the form works in percent.
                sssRate: Number(settings.sssRate) * 100,
                philhealthRate: Number(settings.philhealthRate) * 100,
                pagibigRate: Number(settings.pagibigRate) * 100,
                taxRate: Number(settings.taxRate) * 100,
            });
            setSettings({ ...settings, ratesConfigured: true });
            say('Rates saved.');
        } catch (err) { fail(err, 'Could not save the rates.'); }
        finally { setBusy(false); }
    };

    const saveRate = async (row: StaffRow) => {
        setBusy(true); setError(null);
        try {
            await payrollAPI.setRate(row.id, row.payType, row.payRate);
            say(`${row.name}'s rate saved.`);
        } catch (err) { fail(err, 'Could not save the rate.'); }
        finally { setBusy(false); }
    };

    const TABS = [
        { key: 'periods' as const, label: 'Pay periods', icon: CalendarRange },
        { key: 'rates' as const, label: 'Rates & pay', icon: Percent },
        { key: 'attendance' as const, label: 'Attendance', icon: Clock },
    ];

    // ---------- period detail ----------
    if (openPeriod && detail) {
        const locked = detail.period.status === 'finalized';
        return (
            <div className="p-4 md:p-6 max-w-6xl mx-auto">
                <button onClick={() => { setOpenPeriod(null); setDetail(null); }} className="flex items-center gap-1 text-sm text-slate-500 mb-4">
                    <ChevronLeft size={16} /> All periods
                </button>

                <div className="flex flex-wrap items-center gap-3 mb-4">
                    <div>
                        <h1 className="text-2xl font-extrabold text-slate-900">{detail.period.label}</h1>
                        <p className="text-sm text-slate-500">{day(detail.period.startDate)} – {day(detail.period.endDate)}</p>
                    </div>
                    <span className={`text-[10px] font-extrabold rounded-full px-3 py-1 ${
                        locked ? 'bg-slate-900 text-white' : 'bg-amber-100 text-amber-700'
                    }`}>
                        {locked ? 'FINALIZED' : 'DRAFT'}
                    </span>
                    {!locked && (
                        <div className="ml-auto flex gap-2">
                            <button onClick={() => act(() => payrollAPI.generate(detail.period.id), 'Payslips regenerated from attendance.')}
                                disabled={busy}
                                className="flex items-center gap-2 rounded-xl border border-gray-200 px-4 py-2 text-sm font-bold text-slate-700 disabled:opacity-50">
                                <RefreshCw size={15} /> Generate
                            </button>
                            <button onClick={() => act(() => payrollAPI.finalize(detail.period.id), 'Period finalized and locked.')}
                                disabled={busy || detail.payslips.length === 0}
                                className="flex items-center gap-2 rounded-xl bg-slate-900 text-white px-4 py-2 text-sm font-bold disabled:opacity-50">
                                <Lock size={15} /> Finalize
                            </button>
                        </div>
                    )}
                </div>

                {error && <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm mb-3">{error}</div>}
                {notice && <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-xl px-4 py-3 text-sm mb-3">{notice}</div>}

                {!detail.ratesConfigured && (
                    <div className="bg-amber-50 border border-amber-300 rounded-2xl px-4 py-3 mb-4 flex gap-3">
                        <AlertTriangle size={18} className="text-amber-600 shrink-0 mt-0.5" />
                        <div className="text-sm text-amber-900">
                            <p className="font-bold">Contribution rates are not set.</p>
                            <p>Deductions compute as ₱0.00 until you enter your SSS, PhilHealth, Pag-IBIG and tax rates under <b>Rates &amp; pay</b>. This period cannot be finalized until then.</p>
                        </div>
                    </div>
                )}

                <div className="grid grid-cols-3 gap-3 mb-4">
                    {[['Gross', detail.totals.gross], ['Deductions', detail.totals.deductions], ['Net pay', detail.totals.net]].map(([k, v]) => (
                        <div key={k as string} className="bg-white rounded-2xl border border-gray-100 p-4">
                            <p className="text-xs text-slate-500">{k as string}</p>
                            <p className="text-xl font-extrabold text-slate-900">{peso(v as number)}</p>
                        </div>
                    ))}
                </div>

                {detail.payslips.length === 0 ? (
                    <div className="bg-white rounded-2xl border border-gray-100 p-10 text-center">
                        <Wallet size={34} className="mx-auto text-slate-300 mb-3" />
                        <p className="font-bold text-slate-900">No payslips yet</p>
                        <p className="text-sm text-slate-500 mt-1">Press <b>Generate</b> to build them from recorded attendance.</p>
                    </div>
                ) : (
                    <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm min-w-[820px]">
                                <thead className="bg-gray-50 text-left text-xs text-slate-500">
                                    <tr>
                                        <th className="px-4 py-3">Employee</th>
                                        <th className="px-4 py-3">Days</th>
                                        <th className="px-4 py-3">Hours</th>
                                        <th className="px-4 py-3">OT</th>
                                        <th className="px-4 py-3 text-right">Gross</th>
                                        <th className="px-4 py-3 text-right">Deductions</th>
                                        <th className="px-4 py-3 text-right">Net</th>
                                        <th className="px-4 py-3" />
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {detail.payslips.map(p => (
                                        <tr key={p.id}>
                                            <td className="px-4 py-3">
                                                <p className="font-bold text-slate-900">{p.employeeName}</p>
                                                <p className="text-xs text-slate-500">{peso(p.payRate)} / {p.payType === 'hourly' ? 'hr' : 'mo'}</p>
                                            </td>
                                            <td className="px-4 py-3 text-slate-600">{p.daysWorked}</td>
                                            <td className="px-4 py-3 text-slate-600">{p.regularHours}</td>
                                            <td className="px-4 py-3 text-slate-600">{p.overtimeHours || '—'}</td>
                                            <td className="px-4 py-3 text-right font-semibold">{peso(p.grossPay)}</td>
                                            <td className="px-4 py-3 text-right text-slate-600">
                                                {peso(p.totalDeductions)}
                                                {p.otherDeductionLabel && (
                                                    <span className="block text-[10px] text-slate-400">incl. {p.otherDeductionLabel}</span>
                                                )}
                                            </td>
                                            <td className="px-4 py-3 text-right font-extrabold text-slate-900">{peso(p.netPay)}</td>
                                            <td className="px-4 py-3 text-right">
                                                {!locked && (
                                                    <button onClick={() => { setEditSlip(p); setSlipForm({ label: p.otherDeductionLabel || '', amount: String(p.otherDeductionAmount || '') }); }}
                                                        className="text-xs font-bold text-slate-500 underline underline-offset-4">
                                                        Adjust
                                                    </button>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {detail.payslips[0]?.deductions?.length > 0 && (
                    <p className="text-xs text-slate-400 mt-3">
                        Deduction rates applied: {detail.payslips[0].deductions.map(d => `${d.label} ${pct(d.rate)}`).join(' · ')}.
                        These are snapshot on each payslip, so changing them later will not alter payslips already issued.
                    </p>
                )}

                {editSlip && (
                    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={() => setEditSlip(null)}>
                        <div className="bg-white rounded-3xl w-full max-w-sm p-5" onClick={e => e.stopPropagation()}>
                            <div className="flex items-center justify-between mb-4">
                                <p className="font-extrabold text-slate-900">Adjust {editSlip.employeeName}</p>
                                <button onClick={() => setEditSlip(null)} aria-label="Close"><X size={18} className="text-slate-500" /></button>
                            </div>
                            <p className="text-xs text-slate-500 mb-3">Gross {peso(editSlip.grossPay)}. Use this for cash advances or other one-off deductions.</p>
                            <input value={slipForm.label} onChange={e => setSlipForm(s => ({ ...s, label: e.target.value }))}
                                placeholder="Reason (e.g. Cash advance)"
                                className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm mb-2" />
                            <input value={slipForm.amount} onChange={e => setSlipForm(s => ({ ...s, amount: e.target.value }))}
                                type="number" min="0" placeholder="Amount"
                                className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm mb-4" />
                            <button onClick={saveSlip} disabled={busy}
                                className="w-full rounded-2xl bg-brand text-slate-900 font-extrabold py-3 disabled:opacity-50">
                                Save
                            </button>
                        </div>
                    </div>
                )}
            </div>
        );
    }

    // ---------- list / tabs ----------
    return (
        <div className="p-4 md:p-6 max-w-6xl mx-auto">
            <div className="flex items-center gap-3 mb-1">
                <Wallet size={22} className="text-slate-700" />
                <h1 className="text-2xl font-extrabold text-slate-900">Payroll</h1>
            </div>
            <p className="text-sm text-slate-500 mb-5">Attendance feeds pay periods, which produce payslips.</p>

            <div className="flex gap-2 mb-5 overflow-x-auto">
                {TABS.map(({ key, label, icon: Icon }) => (
                    <button key={key} onClick={() => setTab(key)}
                        className={`flex items-center gap-2 rounded-full px-4 py-2 text-sm font-bold whitespace-nowrap transition ${
                            tab === key ? 'bg-slate-900 text-white' : 'bg-white border border-gray-200 text-slate-600'
                        }`}>
                        <Icon size={15} /> {label}
                    </button>
                ))}
            </div>

            {error && <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm mb-3">{error}</div>}
            {notice && <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-xl px-4 py-3 text-sm mb-3">{notice}</div>}

            {tab === 'periods' && (
                <>
                    <button onClick={() => setShowNew(true)}
                        className="flex items-center gap-2 rounded-xl bg-brand text-slate-900 px-4 py-2.5 text-sm font-extrabold mb-4">
                        <Plus size={16} /> New pay period
                    </button>

                    {periods.length === 0 ? (
                        <div className="bg-white rounded-2xl border border-gray-100 p-10 text-center">
                            <CalendarRange size={34} className="mx-auto text-slate-300 mb-3" />
                            <p className="font-bold text-slate-900">No pay periods yet</p>
                            <p className="text-sm text-slate-500 mt-1">Create one covering the dates you want to pay for.</p>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {periods.map(p => (
                                <div key={p.id} className="bg-white rounded-2xl border border-gray-100 p-4 flex items-center gap-3">
                                    <button onClick={() => setOpenPeriod(p.id)} className="flex-1 text-left min-w-0">
                                        <div className="flex items-center gap-2">
                                            <p className="font-bold text-slate-900 truncate">{p.label}</p>
                                            <span className={`text-[9px] font-extrabold rounded-full px-2 py-0.5 ${
                                                p.status === 'finalized' ? 'bg-slate-900 text-white' : 'bg-amber-100 text-amber-700'
                                            }`}>{p.status === 'finalized' ? 'FINALIZED' : 'DRAFT'}</span>
                                        </div>
                                        <p className="text-xs text-slate-500">
                                            {day(p.startDate)} – {day(p.endDate)} · {p.payslipCount} payslip{p.payslipCount === 1 ? '' : 's'}
                                        </p>
                                    </button>
                                    <div className="text-right shrink-0">
                                        <p className="font-extrabold text-slate-900">{peso(p.totalNet)}</p>
                                        <p className="text-[10px] text-slate-400">net</p>
                                    </div>
                                    {p.status === 'draft' && (
                                        <button
                                            onClick={() => { if (confirm(`Delete the draft period "${p.label}"?`)) act(() => payrollAPI.deletePeriod(p.id), 'Draft period deleted.'); }}
                                            aria-label="Delete" className="p-2 text-slate-300 hover:text-red-500">
                                            <Trash2 size={16} />
                                        </button>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </>
            )}

            {tab === 'rates' && settings && (
                <>
                    {!settings.ratesConfigured && (
                        <div className="bg-amber-50 border border-amber-300 rounded-2xl px-4 py-3 mb-4 flex gap-3">
                            <AlertTriangle size={18} className="text-amber-600 shrink-0 mt-0.5" />
                            <div className="text-sm text-amber-900">
                                <p className="font-bold">Enter your own contribution rates.</p>
                                <p>These start at zero deliberately — SSS, PhilHealth, Pag-IBIG and BIR publish their own tables and they change. Nothing here is filled in for you.</p>
                            </div>
                        </div>
                    )}

                    <div className="bg-white rounded-2xl border border-gray-100 p-5 mb-4">
                        <p className="font-extrabold text-slate-900 mb-1">Deduction rates</p>
                        <p className="text-xs text-slate-500 mb-4">Entered as a percentage of gross pay (employee share).</p>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                            {([['sssRate', 'SSS'], ['philhealthRate', 'PhilHealth'], ['pagibigRate', 'Pag-IBIG'], ['taxRate', 'Withholding tax']] as const).map(([key, label]) => (
                                <label key={key} className="block">
                                    <span className="block text-xs font-bold text-slate-600 mb-1">{label} %</span>
                                    <input type="number" step="0.01" min="0" max="100"
                                        value={(Number(settings[key]) * 100).toFixed(2)}
                                        onChange={e => setSettings({ ...settings, [key]: Number(e.target.value) / 100 })}
                                        className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm" />
                                </label>
                            ))}
                        </div>

                        <p className="font-extrabold text-slate-900 mt-5 mb-3">Hours</p>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                            {([['standardHoursPerDay', 'Standard hours / day'], ['overtimeMultiplier', 'Overtime multiplier'], ['monthlyWorkingDays', 'Working days / month']] as const).map(([key, label]) => (
                                <label key={key} className="block">
                                    <span className="block text-xs font-bold text-slate-600 mb-1">{label}</span>
                                    <input type="number" step="0.25" min="0"
                                        value={String(settings[key])}
                                        onChange={e => setSettings({ ...settings, [key]: Number(e.target.value) })}
                                        className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm" />
                                </label>
                            ))}
                        </div>
                        <p className="text-[11px] text-slate-400 mt-2">
                            Anything worked beyond the standard hours in a single day counts as overtime.
                            Working days per month only converts a monthly salary into an hourly rate for overtime.
                        </p>

                        <button onClick={saveRates} disabled={busy}
                            className="mt-4 flex items-center gap-2 rounded-xl bg-slate-900 text-white px-4 py-2.5 text-sm font-bold disabled:opacity-50">
                            <Save size={15} /> Save rates
                        </button>
                    </div>

                    <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
                        <div className="p-5 pb-3">
                            <p className="font-extrabold text-slate-900 flex items-center gap-2"><Users size={16} /> Employee pay rates</p>
                            <p className="text-xs text-slate-500">An employee on ₱0.00 produces a zero payslip — nothing is assumed.</p>
                        </div>
                        <div className="divide-y divide-gray-100">
                            {staff.map((row, i) => (
                                <div key={row.id} className="p-4 flex flex-wrap items-center gap-3">
                                    <div className="flex-1 min-w-[140px]">
                                        <p className="font-bold text-slate-900">{row.name}</p>
                                        <p className="text-xs text-slate-500 capitalize">{row.role}</p>
                                    </div>
                                    <select value={row.payType}
                                        onChange={e => setStaff(s => s.map((x, j) => j === i ? { ...x, payType: e.target.value as 'hourly' | 'monthly' } : x))}
                                        className="rounded-xl border border-gray-200 px-3 py-2 text-sm">
                                        <option value="hourly">Hourly</option>
                                        <option value="monthly">Monthly</option>
                                    </select>
                                    <input type="number" min="0" step="0.01" value={row.payRate}
                                        onChange={e => setStaff(s => s.map((x, j) => j === i ? { ...x, payRate: Number(e.target.value) } : x))}
                                        className="w-32 rounded-xl border border-gray-200 px-3 py-2 text-sm" />
                                    <button onClick={() => saveRate(row)} disabled={busy}
                                        className="rounded-xl bg-brand text-slate-900 px-4 py-2 text-sm font-bold disabled:opacity-50">
                                        Save
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                </>
            )}

            {tab === 'attendance' && (
                <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
                    {shifts.length === 0 ? (
                        <div className="p-10 text-center">
                            <Clock size={34} className="mx-auto text-slate-300 mb-3" />
                            <p className="font-bold text-slate-900">No shifts recorded</p>
                            <p className="text-sm text-slate-500 mt-1">Staff clock in and out from their own profile page.</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm min-w-[640px]">
                                <thead className="bg-gray-50 text-left text-xs text-slate-500">
                                    <tr>
                                        <th className="px-4 py-3">Employee</th>
                                        <th className="px-4 py-3">Date</th>
                                        <th className="px-4 py-3">In</th>
                                        <th className="px-4 py-3">Out</th>
                                        <th className="px-4 py-3 text-right">Hours</th>
                                        <th className="px-4 py-3" />
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {shifts.map(s => (
                                        <tr key={s.id}>
                                            <td className="px-4 py-3 font-semibold text-slate-900">{s.employeeName}</td>
                                            <td className="px-4 py-3 text-slate-600">{day(s.workDate)}</td>
                                            <td className="px-4 py-3 text-slate-600">{clock(s.clockInAt)}</td>
                                            <td className="px-4 py-3 text-slate-600">
                                                {s.clockOutAt ? clock(s.clockOutAt) : <span className="text-amber-600 font-bold">still open</span>}
                                                {s.closedByAdmin && <span className="block text-[10px] text-amber-600">closed by admin</span>}
                                            </td>
                                            <td className="px-4 py-3 text-right font-bold text-slate-900">{s.hoursWorked ?? '—'}</td>
                                            <td className="px-4 py-3 text-right">
                                                {!s.clockOutAt && (
                                                    <button
                                                        onClick={() => { if (confirm(`Close ${s.employeeName}'s open shift now?`)) act(async () => { await payrollAPI.closeShift(s.id); setShifts((await payrollAPI.attendance()).data.logs); }, 'Shift closed.'); }}
                                                        className="text-xs font-bold text-slate-500 underline underline-offset-4">
                                                        Close
                                                    </button>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            )}

            {showNew && (
                <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={() => setShowNew(false)}>
                    <div className="bg-white rounded-3xl w-full max-w-sm p-5" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-between mb-4">
                            <p className="font-extrabold text-slate-900">New pay period</p>
                            <button onClick={() => setShowNew(false)} aria-label="Close"><X size={18} className="text-slate-500" /></button>
                        </div>
                        <input value={form.label} onChange={e => setForm(f => ({ ...f, label: e.target.value }))}
                            placeholder="Label (e.g. September 1–15)"
                            className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm mb-2" />
                        <label className="block text-xs font-bold text-slate-600 mb-1">Start date</label>
                        <input type="date" value={form.startDate} onChange={e => setForm(f => ({ ...f, startDate: e.target.value }))}
                            className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm mb-2" />
                        <label className="block text-xs font-bold text-slate-600 mb-1">End date</label>
                        <input type="date" value={form.endDate} onChange={e => setForm(f => ({ ...f, endDate: e.target.value }))}
                            className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm mb-4" />
                        <button onClick={createPeriod} disabled={busy || !form.label || !form.startDate || !form.endDate}
                            className="w-full rounded-2xl bg-brand text-slate-900 font-extrabold py-3 disabled:opacity-50">
                            Create
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
