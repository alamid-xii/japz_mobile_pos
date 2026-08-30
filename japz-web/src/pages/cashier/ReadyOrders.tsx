import { useCallback, useEffect, useState } from 'react';
import { Bike, Check, MapPin, Package, UserCheck, AlertCircle } from 'lucide-react';
import { workflowAPI } from '../../services/api';

interface ReadyOrder {
    id: number;
    orderNumber: string;
    customerName: string | null;
    customerPhone: string | null;
    orderType: string | null;
    tableNumber: string | null;
    deliveryAddress: string | null;
    total: string | number;
    placedAt: string;
    itemCount: number;
    allReady: boolean;
    payment: { method: string; provider: string | null; reference: string | null; status: string } | null;
    delivery: { id: number; status: string; assignedAt: string; rider: { id: number; name: string; phone: string } | null } | null;
}
interface Rider { id: number; name: string; phone: string }

const money = (n: number | string) => `₱${Number(n).toFixed(2)}`;

export default function ReadyOrders() {
    const [orders, setOrders] = useState<ReadyOrder[]>([]);
    const [riders, setRiders] = useState<Rider[]>([]);
    const [picked, setPicked] = useState<Record<number, number | ''>>({});
    const [busy, setBusy] = useState<number | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    const load = useCallback(async () => {
        try {
            const [o, r] = await Promise.all([workflowAPI.readyOrders(), workflowAPI.availableRiders()]);
            setOrders(o.data.orders || []);
            setRiders(r.data.riders || []);
        } catch (err: any) {
            setError(err?.response?.data?.error || 'Could not load ready orders.');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        load();
        const id = setInterval(load, 5000);
        return () => clearInterval(id);
    }, [load]);

    const assign = async (o: ReadyOrder) => {
        const riderId = picked[o.id];
        if (!riderId) return setError('Choose a rider first.');
        setError(null);
        setBusy(o.id);
        try {
            await workflowAPI.assignRider(o.id, Number(riderId));
            await load();
        } catch (err: any) {
            setError(err?.response?.data?.error || 'Could not assign that rider.');
        } finally {
            setBusy(null);
        }
    };

    const complete = async (o: ReadyOrder) => {
        setError(null);
        setBusy(o.id);
        try {
            await workflowAPI.completeOrder(o.id);
            await load();
        } catch (err: any) {
            setError(err?.response?.data?.error || 'Could not complete that order.');
        } finally {
            setBusy(null);
        }
    };

    if (loading) return <div className="spinner" />;

    return (
        <div className="p-4 md:p-6">
            <div className="flex items-center justify-between mb-4">
                <div>
                    <h1 className="text-xl font-extrabold text-slate-900">Ready Orders</h1>
                    <p className="text-sm text-slate-500">Kitchen has finished these — hand over or assign a rider.</p>
                </div>
                <span className="text-xs font-bold bg-brand text-slate-900 rounded-full px-3 py-1.5">
                    {orders.length} ready
                </span>
            </div>

            {error && (
                <div className="mb-4 bg-red-50 border border-red-200 text-red-700 rounded-2xl px-4 py-3 text-sm flex items-start gap-2">
                    <AlertCircle size={16} className="shrink-0 mt-0.5" /> {error}
                </div>
            )}

            {orders.length === 0 ? (
                <div className="text-center py-20">
                    <Package size={30} className="text-gray-300 mx-auto mb-3" />
                    <p className="font-bold text-slate-900">Nothing ready yet</p>
                    <p className="text-sm text-slate-500 mt-1">Orders appear here once the kitchen marks every item ready.</p>
                </div>
            ) : (
                <div className="grid gap-3 md:grid-cols-2">
                    {orders.map(o => {
                        const isDelivery = o.orderType === 'delivery';
                        const assigned = o.delivery?.rider;
                        return (
                            <section key={o.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
                                <div className="flex items-start justify-between gap-3">
                                    <div className="min-w-0">
                                        <p className="font-extrabold text-slate-900">{o.orderNumber}</p>
                                        <p className="text-sm text-slate-600">{o.customerName || 'Walk-in'}</p>
                                    </div>
                                    <span className="shrink-0 text-[10px] font-extrabold bg-slate-900 text-brand px-2.5 py-1 rounded-full">
                                        {(o.orderType || 'takeout').toUpperCase()}
                                    </span>
                                </div>

                                {isDelivery && (
                                    <div className="flex items-start gap-2 mt-2">
                                        <MapPin size={14} className="text-slate-400 shrink-0 mt-0.5" />
                                        <p className="text-xs text-slate-600 break-words">{o.deliveryAddress || 'No address'}</p>
                                    </div>
                                )}
                                {o.tableNumber && <p className="text-xs text-slate-500 mt-1">Table {o.tableNumber}</p>}

                                <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100 text-sm">
                                    <span className="text-slate-500">{o.itemCount} item{o.itemCount > 1 ? 's' : ''}</span>
                                    <span className="font-extrabold text-slate-900">{money(o.total)}</span>
                                </div>

                                {o.payment && (
                                    <p className="text-[11px] text-slate-500 mt-1.5">
                                        {o.payment.provider || o.payment.method}
                                        {o.payment.reference && ` · ref ${o.payment.reference}`}
                                        {' · '}
                                        <span className={o.payment.status === 'completed' ? 'text-green-600 font-bold' : 'text-amber-600 font-bold'}>
                                            {o.payment.status === 'completed' ? 'PAID' : 'UNPAID'}
                                        </span>
                                    </p>
                                )}

                                <div className="mt-3">
                                    {!isDelivery ? (
                                        <button
                                            onClick={() => complete(o)}
                                            disabled={busy === o.id}
                                            className="w-full bg-brand text-slate-900 font-extrabold rounded-2xl py-3 disabled:opacity-50 active:scale-[0.99] transition duration-150"
                                        >
                                            {busy === o.id ? 'Saving…' : 'Mark as Completed'}
                                        </button>
                                    ) : assigned ? (
                                        <div className="flex items-center gap-2 rounded-2xl bg-green-50 border border-green-200 px-4 py-3">
                                            <UserCheck size={16} className="text-green-600 shrink-0" />
                                            <div className="min-w-0">
                                                <p className="text-sm font-bold text-slate-900 truncate">{assigned.name}</p>
                                                <p className="text-[11px] text-slate-500">
                                                    {o.delivery?.status.replace(/-/g, ' ')} · {assigned.phone}
                                                </p>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="space-y-2">
                                            <select
                                                value={picked[o.id] ?? ''}
                                                onChange={e => setPicked(p => ({ ...p, [o.id]: e.target.value ? Number(e.target.value) : '' }))}
                                                className="w-full rounded-2xl bg-gray-50 border border-gray-200 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand"
                                            >
                                                {/* Only riders the server reports as available appear here. */}
                                                <option value="">
                                                    {riders.length ? 'Select available rider…' : 'No riders available'}
                                                </option>
                                                {riders.map(r => (
                                                    <option key={r.id} value={r.id}>{r.name} · {r.phone}</option>
                                                ))}
                                            </select>
                                            <button
                                                onClick={() => assign(o)}
                                                disabled={busy === o.id || !picked[o.id]}
                                                className="w-full bg-slate-900 text-white font-extrabold rounded-2xl py-3 flex items-center justify-center gap-2 disabled:opacity-40 active:scale-[0.99] transition duration-150"
                                            >
                                                <Bike size={16} /> {busy === o.id ? 'Assigning…' : 'Assign Rider'}
                                            </button>
                                        </div>
                                    )}
                                </div>

                                {o.allReady && (
                                    <p className="text-[11px] text-green-600 font-bold mt-2 flex items-center gap-1">
                                        <Check size={12} /> All items ready
                                    </p>
                                )}
                            </section>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
