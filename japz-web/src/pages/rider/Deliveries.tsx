import { useCallback, useEffect, useRef, useState } from 'react';
import {
    Bike, MapPin, Phone, Camera, Check, X, Package, Navigation,
    LogOut, CircleDot, History, Receipt as ReceiptIcon, ExternalLink,
} from 'lucide-react';
import { workflowAPI, getApiBaseUrl } from '../../services/api';
import { useAuth } from '../../hooks/useAuth';
import DeliveryMap from '../public/storefront/components/DeliveryMap';
import DeliveryReceipt from '../../components/DeliveryReceipt';
import TimeClock from '../../components/TimeClock';

interface DeliveryOrder {
    orderNumber: string;
    customerName: string;
    customerPhone: string | null;
    deliveryAddress: string | null;
    deliveryLat: number | null;
    deliveryLng: number | null;
    total: string | number;
    notes: string | null;
    items: { name: string; quantity: number }[];
}
interface DeliveryRow {
    deliveryId: number;
    status: 'assigned' | 'out-for-delivery' | 'delivered';
    assignedAt: string;
    startedAt: string | null;
    deliveredAt: string | null;
    proofPhotoUrl: string | null;
    order: DeliveryOrder | null;
}

const money = (n: number | string) => `₱${Number(n).toFixed(2)}`;
const clock = (iso: string | null) => iso ? new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—';

