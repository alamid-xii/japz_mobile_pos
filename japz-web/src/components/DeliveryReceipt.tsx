import { useEffect, useState } from 'react';
import { X, Printer, Bike, MapPin, Check } from 'lucide-react';
import { workflowAPI } from '../services/api';
import DeliveryProofPhoto from './DeliveryProofPhoto';

export interface ReceiptData {
    orderNumber: string;
    source: string | null;
    cashierName: string | null;
    placedAt: string;
    completedAt: string | null;
    status: string;
    orderType: string | null;
    tableNumber: string | null;
    customerName: string | null;
    customerPhone: string | null;
    deliveryAddress: string | null;
    notes: string | null;
    items: { name: string; quantity: number; price: number; total: number; modifiers: Record<string, string> | null }[];
    subtotal: number;
    discount: number;
    total: number;
    payment: {
        method: string;
        provider: string | null;
        reference: string | null;
        status: string;
        amount: number;
        amountReceived: number | null;
        change: number | null;
    } | null;
    delivery: {
        status: string;
        riderName: string | null;
        riderPhone: string | null;
        assignedAt: string | null;
        startedAt: string | null;
        deliveredAt: string | null;
        proofPhotoUrl: string | null;
        proofLat: number | null;
        proofLng: number | null;
    } | null;
}

const peso = (n: number) => `₱${Number(n).toFixed(2)}`;
const clock = (iso: string | null) => iso ? new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—';

const TYPE_LABEL: Record<string, string> = {
    'dine-in': '🍽️ Dine-in',
    'take-out': '📦 Take-out',
    'delivery': '🚚 Delivery',
};

/**
 * Delivery receipt, using the same card layout as the counter receipt in
 * pages/cashier/Receipt.tsx. Amounts come straight from the stored order
 * lines, so it always reflects what was actually charged.
 */
