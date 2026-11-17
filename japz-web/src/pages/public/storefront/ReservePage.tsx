import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    CalendarCheck, Users, Clock, Check, X, AlertTriangle, Armchair, Loader2,
} from 'lucide-react';
import { publicReservationAPI } from '../../../services/api';
import { useCustomerAuth } from './CustomerAuthContext';
import { useStorefrontBase } from './storefrontRouting';

interface Booking {
    id: number; code: string; partySize: number;
    reservationDate: string; startTime: string;
    status: 'pending' | 'confirmed' | 'seated' | 'completed' | 'cancelled' | 'declined' | 'no-show';
    staffMessage: string | null;
    table: { id: number; name: string; capacity: number; area: string | null } | null;
}

const STATUS_COPY: Record<Booking['status'], { label: string; tone: string; blurb: string }> = {
    pending: { label: 'Awaiting confirmation', tone: 'bg-amber-100 text-amber-700', blurb: 'The restaurant will confirm shortly.' },
    confirmed: { label: 'Confirmed', tone: 'bg-emerald-100 text-emerald-700', blurb: 'Your table is held. See you then!' },
    seated: { label: 'Seated', tone: 'bg-blue-100 text-blue-700', blurb: 'Enjoy your meal.' },
    completed: { label: 'Completed', tone: 'bg-gray-200 text-gray-600', blurb: 'Thanks for dining with us.' },
    cancelled: { label: 'Cancelled', tone: 'bg-gray-100 text-gray-500', blurb: 'This booking was cancelled.' },
    declined: { label: 'Declined', tone: 'bg-red-100 text-red-700', blurb: 'The restaurant could not take this booking.' },
    'no-show': { label: 'No-show', tone: 'bg-red-100 text-red-700', blurb: 'Recorded as a no-show.' },
};

const today = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
const day = (d: string) => new Date(d + 'T00:00:00').toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' });
const PARTY_SIZES = [1, 2, 3, 4, 5, 6, 8, 10];