export default function RiderDeliveries() {
    const { user, logout } = useAuth();

    const [active, setActive] = useState<DeliveryRow[]>([]);
    const [history, setHistory] = useState<DeliveryRow[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [tab, setTab] = useState<'active' | 'history'>('active');

    // Proof-of-delivery capture, per delivery.
    const [proofFor, setProofFor] = useState<DeliveryRow | null>(null);
    const [proofFile, setProofFile] = useState<File | null>(null);
    const [proofPreview, setProofPreview] = useState<string | null>(null);
    const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
    const [submitting, setSubmitting] = useState(false);
    const fileRef = useRef<HTMLInputElement>(null);

    const [mapFor, setMapFor] = useState<DeliveryRow | null>(null);
    const [receiptFor, setReceiptFor] = useState<string | null>(null);
    const [busyId, setBusyId] = useState<number | null>(null);

    // The rider's own live position. Used as the route origin so the road route
    // is drawn from where they actually are, not from the restaurant.
    const [myPos, setMyPos] = useState<{ lat: number; lng: number } | null>(null);
    const [posError, setPosError] = useState<string | null>(null);
    const watchRef = useRef<number | null>(null);

    // A rider approved by the admin starts offline and must go on shift before
    // the cashier can assign them anything.
    const [availability, setAvailability] = useState<string>('offline');
    const [togglingShift, setTogglingShift] = useState(false);

    const load = useCallback(async () => {
        try {
            const res = await workflowAPI.myDeliveries();
            setActive(res.data.active || []);
            setHistory(res.data.history || []);
            if (res.data.availability) setAvailability(res.data.availability);
            setError(null);
        } catch (err: any) {
            setError(err?.response?.data?.error || 'Could not load your deliveries.');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        load();
        // Same polling cadence the kitchen and cashier screens use.
        const id = setInterval(load, 10000);
        return () => clearInterval(id);
    }, [load]);

    const toggleShift = async () => {
        setTogglingShift(true);
        setError(null);
        try {
            const next = availability === 'available' ? 'offline' : 'available';
            const res = await workflowAPI.setRiderAvailability(next);
            setAvailability(res.data.availability);
        } catch (err: any) {
            setError(err?.response?.data?.error || 'Could not change your status.');
        } finally {
            setTogglingShift(false);
        }
    };

    // Only watch GPS while a map is on screen, so the battery is not drained
    // for the whole shift.
    useEffect(() => {
        if (!mapFor) {
            if (watchRef.current != null) {
                navigator.geolocation?.clearWatch(watchRef.current);
                watchRef.current = null;
            }
            return;
        }
        if (!navigator.geolocation) {
            setPosError('This device cannot share a location.');
            return;
        }
        setPosError(null);
        watchRef.current = navigator.geolocation.watchPosition(
            pos => setMyPos({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
            () => setPosError('Location unavailable — showing the route from the store instead.'),
            { enableHighAccuracy: true, maximumAge: 10000, timeout: 15000 },
        );
        return () => {
            if (watchRef.current != null) {
                navigator.geolocation.clearWatch(watchRef.current);
                watchRef.current = null;
            }
        };
    }, [mapFor]);

    const start = async (d: DeliveryRow) => {
        setBusyId(d.deliveryId);
        try {
            await workflowAPI.startDelivery(d.deliveryId);
            await load();
        } catch (err: any) {
            setError(err?.response?.data?.error || 'Could not start that delivery.');
        } finally {
            setBusyId(null);
        }
    };

    const openProof = (d: DeliveryRow) => {
        setProofFor(d);
        setProofFile(null);
        setProofPreview(null);
        setError(null);
        // Best-effort location stamp for the record; never blocks the hand-off.
        navigator.geolocation?.getCurrentPosition(
            pos => setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
            () => setCoords(null),
            { enableHighAccuracy: true, timeout: 8000 },
        );
    };

    const pickProof = (file: File) => {
        setProofFile(file);
        setProofPreview(URL.createObjectURL(file));
    };

    const submitProof = async () => {
        if (!proofFor || !proofFile) return;
        setSubmitting(true);
        try {
            await workflowAPI.markDelivered(proofFor.deliveryId, proofFile, coords ?? undefined);
            setProofFor(null);
            setProofFile(null);
            setProofPreview(null);
            await load();
        } catch (err: any) {
            setError(err?.response?.data?.error || 'Could not record the delivery.');
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) return <div className="spinner" />;

    const rows = tab === 'active' ? active : history;

    return (
        <div className="h-full bg-gray-50 flex flex-col overflow-hidden">
            <header className="shrink-0 bg-white border-b border-gray-100">
                <div className="max-w-3xl mx-auto px-4 h-14 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2 min-w-0">
                        <span className="w-8 h-8 rounded-full bg-brand flex items-center justify-center shrink-0">
                            <Bike size={17} className="text-slate-900" />
                        </span>
                        <div className="min-w-0">
                            <p className="text-sm font-extrabold text-slate-900 truncate">{user?.name}</p>
                            <p className="text-[11px] text-slate-500">Rider</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                        <button
                            onClick={toggleShift}
                            disabled={togglingShift || availability === 'on-delivery'}
                            className={`flex items-center gap-1.5 text-xs font-bold rounded-full px-3 py-2 transition duration-150 disabled:opacity-60 ${
                                availability === 'available' ? 'bg-green-100 text-green-700'
                                    : availability === 'on-delivery' ? 'bg-blue-100 text-blue-700'
                                    : 'bg-gray-100 text-slate-500'
                            }`}
                        >
                            <CircleDot size={12} />
                            {availability === 'available' ? 'Available'
                                : availability === 'on-delivery' ? 'On delivery'
                                : 'Offline'}
                        </button>
                        <button
                            onClick={() => logout()}
                            aria-label="Sign out"
                            className="text-slate-400 border border-gray-200 rounded-full p-2"
                        >
                            <LogOut size={14} />
                        </button>
                    </div>
                </div>
            </header>

            <main className="flex-1 overflow-y-auto overflow-x-hidden">
                <div className="max-w-3xl mx-auto px-4 py-4 space-y-4">
                    <div className="flex gap-2">
                        {(['active', 'history'] as const).map(t => (
                            <button
                                key={t}
                                onClick={() => setTab(t)}
                                className={`flex-1 py-2.5 rounded-full text-sm font-bold transition duration-150 ${
                                    tab === t ? 'bg-brand text-slate-900 shadow-sm' : 'bg-white text-slate-500 border border-gray-200'
                                }`}
                            >
                                {t === 'active' ? `My Deliveries (${active.length})` : 'History'}
                            </button>
                        ))}
                    </div>

                    {error && (
                        <div className="bg-red-50 border border-red-200 text-red-700 rounded-2xl px-4 py-3 text-sm">{error}</div>
                    )}

                    {availability === 'offline' && active.length === 0 && (
                        <div className="bg-amber-50 border border-amber-200 text-amber-800 rounded-2xl px-4 py-3 text-sm">
                            You're offline, so the cashier can't assign you deliveries. Tap
                            <span className="font-bold"> Offline </span> above to go available.
                        </div>
                    )}

                    {tab === 'history' && <TimeClock />}

                    {rows.length === 0 ? (
                        <div className="text-center py-16">
                            <div className="w-16 h-16 rounded-full bg-white border border-gray-100 flex items-center justify-center mx-auto mb-4">
                                {tab === 'active' ? <Package size={26} className="text-gray-300" /> : <History size={26} className="text-gray-300" />}
                            </div>
                            <p className="font-bold text-slate-900">
                                {tab === 'active' ? 'No deliveries assigned' : 'No past deliveries'}
                            </p>
                            <p className="text-sm text-slate-500 mt-1">
                                {tab === 'active' ? 'The cashier will assign you an order when one is ready.' : 'Completed deliveries appear here.'}
                            </p>
                        </div>
                    ) : rows.map(d => {
                        const o = d.order;
                        if (!o) return null;
                        return (
                            <section key={d.deliveryId} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                                <div className="p-4">
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="min-w-0">
                                            <p className="font-extrabold text-slate-900">{o.orderNumber}</p>
                                            <p className="text-sm text-slate-700 mt-0.5">{o.customerName}</p>
                                        </div>
                                        <span className={`shrink-0 text-[10px] font-extrabold px-2.5 py-1 rounded-full ${
                                            d.status === 'assigned' ? 'bg-amber-100 text-amber-700'
                                                : d.status === 'out-for-delivery' ? 'bg-blue-100 text-blue-700'
                                                : 'bg-green-100 text-green-700'
                                        }`}>
                                            {d.status.replace(/-/g, ' ').toUpperCase()}
                                        </span>
                                    </div>

                                    <div className="flex items-start gap-2 mt-3">
                                        <MapPin size={15} className="text-slate-400 shrink-0 mt-0.5" />
                                        <p className="text-sm text-slate-600 break-words">{o.deliveryAddress || 'No address given'}</p>
                                    </div>

                                    <ul className="mt-3 text-xs text-slate-500 space-y-0.5">
                                        {o.items.map((i, n) => <li key={n}>{i.quantity}× {i.name}</li>)}
                                    </ul>
                                    {o.notes && <p className="text-xs text-amber-700 mt-2">Note: {o.notes}</p>}

                                    <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100">
                                        <span className="text-sm font-extrabold text-slate-900">{money(o.total)}</span>
                                        <span className="text-[11px] text-slate-400">
                                            Assigned {clock(d.assignedAt)}
                                            {d.startedAt && ` · Out ${clock(d.startedAt)}`}
                                            {d.deliveredAt && ` · Delivered ${clock(d.deliveredAt)}`}
                                        </span>
                                    </div>
                                </div>

                                {d.status !== 'delivered' && (
                                    <div className="px-4 pb-4 grid grid-cols-2 gap-2">
                                        {o.customerPhone && (
                                            <a
                                                href={`tel:${o.customerPhone.replace(/\s/g, '')}`}
                                                className="flex items-center justify-center gap-1.5 text-sm font-bold text-slate-700 border border-gray-200 rounded-2xl py-3"
                                            >
                                                <Phone size={15} /> Call
                                            </a>
                                        )}
                                        <button
                                            onClick={() => setMapFor(d)}
                                            disabled={o.deliveryLat == null}
                                            className="flex items-center justify-center gap-1.5 text-sm font-bold text-slate-700 border border-gray-200 rounded-2xl py-3 disabled:opacity-40"
                                        >
                                            <Navigation size={15} /> {o.deliveryLat == null ? 'No pin' : 'View map'}
                                        </button>

                                        <button
                                            onClick={() => setReceiptFor(o.orderNumber)}
                                            className="col-span-2 flex items-center justify-center gap-1.5 text-sm font-bold text-slate-700 border border-gray-200 rounded-2xl py-3"
                                        >
                                            <ReceiptIcon size={15} /> Receipt
                                        </button>

                                        {d.status === 'assigned' ? (
                                            <button
                                                onClick={() => start(d)}
                                                disabled={busyId === d.deliveryId}
                                                className="col-span-2 bg-brand text-slate-900 font-extrabold rounded-2xl py-3.5 disabled:opacity-50 active:scale-[0.99] transition duration-150"
                                            >
                                                {busyId === d.deliveryId ? 'Starting…' : 'Start Delivery'}
                                            </button>
                                        ) : (
                                            <button
                                                onClick={() => openProof(d)}
                                                className="col-span-2 bg-slate-900 text-white font-extrabold rounded-2xl py-3.5 flex items-center justify-center gap-2 active:scale-[0.99] transition duration-150"
                                            >
                                                <Camera size={16} /> Proof of Delivery
                                            </button>
                                        )}
                                    </div>
                                )}

                                {d.status === 'delivered' && (
                                    <div className="px-4 pb-4 flex gap-2">
                                        <button
                                            onClick={() => setReceiptFor(o.orderNumber)}
                                            className="flex-1 flex items-center justify-center gap-1.5 text-sm font-bold text-slate-700 border border-gray-200 rounded-2xl py-2.5"
                                        >
                                            <ReceiptIcon size={15} /> Receipt
                                        </button>
                                        {d.proofPhotoUrl && (
                                            <a
                                                href={`${getApiBaseUrl()}${d.proofPhotoUrl}`}
                                                target="_blank"
                                                rel="noreferrer noopener"
                                                className="flex-1 flex items-center justify-center gap-1.5 text-sm font-bold text-slate-700 border border-gray-200 rounded-2xl py-2.5"
                                            >
                                                <Camera size={15} /> Proof
                                            </a>
                                        )}
                                    </div>
                                )}
                            </section>
                        );
                    })}
                </div>
            </main>

            {/* Map */}
            {mapFor?.order?.deliveryLat != null && (
                <div className="fixed inset-0 z-50 bg-black/50 flex items-end sm:items-center justify-center" onClick={() => setMapFor(null)}>
                    <div className="bg-white w-full sm:max-w-lg rounded-t-3xl sm:rounded-3xl overflow-hidden" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-100">
                            <p className="font-extrabold text-slate-900">{mapFor.order.orderNumber}</p>
                            <button onClick={() => setMapFor(null)} aria-label="Close" className="p-1.5 rounded-full hover:bg-gray-100">
                                <X size={18} />
                            </button>
                        </div>
                        <div className="p-4 space-y-3">
                            {/* Route origin is the rider's live position when we
                                have one, so the road route follows them. */}
                            <DeliveryMap
                                lat={mapFor.order.deliveryLat!}
                                lng={mapFor.order.deliveryLng!}
                                storeLat={myPos?.lat ?? null}
                                storeLng={myPos?.lng ?? null}
                                originLabel="You"
                                liveOrigin
                                label={mapFor.order.deliveryAddress || undefined}
                            />

                            {posError && (
                                <p className="text-[11px] text-amber-700">{posError}</p>
                            )}
                            {!myPos && !posError && (
                                <p className="text-[11px] text-slate-400">Getting your location…</p>
                            )}

                            {/* Hands off to the phone's own maps app for turn-by-turn. */}
                            <a
                                href={myPos
                                    ? `https://www.openstreetmap.org/directions?engine=fossgis_osrm_car&route=${myPos.lat}%2C${myPos.lng}%3B${mapFor.order.deliveryLat}%2C${mapFor.order.deliveryLng}`
                                    : `https://www.openstreetmap.org/?mlat=${mapFor.order.deliveryLat}&mlon=${mapFor.order.deliveryLng}#map=17/${mapFor.order.deliveryLat}/${mapFor.order.deliveryLng}`}
                                target="_blank"
                                rel="noreferrer noopener"
                                className="w-full bg-slate-900 text-white font-extrabold rounded-2xl py-3.5 flex items-center justify-center gap-2 active:scale-[0.99] transition duration-150"
                            >
                                <Navigation size={16} /> Navigate <ExternalLink size={13} />
                            </a>
                        </div>
                    </div>
                </div>
            )}

            {receiptFor && (
                <DeliveryReceipt orderNumber={receiptFor} onClose={() => setReceiptFor(null)} />
            )}

            {/* Proof of delivery */}
            {proofFor && (
                <div className="fixed inset-0 z-50 bg-black/60 flex items-end sm:items-center justify-center" onClick={() => !submitting && setProofFor(null)}>
                    <div className="bg-white w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl overflow-hidden" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-100">
                            <div>
                                <p className="font-extrabold text-slate-900">Proof of delivery</p>
                                <p className="text-[11px] text-slate-500">{proofFor.order?.orderNumber} · {proofFor.order?.customerName}</p>
                            </div>
                            <button onClick={() => setProofFor(null)} disabled={submitting} aria-label="Close" className="p-1.5 rounded-full hover:bg-gray-100">
                                <X size={18} />
                            </button>
                        </div>

                        <div className="p-5 space-y-3">
                            <div className="w-full aspect-[4/3] rounded-2xl bg-gray-100 border border-gray-200 overflow-hidden flex items-center justify-center">
                                {proofPreview
                                    ? <img src={proofPreview} alt="Proof" className="w-full h-full object-cover" />
                                    : <div className="text-center px-6">
                                        <Camera size={28} className="text-gray-300 mx-auto mb-2" />
                                        <p className="text-xs text-slate-500">Photograph the customer receiving the order</p>
                                      </div>}
                            </div>

                            {/* capture="environment" opens the rear camera on a phone. */}
                            <input
                                ref={fileRef}
                                type="file"
                                accept="image/jpeg,image/png,image/webp"
                                capture="environment"
                                className="hidden"
                                onChange={e => { const f = e.target.files?.[0]; if (f) pickProof(f); e.target.value = ''; }}
                            />
                            <button
                                onClick={() => fileRef.current?.click()}
                                className="w-full flex items-center justify-center gap-2 border border-gray-200 rounded-2xl py-3 text-sm font-bold text-slate-700"
                            >
                                <Camera size={16} /> {proofFile ? 'Retake photo' : 'Take photo'}
                            </button>

                            <p className="text-[11px] text-slate-400 flex items-center gap-1.5">
                                <CircleDot size={11} className={coords ? 'text-green-500' : 'text-gray-300'} />
                                {coords ? `Location captured (${coords.lat.toFixed(4)}, ${coords.lng.toFixed(4)})` : 'Location not available — the photo is still enough'}
                            </p>

                            {error && (
                                <div className="bg-red-50 border border-red-200 text-red-700 rounded-2xl px-4 py-3 text-sm">{error}</div>
                            )}

                            {/* Disabled until a photo exists; the server enforces this too. */}
                            <button
                                onClick={submitProof}
                                disabled={!proofFile || submitting}
                                className="w-full bg-brand text-slate-900 font-extrabold rounded-2xl py-4 flex items-center justify-center gap-2 disabled:opacity-40 active:scale-[0.99] transition duration-150"
                            >
                                <Check size={17} /> {submitting ? 'Saving…' : 'Mark as Delivered'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
