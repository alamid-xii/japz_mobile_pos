import { useCallback, useEffect, useState } from 'react';
import {
    CalendarCheck, Table2, Plus, Check, X, Users, Clock, Phone,
    AlertTriangle, Trash2, Armchair, Loader2,
} from 'lucide-react';
import { reservationAPI } from '../../services/api';
import { useAuth } from '../../hooks/useAuth';

interface TableRow {
    id: number; name: string; capacity: number;
    area: string | null; status: 'active' | 'inactive'; notes: string | null;
}
interface Booking {
    id: number; code: string; customerName: string; customerPhone: string | null;
    partySize: number; reservationDate: string; startTime: string; durationMinutes: number;
    status: 'pending' | 'confirmed' | 'seated' | 'completed' | 'cancelled' | 'declined' | 'no-show';
    source: 'online' | 'staff';
    notes: string | null; staffMessage: string | null;
    table: { id: number; name: string; capacity: number; area: string | null } | null;
}

const STATUS_STYLE: Record<Booking['status'], string> = {
    pending: 'bg-amber-100 text-amber-700',
    confirmed: 'bg-emerald-100 text-emerald-700',
    seated: 'bg-blue-100 text-blue-700',
    completed: 'bg-slate-200 text-slate-600',
    cancelled: 'bg-slate-100 text-slate-500',
    declined: 'bg-red-100 text-red-700',
    'no-show': 'bg-red-100 text-red-700',
};

const today = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
const day = (d: string) => new Date(d + 'T00:00:00').toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });

