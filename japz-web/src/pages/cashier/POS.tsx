import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Minus, ShoppingCart, Speaker, Mic } from 'lucide-react';
import { menuCategoryAPI, menuItemAPI, salesAPI } from '../../services/api';

interface Category { id: number; name: string; }
interface Product {
    id: number; name: string; price: number; categoryId: number;
    hasSize?: boolean; sizes?: Array<{ name: string; price: number }>;
    hasFlavor?: boolean; flavors?: string[];
    hasTemperature?: boolean; temperatures?: string[];
    status?: 'available' | 'unavailable';
    trackStock?: boolean; stock?: number | null; reorderLevel?: number; variants?: { size: string | null; flavor: string | null; temperature: string | null; available: number }[]; availabilityReason?: string;
}
interface CartItem extends Product {
    quantity: number; selectedSize?: string; selectedFlavor?: string; selectedTemperature?: string; itemPrice: number;
}

const getCategoryIcon = (name: string): string => {
    const n = name.toLowerCase();
    const m: Record<string, string> = {
        main: '🍽️', beverage: '🍹', drink: '🧃', coffee: '☕', cooler: '🍧', appetizer: '🥟',
        snack: '🍘', fries: '🍟', dessert: '🍰', salad: '🥗', soup: '🍲', pizza: '🍕',
        burger: '🍔', pasta: '🍝', rice: '🍚', chicken: '🍗', fish: '🍣', seafood: '🦞',
    };
    for (const [k, v] of Object.entries(m)) if (n.includes(k)) return v;
    return '🍽️';
};

