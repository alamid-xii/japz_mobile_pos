import { ArrowRight } from 'lucide-react';
import { peso } from '../StorefrontContext';

interface Props {
    count: number;
    total: number;
    onView: () => void;
}

/** Sticky summary that rides just above the bottom navigation. */
export default function MiniCart({ count, total, onView }: Props) {
    if (count === 0) return null;
    return (
        <div className="px-4 pb-2 pointer-events-none">
            <button
                onClick={onView}
                className="pointer-events-auto max-w-5xl mx-auto w-full bg-gray-900 text-white rounded-2xl px-4 py-3 flex items-center justify-between shadow-lg active:scale-[0.99] transition duration-150 animate-[slideUp_200ms_ease-out]"
            >
                <span className="font-bold text-sm">
                    {count} item{count > 1 ? 's' : ''} · {peso(total)}
                </span>
                <span className="flex items-center gap-1 font-extrabold text-sm text-brand">
                    VIEW CART <ArrowRight size={16} />
                </span>
            </button>
        </div>
    );
}
