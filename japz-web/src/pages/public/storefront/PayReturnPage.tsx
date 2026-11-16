import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { CheckCircle, XCircle, Loader2, RefreshCw, CreditCard } from 'lucide-react';
import { paymentAPI } from '../../../services/api';
import { useStorefrontBase } from './StorefrontLayout';

type Phase = 'checking' | 'paid' | 'unpaid' | 'cancelled' | 'error';

/**
 * Where PayMongo sends the customer back to.
 *
 * Landing here proves nothing — the browser could have been redirected by
 * anyone. Every state on this page comes from the server asking PayMongo what
 * actually happened, which is why it polls instead of trusting the URL.
 */
export default function PayReturnPage() {
    const [params] = useSearchParams();
    const navigate = useNavigate();
    const base = useStorefrontBase();

    const orderNumber = params.get('order') || '';
    const wasCancelled = params.get('cancelled') === '1';

    const [phase, setPhase] = useState<Phase>(wasCancelled ? 'cancelled' : 'checking');
    const [message, setMessage] = useState<string | null>(null);
    const [checkoutUrl, setCheckoutUrl] = useState<string | null>(null);
    const [attempts, setAttempts] = useState(0);
    const timer = useRef<number | null>(null);

    const poll = useCallback(async () => {
        if (!orderNumber) { setPhase('error'); setMessage('No order was given.'); return; }
        try {
            const res = await paymentAPI.status(orderNumber);
            if (res.data.paid) {
                setPhase('paid');
                return true;
            }
            setCheckoutUrl(res.data.checkoutUrl ?? null);
            if (!wasCancelled) setPhase('unpaid');
            return false;
        } catch (err: any) {
            setPhase('error');
            setMessage(err?.response?.data?.error || 'We could not check your payment.');
            return true;
        }
    }, [orderNumber, wasCancelled]);

    // A GCash payment can land a moment after the redirect, so give it a few
    // tries before telling the customer it did not go through.
    useEffect(() => {
        if (wasCancelled) return;
        let stop = false;
        const run = async () => {
            const done = await poll();
            if (done || stop) return;
            setAttempts(a => {
                const next = a + 1;
                if (next < 6) timer.current = window.setTimeout(run, 2000);
                return next;
            });
        };
        run();
        return () => { stop = true; if (timer.current) window.clearTimeout(timer.current); };
    }, [poll, wasCancelled]);

    const abandon = async () => {
        try { await paymentAPI.cancel(orderNumber); } catch { /* already settled */ }
        navigate(`${base}/menu`, { replace: true });
    };

    return (
        <div className="max-w-md mx-auto px-4 py-10">
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 text-center">
                {phase === 'checking' && (
                    <>
                        <Loader2 size={40} className="mx-auto text-gray-300 animate-spin mb-4" />
                        <p className="font-extrabold text-gray-900 mb-1">Confirming your payment…</p>
                        <p className="text-sm text-gray-500">
                            Checking with PayMongo. This takes a few seconds.
                        </p>
                    </>
                )}

                {phase === 'paid' && (
                    <>
                        <div className="w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-4">
                            <CheckCircle size={32} className="text-emerald-500" />
                        </div>
                        <p className="font-extrabold text-lg text-gray-900 mb-1">Payment received</p>
                        <p className="text-sm text-gray-500 mb-5">
                            {orderNumber} is paid and has gone through to the kitchen.
                        </p>
                        <button
                            onClick={() => navigate(`${base}/track/${orderNumber}`, { replace: true })}
                            className="w-full bg-brand text-gray-900 font-extrabold rounded-full py-3.5 shadow-sm"
                        >
                            Track my order
                        </button>
                    </>
                )}

                {phase === 'unpaid' && (
                    <>
                        <div className="w-16 h-16 bg-amber-50 rounded-full flex items-center justify-center mx-auto mb-4">
                            <CreditCard size={30} className="text-amber-500" />
                        </div>
                        <p className="font-extrabold text-lg text-gray-900 mb-1">Not paid yet</p>
                        <p className="text-sm text-gray-500 mb-5">
                            We have not had confirmation for {orderNumber}. If you have just paid,
                            give it a moment and check again — your order is held until then.
                        </p>
                        <button
                            onClick={() => { setAttempts(0); setPhase('checking'); poll(); }}
                            className="w-full flex items-center justify-center gap-2 bg-brand text-gray-900 font-extrabold rounded-full py-3.5 shadow-sm mb-2"
                        >
                            <RefreshCw size={16} /> Check again
                        </button>
                        {checkoutUrl && (
                            <a
                                href={checkoutUrl}
                                className="block w-full border border-gray-200 rounded-full py-3 text-sm font-bold text-gray-700 mb-2"
                            >
                                Return to payment
                            </a>
                        )}
                        <button onClick={abandon} className="text-xs text-gray-400 underline underline-offset-4">
                            Cancel this order
                        </button>
                    </>
                )}

                {phase === 'cancelled' && (
                    <>
                        <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
                            <XCircle size={30} className="text-gray-400" />
                        </div>
                        <p className="font-extrabold text-lg text-gray-900 mb-1">Payment cancelled</p>
                        <p className="text-sm text-gray-500 mb-5">
                            Nothing was charged. {orderNumber} is still waiting if you want to finish it.
                        </p>
                        <button
                            onClick={() => { setPhase('checking'); setAttempts(0); poll(); }}
                            className="w-full bg-brand text-gray-900 font-extrabold rounded-full py-3.5 shadow-sm mb-2"
                        >
                            Try paying again
                        </button>
                        <button onClick={abandon} className="text-xs text-gray-400 underline underline-offset-4">
                            No thanks, cancel the order
                        </button>
                    </>
                )}

                {phase === 'error' && (
                    <>
                        <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
                            <XCircle size={30} className="text-red-400" />
                        </div>
                        <p className="font-extrabold text-gray-900 mb-1">Something went wrong</p>
                        <p className="text-sm text-gray-500 mb-5">{message}</p>
                        <button
                            onClick={() => navigate(`${base}/track`, { replace: true })}
                            className="w-full bg-brand text-gray-900 font-extrabold rounded-full py-3.5 shadow-sm"
                        >
                            Go to my orders
                        </button>
                    </>
                )}

                {phase === 'checking' && attempts > 0 && (
                    <p className="text-[11px] text-gray-400 mt-4">Attempt {attempts + 1} of 6</p>
                )}
            </div>
        </div>
    );
}
