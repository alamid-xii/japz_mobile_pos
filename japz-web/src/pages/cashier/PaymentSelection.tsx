import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ChevronLeft, Banknote, CreditCard, Smartphone, Check, User, UtensilsCrossed, ShoppingBag, Truck, Gift, Receipt } from 'lucide-react';
import { discountsVouchersAPI } from '../../services/api';

type PaymentMethod = 'cash' | 'card' | 'digital';
type OrderType = 'dine-in' | 'take-out' | 'delivery';

export default function PaymentSelection() {
    const navigate = useNavigate();
    const location = useLocation();
    const { total, items, itemCount } = (location.state as any) || {};
    const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');
    const [discounts, setDiscounts] = useState<any[]>([]);
    const [selectedDiscount, setSelectedDiscount] = useState<any>(null);
    const [voucherCode, setVoucherCode] = useState('');
    const [voucherError, setVoucherError] = useState('');
    const [appliedVoucher, setAppliedVoucher] = useState<any>(null);
    const [customerName, setCustomerName] = useState('');
    const [orderType, setOrderType] = useState<OrderType | ''>('');
    const [tableNumber, setTableNumber] = useState('');
    const [deliveryAddress, setDeliveryAddress] = useState('');
    const [notes, setNotes] = useState('');
    const [errors, setErrors] = useState<Record<string, string>>({});

    useEffect(() => {
        const fetchDiscounts = async () => {
            try {
                const response = await discountsVouchersAPI.getDiscounts();
                const enabledDiscounts = response.data.filter((d: any) => d.enabled);
                setDiscounts(enabledDiscounts);
            } catch (error) {
                console.error('Error fetching discounts:', error);
            }
        };
        fetchDiscounts();
    }, []);

    const subtotal = Number(total || 0);
    const discountAmount = selectedDiscount
        ? (subtotal * selectedDiscount.percentage) / 100
        : 0;
    const voucherAmount = appliedVoucher ? Number(appliedVoucher.amount) || 0 : 0;
    const finalTotal = Math.max(0, subtotal - discountAmount - voucherAmount);

    if (!total) return <div className="flex flex-col items-center justify-center h-full text-gray-500 gap-2 py-8"><p>No order data</p></div>;

    const validateVoucher = async () => {
        if (!voucherCode.trim()) {
            setVoucherError('');
            setAppliedVoucher(null);
            return;
        }

        try {
            const vouchers = await discountsVouchersAPI.getVouchers();
            const voucher = vouchers.data.find((v: any) => v.code === voucherCode.toUpperCase());

            if (!voucher) {
                setVoucherError('Voucher code not found');
                setAppliedVoucher(null);
                return;
            }

            if (voucher.used) {
                setVoucherError('This voucher has already been used');
                setAppliedVoucher(null);
                return;
            }

            if (!voucher.enabled) {
                setVoucherError('This voucher is disabled');
                setAppliedVoucher(null);
                return;
            }

            const now = new Date();
            const start = new Date(voucher.startDate);
            const end = new Date(voucher.endDate);

            if (now < start || now > end) {
                setVoucherError('This voucher is not valid for today');
                setAppliedVoucher(null);
                return;
            }

            setAppliedVoucher(voucher);
            setVoucherError('');
        } catch (error) {
            setVoucherError('Error validating voucher');
            setAppliedVoucher(null);
        }
    };

    const validate = (): boolean => {
        const newErrors: Record<string, string> = {};
        if (!customerName.trim()) newErrors.customerName = 'Customer name is required';
        if (!orderType) newErrors.orderType = 'Please select an order type';
        if (orderType === 'dine-in' && !tableNumber.trim()) newErrors.tableNumber = 'Table number is required for dine-in';
        if (orderType === 'delivery' && !deliveryAddress.trim()) newErrors.deliveryAddress = 'Delivery address is required';
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleProceed = () => {
        if (!validate()) return;
        navigate('/cashier/cash-payment', {
            state: {
                total: finalTotal.toFixed(2),
                subtotal: subtotal.toFixed(2),
                discount: discountAmount.toFixed(2),
                discountPercent: selectedDiscount ? selectedDiscount.percentage : 0,
                discountId: selectedDiscount ? selectedDiscount.id : undefined,
                voucherCode: appliedVoucher ? appliedVoucher.code : undefined,
                voucherAmount: appliedVoucher ? appliedVoucher.amount : undefined,
                items,
                itemCount,
                paymentMethod,
                customerName: customerName.trim(),
                orderType,
                tableNumber: orderType === 'dine-in' ? tableNumber.trim() : undefined,
                deliveryAddress: orderType === 'delivery' ? deliveryAddress.trim() : undefined,
                notes: notes.trim() || undefined
            }
        });
    };

    const methods: { key: PaymentMethod; label: string; icon: typeof Banknote; enabled: boolean }[] = [
        { key: 'cash', label: 'Cash Payment', icon: Banknote, enabled: true },
        { key: 'card', label: 'Card Payment', icon: CreditCard, enabled: true },
        { key: 'digital', label: 'Digital Payment', icon: Smartphone, enabled: true },
    ];

    const orderTypes: { key: OrderType; label: string; icon: typeof UtensilsCrossed }[] = [
        { key: 'dine-in', label: 'Dine In', icon: UtensilsCrossed },
        { key: 'take-out', label: 'Takeout', icon: ShoppingBag },
        { key: 'delivery', label: 'Delivery', icon: Truck },
    ];

    return (
        <div className="min-h-full flex flex-col items-center p-5 md:p-8 md:pt-12">
            <div className="w-full max-w-3xl">
                <div className="relative flex justify-center mb-6">
                    <button className="absolute left-0 inline-flex items-center gap-1.5 px-4 py-2 border border-gray-200 rounded-lg bg-white hover:bg-gray-50 cursor-pointer font-medium text-sm"
                        onClick={() => navigate(-1)}>
                        <ChevronLeft size={18} /> Back
                    </button>
                    <h1 className="text-xl md:text-2xl font-bold">Complete Order</h1>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Left Column - Order Details */}
                    <div className="space-y-6">
                        {/* Order Details Header */}
                        <div className="border-b-2 border-brand pb-2 mb-4">
                            <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                                <Receipt size={20} className="text-brand" />
                                Order Details
                            </h2>
                        </div>
                        {/* Customer Name */}
                        <div>
                            <label className="text-sm font-semibold text-gray-700 mb-2 block">
                                Customer Name <span className="text-red-500">*</span>
                            </label>
                            <div className="relative">
                                <User size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                <input
                                    type="text"
                                    placeholder="Enter customer name"
                                    value={customerName}
                                    onChange={(e) => { setCustomerName(e.target.value); setErrors(prev => ({ ...prev, customerName: '' })); }}
                                    className={`w-full pl-10 pr-4 py-3 border rounded-xl text-base outline-none transition font-[inherit] ${errors.customerName ? 'border-red-400 focus:border-red-500 focus:ring-2 focus:ring-red-200' : 'border-gray-200 focus:border-brand focus:ring-2 focus:ring-brand/20'}`}
                                />
                            </div>
                        </div>

                        {/* Order Type */}
                        <div>
                            <label className="text-sm font-semibold text-gray-700 mb-2 block">
                                Order Type <span className="text-red-500">*</span>
                            </label>
                            <div className={`grid grid-cols-3 gap-2 ${errors.orderType ? 'ring-2 ring-red-300 rounded-xl p-1' : ''}`}>
                                {orderTypes.map(({ key, label, icon: Icon }) => (
                                    <button
                                        key={key}
                                        onClick={() => { setOrderType(key); setErrors(prev => ({ ...prev, orderType: '', tableNumber: '', deliveryAddress: '' })); }}
                                        className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 transition font-[inherit] cursor-pointer ${orderType === key
                                            ? 'bg-brand border-brand'
                                            : errors.orderType
                                                ? 'bg-white border-red-300 hover:border-red-400'
                                                : 'bg-white border-gray-200 hover:border-brand/50'
                                            }`}
                                    >
                                        <Icon size={20} className={orderType === key ? 'text-brand-dark' : 'text-gray-600'} />
                                        <span className={`text-xs font-semibold ${orderType === key ? 'text-brand-dark' : 'text-gray-700'}`}>{label}</span>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Table Number (for dine-in) */}
                        {orderType === 'dine-in' && (
                            <div>
                                <label className="text-sm font-semibold text-gray-700 mb-2 block">
                                    Table Number <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    placeholder="Enter table number"
                                    value={tableNumber}
                                    onChange={(e) => { setTableNumber(e.target.value); setErrors(prev => ({ ...prev, tableNumber: '' })); }}
                                    className={`w-full px-4 py-3 border rounded-xl text-base outline-none transition font-[inherit] ${errors.tableNumber ? 'border-red-400 focus:border-red-500 focus:ring-2 focus:ring-red-200' : 'border-gray-200 focus:border-brand focus:ring-2 focus:ring-brand/20'}`}
                                />
                            </div>
                        )}

                        {/* Delivery Address (for delivery) */}
                        {orderType === 'delivery' && (
                            <div>
                                <label className="text-sm font-semibold text-gray-700 mb-2 block">
                                    Delivery Address <span className="text-red-500">*</span>
                                </label>
                                <textarea
                                    placeholder="Enter delivery address"
                                    value={deliveryAddress}
                                    onChange={(e) => { setDeliveryAddress(e.target.value); setErrors(prev => ({ ...prev, deliveryAddress: '' })); }}
                                    rows={2}
                                    className={`w-full px-4 py-3 border rounded-xl text-base outline-none transition font-[inherit] resize-none ${errors.deliveryAddress ? 'border-red-400 focus:border-red-500 focus:ring-2 focus:ring-red-200' : 'border-gray-200 focus:border-brand focus:ring-2 focus:ring-brand/20'}`}
                                />
                            </div>
                        )}

                        {/* Notes (optional) */}
                        <div>
                            <label className="text-sm font-semibold text-gray-700 mb-2 block">
                                Notes <span className="text-gray-400 font-normal">(optional)</span>
                            </label>
                            <textarea
                                placeholder="Any special instructions..."
                                value={notes}
                                onChange={(e) => setNotes(e.target.value)}
                                rows={2}
                                className="w-full px-4 py-3 border border-gray-200 rounded-xl text-base outline-none focus:border-brand focus:ring-2 focus:ring-brand/20 transition font-[inherit] resize-none"
                            />
                        </div>
                    </div>

                    {/* Right Column - Payment & Summary */}
                    <div className="space-y-4">
                        {/* Payment Section Header */}
                        <div className="border-b-2 border-brand pb-2">
                            <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                                <Banknote size={20} className="text-brand" />
                                Payment & Discounts
                            </h2>
                        </div>

                        {/* Payment Methods Card */}
                        <div className="bg-white border-2 border-gray-100 rounded-xl p-3">
                            <h3 className="text-xs font-semibold text-gray-600 mb-2 uppercase tracking-wide">Payment Method</h3>
                            <div className="flex flex-col gap-2">
                                {methods.map(({ key, label, icon: Icon, enabled }) => (
                                    <button
                                        key={key}
                                        onClick={() => enabled && setPaymentMethod(key)}
                                        disabled={!enabled}
                                        className={`flex items-center gap-3 p-3 rounded-lg border-2 transition font-[inherit] ${paymentMethod === key
                                            ? 'bg-brand border-brand'
                                            : 'bg-white border-gray-200 hover:border-brand/50'
                                            } ${!enabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                                    >
                                        <Icon size={20} className={paymentMethod === key ? 'text-brand-dark' : 'text-brand'} />
                                        <span className={`flex-1 text-left text-sm font-semibold ${paymentMethod === key ? 'text-brand-dark' : 'text-gray-900'}`}>
                                            {label} {!enabled && '(Coming Soon)'}
                                        </span>
                                        {paymentMethod === key && <Check size={18} className="text-brand-dark" />}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Discount & Voucher Section - Compact */}
                        <div className="space-y-3">
                            {/* Discount Selection */}
                            <div className="bg-white border-2 border-gray-100 rounded-xl p-3">
                                <h3 className="text-xs font-semibold text-gray-600 mb-2 uppercase tracking-wide flex items-center gap-1">
                                    <Gift size={14} className="text-emerald-600" />
                                    Discount
                                </h3>
                                {discounts.length > 0 ? (
                                    <div className="grid grid-cols-2 gap-2 mb-2">
                                        {discounts.map((discount) => (
                                            <button
                                                key={discount.id}
                                                onClick={() => setSelectedDiscount(selectedDiscount?.id === discount.id ? null : discount)}
                                                className={`px-2.5 py-2 rounded-lg border-2 transition font-semibold text-xs cursor-pointer ${selectedDiscount?.id === discount.id
                                                    ? 'bg-emerald-100 border-emerald-500 text-emerald-700'
                                                    : 'bg-white border-gray-200 text-gray-700 hover:border-emerald-300'
                                                    }`}
                                            >
                                                {discount.name}
                                                <span className="block text-xs font-normal">{discount.percentage}% off</span>
                                            </button>
                                        ))}
                                    </div>
                                ) : (
                                    <p className="text-gray-500 text-xs">None available</p>
                                )}
                                {selectedDiscount && (
                                    <button
                                        onClick={() => setSelectedDiscount(null)}
                                        className="w-full px-2 py-1.5 text-xs text-red-600 border border-red-200 rounded hover:bg-red-50 transition cursor-pointer"
                                    >
                                        Clear
                                    </button>
                                )}
                            </div>

                            {/* Voucher Code */}
                            <div className="bg-white border-2 border-gray-100 rounded-xl p-3">
                                <h3 className="text-xs font-semibold text-gray-600 mb-2 uppercase tracking-wide flex items-center gap-1">
                                    <Gift size={14} className="text-blue-600" />
                                    Voucher
                                </h3>
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        placeholder="Code"
                                        value={voucherCode}
                                        onChange={(e) => setVoucherCode(e.target.value.toUpperCase())}
                                        className={`flex-1 px-3 py-2 border rounded-lg text-sm outline-none transition font-mono ${appliedVoucher ? 'border-emerald-300 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-200' :
                                            voucherError ? 'border-red-400 focus:border-red-500 focus:ring-2 focus:ring-red-200' :
                                                'border-gray-200 focus:border-brand focus:ring-2 focus:ring-brand/20'
                                            }`}
                                    />
                                    <button
                                        onClick={validateVoucher}
                                        className="px-3 py-2 bg-brand text-brand-dark rounded-lg font-semibold text-sm hover:shadow-md transition cursor-pointer"
                                    >
                                        Apply
                                    </button>
                                </div>
                                {voucherError && <p className="text-red-500 text-xs mt-1">{voucherError}</p>}
                                {appliedVoucher && <p className="text-emerald-600 text-xs mt-1">✓ -{`₱${Number(appliedVoucher.amount).toFixed(2)}`}</p>}
                            </div>
                        </div>

                        {/* Summary Card - Compact */}
                        <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-xl p-4 text-white border-2 border-brand">
                            <h3 className="text-xs font-semibold text-gray-300 mb-3 uppercase tracking-widest">Summary</h3>
                            <div className="space-y-1.5">
                                <div className="flex justify-between text-sm">
                                    <span className="text-gray-300">Subtotal</span>
                                    <span className="font-semibold">₱{subtotal.toFixed(2)}</span>
                                </div>
                                {discountAmount > 0 && (
                                    <div className="flex justify-between text-sm">
                                        <span className="text-gray-300">Discount</span>
                                        <span className="font-semibold text-emerald-400">-₱{discountAmount.toFixed(2)}</span>
                                    </div>
                                )}
                                {appliedVoucher && (
                                    <div className="flex justify-between text-sm">
                                        <span className="text-gray-300">Voucher</span>
                                        <span className="font-semibold text-emerald-400">-₱{Number(appliedVoucher.amount).toFixed(2)}</span>
                                    </div>
                                )}
                                <div className="flex justify-between pt-2 border-t border-gray-700">
                                    <span className="font-semibold">Total</span>
                                    <span className="text-xl font-bold text-brand">₱{finalTotal.toFixed(2)}</span>
                                </div>
                            </div>
                        </div>

                        {Object.keys(errors).some(k => errors[k]) && (
                            <p className="text-red-500 text-xs text-center bg-red-50 border border-red-200 rounded-lg p-2">⚠️ Fill all required fields</p>
                        )}

                        <button
                            onClick={handleProceed}
                            className="w-full py-3 bg-gradient-to-r from-brand to-brand/80 text-brand-dark rounded-xl font-bold cursor-pointer hover:shadow-xl hover:shadow-brand/30 transition-all active:scale-95 text-base"
                        >
                            ✓ Proceed to Payment
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
