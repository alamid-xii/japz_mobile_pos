import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertCircle, CheckCircle, Settings2, RefreshCw, Info, Users } from 'lucide-react';
import { payrollConfigAPI } from '../../services/api';

interface ConfigRow {
    id: number;
    configKey: string;
    configValue: string;
    description?: string;
    updatedAt: string;
}

const CONFIG_META: Record<string, { label: string; type: 'number' | 'text' | 'boolean'; suffix?: string; hint?: string }> = {
    regularHoursPerDay:     { label: 'Regular Hours per Day',       type: 'number', suffix: 'hours',   hint: 'Standard work hours per shift. Used in absence and overtime rates.' },
    gracePeriodMinutes:     { label: 'Grace Period',                type: 'number', suffix: 'minutes', hint: 'Minutes allowed before late deduction applies.' },
    overtimeMultiplier:     { label: 'Overtime Pay Multiplier',     type: 'number', suffix: '×',       hint: 'e.g. 1.25 means 125% of normal rate for OT hours.' },
    restDayMultiplier:      { label: 'Rest Day Pay Multiplier',     type: 'number', suffix: '×',       hint: 'Pay rate for working on rest days.' },
    breakMinutes:           { label: 'Break Time (unpaid)',         type: 'number', suffix: 'minutes', hint: 'Daily unpaid break deducted from total work hours.' },
    workingDays:            { label: 'Working Days',                type: 'text',                      hint: 'Comma-separated day numbers: 0=Sun,1=Mon,...,6=Sat. e.g. "1,2,3,4,5,6" = Mon-Sat.' },
    deductAbsenceDailyRate: { label: 'Deduct Daily Rate for Absence', type: 'boolean',                 hint: 'Disabled = "No Work, No Pay" (hourly staff only paid for rendered hours, unworked days are unpaid with 0 wage deduction). Enabled = subtracts full daily rate per absence from gross earnings.' },
};

