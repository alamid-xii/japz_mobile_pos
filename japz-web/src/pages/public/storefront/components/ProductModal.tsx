import { useEffect, useMemo, useState } from 'react';
import { Minus, Plus, ArrowLeft, Check } from 'lucide-react';
import { itemImage } from '../../../../utils/menuImages';
import { peso, type ChosenAddon, type Product, type SizeOption } from '../StorefrontContext';
import Thumb from './Thumb';

interface Props {
    product: Product;
    addonItems: Product[];
    categoryNameById: Map<number, string>;
    lowStock: boolean;
    onAdd: (size: SizeOption | undefined, addons: ChosenAddon[], qty: number) => void;
    onClose: () => void;
}

export default function ProductModal({
    product, addonItems, categoryNameById, lowStock, onAdd, onClose,
}: Props) {
    const hasSizes = product.hasSize && product.sizes.length > 0;
    const [size, setSize] = useState<SizeOption | undefined>(hasSizes ? product.sizes[0] : undefined);
    const [qty, setQty] = useState(1);
    const [picked, setPicked] = useState<Set<number>>(new Set());

    useEffect(() => {
        const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [onClose]);

    // Already scoped to this product's category by the caller.
    const extras = addonItems;

    const chosen: ChosenAddon[] = useMemo(
        () => extras.filter(a => picked.has(a.id)).map(a => ({ id: a.id, name: a.name, price: a.price })),
        [extras, picked],
    );

    const base = size ? size.price : product.price;
    const total = (base + chosen.reduce((n, a) => n + a.price, 0)) * qty;
    const maxQty = product.trackStock && product.stock !== null ? Math.min(20, product.stock) : 20;

    const toggle = (id: number) => setPicked(prev => {
        const next = new Set(prev);
        if (next.has(id)) next.delete(id); else next.add(id);
        return next;
    });

    return (
        <div
            className="fixed inset-0 z-50 bg-black/40 flex items-end sm:items-center justify-center animate-[fadeIn_150ms_ease-out]"
            onClick={onClose}
            role="dialog"
            aria-modal="true"
            aria-label={product.name}
        >
            <div
                className="bg-white w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl overflow-hidden flex flex-col max-h-[92vh] sm:max-h-[88vh]"
                onClick={e => e.stopPropagation()}
            >
                {/* Full-bleed image with a back control, as in the reference. */}
                <div className="relative h-48 sm:h-56 bg-gray-100 shrink-0">
                    <Thumb src={itemImage(product, categoryNameById)} seed={product.id} name={product.name} />
                    <button
                        onClick={onClose}
                        aria-label="Back"
                        className="absolute top-3 left-3 w-9 h-9 rounded-full bg-white/90 text-gray-900 flex items-center justify-center shadow active:scale-90 transition duration-150"
                    >
                        <ArrowLeft size={18} />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto overscroll-contain scrollbar-none px-5 pt-4 pb-2">
                    <h2 className="text-xl font-extrabold text-gray-900 leading-tight">{product.name}</h2>
                    {product.description && (
                        <p className="text-sm text-gray-500 mt-1.5 leading-relaxed">{product.description}</p>
                    )}
                    {lowStock && (
                        <p className="text-xs font-bold text-red-500 mt-2">Only {product.stock} left</p>
                    )}

                    {hasSizes && (
                        <div className="mt-5">
                            <p className="text-xs font-extrabold text-gray-900 uppercase tracking-wide mb-2">Size</p>
                            <div className="grid grid-cols-2 gap-2">
                                {product.sizes.map(s => {
                                    const active = size?.name === s.name;
                                    return (
                                        <button
                                            key={s.name}
                                            onClick={() => setSize(s)}
                                            className={`flex justify-between items-center rounded-2xl px-4 py-3 text-sm border transition duration-150 ${
                                                active
                                                    ? 'bg-brand border-brand text-gray-900 font-bold'
                                                    : 'bg-white border-gray-200 text-gray-600'
                                            }`}
                                        >
                                            <span>{s.name}</span>
                                            <span className="font-bold">{peso(s.price)}</span>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {extras.length > 0 && (
                        <div className="mt-5">
                            {/* Labelled as paid: these extras all cost money on the JAPZ menu. */}
                            <p className="text-xs font-extrabold text-gray-900 uppercase tracking-wide mb-2">
                                Add-ons <span className="font-medium normal-case tracking-normal text-gray-400">(optional, extra charge)</span>
                            </p>
                            <div className="grid grid-cols-3 gap-2">
                                {extras.map(a => {
                                    const on = picked.has(a.id);
                                    return (
                                        <button
                                            key={a.id}
                                            onClick={() => toggle(a.id)}
                                            aria-pressed={on}
                                            className={`relative rounded-2xl border p-2 text-center transition duration-150 ${
                                                on ? 'border-brand bg-brand/10' : 'border-gray-200 bg-white'
                                            }`}
                                        >
                                            <div className="w-full aspect-square rounded-xl overflow-hidden bg-gray-100 mb-1.5">
                                                <Thumb src={itemImage(a, categoryNameById)} seed={a.id} name={a.name} />
                                            </div>
                                            <p className="text-[11px] font-semibold text-gray-900 truncate">{a.name}</p>
                                            <p className="text-[11px] font-bold text-gray-500">+{peso(a.price)}</p>
                                            {on && (
                                                <span className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-brand flex items-center justify-center shadow">
                                                    <Check size={12} strokeWidth={3} className="text-gray-900" />
                                                </span>
                                            )}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    <div className="mt-5 flex items-center justify-between">
                        <p className="text-xs font-extrabold text-gray-900 uppercase tracking-wide">Quantity</p>
                        <div className="flex items-center gap-3">
                            <button
                                onClick={() => setQty(q => Math.max(1, q - 1))}
                                disabled={qty <= 1}
                                aria-label="Decrease quantity"
                                className="w-9 h-9 rounded-full border border-gray-200 text-gray-600 flex items-center justify-center disabled:opacity-40 active:scale-90 transition duration-150"
                            >
                                <Minus size={16} />
                            </button>
                            <span className="w-6 text-center font-extrabold text-gray-900">{qty}</span>
                            <button
                                onClick={() => setQty(q => Math.min(maxQty, q + 1))}
                                disabled={qty >= maxQty}
                                aria-label="Increase quantity"
                                className="w-9 h-9 rounded-full bg-brand text-gray-900 flex items-center justify-center disabled:opacity-40 active:scale-90 transition duration-150"
                            >
                                <Plus size={16} />
                            </button>
                        </div>
                    </div>
                </div>

                {/* Total + primary action, mirroring the reference's footer. */}
                <div className="shrink-0 px-5 py-4 pb-[calc(1rem+env(safe-area-inset-bottom))] border-t border-gray-100 bg-white flex items-center gap-4">
                    <div className="min-w-0">
                        <p className="text-[11px] text-gray-500 font-medium">Total</p>
                        <p className="text-lg font-extrabold text-gray-900 leading-tight">{peso(total)}</p>
                    </div>
                    <button
                        onClick={() => onAdd(size, chosen, qty)}
                        className="flex-1 bg-brand text-gray-900 font-extrabold rounded-full py-3.5 shadow-sm active:scale-[0.98] transition duration-150"
                    >
                        Add to Cart
                    </button>
                </div>
            </div>
        </div>
    );
}
