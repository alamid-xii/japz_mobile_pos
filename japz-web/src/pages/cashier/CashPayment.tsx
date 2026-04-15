import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';
import { ordersAPI } from '../../services/api';
import { useAuth } from '../../hooks/useAuth';

export default function CashPayment() {
    const navigate = useNavigate();
    const location = useLocation();
    const { user } = useAuth();
    const {
        total, subtotal, discount, discountId, voucherCode, voucherAmount, items, paymentMethod = 'cash',
        customerName, orderType, tableNumber, deliveryAddress, notes
    } = (location.state as any) || {};

    const [amountReceived, setAmountReceived] = useState('');
    const [processing, setProcessing] = useState(false);

    const totalNum = Number(total || 0);
    const received = Number(amountReceived || 0);
    const change = received - totalNum;
    const isCash = paymentMethod === 'cash';
    const isFree = totalNum === 0;
    const isValidPayment = isFree || (isCash ? received >= totalNum : true);

    const quickAmounts = [50, 100, 200, 500, 1000];

    if (!total) return <div className="flex flex-col items-center justify-center h-full text-gray-500 gap-2 py-8"><p>No order data</p></div>;

    const handlePay = async () => {
        if (!isValidPayment) return;

        setProcessing(true);
        try {
            const orderNumber = `ORD-${Date.now().toString().slice(-8)}`;
            const itemsArray = Array.isArray(items) ? items : [];
            const orderData = {
                orderNumber,
                cashierId: user?.id,
                cashier: user?.name,
                customerName,
                total: totalNum,
                subtotal: Number(subtotal || totalNum),
                discount: Number(discount || 0),
                discountId: discountId || null,
                voucherCode: voucherCode || null,
                voucherAmount: voucherAmount ? Number(voucherAmount) : null,
                payment: {
                    method: paymentMethod as 'cash' | 'card' | 'digital',
                    amount: totalNum,
                    amountReceived: isCash ? received : totalNum,
                    change: isCash ? Math.round(change * 100) / 100 : 0
                },
                items: itemsArray.map((i: any) => ({
                    id: i.id.toString(),
                    name: i.name,
                    price: i.itemPrice || i.price,
                    quantity: i.quantity,
                    total: (i.itemPrice || i.price) * i.quantity,
                    modifiers: { size: i.selectedSize || null, flavor: i.selectedFlavor || null, temperature: i.selectedTemperature || null }
                })),
                status: 'pending',
                orderType: orderType || null,
                tableNumber: tableNumber || null,
                deliveryAddress: deliveryAddress || null,
                notes: notes || null,
            };
            console.log('Sending order data:', orderData);
            await ordersAPI.create(orderData);
            localStorage.removeItem('cashierCart');
            navigate('/cashier/receipt', {
                state: {
                    orderNumber,
                    total: totalNum,
                    subtotal: Number(subtotal || totalNum),
                    discount: Number(discount || 0),
                    discountId: discountId || null,
                    voucherCode: voucherCode || null,
                    voucherAmount: voucherAmount ? Number(voucherAmount) : null,
                    amountReceived: isCash ? received : totalNum,
                    change: isCash ? Math.round(change * 100) / 100 : 0,
                    items,
                    method: paymentMethod,
                    customerName,
                    orderType,
                    tableNumber,
                    deliveryAddress,
                    cashier: user?.name
                },
                replace: true
            });
        } catch (e: any) {
            console.error('Payment error:', e);
            alert('Payment failed: ' + (e.response?.data?.error || e.message || 'Unknown error'));
        }
        finally { setProcessing(false); }
    };

    return (
        <div className="min-h-full flex flex-col items-center p-5 md:p-8 md:pt-10 overflow-y-auto">
            <div className="w-full max-w-md">
                <button className="inline-flex items-center gap-1.5 px-4 py-2 border border-gray-200 rounded-lg bg-white hover:bg-gray-50 cursor-pointer font-medium text-sm mb-4"
                    onClick={() => navigate(-1)}>
                    <ChevronLeft size={18} /> Back
                </button>
                <h1 className="text-xl md:text-2xl font-bold text-center capitalize">{paymentMethod} Payment</h1>

                {/* Order Info Summary */}
                <div className="bg-gray-50 rounded-xl p-4 my-4">
                    <div className="flex justify-between py-1">
                        <span className="text-gray-500">Customer:</span>
                        <span className="font-semibold">{customerName}</span>
                    </div>
                    <div className="flex justify-between py-1">
                        <span className="text-gray-500">Order Type:</span>
                        <span className="font-semibold capitalize">{orderType}</span>
                    </div>
                    {tableNumber && (
                        <div className="flex justify-between py-1">
                            <span className="text-gray-500">Table:</span>
                            <span className="font-semibold">{tableNumber}</span>
                        </div>
                    )}
                    {deliveryAddress && (
                        <div className="flex justify-between py-1">
                            <span className="text-gray-500">Address:</span>
                            <span className="font-semibold text-right max-w-[60%]">{deliveryAddress}</span>
                        </div>
                    )}
                    <div className="flex justify-between py-2 border-t border-gray-200 mt-2 pt-2">
                        <span className="text-gray-500">Amount Due:</span>
                        <span className="text-xl font-bold text-brand-dark">₱{totalNum.toFixed(2)}</span>
                    </div>
                </div>

                {/* Cash Payment - Amount Received */}
                {isCash && !isFree && (
                    <>
                        <div className="mb-4">
                            <label className="text-sm font-semibold text-gray-700 mb-2 block">Amount Received</label>
                            <input
                                type="number"
                                placeholder="0.00"
                                value={amountReceived}
                                onChange={(e) => setAmountReceived(e.target.value)}
                                className={`w-full py-4 text-2xl font-bold text-center border-2 rounded-xl outline-none font-[inherit] ${received > 0 ? (isValidPayment ? 'border-emerald-500' : 'border-red-400') : 'border-gray-200'
                                    } focus:border-brand`}
                            />
                        </div>

                        {/* Quick Amounts */}
                        <div className="mb-4">
                            <p className="text-sm font-semibold text-gray-500 mb-2">Quick Amounts</p>
                            <div className="grid grid-cols-5 gap-2">
                                {quickAmounts.map(amt => (
                                    <button
                                        key={amt}
                                        onClick={() => setAmountReceived(amt.toString())}
                                        className={`py-2.5 rounded-xl font-semibold text-sm transition font-[inherit] border ${amountReceived === amt.toString()
                                                ? 'bg-brand border-brand text-brand-dark'
                                                : 'bg-white border-gray-200 hover:bg-yellow-50 hover:border-brand cursor-pointer'
                                            }`}
                                    >
                                        ₱{amt}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Change Display */}
                        {received > 0 && (
                            <div className="bg-gray-50 rounded-xl p-4 mb-6">
                                <div className="flex justify-between py-1">
                                    <span className="text-gray-500">Amount Received:</span>
                                    <span className="font-semibold">₱{received.toFixed(2)}</span>
                                </div>
                                <div className="flex justify-between py-1 border-b border-gray-200 pb-2">
                                    <span className="text-gray-500">Amount Due:</span>
                                    <span className="font-semibold">₱{totalNum.toFixed(2)}</span>
                                </div>
                                <div className="flex justify-between py-2 mt-1">
                                    <span className="font-bold">Change:</span>
                                    <span className={`font-bold ${isValidPayment ? 'text-emerald-500' : 'text-red-500'}`}>
                                        {isValidPayment ? '+' : '-'}₱{Math.abs(change).toFixed(2)}
                                    </span>
                                </div>
                            </div>
                        )}
                    </>
                )}

                {/* Free Order Message */}
                {isFree && (
                    <div className="bg-emerald-50 border-2 border-emerald-300 rounded-xl p-6 mb-6 text-center">
                        <p className="text-emerald-700 font-bold text-lg">✓ Order is Complimentary</p>
                        <p className="text-emerald-600 text-sm mt-2">No charge due to applied discount/voucher</p>
                        <p className="text-emerald-500 text-2xl font-bold mt-3">₱0.00</p>
                    </div>
                )}

                {/* Card/Digital Payment Info */}
                {!isCash && !isFree && (
                    <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 mb-6 text-center">
                        <p className="text-emerald-700 font-medium">Ready to process {paymentMethod} payment</p>
                        <p className="text-emerald-600 text-sm mt-1">Amount: ₱{totalNum.toFixed(2)}</p>
                    </div>
                )}

                {/* Complete Button */}
                <button
                    disabled={!isValidPayment || processing}
                    onClick={handlePay}
                    className={`w-full py-4 rounded-xl text-lg font-semibold transition font-[inherit] ${isValidPayment && !processing
                            ? 'bg-brand text-brand-dark cursor-pointer hover:shadow-md hover:shadow-yellow-300/40'
                            : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                        }`}
                >
                    {processing ? 'Processing...' : isFree ? 'Complete Order (Free)' : 'Complete Transaction'}
                </button>
            </div>
        </div>
    );
}
