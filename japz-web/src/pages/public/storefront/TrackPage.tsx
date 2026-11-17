import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { CheckCircle, ChefHat, Clock, PackageCheck, XCircle, Search, Bike, CreditCard } from 'lucide-react';
import { publicOrderAPI } from '../../../services/api';
import { peso } from './StorefrontContext';
import { useStorefrontBase } from './storefrontRouting';
import LiveDeliveryTracking from './components/LiveDeliveryTracking';
import DeliveryEta, { type DeliveryInfo } from './components/DeliveryEta';
import RateOrder from './components/RateOrder';
import DeliveryReceipt from '../../../components/DeliveryReceipt';

interface TrackedItem { name: string; quantity: number; total: string | number; modifiers?: Record<string, string> | null }
interface TrackedOrder {
    orderNumber: string;
    status: 'awaiting-payment' | 'pending' | 'preparing' | 'ready' | 'out-for-delivery' | 'completed' | 'cancelled';
    orderType: string | null;
    tableNumber: string | null;
    total: string | number;
    notes: string | null;
    canRate: boolean;
    rated: boolean;
    delivery: DeliveryInfo | null;
    items: TrackedItem[];
}

const PICKUP_STEPS = [
    { key: 'pending', label: 'Order received', icon: Clock, blurb: 'We have your order.' },
    { key: 'preparing', label: 'Being prepared', icon: ChefHat, blurb: 'The kitchen is working on it.' },
    { key: 'ready', label: 'Ready', icon: PackageCheck, blurb: 'Collect it at the counter.' },
    { key: 'completed', label: 'Completed', icon: CheckCircle, blurb: 'Enjoy your meal!' },
] as const;

const DELIVERY_STEPS = [
    { key: 'pending', label: 'Order received', icon: Clock, blurb: 'We have your order.' },
    { key: 'preparing', label: 'Being prepared', icon: ChefHat, blurb: 'The kitchen is working on it.' },
    { key: 'ready', label: 'Packed', icon: PackageCheck, blurb: 'Packed and waiting for a rider.' },
    { key: 'out-for-delivery', label: 'On the way', icon: Bike, blurb: 'Your order has left the store.' },
    { key: 'completed', label: 'Delivered', icon: CheckCircle, blurb: 'Enjoy your meal!' },
] as const;

// Remembering the last order lets the Orders tab open straight onto it.
const LAST_ORDER_KEY = 'japz.lastOrder';

