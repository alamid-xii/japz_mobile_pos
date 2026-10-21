import AlertModal from '../../components/ActionNotice';
import Modal from '../../components/Modal';
import { useState, useEffect, useCallback } from 'react';
import { Plus, Edit2, Power, X, Copy, Check, Search, ChevronLeft, ChevronRight } from 'lucide-react';
import { discountsVouchersAPI } from '../../services/api';

interface Discount {
    id: number;
    name: string;
    percentage: number;
    enabled: boolean;
    createdAt: string;
}

interface Voucher {
    id: number;
    name: string;
    code: string;
    amount: number;
    used: boolean;
    enabled: boolean;
    startDate: string;
    endDate: string;
    createdAt: string;
}

// Alert Modal Component - Toast style for success, modal for errors/confirms




const ITEMS_PER_PAGE = 10;

export default function DiscountsVouchers() {
    const [activeTab, setActiveTab] = useState<'discounts' | 'vouchers'>('discounts');
    const [discounts, setDiscounts] = useState<Discount[]>([]);
    const [vouchers, setVouchers] = useState<Voucher[]>([]);
    const [loading, setLoading] = useState(true);
    const [processing, setProcessing] = useState(false);

    // Discount modal states
    const [showDiscountModal, setShowDiscountModal] = useState(false);
    const [editingDiscount, setEditingDiscount] = useState<Discount | null>(null);
    const [discountForm, setDiscountForm] = useState({ name: '', percentage: '' });

    // Voucher modal states
    const [showVoucherModal, setShowVoucherModal] = useState(false);
    const [editingVoucher, setEditingVoucher] = useState<Voucher | null>(null);
    const [voucherForm, setVoucherForm] = useState({ name: '', code: '', amount: '', startDate: '', endDate: '', quantity: '1' });

    // Pagination
    const [discountPage, setDiscountPage] = useState(1);
    const [voucherPage, setVoucherPage] = useState(1);

    // Search
    const [searchQuery, setSearchQuery] = useState('');

    // Copy notification
    const [copiedCode, setCopiedCode] = useState<string | null>(null);

    // Alert modal state
    const [alertModal, setAlertModal] = useState<{
        isOpen: boolean;
        type: 'success' | 'error' | 'confirm';
        title: string;
        message: string;
        onConfirm?: () => void;
        confirmButtonLabel?: string;
        confirmButtonColor?: 'red' | 'amber' | 'blue';
    }>({ isOpen: false, type: 'success', title: '', message: '' });

    const showAlert = (type: 'success' | 'error', title: string, message: string) => {
        setAlertModal({ isOpen: true, type, title, message });
    };

    const showConfirm = (title: string, message: string, onConfirm: () => void, confirmButtonLabel = 'Delete', confirmButtonColor: 'red' | 'amber' | 'blue' = 'red') => {
        setAlertModal({ isOpen: true, type: 'confirm', title, message, onConfirm, confirmButtonLabel, confirmButtonColor });
    };

    const closeAlert = () => setAlertModal(prev => ({ ...prev, isOpen: false }));

    const fetchDiscounts = useCallback(async () => {
        try {
            const res = await discountsVouchersAPI.getDiscounts();
            setDiscounts(res.data || []);
        } catch (e) { console.error('Failed to fetch discounts:', e); }
    }, []);

    const fetchVouchers = useCallback(async () => {
        try {
            const res = await discountsVouchersAPI.getVouchers();
            setVouchers(res.data || []);
        } catch (e) { console.error('Failed to fetch vouchers:', e); }
    }, []);

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            await Promise.all([fetchDiscounts(), fetchVouchers()]);
        } finally {
            setLoading(false);
        }
    }, [fetchDiscounts, fetchVouchers]);

    useEffect(() => { fetchData(); }, [fetchData]);

    // Discount handlers
    const openDiscountModal = (discount?: Discount) => {
        if (discount) {
            setEditingDiscount(discount);
            setDiscountForm({ name: discount.name, percentage: discount.percentage.toString() });
        } else {
            setEditingDiscount(null);
            setDiscountForm({ name: '', percentage: '' });
        }
        setShowDiscountModal(true);
    };

    const handleSaveDiscount = async () => {
        if (!discountForm.name.trim() || !discountForm.percentage) {
            showAlert('error', 'Error', 'Please fill all fields');
            return;
        }

        setProcessing(true);
        try {
            if (editingDiscount) {
                await discountsVouchersAPI.updateDiscount(editingDiscount.id, {
                    name: discountForm.name,
                    percentage: parseFloat(discountForm.percentage),
                });
                showAlert('success', 'Success', 'Discount updated successfully!');
            } else {
                await discountsVouchersAPI.createDiscount({
                    name: discountForm.name,
                    percentage: parseFloat(discountForm.percentage),
                    enabled: true,
                });
                showAlert('success', 'Success', 'Discount created successfully!');
            }
            setShowDiscountModal(false);
            setEditingDiscount(null);
            setDiscountForm({ name: '', percentage: '' });
            await fetchDiscounts();
        } catch (e: any) {
            showAlert('error', 'Error', e.response?.data?.error || 'Failed to save discount');
        } finally {
            setProcessing(false);
        }
    };

    const handleToggleDiscount = async (discount: Discount) => {
        const newStatus = !discount.enabled;
        const message = newStatus
            ? `Enable "${discount.name}"? It will be available for use.`
            : `Disable "${discount.name}"? It will not be available for use.`;
        const buttonLabel = newStatus ? 'Enable' : 'Disable';
        const buttonColor: 'amber' | 'blue' = newStatus ? 'blue' : 'amber';

        showConfirm(
            `${buttonLabel} Discount`,
            message,
            async () => {
                try {
                    await discountsVouchersAPI.updateDiscount(discount.id, { enabled: newStatus });
                    await fetchDiscounts();
                    showAlert('success', 'Success', `Discount ${newStatus ? 'enabled' : 'disabled'} successfully!`);
                } catch (e: any) {
                    showAlert('error', 'Error', e.response?.data?.error || 'Failed to update discount');
                }
            },
            buttonLabel,
            buttonColor
        );
    };

    // Voucher handlers
    const openVoucherModal = (voucher?: Voucher) => {
        if (voucher) {
            setEditingVoucher(voucher);
            setVoucherForm({ 
                name: voucher.name, 
                code: voucher.code, 
                amount: voucher.amount.toString(),
                startDate: voucher.startDate?.split('T')[0] || '',
                endDate: voucher.endDate?.split('T')[0] || '',
                quantity: '1'
            });
        } else {
            setEditingVoucher(null);
            setVoucherForm({ name: '', code: '', amount: '', startDate: '', endDate: '', quantity: '1' });
        }
        setShowVoucherModal(true);
    };

    const handleSaveVoucher = async () => {
        if (!voucherForm.name.trim() || !voucherForm.amount || !voucherForm.startDate || !voucherForm.endDate) {
            showAlert('error', 'Error', 'Please fill all fields');
            return;
        }

        // When editing, code is required
        if (editingVoucher && !voucherForm.code.trim()) {
            showAlert('error', 'Error', 'Code is required');
            return;
        }

        setProcessing(true);
        try {
            if (editingVoucher) {
                await discountsVouchersAPI.updateVoucher(editingVoucher.id, {
                    name: voucherForm.name,
                    code: voucherForm.code,
                    amount: parseFloat(voucherForm.amount),
                    startDate: voucherForm.startDate,
                    endDate: voucherForm.endDate,
                });
                showAlert('success', 'Success', 'Voucher updated successfully!');
            } else {
                await discountsVouchersAPI.createVoucher({
                    name: voucherForm.name,
                    amount: parseFloat(voucherForm.amount),
                    startDate: voucherForm.startDate,
                    endDate: voucherForm.endDate,
                    quantity: parseInt(voucherForm.quantity) || 1,
                    enabled: true,
                });
                showAlert('success', 'Success', 'Vouchers created successfully!');
            }
            setShowVoucherModal(false);
            setEditingVoucher(null);
            setVoucherForm({ name: '', code: '', amount: '', startDate: '', endDate: '', quantity: '1' });
            await fetchVouchers();
        } catch (e: any) {
            showAlert('error', 'Error', e.response?.data?.error || 'Failed to save voucher');
        } finally {
            setProcessing(false);
        }
    };

    const handleToggleVoucher = async (voucher: Voucher) => {
        const newStatus = !voucher.enabled;
        const message = newStatus
            ? `Enable "${voucher.name}" (${voucher.code})? It will be available for use.`
            : `Disable "${voucher.name}" (${voucher.code})? It will not be available for use.`;
        const buttonLabel = newStatus ? 'Enable' : 'Disable';
        const buttonColor: 'amber' | 'blue' = newStatus ? 'blue' : 'amber';

        showConfirm(
            `${buttonLabel} Voucher`,
            message,
            async () => {
                try {
                    await discountsVouchersAPI.updateVoucher(voucher.id, { enabled: newStatus });
                    await fetchVouchers();
                    showAlert('success', 'Success', `Voucher ${newStatus ? 'enabled' : 'disabled'} successfully!`);
                } catch (e: any) {
                    showAlert('error', 'Error', e.response?.data?.error || 'Failed to update voucher');
                }
            },
            buttonLabel,
            buttonColor
        );
    };

    const copyToClipboard = (code: string) => {
        navigator.clipboard.writeText(code);
        setCopiedCode(code);
        setTimeout(() => setCopiedCode(null), 2000);
    };

    // Filter based on search
    const filteredDiscounts = discounts.filter(d => 
        d.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
    const filteredVouchers = vouchers.filter(v => 
        v.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        v.code.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const filteredDiscountsPaginated = filteredDiscounts.slice((discountPage - 1) * ITEMS_PER_PAGE, discountPage * ITEMS_PER_PAGE);
    const filteredVouchersPaginated = filteredVouchers.slice((voucherPage - 1) * ITEMS_PER_PAGE, voucherPage * ITEMS_PER_PAGE);

    const discountTotalPages = Math.ceil(filteredDiscounts.length / ITEMS_PER_PAGE);
    const voucherTotalPages = Math.ceil(filteredVouchers.length / ITEMS_PER_PAGE);

    if (loading) return <div className="spinner" role="status" aria-label="Loading content" />;

    return (
        <div className="app-page">
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
                <div>
                    <h1 className="text-2xl font-bold text-yellow-900">Discounts & Vouchers</h1>
                    <p className="text-gray-500 text-sm">Manage promotional discounts and voucher codes</p>
                </div>
                <div className="relative w-64">
                    <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input 
                        type="text"
                        placeholder="Search..."
                        value={searchQuery}
                        onChange={(e) => {
                            setSearchQuery(e.target.value);
                            setDiscountPage(1);
                            setVoucherPage(1);
                        }}
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg bg-white text-sm focus:outline-none focus:ring-2 focus:ring-brand/50"
                    />
                </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-0 bg-gray-50 border-b border-gray-200 rounded-t-lg mb-4">
                <button
                    onClick={() => { setActiveTab('discounts'); setDiscountPage(1); }}
                    className={`px-6 py-3 font-medium text-sm transition-colors border-b-2 ${
                        activeTab === 'discounts'
                            ? 'text-brand border-brand'
                            : 'text-gray-600 border-transparent hover:text-gray-900'
                    }`}
                >
                    Discounts
                </button>
                <button
                    onClick={() => { setActiveTab('vouchers'); setVoucherPage(1); }}
                    className={`px-6 py-3 font-medium text-sm transition-colors border-b-2 ${
                        activeTab === 'vouchers'
                            ? 'text-brand border-brand'
                            : 'text-gray-600 border-transparent hover:text-gray-900'
                    }`}
                >
                    Vouchers
                </button>
            </div>

            {/* Discounts Tab */}
            {activeTab === 'discounts' && (
                <div className="mb-4">
                    {filteredDiscounts.length === 0 ? (
                        <div className="flex flex-col items-center justify-center text-gray-500 gap-2 py-8">
                            <p>{searchQuery ? 'No discounts match your search' : 'No discounts yet'}</p>
                            <button
                                onClick={() => openDiscountModal()}
                                className="inline-flex items-center gap-2 px-4 py-2 bg-brand text-brand-dark rounded-lg font-medium mt-4 hover:shadow-md transition-shadow"
                            >
                                <Plus size={18} />
                                Add Discount
                            </button>
                        </div>
                    ) : (
                        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
                            {/* Toolbar */}
                            <div className="px-6 py-4 border-b border-gray-200">
                                <button
                                    onClick={() => openDiscountModal()}
                                    className="inline-flex items-center gap-2 px-4 py-2 bg-brand text-brand-dark rounded-lg font-medium hover:shadow-md transition-shadow"
                                >
                                    <Plus size={18} />
                                    Add Discount
                                </button>
                            </div>

                            {/* Table */}
                            <div className="overflow-x-auto">
                                <table className="app-responsive-table w-full">
                                    <thead className="bg-yellow-100 border-b border-gray-200">
                                        <tr>
                                            <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-gray-700">Name</th>
                                            <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-gray-700">Percentage</th>
                                            <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-gray-700">Status</th>
                                            <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-gray-700">Created</th>
                                            <th scope="col" className="px-6 py-3 text-right text-xs font-semibold text-gray-700">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-200">
                                        {filteredDiscountsPaginated.map(discount => (
                                            <tr key={discount.id} className="hover:bg-yellow-50 transition">
                                                <td data-label="Name" className="px-6 py-3">
                                                    <div className="font-medium text-sm text-gray-800">{discount.name}</div>
                                                </td>
                                                <td data-label="Percentage" className="px-6 py-3">
                                                    <div className="text-sm text-gray-600 font-medium">{Math.round(discount.percentage)}%</div>
                                                </td>
                                                <td data-label="Status" className="px-6 py-3">
                                                    <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-semibold ${
                                                        discount.enabled
                                                            ? 'bg-emerald-100 text-emerald-600'
                                                            : 'bg-red-100 text-red-600'
                                                    }`}>
                                                        {discount.enabled ? 'Enabled' : 'Disabled'}
                                                    </span>
                                                </td>
                                                <td data-label="Created" className="px-6 py-3 text-sm text-gray-600">
                                                    {new Date(discount.createdAt).toLocaleDateString()}
                                                </td>
                                                <td data-label="Actions" className="px-6 py-3">
                                                    <div className="flex items-center justify-end gap-1.5">
                                                        <button aria-label="Edit"
                                                            onClick={() => openDiscountModal(discount)}
                                                            className="p-1.5 rounded-lg text-blue-600 hover:bg-blue-100 transition cursor-pointer border-none bg-transparent"
                                                            disabled={processing}
                                                        >
                                                            <Edit2 size={16} />
                                                        </button>
                                                        <button
                                                            onClick={() => handleToggleDiscount(discount)}
                                                            className={`p-1.5 rounded-lg transition cursor-pointer border-none ${
                                                                discount.enabled
                                                                    ? 'text-green-600 hover:bg-green-100'
                                                                    : 'text-gray-600 hover:bg-gray-100'
                                                            }`}
                                                            disabled={processing}
                                                            title={discount.enabled ? 'Disable' : 'Enable'}
                                                        >
                                                            <Power size={16} />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            {/* Pagination */}
                            {discountTotalPages > 1 && (
                                <div className="bg-gray-50 border-t border-gray-200 px-6 py-4 flex items-center justify-between">
                                    <div className="text-sm text-gray-600">
                                        Showing {(discountPage - 1) * ITEMS_PER_PAGE + 1} to {Math.min(discountPage * ITEMS_PER_PAGE, filteredDiscounts.length)} of {filteredDiscounts.length}
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={() => setDiscountPage(prev => Math.max(1, prev - 1))}
                                            disabled={discountPage === 1}
                                            className="flex items-center gap-1 px-3 py-2 rounded-lg border border-gray-300 text-gray-700 text-sm font-medium hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition cursor-pointer bg-white"
                                        >
                                            <ChevronLeft size={16} />
                                            Previous
                                        </button>
                                        <div className="flex items-center gap-2">
                                            {Array.from({ length: discountTotalPages }, (_, i) => i + 1).map(page => (
                                                <button
                                                    key={page}
                                                    onClick={() => setDiscountPage(page)}
                                                    className={`w-8 h-8 rounded-lg text-sm font-medium transition cursor-pointer border-none ${
                                                        discountPage === page
                                                            ? 'bg-brand text-brand-dark font-semibold'
                                                            : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-100'
                                                    }`}
                                                >
                                                    {page}
                                                </button>
                                            ))}
                                        </div>
                                        <button
                                            onClick={() => setDiscountPage(prev => Math.min(discountTotalPages, prev + 1))}
                                            disabled={discountPage === discountTotalPages}
                                            className="flex items-center gap-1 px-3 py-2 rounded-lg border border-gray-300 text-gray-700 text-sm font-medium hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition cursor-pointer bg-white"
                                        >
                                            Next
                                            <ChevronRight size={16} />
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}

            {/* Vouchers Tab */}
            {activeTab === 'vouchers' && (
                <div className="mb-4">
                    {filteredVouchers.length === 0 ? (
                        <div className="flex flex-col items-center justify-center text-gray-500 gap-2 py-8">
                            <p>{searchQuery ? 'No vouchers match your search' : 'No vouchers yet'}</p>
                            <button
                                onClick={() => openVoucherModal()}
                                className="inline-flex items-center gap-2 px-4 py-2 bg-brand text-brand-dark rounded-lg font-medium mt-4 hover:shadow-md transition-shadow"
                            >
                                <Plus size={18} />
                                Add Voucher
                            </button>
                        </div>
                    ) : (
                        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
                            {/* Toolbar */}
                            <div className="px-6 py-4 border-b border-gray-200">
                                <button
                                    onClick={() => openVoucherModal()}
                                    className="inline-flex items-center gap-2 px-4 py-2 bg-brand text-brand-dark rounded-lg font-medium hover:shadow-md transition-shadow"
                                >
                                    <Plus size={18} />
                                    Add Voucher
                                </button>
                            </div>

                            {/* Table */}
                            <div className="overflow-x-auto">
                                <table className="app-responsive-table w-full">
                                    <thead className="bg-yellow-100 border-b border-gray-200">
                                        <tr>
                                            <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-gray-700">Name</th>
                                            <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-gray-700">Code</th>
                                            <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-gray-700">Amount (₱)</th>
                                            <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-gray-700">Used</th>
                                            <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-gray-700">Effective Period</th>
                                            <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-gray-700">Status</th>
                                            <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-gray-700">Created</th>
                                            <th scope="col" className="px-6 py-3 text-right text-xs font-semibold text-gray-700">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-200">
                                        {filteredVouchersPaginated.map(voucher => (
                                            <tr key={voucher.id} className="hover:bg-yellow-50 transition">
                                                <td data-label="Name" className="px-6 py-3">
                                                    <div className="font-medium text-sm text-gray-800">{voucher.name}</div>
                                                </td>
                                                <td data-label="Code" className="px-6 py-3">
                                                    <div className="text-sm text-gray-600 font-mono">{voucher.code}</div>
                                                </td>
                                                <td data-label="Amount (₱)" className="px-6 py-3">
                                                    <div className="text-sm text-gray-900 font-medium">{Number(voucher.amount).toFixed(2)}</div>
                                                </td>
                                                <td data-label="Used" className="px-6 py-3">
                                                    <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-semibold ${
                                                        voucher.used
                                                            ? 'bg-red-100 text-red-600'
                                                            : 'bg-green-100 text-green-600'
                                                    }`}>
                                                        {voucher.used ? 'Used' : 'Available'}
                                                    </span>
                                                </td>
                                                <td data-label="Effective Period" className="px-6 py-3">
                                                    <div className="text-sm text-gray-600">
                                                        {new Date(voucher.startDate).toLocaleDateString()} - {new Date(voucher.endDate).toLocaleDateString()}
                                                    </div>
                                                </td>
                                                <td data-label="Status" className="px-6 py-3">
                                                    <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-semibold ${
                                                        voucher.enabled
                                                            ? 'bg-emerald-100 text-emerald-600'
                                                            : 'bg-red-100 text-red-600'
                                                    }`}>
                                                        {voucher.enabled ? 'Enabled' : 'Disabled'}
                                                    </span>
                                                </td>
                                                <td data-label="Created" className="px-6 py-3 text-sm text-gray-600">
                                                    {new Date(voucher.createdAt).toLocaleDateString()}
                                                </td>
                                                <td data-label="Actions" className="px-6 py-3">
                                                    <div className="flex items-center justify-end gap-1.5">
                                                        <button
                                                            onClick={() => copyToClipboard(voucher.code)}
                                                            className="p-1.5 rounded-lg text-gray-600 hover:bg-gray-100 transition cursor-pointer border-none bg-transparent"
                                                            title="Copy code"
                                                        >
                                                            {copiedCode === voucher.code ? (
                                                                <Check size={16} className="text-green-600" />
                                                            ) : (
                                                                <Copy size={16} />
                                                            )}
                                                        </button>
                                                        <button aria-label="Edit"
                                                            onClick={() => openVoucherModal(voucher)}
                                                            className="p-1.5 rounded-lg text-blue-600 hover:bg-blue-100 transition cursor-pointer border-none bg-transparent"
                                                            disabled={processing}
                                                        >
                                                            <Edit2 size={16} />
                                                        </button>
                                                        <button
                                                            onClick={() => handleToggleVoucher(voucher)}
                                                            className={`p-1.5 rounded-lg transition cursor-pointer border-none ${
                                                                voucher.enabled
                                                                    ? 'text-green-600 hover:bg-green-100'
                                                                    : 'text-gray-600 hover:bg-gray-100'
                                                            }`}
                                                            disabled={processing}
                                                            title={voucher.enabled ? 'Disable' : 'Enable'}
                                                        >
                                                            <Power size={16} />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            {/* Pagination */}
                            {voucherTotalPages > 1 && (
                                <div className="bg-gray-50 border-t border-gray-200 px-6 py-4 flex items-center justify-between">
                                    <div className="text-sm text-gray-600">
                                        Showing {(voucherPage - 1) * ITEMS_PER_PAGE + 1} to {Math.min(voucherPage * ITEMS_PER_PAGE, filteredVouchers.length)} of {filteredVouchers.length}
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={() => setVoucherPage(prev => Math.max(1, prev - 1))}
                                            disabled={voucherPage === 1}
                                            className="flex items-center gap-1 px-3 py-2 rounded-lg border border-gray-300 text-gray-700 text-sm font-medium hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition cursor-pointer bg-white"
                                        >
                                            <ChevronLeft size={16} />
                                            Previous
                                        </button>
                                        <div className="flex items-center gap-2">
                                            {Array.from({ length: voucherTotalPages }, (_, i) => i + 1).map(page => (
                                                <button
                                                    key={page}
                                                    onClick={() => setVoucherPage(page)}
                                                    className={`w-8 h-8 rounded-lg text-sm font-medium transition cursor-pointer border-none ${
                                                        voucherPage === page
                                                            ? 'bg-brand text-brand-dark font-semibold'
                                                            : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-100'
                                                    }`}
                                                >
                                                    {page}
                                                </button>
                                            ))}
                                        </div>
                                        <button
                                            onClick={() => setVoucherPage(prev => Math.min(voucherTotalPages, prev + 1))}
                                            disabled={voucherPage === voucherTotalPages}
                                            className="flex items-center gap-1 px-3 py-2 rounded-lg border border-gray-300 text-gray-700 text-sm font-medium hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition cursor-pointer bg-white"
                                        >
                                            Next
                                            <ChevronRight size={16} />
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}

            {/* Discount Modal */}
            {showDiscountModal && (
                <Modal label="Promotion details" onClose={() => setShowDiscountModal(false)} className="app-form-modal bg-white rounded-lg shadow-xl p-6 max-w-md w-full mx-4">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-xl font-bold text-gray-900">
                                {editingDiscount ? 'Edit Discount' : 'Add Discount'}
                            </h2>
                            <button aria-label="Close dialog"
                                onClick={() => setShowDiscountModal(false)}
                                className="text-gray-400 hover:text-gray-600"
                            >
                                <X size={24} />
                            </button>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label htmlFor="discountsvouchers-field-1" className="text-sm font-semibold text-gray-700 block mb-1">
                                    Discount Name
                                </label>
                                <input id="discountsvouchers-field-1"
                                    type="text"
                                    value={discountForm.name}
                                    onChange={(e) => setDiscountForm(prev => ({ ...prev, name: e.target.value }))}
                                    placeholder="e.g., Weekend Special"
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand"
                                />
                            </div>

                            <div>
                                <label htmlFor="discountsvouchers-field-2" className="text-sm font-semibold text-gray-700 block mb-1">
                                    Percentage (%)
                                </label>
                                <input id="discountsvouchers-field-2"
                                    type="number"
                                    value={discountForm.percentage}
                                    onChange={(e) => setDiscountForm(prev => ({ ...prev, percentage: e.target.value }))}
                                    placeholder="e.g., 10"
                                    min="0"
                                    max="100"
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand"
                                />
                            </div>
                        </div>

                        <div className="flex gap-3 mt-6">
                            <button
                                onClick={() => setShowDiscountModal(false)}
                                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSaveDiscount}
                                disabled={processing}
                                className="flex-1 px-4 py-2 bg-brand text-brand-dark rounded-lg font-medium hover:shadow-md transition-shadow disabled:opacity-50"
                            >
                                {editingDiscount ? 'Update' : 'Create'}
                            </button>
                        </div>
                    </Modal>
            )}

            {/* Voucher Modal */}
            {showVoucherModal && (
                <Modal label="Promotion details" onClose={() => setShowVoucherModal(false)} className="app-form-modal bg-white rounded-lg shadow-xl p-6 max-w-md w-full mx-4">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-xl font-bold text-gray-900">
                                {editingVoucher ? 'Edit Voucher' : 'Add Voucher'}
                            </h2>
                            <button aria-label="Close dialog"
                                onClick={() => setShowVoucherModal(false)}
                                className="text-gray-400 hover:text-gray-600"
                            >
                                <X size={24} />
                            </button>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label htmlFor="discountsvouchers-field-3" className="text-sm font-semibold text-gray-700 block mb-1">
                                    Voucher Name
                                </label>
                                <input id="discountsvouchers-field-3"
                                    type="text"
                                    value={voucherForm.name}
                                    onChange={(e) => setVoucherForm(prev => ({ ...prev, name: e.target.value }))}
                                    placeholder="e.g., Birthday Special"
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand"
                                />
                            </div>

                            <div>
                                <label htmlFor="discountsvouchers-field-4" className="text-sm font-semibold text-gray-700 block mb-1">
                                    Code
                                </label>
                                {editingVoucher ? (
                                    <input id="discountsvouchers-field-4"
                                        type="text"
                                        value={voucherForm.code}
                                        onChange={(e) => setVoucherForm(prev => ({ ...prev, code: e.target.value.toUpperCase() }))}
                                        placeholder="e.g., SAVE50"
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand font-mono"
                                    />
                                ) : (
                                    <div className="px-3 py-2 bg-gray-100 rounded-lg text-gray-600 text-sm italic">
                                        Codes will be auto-generated for each voucher copy
                                    </div>
                                )}
                            </div>

                            <div>
                                <label htmlFor="discountsvouchers-field-5" className="text-sm font-semibold text-gray-700 block mb-1">
                                    Amount (₱)
                                </label>
                                <input id="discountsvouchers-field-5"
                                    type="number"
                                    value={voucherForm.amount}
                                    onChange={(e) => setVoucherForm(prev => ({ ...prev, amount: e.target.value }))}
                                    placeholder="e.g., 500"
                                    min="0"
                                    step="0.01"
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label htmlFor="discountsvouchers-field-6" className="text-sm font-semibold text-gray-700 block mb-1">
                                        Start Date
                                    </label>
                                    <input id="discountsvouchers-field-6"
                                        type="date"
                                        value={voucherForm.startDate}
                                        onChange={(e) => setVoucherForm(prev => ({ ...prev, startDate: e.target.value }))}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand"
                                    />
                                </div>
                                <div>
                                    <label htmlFor="discountsvouchers-field-7" className="text-sm font-semibold text-gray-700 block mb-1">
                                        End Date
                                    </label>
                                    <input id="discountsvouchers-field-7"
                                        type="date"
                                        value={voucherForm.endDate}
                                        onChange={(e) => setVoucherForm(prev => ({ ...prev, endDate: e.target.value }))}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand"
                                    />
                                </div>
                            </div>

                            {!editingVoucher && (
                                <div>
                                    <label htmlFor="discountsvouchers-field-8" className="text-sm font-semibold text-gray-700 block mb-1">
                                        Quantity (Number of copies)
                                    </label>
                                    <input id="discountsvouchers-field-8"
                                        type="number"
                                        value={voucherForm.quantity}
                                        onChange={(e) => setVoucherForm(prev => ({ ...prev, quantity: e.target.value }))}
                                        placeholder="e.g., 10"
                                        min="1"
                                        max="1000"
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand"
                                    />
                                    <p className="text-xs text-gray-500 mt-1">Each will have a unique voucher code</p>
                                </div>
                            )}
                        </div>

                        <div className="flex gap-3 mt-6">
                            <button
                                onClick={() => setShowVoucherModal(false)}
                                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSaveVoucher}
                                disabled={processing}
                                className="flex-1 px-4 py-2 bg-brand text-brand-dark rounded-lg font-medium hover:shadow-md transition-shadow disabled:opacity-50"
                            >
                                {editingVoucher ? 'Update' : 'Create'}
                            </button>
                        </div>
                    </Modal>
            )}

            {/* Alert Modal */}
            <AlertModal
                isOpen={alertModal.isOpen}
                type={alertModal.type}
                title={alertModal.title}
                message={alertModal.message}
                onClose={closeAlert}
                onConfirm={alertModal.onConfirm}
                confirmButtonLabel={alertModal.confirmButtonLabel}
                confirmButtonColor={alertModal.confirmButtonColor}
            />
        </div>
    );
}
