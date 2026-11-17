import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { SearchX } from 'lucide-react';
import { useStorefront, type ChosenAddon, type Product, type SizeOption } from './StorefrontContext';
import { useStorefrontBase } from './storefrontRouting';
import HeroBanner from './components/HeroBanner';
import SearchBar, { type SortKey } from './components/SearchBar';
import CategoryChips from './components/CategoryChips';
import ProductCard from './components/ProductCard';
import ProductSection from './components/ProductSection';
import ProductModal from './components/ProductModal';
import PromoCard from './components/PromoCard';
import EmptyState from './components/EmptyState';

export default function Home() {
    const navigate = useNavigate();
    const base = useStorefrontBase();
    const {
        categories, products, popular, categoryNameById, addonsFor, promos, featuredItems,
        loadError, shopOpen, addToCart, soldOut, lowStock, priceFrom,
        soldCount, isBestSeller, quickAdd, quickQty, quickKey, changeQty,
    } = useStorefront();

    const [search, setSearch] = useState('');
    const [sort, setSort] = useState<SortKey>('popular');
    const [sortOpen, setSortOpen] = useState(false);
    const [detail, setDetail] = useState<Product | null>(null);

    const searching = search.trim().length > 0;

    const sortList = (list: Product[]) => {
        const copy = [...list];
        switch (sort) {
            case 'price-asc': return copy.sort((a, b) => priceFrom(a) - priceFrom(b));
            case 'price-desc': return copy.sort((a, b) => priceFrom(b) - priceFrom(a));
            case 'name': return copy.sort((a, b) => a.name.localeCompare(b.name));
            default: return copy.sort((a, b) => soldCount(b.id) - soldCount(a.id));
        }
    };

    const results = useMemo(() => {
        const q = search.trim().toLowerCase();
        return sortList(products.filter(p =>
            p.name.toLowerCase().includes(q) || p.description.toLowerCase().includes(q)));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [products, search, sort]);

    // Staff's featured pick wins; otherwise fall back to the top seller.
    const hero = featuredItems[0] || popular[0];
    const bestSellers = popular.slice(0, 6);
    const recommended = useMemo(
        () => products.filter(p => !bestSellers.some(b => b.id === p.id)).slice(0, 8),
        [products, bestSellers],
    );

    const confirmAdd = (size: SizeOption | undefined, addons: ChosenAddon[], qty: number) => {
        if (detail) addToCart(detail, size, addons, qty);
        setDetail(null);
    };

    // Tapping the card opens details for customising; "+ Add" never does.
    const cardProps = (p: Product) => ({
        product: p,
        categoryNameById,
        price: priceFrom(p),
        soldOut: soldOut(p),
        lowStock: lowStock(p),
        sold: soldCount(p.id),
        bestSeller: isBestSeller(p.id),
        disabled: soldOut(p) || !shopOpen,
        qty: quickQty(p),
        onOpen: () => setDetail(p),
        onAdd: () => quickAdd(p),
        onDecrement: () => changeQty(quickKey(p), -1),
    });

    return (
        <div className="max-w-5xl mx-auto px-4 py-4 space-y-6" onClick={() => sortOpen && setSortOpen(false)}>
            {loadError && (
                <div className="bg-red-50 border border-red-200 text-red-700 rounded-2xl px-4 py-3 text-sm">
                    {loadError}
                </div>
            )}

            <div onClick={e => e.stopPropagation()}>
                <SearchBar
                    value={search}
                    onChange={setSearch}
                    sort={sort}
                    onSortChange={(s) => { setSort(s); setSortOpen(false); }}
                    sortOpen={sortOpen}
                    onToggleSort={() => setSortOpen(v => !v)}
                />
            </div>

            {searching ? (
                results.length === 0 ? (
                    <EmptyState
                        icon={SearchX}
                        title="No food found"
                        body="Try another burger, drink or meal."
                        actionLabel="View full menu"
                        onAction={() => { setSearch(''); navigate(`${base}/menu`); }}
                    />
                ) : (
                    <ProductSection
                        title={`Results for “${search.trim()}”`}
                        subtitle={`${results.length} item${results.length > 1 ? 's' : ''}`}
                    >
                        <div className="storefront-product-grid">
                            {results.map(p => <ProductCard key={p.id} {...cardProps(p)} />)}
                        </div>
                    </ProductSection>
                )
            ) : (
                <>
                    {hero && (
                        <HeroBanner
                            product={hero}
                            price={priceFrom(hero)}
                            sold={soldCount(hero.id)}
                            featuredLabel={hero.featured ? (hero.featuredLabel || "CHEF'S PICK") : null}
                            disabled={soldOut(hero) || !shopOpen}
                            onOrder={() => setDetail(hero)}
                        />
                    )}

                    <CategoryChips
                        categories={categories}
                        activeId={null}
                        onSelect={id => navigate(`${base}/menu${id ? `?cat=${id}` : ''}`)}
                    />

                    {/* Only rendered when staff have created a live promotion. */}
                    {promos.length > 0 && <PromoCard promos={promos} />}

                    {bestSellers.length > 0 && (
                        <ProductSection
                            title="🔥 Popular this week"
                            subtitle="Most ordered by our customers"
                            onViewAll={() => navigate(`${base}/menu`)}
                        >
                            <div className="-mx-4 px-4 overflow-x-auto scrollbar-none">
                                <div className="flex gap-3 w-max pb-1">
                                    {bestSellers.map(p => (
                                        <ProductCard key={p.id} {...cardProps(p)} variant="rail" />
                                    ))}
                                </div>
                            </div>
                        </ProductSection>
                    )}

                    {recommended.length > 0 && (
                        <ProductSection
                            title="✨ Recommended for you"
                            subtitle="More from our kitchen"
                            onViewAll={() => navigate(`${base}/menu`)}
                        >
                            <div className="storefront-product-grid">
                                {recommended.map(p => <ProductCard key={p.id} {...cardProps(p)} />)}
                            </div>
                        </ProductSection>
                    )}

                    <div className="text-center pt-1 pb-2">
                        <p className="text-sm text-slate-500 mb-3">Ready to order?</p>
                        <button
                            onClick={() => navigate(`${base}/menu`)}
                            className="bg-white text-slate-900 font-bold rounded-full px-7 py-3.5 border border-gray-200 shadow-sm active:scale-95 transition duration-150"
                        >
                            Browse full menu
                        </button>
                    </div>
                </>
            )}

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