export default function TrackPage() {
    const { orderNumber } = useParams();
    const navigate = useNavigate();
    const base = useStorefrontBase();

    const [lookup, setLookup] = useState('');
    const [order, setOrder] = useState<TrackedOrder | null>(null);
    const [loading, setLoading] = useState(!!orderNumber);
    const [error, setError] = useState<string | null>(null);
    const [showReceipt, setShowReceipt] = useState(false);
    const currentNumber = useRef(orderNumber);
    const requestVersion = useRef(0);
    currentNumber.current = orderNumber;

    const fetchOrder = useCallback(async (num: string) => {
        const version = ++requestVersion.current;
        try {
            const res = await publicOrderAPI.track(num);
            if (currentNumber.current !== num || version !== requestVersion.current) return;
            setOrder(res.data.order);
            setError(null);
            try { localStorage.setItem(LAST_ORDER_KEY, num); } catch { /* private mode */ }
        } catch (err: unknown) {
            if (currentNumber.current !== num || version !== requestVersion.current) return;
            const failure = err as { response?: { status?: number; data?: { error?: string } } };
            setError(failure?.response?.data?.error || 'Could not find that order.');
            setOrder(previous => [401, 403, 404].includes(failure?.response?.status || 0) ? null : previous?.orderNumber === num ? previous : null);
        } finally {
            if (currentNumber.current === num && version === requestVersion.current) setLoading(false);
        }
    }, []);

    useEffect(() => {
        if (!orderNumber) return;
        setLoading(true);
        setOrder(null);
        setError(null);
        fetchOrder(orderNumber);
        // Same 5s cadence the cashier's ActiveOrders page uses.
        const id = setInterval(() => fetchOrder(orderNumber), 5000);
        return () => clearInterval(id);
    }, [orderNumber, fetchOrder]);

    // Landing on the tab with no number: jump to the last order if we know it.
    useEffect(() => {
        if (orderNumber) return;
        try {
            const last = localStorage.getItem(LAST_ORDER_KEY);
            if (last) navigate(`${base}/track/${last}`, { replace: true });
        } catch { /* private mode */ }
    }, [orderNumber, base, navigate]);

    if (!orderNumber) {
        return (
            <div className="max-w-md mx-auto px-4 py-10">
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                    <h1 className="font-extrabold text-lg text-gray-900 mb-1">Track your order</h1>
                    <p className="text-sm text-gray-500 mb-4">Enter your order number.</p>
                    <div className="relative">
                        <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                            value={lookup}
                            onChange={e => setLookup(e.target.value.toUpperCase())}
                            placeholder="ORD-12345678"
                            className="w-full rounded-2xl bg-gray-50 text-gray-900 placeholder-gray-400 border border-gray-200 pl-11 pr-4 py-3 focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent"
                        />
                    </div>
                    <button
                        onClick={() => lookup.trim() && navigate(`${base}/track/${lookup.trim()}`)}
                        className="mt-3 w-full bg-brand text-gray-900 font-extrabold rounded-full py-3.5 shadow-sm"
                    >
                        Track
                    </button>
                </div>
            </div>
        );
    }

    if (loading) {
        return (
            <div className="py-20 text-center">
                <div className="w-10 h-10 border-4 border-brand/30 border-t-brand rounded-full animate-spin mx-auto mb-3" />
                <p className="text-gray-500 text-sm">Finding your order…</p>
            </div>
        );
    }

    if (!order) {
        return (
            <div className="max-w-md mx-auto px-4 py-16 text-center">
                <div className="w-16 h-16 bg-white border border-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <XCircle size={30} className="text-red-400" />
                </div>
                <p className="font-bold text-gray-900 mb-1">Order not found</p>
                <p className="text-sm text-gray-500 mb-5">{error}</p>
                <button onClick={() => navigate(`${base}/track`)} className="bg-brand text-gray-900 font-extrabold rounded-full px-6 py-3 shadow-sm">
                    Try another number
                </button>
            </div>
        );
    }

    const cancelled = order.status === 'cancelled';
    const awaitingPayment = order.status === 'awaiting-payment';
    const isDelivery = order.orderType === 'delivery';
    const STEPS = isDelivery ? DELIVERY_STEPS : PICKUP_STEPS;
    const currentStep = STEPS.findIndex(s => s.key === order.status);
    const dispatched = order.status === 'out-for-delivery' || order.status === 'completed';

    return (
        <div className="max-w-2xl mx-auto px-4 py-4 space-y-4">
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex items-center justify-between">
                <div>
                    <p className="font-extrabold text-gray-900">{order.orderNumber}</p>
                    <p className="text-xs text-gray-500">
                        {order.orderType === 'dine-in' && order.tableNumber ? `Dine in · Table ${order.tableNumber}`
                            : order.orderType === 'delivery' ? 'Delivery' : 'Pickup'}
                    </p>
                </div>
                <button onClick={() => navigate(`${base}/track`)} className="text-xs text-gray-400 underline underline-offset-4">
                    Another
                </button>
            </div>

            {(order.canRate || order.rated) && !cancelled && (
                <RateOrder
                    orderNumber={order.orderNumber}
                    rated={order.rated}
                    onSubmitted={() => fetchOrder(order.orderNumber)}
                />
            )}

            {error && <p role="status" className="rounded-2xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">Connection interrupted. Showing the last order details; updates will retry automatically.</p>}

            {isDelivery && order.delivery && !cancelled && (
                <LiveDeliveryTracking info={order.delivery} status={order.status} connected={!error} />
            )}

            {isDelivery && order.delivery && !cancelled && order.status !== 'completed' && (
                <DeliveryEta info={order.delivery} dispatched={dispatched} />
            )}

            {awaitingPayment && (
                <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex gap-3">
                    <CreditCard size={18} className="text-amber-600 shrink-0 mt-0.5" />
                    <div className="text-sm text-amber-900">
                        <p className="font-bold">Waiting for payment</p>
                        <p>This order has not been paid for yet, so the kitchen has not started it.</p>
                        <button
                            onClick={() => navigate(`${base}/pay/return?order=${order.orderNumber}`)}
                            className="mt-2 font-bold underline underline-offset-4"
                        >
                            Finish paying
                        </button>
                    </div>
                </div>
            )}

            {cancelled ? (
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 text-center">
                    <div className="w-14 h-14 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-3">
                        <XCircle size={28} className="text-red-400" />
                    </div>
                    <p className="font-bold text-gray-900 mb-1">Order cancelled</p>
                    <p className="text-sm text-gray-500">Please speak to our staff if this looks wrong.</p>
                </div>
            ) : (
                <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                    <ol className="space-y-5">
                        {STEPS.map((step, i) => {
                            const Icon = step.icon;
                            const done = i <= currentStep;
                            const active = i === currentStep;
                            return (
                                <li key={step.key} className="flex gap-4">
                                    <div className="flex flex-col items-center">
                                        <span className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                                            done ? 'bg-brand text-gray-900' : 'bg-gray-100 text-gray-400'
                                        }`}>
                                            <Icon size={19} />
                                        </span>
                                        {i < STEPS.length - 1 && (
                                            <span className={`w-0.5 flex-1 mt-1 ${i < currentStep ? 'bg-brand' : 'bg-gray-200'}`} style={{ minHeight: 18 }} />
                                        )}
                                    </div>
                                    <div className="pb-1">
                                        <p className={`font-semibold ${done ? 'text-gray-900' : 'text-gray-400'}`}>{step.label}</p>
                                        {active && <p className="text-sm text-gray-500">{step.blurb}</p>}
                                    </div>
                                </li>
                            );
                        })}
                    </ol>
                    <p className="text-xs text-gray-400 mt-4 text-center">Updates automatically.</p>
                </section>
            )}

            <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                <ul className="divide-y divide-gray-100">
                    {order.items.map((it, i) => (
                        <li key={i} className="py-2 flex justify-between gap-3 text-sm">
                            <span className="text-gray-600">
                                {it.quantity}× {it.name}
                                {it.modifiers?.size && <span className="text-gray-400"> ({it.modifiers.size})</span>}
                            </span>
                            <span className="font-bold text-gray-900 whitespace-nowrap">{peso(it.total)}</span>
                        </li>
                    ))}
                </ul>
                <div className="flex justify-between pt-3 mt-2 border-t border-gray-100 font-extrabold text-gray-900">
                    <span>Total</span><span>{peso(order.total)}</span>
                </div>
                {order.notes && <p className="text-sm text-gray-500 mt-3">Note: {order.notes}</p>}

                <button
                    onClick={() => setShowReceipt(true)}
                    className="mt-3 w-full border border-gray-200 rounded-2xl py-3 text-sm font-bold text-slate-700"
                >
                    View receipt
                </button>
            </section>
            {showReceipt && (
                <DeliveryReceipt orderNumber={order.orderNumber} onClose={() => setShowReceipt(false)} />
            )}
        </div>
    );
}