export default function Reservations() {
    const { user } = useAuth();
    const isAdmin = user?.role === 'admin';

    const [tab, setTab] = useState<'bookings' | 'tables'>('bookings');
    const [date, setDate] = useState(today());
    const [statusFilter, setStatusFilter] = useState('');
    const [bookings, setBookings] = useState<Booking[]>([]);
    const [pendingCount, setPendingCount] = useState(0);
    const [tables, setTables] = useState<TableRow[]>([]);
    const [error, setError] = useState<string | null>(null);
    const [notice, setNotice] = useState<string | null>(null);
    const [busy, setBusy] = useState(false);

    const [confirming, setConfirming] = useState<Booking | null>(null);
    const [freeTables, setFreeTables] = useState<TableRow[]>([]);
    const [chosenTable, setChosenTable] = useState<number | null>(null);

    const [showNewTable, setShowNewTable] = useState(false);
    const [tableForm, setTableForm] = useState({ name: '', capacity: '4', area: '' });
    const [showNewBooking, setShowNewBooking] = useState(false);
    const [slotTables, setSlotTables] = useState<TableRow[]>([]);
    const [slotChecking, setSlotChecking] = useState(false);
    const [slotMessage, setSlotMessage] = useState<string | null>(null);
    const [walkinTable, setWalkinTable] = useState<number | null>(null);
    const [bookingForm, setBookingForm] = useState({
        customerName: '', customerPhone: '', partySize: '2',
        reservationDate: today(), startTime: '18:00', notes: '',
    });

    const say = (m: string) => { setNotice(m); setTimeout(() => setNotice(null), 3500); };
    const fail = (err: any, fallback: string) => setError(err?.response?.data?.error || fallback);

    const load = useCallback(async () => {
        try {
            const res = await reservationAPI.list({ date: date || undefined, status: statusFilter || undefined });
            setBookings(res.data.reservations);
            setPendingCount(res.data.pendingCount);
            setError(null);
        } catch (err) { fail(err, 'Could not load bookings.'); }
    }, [date, statusFilter]);

    const loadTables = useCallback(async () => {
        try { setTables((await reservationAPI.tables()).data.tables); }
        catch (err) { fail(err, 'Could not load tables.'); }
    }, []);

    useEffect(() => { load(); }, [load]);
    useEffect(() => { loadTables(); }, [loadTables]);

    // While the walk-in modal is open, keep the table list in step with the
    // slot being typed, so staff pick from what is genuinely free.
    useEffect(() => {
        if (!showNewBooking) return;
        const { reservationDate, startTime, partySize } = bookingForm;
        if (!reservationDate || !startTime) return;

        let cancelled = false;
        setSlotChecking(true);
        reservationAPI.freeTablesForSlot(reservationDate, startTime, Number(partySize) || 2)
            .then(res => {
                if (cancelled) return;
                setSlotTables(res.data.tables);
                setSlotMessage(res.data.message ?? null);
                // Keep the current pick only if it survives the new slot.
                setWalkinTable(prev =>
                    prev && res.data.tables.some((t: TableRow) => t.id === prev) ? prev : (res.data.tables[0]?.id ?? null));
            })
            .catch(() => { if (!cancelled) { setSlotTables([]); setSlotMessage(null); } })
            .finally(() => { if (!cancelled) setSlotChecking(false); });
        return () => { cancelled = true; };
    }, [showNewBooking, bookingForm.reservationDate, bookingForm.startTime, bookingForm.partySize]);

    const act = async (fn: () => Promise<unknown>, msg: string) => {
        setBusy(true); setError(null);
        try { await fn(); await load(); say(msg); }
        catch (err) { fail(err, 'That did not work.'); }
        finally { setBusy(false); }
    };

    const openConfirm = async (b: Booking) => {
        setConfirming(b);
        setChosenTable(null);
        try {
            const res = await reservationAPI.freeTables(b.id);
            setFreeTables(res.data.tables);
            setChosenTable(res.data.tables[0]?.id ?? null);
        } catch (err) { fail(err, 'Could not check table availability.'); }
    };

    const doConfirm = async () => {
        if (!confirming) return;
        await act(() => reservationAPI.confirm(confirming.id, chosenTable ?? undefined), 'Booking confirmed.');
        setConfirming(null);
    };

    const createTable = async () => {
        setBusy(true); setError(null);
        try {
            await reservationAPI.createTable({
                name: tableForm.name.trim(),
                capacity: Number(tableForm.capacity),
                area: tableForm.area.trim() || undefined,
            });
            setShowNewTable(false);
            setTableForm({ name: '', capacity: '4', area: '' });
            await loadTables();
            say('Table added.');
        } catch (err) { fail(err, 'Could not add the table.'); }
        finally { setBusy(false); }
    };

    const createBooking = async () => {
        setBusy(true); setError(null);
        try {
            await reservationAPI.create({
                ...bookingForm,
                partySize: Number(bookingForm.partySize),
                tableId: walkinTable ?? undefined,
            });
            setShowNewBooking(false);
            setWalkinTable(null);
            setBookingForm({ customerName: '', customerPhone: '', partySize: '2', reservationDate: today(), startTime: '18:00', notes: '' });
            await load();
            say('Booking recorded and confirmed.');
        } catch (err) { fail(err, 'Could not record the booking.'); }
        finally { setBusy(false); }
    };

    const activeTables = tables.filter(t => t.status === 'active').length;

    return (
        <div className="p-4 md:p-6 max-w-5xl mx-auto">
            <div className="flex items-center gap-3 mb-1">
                <CalendarCheck size={22} className="text-slate-700" />
                <h1 className="text-2xl font-extrabold text-slate-900">Reservations</h1>
                {pendingCount > 0 && (
                    <span className="text-[10px] font-extrabold bg-amber-100 text-amber-700 rounded-full px-2.5 py-1">
                        {pendingCount} awaiting confirmation
                    </span>
                )}
            </div>
            <p className="text-sm text-slate-500 mb-5">Requests arrive pending — a table is only held once you confirm.</p>

            {isAdmin && (
                <div className="flex gap-2 mb-5">
                    {([['bookings', 'Bookings', CalendarCheck], ['tables', 'Tables', Table2]] as const).map(([key, label, Icon]) => (
                        <button key={key} onClick={() => setTab(key)}
                            className={`flex items-center gap-2 rounded-full px-4 py-2 text-sm font-bold transition ${
                                tab === key ? 'bg-slate-900 text-white' : 'bg-white border border-gray-200 text-slate-600'
                            }`}>
                            <Icon size={15} /> {label}
                        </button>
                    ))}
                </div>
            )}

            {error && <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm mb-3">{error}</div>}
            {notice && <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-xl px-4 py-3 text-sm mb-3">{notice}</div>}

            {activeTables === 0 && (
                <div className="bg-amber-50 border border-amber-300 rounded-2xl px-4 py-3 mb-4 flex gap-3">
                    <AlertTriangle size={18} className="text-amber-600 shrink-0 mt-0.5" />
                    <div className="text-sm text-amber-900">
                        <p className="font-bold">No tables are set up.</p>
                        <p>Customers cannot book until at least one table exists{isAdmin ? ' — add them under the Tables tab.' : '. Ask an admin to add them.'}</p>
                    </div>
                </div>
            )}

            {(tab === 'bookings' || !isAdmin) && (
                <>
                    <div className="flex flex-wrap gap-2 mb-4">
                        <input type="date" value={date} onChange={e => setDate(e.target.value)}
                            className="rounded-xl border border-gray-200 px-3 py-2 text-sm" />
                        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
                            className="rounded-xl border border-gray-200 px-3 py-2 text-sm">
                            <option value="">All statuses</option>
                            {['pending', 'confirmed', 'seated', 'completed', 'cancelled', 'declined', 'no-show'].map(s => (
                                <option key={s} value={s}>{s}</option>
                            ))}
                        </select>
                        <button onClick={() => setDate('')}
                            className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-bold text-slate-600">
                            Any date
                        </button>
                        <button onClick={() => setShowNewBooking(true)} disabled={activeTables === 0}
                            className="ml-auto flex items-center gap-2 rounded-xl bg-brand text-slate-900 px-4 py-2 text-sm font-extrabold disabled:opacity-50">
                            <Plus size={16} /> Walk-in / phone
                        </button>
                    </div>

                    {bookings.length === 0 ? (
                        <div className="bg-white rounded-2xl border border-gray-100 p-10 text-center">
                            <CalendarCheck size={34} className="mx-auto text-slate-300 mb-3" />
                            <p className="font-bold text-slate-900">No bookings</p>
                            <p className="text-sm text-slate-500 mt-1">Nothing matches this date and status.</p>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {bookings.map(b => (
                                <div key={b.id} className="bg-white rounded-2xl border border-gray-100 p-4">
                                    <div className="flex flex-wrap items-start gap-3">
                                        <div className="flex-1 min-w-[180px]">
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <p className="font-bold text-slate-900">{b.customerName}</p>
                                                <span className={`text-[9px] font-extrabold rounded-full px-2 py-0.5 uppercase ${STATUS_STYLE[b.status]}`}>
                                                    {b.status}
                                                </span>
                                                {b.source === 'online' && (
                                                    <span className="text-[9px] font-bold text-slate-400">ONLINE</span>
                                                )}
                                            </div>
                                            <p className="text-xs text-slate-500 mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
                                                <span className="flex items-center gap-1"><Clock size={12} /> {day(b.reservationDate)} · {b.startTime}</span>
                                                <span className="flex items-center gap-1"><Users size={12} /> {b.partySize} pax</span>
                                                {b.customerPhone && <span className="flex items-center gap-1"><Phone size={12} /> {b.customerPhone}</span>}
                                                <span className="text-slate-400">{b.code}</span>
                                            </p>
                                            {b.table && (
                                                <p className="text-xs font-bold text-slate-700 mt-1 flex items-center gap-1">
                                                    <Armchair size={12} /> {b.table.name}{b.table.area ? ` · ${b.table.area}` : ''}
                                                </p>
                                            )}
                                            {b.notes && <p className="text-xs text-slate-500 mt-1">Note: {b.notes}</p>}
                                        </div>

                                        <div className="flex flex-wrap gap-2">
                                            {b.status === 'pending' && (
                                                <>
                                                    <button onClick={() => openConfirm(b)} disabled={busy}
                                                        className="flex items-center gap-1.5 rounded-xl bg-emerald-600 text-white px-3 py-2 text-xs font-bold disabled:opacity-50">
                                                        <Check size={14} /> Confirm
                                                    </button>
                                                    <button onClick={() => { const m = prompt('Reason (shown to the customer):') ?? undefined; act(() => reservationAPI.decline(b.id, m), 'Booking declined.'); }}
                                                        disabled={busy}
                                                        className="flex items-center gap-1.5 rounded-xl border border-gray-200 px-3 py-2 text-xs font-bold text-slate-600 disabled:opacity-50">
                                                        <X size={14} /> Decline
                                                    </button>
                                                </>
                                            )}
                                            {b.status === 'confirmed' && (
                                                <>
                                                    <button onClick={() => act(() => reservationAPI.setStatus(b.id, 'seated'), 'Party seated.')} disabled={busy}
                                                        className="rounded-xl bg-slate-900 text-white px-3 py-2 text-xs font-bold disabled:opacity-50">
                                                        Seat
                                                    </button>
                                                    <button onClick={() => act(() => reservationAPI.setStatus(b.id, 'no-show'), 'Marked as a no-show.')} disabled={busy}
                                                        className="rounded-xl border border-gray-200 px-3 py-2 text-xs font-bold text-slate-600 disabled:opacity-50">
                                                        No-show
                                                    </button>
                                                </>
                                            )}
                                            {b.status === 'seated' && (
                                                <button onClick={() => act(() => reservationAPI.setStatus(b.id, 'completed'), 'Booking completed.')} disabled={busy}
                                                    className="rounded-xl bg-slate-900 text-white px-3 py-2 text-xs font-bold disabled:opacity-50">
                                                    Complete
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </>
            )}

            {tab === 'tables' && isAdmin && (
                <>
                    <button onClick={() => setShowNewTable(true)}
                        className="flex items-center gap-2 rounded-xl bg-brand text-slate-900 px-4 py-2.5 text-sm font-extrabold mb-4">
                        <Plus size={16} /> Add table
                    </button>

                    {tables.length === 0 ? (
                        <div className="bg-white rounded-2xl border border-gray-100 p-10 text-center">
                            <Table2 size={34} className="mx-auto text-slate-300 mb-3" />
                            <p className="font-bold text-slate-900">No tables yet</p>
                            <p className="text-sm text-slate-500 mt-1">Add the tables your restaurant actually has.</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                            {tables.map(t => (
                                <div key={t.id} className={`bg-white rounded-2xl border p-4 ${t.status === 'active' ? 'border-gray-100' : 'border-gray-200 opacity-60'}`}>
                                    <div className="flex items-start justify-between">
                                        <div>
                                            <p className="font-extrabold text-slate-900">{t.name}</p>
                                            <p className="text-xs text-slate-500">Seats {t.capacity}{t.area ? ` · ${t.area}` : ''}</p>
                                        </div>
                                        <button
                                            onClick={() => act(async () => { await reservationAPI.deleteTable(t.id); await loadTables(); }, 'Table removed.')}
                                            aria-label="Delete" className="p-1 text-slate-300 hover:text-red-500">
                                            <Trash2 size={15} />
                                        </button>
                                    </div>
                                    <button
                                        onClick={() => act(async () => {
                                            await reservationAPI.updateTable(t.id, { status: t.status === 'active' ? 'inactive' : 'active' });
                                            await loadTables();
                                        }, 'Table updated.')}
                                        className="mt-3 w-full rounded-xl border border-gray-200 py-2 text-xs font-bold text-slate-600">
                                        {t.status === 'active' ? 'Take out of service' : 'Put back in service'}
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </>
            )}

            {confirming && (
                <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={() => setConfirming(null)}>
                    <div className="bg-white rounded-3xl w-full max-w-sm p-5" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-between mb-3">
                            <p className="font-extrabold text-slate-900">Confirm booking</p>
                            <button onClick={() => setConfirming(null)} aria-label="Close"><X size={18} className="text-slate-500" /></button>
                        </div>
                        <p className="text-sm text-slate-600 mb-4">
                            {confirming.customerName} · {confirming.partySize} pax · {day(confirming.reservationDate)} at {confirming.startTime}
                        </p>

                        {freeTables.length === 0 ? (
                            <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-3 py-3 text-sm">
                                No table is free for this slot any more. Decline the request, or ask the customer for another time.
                            </div>
                        ) : (
                            <>
                                <p className="text-xs font-bold text-slate-600 mb-2">Assign a table</p>
                                <div className="space-y-2 mb-4 max-h-52 overflow-y-auto">
                                    {freeTables.map(t => (
                                        <button key={t.id} onClick={() => setChosenTable(t.id)}
                                            className={`w-full flex items-center justify-between rounded-xl border-2 px-3 py-2.5 text-left ${
                                                chosenTable === t.id ? 'border-brand bg-brand/10' : 'border-gray-200'
                                            }`}>
                                            <span className="font-bold text-sm text-slate-900">{t.name}</span>
                                            <span className="text-xs text-slate-500">seats {t.capacity}{t.area ? ` · ${t.area}` : ''}</span>
                                        </button>
                                    ))}
                                </div>
                                <button onClick={doConfirm} disabled={busy || !chosenTable}
                                    className="w-full rounded-2xl bg-emerald-600 text-white font-extrabold py-3 disabled:opacity-50">
                                    Confirm and hold table
                                </button>
                            </>
                        )}
                    </div>
                </div>
            )}

            {showNewTable && (
                <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={() => setShowNewTable(false)}>
                    <div className="bg-white rounded-3xl w-full max-w-sm p-5" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-between mb-4">
                            <p className="font-extrabold text-slate-900">Add table</p>
                            <button onClick={() => setShowNewTable(false)} aria-label="Close"><X size={18} className="text-slate-500" /></button>
                        </div>
                        <input value={tableForm.name} onChange={e => setTableForm(f => ({ ...f, name: e.target.value }))}
                            placeholder="Name (e.g. Table 1)"
                            className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm mb-2" />
                        <input type="number" min="1" max="50" value={tableForm.capacity}
                            onChange={e => setTableForm(f => ({ ...f, capacity: e.target.value }))}
                            placeholder="Seats"
                            className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm mb-2" />
                        <input value={tableForm.area} onChange={e => setTableForm(f => ({ ...f, area: e.target.value }))}
                            placeholder="Area (optional, e.g. Outdoor)"
                            className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm mb-4" />
                        <button onClick={createTable} disabled={busy || !tableForm.name.trim()}
                            className="w-full rounded-2xl bg-brand text-slate-900 font-extrabold py-3 disabled:opacity-50">
                            Add
                        </button>
                    </div>
                </div>
            )}

            {showNewBooking && (
                <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={() => setShowNewBooking(false)}>
                    <div className="bg-white rounded-3xl w-full max-w-sm p-5 max-h-[92vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-between mb-4">
                            <p className="font-extrabold text-slate-900">Walk-in / phone booking</p>
                            <button onClick={() => setShowNewBooking(false)} aria-label="Close"><X size={18} className="text-slate-500" /></button>
                        </div>
                        <input value={bookingForm.customerName} onChange={e => setBookingForm(f => ({ ...f, customerName: e.target.value }))}
                            placeholder="Customer name"
                            className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm mb-2" />
                        <input value={bookingForm.customerPhone} onChange={e => setBookingForm(f => ({ ...f, customerPhone: e.target.value }))}
                            placeholder="Contact number (optional)"
                            className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm mb-2" />
                        <div className="grid grid-cols-2 gap-2 mb-2">
                            <label className="block">
                                <span className="block text-xs font-bold text-slate-600 mb-1">Date</span>
                                <input type="date" value={bookingForm.reservationDate}
                                    onChange={e => setBookingForm(f => ({ ...f, reservationDate: e.target.value }))}
                                    className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm" />
                            </label>
                            <label className="block">
                                <span className="block text-xs font-bold text-slate-600 mb-1">Time</span>
                                <input type="time" value={bookingForm.startTime}
                                    onChange={e => setBookingForm(f => ({ ...f, startTime: e.target.value }))}
                                    className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm" />
                            </label>
                        </div>
                        <label className="block mb-4">
                            <span className="block text-xs font-bold text-slate-600 mb-1">Party size</span>
                            <input type="number" min="1" max="50" value={bookingForm.partySize}
                                onChange={e => setBookingForm(f => ({ ...f, partySize: e.target.value }))}
                                className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm" />
                        </label>

                        <p className="text-xs font-bold text-slate-600 mb-2">Table</p>
                        {slotChecking ? (
                            <p className="flex items-center gap-2 text-sm text-slate-400 mb-4">
                                <Loader2 size={14} className="animate-spin" /> Checking which tables are free…
                            </p>
                        ) : slotMessage ? (
                            <div className="bg-amber-50 border border-amber-200 text-amber-800 rounded-xl px-3 py-2.5 text-sm mb-4">
                                {slotMessage}
                            </div>
                        ) : slotTables.length === 0 ? (
                            <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-3 py-2.5 text-sm mb-4">
                                No table seats {bookingForm.partySize || '2'} at that time. Try another slot.
                            </div>
                        ) : (
                            <div className="space-y-2 mb-4 max-h-44 overflow-y-auto">
                                {slotTables.map(t => (
                                    <button key={t.id} type="button" onClick={() => setWalkinTable(t.id)}
                                        aria-pressed={walkinTable === t.id}
                                        className={`w-full flex items-center justify-between rounded-xl border-2 px-3 py-2.5 text-left transition ${
                                            walkinTable === t.id ? 'border-brand bg-brand/10' : 'border-gray-200'
                                        }`}>
                                        <span className="font-bold text-sm text-slate-900">{t.name}</span>
                                        <span className="text-xs text-slate-500">seats {t.capacity}{t.area ? ` · ${t.area}` : ''}</span>
                                    </button>
                                ))}
                            </div>
                        )}

                        <button onClick={createBooking}
                            disabled={busy || slotChecking || !bookingForm.customerName.trim() || !walkinTable}
                            className="w-full rounded-2xl bg-brand text-slate-900 font-extrabold py-3 disabled:opacity-50">
                            Record booking
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
