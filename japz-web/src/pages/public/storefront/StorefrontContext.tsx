import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useSearchParams } from 'react-router-dom';
import { menuCategoryAPI, menuItemAPI, publicOrderAPI } from '../../../services/api';

export interface SizeOption { name: string; price: number }
export interface Product {
    id: number;
    name: string;
    price: number;
    description: string;
    categoryId: number;
    imageUrl: string | null;
    featured: boolean;
    featuredLabel: string | null;
    /** Add-ons only: categories this extra may be offered with. null = anywhere. */
    addonForCategoryIds: number[] | null;
    hasSize: boolean;
    sizes: SizeOption[];
    status: string;
    trackStock: boolean;
    stock: number | null;
}
export interface Category { id: number; name: string }

/** A promotion staff actually created and enabled. Never invented client-side. */
export interface Promo {
    kind: 'discount' | 'voucher';
    title: string;
    detail: string;
    code: string | null;
}
export interface CartLine {
    key: string;
    id: number;
    name: string;
    unitPrice: number;
    quantity: number;
    modifiers: Record<string, string> | null;
}

/** Extras chosen in the product modal. Each is a real Add-ons menu item. */
export interface ChosenAddon { id: number; name: string; price: number }

interface StorefrontValue {
    categories: Category[];
    products: Product[];
    popular: Product[];
    categoryNameById: Map<number, string>;
    loading: boolean;
    loadError: string | null;
    shopOpen: boolean;
    hours: { openTime?: string; closeTime?: string };
    tableNumber: string;
    cart: CartLine[];
    cartCount: number;
    cartTotal: number;
    addToCart: (p: Product, size?: SizeOption, addons?: ChosenAddon[], qty?: number) => void;
    changeQty: (key: string, delta: number) => void;
    clearCart: () => void;
    soldOut: (p: Product) => boolean;
    lowStock: (p: Product) => boolean;
    priceFrom: (p: Product) => number;
    soldCount: (id: number) => number;
    isBestSeller: (id: number) => boolean;
    addonsFor: (p: Product) => Product[];
    /** Cart key a one-tap add would produce: default size, no extras. */
    quickKey: (p: Product) => string;
    /** How many of the plain version of this item are in the cart. */
    quickQty: (p: Product) => number;
    /** One-tap add using sensible defaults, no modal. */
    quickAdd: (p: Product) => void;
    promos: Promo[];
    /** Items staff chose to feature, in menu order. */
    featuredItems: Product[];
    /** Looks up any item, add-ons included (cart lines need this). */
    productById: (id: number) => Product | undefined;
    toast: string | null;
}

const StorefrontContext = createContext<StorefrontValue | undefined>(undefined);

const CART_KEY = 'japz.cart';
const TABLE_KEY = 'japz.table';

const parseSizes = (raw: any): SizeOption[] => {
    if (!Array.isArray(raw)) return [];
    const out: SizeOption[] = [];
    raw.forEach((s: any) => {
        if (typeof s === 'string') {
            const m = s.match(/(.+?)\s*-\s*₱?([\d.]+)/);
            out.push(m ? { name: m[1].trim(), price: Number(m[2]) } : { name: s, price: 0 });
        } else if (s?.name) {
            out.push({ name: s.name, price: Number(s.price || 0) });
        }
    });
    return out;
};

