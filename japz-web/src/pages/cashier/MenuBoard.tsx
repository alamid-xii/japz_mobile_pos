import { useState, useEffect, useCallback, useRef } from 'react';
import { Download, Maximize2 } from 'lucide-react';
import html2canvas from 'html2canvas';
import { menuItemAPI, menuCategoryAPI } from '../../services/api';

interface MenuItem {
    id: number; name: string; price: number; description?: string;
    status: 'available' | 'unavailable'; categoryId: number;
    hasSize?: boolean; sizes?: any[]; hasFlavor?: boolean; flavors?: string[];
    hasTemperature?: boolean; temperatures?: string[];
}
interface MenuCategory { id: number; name: string; description?: string; icon?: string; }

// Map category name patterns to preferred columns (0=left, 1=middle, 2=right)
const COLUMN_PREFERENCES: Record<string, number> = {
    burger: 0, sandwich: 0,
    pasta: 1, fries: 1, chips: 1, snack: 1,
    beverage: 2, drink: 2, cooler: 2, coffee: 2,
};

// Map category name patterns to feature images
const FEATURE_IMAGES: Record<string, string> = {
    burger: '/burgers2.jpg',
    pasta: '/pasta2.jpg',
};

// Right-column promo images
const RIGHT_IMAGES = [
    { src: '/beverage1.jpg', alt: 'Beverage' },
    { src: '/coolers.jpg', alt: 'Coolers' },
    { src: '/coffee.jpg', alt: 'Coffee' },
];

function getColumnForCategory(name: string): number {
    const lower = name.toLowerCase();
    for (const [key, col] of Object.entries(COLUMN_PREFERENCES)) {
        if (lower.includes(key)) return col;
    }
    return -1; // unassigned
}

function getFeatureImage(name: string): string | null {
    const lower = name.toLowerCase();
    for (const [key, src] of Object.entries(FEATURE_IMAGES)) {
        if (lower.includes(key)) return src;
    }
    return null;
}

