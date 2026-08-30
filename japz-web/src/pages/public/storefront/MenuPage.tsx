import { useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { SearchX } from 'lucide-react';
import { useStorefront, type ChosenAddon, type Product, type SizeOption } from './StorefrontContext';
import { useStorefrontBase } from './StorefrontLayout';
import SearchBar, { type SortKey } from './components/SearchBar';
import CategoryChips from './components/CategoryChips';
import ProductCard from './components/ProductCard';
import ProductModal from './components/ProductModal';
import EmptyState from './components/EmptyState';

export default function MenuPage() {
    const [params, setParams] = useSearchParams();
    const navigate = useNavigate();
    const base = useStorefrontBase();
    const {
        categories, products, categoryNameById, addonsFor,
        shopOpen, addToCart, soldOut, lowStock, priceFrom, soldCount, isBestSeller,
        quickAdd, quickQty, quickKey, changeQty,
    } = useStorefront();

    const catParam = params.get('cat');
    const activeCategory = catParam ? Number(catParam) : null;

    const [search, setSearch] = useState('');
    const [detail, setDetail] = useState<Product | null>(null);
    const [sort, setSort] = useState<SortKey>('popular');
    const [sortOpen, setSortOpen] = useState(false);

    const searching = search.trim().length > 0;

    const shown = useMemo(() => {
        let list: Product[];
        if (searching) {
            const q = search.trim().toLowerCase();
            list = products.filter(p =>
                p.name.toLowerCase().includes(q) || p.description.toLowerCase().includes(q));
        } else if (activeCategory == null) {
            list = products;
        } else {
            list = products.filter(p => p.categoryId === activeCategory);
        }
        const copy = [...list];
        switch (sort) {
            case 'price-asc': return copy.sort((a, b) => priceFrom(a) - priceFrom(b));
            case 'price-desc': return copy.sort((a, b) => priceFrom(b) - priceFrom(a));
            case 'name': return copy.sort((a, b) => a.name.localeCompare(b.name));
            default: return copy.sort((a, b) => soldCount(b.id) - soldCount(a.id));
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [searching, search, products, activeCategory, sort]);

    const selectCategory = (id: number | null) => {
        // Keeping the filter in the URL means back works and a category is linkable.
        if (id == null) params.delete('cat');
        else params.set('cat', String(id));
        setParams(params, { replace: true });
    };

    const confirmAdd = (size: SizeOption | undefined, addons: ChosenAddon[], qty: number) => {
        if (detail) addToCart(detail, size, addons, qty);
        setDetail(null);
    };

    const heading = searching
        ? `Results for “${search.trim()}”`
        : activeCategory == null ? 'All items' : categoryNameById.get(activeCategory) ?? 'Menu';

    return (
        <div onClick={() => sortOpen && setSortOpen(false)}>
            {/* Sticky filter bar. `top-0` anchors to <main>, the scroll container. */}
            <div className="sticky top-0 z-20 bg-gray-50/95 backdrop-blur border-b border-gray-100">
                <div className="max-w-5xl mx-auto px-4 pt-3 pb-3 space-y-3">
                    <div onClick={e => e.stopPropagation()}>
                        <SearchBar
                            value={search}
                            onChange={setSearch}
                            sort={sort}
                            onSortChange={(v) => { setSort(v); setSortOpen(false); }}
                            sortOpen={sortOpen}
                            onToggleSort={() => setSortOpen(v => !v)}
                        />
                    </div>
                    {!searching && (
                        <CategoryChips
                            categories={categories}
                            activeId={activeCategory}
                            onSelect={selectCategory}
                        />
                    )}
                </div>
            </div>

            <div className="max-w-5xl mx-auto px-4 pt-4">
                {shown.length === 0 ? (
                    <EmptyState
                        icon={SearchX}
                        title="No food found"
                        body="Try searching for another burger, drink or meal."
                        actionLabel="Show everything"
                        onAction={() => { setSearch(''); selectCategory(null); }}
                    />
                ) : (
                    <>
                        <div className="flex items-baseline justify-between mb-3">
                            <h2 className="font-extrabold text-slate-900 text-[17px]">{heading}</h2>
                            <span className="text-xs text-gray-400">{shown.length} item{shown.length > 1 ? 's' : ''}</span>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                            {shown.map(p => (
                                <ProductCard
                                    key={p.id}
                                    product={p}
                                    categoryNameById={categoryNameById}
                                    price={priceFrom(p)}
                                    soldOut={soldOut(p)}
                                    lowStock={lowStock(p)}
                                    sold={soldCount(p.id)}
                                    bestSeller={isBestSeller(p.id)}
                                    disabled={soldOut(p) || !shopOpen}
                                    qty={quickQty(p)}
                                    onOpen={() => setDetail(p)}
                                    onAdd={() => quickAdd(p)}
                                    onDecrement={() => changeQty(quickKey(p), -1)}
                                />
                            ))}
                        </div>
                        <div className="text-center py-8">
                            <button
                                onClick={() => navigate(`${base}/cart`)}
                                className="text-sm text-gray-400 underline underline-offset-4"
                            >
                                Go to cart
                            </button>
                        </div>
                    </>
                )}
            </div>

            {detail && (
                <ProductModal
                    product={detail}
                    addonItems={addonsFor(detail)}
                    categoryNameById={categoryNameById}
                    lowStock={lowStock(detail)}
                    onAdd={confirmAdd}
                    onClose={() => setDetail(null)}
                />
            )}
        </div>
    );
}