export function StorefrontProvider({ children }: { children: ReactNode }) {
    const [params] = useSearchParams();

    const [allCategories, setAllCategories] = useState<Category[]>([]);
    const [allProducts, setAllProducts] = useState<Product[]>([]);
    const [popularIds, setPopularIds] = useState<number[]>([]);
    const [soldById, setSoldById] = useState<Map<number, number>>(new Map());
    const [toast, setToast] = useState<string | null>(null);
    const [promos, setPromos] = useState<Promo[]>([]);
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState<string | null>(null);
    const [shopOpen, setShopOpen] = useState(true);
    const [hours, setHours] = useState<{ openTime?: string; closeTime?: string }>({});

    // The table from a QR scan has to survive tab navigation, which drops the
    // query string, so it is mirrored into sessionStorage for this visit only.
    const [tableNumber, setTableNumber] = useState(() => {
        try { return sessionStorage.getItem(TABLE_KEY) || ''; } catch { return ''; }
    });

    useEffect(() => {
        const fromQr = params.get('table')?.trim();
        if (fromQr) {
            setTableNumber(fromQr);
            try { sessionStorage.setItem(TABLE_KEY, fromQr); } catch { /* private mode */ }
        }
    }, [params]);

    // Cart survives tab switches and accidental reloads.
    const [cart, setCart] = useState<CartLine[]>(() => {
        try {
            const raw = localStorage.getItem(CART_KEY);
            return raw ? JSON.parse(raw) : [];
        } catch { return []; }
    });

    useEffect(() => {
        try { localStorage.setItem(CART_KEY, JSON.stringify(cart)); } catch { /* private mode */ }
    }, [cart]);

    useEffect(() => {
        (async () => {
            try {
                const [catRes, itemRes, statusRes, popRes, promoRes] = await Promise.all([
                    menuCategoryAPI.getAll(),
                    menuItemAPI.getAll(),
                    publicOrderAPI.getStatus(),
                    publicOrderAPI.getPopular(),
                    // Promos are optional decoration; a failure must not blank the menu.
                    publicOrderAPI.getPromos().catch(() => ({ data: { promos: [] } })),
                ]);
                setPromos(promoRes.data?.promos || []);

                setAllCategories((catRes.data?.categories || catRes.data || [])
                    .map((c: any) => ({ id: c.id, name: c.name })));

                setAllProducts((itemRes.data?.menuItems || itemRes.data || [])
                    .map((i: any) => ({
                        id: i.id,
                        name: i.name,
                        price: Number(i.price || 0),
                        description: i.description || '',
                        categoryId: i.categoryId ?? i.MenuCategoryId,
                        imageUrl: i.imageUrl || null,
                        featured: !!i.featured,
                        featuredLabel: i.featuredLabel || null,
                        addonForCategoryIds: Array.isArray(i.addonForCategoryIds) ? i.addonForCategoryIds : null,
                        hasSize: !!i.hasSize,
                        sizes: parseSizes(i.sizes),
                        status: i.status || 'available',
                        trackStock: !!i.trackStock,
                        stock: i.stock ?? null,
                    }))
                    .filter((i: Product) => i.status === 'available'));

                const pop = popRes.data?.popular || [];
                setPopularIds(pop.map((p: any) => p.id));
                // Real units sold in the last 30 days, used for honest social proof.
                setSoldById(new Map(pop.map((p: any) => [Number(p.id), Number(p.sold) || 0])));
                setShopOpen(!!statusRes.data?.acceptingOrders);
                setHours({ openTime: statusRes.data?.openTime, closeTime: statusRes.data?.closeTime });
            } catch {
                setLoadError('Could not load the menu. Please check your connection and try again.');
            } finally {
                setLoading(false);
            }
        })();
    }, []);

    // Add-ons are extras chosen inside an item, never products to browse, so
    // they are kept out of the category rail, the grids, search and Popular.
    const addonCategoryId = useMemo(() => {
        const c = allCategories.find(c => c.name.trim().toLowerCase() === 'add-ons');
        return c ? c.id : null;
    }, [allCategories]);

    const categories = useMemo(
        () => allCategories.filter(c => c.id !== addonCategoryId),
        [allCategories, addonCategoryId],
    );

    const products = useMemo(
        () => allProducts.filter(p => p.categoryId !== addonCategoryId),
        [allProducts, addonCategoryId],
    );

    const categoryNameById = useMemo(
        () => new Map(allCategories.map(c => [c.id, c.name])),
        [allCategories],
    );

    // Real sales when there are any; otherwise the head of the menu, so the
    // shelf is never empty on a fresh install.
    const popular = useMemo(() => {
        if (popularIds.length) {
            const byId = new Map(products.map(p => [p.id, p]));
            return popularIds.map(id => byId.get(id)).filter((p): p is Product => !!p).slice(0, 8);
        }
        return products.slice(0, 8);
    }, [popularIds, products]);

    // The restaurant's real "Add-ons" category powers the extras in the product
    // modal. If the category is renamed or removed, extras simply disappear.
    const addonItems = useMemo(
        () => (addonCategoryId === null ? [] : allProducts.filter(p => p.categoryId === addonCategoryId)),
        [allProducts, addonCategoryId],
    );

    // Only offer extras that belong with this item's category, so a drink is
    // never offered bacon. An add-on with no scope set is offered everywhere.
    const addonsFor = useCallback((p: Product) => addonItems.filter(a =>
        a.id !== p.id
        && (a.addonForCategoryIds === null || a.addonForCategoryIds.includes(p.categoryId))
    ), [addonItems]);

    const addToCart = useCallback((p: Product, size?: SizeOption, addons: ChosenAddon[] = [], qty = 1) => {
        // Add-ons are real menu items, so they are sent to the server as their own
        // lines. They are also recorded on the parent line's modifiers purely so
        // the customer can see what they picked; the server re-prices everything.
        const addonNames = addons.map(a => a.name).sort();
        const key = `${p.id}::${size?.name ?? ''}::${addonNames.join(',')}`;
        const unitPrice = size ? size.price : p.price;
        const modifiers: Record<string, string> = {};
        if (size) modifiers.size = size.name;
        if (addonNames.length) modifiers.addons = addonNames.join(', ');

        setCart(prev => {
            let next = [...prev];
            const found = next.find(l => l.key === key);
            if (found) {
                next = next.map(l => l.key === key ? { ...l, quantity: Math.min(20, l.quantity + qty) } : l);
            } else {
                next = [...next, {
                    key, id: p.id, name: p.name, unitPrice,
                    quantity: Math.min(20, qty),
                    modifiers: Object.keys(modifiers).length ? modifiers : null,
                }];
            }
            for (const a of addons) {
                const aKey = `${a.id}::`;
                const existing = next.find(l => l.key === aKey);
                if (existing) {
                    next = next.map(l => l.key === aKey ? { ...l, quantity: Math.min(20, l.quantity + qty) } : l);
                } else {
                    next = [...next, { key: aKey, id: a.id, name: a.name, unitPrice: a.price, quantity: qty, modifiers: null }];
                }
            }
            return next;
        });

        setToast(`${p.name} added`);
    }, []);

    // Auto-dismiss the confirmation toast.
    useEffect(() => {
        if (!toast) return;
        const t = setTimeout(() => setToast(null), 1800);
        return () => clearTimeout(t);
    }, [toast]);

    // The default variant used by a one-tap add: cheapest size, no extras. This
    // must produce exactly the key addToCart would, so the two stay in sync.
    const quickKey = useCallback((p: Product) => {
        const sizeName = p.hasSize && p.sizes.length
            ? p.sizes.reduce((a, b) => (b.price < a.price ? b : a)).name
            : '';
        return `${p.id}::${sizeName}::`;
    }, []);

    const quickAdd = useCallback((p: Product) => {
        const size = p.hasSize && p.sizes.length
            ? p.sizes.reduce((a, b) => (b.price < a.price ? b : a))
            : undefined;
        addToCart(p, size, [], 1);
    }, [addToCart]);

    const changeQty = useCallback((key: string, delta: number) => {
        setCart(prev => prev
            .map(l => l.key === key ? { ...l, quantity: Math.max(0, Math.min(20, l.quantity + delta)) } : l)
            .filter(l => l.quantity > 0));
    }, []);

    const clearCart = useCallback(() => setCart([]), []);

    const value: StorefrontValue = {
        categories,
        products,
        popular,
        categoryNameById,
        loading,
        loadError,
        shopOpen,
        hours,
        tableNumber,
        cart,
        cartCount: cart.reduce((n, l) => n + l.quantity, 0),
        cartTotal: cart.reduce((n, l) => n + l.unitPrice * l.quantity, 0),
        addToCart,
        changeQty,
        clearCart,
        soldOut: (p) => p.trackStock && p.stock !== null && p.stock <= 0,
        lowStock: (p) => p.trackStock && p.stock !== null && p.stock > 0 && p.stock <= 5,
        soldCount: (id) => soldById.get(id) ?? 0,
        // Only the top three by real sales, and only once sales actually exist.
        isBestSeller: (id) => popularIds.slice(0, 3).includes(id),
        addonsFor,
        quickKey,
        quickQty: (p) => cart.find(l => l.key === quickKey(p))?.quantity ?? 0,
        quickAdd,
        promos,
        featuredItems: products.filter(p => p.featured),
        productById: (id) => allProducts.find(p => p.id === id),
        toast,
        priceFrom: (p) => (p.hasSize && p.sizes.length ? Math.min(...p.sizes.map(s => s.price)) : p.price),
    };

    return <StorefrontContext.Provider value={value}>{children}</StorefrontContext.Provider>;
}

export function useStorefront() {
    const ctx = useContext(StorefrontContext);
    if (!ctx) throw new Error('useStorefront must be used inside StorefrontProvider');
    return ctx;
}

export const peso = (n: number | string) => `₱${Number(n).toFixed(2)}`;