export default function POS() {
    const navigate = useNavigate();
    const [categories, setCategories] = useState<Category[]>([]);
    const [products, setProducts] = useState<Product[]>([]);
    const [selectedCategory, setSelectedCategory] = useState<number | null>(null);
    const [cart, setCart] = useState<CartItem[]>([]);
    const [showCart, setShowCart] = useState(false);
    const [loading, setLoading] = useState(true);
    const [stockError, setStockError] = useState('');
    const [showOptionsModal, setShowOptionsModal] = useState(false);
    const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
    const [selectedSize, setSelectedSize] = useState('');
    const [selectedFlavor, setSelectedFlavor] = useState('');
    const [selectedTemperature, setSelectedTemperature] = useState('');
    const [speakerEnabled, setSpeakerEnabled] = useState(true);
    const [listening, setListening] = useState(false);
    const recognitionRef = useRef<any>(null);

    useEffect(() => { const saved = localStorage.getItem('cashierCart'); if (saved) try { setCart(JSON.parse(saved)); } catch { /* ignore */ } }, []);
    useEffect(() => { localStorage.setItem('cashierCart', JSON.stringify(cart)); }, [cart]);

    const fetchData = useCallback(async (initial = false) => {
        try {
            if (initial) setLoading(true);
            const [catRes, itemRes] = await Promise.all([menuCategoryAPI.getAll(), menuItemAPI.getAll()]);
            const cats = catRes.data?.data || catRes.data || [];
            const itms = (itemRes.data?.data || itemRes.data || []).map((item: any) => {
                const parsedSizes: Array<{ name: string; price: number }> = [];
                if (item.sizes && Array.isArray(item.sizes)) {
                    item.sizes.forEach((s: any) => {
                        if (typeof s === 'string') {
                            const m = s.match(/(.+?)\s*-\s*₱([\d.]+)/);
                            parsedSizes.push(m ? { name: m[1].trim(), price: Number(m[2]) } : { name: s, price: 0 });
                        } else if (s?.name && s?.price) parsedSizes.push({ name: s.name, price: Number(s.price) });
                    });
                }
                return { id: item.id, name: item.name, price: Number(item.price || 0), categoryId: item.categoryId || item.MenuCategoryId, hasSize: item.hasSize || false, sizes: parsedSizes, hasFlavor: item.hasFlavor || false, flavors: item.flavors || [], hasTemperature: item.hasTemperature || false, temperatures: item.temperatures || [], status: item.status || 'available', trackStock: item.trackStock || false, stock: item.stock ?? null, variants: item.variants || [], reorderLevel: item.reorderLevel ?? 10, availabilityReason: item.availabilityReason || '' };
            });
            setProducts(itms);

            // Attempt to fetch sales analytics and sort categories by most-selling
            try {
                const analyticsRes = await salesAPI.getAnalytics('month');
                const salesData = analyticsRes.data || {};
                const topItems: any[] = salesData.topItems || [];

                // Map product name (lowercase) to categoryId from fetched items
                const nameToCategory = new Map<string, number>();
                itms.forEach((it: Product) => {
                    if (it.name) nameToCategory.set(String(it.name).toLowerCase().trim(), it.categoryId);
                });

                // Accumulate quantities per category
                const categorySales: Record<number, number> = {};
                topItems.forEach(t => {
                    const itemName = String(t.name || '').toLowerCase().trim();
                    const qty = Number(t.quantity || 0);
                    const catId = nameToCategory.get(itemName);
                    if (catId != null) {
                        categorySales[catId] = (categorySales[catId] || 0) + qty;
                    }
                });

                // Sort categories by sales (descending). Categories with no sales go last, preserving original relative order.
                const catsWithSales = [...cats].sort((a: any, b: any) => {
                    const aSales = categorySales[a.id] || 0;
                    const bSales = categorySales[b.id] || 0;
                    return bSales - aSales;
                });

                setCategories(catsWithSales);
                if (catsWithSales.length > 0 && !selectedCategory) setSelectedCategory(catsWithSales[0].id);
            } catch (err) {
                // If analytics call fails, fall back to original categories order
                setCategories(cats);
                if (cats.length > 0 && !selectedCategory) setSelectedCategory(cats[0].id);
            }
            setStockError('');
        } catch { setStockError('Could not refresh menu stock. Retry before checking out.'); }
        finally { setLoading(false); }
    }, [selectedCategory]);

    useEffect(() => { void fetchData(true); }, []);
    useEffect(() => { const refresh = () => { if (document.visibilityState === 'visible') void fetchData(); }; const timer = setInterval(refresh, 15000); window.addEventListener('focus', refresh); return () => { clearInterval(timer); window.removeEventListener('focus', refresh); }; }, [fetchData]);

    const speakText = (text: string) => {
        try {
            const utter = new SpeechSynthesisUtterance(text);
            speechSynthesis.cancel();
            speechSynthesis.speak(utter);
        } catch (e) { console.error('TTS error', e); }
    };

    const startListening = () => {
        const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
        if (!SpeechRecognition) return alert('Speech recognition not supported in this browser');
        try {
            const rec = new SpeechRecognition();
            rec.lang = 'en-US';
            rec.interimResults = false;
            rec.maxAlternatives = 1;
            rec.onstart = () => setListening(true);
            rec.onend = () => setListening(false);
            rec.onerror = (e: any) => { console.error('Recognition error', e); setListening(false); };
            rec.onresult = (ev: any) => {
                const text = ev.results[0][0].transcript;
                // speak back as confirmation
                speakText(text);
            };
            rec.start();
            recognitionRef.current = rec;
        } catch (e) { console.error(e); }
    };

    const stopListening = () => {
        try { recognitionRef.current?.stop(); } catch (e) { }
        setListening(false);
    };

    const filtered = selectedCategory ? products.filter(p => p.categoryId === selectedCategory) : products;
    const catIcon = getCategoryIcon(categories.find(c => c.id === selectedCategory)?.name || '');

    const getCartQuantity = (productId: number) => cart.filter(i => i.id === productId).reduce((sum, i) => sum + i.quantity, 0);
    const isOutOfStock = (product: Product) => product.trackStock && product.stock != null && product.stock <= 0;
    const hasInsufficientStock = (product: Product, addQty: number = 1) => {
        if (!product.trackStock || product.stock == null) return false;
        const inCart = getCartQuantity(product.id);
        return (inCart + addQty) > product.stock;
    };

    const addToCart = (product: Product) => {
        if (product.status === 'unavailable') return;
        if (isOutOfStock(product)) return;
        if (hasInsufficientStock(product)) return;
        if (product.hasSize || product.hasFlavor || product.hasTemperature) { setSelectedProduct(product); setSelectedSize(''); setSelectedFlavor(''); setSelectedTemperature(''); setShowOptionsModal(true); return; }
        setCart(prev => {
            const currentQty = prev.filter(i => i.id === product.id).reduce((sum, i) => sum + i.quantity, 0);
            if (product.trackStock && product.stock != null && (currentQty + 1) > product.stock) return prev;
            const idx = prev.findIndex(i => i.id === product.id && !i.selectedSize && !i.selectedFlavor && !i.selectedTemperature);
            if (idx !== -1) { const u = [...prev]; u[idx].quantity += 1; return u; }
            return [...prev, { ...product, quantity: 1, itemPrice: product.price }];
        });
    };
    const addWithOptions = () => {
        if (!selectedProduct) return;
        const variant = selectedProduct.variants?.find(variant => (variant.size || '') === selectedSize && (variant.flavor || '') === selectedFlavor && (variant.temperature || '') === selectedTemperature);
        if (!variant || variant.available <= 0) { setStockError('This option is unavailable. Choose another option or ask Inventory to replenish it.'); return; }
        const currentQty = cart.filter(item => item.id === selectedProduct.id && (item.selectedSize || '') === selectedSize && (item.selectedFlavor || '') === selectedFlavor && (item.selectedTemperature || '') === selectedTemperature).reduce((sum, item) => sum + item.quantity, 0);
        if (currentQty + 1 > variant.available) { setStockError('This option has reached its available stock limit.'); return; }
        const price = selectedSize && selectedProduct.sizes ? (selectedProduct.sizes.find(s => s.name === selectedSize)?.price || selectedProduct.price) : selectedProduct.price;
        setCart(prev => {
            const currentQty = prev.filter(i => i.id === selectedProduct.id).reduce((sum, i) => sum + i.quantity, 0);
            if (selectedProduct.trackStock && selectedProduct.stock != null && (currentQty + 1) > selectedProduct.stock) return prev;
            const idx = prev.findIndex(i => i.id === selectedProduct.id && i.selectedSize === selectedSize && i.selectedFlavor === selectedFlavor && i.selectedTemperature === selectedTemperature);
            if (idx !== -1) { const u = [...prev]; u[idx].quantity += 1; return u; }
            return [...prev, { ...selectedProduct, quantity: 1, selectedSize: selectedSize || undefined, selectedFlavor: selectedFlavor || undefined, selectedTemperature: selectedTemperature || undefined, itemPrice: price }];
        });
        setShowOptionsModal(false);
    };
    const updateQty = (idx: number, qty: number) => {
        if (qty <= 0) { setCart(prev => prev.filter((_, i) => i !== idx)); return; }
        const item = cart[idx];
        const product = products.find(p => p.id === item.id);
        if (product?.trackStock && product.stock != null) {
            const otherQty = cart.filter((c, i) => c.id === item.id && i !== idx).reduce((s, c) => s + c.quantity, 0);
            if ((otherQty + qty) > product.stock) return;
        }
        setCart(prev => { const u = [...prev]; u[idx].quantity = qty; return u; });
    };
    const total = cart.reduce((s, i) => s + (i.itemPrice || i.price) * i.quantity, 0);

    if (loading) return <div className="spinner" />;

    return (
        <div className="flex flex-col h-full">
            {stockError && <div role="alert" className="p-3 bg-red-50 text-red-800 border-b border-red-200 text-sm">{stockError}<button className="ml-3 underline min-h-11" onClick={() => void fetchData()}>Refresh stock</button></div>}
            {/* Mobile Header - hidden on desktop */}
            <div className="md:hidden flex items-center justify-between px-2 py-1 pt-[max(12px,env(safe-area-inset-top))] bg-brand shrink-0">
                <div className="flex items-center gap-2">
                    <img src="/logo.jpg" alt="JAPZ" className="w-9 h-9 rounded-lg object-cover" />
                    <span className="text-lg font-bold text-brand-dark">JAPZ POS</span>
                </div>
                <button className="relative bg-transparent border-none cursor-pointer p-1" onClick={() => setShowCart(!showCart)}>
                    <ShoppingCart size={24} className="text-brand-dark" />
                    {cart.length > 0 && <span className="absolute -top-1.5 -right-1.5 bg-red-600 text-white text-[10px] font-bold w-[18px] h-[18px] rounded-full flex items-center justify-center">{cart.length}</span>}
                </button>
            </div>

            {/* Desktop Header */}
            <div className="hidden md:flex items-center justify-between px-6 py-3 bg-white border-b border-gray-200 shrink-0">
                <h1 className="text-2xl font-bold text-yellow-900">Point of Sale</h1>
                <div className="flex items-center gap-3">
                    <button onClick={() => setSpeakerEnabled(prev => !prev)} title={speakerEnabled ? 'Speaker on' : 'Speaker off'}
                        className={`flex items-center justify-center w-8 h-8 rounded-lg transition cursor-pointer border border-gray-200 ${speakerEnabled ? 'bg-yellow-100 text-yellow-700' : 'hover:bg-gray-100 text-gray-600'}`}>
                        <Speaker size={18} />
                    </button>
                    <button onClick={() => listening ? stopListening() : startListening()} title={listening ? 'Stop listening' : 'Broadcast via mic'}
                        className={`flex items-center justify-center w-8 h-8 rounded-lg transition cursor-pointer border border-gray-200 ${listening ? 'bg-red-100 text-red-600' : 'hover:bg-gray-100 text-gray-600'}`}>
                        <Mic size={18} />
                    </button>
                </div>
            </div>

            {/* MOBILE: full-screen cart toggle */}
            <div className="md:hidden flex-1 flex flex-col overflow-hidden">
                {showCart ? (
                    <div className="flex-1 overflow-y-auto p-4">
                        <button className="inline-flex items-center px-4 py-2 border border-gray-200 rounded-lg bg-transparent cursor-pointer font-medium text-sm mb-3" onClick={() => setShowCart(false)}>
                            ← Back to Menu
                        </button>
                        {cart.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-full text-gray-500 gap-2 py-8"><p>Your cart is empty</p></div>
                        ) : (
                            <>
                                {cart.map((item, idx) => (
                                    <div key={`${item.id}-${item.selectedSize}-${item.selectedFlavor}-${item.selectedTemperature}-${idx}`} className="flex items-center gap-2.5 bg-white border border-gray-200 rounded-lg p-3 mb-2">
                                        <div className="flex-1">
                                            <div className="text-sm font-semibold">{item.name}</div>
                                            {item.selectedSize && <div className="text-[11px] text-gray-500">Size: {item.selectedSize}</div>}
                                            {item.selectedFlavor && <div className="text-[11px] text-gray-500">Flavor: {item.selectedFlavor}</div>}
                                            {item.selectedTemperature && <div className="text-[11px] text-gray-500">Temperature: {item.selectedTemperature}</div>}
                                            <div className="text-[13px] text-brand-dark font-medium">₱{(item.itemPrice || item.price).toFixed(2)}</div>
                                        </div>
                                        <div className="flex items-center gap-1.5">
                                            <button className="w-7 h-7 flex items-center justify-center rounded-md border border-gray-200 bg-white cursor-pointer" onClick={() => updateQty(idx, item.quantity - 1)}><Minus size={14} /></button>
                                            <span className="font-semibold min-w-[20px] text-center">{item.quantity}</span>
                                            <button className="w-7 h-7 flex items-center justify-center rounded-md border border-gray-200 bg-white cursor-pointer" onClick={() => updateQty(idx, item.quantity + 1)}><Plus size={14} /></button>
                                        </div>
                                        <span className="font-bold text-sm whitespace-nowrap">₱{((item.itemPrice || item.price) * item.quantity).toFixed(2)}</span>
                                        <button className="bg-transparent border-none text-red-500 cursor-pointer text-base p-1" onClick={() => updateQty(idx, 0)}>✕</button>
                                    </div>
                                ))}
                                <div className="flex justify-between items-center py-4 border-t-2 border-brand mt-2 font-bold text-lg">
                                    <span>Total:</span><span>₱{total.toFixed(2)}</span>
                                </div>
                                <button className="w-full py-3.5 bg-brand text-brand-dark border-none rounded-lg text-base font-semibold cursor-pointer mt-3 hover:shadow-md hover:shadow-yellow-300/40 transition font-[inherit]"
                                    onClick={() => {
                                        if (speakerEnabled) speakText(`Proceeding to checkout. Total ${total.toFixed(2)} pesos`);
                                        navigate('/cashier/payment', { state: { total: total.toFixed(2), items: cart, itemCount: cart.length } });
                                    }}>
                                    Proceed to Checkout
                                </button>
                            </>
                        )}
                    </div>
                ) : (
                    <>
                        {/* Categories bar */}
                        <div className="flex overflow-x-auto gap-2 px-3 py-2.5 border-b border-gray-200 shrink-0 scrollbar-hide">
                            {categories.map(cat => (
                                <button key={cat.id} onClick={() => setSelectedCategory(cat.id)}
                                    className={`whitespace-nowrap px-4 py-2 rounded-full text-[13px] font-medium border-[1.5px] shrink-0 cursor-pointer transition-all ${selectedCategory === cat.id
                                        ? 'bg-brand border-brand text-brand-dark'
                                        : 'bg-white border-gray-200 hover:border-brand/50'
                                        }`}>
                                    {cat.name}
                                </button>
                            ))}
                        </div>

                        {/* Products grid - Mobile */}
                        {filtered.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-full text-gray-500 gap-2 py-8"><p>No items in this category</p></div>
                        ) : (
                            <div className="grid grid-cols-2 gap-2.5 p-3 flex-1 overflow-y-auto content-start">
                                {filtered.map(item => (
                                    <div key={item.id} className={`bg-white border border-gray-200 rounded-lg overflow-hidden flex flex-col transition hover:shadow-md ${item.status === 'unavailable' ? 'opacity-50' : ''}`}>
                                        <div className="h-14 flex items-center justify-center text-[28px] bg-yellow-50">{catIcon}</div>
                                        <div className="p-1.5 flex-1">
                                            <div className="text-[12px] font-semibold mb-0.5 line-clamp-2">{item.name}</div>
                                            <div className="text-[13px] font-bold text-brand-dark">₱{item.price.toFixed(2)}</div>
                                            {item.status === 'unavailable' && <div className="text-[10px] text-red-500 font-semibold mt-0.5">UNAVAILABLE</div>}
                                            {item.status !== 'unavailable' && isOutOfStock(item) && <div className="text-[10px] text-red-500 font-semibold mt-0.5">OUT OF STOCK</div>}
                                        </div>
                                        <div className="px-1.5 pb-1.5">
                                            {item.trackStock && item.stock != null && (item.stock ?? 0) > 0 && (
                                                <div className={`text-[10px] font-medium mb-1 text-center ${(item.stock ?? 0) <= (item.reorderLevel ?? 10) ? 'text-amber-500' : 'text-gray-500'}`}>
                                                    {`${(item.stock ?? 0) - getCartQuantity(item.id)} left`}
                                                </div>
                                            )}
                                            <button onClick={() => addToCart(item)} disabled={item.status === 'unavailable' || isOutOfStock(item) || hasInsufficientStock(item)}
                                                className="flex items-center justify-center gap-1 w-full py-1.5 rounded-lg bg-brand border-none cursor-pointer font-semibold text-[12px] text-brand-dark active:scale-95 transition disabled:opacity-50 disabled:cursor-not-allowed font-[inherit]">
                                                <Plus size={14} /> {isOutOfStock(item) ? 'Out of Stock' : hasInsufficientStock(item) ? 'Max Reached' : 'Add'}
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </>
                )}
            </div>

            {/* DESKTOP: split layout — products left, cart right */}
            <div className="hidden md:flex flex-1 overflow-hidden">
                {/* Left: Categories + Product Grid */}
                <div className="flex-1 flex flex-col overflow-hidden min-w-0">
                    {/* Categories bar */}
                    <div className="flex overflow-x-auto gap-2 px-3 py-2 border-b border-gray-200 shrink-0 scrollbar-hide">
                        {categories.map(cat => (
                            <button key={cat.id} onClick={() => setSelectedCategory(cat.id)}
                                className={`whitespace-nowrap px-3 py-1.5 rounded-full text-[12px] font-medium border-[1.5px] shrink-0 cursor-pointer transition-all ${selectedCategory === cat.id
                                    ? 'bg-brand border-brand text-brand-dark'
                                    : 'bg-white border-gray-200 hover:border-brand/50'
                                    }`}>
                                {cat.name}
                            </button>
                        ))}
                    </div>

                    {/* Products grid - Desktop (smaller, denser) */}
                    {filtered.length === 0 ? (
                        <div className="flex flex-col items-center justify-center flex-1 text-gray-500 gap-2 py-8"><p>No items in this category</p></div>
                    ) : (
                        <div className="grid grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2.5 p-3 flex-1 overflow-y-auto content-start">
                            {filtered.map(item => (
                                <div key={item.id} className={`bg-white border border-gray-200 rounded-lg overflow-hidden flex flex-col transition hover:shadow-md ${item.status === 'unavailable' ? 'opacity-50' : ''}`}>
                                    <div className="h-14 flex items-center justify-center text-[32px] bg-yellow-50">{catIcon}</div>
                                    <div className="p-2 flex-1">
                                        <div className="text-[12px] font-semibold mb-0.5 line-clamp-2">{item.name}</div>
                                        <div className="text-[13px] font-bold text-brand-dark">₱{item.price.toFixed(2)}</div>
                                        {item.status === 'unavailable' && <div className="text-[10px] text-red-500 font-semibold mt-0.5">UNAVAILABLE</div>}
                                        {item.status !== 'unavailable' && isOutOfStock(item) && <div className="text-[10px] text-red-500 font-semibold mt-0.5">OUT OF STOCK</div>}
                                    </div>
                                    <div className="px-2 pb-2">
                                        {item.trackStock && item.stock != null && (item.stock ?? 0) > 0 && (
                                            <div className={`text-[10px] font-medium mb-1 text-center ${(item.stock ?? 0) <= (item.reorderLevel ?? 10) ? 'text-amber-500' : 'text-gray-500'}`}>
                                                {`${(item.stock ?? 0) - getCartQuantity(item.id)} left`}
                                            </div>
                                        )}
                                        <button onClick={() => addToCart(item)} disabled={item.status === 'unavailable' || isOutOfStock(item) || hasInsufficientStock(item)}
                                            className="flex items-center justify-center gap-1 w-full py-1.5 rounded-lg bg-brand border-none cursor-pointer font-semibold text-[12px] text-brand-dark active:scale-95 transition disabled:opacity-50 disabled:cursor-not-allowed font-[inherit]">
                                            <Plus size={14} /> {isOutOfStock(item) ? 'Out of Stock' : hasInsufficientStock(item) ? 'Max Reached' : 'Add'}
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Right: Cart Panel (always visible on desktop) */}
                <div className="w-80 shrink-0 border-l border-gray-200 bg-white flex flex-col">
                    {/* Cart Header */}
                    <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-100">
                        <ShoppingCart size={18} className="text-brand-dark" />
                        <span className="font-bold text-sm">Current Order</span>
                        {cart.length > 0 && <span className="bg-brand text-brand-dark text-[11px] font-bold px-1.5 py-0.5 rounded-full">{cart.length}</span>}
                    </div>

                    {/* Cart Items */}
                    <div className="flex-1 overflow-y-auto px-3 py-2">
                        {cart.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-full text-gray-400 gap-2">
                                <ShoppingCart size={32} className="opacity-30" />
                                <p className="text-sm">Cart is empty</p>
                                <p className="text-[11px]">Add items from the menu</p>
                            </div>
                        ) : (
                            <div className="space-y-2">
                                {cart.map((item, idx) => (
                                    <div key={`${item.id}-${item.selectedSize}-${item.selectedFlavor}-${item.selectedTemperature}-${idx}`}
                                        className="bg-gray-50 border border-gray-100 rounded-lg p-2.5">
                                        <div className="flex justify-between items-start mb-1">
                                            <div className="flex-1 min-w-0">
                                                <div className="text-[12px] font-semibold truncate">{item.name}</div>
                                                {item.selectedSize && <div className="text-[10px] text-gray-500">Size: {item.selectedSize}</div>}
                                                {item.selectedFlavor && <div className="text-[10px] text-gray-500">Flavor: {item.selectedFlavor}</div>}
                                                {item.selectedTemperature && <div className="text-[10px] text-gray-500">Temp: {item.selectedTemperature}</div>}
                                            </div>
                                            <button className="bg-transparent border-none text-red-400 hover:text-red-600 cursor-pointer text-xs p-0.5 ml-1" onClick={() => updateQty(idx, 0)}>✕</button>
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-1">
                                                <button className="w-6 h-6 flex items-center justify-center rounded border border-gray-200 bg-white cursor-pointer text-gray-600 hover:bg-gray-100" onClick={() => updateQty(idx, item.quantity - 1)}><Minus size={12} /></button>
                                                <span className="font-semibold text-[12px] min-w-[20px] text-center">{item.quantity}</span>
                                                <button className="w-6 h-6 flex items-center justify-center rounded border border-gray-200 bg-white cursor-pointer text-gray-600 hover:bg-gray-100" onClick={() => updateQty(idx, item.quantity + 1)}><Plus size={12} /></button>
                                            </div>
                                            <span className="font-bold text-[13px] text-brand-dark">₱{((item.itemPrice || item.price) * item.quantity).toFixed(2)}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Cart Footer */}
                    {cart.length > 0 && (
                        <div className="border-t border-gray-200 px-4 py-3 shrink-0">
                            <div className="flex justify-between items-center mb-3 font-bold">
                                <span className="text-sm">Total</span>
                                <span className="text-lg text-brand-dark">₱{total.toFixed(2)}</span>
                            </div>
                            <button className="w-full py-2.5 bg-brand text-brand-dark border-none rounded-lg text-sm font-semibold cursor-pointer hover:shadow-md hover:shadow-yellow-300/40 transition font-[inherit]"
                                onClick={() => navigate('/cashier/payment', { state: { total: total.toFixed(2), items: cart, itemCount: cart.length } })}>
                                Proceed to Checkout
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* Options Modal */}
            {showOptionsModal && selectedProduct && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[9990] p-4 animate-[fadeIn_0.2s]" onClick={() => setShowOptionsModal(false)}>
                    <div className="bg-white rounded-xl p-6 w-full max-w-[400px] max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
                        <h2 className="text-lg font-bold mb-4">{selectedProduct.name}</h2>
                        {selectedProduct.hasSize && selectedProduct.sizes && selectedProduct.sizes.length > 0 && (
                            <div className="mb-4">
                                <h3 className="text-sm font-semibold mb-2">Select Size: <span className="text-red-500">*</span></h3>
                                {selectedProduct.sizes.map((s, i) => (
                                    <button key={i} onClick={() => setSelectedSize(s.name)}
                                        className={`block w-full p-3 rounded-lg border-2 font-semibold text-sm text-left mb-2 cursor-pointer transition font-[inherit] ${selectedSize === s.name
                                            ? 'bg-brand border-brand text-white'
                                            : 'bg-white border-gray-200 text-gray-900 hover:border-brand/50'
                                            }`}>
                                        {s.name} - ₱{s.price.toFixed(2)}
                                    </button>
                                ))}
                            </div>
                        )}
                        {selectedProduct.hasFlavor && selectedProduct.flavors && selectedProduct.flavors.length > 0 && (
                            <div className="mb-4">
                                <h3 className="text-sm font-semibold mb-2">Select Flavor: <span className="text-red-500">*</span></h3>
                                {selectedProduct.flavors.map((f, i) => (
                                    <button key={i} onClick={() => setSelectedFlavor(f)}
                                        className={`block w-full p-3 rounded-lg border-2 font-semibold text-sm text-left mb-2 cursor-pointer transition font-[inherit] ${selectedFlavor === f
                                            ? 'bg-brand border-brand text-white'
                                            : 'bg-white border-gray-200 text-gray-900 hover:border-brand/50'
                                            }`}>
                                        {f}
                                    </button>
                                ))}
                            </div>
                        )}
                        {selectedProduct.hasTemperature && selectedProduct.temperatures && selectedProduct.temperatures.length > 0 && (
                            <div className="mb-4">
                                <h3 className="text-sm font-semibold mb-2">Select Temperature: <span className="text-red-500">*</span></h3>
                                {selectedProduct.temperatures.map((t, i) => (
                                    <button key={i} onClick={() => setSelectedTemperature(t)}
                                        className={`block w-full p-3 rounded-lg border-2 font-semibold text-sm text-left mb-2 cursor-pointer transition font-[inherit] ${selectedTemperature === t
                                            ? 'bg-brand border-brand text-white'
                                            : 'bg-white border-gray-200 text-gray-900 hover:border-brand/50'
                                            }`}>
                                        {t}
                                    </button>
                                ))}
                            </div>
                        )}
                        <div className="flex gap-3 mt-5">
                            <button className="flex-1 py-3 rounded-lg border border-gray-200 bg-transparent font-medium cursor-pointer font-[inherit]" onClick={() => setShowOptionsModal(false)}>Cancel</button>
                            <button
                                className="flex-1 py-3 rounded-lg border-none bg-brand text-brand-dark font-semibold cursor-pointer font-[inherit] disabled:opacity-50 disabled:cursor-not-allowed"
                                onClick={addWithOptions}
                                disabled={
                                    (selectedProduct.hasSize && selectedProduct.sizes && selectedProduct.sizes.length > 0 && !selectedSize) ||
                                    (selectedProduct.hasFlavor && selectedProduct.flavors && selectedProduct.flavors.length > 0 && !selectedFlavor) ||
                                    (selectedProduct.hasTemperature && selectedProduct.temperatures && selectedProduct.temperatures.length > 0 && !selectedTemperature)
                                }
                            >
                                Add to Cart
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
