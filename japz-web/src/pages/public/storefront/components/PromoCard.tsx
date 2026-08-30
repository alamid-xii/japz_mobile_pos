import { PartyPopper, Ticket } from 'lucide-react';
import type { Promo } from '../StorefrontContext';

/**
 * Renders promotions staff created in the admin area. If none are active the
 * caller hides the section entirely — no placeholder deal is ever shown,
 * because a price claim in front of a customer has to be real.
 */
export default function PromoCard({ promos }: { promos: Promo[] }) {
    if (promos.length === 0) return null;

    return (
        <div className="-mx-4 px-4 overflow-x-auto scrollbar-none">
            <div className="flex gap-3 w-max pb-0.5">
                {promos.map((p, i) => (
                    <div
                        key={`${p.kind}-${i}`}
                        className="w-[260px] shrink-0 bg-slate-900 rounded-[20px] p-4 flex items-start gap-3"
                    >
                        <span className="w-10 h-10 rounded-full bg-brand flex items-center justify-center shrink-0">
                            {p.kind === 'voucher'
                                ? <Ticket size={18} className="text-slate-900" />
                                : <PartyPopper size={18} className="text-slate-900" />}
                        </span>
                        <div className="min-w-0">
                            <p className="text-[10px] font-extrabold text-brand uppercase tracking-wide">
                                {p.kind === 'voucher' ? "Voucher" : "Today's deal"}
                            </p>
                            <p className="text-sm font-extrabold text-white truncate">{p.title}</p>
                            <p className="text-xs text-white/70">{p.detail}</p>
                            {p.code && (
                                <p className="mt-1.5 inline-block text-[11px] font-mono font-bold bg-white/10 text-white rounded px-2 py-0.5">
                                    {p.code}
                                </p>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
