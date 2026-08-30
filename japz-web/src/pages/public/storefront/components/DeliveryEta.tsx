import { useEffect, useState } from 'react';
import { Bike, Phone, Clock } from 'lucide-react';

export interface DeliveryInfo {
    address: string | null;
    lat: number | null;
    lng: number | null;
    storeLat: number | null;
    storeLng: number | null;
    riderName: string | null;
    riderPhone: string | null;
    dispatchedAt: string | null;
    etaMinMinutes: number;
    etaMaxMinutes: number;
    etaFrom: string | null;
    etaTo: string | null;
}

const clock = (iso: string) =>
    new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

/**
 * Countdown against the restaurant's configured delivery window.
 *
 * This is an estimate the business sets, not a live prediction — nothing here
 * knows the rider's position, so the copy never claims to.
 */
export default function DeliveryEta({ info, dispatched }: { info: DeliveryInfo; dispatched: boolean }) {
    const [, tick] = useState(0);

    // Re-render each minute so the remaining time stays truthful.
    useEffect(() => {
        const id = setInterval(() => tick(n => n + 1), 30000);
        return () => clearInterval(id);
    }, []);

    if (!dispatched || !info.etaFrom || !info.etaTo) {
        return (
            <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex items-start gap-3">
                <Clock size={18} className="text-gray-400 shrink-0 mt-0.5" />
                <div>
                    <p className="text-sm font-bold text-gray-900">Not yet on the way</p>
                    <p className="text-xs text-gray-500 mt-0.5">
                        Delivery usually takes {info.etaMinMinutes}–{info.etaMaxMinutes} minutes once it leaves us.
                    </p>
                </div>
            </section>
        );
    }

    const now = Date.now();
    const from = new Date(info.etaFrom).getTime();
    const to = new Date(info.etaTo).getTime();
    const minsTo = Math.round((to - now) / 60000);
    const minsFrom = Math.round((from - now) / 60000);

    // Past the window: say so plainly rather than showing a negative countdown.
    const late = now > to;

    return (
        <section className="bg-brand rounded-2xl p-4">
            <div className="flex items-start gap-3">
                <span className="w-10 h-10 rounded-full bg-gray-900 flex items-center justify-center shrink-0">
                    <Bike size={19} className="text-brand" />
                </span>
                <div className="min-w-0 flex-1">
                    <p className="text-[10px] font-extrabold text-gray-900/60 uppercase tracking-wide">On the way</p>
                    {late ? (
                        <p className="text-lg font-extrabold text-gray-900 leading-tight">Arriving any moment</p>
                    ) : (
                        <p className="text-lg font-extrabold text-gray-900 leading-tight">
                            {minsFrom > 0 ? `${minsFrom}–${minsTo} min` : `About ${Math.max(1, minsTo)} min`}
                        </p>
                    )}
                    <p className="text-xs text-gray-900/70 mt-0.5">
                        Estimated arrival {clock(info.etaFrom)}–{clock(info.etaTo)}
                    </p>
                </div>
            </div>

            {(info.riderName || info.riderPhone) && (
                <div className="mt-3 pt-3 border-t border-gray-900/15 flex items-center gap-3">
                    <div className="min-w-0 flex-1">
                        <p className="text-[10px] font-extrabold text-gray-900/60 uppercase tracking-wide">Your rider</p>
                        <p className="text-sm font-bold text-gray-900 truncate">{info.riderName || 'On the way'}</p>
                    </div>
                    {info.riderPhone && (
                        <a
                            href={`tel:${info.riderPhone.replace(/\s/g, '')}`}
                            className="shrink-0 flex items-center gap-1.5 bg-gray-900 text-white text-xs font-bold rounded-full px-4 py-2.5 active:scale-95 transition duration-150"
                        >
                            <Phone size={14} /> Call
                        </a>
                    )}
                </div>
            )}

            <p className="text-[10px] text-gray-900/50 mt-3">
                This is an estimate, not live rider tracking.
            </p>
        </section>
    );
}