export default function MenuBoard() {
    const menuBoardRef = useRef<HTMLDivElement>(null);
    const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
    const [categories, setCategories] = useState<MenuCategory[]>([]);
    const [loading, setLoading] = useState(true);

    const downloadAsImage = async () => {
        if (!menuBoardRef.current) return;
        try {
            const el = menuBoardRef.current;

            // Ensure webfonts are loaded so text renders correctly in the canvas
            if (document.fonts && document.fonts.ready) await document.fonts.ready;

            const rect = el.getBoundingClientRect();
            const width = Math.max(800, Math.round(rect.width));
            const height = Math.max(450, Math.round(rect.height));
            const deviceScale = window.devicePixelRatio || 1;
            const scale = Math.min(3, Math.max(1, Math.round(deviceScale)));

            // Capture using the element's rendered size and scale so preview/fullscreen match the PNG
            const canvas = await html2canvas(el, {
                scale,
                width: Math.round(rect.width),
                height: Math.round(rect.height),
                useCORS: true,
                allowTaint: false,
                logging: false,
                backgroundColor: null,
                scrollX: -window.scrollX,
                scrollY: -window.scrollY,
                windowWidth: Math.round(document.documentElement.clientWidth),
                windowHeight: Math.round(document.documentElement.clientHeight),
            });

            const link = document.createElement('a');
            link.href = canvas.toDataURL('image/png', 1.0);
            link.download = `japz-menu-${new Date().toISOString().split('T')[0]}.png`;
            link.click();
        } catch (error) {
            console.error('Error downloading image:', error);
            alert('Failed to download menu image — check console for details');
        }
    };

    const toggleFullscreen = async () => {
        try {
            const el = menuBoardRef.current;
            if (!el) return;
            if (!document.fullscreenElement) {
                // Request fullscreen for the board element
                // @ts-ignore
                await el.requestFullscreen();
            } else {
                await document.exitFullscreen();
            }
        } catch (err) {
            console.error('Fullscreen toggle failed', err);
        }
    };

    const fetchMenuData = useCallback(async () => {
        try {
            const [catRes, itemRes] = await Promise.all([menuCategoryAPI.getAll(), menuItemAPI.getAll()]);
            setCategories(catRes.data || []);
            const items = (itemRes.data || []).map((item: any) => {
                const parsedSizes: Array<{ name: string; price: number }> = [];
                if (item.sizes && Array.isArray(item.sizes)) {
                    item.sizes.forEach((s: any) => {
                        if (typeof s === 'string') {
                            const m = s.match(/(.+?)\s*-\s*₱([\d.]+)/);
                            if (m) parsedSizes.push({ name: m[1].trim(), price: Number(m[2]) });
                            else parsedSizes.push({ name: s, price: 0 });
                        } else if (s?.name && s?.price) parsedSizes.push({ name: s.name, price: Number(s.price) });
                    });
                }
                return { ...item, sizes: parsedSizes };
            });
            setMenuItems(items);
        } catch (e) { console.error(e); }
        finally { setLoading(false); }
    }, []);

    useEffect(() => { fetchMenuData(); }, [fetchMenuData]);
    useEffect(() => { const id = setInterval(fetchMenuData, 5000); return () => clearInterval(id); }, [fetchMenuData]);

    // --- Build columns dynamically ---
    const addOnsCat = categories.find(c => c.name.toLowerCase().includes('add'));
    const addOns = menuItems.filter(i => i.categoryId === addOnsCat?.id);

    // Get all categories except add-ons
    const displayCategories = categories.filter(c => c.id !== addOnsCat?.id);

    // Build category groups with items
    const categoryGroups = displayCategories
        .map(cat => ({
            category: cat,
            items: menuItems.filter(i => i.categoryId === cat.id),
        }))
        .filter(g => g.items.length > 0);

    // Distribute into 3 columns
    const columns: Array<typeof categoryGroups> = [[], [], []];
    const unassigned: typeof categoryGroups = [];

    // Deduplicate fries/chips
    const seenFriesChips = new Set<string>();

    categoryGroups.forEach(group => {
        const name = group.category.name.toLowerCase();
        if (name.includes('fries') || name.includes('chips')) {
            if (seenFriesChips.has(name)) return;
            seenFriesChips.add(name);
        }
        const col = getColumnForCategory(group.category.name);
        if (col >= 0 && col < 3) {
            columns[col].push(group);
        } else {
            unassigned.push(group);
        }
    });

    // Distribute unassigned groups to the shortest column
    unassigned.forEach(group => {
        const itemCounts = columns.map(col => col.reduce((s, g) => s + g.items.length, 0));
        const minIdx = itemCounts.indexOf(Math.min(...itemCounts));
        columns[minIdx].push(group);
    });

    if (loading) return <div className="flex items-center justify-center h-full bg-gray-950"><div className="spinner" /></div>;

    const boardBackground = '/burgers.jpg';

    // --- Reusable MenuSection ---
    const MenuSection = ({ title, items }: { title: string; items: MenuItem[] }) => {
        const baseItems: MenuItem[] = [];
        const combosByBase: Record<string, MenuItem[]> = {};
        items.forEach(item => {
            const comboMatch = item.name.match(/^(.*)\s+with\s+(.+)$/i);
            if (comboMatch) {
                const base = comboMatch[1].trim().toLowerCase();
                if (!combosByBase[base]) combosByBase[base] = [];
                combosByBase[base].push(item);
            } else {
                baseItems.push(item);
            }
        });

        const renderComboItem = (item: MenuItem) => {
            const match = item.name.match(/^(.+)\s+with\s+(.+)$/i);
            if (!match) return null;
            const suffix = match[2];
            return (
                <li key={item.id} className="mb-combo-item">
                    <div className="mb-row">
                        <span className="mb-item-name">
                            <span className="mb-combo-label">with {suffix}</span>
                        </span>
                        <div className="mb-price-area">
                            <span className="mb-price">
                                ₱{(typeof item.price === 'number' ? item.price : parseFloat(item.price || '0')).toFixed(0)}
                            </span>
                            {item.status === 'unavailable' && <span className="mb-sold-out">SOLD OUT</span>}
                        </div>
                    </div>
                </li>
            );
        };

        const allSizes = Array.from(new Set(
            items.flatMap(item => item.hasSize && item.sizes ? item.sizes.map(s => s.name) : [])
        ));
        const allTemperatures = Array.from(new Set(
            items.flatMap(item => item.hasTemperature && item.temperatures ? item.temperatures : [])
        ));
        const tempLower = allTemperatures.map(t => t.toLowerCase());
        let tempLabel = '';
        if (allTemperatures.length > 0) {
            if (tempLower.every(t => t === 'cold')) tempLabel = 'Cold Only';
            else if (tempLower.every(t => t === 'hot')) tempLabel = 'Hot Only';
        }

        return (
            <div className="mb-section">
                <div className="mb-section-header">
                    <h2 className="mb-section-title">{title}</h2>
                    {allSizes.length > 0 && (
                        <div className="mb-size-badges">
                            {allSizes.map((size, i) => (
                                <span key={i} className="mb-size-badge">{size}</span>
                            ))}
                        </div>
                    )}
                </div>
                {allTemperatures.length > 0 && (
                    <div className="mb-temp-label">🌡️ {tempLabel || allTemperatures.join(' / ')}</div>
                )}
                <ul className="mb-item-list">
                    {baseItems.map(base => {
                        const combos = combosByBase[base.name.trim().toLowerCase()] || [];
                        return [
                            <li key={base.id}
                                className={`mb-item ${combos.length > 0 ? '' : base.status === 'unavailable' ? 'mb-item-unavailable' : 'mb-item-normal'}`}>
                                <div className="mb-row">
                                    <span className={`mb-item-name ${base.status === 'unavailable' ? 'mb-text-unavailable' : ''}`}>
                                        {base.name}
                                    </span>
                                    {allSizes.length > 0 ? (
                                        <div className="mb-size-prices">
                                            {allSizes.map((size, i) => {
                                                const found = base.hasSize && base.sizes ? base.sizes.find((s: any) => s.name === size) : null;
                                                return (
                                                    <span key={i} className="mb-size-price">
                                                        {found ? `₱${found.price}` : '-'}
                                                    </span>
                                                );
                                            })}
                                        </div>
                                    ) : (
                                        <span className={`mb-price ${base.status === 'unavailable' ? 'mb-price-unavailable' : ''}`}>
                                            ₱{(typeof base.price === 'number' ? base.price : parseFloat(base.price || '0')).toFixed(0)}
                                        </span>
                                    )}
                                </div>
                                {base.hasFlavor && base.flavors && base.flavors.length > 0 && (
                                    <div className="mb-flavors">{base.flavors.join(' • ')}</div>
                                )}
                                {base.hasTemperature && base.temperatures && base.temperatures.length > 0 && (() => {
                                    const temps = base.temperatures.map(t => t.toLowerCase());
                                    if (temps.every(t => t === 'cold')) return <div className="mb-temp-inline">Cold Only</div>;
                                    if (temps.every(t => t === 'hot')) return <div className="mb-temp-inline">Hot Only</div>;
                                    return null;
                                })()}
                            </li>,
                            ...combos.map(renderComboItem)
                        ];
                    })}
                </ul>
            </div>
        );
    };

    return (
        <div className="mb-page">
            {/* Download Button - outside the board */}
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <button onClick={downloadAsImage} className="mb-download-btn">
                    <Download size={20} />
                    Download Menu (PNG)
                </button>
                <button onClick={toggleFullscreen} className="mb-download-btn" title="Toggle fullscreen">
                    <Maximize2 size={18} />
                    Fullscreen
                </button>
            </div>

            {/* Menu Board */}
            <div ref={menuBoardRef} className="mb-board" style={{ backgroundImage: `url(${boardBackground})` }}>
                {/* Dark overlay */}
                <div className="mb-overlay" />

                {/* Main Content */}
                <div className="mb-content">
                    <div className="mb-grid">
                        <div className="mb-main">
                        {/* Column 1 (Left) */}
                        <div className="mb-column">
                            {/* Logo Header */}
                            <div className="mb-logo-header">
                                <img src="/black_logo.jpg" alt="JAPZ Grill Logo" className="mb-logo-img" />
                                <div className="mb-logo-text">
                                    <h1 className="mb-tagline">NOT YOUR ORDINARY BURGER. 100% PURE BEEF!</h1>
                                </div>
                            </div>
                            {columns[0].map(group => (
                                <div key={group.category.id}>
                                    <MenuSection title={group.category.name} items={group.items} />
                                    {(() => {
                                        const img = getFeatureImage(group.category.name);
                                        return img ? <img src={img} alt={`${group.category.name} Feature`} className="mb-feature-img" /> : null;
                                    })()}
                                </div>
                            ))}
                        </div>

                        {/* Column 2 (Middle) */}
                        <div className="mb-column">
                            {columns[1].map(group => (
                                <div key={group.category.id}>
                                    <MenuSection title={group.category.name} items={group.items} />
                                    {(() => {
                                        const img = getFeatureImage(group.category.name);
                                        return img ? <img src={img} alt={`${group.category.name} Feature`} className="mb-feature-img" /> : null;
                                    })()}
                                </div>
                            ))}
                        </div>

                        {/* Column 3 (Right) */}
                        <div className="mb-column">
                            {columns[2].map(group => (
                                <MenuSection key={group.category.id} title={group.category.name} items={group.items} />
                            ))}
                        </div>
                        </div>

                        {/* Image Strip (fixed-width right column) */}
                        <div className="mb-img-strip">
                            {RIGHT_IMAGES.map((img, i) => (
                                <img key={i} src={img.src} alt={img.alt} className="mb-strip-img" />
                            ))}
                        </div>
                    </div>
                </div>

                {/* Add-ons Footer */}
                {addOns.length > 0 && (
                    <div className="mb-addons-footer">
                        <h3 className="mb-addons-title">ADD-ONS</h3>
                        <div className="mb-addons-list">
                            {addOns.map(item => (
                                <span key={item.id}
                                    className={`mb-addon-chip ${item.status === 'unavailable' ? 'mb-addon-unavailable' : ''}`}>
                                    {item.name} ₱{(typeof item.price === 'number' ? item.price : parseFloat(item.price || '0')).toFixed(0)}
                                    {item.status === 'unavailable' && <span className="mb-sold-out">SOLD OUT</span>}
                                </span>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* Scoped responsive styles */}
            <style>{`
                .mb-page {
                    display: flex;
                    flex-direction: column;
                    gap: 2rem;
                    padding: 1rem;
                    min-height: 100vh;
                    background: #030712;
                }
                .mb-download-btn {
                    display: flex;
                    align-items: center;
                    gap: 0.5rem;
                    background: var(--color-brand, #FFCE1B);
                    color: #000;
                    font-weight: 700;
                    padding: 0.5rem 1.5rem;
                    border-radius: 0.375rem;
                    border: none;
                    cursor: pointer;
                    width: fit-content;
                    font-size: 0.875rem;
                }
                .mb-download-btn:hover { opacity: 0.9; }

                /* ===== BOARD ===== */
                .mb-board {
                    position: relative;
                    width: 100%;
                    max-width: 1920px;
                    display: flex;
                    flex-direction: column;
                    overflow: hidden;
                    background-size: cover;
                    background-position: center;
                    border-radius: 0.5rem;
                    /* Maintain a consistent aspect ratio so preview/download/fullscreen match */
                    aspect-ratio: 16 / 9;
                    height: auto;
                }
                .mb-overlay {
                    position: absolute;
                    inset: 0;
                    background: rgba(0,0,0,0.82);
                    z-index: 0;
                }
                .mb-content {
                    position: relative;
                    z-index: 1;
                    flex: 1;
                    padding: clamp(0.25rem, 0.5vw, 0.75rem);
                    overflow: hidden;
                }

                /* ===== GRID ===== */
                .mb-grid {
                    display: grid;
                    /* Two columns: main content (3 inner columns) + fixed/right image strip */
                    /* Narrower right strip so left columns receive more space */
                    --right-strip-width: minmax(85px, 11vw);
                    grid-template-columns: 1fr var(--right-strip-width);
                    gap: clamp(0.25rem, 0.4vw, 0.5rem);
                    height: 100%;
                }
                .mb-main {
                    display: grid;
                    grid-template-columns: 1fr 1fr 1fr;
                    gap: clamp(0.25rem, 0.4vw, 0.5rem);
                    height: 100%;
                }
                .mb-column {
                    display: flex;
                    flex-direction: column;
                    gap: clamp(0.2rem, 0.3vw, 0.4rem);
                    overflow: hidden;
                    min-width: 0;
                }

                /* ===== LOGO HEADER ===== */
                .mb-logo-header {
                    display: flex;
                    align-items: center;
                    gap: clamp(0.25rem, 0.5vw, 0.5rem);
                    background: rgba(0,0,0,0.7);
                    border-radius: 0.5rem;
                    overflow: hidden;
                    margin-top: clamp(0.25rem, 0.5vw, 0.75rem);
                }
                .mb-logo-img {
                    width: 38%;
                    height: auto;
                    max-height: 14vh;
                    object-fit: contain;
                }
                .mb-logo-text {
                    padding: clamp(0.25rem, 0.3vw, 0.5rem);
                }
                .mb-tagline {
                    font-size: clamp(0.5rem, 1vw, 0.875rem);
                    font-weight: 700;
                    color: var(--color-brand, #FFCE1B);
                    text-transform: uppercase;
                    letter-spacing: 0.05em;
                    line-height: 1.3;
                }

                /* ===== SECTIONS ===== */
                .mb-section {
                    background: rgba(0,0,0,0.7);
                    border-radius: 0.5rem;
                    padding: clamp(0.3rem, 0.5vw, 0.6rem);
                    box-shadow: 0 2px 8px rgba(0,0,0,0.3);
                    overflow: hidden;
                }
                .mb-section-header {
                    display: flex;
                    align-items: center;
                    margin-bottom: clamp(0.15rem, 0.2vw, 0.3rem);
                    gap: 0.5rem;
                }
                .mb-section-title {
                    flex: 1;
                    font-size: clamp(0.55rem, 1vw, 0.875rem);
                    font-weight: 700;
                    text-transform: uppercase;
                    letter-spacing: 0.08em;
                    color: var(--color-brand, #FFCE1B);
                    line-height: 1.2;
                    filter: drop-shadow(0 1px 2px rgba(0,0,0,0.5));
                }
                .mb-size-badges {
                    display: flex;
                    gap: clamp(0.3rem, 0.6vw, 0.75rem);
                    align-items: center;
                }
                .mb-size-badge {
                    display: inline-flex;
                    align-items: center;
                    justify-content: center;
                    box-sizing: border-box;
                    height: clamp(1.2rem, 2.2vh, 2rem);
                    /* match line-height to height to avoid vertical offset in canvas output */
                    line-height: clamp(1.2rem, 2.2vh, 2rem);
                    font-size: clamp(0.4rem, 0.7vw, 0.625rem);
                    font-weight: 700;
                    color: #9ca3af;
                    padding: 0 0.5em;
                    border-radius: 0.2rem;
                    background: rgba(0,0,0,0.3);
                    border: 1px solid var(--color-brand, #FFCE1B);
                    white-space: nowrap;
                }
                .mb-temp-label {
                    font-size: clamp(0.35rem, 0.6vw, 0.5625rem);
                    color: #60a5fa;
                    line-height: 1.2;
                    margin-bottom: clamp(0.1rem, 0.15vw, 0.2rem);
                }

                /* ===== ITEMS ===== */
                .mb-item-list {
                    list-style: none;
                    padding: 0;
                    margin: 0;
                    display: flex;
                    flex-direction: column;
                    gap: clamp(0.15rem, 0.2vw, 0.25rem);
                }
                .mb-item {
                    display: flex;
                    flex-direction: column;
                    padding-bottom: clamp(0.15rem, 0.25vw, 0.35rem);
                }
                .mb-item-normal {
                    border-bottom: 1px solid #374151;
                }
                .mb-item-unavailable {
                    background: rgba(127,29,29,0.4);
                    border: 1px solid #dc2626;
                    border-radius: 0.15rem;
                    padding: clamp(0.1rem, 0.15vw, 0.25rem) clamp(0.2rem, 0.3vw, 0.4rem);
                }
                .mb-row {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    gap: 0.25rem;
                }
                .mb-item-name {
                    font-size: clamp(0.45rem, 0.8vw, 0.6875rem);
                    color: white;
                    font-weight: 500;
                    line-height: 1.3;
                    flex: 1;
                    min-width: 0;
                }
                .mb-text-unavailable {
                    color: #fca5a5;
                    text-decoration: line-through;
                    font-weight: 400;
                }
                .mb-price {
                    font-size: clamp(0.45rem, 0.8vw, 0.6875rem);
                    font-weight: 700;
                    color: var(--color-brand, #FFCE1B);
                    white-space: nowrap;
                    flex-shrink: 0;
                }
                .mb-price-unavailable { color: #f87171; }
                .mb-price-area {
                    display: flex;
                    align-items: center;
                    gap: 0.25rem;
                    flex-shrink: 0;
                }
                .mb-size-prices {
                    display: flex;
                    gap: clamp(0.1rem, 0.2vw, 0.3rem);
                    flex-shrink: 0;
                    align-items: center;
                }
                .mb-size-price {
                    display: inline-flex;
                    align-items: center;
                    justify-content: center;
                    box-sizing: border-box;
                    height: clamp(1.2rem, 2.2vh, 2rem);
                    /* match line-height to height to avoid vertical offset in canvas output */
                    line-height: clamp(1.2rem, 2.2vh, 2rem);
                    font-size: clamp(0.45rem, 0.8vw, 0.6875rem);
                    font-weight: 700;
                    color: var(--color-brand, #FFCE1B);
                    width: clamp(2rem, 4vw, 4rem);
                    text-align: center;
                    padding: 0 0.2rem;
                }
                .mb-sold-out {
                    font-size: clamp(0.3rem, 0.5vw, 0.5rem);
                    font-weight: 900;
                    background: #dc2626;
                    color: white;
                    padding: 0.1em 0.3em;
                    border-radius: 0.15rem;
                    text-transform: uppercase;
                    line-height: 1;
                    white-space: nowrap;
                }
                .mb-combo-item {
                    padding-bottom: clamp(0.1rem, 0.15vw, 0.3rem);
                    margin-left: clamp(0.5rem, 1.5vw, 1rem);
                    list-style: none;
                }
                .mb-combo-label {
                    color: var(--color-brand, #FFCE1B);
                    font-weight: 700;
                }
                .mb-flavors {
                    font-size: clamp(0.35rem, 0.6vw, 0.5625rem);
                    color: var(--color-brand, #FFCE1B);
                    font-style: italic;
                    line-height: 1.2;
                    margin-top: 0.1rem;
                }
                .mb-temp-inline {
                    font-size: clamp(0.35rem, 0.6vw, 0.5625rem);
                    color: #60a5fa;
                    line-height: 1.2;
                    margin-top: 0.1rem;
                }

                /* ===== FEATURE IMAGES ===== */
                .mb-feature-img {
                    width: 100%;
                    /* allow larger preview but keep containment to avoid zoom/cropping */
                    max-height: 22vh;
                    object-fit: contain;
                    object-position: center;
                    border-radius: 0.5rem;
                    border: 2px solid var(--color-brand, #FFCE1B);
                    box-shadow: 0 2px 6px rgba(0,0,0,0.3);
                    margin-top: clamp(0.15rem, 0.25vw, 0.35rem);
                }

                /* ===== IMAGE STRIP ===== */
                .mb-img-strip {
                    display: flex;
                    flex-direction: column;
                    gap: clamp(0.25rem, 0.4vw, 0.5rem);
                    padding: clamp(0.25rem, 0.4vw, 0.5rem) 0;
                    align-items: stretch;
                    justify-content: flex-start;
                }
                .mb-strip-img {
                    width: 100%;
                    object-fit: contain;
                    object-position: center;
                    border-radius: 0.375rem;
                    border: 2px solid var(--color-brand, #FFCE1B);
                    box-shadow: 0 2px 6px rgba(0,0,0,0.3);
                    min-height: 0;
                    /* Increase max-height so images appear larger on desktop and scale down on smaller screens */
                    max-height: 30vh;
                    display: block;
                }

                /* Fullscreen-specific tweaks so images don't over-zoom */
                .mb-board:fullscreen {
                    width: 100vw !important;
                    height: 100vh !important;
                    max-width: none !important;
                    aspect-ratio: auto !important;
                    border-radius: 0 !important;
                }
                .mb-board:fullscreen .mb-feature-img {
                    max-height: 40vh;
                    object-fit: contain;
                    object-position: center;
                }
                .mb-board:fullscreen .mb-strip-img {
                    max-height: 40vh;
                    object-fit: contain;
                    object-position: center;
                }
                /* Slightly increase text sizes in fullscreen for readability */
                .mb-board:fullscreen .mb-section-title {
                    font-size: clamp(0.62rem, 1.12vw, 0.98rem) !important;
                }
                .mb-board:fullscreen .mb-item-name {
                    font-size: clamp(0.5rem, 0.9vw, 0.77rem) !important;
                }
                .mb-board:fullscreen .mb-price {
                    font-size: clamp(0.5rem, 0.9vw, 0.77rem) !important;
                }
                .mb-board:fullscreen .mb-tagline {
                    font-size: clamp(0.56rem, 1.12vw, 0.98rem) !important;
                }
                .mb-board:fullscreen .mb-addon-chip {
                    font-size: clamp(0.44rem, 0.85vw, 0.78rem) !important;
                }

                /* ===== ADD-ONS FOOTER ===== */
                .mb-addons-footer {
                    position: relative;
                    z-index: 1;
                    display: flex;
                    align-items: center;
                    gap: clamp(0.5rem, 1vw, 1rem);
                    background: rgba(0,0,0,0.85);
                    border-top: 1px solid var(--color-brand, #FFCE1B);
                    padding: clamp(0.3rem, 0.6vw, 0.75rem) clamp(0.5rem, 1.2vw, 1.25rem);
                    flex-wrap: wrap;
                    flex-shrink: 0;
                }
                .mb-addons-title {
                    font-size: clamp(0.55rem, 1vw, 0.875rem);
                    font-weight: 700;
                    color: var(--color-brand, #FFCE1B);
                    text-transform: uppercase;
                    letter-spacing: 0.05em;
                    white-space: nowrap;
                }
                .mb-addons-list {
                    display: flex;
                    flex-wrap: wrap;
                    gap: clamp(0.25rem, 0.4vw, 0.5rem);
                }
                .mb-addon-chip {
                    font-size: clamp(0.4rem, 0.7vw, 0.6875rem);
                    font-weight: 700;
                    padding: clamp(0.15rem, 0.3vw, 0.4rem) clamp(0.3rem, 0.6vw, 0.75rem);
                    border-radius: 0.25rem;
                    background: var(--color-brand, #FFCE1B);
                    color: #000;
                    display: flex;
                    align-items: center;
                    gap: 0.3rem;
                    white-space: nowrap;
                }
                .mb-addon-unavailable {
                    background: rgba(127,29,29,0.6);
                    color: #fca5a5;
                    text-decoration: line-through;
                }

                /* ===== RESPONSIVE BREAKPOINTS ===== */

                /* Small screens / tablets (under 900px) — stack to 2 columns + hide image strip */
                @media (max-width: 900px) {
                    .mb-grid {
                        grid-template-columns: 1fr 1fr;
                        gap: 0.4rem;
                    }
                    .mb-img-strip { display: none; }
                    .mb-feature-img { max-height: 15vh; }
                    .mb-logo-img { max-height: 10vh; }
                }

                /* Very small screens / phones (under 600px) — single column */
                @media (max-width: 600px) {
                    .mb-grid {
                        grid-template-columns: 1fr;
                    }
                    .mb-logo-header {
                        flex-direction: column;
                        text-align: center;
                    }
                    .mb-logo-img {
                        width: 60%;
                        max-height: 12vh;
                    }
                    .mb-feature-img { max-height: 20vh; }
                    .mb-addons-footer { flex-direction: column; align-items: flex-start; }
                }

                /* Large displays / TVs (1920px+) — boost spacing and ensure readability */
                @media (min-width: 1920px) {
                    .mb-section {
                        padding: clamp(0.5rem, 0.6vw, 1rem);
                    }
                    .mb-grid {
                        gap: clamp(0.4rem, 0.5vw, 0.75rem);
                    }
                }

                /* Ultra-wide / 4K displays (2560px+) */
                @media (min-width: 2560px) {
                    .mb-board {
                        max-width: 3840px;
                    }
                }
            `}</style>
        </div>
    );
}