const WORKING_DAYS_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function PayrollSettings() {
    const navigate = useNavigate();
    const [configs, setConfigs] = useState<ConfigRow[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState<string | null>(null);
    const [editing, setEditing] = useState<Record<string, string>>({});
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [success, setSuccess] = useState('');
    const [globalError, setGlobalError] = useState('');

    const fetchConfigs = useCallback(async () => {
        try {
            const res = await payrollConfigAPI.getAll();
            const rows: ConfigRow[] = res.data?.data || [];
            setConfigs(rows);
            const editMap: Record<string, string> = {};
            rows.forEach(r => { editMap[r.configKey] = r.configValue; });
            setEditing(editMap);
        } catch { setGlobalError('Failed to load payroll configuration'); }
        finally { setLoading(false); }
    }, []);

    useEffect(() => { fetchConfigs(); }, [fetchConfigs]);

    const handleSave = async (configKey: string) => {
        const newValue = editing[configKey];
        if (!newValue && newValue !== '0') {
            setErrors(e => ({ ...e, [configKey]: 'Value cannot be empty' }));
            return;
        }
        setSaving(configKey);
        setErrors(e => ({ ...e, [configKey]: '' }));
        try {
            await payrollConfigAPI.update(configKey, newValue);
            setSuccess(`"${CONFIG_META[configKey]?.label || configKey}" updated successfully`);
            fetchConfigs();
            setTimeout(() => setSuccess(''), 3500);
        } catch (err: unknown) {
            const apiErr = err as { response?: { data?: { message?: string } } };
            setErrors(e => ({ ...e, [configKey]: apiErr.response?.data?.message || 'Failed to save' }));
        } finally { setSaving(null); }
    };

    const parseWorkingDays = (val: string) =>
        val.split(',').map(Number).filter(n => !isNaN(n) && n >= 0 && n <= 6);

    if (loading) return <div className="spinner h-full" />;

    return (
        <div className="p-6 max-w-3xl mx-auto">
            <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <div className="flex items-center gap-2.5 mb-1">
                        <Settings2 size={22} className="text-yellow-600" />
                        <h1 className="text-2xl font-bold text-gray-900">Payroll Settings</h1>
                    </div>
                    <p className="text-sm text-gray-500">
                        Adjust system-wide payroll rules and contribution defaults
                    </p>
                </div>
                <button
                    onClick={() => navigate('/admin/payroll-staff')}
                    className="flex items-center gap-2 px-4 py-2 bg-yellow-100 hover:bg-yellow-200 text-yellow-900 border border-yellow-300 rounded-xl text-xs font-bold transition-all shadow-xs"
                >
                    <Users size={15} /> Individual Staff Pay Rates →
                </button>
            </div>

            {/* Global alerts */}
            {globalError && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-sm flex items-center gap-2">
                    <AlertCircle size={16} /> {globalError}
                </div>
            )}
            {success && (
                <div className="mb-4 p-3 bg-green-50 border border-green-200 text-green-700 rounded-xl text-sm flex items-center gap-2">
                    <CheckCircle size={16} /> {success}
                </div>
            )}

            {/* Config Cards */}
            <div className="space-y-3">
                {configs.map(config => {
                    const meta = CONFIG_META[config.configKey];
                    const label = meta?.label || config.configKey;
                    const isSaving = saving === config.configKey;
                    const hasError = errors[config.configKey];
                    const value = editing[config.configKey] || '';
                    const isDirty = value !== config.configValue;

                    return (
                        <div key={config.id}
                            className={`bg-white rounded-2xl border p-5 shadow-sm transition-all ${isDirty ? 'border-yellow-300 shadow-yellow-50' : 'border-gray-100'}`}>
                            <div className="flex items-start justify-between mb-2">
                                <div>
                                    <p className="font-semibold text-gray-900 text-sm">{label}</p>
                                    {meta?.hint && (
                                        <div className="flex items-start gap-1.5 mt-1">
                                            <Info size={12} className="text-gray-400 mt-0.5 shrink-0" />
                                            <p className="text-xs text-gray-400">{meta.hint}</p>
                                        </div>
                                    )}
                                </div>
                                {isDirty && (
                                    <span className="text-[10px] font-bold px-2 py-0.5 bg-yellow-100 text-yellow-700 rounded-full">
                                        Unsaved
                                    </span>
                                )}
                            </div>

                            {/* Working days has special toggle UI */}
                            {config.configKey === 'workingDays' ? (
                                <div className="mb-3">
                                    <div className="flex gap-2 flex-wrap">
                                        {WORKING_DAYS_LABELS.map((day, idx) => {
                                            const selected = parseWorkingDays(value).includes(idx);
                                            return (
                                                <button key={idx}
                                                    onClick={() => {
                                                        const current = parseWorkingDays(value);
                                                        const next = selected
                                                            ? current.filter(d => d !== idx)
                                                            : [...current, idx].sort();
                                                        setEditing(e => ({ ...e, workingDays: next.join(',') }));
                                                    }}
                                                    className={`w-12 h-10 rounded-xl text-xs font-bold transition-all ${
                                                        selected
                                                            ? 'bg-yellow-400 text-yellow-900 shadow-sm'
                                                            : 'bg-gray-100 text-gray-500'
                                                    }`}>
                                                    {day}
                                                </button>
                                            );
                                        })}
                                    </div>
                                    <p className="text-xs text-gray-400 mt-1.5">Raw value: <code className="bg-gray-100 px-1 rounded">{value}</code></p>
                                </div>
                            ) : meta?.type === 'boolean' ? (
                                <div className="flex items-center gap-2 mb-2">
                                    <select
                                        value={value === 'true' ? 'true' : 'false'}
                                        onChange={e => setEditing(ed => ({ ...ed, [config.configKey]: e.target.value }))}
                                        className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-yellow-300 bg-white font-medium text-gray-800"
                                    >
                                        <option value="false">❌ No (Recommended for Hourly: No Work, No Pay)</option>
                                        <option value="true">⚠️ Yes (Deduct Daily Rate per Absence from Gross Pay)</option>
                                    </select>
                                </div>
                            ) : (
                                <div className="flex items-center gap-2 mb-2">
                                    <input
                                        type={meta?.type || 'text'}
                                        value={value}
                                        onChange={e => setEditing(ed => ({ ...ed, [config.configKey]: e.target.value }))}
                                        step={meta?.type === 'number' ? '0.01' : undefined}
                                        min={meta?.type === 'number' ? '0' : undefined}
                                        className={`flex-1 px-3 py-2 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-yellow-300 ${
                                            hasError ? 'border-red-300' : 'border-gray-200'
                                        }`}
                                    />
                                    {meta?.suffix && (
                                        <span className="text-sm text-gray-400 font-medium w-16 shrink-0">{meta.suffix}</span>
                                    )}
                                </div>
                            )}

                            {hasError && <p className="text-xs text-red-500 mb-2">{hasError}</p>}

                            <div className="flex items-center justify-between">
                                <p className="text-[10px] text-gray-300">
                                    Last updated: {new Date(config.updatedAt).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })}
                                </p>
                                <div className="flex gap-2">
                                    {isDirty && (
                                        <button
                                            onClick={() => setEditing(e => ({ ...e, [config.configKey]: config.configValue }))}
                                            className="flex items-center gap-1 px-3 py-1.5 text-xs text-gray-500 hover:text-gray-700 border border-gray-200 rounded-xl">
                                            <RefreshCw size={12} /> Reset
                                        </button>
                                    )}
                                    <button
                                        onClick={() => handleSave(config.configKey)}
                                        disabled={!isDirty || isSaving}
                                        className="flex items-center gap-1 px-4 py-1.5 bg-yellow-400 hover:bg-yellow-500 disabled:opacity-40 text-yellow-900 font-semibold rounded-xl text-xs transition-all">
                                        {isSaving ? <><RefreshCw size={12} className="animate-spin" /> Saving…</> : 'Save'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
