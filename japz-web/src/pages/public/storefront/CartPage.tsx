import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Minus, Plus, ShoppingBag, ArrowLeft, Wallet } from 'lucide-react';
import { itemImage } from '../../../utils/menuImages';
import { publicOrderAPI, customerAuthAPI, type SavedAddress } from '../../../services/api';
import { useStorefront, peso } from './StorefrontContext';
import { useCustomerAuth } from './CustomerAuthContext';
import Thumb from './components/Thumb';
import EmptyState from './components/EmptyState';
import AddressPicker from './components/AddressPicker';
import { useStorefrontBase } from './StorefrontLayout';

type OrderType = 'dine-in' | 'take-out' | 'delivery';

export default function CartPage() {
    const navigate = useNavigate();
    const base = useStorefrontBase();
    const {
        cart, cartCount, cartTotal, changeQty, clearCart, productById,
        categoryNameById, shopOpen, tableNumber: qrTable,
    } = useStorefront();
    const { customer, ready: authReady } = useCustomerAuth();

    const [step, setStep] = useState<'cart' | 'details'>('cart');
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [orderType, setOrderType] = useState<OrderType>(qrTable ? 'dine-in' : 'take-out');
    const [tableNumber, setTableNumber] = useState(qrTable);
    const [deliveryAddress, setDeliveryAddress] = useState('');
    const [notes, setNotes] = useState('');
    const [pin, setPin] = useState<{ lat: number; lng: number } | null>(null);
    const [locating, setLocating] = useState(false);
    const [locateError, setLocateError] = useState<string | null>(null);

    // Reverse-geocoding state. `autoFilled` remembers what we last wrote into
    // the box so a second pin can safely replace it, while anything the
    // customer typed themselves is never overwritten without asking.
    const [geocoding, setGeocoding] = useState(false);
    const [autoFilled, setAutoFilled] = useState<string | null>(null);
    const [suggestion, setSuggestion] = useState<string | null>(null);

    const applySuggestion = (text: string) => {
        setDeliveryAddress(text);
        setAutoFilled(text);
        setSuggestion(null);
    };

    const lookUpAddress = async (lat: number, lng: number) => {
        setGeocoding(true);
        setSuggestion(null);
        try {
            const res = await publicOrderAPI.reverseGeocode(lat, lng);
            const found: string | undefined = res.data?.address;
            if (!found) return;

            const current = deliveryAddress.trim();
            if (!current || current === (autoFilled || '').trim()) {
                applySuggestion(found);
            } else {
                // They have typed their own address; offer rather than clobber.
                setSuggestion(found);
            }
        } catch {
            // Non-fatal: the pin still works, the address is just typed by hand.
        } finally {
            setGeocoding(false);
        }
    };

    // Saved addresses, so a returning customer picks instead of retyping.
    const [saved, setSaved] = useState<SavedAddress[]>([]);
    const [selectedAddressId, setSelectedAddressId] = useState<number | null>(null);
    const [usingNewAddress, setUsingNewAddress] = useState(false);
    const [saveAddress, setSaveAddress] = useState(true);
    const [addressLabel, setAddressLabel] = useState('');

    useEffect(() => {
        if (!customer) { setSaved([]); return; }
        customerAuthAPI.addresses()
            .then(res => {
                const list: SavedAddress[] = res.data.addresses || [];
                setSaved(list);
                // Default to the top entry, which is the default or most recent.
                if (list.length > 0) {
                    setSelectedAddressId(list[0].id);
                    setUsingNewAddress(false);
                } else {
                    setUsingNewAddress(true);
                }
            })
            .catch(() => setUsingNewAddress(true));
    }, [customer]);

    const removeAddress = async (id: number) => {
        try {
            await customerAuthAPI.deleteAddress(id);
            const rest = saved.filter(a => a.id !== id);
            setSaved(rest);
            if (selectedAddressId === id) {
                setSelectedAddressId(rest.length ? rest[0].id : null);
                if (rest.length === 0) setUsingNewAddress(true);
            }
        } catch {
            setError('Could not remove that address.');
        }
    };

    // The customer's own device is the only honest source of their coordinates.
    // It is optional: an address alone still places a valid order.
    const useMyLocation = () => {
        setLocateError(null);
        if (!navigator.geolocation) {
            setLocateError('Your browser cannot share a location.');
            return;
        }
        setLocating(true);
        navigator.geolocation.getCurrentPosition(
            pos => {
                const { latitude, longitude } = pos.coords;
                setPin({ lat: latitude, lng: longitude });
                setLocating(false);
                // Fill the address box from the pin so nothing has to be typed.
                lookUpAddress(latitude, longitude);
            },
            err => {
                setLocateError(
                    err.code === err.PERMISSION_DENIED
                        ? 'Location permission denied. Your address will still be used.'
                        : 'Could not get your location. Your address will still be used.'
                );
                setLocating(false);
            },
            { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 },
        );
    };

    const submit = async () => {
        setError(null);
        if (!customer) {
            navigate(`${base}/auth`, { state: { from: `${base}/cart` } });
            return;
        }
        if (orderType === 'dine-in' && !tableNumber.trim()) return setError('Please enter your table number.');
        if (orderType === 'delivery') {
            const pickingSaved = !usingNewAddress && selectedAddressId != null;
            if (!pickingSaved && !deliveryAddress.trim()) {
                return setError('Please enter your delivery address.');
            }
        }

        setSubmitting(true);
        try {
            const res = await publicOrderAPI.place({
                items: cart.map(l => ({ id: l.id, quantity: l.quantity, modifiers: l.modifiers })),
                orderType,
                customerName: customer?.name || '',
                customerPhone: customer?.phone || '',
                tableNumber: orderType === 'dine-in' ? tableNumber.trim() : undefined,
                // A picked saved address supersedes the typed one; the server
                // re-reads it and verifies it belongs to this account.
                deliveryAddressId: orderType === 'delivery' && !usingNewAddress && selectedAddressId != null
                    ? selectedAddressId : undefined,
                deliveryAddress: orderType === 'delivery' && (usingNewAddress || selectedAddressId == null)
                    ? deliveryAddress.trim() : undefined,
                deliveryLat: orderType === 'delivery' && usingNewAddress && pin ? pin.lat : undefined,
                deliveryLng: orderType === 'delivery' && usingNewAddress && pin ? pin.lng : undefined,
                saveAddress: orderType === 'delivery' && usingNewAddress ? saveAddress : undefined,
                addressLabel: orderType === 'delivery' && usingNewAddress && saveAddress
                    ? addressLabel.trim() || undefined : undefined,
                notes: notes.trim() || undefined,
            });
            clearCart();
            navigate(`${base}/track/${res.data.order.orderNumber}`, { replace: true });
        } catch (err: any) {
            // The server owns pricing, stock and availability, so its message wins.
            setError(err?.response?.data?.error || 'Could not place your order. Please try again.');
        } finally {
            setSubmitting(false);
        }
    };

    if (cart.length === 0) {
        return (
            <EmptyState
                icon={ShoppingBag}
                title="Your cart is empty"
                body="Looks like you haven't added anything yet."
                actionLabel="BROWSE MENU"
                onAction={() => navigate(`${base}/menu`)}
            />
        );
    }

    const field = 'w-full rounded-2xl bg-gray-50 text-gray-900 placeholder-gray-400 border border-gray-200 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent transition duration-150';

    return (
        <div className="max-w-2xl mx-auto px-4 py-4 space-y-4">
            <div className="flex items-center gap-2">
                {step === 'details' && (
                    <button onClick={() => setStep('cart')} aria-label="Back to cart" className="p-1.5 -ml-1.5 rounded-full hover:bg-gray-100">
                        <ArrowLeft size={18} className="text-gray-700" />
                    </button>
                )}
                <h1 className="text-xl font-extrabold text-gray-900">
                    {step === 'cart' ? `My Cart (${cartCount})` : 'Order Summary'}
                </h1>
            </div>

            {/* Line items */}
            <section className="bg-white rounded-2xl border border-gray-100 shadow-sm divide-y divide-gray-100">
                {cart.map(l => {
                    const p = productById(l.id);
                    return (
                        <div key={l.key} className="flex items-center gap-3 p-3">
                            <div className="w-16 h-16 rounded-xl overflow-hidden shrink-0 bg-gray-100">
                                <Thumb src={p ? itemImage(p, categoryNameById) : null} seed={l.id} name={l.name} />
                            </div>
                            <div className="min-w-0 flex-1">
                                <p className="text-sm font-bold text-gray-900 truncate">{l.name}</p>
                                {l.modifiers?.size && <p className="text-[11px] text-gray-400">{l.modifiers.size}</p>}
                                {l.modifiers?.addons && <p className="text-[11px] text-gray-400">+ {l.modifiers.addons}</p>}
                                <p className="text-sm font-extrabold text-gray-900 mt-0.5">{peso(l.unitPrice * l.quantity)}</p>
                            </div>
                            {step === 'cart' ? (
                                <div className="flex items-center gap-2 shrink-0">
                                    <button onClick={() => changeQty(l.key, -1)} aria-label="Decrease" className="w-7 h-7 rounded-full border border-gray-200 text-gray-600 flex items-center justify-center active:scale-90 transition duration-150">
                                        <Minus size={14} />
                                    </button>
                                    <span className="w-5 text-center text-sm font-bold text-gray-900">{l.quantity}</span>
                                    <button onClick={() => changeQty(l.key, 1)} aria-label="Increase" className="w-7 h-7 rounded-full bg-brand text-gray-900 flex items-center justify-center active:scale-90 transition duration-150">
                                        <Plus size={14} />
                                    </button>
                                </div>
                            ) : (
                                <span className="text-sm text-gray-400 shrink-0">×{l.quantity}</span>
                            )}
                        </div>
                    );
                })}
            </section>

            {/* Totals. JAPZ charges no tax or delivery fee, so the only lines shown
                are the ones the server actually bills. */}
            <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
                <div className="flex justify-between text-sm text-gray-500">
                    <span>Subtotal</span><span className="text-gray-900 font-medium">{peso(cartTotal)}</span>
                </div>
                <div className="flex justify-between pt-3 mt-3 border-t border-gray-100">
                    <span className="font-extrabold text-gray-900">Total</span>
                    <span className="font-extrabold text-gray-900 text-lg">{peso(cartTotal)}</span>
                </div>
            </section>

            {step === 'details' && (
                <>
                    <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 space-y-3">
                        <p className="text-xs font-extrabold text-gray-900 uppercase tracking-wide">How would you like it?</p>
                        <div className="grid grid-cols-3 gap-2">
                            {(['dine-in', 'take-out', 'delivery'] as OrderType[]).map(t => (
                                <button
                                    key={t}
                                    onClick={() => setOrderType(t)}
                                    className={`py-3 rounded-2xl text-sm font-bold border transition duration-150 ${
                                        orderType === t ? 'bg-brand border-brand text-gray-900' : 'bg-white border-gray-200 text-gray-500'
                                    }`}
                                >
                                    {t === 'dine-in' ? 'Dine in' : t === 'take-out' ? 'Pickup' : 'Delivery'}
                                </button>
                            ))}
                        </div>

                        {orderType === 'dine-in' && (
                            <input value={tableNumber} onChange={e => setTableNumber(e.target.value)} inputMode="numeric" className={field} placeholder="Table number" />
                        )}
                        {orderType === 'delivery' && (
                            <AddressPicker
                                saved={saved}
                                selectedId={selectedAddressId}
                                usingNew={usingNewAddress}
                                onPick={(id) => { setSelectedAddressId(id); setUsingNewAddress(false); }}
                                onUseNew={() => setUsingNewAddress(true)}
                                onDelete={removeAddress}
                                address={deliveryAddress}
                                onAddressChange={setDeliveryAddress}
                                pin={pin}
                                locating={locating}
                                locateError={locateError}
                                onLocate={useMyLocation}
                                geocoding={geocoding}
                                suggestion={suggestion}
                                onUseSuggestion={() => suggestion && applySuggestion(suggestion)}
                                onDismissSuggestion={() => setSuggestion(null)}
                                onAddressTyped={() => setAutoFilled(null)}
                                saveIt={saveAddress}
                                onToggleSave={setSaveAddress}
                                label={addressLabel}
                                onLabelChange={setAddressLabel}
                            />
                        )}

                        <div className="rounded-2xl bg-gray-50 border border-gray-200 px-4 py-3">
                            <p className="text-[11px] font-bold text-gray-500">Ordering as</p>
                            <p className="text-sm font-bold text-gray-900">{customer?.name}</p>
                            <p className="text-xs text-gray-500">{customer?.phone || 'No contact number on your profile'}</p>
                        </div>
                        <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} className={field} placeholder="Notes (optional)" />
                    </section>

                    <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
                        <p className="text-xs font-extrabold text-gray-900 uppercase tracking-wide mb-3">Payment method</p>
                        {/* Only one method is real today: settle with staff. No card
                            processing exists in this system. */}
                        <div className="flex items-center gap-3 rounded-2xl border-2 border-brand bg-brand/10 px-4 py-3">
                            <span className="w-10 h-10 rounded-xl bg-brand flex items-center justify-center shrink-0">
                                <Wallet size={18} className="text-gray-900" />
                            </span>
                            <div className="min-w-0 flex-1">
                                <p className="text-sm font-bold text-gray-900">Pay at the counter</p>
                                <p className="text-[11px] text-gray-500">Settle when you collect or receive your order</p>
                            </div>
                            <span className="w-5 h-5 rounded-full border-[6px] border-brand shrink-0" />
                        </div>
                    </section>
                </>
            )}

            {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 rounded-2xl px-4 py-3 text-sm">{error}</div>
            )}

            <button
                onClick={() => {
                    if (step === 'cart') {
                        // An account is required to order, so send the customer to
                        // sign in before they fill anything else in.
                        if (!customer) {
                            navigate(`${base}/auth`, { state: { from: `${base}/cart` } });
                            return;
                        }
                        setStep('details');
                    } else {
                        submit();
                    }
                }}
                disabled={!shopOpen || submitting || !authReady}
                className="w-full bg-brand text-gray-900 font-extrabold rounded-full py-4 shadow-sm disabled:opacity-50 active:scale-[0.99] transition duration-150"
            >
                {!shopOpen ? 'Closed right now'
                    : submitting ? 'Placing order…'
                    : step === 'cart' ? (customer ? 'Check out' : 'Sign in to check out')
                    : 'Place Order'}
            </button>
        </div>
    );
}