export default function DeliveryReceipt({ orderNumber, onClose }: { orderNumber: string; onClose: () => void }) {
    const [data, setData] = useState<ReceiptData | null>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        workflowAPI.receipt(orderNumber)
            .then(res => setData(res.data.receipt))
            .catch(err => setError(err?.response?.data?.error || 'Could not load the receipt.'));
    }, [orderNumber]);

    // Reuses the app's own stylesheets so the printout matches the screen
    // instead of drifting from a second hand-written set of styles.
    const print = () => {
        const node = document.getElementById('japz-receipt');
        if (!node) return;
        const styles =
            Array.from(document.querySelectorAll('style')).map(n => n.outerHTML).join('') +
            Array.from(document.querySelectorAll('link[rel="stylesheet"]'))
                .map(n => `<link rel="stylesheet" href="${(n as HTMLLinkElement).href}">`).join('');
        const w = window.open('', '_blank', 'width=420,height=760');
        if (!w) return;
        w.document.write(
            `<html><head><title>Receipt ${orderNumber}</title>${styles}`
            + `<style>body{margin:0;padding:12px;background:#fff}@page{margin:8mm}</style></head>`
            + `<body onload="setTimeout(function(){window.print()},400)">${node.outerHTML}</body></html>`,
        );
        w.document.close();
        w.focus();
    };

    const placed = data ? new Date(data.placedAt) : null;
    const paid = data?.payment?.status === 'completed';
    const payLabel = data?.payment ? (data.payment.provider || data.payment.method) : null;

    return (
        <div className="fixed inset-0 z-[60] bg-black/50 flex items-end sm:items-center justify-center" onClick={onClose}>
            <div
                className="bg-white w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl overflow-hidden flex flex-col max-h-[92vh]"
                onClick={e => e.stopPropagation()}
            >
                <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-100 shrink-0">
                    <p className="font-extrabold text-slate-900">Receipt</p>
                    <div className="flex items-center gap-1">
                        <button onClick={print} disabled={!data} aria-label="Print" className="p-2 rounded-full hover:bg-gray-100 disabled:opacity-40">
                            <Printer size={17} className="text-slate-600" />
                        </button>
                        <button onClick={onClose} aria-label="Close" className="p-2 rounded-full hover:bg-gray-100">
                            <X size={17} className="text-slate-600" />
                        </button>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-4">
                    {error && <div className="bg-red-50 border border-red-200 text-red-700 rounded-2xl px-4 py-3 text-sm">{error}</div>}
                    {!data && !error && <p className="text-sm text-slate-500 text-center py-8">Loading…</p>}

                    {data && (
                        <div id="japz-receipt" className="w-full bg-white border-2 border-dashed border-gray-300 rounded-xl p-5 shadow-sm">
                            {/* Header */}
                            <div className="text-center mb-4">
                                <img src={`${window.location.origin}/logo.jpg`} alt="JAPZ" className="w-20 h-20 mx-auto rounded-lg mb-2" />
                                <h2 className="text-xl font-bold">JAPZ GRILL</h2>
                                <p className="text-sm font-semibold text-gray-700">Burger &amp; Bistro</p>
                                <p className="text-xs text-gray-500 mt-2">Quezon St., Bagumbayan I, Bongabong, Philippines</p>
                                <p className="text-xs text-gray-500">0966 359 9235</p>
                                <p className="text-xs text-gray-500">japzgrillburgerandbistro@gmail.com</p>
                                {data.cashierName && <p className="text-xs text-gray-600 mt-2">Cashier: {data.cashierName}</p>}
                            </div>

                            <div className="border-t border-b border-black py-2 mb-3" />

                            {/* Order details */}
                            <div className="text-xs text-gray-600 mb-3 space-y-1">
                                <div className="flex justify-between gap-2">
                                    <span>Order #: {data.orderNumber}</span>
                                    <span>{data.source === 'online' ? 'Online' : 'POS 1'}</span>
                                </div>
                                {data.customerName && <p>Customer: {data.customerName}</p>}
                                {data.customerPhone && <p>Contact: {data.customerPhone}</p>}
                                {data.orderType && (
                                    <p>
                                        Order Type: {TYPE_LABEL[data.orderType] || data.orderType}
                                        {data.tableNumber && ` (Table ${data.tableNumber})`}
                                    </p>
                                )}
                                {data.deliveryAddress && <p>Deliver to: {data.deliveryAddress}</p>}
                                <p>{placed!.toLocaleDateString()} {placed!.toLocaleTimeString()}</p>
                            </div>

                            <div className="border-t border-b border-black py-2 mb-3" />

                            {/* Items */}
                            <div className="mb-3">
                                {data.items.map((item, idx) => (
                                    <div key={idx} className="mb-2">
                                        <div className="flex justify-between text-sm gap-2">
                                            <span className="font-semibold flex-1">{item.name}</span>
                                            <span className="font-semibold whitespace-nowrap">{peso(item.total)}</span>
                                        </div>
                                        <p className="text-xs text-gray-500">
                                            {item.quantity} x {peso(item.price)}
                                            {item.modifiers && Object.values(item.modifiers).filter(Boolean).map(v => ` • ${v}`).join('')}
                                        </p>
                                    </div>
                                ))}
                            </div>

                            <div className="border-t border-b border-black py-2 mb-3" />

                            {/* Totals */}
                            <div className="space-y-1.5">
                                <div className="flex justify-between text-sm">
                                    <span className="text-gray-600">Subtotal:</span>
                                    <span>{peso(data.subtotal)}</span>
                                </div>
                                {data.discount > 0 && (
                                    <div className="flex justify-between text-sm">
                                        <span className="text-gray-600">Discount:</span>
                                        <span className="text-emerald-500">-{peso(data.discount)}</span>
                                    </div>
                                )}
                                <div className="flex justify-between font-bold text-lg pt-2 border-t border-gray-200">
                                    <span>Total:</span>
                                    <span>{peso(data.total)}</span>
                                </div>

                                {paid ? (
                                    <>
                                        <div className="flex justify-between text-sm">
                                            <span className="text-gray-600">Paid ({payLabel}):</span>
                                            <span>{peso(data.payment!.amountReceived ?? data.total)}</span>
                                        </div>
                                        {Number(data.payment!.change) > 0 && (
                                            <div className="flex justify-between font-semibold text-emerald-500 text-lg">
                                                <span>Change:</span>
                                                <span>{peso(data.payment!.change!)}</span>
                                            </div>
                                        )}
                                        {data.payment!.reference && (
                                            <div className="flex justify-between text-xs text-gray-500 gap-2">
                                                <span>Ref:</span>
                                                <span className="truncate">{data.payment!.reference}</span>
                                            </div>
                                        )}
                                    </>
                                ) : (
                                    /* Nothing has been tendered, so a "Paid / Change" pair would
                                       be a lie. The rider is told what to collect instead. */
                                    <div className="mt-2 rounded-lg border-2 border-amber-400 bg-amber-50 px-3 py-2 text-center">
                                        <p className="text-[11px] font-bold tracking-wide text-amber-700">UNPAID — COLLECT ON DELIVERY</p>
                                        <p className="text-2xl font-extrabold text-amber-900 leading-tight">{peso(data.total)}</p>
                                        {payLabel && <p className="text-[11px] text-amber-700 capitalize">via {payLabel}</p>}
                                    </div>
                                )}
                            </div>

                            {/* Delivery */}
                            {data.delivery && (
                                <>
                                    <div className="border-t border-b border-black py-2 my-3" />
                                    <p className="text-sm font-bold mb-1.5">Delivery</p>
                                    <div className="text-xs text-gray-600 space-y-1">
                                        <div className="flex justify-between gap-2">
                                            <span>Rider:</span>
                                            <span className="font-semibold text-gray-800">{data.delivery.riderName || '—'}</span>
                                        </div>
                                        <div className="flex justify-between"><span>Assigned:</span><span>{clock(data.delivery.assignedAt)}</span></div>
                                        <div className="flex justify-between"><span>Out:</span><span>{clock(data.delivery.startedAt)}</span></div>
                                        <div className="flex justify-between"><span>Delivered:</span><span>{clock(data.delivery.deliveredAt)}</span></div>
                                        {data.delivery.proofLat != null && data.delivery.proofLng != null && (
                                            <div className="flex justify-between gap-2">
                                                <span>Location:</span>
                                                <span>{data.delivery.proofLat.toFixed(5)}, {data.delivery.proofLng.toFixed(5)}</span>
                                            </div>
                                        )}
                                    </div>
                                </>
                            )}

                            {data.notes && <p className="text-xs text-gray-500 mt-3">Note: {data.notes}</p>}

                            {/* Footer */}
                            <div className="border-t border-dashed border-gray-300 mt-4 pt-4 text-center">
                                <p className="text-sm font-semibold">Thank you for dining with us!</p>
                                <p className="text-xs text-gray-500 mt-1">Please come again</p>
                            </div>
                        </div>
                    )}

                    {/* Proof photo stays outside the printable card — it is for
                        on-screen verification, not for a thermal receipt. */}
                    {data?.delivery?.proofPhotoUrl && (
                        <div className="mt-4">
                            <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-2 flex items-center gap-1.5">
                                <Check size={12} className="text-green-600" /> Proof of delivery
                            </p>
                            <DeliveryProofPhoto key={data.delivery.proofPhotoUrl} proofUrl={data.delivery.proofPhotoUrl} />
                        </div>
                    )}

                    {data?.delivery && !data.delivery.proofPhotoUrl && (
                        <p className="mt-4 text-[11px] text-slate-400 flex items-center gap-1.5">
                            <Bike size={12} /> Not yet delivered — proof appears here once handed over.
                        </p>
                    )}
                    {data?.deliveryAddress && !data.delivery && (
                        <p className="mt-4 text-[11px] text-slate-400 flex items-center gap-1.5">
                            <MapPin size={12} /> No rider assigned yet.
                        </p>
                    )}
                </div>
            </div>
        </div>
    );
}
