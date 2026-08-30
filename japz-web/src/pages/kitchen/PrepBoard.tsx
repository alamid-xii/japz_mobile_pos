import { useCallback, useEffect, useState } from 'react';
import { Check, ChefHat, Clock, Send, Utensils } from 'lucide-react';
import { workflowAPI } from '../../services/api';

interface PrepItem {
    id: number;
    name: string;
    quantity: number;
    modifiers: Record<string, string> | null;
    status: 'pending' | 'preparing' | 'ready';
    readyAt: string | null;
}
interface PrepOrder {
    id: number;
    orderNumber: string;
    customerName: string | null;
    orderType: string | null;
    source: string | null;
    tableNumber: string | null;
    notes: string | null;
    status: string;
    placedAt: string;
    allReady: boolean;
    items: PrepItem[];
}

const clock = (iso: string) => new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

/**
 * Per-item preparation board.
 *
 * An order only becomes READY when every item is marked ready — the server
 * derives that, so the cashier can never be handed a half-finished order.
 */
export default function PrepBoard() {
    const [orders, setOrders] = useState<PrepOrder[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [busy, setBusy] = useState<number | null>(null);

    const load = useCallback(async () => {
        try {
            const res = await workflowAPI.kitchenOrders();
            setOrders(res.data.orders || []);
            setError(null);
        } catch (err: any) {
            setError(err?.response?.data?.error || 'Could not load orders.');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        load();
        const id = setInterval(load, 4000);
        return () => clearInterval(id);
    }, [load]);

    const setItem = async (item: PrepItem, status: PrepItem['status']) => {
        setBusy(item.id);
        try {
            await workflowAPI.setItemStatus(item.id, status);
            await load();
        } catch (err: any) {
            setError(err?.response?.data?.error || 'Could not update that item.');
        } finally {
            setBusy(null);
        }
    };

    if (loading) return <div className="spinner" />;

    return (
        <div className="p-4 md:p-6">
            <div className="flex items-center justify-between mb-4">
                <div>
                    <h1 className="text-xl font-extrabold text-slate-900">Prep Board</h1>
                    <p className="text-sm text-slate-500">Mark each item as you finish it.</p>
                </div>
                <span className="text-xs font-bold bg-brand text-slate-900 rounded-full px-3 py-1.5">
                    {orders.length} active
                </span>
            </div>

            {error && (
                <div className="mb-4 bg-red-50 border border-red-200 text-red-700 rounded-2xl px-4 py-3 text-sm">{error}</div>
            )}

            {orders.length === 0 ? (
                <div className="text-center py-20">
                    <ChefHat size={30} className="text-gray-300 mx-auto mb-3" />
                    <p className="font-bold text-slate-900">Nothing to prepare</p>
                    <p className="text-sm text-slate-500 mt-1">New orders appear here automatically.</p>
                </div>
            ) : (
                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                    {orders.map(o => (
                        <section
                            key={o.id}
                            className={`bg-white rounded-2xl border-2 shadow-sm overflow-hidden ${
                                o.allReady ? 'border-green-400' : 'border-gray-100'
                            }`}
                        >
                            <div className="p-4 pb-3">
                                <div className="flex items-start justify-between gap-2">
                                    <div className="min-w-0">
                                        <p className="font-extrabold text-slate-900">{o.orderNumber}</p>
                                        <p className="text-xs text-slate-500 truncate">
                                            {o.customerName || 'Walk-in'}
                                            {o.tableNumber && ` · Table ${o.tableNumber}`}
                                        </p>
                                    </div>
                                    <div className="text-right shrink-0">
                                        <span className="text-[10px] font-extrabold bg-slate-900 text-brand px-2 py-1 rounded-full">
                                            {(o.source === 'online' ? 'ONLINE' : o.orderType || 'POS').toUpperCase()}
                                        </span>
                                        <p className="text-[11px] text-slate-400 mt-1 flex items-center justify-end gap-1">
                                            <Clock size={10} /> {clock(o.placedAt)}
                                        </p>
                                    </div>
                                </div>

                                {o.notes && (
                                    <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-2.5 py-1.5 mt-2">
                                        {o.notes}
                                    </p>
                                )}
                            </div>

                            <ul className="divide-y divide-gray-100">
                                {o.items.map(i => (
                                    <li key={i.id} className="px-4 py-2.5 flex items-center gap-3">
                                        <span className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 ${
                                            i.status === 'ready' ? 'bg-green-500 text-white'
                                                : i.status === 'preparing' ? 'bg-blue-100 text-blue-600'
                                                : 'bg-gray-100 text-gray-400'
                                        }`}>
                                            {i.status === 'ready' ? <Check size={13} strokeWidth={3} /> : <Utensils size={12} />}
                                        </span>

                                        <div className="min-w-0 flex-1">
                                            <p className={`text-sm font-bold truncate ${
                                                i.status === 'ready' ? 'text-slate-400 line-through' : 'text-slate-900'
                                            }`}>
                                                {i.name} × {i.quantity}
                                            </p>
                                            {i.modifiers && Object.keys(i.modifiers).length > 0 && (
                                                <p className="text-[11px] text-slate-500 truncate">
                                                    {Object.values(i.modifiers).join(' · ')}
                                                </p>
                                            )}
                                        </div>

                                        <div className="flex gap-1 shrink-0">
                                            {i.status === 'pending' && (
                                                <button
                                                    onClick={() => setItem(i, 'preparing')}
                                                    disabled={busy === i.id}
                                                    className="text-[11px] font-bold bg-blue-500 text-white rounded-full px-3 py-1.5 disabled:opacity-50"
                                                >
                                                    Start
                                                </button>
                                            )}
                                            {i.status === 'preparing' && (
                                                <button
                                                    onClick={() => setItem(i, 'ready')}
                                                    disabled={busy === i.id}
                                                    className="text-[11px] font-bold bg-green-500 text-white rounded-full px-3 py-1.5 disabled:opacity-50"
                                                >
                                                    Ready
                                                </button>
                                            )}
                                            {i.status === 'ready' && (
                                                <button
                                                    onClick={() => setItem(i, 'preparing')}
                                                    disabled={busy === i.id}
                                                    className="text-[11px] font-bold text-slate-400 underline underline-offset-2 px-1"
                                                >
                                                    Undo
                                                </button>
                                            )}
                                        </div>
                                    </li>
                                ))}
                            </ul>

                            <div className={`px-4 py-3 text-sm font-extrabold flex items-center justify-center gap-2 ${
                                o.allReady ? 'bg-green-50 text-green-700' : 'bg-gray-50 text-slate-400'
                            }`}>
                                {o.allReady
                                    ? <><Send size={15} /> Sent to Cashier</>
                                    : <>{o.items.filter(i => i.status === 'ready').length} of {o.items.length} ready</>}
                            </div>
                        </section>
                    ))}
                </div>
            )}
        </div>
    );
}
