import { Check, MapPin, LocateFixed, Plus, Trash2, Star, X } from 'lucide-react';
import type { SavedAddress } from '../../../../services/api';

interface Props {
    saved: SavedAddress[];
    selectedId: number | null;
    usingNew: boolean;
    onPick: (id: number) => void;
    onUseNew: () => void;
    onDelete: (id: number) => void;

    // "New address" form
    address: string;
    onAddressChange: (v: string) => void;
    pin: { lat: number; lng: number } | null;
    locating: boolean;
    locateError: string | null;
    onLocate: () => void;
    saveIt: boolean;
    onToggleSave: (v: boolean) => void;
    label: string;
    onLabelChange: (v: string) => void;

    // Reverse-geocoding the pin into the address box
    geocoding?: boolean;
    suggestion?: string | null;
    onUseSuggestion?: () => void;
    onDismissSuggestion?: () => void;
    onAddressTyped?: () => void;
}

const field =
    'w-full rounded-2xl bg-gray-50 text-gray-900 placeholder-gray-400 border border-gray-200 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent transition duration-150';

/**
 * Lets a returning customer reuse a saved address instead of retyping it and
 * re-pinning. Saved entries carry their own coordinates, so picking one is a
 * single tap with no geolocation prompt.
 */
export default function AddressPicker({
    saved, selectedId, usingNew, onPick, onUseNew, onDelete,
    address, onAddressChange, pin, locating, locateError, onLocate,
    saveIt, onToggleSave, label, onLabelChange,
    geocoding, suggestion, onUseSuggestion, onDismissSuggestion, onAddressTyped,
}: Props) {
    return (
        <div className="space-y-2">
            {saved.length > 0 && (
                <>
                    <p className="text-xs font-extrabold text-gray-900 uppercase tracking-wide">
                        Deliver to
                    </p>

                    {saved.map(a => {
                        const active = !usingNew && selectedId === a.id;
                        return (
                            <div
                                key={a.id}
                                className={`w-full flex items-start gap-3 rounded-2xl border px-4 py-3 transition duration-150 ${
                                    active ? 'border-brand bg-brand/10' : 'border-gray-200 bg-white'
                                }`}
                            >
                                <button
                                    onClick={() => onPick(a.id)}
                                    aria-pressed={active}
                                    className="flex items-start gap-3 flex-1 min-w-0 text-left"
                                >
                                    <span className={`mt-0.5 w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${
                                        active ? 'bg-brand' : 'border-2 border-gray-300'
                                    }`}>
                                        {active && <Check size={12} strokeWidth={3} className="text-gray-900" />}
                                    </span>
                                    <span className="min-w-0">
                                        <span className="flex items-center gap-1.5">
                                            <span className="text-sm font-bold text-gray-900">
                                                {a.label || 'Saved address'}
                                            </span>
                                            {a.isDefault && (
                                                <Star size={11} className="text-brand fill-brand shrink-0" />
                                            )}
                                            {a.lat != null && (
                                                <MapPin size={11} className="text-gray-400 shrink-0" />
                                            )}
                                        </span>
                                        <span className="block text-xs text-gray-500 break-words mt-0.5">
                                            {a.address}
                                        </span>
                                    </span>
                                </button>

                                <button
                                    onClick={() => onDelete(a.id)}
                                    aria-label={`Remove ${a.label || 'address'}`}
                                    className="shrink-0 p-1.5 text-gray-300 hover:text-red-500 transition duration-150"
                                >
                                    <Trash2 size={15} />
                                </button>
                            </div>
                        );
                    })}

                    {!usingNew && (
                        <button
                            onClick={onUseNew}
                            className="w-full flex items-center justify-center gap-2 rounded-2xl border border-dashed border-gray-300 py-3 text-sm font-bold text-gray-500 active:scale-[0.99] transition duration-150"
                        >
                            <Plus size={16} /> Use a new address
                        </button>
                    )}
                </>
            )}

            {(usingNew || saved.length === 0) && (
                <div className="space-y-2 pt-1">
                    {saved.length > 0 && (
                        <p className="text-xs font-extrabold text-gray-900 uppercase tracking-wide">New address</p>
                    )}

                    <textarea
                        value={address}
                        onChange={e => { onAddressChange(e.target.value); onAddressTyped?.(); }}
                        rows={3}
                        className={field}
                        placeholder="House/street, barangay, landmark"
                    />

                    {geocoding && (
                        <p className="text-[11px] text-slate-400 flex items-center gap-1.5">
                            <LocateFixed size={12} className="animate-pulse" />
                            Looking up your address…
                        </p>
                    )}

                    {/* Shown only when the customer already typed something, so
                        their own wording is never overwritten silently. */}
                    {suggestion && (
                        <div className="rounded-2xl border border-brand bg-brand/10 px-3 py-2.5 flex items-start gap-2">
                            <MapPin size={14} className="text-slate-900 shrink-0 mt-0.5" />
                            <div className="min-w-0 flex-1">
                                <p className="text-[11px] font-bold text-slate-900">Use your pinned address?</p>
                                <p className="text-[11px] text-slate-600 break-words mt-0.5">{suggestion}</p>
                                <button
                                    type="button"
                                    onClick={onUseSuggestion}
                                    className="mt-1.5 text-[11px] font-extrabold text-slate-900 underline underline-offset-4"
                                >
                                    Replace what I typed
                                </button>
                            </div>
                            <button
                                type="button"
                                onClick={onDismissSuggestion}
                                aria-label="Dismiss suggestion"
                                className="shrink-0 p-1 text-slate-400"
                            >
                                <X size={13} />
                            </button>
                        </div>
                    )}

                    <button
                        type="button"
                        onClick={onLocate}
                        disabled={locating}
                        className={`w-full flex items-center justify-center gap-2 rounded-2xl py-3 text-sm font-bold border transition duration-150 ${
                            pin ? 'bg-brand/15 border-brand text-gray-900' : 'bg-white border-gray-200 text-gray-600'
                        }`}
                    >
                        {pin ? <Check size={16} /> : locating ? <LocateFixed size={16} className="animate-pulse" /> : <MapPin size={16} />}
                        {pin ? 'Location pinned' : locating ? 'Getting location…' : 'Pin my location on the map'}
                    </button>
                    {locateError && <p className="text-[11px] text-amber-700">{locateError}</p>}
                    {pin && !geocoding && (
                        <p className="text-[11px] text-slate-400">
                            Please add your house number and a landmark so our rider can find you.
                        </p>
                    )}

                    <label className="flex items-center gap-2.5 pt-1 cursor-pointer">
                        <span
                            onClick={() => onToggleSave(!saveIt)}
                            className={`w-5 h-5 rounded-md flex items-center justify-center shrink-0 ${
                                saveIt ? 'bg-brand' : 'border-2 border-gray-300'
                            }`}
                        >
                            {saveIt && <Check size={12} strokeWidth={3} className="text-gray-900" />}
                        </span>
                        <input
                            type="checkbox"
                            checked={saveIt}
                            onChange={e => onToggleSave(e.target.checked)}
                            className="sr-only"
                        />
                        <span className="text-sm text-gray-700">Save this address for next time</span>
                    </label>

                    {saveIt && (
                        <input
                            value={label}
                            onChange={e => onLabelChange(e.target.value)}
                            className={field}
                            placeholder="Name it, e.g. Home or Office (optional)"
                            maxLength={64}
                        />
                    )}
                </div>
            )}
        </div>
    );
}
