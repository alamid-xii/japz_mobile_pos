import { ShoppingBag, ArrowRight } from 'lucide-react';
import { peso } from '../StorefrontContext';

interface Props {
    count: number;
    total: number;
    onView: () => void;
}

/** Desktop-only floating summary, bottom-right. Mobile uses the bar above the tabs. */
export default function FloatingCart({ count, total, onView }: Props) {
    if (count === 0) return null;
    return (
        <button
            onClick={onView}
            className="hidden lg:flex fixed bottom-6 right-6 z-40 items-center gap-3 bg-slate-900 text-white rounded-full pl-5 pr-4 py-3.5 shadow-2xl shadow-slate-900/30 active:scale-95 transition duration-150 animate-[slideUp_200ms_ease-out]"
        >
            <span className="relative flex items-center justify-center">
                <ShoppingBag size={18} className="text-brand" />
                <span className="absolute -top-2 -right-2 min-w-[17px] h-[17px] px-1 rounded-full bg-brand text-slate-900 text-[10px] font-extrabold flex items-center justify-center">
                    {count > 9 ? '9+' : count}
                </span>
            </span>
            <span className="text-sm font-bold">
                {count} item{count > 1 ? 's' : ''} · {peso(total)}
            </span>
            <span className="flex items-center gap-1 text-sm font-extrabold text-brand">
                View Cart <ArrowRight size={15} />
            </span>
        </button>
    );
}
