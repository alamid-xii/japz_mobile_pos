import { useState, useEffect, useCallback } from 'react';
import {
    Users, Search, RefreshCw, Edit3, DollarSign,
    CheckCircle, AlertCircle, X, Save, ShieldAlert,
    Briefcase, Sparkles, Filter, Check, Shield
} from 'lucide-react';
import { payrollAPI } from '../../services/api';

interface EmployeeProfile {
    id: number;
    name: string;
    email: string;
    phone?: string;
    role: string;
    status: 'active' | 'inactive';
    hourlyRate: number;
    dailyAllowance: number;
    monthlyAllowance: number;
    overtimeAllowed: boolean;
    sssExempt: boolean;
    philhealthExempt: boolean;
    pagibigExempt: boolean;
    taxExempt: boolean;
    customDeduction: number;
    userId?: number;
    monthShifts?: number;
    lastShiftDate?: string;
}

const formatPeso = (v: number) => `₱${Number(v || 0).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export default function StaffPayManagement() {
    const [employees, setEmployees] = useState<EmployeeProfile[]>([]);
    const [loading, setLoading] = useState(true);
    const [syncing, setSyncing] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [roleFilter, setRoleFilter] = useState<'all' | 'cashier' | 'kitchen'>('all');
    const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
    const [selectedEmployee, setSelectedEmployee] = useState<EmployeeProfile | null>(null);
    const [editForm, setEditForm] = useState({
        hourlyRate: '75',
        dailyAllowance: '0',
        monthlyAllowance: '0',
        customDeduction: '0',
        overtimeAllowed: true,
        sssExempt: false,
        philhealthExempt: false,
        pagibigExempt: false,
        taxExempt: false,
        status: 'active' as 'active' | 'inactive'
    });
    const [saving, setSaving] = useState(false);
    const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

    const fetchEmployees = useCallback(async () => {
        setLoading(true);
        try {
            const res = await payrollAPI.getEmployees();
            setEmployees(res.data?.data || []);
        } catch {
            setFeedback({ type: 'error', message: 'Failed to load staff profiles' });
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchEmployees();
    }, [fetchEmployees]);

    const handleSync = async () => {
        setSyncing(true);
        setFeedback(null);
        try {
            const res = await payrollAPI.syncEmployees();
            setFeedback({
                type: 'success',
                message: res.data?.message || 'Staff accounts synchronized successfully from POS users!'
            });
            fetchEmployees();
        } catch {
            setFeedback({ type: 'error', message: 'Failed to sync users with employee roster' });
        } finally {
            setSyncing(false);
        }
    };

    const openEditModal = (emp: EmployeeProfile) => {
        setSelectedEmployee(emp);
        setEditForm({
            hourlyRate: (emp.hourlyRate ?? 75).toString(),
            dailyAllowance: (emp.dailyAllowance ?? 0).toString(),
            monthlyAllowance: (emp.monthlyAllowance ?? 0).toString(),
            customDeduction: (emp.customDeduction ?? 0).toString(),
            overtimeAllowed: emp.overtimeAllowed !== false,
            sssExempt: Boolean(emp.sssExempt),
            philhealthExempt: Boolean(emp.philhealthExempt),
            pagibigExempt: Boolean(emp.pagibigExempt),
            taxExempt: Boolean(emp.taxExempt),
            status: emp.status
        });
    };

    const handleSaveConfig = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedEmployee) return;

        setSaving(true);
        try {
            await payrollAPI.updateEmployeePayConfig(selectedEmployee.id, {
                hourlyRate: parseFloat(editForm.hourlyRate) || 0,
                dailyAllowance: parseFloat(editForm.dailyAllowance) || 0,
                monthlyAllowance: parseFloat(editForm.monthlyAllowance) || 0,
                customDeduction: parseFloat(editForm.customDeduction) || 0,
                overtimeAllowed: editForm.overtimeAllowed,
                sssExempt: editForm.sssExempt,
                philhealthExempt: editForm.philhealthExempt,
                pagibigExempt: editForm.pagibigExempt,
                taxExempt: editForm.taxExempt,
                status: editForm.status
            });

            setFeedback({
                type: 'success',
                message: `Pay configuration updated for ${selectedEmployee.name}`
            });
            setSelectedEmployee(null);
            fetchEmployees();
        } catch {
            setFeedback({ type: 'error', message: 'Failed to update employee pay configuration' });
        } finally {
            setSaving(false);
        }
    };

    const filtered = employees.filter(emp => {
        const matchesSearch =
            emp.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            emp.email.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesRole = roleFilter === 'all' || emp.role === roleFilter;
        const matchesStatus = statusFilter === 'all' || emp.status === statusFilter;
        return matchesSearch && matchesRole && matchesStatus;
    });

    const activeCount = employees.filter(e => e.status === 'active').length;
    const avgRate = employees.length > 0
        ? employees.reduce((sum, e) => sum + (e.hourlyRate || 0), 0) / employees.length
        : 0;
    const allowanceCount = employees.filter(e => (e.monthlyAllowance || 0) > 0 || (e.dailyAllowance || 0) > 0).length;

    return (
        <div className="p-6 max-w-6xl mx-auto space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Staff & Pay Configuration</h1>
                    <p className="text-sm text-gray-500 mt-0.5">
                        Manage employee hourly rates, allowances, overtime rules, and statutory exemptions per staff member
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={handleSync}
                        disabled={syncing}
                        className="flex items-center gap-2 px-4 py-2.5 bg-yellow-400 hover:bg-yellow-500 text-yellow-950 font-semibold rounded-xl text-sm transition-all shadow-sm disabled:opacity-50"
                        title="Import any approved Cashier or Kitchen users into the Payroll Employee list"
                    >
                        <RefreshCw size={16} className={syncing ? 'animate-spin' : ''} />
                        {syncing ? 'Syncing...' : 'Sync POS Users'}
                    </button>
                </div>
            </div>

            {/* Feedback notification */}
            {feedback && (
                <div className={`p-4 rounded-2xl flex items-center justify-between gap-3 text-sm transition-all ${
                    feedback.type === 'success'
                        ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                        : 'bg-red-50 text-red-800 border border-red-200'
                }`}>
                    <div className="flex items-center gap-2">
                        {feedback.type === 'success' ? <CheckCircle size={18} /> : <AlertCircle size={18} />}
                        <span>{feedback.message}</span>
                    </div>
                    <button onClick={() => setFeedback(null)} className="text-gray-400 hover:text-gray-600">
                        <X size={16} />
                    </button>
                </div>
            )}

            {/* KPI Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 rounded-xl bg-yellow-50 text-yellow-700">
                            <Users size={20} />
                        </div>
                        <div>
                            <p className="text-xs text-gray-500 font-medium">Total Staff</p>
                            <p className="text-xl font-bold text-gray-900">{employees.length}</p>
                        </div>
                    </div>
                </div>

                <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 rounded-xl bg-emerald-50 text-emerald-700">
                            <Check size={20} />
                        </div>
                        <div>
                            <p className="text-xs text-gray-500 font-medium">Active on Payroll</p>
                            <p className="text-xl font-bold text-gray-900">{activeCount}</p>
                        </div>
                    </div>
                </div>

                <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 rounded-xl bg-blue-50 text-blue-700">
                            <DollarSign size={20} />
                        </div>
                        <div>
                            <p className="text-xs text-gray-500 font-medium">Average Hourly Rate</p>
                            <p className="text-xl font-bold text-gray-900">{formatPeso(avgRate)}/hr</p>
                        </div>
                    </div>
                </div>

                <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 rounded-xl bg-purple-50 text-purple-700">
                            <Sparkles size={20} />
                        </div>
                        <div>
                            <p className="text-xs text-gray-500 font-medium">With Custom Allowance</p>
                            <p className="text-xl font-bold text-gray-900">{allowanceCount}</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Filter and Search Bar */}
            <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex flex-col md:flex-row gap-3 items-center justify-between">
                <div className="relative w-full md:w-80">
                    <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Search employee name or email..."
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400"
                    />
                </div>

                <div className="flex items-center gap-2 w-full md:w-auto">
                    <div className="flex items-center gap-1.5 bg-gray-50 p-1 rounded-xl border border-gray-200 text-xs font-medium">
                        <span className="text-gray-400 pl-1"><Filter size={13} /></span>
                        {(['all', 'cashier', 'kitchen'] as const).map(role => (
                            <button
                                key={role}
                                onClick={() => setRoleFilter(role)}
                                className={`px-2.5 py-1 rounded-lg capitalize transition-all ${
                                    roleFilter === role ? 'bg-white text-gray-900 font-semibold shadow-xs' : 'text-gray-500 hover:text-gray-900'
                                }`}
                            >
                                {role}
                            </button>
                        ))}
                    </div>

                    <div className="flex items-center gap-1.5 bg-gray-50 p-1 rounded-xl border border-gray-200 text-xs font-medium">
                        {(['all', 'active', 'inactive'] as const).map(status => (
                            <button
                                key={status}
                                onClick={() => setStatusFilter(status)}
                                className={`px-2.5 py-1 rounded-lg capitalize transition-all ${
                                    statusFilter === status ? 'bg-white text-gray-900 font-semibold shadow-xs' : 'text-gray-500 hover:text-gray-900'
                                }`}
                            >
                                {status}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Employees List */}
            {loading ? (
                <div className="py-20 flex justify-center"><div className="spinner" /></div>
            ) : filtered.length === 0 ? (
                <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center text-gray-400">
                    <Users size={48} className="mx-auto mb-3 opacity-30" />
                    <p className="font-semibold text-gray-700">No staff members found</p>
                    <p className="text-sm mt-1">Try clearing your filters or click "Sync POS Users" to import staff from the user database.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filtered.map(emp => (
                        <div
                            key={emp.id}
                            className={`bg-white rounded-2xl border transition-all p-5 shadow-sm hover:shadow-md ${
                                emp.status === 'active' ? 'border-gray-100 hover:border-yellow-300' : 'border-gray-200 opacity-75'
                            }`}
                        >
                            <div className="flex items-start justify-between mb-4">
                                <div className="flex items-center gap-3">
                                    <div className={`w-11 h-11 rounded-xl flex items-center justify-center font-bold text-base ${
                                        emp.role === 'cashier' ? 'bg-amber-100 text-amber-800' : 'bg-orange-100 text-orange-800'
                                    }`}>
                                        {emp.name.charAt(0).toUpperCase()}
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-gray-900 leading-snug">{emp.name}</h3>
                                        <p className="text-xs text-gray-500">{emp.email}</p>
                                    </div>
                                </div>
                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                                    emp.status === 'active' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-gray-100 text-gray-600'
                                }`}>
                                    {emp.status}
                                </span>
                            </div>

                            {/* Details Grid */}
                            <div className="bg-gray-50/70 rounded-xl p-3 space-y-2 mb-4 text-xs">
                                <div className="flex items-center justify-between">
                                    <span className="text-gray-500 font-medium">Hourly Base Rate</span>
                                    <span className="font-bold text-gray-900 text-sm text-yellow-700">
                                        {formatPeso(emp.hourlyRate)}/hr
                                    </span>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="text-gray-500 font-medium">Assigned Role</span>
                                    <span className="font-semibold text-gray-700 capitalize flex items-center gap-1">
                                        <Briefcase size={12} className="text-gray-400" />
                                        {emp.role}
                                    </span>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="text-gray-500 font-medium">Allowances</span>
                                    <span className="font-medium text-gray-700">
                                        {emp.monthlyAllowance > 0
                                            ? `+${formatPeso(emp.monthlyAllowance)}/mo`
                                            : emp.dailyAllowance > 0
                                            ? `+${formatPeso(emp.dailyAllowance)}/day`
                                            : 'None'}
                                    </span>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="text-gray-500 font-medium">Overtime Eligibility</span>
                                    <span className={`font-semibold ${emp.overtimeAllowed !== false ? 'text-emerald-700' : 'text-gray-400'}`}>
                                        {emp.overtimeAllowed !== false ? 'Eligible (1.25x)' : 'No OT'}
                                    </span>
                                </div>
                            </div>

                            {/* Statutory tags */}
                            <div className="flex flex-wrap gap-1 mb-4">
                                {emp.sssExempt && (
                                    <span className="px-2 py-0.5 bg-purple-50 text-purple-700 border border-purple-200 rounded-md text-[10px] font-semibold">
                                        SSS Exempt
                                    </span>
                                )}
                                {emp.philhealthExempt && (
                                    <span className="px-2 py-0.5 bg-blue-50 text-blue-700 border border-blue-200 rounded-md text-[10px] font-semibold">
                                        PhilHealth Exempt
                                    </span>
                                )}
                                {emp.pagibigExempt && (
                                    <span className="px-2 py-0.5 bg-amber-50 text-amber-700 border border-amber-200 rounded-md text-[10px] font-semibold">
                                        Pag-IBIG Exempt
                                    </span>
                                )}
                                {emp.taxExempt && (
                                    <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-md text-[10px] font-semibold">
                                        Tax Exempt
                                    </span>
                                )}
                                {!emp.sssExempt && !emp.philhealthExempt && !emp.pagibigExempt && !emp.taxExempt && (
                                    <span className="text-[10px] text-gray-400 flex items-center gap-1">
                                        <Shield size={10} /> Standard Statutory Contributions
                                    </span>
                                )}
                            </div>

                            {/* Action Button */}
                            <button
                                onClick={() => openEditModal(emp)}
                                className="w-full flex items-center justify-center gap-2 py-2 bg-gray-50 hover:bg-yellow-400 hover:text-yellow-950 text-gray-700 font-semibold rounded-xl text-xs transition-colors border border-gray-200 hover:border-yellow-400"
                            >
                                <Edit3 size={13} />
                                Edit Pay Config
                            </button>
                        </div>
                    ))}
                </div>
            )}

            {/* Edit Pay Config Modal */}
            {selectedEmployee && (
                <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
                    <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-gray-100 max-h-[90vh] overflow-y-auto">
                        <div className="flex items-center justify-between pb-4 border-b border-gray-100 mb-5">
                            <div>
                                <h2 className="text-lg font-bold text-gray-900">Configure Staff Compensation</h2>
                                <p className="text-xs text-gray-500 mt-0.5">
                                    Setting custom payroll rates for <span className="font-semibold text-gray-800">{selectedEmployee.name}</span>
                                </p>
                            </div>
                            <button
                                onClick={() => setSelectedEmployee(null)}
                                className="p-1 rounded-xl text-gray-400 hover:text-gray-600 hover:bg-gray-100"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        <form onSubmit={handleSaveConfig} className="space-y-4">
                            {/* Base Pay */}
                            <div className="bg-yellow-50/60 p-4 rounded-2xl border border-yellow-200/70">
                                <label className="block text-xs font-bold text-yellow-900 mb-1">
                                    Hourly Base Rate (₱)
                                </label>
                                <div className="relative">
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-yellow-700 font-bold text-sm">₱</span>
                                    <input
                                        type="number"
                                        step="0.25"
                                        min="0"
                                        required
                                        value={editForm.hourlyRate}
                                        onChange={e => setEditForm(f => ({ ...f, hourlyRate: e.target.value }))}
                                        className="w-full pl-8 pr-3 py-2 bg-white border border-yellow-300 rounded-xl text-sm font-bold text-gray-900 focus:outline-none focus:ring-2 focus:ring-yellow-500"
                                    />
                                </div>
                                <p className="text-[11px] text-yellow-800 mt-1.5">
                                    Used as the base multiplier for regular hours and overtime (x1.25).
                                </p>
                            </div>

                            {/* Allowances & Custom Deductions */}
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                                        Monthly Allowance (₱)
                                    </label>
                                    <input
                                        type="number"
                                        step="1"
                                        min="0"
                                        value={editForm.monthlyAllowance}
                                        onChange={e => setEditForm(f => ({ ...f, monthlyAllowance: e.target.value }))}
                                        className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-yellow-300"
                                        placeholder="0.00"
                                    />
                                    <span className="text-[10px] text-gray-400">Added once per pay period</span>
                                </div>

                                <div>
                                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                                        Daily Allowance (₱/day)
                                    </label>
                                    <input
                                        type="number"
                                        step="1"
                                        min="0"
                                        value={editForm.dailyAllowance}
                                        onChange={e => setEditForm(f => ({ ...f, dailyAllowance: e.target.value }))}
                                        className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-yellow-300"
                                        placeholder="0.00"
                                    />
                                    <span className="text-[10px] text-gray-400">Multiplied by days attended</span>
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-gray-700 mb-1">
                                    Fixed Periodic Deduction (₱)
                                </label>
                                <input
                                    type="number"
                                    step="1"
                                    min="0"
                                    value={editForm.customDeduction}
                                    onChange={e => setEditForm(f => ({ ...f, customDeduction: e.target.value }))}
                                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-yellow-300"
                                    placeholder="0.00"
                                />
                                <span className="text-[10px] text-gray-400">Custom recurring deduction (e.g. uniform, tool fee)</span>
                            </div>

                            {/* Overtime & Status Toggle */}
                            <div className="pt-2 border-t border-gray-100 space-y-2.5">
                                <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-gray-700">
                                    <input
                                        type="checkbox"
                                        checked={editForm.overtimeAllowed}
                                        onChange={e => setEditForm(f => ({ ...f, overtimeAllowed: e.target.checked }))}
                                        className="rounded text-yellow-500 focus:ring-yellow-400"
                                    />
                                    <span>Eligible for Overtime Pay (1.25x beyond 8 hours)</span>
                                </label>
                            </div>

                            {/* Statutory Exemptions */}
                            <div className="pt-2 border-t border-gray-100">
                                <p className="text-xs font-semibold text-gray-800 mb-2 flex items-center gap-1.5">
                                    <ShieldAlert size={14} className="text-amber-500" />
                                    Statutory Exemptions (Optional)
                                </p>
                                <div className="grid grid-cols-2 gap-2 text-xs text-gray-600">
                                    <label className="flex items-center gap-2 cursor-pointer bg-gray-50 p-2 rounded-xl">
                                        <input
                                            type="checkbox"
                                            checked={editForm.sssExempt}
                                            onChange={e => setEditForm(f => ({ ...f, sssExempt: e.target.checked }))}
                                            className="rounded text-yellow-500 focus:ring-yellow-400"
                                        />
                                        <span>SSS Exempt</span>
                                    </label>

                                    <label className="flex items-center gap-2 cursor-pointer bg-gray-50 p-2 rounded-xl">
                                        <input
                                            type="checkbox"
                                            checked={editForm.philhealthExempt}
                                            onChange={e => setEditForm(f => ({ ...f, philhealthExempt: e.target.checked }))}
                                            className="rounded text-yellow-500 focus:ring-yellow-400"
                                        />
                                        <span>PhilHealth Exempt</span>
                                    </label>

                                    <label className="flex items-center gap-2 cursor-pointer bg-gray-50 p-2 rounded-xl">
                                        <input
                                            type="checkbox"
                                            checked={editForm.pagibigExempt}
                                            onChange={e => setEditForm(f => ({ ...f, pagibigExempt: e.target.checked }))}
                                            className="rounded text-yellow-500 focus:ring-yellow-400"
                                        />
                                        <span>Pag-IBIG Exempt</span>
                                    </label>

                                    <label className="flex items-center gap-2 cursor-pointer bg-gray-50 p-2 rounded-xl">
                                        <input
                                            type="checkbox"
                                            checked={editForm.taxExempt}
                                            onChange={e => setEditForm(f => ({ ...f, taxExempt: e.target.checked }))}
                                            className="rounded text-yellow-500 focus:ring-yellow-400"
                                        />
                                        <span>Withholding Tax Exempt</span>
                                    </label>
                                </div>
                            </div>

                            {/* Active/Inactive Status */}
                            <div className="pt-2 border-t border-gray-100 flex items-center justify-between">
                                <span className="text-xs font-semibold text-gray-700">Payroll Employment Status</span>
                                <select
                                    value={editForm.status}
                                    onChange={e => setEditForm(f => ({ ...f, status: e.target.value as 'active' | 'inactive' }))}
                                    className="px-3 py-1.5 border border-gray-200 rounded-xl text-xs font-semibold text-gray-800 focus:outline-none focus:ring-2 focus:ring-yellow-400"
                                >
                                    <option value="active">Active (Calculated in Payroll)</option>
                                    <option value="inactive">Inactive (Skipped in Payroll)</option>
                                </select>
                            </div>

                            {/* Submit Buttons */}
                            <div className="pt-4 border-t border-gray-100 flex items-center justify-end gap-2">
                                <button
                                    type="button"
                                    onClick={() => setSelectedEmployee(null)}
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
                                    {saving ? 'Saving...' : 'Save Configuration'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