export default function ReservePage() {
    const { customer, ready } = useCustomerAuth();
    const navigate = useNavigate();
    const base = useStorefrontBase();

    const [date, setDate] = useState(today());
    const [time, setTime] = useState('18:00');
    const [partySize, setPartySize] = useState(2);
    const [notes, setNotes] = useState('');

    const [checking, setChecking] = useState(false);
    const [availability, setAvailability] = useState<{ available: boolean; reason?: string; message?: string } | null>(null);
    const [booking, setBooking] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [mine, setMine] = useState<Booking[]>([]);
    const [justBooked, setJustBooked] = useState<string | null>(null);

    const loadMine = useCallback(async () => {
        if (!customer) return;
        try { setMine((await publicReservationAPI.mine()).data.reservations); }
        catch { /* the booking form still works without the history */ }
    }, [customer]);

    useEffect(() => { loadMine(); }, [loadMine]);

    // Availability is re-checked whenever the slot changes, so the button never
    // promises a table that is already taken.
    useEffect(() => {
        let cancelled = false;
        if (!date || !time) return;
        setChecking(true);
        publicReservationAPI.availability(date, time, partySize)
            .then(res => { if (!cancelled) setAvailability(res.data); })
            .catch(() => { if (!cancelled) setAvailability(null); })
            .finally(() => { if (!cancelled) setChecking(false); });
        return () => { cancelled = true; };
    }, [date, time, partySize]);

    const submit = async () => {
        if (!customer) { navigate(`${base}/auth`); return; }
        setBooking(true);
        setError(null);
        try {
            const res = await publicReservationAPI.book({
                reservationDate: date,
                startTime: time,
                partySize,
                notes: notes.trim() || undefined,
            });
            setJustBooked(res.data.reservation.code);
            setNotes('');
            await loadMine();
        } catch (err: any) {
            setError(err?.response?.data?.error || 'Could not send that booking.');
        } finally {
            setBooking(false);
        }
    };

    const cancel = async (code: string) => {
        if (!confirm('Cancel this booking?')) return;
        try { await publicReservationAPI.cancel(code); await loadMine(); }
        catch (err: any) { setError(err?.response?.data?.error || 'Could not cancel that booking.'); }
    };

    const noTables = availability?.reason === 'no-tables';
    const closed = availability?.reason === 'closed';

    return (
        <div className="max-w-2xl mx-auto px-4 py-4 space-y-4">
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                <div className="flex items-center gap-2 mb-1">
                    <CalendarCheck size={20} className="text-gray-700" />
                    <h1 className="font-extrabold text-lg text-gray-900">Reserve a table</h1>
                </div>
                <p className="text-sm text-gray-500 mb-5">
                    Pick a time and we will confirm your table shortly.
                </p>

                {noTables ? (
                    <div className="bg-amber-50 border border-amber-200 rounded-2xl px-4 py-3 flex gap-3">
                        <AlertTriangle size={18} className="text-amber-600 shrink-0 mt-0.5" />
                        <p className="text-sm text-amber-900">
                            Table booking is not available yet. Please call the restaurant to reserve.
                        </p>
                    </div>
                ) : (
                    <>
                        <div className="grid grid-cols-2 gap-3 mb-4">
                            <label className="block">
                                <span className="block text-xs font-bold text-gray-600 mb-1.5">Date</span>
                                <input type="date" value={date} min={today()} onChange={e => setDate(e.target.value)}
                                    className="w-full rounded-2xl bg-gray-50 border border-gray-200 px-3 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand" />
                            </label>
                            <label className="block">
                                <span className="block text-xs font-bold text-gray-600 mb-1.5">Time</span>
                                <input type="time" value={time} onChange={e => setTime(e.target.value)}
                                    className="w-full rounded-2xl bg-gray-50 border border-gray-200 px-3 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand" />
                            </label>
                        </div>

                        <span className="block text-xs font-bold text-gray-600 mb-1.5">How many people?</span>
                        <div className="flex flex-wrap gap-2 mb-4">
                            {PARTY_SIZES.map(n => (
                                <button key={n} onClick={() => setPartySize(n)}
                                    aria-pressed={partySize === n}
                                    className={`w-12 h-12 rounded-2xl font-extrabold text-sm border-2 transition ${
                                        partySize === n ? 'border-brand bg-brand/15 text-gray-900' : 'border-gray-200 bg-white text-gray-500'
                                    }`}>
                                    {n}
                                </button>
                            ))}
                        </div>

                        <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2}
                            placeholder="Anything we should know? (optional)"
                            className="w-full rounded-2xl bg-gray-50 border border-gray-200 px-4 py-3 text-sm mb-4 focus:outline-none focus:ring-2 focus:ring-brand" />

                        <div className="mb-4 min-h-[44px]">
                            {checking ? (
                                <p className="flex items-center gap-2 text-sm text-gray-400">
                                    <Loader2 size={15} className="animate-spin" /> Checking availability…
                                </p>
                            ) : closed ? (
                                <p className="flex items-start gap-2 text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2.5">
                                    <Clock size={15} className="shrink-0 mt-0.5" /> {availability?.message}
                                </p>
                            ) : availability?.available ? (
                                <p className="flex items-center gap-2 text-sm text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-xl px-3 py-2.5">
                                    <Check size={15} /> A table is free at this time.
                                </p>
                            ) : availability ? (
                                <p className="flex items-center gap-2 text-sm text-gray-600 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5">
                                    <X size={15} /> Fully booked for {partySize} at this time. Try another slot.
                                </p>
                            ) : null}
                        </div>

                        {error && (
                            <div className="bg-red-50 border border-red-200 text-red-700 rounded-2xl px-4 py-3 text-sm mb-3">{error}</div>
                        )}

                        {justBooked && (
                            <div className="bg-emerald-50 border border-emerald-200 rounded-2xl px-4 py-3 text-sm text-emerald-800 mb-3">
                                <p className="font-bold">Request sent — {justBooked}</p>
                                <p>We will confirm your table shortly. You will see it update below.</p>
                            </div>
                        )}

                        <button
                            onClick={submit}
                            disabled={booking || checking || !availability?.available}
                            className="w-full bg-brand text-gray-900 font-extrabold rounded-full py-3.5 shadow-sm disabled:opacity-50"
                        >
                            {!ready ? 'Loading…'
                                : !customer ? 'Sign in to book'
                                : booking ? 'Sending…'
                                : 'Request this table'}
                        </button>
                        {customer && (
                            <p className="text-[11px] text-gray-400 text-center mt-2">
                                Bookings are confirmed by the restaurant, not automatically.
                            </p>
                        )}
                    </>
                )}
            </div>

            {mine.length > 0 && (
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                    <p className="font-extrabold text-gray-900 mb-3">Your bookings</p>
                    <ul className="space-y-3">
                        {mine.map(b => {
                            const copy = STATUS_COPY[b.status];
                            return (
                                <li key={b.id} className="border border-gray-100 rounded-2xl p-3.5">
                                    <div className="flex items-start justify-between gap-2">
                                        <div className="min-w-0">
                                            <p className="font-bold text-gray-900 text-sm">{day(b.reservationDate)}</p>
                                            <p className="text-xs text-gray-500 flex flex-wrap items-center gap-x-3 gap-y-1 mt-1">
                                                <span className="flex items-center gap-1"><Clock size={12} /> {b.startTime}</span>
                                                <span className="flex items-center gap-1"><Users size={12} /> {b.partySize} pax</span>
                                                <span className="text-gray-400">{b.code}</span>
                                            </p>
                                            {b.table && (
                                                <p className="text-xs font-bold text-gray-700 mt-1 flex items-center gap-1">
                                                    <Armchair size={12} /> {b.table.name}{b.table.area ? ` · ${b.table.area}` : ''}
                                                </p>
                                            )}
                                        </div>
                                        <span className={`text-[9px] font-extrabold rounded-full px-2 py-1 whitespace-nowrap ${copy.tone}`}>
                                            {copy.label.toUpperCase()}
                                        </span>
                                    </div>
                                    <p className="text-xs text-gray-500 mt-2">{b.staffMessage || copy.blurb}</p>
                                    {['pending', 'confirmed'].includes(b.status) && (
                                        <button onClick={() => cancel(b.code)}
                                            className="mt-2 text-xs font-bold text-gray-400 underline underline-offset-4">
                                            Cancel booking
                                        </button>
                                    )}
                                </li>
                            );
                        })}
                    </ul>
                </div>
            )}
        </div>
    );
}
