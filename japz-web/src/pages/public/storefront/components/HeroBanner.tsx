import { Flame, ShoppingCart } from 'lucide-react';
import { itemImage } from '../../../../utils/menuImages';
import { peso, type Product } from '../StorefrontContext';
import Thumb from './Thumb';

interface Props {
    product: Product;
    price: number;
    sold: number;
    /** Staff-set badge wording. Null means fall back to sales-derived wording. */
    featuredLabel?: string | null;
    disabled: boolean;
    onOrder: () => void;
}

/**
 * Promotional hero featuring a real menu item at its real price.
 *
 * The photo is a full-bleed background with a yellow gradient laid over it,
 * rather than a side-by-side column. Two reasons: an unconstrained image column
 * lets a tall photo drive the banner to ~570px of mostly empty yellow, and a
 * hard column edge leaves a visible seam. A fixed height plus object-cover
 * fixes both, whatever the photo's aspect ratio.
 */
export default function HeroBanner({ product, price, sold, featuredLabel, disabled, onOrder }: Props) {
    const photo = itemImage(product, new Map());
    const badge = featuredLabel
        ? featuredLabel.toUpperCase()
        : sold > 0 ? 'BEST SELLER' : "CHEF'S PICK";

    return (
        <div className="relative w-full h-[196px] sm:h-[248px] lg:h-[280px] bg-brand rounded-[20px] overflow-hidden shadow-sm">
            {photo && (
                <>
                    {/* object-right keeps the food in frame as the card narrows. */}
                    <div className="absolute inset-0">
                        <Thumb src={photo} seed={product.id} name={product.name} className="object-right" eager />
                    </div>

                    {/* Explicit linear-gradient rather than utility stops, so the
                        blend is identical regardless of Tailwind version. */}
                    <div
                        className="absolute inset-0 sm:hidden"
                        style={{ background: 'linear-gradient(90deg, #FFCE1B 0%, #FFCE1B 50%, rgba(255,206,27,0.82) 66%, rgba(255,206,27,0) 92%)' }}
                    />
                    <div
                        className="absolute inset-0 hidden sm:block"
                        style={{ background: 'linear-gradient(90deg, #FFCE1B 0%, #FFCE1B 38%, rgba(255,206,27,0.85) 54%, rgba(255,206,27,0) 80%)' }}
                    />
                </>
            )}

            <div className="relative h-full flex flex-col justify-center px-5 sm:px-7 max-w-[64%] sm:max-w-[56%]">
                <span className="self-start flex items-center gap-1 bg-slate-900 text-brand text-[10px] font-extrabold px-2.5 py-1 rounded-full mb-2">
                    <Flame size={11} />
                    <span className="truncate max-w-[130px]">{badge}</span>
                </span>

                <h2 className="text-lg sm:text-2xl lg:text-3xl font-extrabold text-slate-900 leading-tight line-clamp-2">
                    {product.name}
                </h2>

                {product.description && (
                    <p className="hidden sm:block text-sm text-slate-900/70 mt-1.5 line-clamp-2">
                        {product.description}
                    </p>
                )}

                <div className="flex items-center gap-2.5 sm:gap-3 mt-3 sm:mt-4">
                    <button
                        onClick={onOrder}
                        disabled={disabled}
                        className="shrink-0 flex items-center gap-1.5 bg-slate-900 text-white text-xs sm:text-sm font-extrabold rounded-full px-4 sm:px-6 py-2.5 sm:py-3 shadow-lg shadow-slate-900/20 disabled:opacity-50 active:scale-95 transition duration-150"
                    >
                        <ShoppingCart size={15} /> Order Now
                    </button>
                    {/* nowrap: the price was clipping to "₱79.0" on narrow phones. */}
                    <span className="text-lg sm:text-2xl font-extrabold text-slate-900 whitespace-nowrap">
                        {peso(price)}
                    </span>
                </div>

                {sold > 0 && (
                    <p className="hidden sm:block text-[11px] font-semibold text-slate-900/60 mt-2.5">
                        {sold} ordered in the last 30 days
                    </p>
                )}
            </div>
        </div>
    );
}
