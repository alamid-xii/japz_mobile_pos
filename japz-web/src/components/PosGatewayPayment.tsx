import { useCallback, useEffect, useRef, useState } from 'react';
import { CheckCircle, Loader2, RefreshCw, X, Smartphone, CreditCard } from 'lucide-react';
import { posPaymentAPI } from '../services/api';

interface Props {
    orderNumber: string;
    total: number;
    onPaid: () => void;
    onClose: () => void;
    /** When set, skips the method picker and starts checkout immediately. */
    initialMethod?: 'gcash' | 'card';
}

/**
 * Counter payment through PayMongo. The cashier picks a method, the customer
 * scans the QR with their own phone and pays there.
 *
 * The screen polls the server, which asks PayMongo — the cashier is never the
 * one who decides a payment succeeded.
 */
export default function PosGatewayPayment({ orderNumber, total, onPaid, onClose, initialMethod }: Props) {
    const [method, setMethod] = useState<'gcash' | 'card' | null>(null);
    const [qr, setQr] = useState<string | null>(null);
    const [url, setUrl] = useState<string | null>(null);
    const [starting, setStarting] = useState(false);
    const [paid, setPaid] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [waited, setWaited] = useState(0);
    const poll = useRef<number | null>(null);

    const start = async (m: 'gcash' | 'card') => {
        setStarting(true);
        setError(null);
        setMethod(m);
        try {
            const res = await posPaymentAPI.checkout(orderNumber, m);
            setQr(res.data.qr);
            setUrl(res.data.checkoutUrl);
        } catch (err: any) {
            setError(err?.response?.data?.error || 'Could not start the payment.');
            setMethod(null);
        } finally {
            setStarting(false);
        }
    };

    // Auto-start when a method was pre-selected from PaymentSelection.
    const autoStarted = useRef(false);
    useEffect(() => {
        if (initialMethod && !autoStarted.current) {
            autoStarted.current = true;
            start(initialMethod);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [initialMethod]);

    const check = useCallback(async () => {
        try {
            const res = await posPaymentAPI.status(orderNumber);
            if (res.data.paid) {
                setPaid(true);
                return true;
            }
        } catch { /* keep waiting */ }
        return false;
    }, [orderNumber]);

    // Polls only while a QR is on screen and the payment is still open.
    useEffect(() => {
        if (!qr || paid) return;
        poll.current = window.setInterval(async () => {
            setWaited(w => w + 3);
            const done = await check();
            if (done && poll.current) window.clearInterval(poll.current);
        }, 3000);
        return () => { if (poll.current) window.clearInterval(poll.current); };
    }, [qr, paid, check]);

    useEffect(() => {
        if (paid) {
            const t = window.setTimeout(onPaid, 1400);
            return () => window.clearTimeout(t);
        }
    }, [paid, onPaid]);

    const abandon = async () => {
        try {
            const res = await posPaymentAPI.cancel(orderNumber);
            // Racing the customer: they may have paid while the cashier cancelled.
            if (res.data.paid) { setPaid(true); return; }
        } catch { /* nothing to release */ }
        onClose();
    };

    return (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl w-full max-w-sm p-5">
                <div className="flex items-center justify-between mb-1">
                    <p className="font-extrabold text-slate-900">Pay by card or GCash</p>
                    {!paid && (
                        <button onClick={abandon} aria-label="Close" className="p-1.5 rounded-full hover:bg-gray-100">
                            <X size={17} className="text-slate-500" />
                        </button>
                    )}
                </div>
                <p className="text-sm text-slate-500 mb-4">{orderNumber} · ₱{total.toFixed(2)}</p>

                {error && (
                    <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-3 py-2.5 text-sm mb-3">{error}</div>
                )}

                {paid ? (
                    <div className="text-center py-8">
                        <div className="w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-3">
                            <CheckCircle size={32} className="text-emerald-500" />
                        </div>
                        <p className="font-extrabold text-lg text-slate-900">Payment received</p>
                        <p className="text-sm text-slate-500">₱{total.toFixed(2)} confirmed by PayMongo.</p>
                    </div>
                ) : !qr ? (
                    <div className="space-y-2">
                        <p className="text-xs font-bold text-slate-600 mb-1">How is the customer paying?</p>
                        {([['gcash', 'GCash', Smartphone], ['card', 'Credit / Debit Card', CreditCard]] as const).map(([key, label, Icon]) => (
                            <button
                                key={key}
                                onClick={() => start(key)}
                                disabled={starting}
                                className="w-full flex items-center gap-3 rounded-2xl border-2 border-gray-200 px-4 py-3.5 text-left disabled:opacity-50"
                            >
                                <Icon size={18} className="text-slate-600" />
                                <span className="font-bold text-sm text-slate-900">{label}</span>
                                {starting && method === key && <Loader2 size={15} className="ml-auto animate-spin text-slate-400" />}
                            </button>
                        ))}
                    </div>
                ) : (
                    <>
                        <div className="bg-gray-50 rounded-2xl p-4 text-center">
                            <img src={qr} alt={`Payment QR for ${orderNumber}`} className="w-44 h-44 mx-auto rounded-xl bg-white" />
                            <p className="text-sm font-bold text-slate-900 mt-3">Ask the customer to scan this</p>
                            <p className="text-xs text-slate-500 mt-0.5">
                                They pay on their own phone. Nothing is charged here.
                            </p>
                        </div>

                        <div className="flex items-center justify-center gap-2 mt-4 text-sm text-slate-500">
                            <Loader2 size={15} className="animate-spin" />
                            Waiting for payment… {waited > 0 && `${waited}s`}
                        </div>

                        <button
                            onClick={check}
                            className="mt-3 w-full flex items-center justify-center gap-2 rounded-2xl border border-gray-200 py-3 text-sm font-bold text-slate-700"
                        >
                            <RefreshCw size={15} /> Check now
                        </button>
                        {url && (
                            <p className="text-[10px] text-slate-400 break-all mt-3 text-center">{url}</p>
                        )}
                        <button onClick={abandon} className="mt-2 w-full text-xs text-slate-400 underline underline-offset-4">
                            Cancel and pay another way
                        </button>
                    </>
                )}
            </div>
        </div>
    );
}
