import { useState } from 'react';
import { Star, CheckCircle2 } from 'lucide-react';
import { publicOrderAPI } from '../../../../services/api';

interface Props {
    orderNumber: string;
    /** Already rated — show the thank-you instead of the form. */
    rated: boolean;
    onSubmitted: () => void;
}

const WORDING: Record<number, string> = {
    1: 'Very poor',
    2: 'Poor',
    3: 'Okay',
    4: 'Good',
    5: 'Excellent!',
};

/**
 * In-app rating, shown only once an order is completed. The server enforces
 * that too — a customer cannot rate food they have not received.
 */
export default function RateOrder({ orderNumber, rated, onSubmitted }: Props) {
    const [stars, setStars] = useState(0);
    const [hover, setHover] = useState(0);
    const [comment, setComment] = useState('');
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [done, setDone] = useState(false);

    if (rated || done) {
        return (
            <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 text-center">
                <div className="w-12 h-12 rounded-full bg-green-50 flex items-center justify-center mx-auto mb-2.5">
                    <CheckCircle2 size={24} className="text-green-600" />
                </div>
                <p className="font-bold text-slate-900">Thanks for the feedback</p>
                <p className="text-xs text-slate-500 mt-0.5">It helps us get better.</p>
            </section>
        );
    }

    const submit = async () => {
        if (stars < 1) return setError('Please choose a rating.');
        setError(null);
        setBusy(true);
        try {
            await publicOrderAPI.rateOrder(orderNumber, stars, comment.trim() || undefined);
            setDone(true);
            onSubmitted();
        } catch (err: any) {
            setError(err?.response?.data?.error || 'Could not send your feedback. Please try again.');
        } finally {
            setBusy(false);
        }
    };

    const shown = hover || stars;

    return (
        <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <p className="font-bold text-slate-900">How was your order?</p>
            <p className="text-xs text-slate-500 mt-0.5 mb-3">Your feedback goes straight to the team.</p>

            <div className="flex items-center gap-1.5" onMouseLeave={() => setHover(0)}>
                {[1, 2, 3, 4, 5].map(n => (
                    <button
                        key={n}
                        onClick={() => setStars(n)}
                        onMouseEnter={() => setHover(n)}
                        aria-label={`${n} star${n > 1 ? 's' : ''}`}
                        aria-pressed={stars === n}
                        className="p-1 active:scale-90 transition duration-150"
                    >
                        <Star
                            size={30}
                            className={n <= shown ? 'text-brand fill-brand' : 'text-gray-300'}
                        />
                    </button>
                ))}
                {shown > 0 && (
                    <span className="ml-2 text-sm font-bold text-slate-700">{WORDING[shown]}</span>
                )}
            </div>

            <textarea
                value={comment}
                onChange={e => setComment(e.target.value.slice(0, 1000))}
                rows={3}
                placeholder="Anything you'd like us to know? (optional)"
                className="mt-3 w-full rounded-2xl bg-gray-50 text-slate-900 placeholder-slate-400 border border-gray-200 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent transition duration-150"
            />

            {error && (
                <div className="mt-2 bg-red-50 border border-red-200 text-red-700 rounded-2xl px-4 py-3 text-sm">{error}</div>
            )}

            <button
                onClick={submit}
                disabled={busy || stars < 1}
                className="mt-3 w-full bg-brand text-slate-900 font-extrabold rounded-full py-3.5 shadow-sm disabled:opacity-50 active:scale-[0.99] transition duration-150"
            >
                {busy ? 'Sending…' : 'Send feedback'}
            </button>
        </section>
    );
}
