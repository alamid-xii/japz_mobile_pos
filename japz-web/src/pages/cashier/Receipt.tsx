import { useLocation, useNavigate } from 'react-router-dom';
import { CheckCircle } from 'lucide-react';

export default function Receipt() {
    const navigate = useNavigate();
    const location = useLocation();
    const {
        orderNumber, total, subtotal, discount, amountReceived, change,
        items, method, customerName, orderType, tableNumber, cashier
    } = (location.state as any) || {};

    if (!orderNumber) return <div className="flex flex-col items-center justify-center h-full text-gray-500 gap-2 py-8"><h1 className="text-xl font-semibold text-gray-900">No receipt to display</h1><p>View previous orders in order history.</p><button className="mt-4 px-5 py-3 bg-brand text-brand-dark rounded-md font-semibold" onClick={() => navigate('/cashier/history')}>View order history</button></div>;

    const orderDate = new Date();

    return (
        <div className="p-4 md:p-8 flex flex-col items-center min-h-full md:justify-center overflow-y-auto">
            <div className="text-emerald-500 mt-6 md:mt-0 mb-3"><CheckCircle size={56} /></div>
            <h1 className="text-2xl font-bold mb-1">Payment Successful!</h1>
            <p className="text-gray-500 mb-6">Order #{orderNumber}</p>

            {/* Receipt Card */}
            <div className="w-full max-w-md mx-auto bg-white border-2 border-dashed border-gray-300 rounded-xl p-5 shadow-sm">
                {/* Header */}
                <div className="text-center mb-4">
                    <img src="/logo.jpg" alt="JAPZ" className="w-20 h-20 mx-auto rounded-lg mb-2" />
                    <h2 className="text-xl font-bold">JAPZ GRILL</h2>
                    <p className="text-sm font-semibold text-gray-700">Burger & Bistro</p>
                    <p className="text-xs text-gray-500 mt-2">Quezon St., Bagumbayan I, Bongabong, Philippines</p>
                    <p className="text-xs text-gray-500">0966 359 9235</p>
                    <p className="text-xs text-gray-500">japzgrillburgerandbistro@gmail.com</p>
                    <p className="text-xs text-gray-600 mt-2">Cashier: {cashier || '—'}</p>
                </div>

                <div className="border-t border-b border-black py-2 mb-3" />

                {/* Order Details */}
                <div className="text-xs text-gray-600 mb-3 space-y-1">
                    <div className="flex justify-between">
                        <span>Order #: {orderNumber}</span>
                        <span>POS: POS 1</span>
                    </div>
                    {customerName && <p>Customer: {customerName}</p>}
                    {orderType && (
                        <p>
                            Order Type: {orderType === 'dine-in' ? '🍽️ Dine-in' : orderType === 'take-out' ? '📦 Take-out' : '🚚 Delivery'}
                            {tableNumber && ` (Table ${tableNumber})`}
                        </p>
                    )}
                    <p>{orderDate.toLocaleDateString()} {orderDate.toLocaleTimeString()}</p>
                </div>

                <div className="border-t border-b border-black py-2 mb-3" />

                {/* Items */}
                <div className="mb-3">
                    {items?.map((item: any, idx: number) => (
                        <div key={idx} className="mb-2">
                            <div className="flex justify-between text-sm">
                                <span className="font-semibold flex-1">{item.name}</span>
                                <span className="font-semibold">₱{((item.itemPrice || item.price) * item.quantity).toFixed(2)}</span>
                            </div>
                            <p className="text-xs text-gray-500">
                                {item.quantity} x ₱{(item.itemPrice || item.price).toFixed(2)}
                                {item.selectedSize && ` • ${item.selectedSize}`}
                                {item.selectedFlavor && ` • ${item.selectedFlavor}`}
                            </p>
                        </div>
                    ))}
                </div>

                <div className="border-t border-b border-black py-2 mb-3" />

                {/* Totals */}
                <div className="space-y-1.5">
                    <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Subtotal:</span>
                        <span>₱{Number(subtotal || total).toFixed(2)}</span>
                    </div>
                    {Number(discount) > 0 && (
                        <div className="flex justify-between text-sm">
                            <span className="text-gray-600">Discount:</span>
                            <span className="text-emerald-500">-₱{Number(discount).toFixed(2)}</span>
                        </div>
                    )}
                    <div className="flex justify-between font-bold text-lg pt-2 border-t border-gray-200">
                        <span>Total:</span>
                        <span>₱{Number(total).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Paid ({method}):</span>
                        <span>₱{Number(amountReceived).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between font-semibold text-emerald-500 text-lg">
                        <span>Change:</span>
                        <span>₱{Number(change).toFixed(2)}</span>
                    </div>
                </div>

                {/* Footer */}
                <div className="border-t border-dashed border-gray-300 mt-4 pt-4 text-center">
                    <p className="text-sm font-semibold">Thank you for dining with us!</p>
                    <p className="text-xs text-gray-500 mt-1">Please come again</p>
                </div>


            </div>

            <button className="w-full max-w-md py-4 mt-6 rounded-xl bg-brand font-semibold text-brand-dark text-base hover:shadow-md hover:shadow-yellow-300/40 active:scale-[0.97] transition-all"
                onClick={() => navigate('/cashier/pos', { replace: true })}>
                New Order
            </button>
        </div>
    );
}
