import { useCallback, useEffect, useRef, useState } from 'react';
import { CheckCircle, Loader2, RefreshCw, X, Smartphone, CreditCard } from 'lucide-react';
import { isAxiosError } from 'axios';
import { posPaymentAPI } from '../services/api';
import '../styles/pos-gateway.css';

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
        } catch (err: unknown) {
            setError(isAxiosError<{ error?: string }>(err) ? err.response?.data?.error || 'Could not start the payment.' : 'Could not start the payment.');
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
        <div className="pos-gateway-overlay">
            <section className="pos-gateway-card" aria-label="Card or GCash payment">
                <header className="pos-gateway-header">
                    <div><h2>Pay by card or GCash</h2><p>{orderNumber} · ₱{total.toFixed(2)}</p></div>
                    {!paid && (
                        <button onClick={abandon} aria-label="Close payment">
                            <X size={20} />
                        </button>
                    )}
                </header>

                <div className="pos-gateway-body">
                {error && (
                    <div className="pos-gateway-error" role="alert">{error}</div>
                )}

                {paid ? (
                    <div className="pos-gateway-success">
                        <CheckCircle size={40} />
                        <h3>Payment received</h3>
                        <p>₱{total.toFixed(2)} confirmed by PayMongo.</p>
                    </div>
                ) : !qr ? (
                    <div className="pos-gateway-methods">
                        <p>How is the customer paying?</p>
                        {([['gcash', 'GCash', Smartphone], ['card', 'Credit / Debit Card', CreditCard]] as const).map(([key, label, Icon]) => (
                            <button
                                key={key}
                                onClick={() => start(key)}
                                disabled={starting}
                            >
                                <Icon size={21} />
                                <span>{label}</span>
                                {starting && method === key && <Loader2 size={15} className="ml-auto animate-spin text-slate-400" />}
                            </button>
                        ))}
                    </div>
                ) : (
                    <>
                        <div className="pos-gateway-qr">
                            <img src={qr} alt={`Payment QR for ${orderNumber}`} />
                            <h3>Ask the customer to scan this</h3>
                            <p>
                                They pay on their own phone. Nothing is charged here.
                            </p>
                        </div>

                        {url && <p className="pos-gateway-url">{url}</p>}
                    </>
                )}
                </div>
                {!paid && qr && <footer className="pos-gateway-actions">
                        <div className="pos-gateway-waiting" role="status">
                            <Loader2 size={15} className="animate-spin" />
                            Waiting for payment… {waited > 0 && `${waited}s`}
                        </div>

                        <button
                            onClick={check}
                            className="pos-gateway-check"
                        >
                            <RefreshCw size={15} /> Check now
                        </button>
                        <button onClick={abandon} className="pos-gateway-cancel">
                            Cancel and pay another way
                        </button>
                </footer>}
            </section>
        </div>
    );
}
