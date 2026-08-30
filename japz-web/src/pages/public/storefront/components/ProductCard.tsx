import { Plus, Minus, Flame } from 'lucide-react';
import { itemImage } from '../../../../utils/menuImages';
import { peso, type Product } from '../StorefrontContext';
import Thumb from './Thumb';

interface Props {
    product: Product;
    categoryNameById: Map<number, string>;
    price: number;
    soldOut: boolean;
    lowStock: boolean;
    sold: number;
    bestSeller: boolean;
    disabled: boolean;
    /** How many of the plain version are already in the cart. */
    qty: number;
    onOpen: () => void;
    onAdd: () => void;
    onDecrement: () => void;
    variant?: 'grid' | 'rail';
}

export default function ProductCard({
    product, categoryNameById, price, soldOut, lowStock, sold,
    bestSeller, disabled, qty, onOpen, onAdd, onDecrement, variant = 'grid',
}: Props) {
    const width = variant === 'rail' ? 'w-[180px] shrink-0' : 'w-full';

    return (
        <div className={`${width} bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md overflow-hidden flex flex-col transition duration-200`}>
            <button
                onClick={onOpen}
                disabled={disabled}
                className="block w-full text-left disabled:opacity-60 group"
                aria-label={`View ${product.name}`}
            >
                <div className="relative w-full aspect-[4/3] bg-gray-100 overflow-hidden">
                    <div className="w-full h-full transition-transform duration-300 group-hover:scale-105">
                        <Thumb src={itemImage(product, categoryNameById)} seed={product.id} name={product.name} />
                    </div>

                    <div className="absolute top-2 left-2 flex flex-col items-start gap-1">
                        {bestSeller && (
                            <span className="flex items-center gap-1 bg-brand text-slate-900 text-[10px] font-extrabold px-2 py-1 rounded-full shadow-sm">
                                <Flame size={11} /> BEST SELLER
                            </span>
                        )}
                        {lowStock && !soldOut && (
                            <span className="bg-red-500 text-white text-[10px] font-bold px-2 py-1 rounded-full shadow-sm">
                                Only {product.stock} left
                            </span>
                        )}
                    </div>

                    {soldOut && (
                        <span className="absolute inset-0 bg-white/75 flex items-center justify-center text-xs font-bold text-slate-700">
                            Sold out
                        </span>
                    )}
                </div>
            </button>

            <div className="p-3 flex flex-col flex-1">
                <button onClick={onOpen} disabled={disabled} className="block w-full text-left disabled:opacity-60">
                    <p className="text-sm font-bold text-slate-900 truncate">{product.name}</p>
                    {product.description && (
                        <p className="text-[11px] text-slate-500 line-clamp-2 mt-0.5 min-h-[28px]">{product.description}</p>
                    )}
                    {sold > 0 && <p className="text-[11px] text-slate-400 mt-1">{sold} sold this month</p>}
                </button>

                <div className="flex items-center justify-between gap-2 mt-2 pt-1">
                    <span className="text-base font-extrabold text-slate-900">{peso(price)}</span>

                    {/* One tap adds with defaults; the button then becomes a stepper.
                        Customising (size, add-ons) is still one tap away on the card. */}
                    {qty === 0 ? (
                        <button
                            onClick={onAdd}
                            disabled={disabled}
                            aria-label={`Add ${product.name}`}
                            className="shrink-0 flex items-center gap-1 bg-brand text-slate-900 text-xs font-extrabold rounded-full pl-2.5 pr-3 py-2 shadow-sm disabled:opacity-40 active:scale-95 transition duration-150"
                        >
                            <Plus size={14} strokeWidth={3} /> Add
                        </button>
                    ) : (
                        <div className="shrink-0 flex items-center gap-1 bg-brand rounded-full p-0.5 animate-[slideUp_150ms_ease-out]">
                            <button
                                onClick={onDecrement}
                                aria-label={`Remove one ${product.name}`}
                                className="w-7 h-7 rounded-full bg-white/70 text-slate-900 flex items-center justify-center active:scale-90 transition duration-150"
                            >
                                <Minus size={13} strokeWidth={3} />
                            </button>
                            <span className="w-5 text-center text-sm font-extrabold text-slate-900">{qty}</span>
                            <button
                                onClick={onAdd}
                                aria-label={`Add another ${product.name}`}
                                className="w-7 h-7 rounded-full bg-white/70 text-slate-900 flex items-center justify-center active:scale-90 transition duration-150"
                            >
                                <Plus size={13} strokeWidth={3} />
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
