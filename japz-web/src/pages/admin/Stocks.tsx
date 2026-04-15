import { useState, useEffect } from 'react';
import { Search, AlertTriangle, CheckCircle, Minus, Plus, Save, ChevronLeft, ChevronRight, Package, RotateCcw, Settings2 } from 'lucide-react';
import { menuItemAPI, menuCategoryAPI, stocksAPI } from '../../services/api';

interface Category { id: number; name: string; }
interface MenuItem {
    id: number; name: string; price: number; categoryId: number;
    status: 'available' | 'unavailable'; stock?: number | null;
    defaultStock?: number;
    hasSize?: boolean; sizes?: Array<{ name: string; price: number }>;
}

export default function Stocks() {
    const [items, setItems] = useState<MenuItem[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCategory, setSelectedCategory] = useState<number | 'all'>('all');
    const [filter, setFilter] = useState<'all' | 'low' | 'out' | 'in_stock'>('all');
    const [editingStock, setEditingStock] = useState<Record<number, number>>({});
    const [restocking, setRestocking] = useState<Record<number, number>>({});
    const [saving, setSaving] = useState<number | null>(null);
    const [currentPage, setCurrentPage] = useState(1);
    const [generalDefault, setGeneralDefault] = useState<number>(0);
    const [showGeneralModal, setShowGeneralModal] = useState(false);
    const ITEMS_PER_PAGE = 10;

    const fetchData = async () => {
        try {
            const [itemRes, catRes] = await Promise.all([menuItemAPI.getAll(), menuCategoryAPI.getAll()]);
            const rawItems = (itemRes.data?.data || itemRes.data || []).map((i: any) => ({
                ...i,
                categoryId: i.categoryId || i.MenuCategoryId,
                price: Number(i.price || 0),
                stock: i.stock != null ? Number(i.stock) : 0,
                defaultStock: i.defaultStock != null ? Number(i.defaultStock) : 0,
            }));
            setItems(rawItems);
            setCategories(catRes.data?.data || catRes.data || []);
        } catch (e) { console.error(e); }
        finally { setLoading(false); }
    };

    useEffect(() => { fetchData(); }, []);

    // Set stock for a single item — updates BOTH stock and defaultStock
    const handleSetStock = async (item: MenuItem, newStock: number) => {
        setSaving(item.id);
        try {
            await menuItemAPI.update(item.id, { stock: Math.max(0, newStock), defaultStock: Math.max(0, newStock) });
            await fetchData();
            setEditingStock(prev => { const n = { ...prev }; delete n[item.id]; return n; });
        } catch (e) { console.error(e); }
        finally { setSaving(null); }
    };

    // Restock: adds quantity to current stock mid-day, does NOT change defaultStock
    const handleRestock = async (item: MenuItem, quantity: number) => {
        setSaving(item.id);
        try {
            await stocksAPI.restock(item.id, quantity);
            await fetchData();
            setRestocking(prev => { const n = { ...prev }; delete n[item.id]; return n; });
        } catch (e) { console.error(e); }
        finally { setSaving(null); }
    };

    // Set general stock for all items — updates BOTH stock and defaultStock
    const handleSetGeneralDefault = async () => {
        try {
            await stocksAPI.setGeneralDefault(generalDefault);
            await fetchData();
            setShowGeneralModal(false);
        } catch (e) { console.error(e); }
    };

    // Manual reset all stock to defaults
    const handleResetAll = async () => {
        if (!confirm('Reset ALL items to their set stock levels? This undoes any sales deductions for today.')) return;
        try {
            await stocksAPI.resetNow();
            await fetchData();
        } catch (e) { console.error(e); }
    };

    // Stats
    const totalItems = items.length;
    const lowStockItems = items.filter(i => i.stock != null && i.stock > 0 && i.stock <= 10);
    const outOfStockItems = items.filter(i => i.stock === 0);
    const healthyItems = items.filter(i => i.stock != null && i.stock > 10);

    // Filter
    const filteredItems = items.filter(item => {
        const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesCategory = selectedCategory === 'all' || item.categoryId === selectedCategory;
        const matchesFilter = filter === 'all' ? true
            : filter === 'low' ? (item.stock != null && item.stock > 0 && item.stock <= 10)
            : filter === 'out' ? (item.stock === 0)
            : filter === 'in_stock' ? (item.stock != null && item.stock > 10)
            : true;
        return matchesSearch && matchesCategory && matchesFilter;
    });

    if (loading) return <div className="spinner" />;

    return (
        <div className="p-2 md:p-4 h-full overflow-y-auto bg-gradient-to-b from-white to-slate-100">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-4 gap-3">
                <div>
                    <h1 className="text-2xl font-bold text-yellow-900">Stock Management</h1>
                    <p className="text-gray-500 text-sm">Set stock levels • Auto-resets daily • Restock mid-day</p>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={() => setShowGeneralModal(true)}
                        className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-brand text-brand-dark text-sm font-bold border-none cursor-pointer hover:shadow-md transition"
                    >
                        <Settings2 size={16} /> Set All Stock
                    </button>
                    <button
                        onClick={handleResetAll}
                        className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-gray-800 text-white text-sm font-bold border-none cursor-pointer hover:bg-gray-900 transition"
                    >
                        <RotateCcw size={16} /> Reset Today
                    </button>
                </div>
            </div>

            {/* Stat Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                <button
                    onClick={() => setFilter('all')}
                    className={`bg-white border text-center p-3 rounded-lg cursor-pointer transition shadow-sm hover:shadow-md ${filter === 'all' ? 'border-brand ring-2 ring-brand/20' : 'border-gray-200'}`}
                >
                    <div className="text-[11px] text-gray-500 font-medium">Total Items</div>
                    <div className="text-xl font-bold text-gray-800">{totalItems}</div>
                    
                </button>
                <button
                    onClick={() => setFilter(filter === 'in_stock' ? 'all' : 'in_stock')}
                    className={`bg-white border text-center p-3 rounded-lg cursor-pointer transition shadow-sm hover:shadow-md ${filter === 'in_stock' ? 'border-emerald-500 ring-2 ring-emerald-100' : 'border-gray-200'}`}
                >
                    <div className="text-[11px] text-gray-500 font-medium">In Stock</div>
                    <div className="text-xl font-bold text-emerald-500">{healthyItems.length}</div>

                </button>
                <button
                    onClick={() => setFilter(filter === 'low' ? 'all' : 'low')}
                    className={`bg-white border text-center p-3 rounded-lg cursor-pointer transition shadow-sm hover:shadow-md ${filter === 'low' ? 'border-amber-500 ring-2 ring-amber-100' : 'border-gray-200'}`}
                >
                    <div className="text-[11px] text-gray-500 font-medium">Low Stock</div>
                    <div className="text-xl font-bold text-amber-500">{lowStockItems.length}</div>

                </button>
                <button
                    onClick={() => setFilter(filter === 'out' ? 'all' : 'out')}
                    className={`bg-white border text-center p-3 rounded-lg cursor-pointer transition shadow-sm hover:shadow-md ${filter === 'out' ? 'border-red-500 ring-2 ring-red-100' : 'border-gray-200'}`}
                >
                    <div className="text-[11px] text-gray-500 font-medium">Out of Stock</div>
                    <div className="text-xl font-bold text-red-500">{outOfStockItems.length}</div>

                </button>
            </div>

            {/* Filters */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-4">
                <div className="flex gap-2 items-center flex-wrap">
                    {categories.length > 0 && (
                        <div className="flex gap-2 flex-wrap">
                            <button
                                onClick={() => setSelectedCategory('all')}
                                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition cursor-pointer border-none ${selectedCategory === 'all' ? 'bg-brand text-brand-dark' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
                            >All Categories</button>
                            {categories.map(cat => (
                                <button
                                    key={cat.id}
                                    onClick={() => setSelectedCategory(cat.id)}
                                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition cursor-pointer border-none ${selectedCategory === cat.id ? 'bg-brand text-brand-dark' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
                                >{cat.name}</button>
                            ))}
                        </div>
                    )}
                    {filter !== 'all' && (
                        <span className="text-xs text-gray-500 italic">
                            Filtering by: <span className="font-bold text-gray-700">{filter.replace('_', ' ')}</span>
                        </span>
                    )}
                </div>
                <div className="relative w-64">
                    <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Search items..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg bg-white text-sm focus:outline-none focus:ring-2 focus:ring-brand/50"
                    />
                </div>
            </div>

            {/* Table */}
            <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
                {filteredItems.length === 0 ? (
                    <p className="text-center text-gray-500 py-8">No items found</p>
                ) : (
                    <>
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead className="bg-yellow-100 border-b border-gray-200">
                                    <tr>
                                        <th className="px-5 py-3 text-left text-xs font-semibold text-gray-700">Item</th>
                                        <th className="px-5 py-3 text-left text-xs font-semibold text-gray-700">Category</th>
                                        <th className="px-5 py-3 text-center text-xs font-semibold text-gray-700">
                                            Stock
                                        </th>
                                        <th className="px-5 py-3 text-center text-xs font-semibold text-gray-700">Remaining Today</th>
                                        <th className="px-5 py-3 text-center text-xs font-semibold text-gray-700">Status</th>
                                        <th className="px-5 py-3 text-center text-xs font-semibold text-gray-700">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200">
                                    {filteredItems.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE).map(item => {
                                        const category = categories.find(c => c.id === item.categoryId);
                                        const isEditingStock = editingStock[item.id] !== undefined;
                                        const editStockValue = editingStock[item.id] ?? (item.defaultStock ?? 0);
                                        const isRestocking = restocking[item.id] !== undefined;
                                        const restockValue = restocking[item.id] ?? 1;
                                        const currentStock = item.stock ?? 0;
                                        const stockStatus = currentStock === 0 ? 'out'
                                            : currentStock <= 10 ? 'low'
                                            : 'ok';

                                        return (
                                            <tr key={item.id} className={`hover:bg-yellow-50 transition ${stockStatus === 'out' ? 'bg-red-50/30' : stockStatus === 'low' ? 'bg-amber-50/30' : ''}`}>
                                                <td className="px-5 py-3">
                                                    <div className="font-semibold text-sm text-gray-800">{item.name}</div>
                                                </td>
                                                <td className="px-5 py-3 text-sm text-gray-600">{category?.name || '-'}</td>
                                                
                                                {/* Stock (= defaultStock, what it resets to) */}
                                                <td className="px-5 py-3 text-center">
                                                    {isEditingStock ? (
                                                        <div className="flex items-center justify-center gap-1">
                                                            <button
                                                                onClick={() => setEditingStock(prev => ({ ...prev, [item.id]: Math.max(0, editStockValue - 1) }))}
                                                                className="w-7 h-7 flex items-center justify-center rounded-md bg-gray-100 hover:bg-gray-200 border-none cursor-pointer transition"
                                                            ><Minus size={14} /></button>
                                                            <input
                                                                type="number"
                                                                value={editStockValue}
                                                                onChange={(e) => setEditingStock(prev => ({ ...prev, [item.id]: Math.max(0, Number(e.target.value) || 0) }))}
                                                                className="w-16 text-center py-1 border border-gray-300 rounded-md text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-brand/50"
                                                            />
                                                            <button
                                                                onClick={() => setEditingStock(prev => ({ ...prev, [item.id]: editStockValue + 1 }))}
                                                                className="w-7 h-7 flex items-center justify-center rounded-md bg-gray-100 hover:bg-gray-200 border-none cursor-pointer transition"
                                                            ><Plus size={14} /></button>
                                                            <button
                                                                onClick={() => handleSetStock(item, editStockValue)}
                                                                disabled={saving === item.id}
                                                                className="p-1.5 rounded-md bg-emerald-500 text-white border-none cursor-pointer hover:bg-emerald-600 transition disabled:opacity-50"
                                                            ><Save size={12} /></button>
                                                            <button
                                                                onClick={() => setEditingStock(prev => { const n = { ...prev }; delete n[item.id]; return n; })}
                                                                className="p-1.5 rounded-md bg-gray-100 text-gray-600 border-none cursor-pointer hover:bg-gray-200 transition text-xs"
                                                            >✕</button>
                                                        </div>
                                                    ) : (
                                                        <button
                                                            onClick={() => setEditingStock(prev => ({ ...prev, [item.id]: item.defaultStock ?? 0 }))}
                                                            className="font-bold text-sm text-gray-800 bg-gray-50 hover:bg-gray-100 px-4 py-1.5 rounded-lg border border-gray-200 cursor-pointer transition"
                                                            title="Click to set stock level"
                                                        >
                                                            {item.defaultStock ?? 0}
                                                        </button>
                                                    )}
                                                </td>

                                                {/* Remaining Today (current stock after sales) */}
                                                <td className="px-5 py-3 text-center">
                                                    <span className={`font-bold text-lg ${stockStatus === 'out' ? 'text-red-600' : stockStatus === 'low' ? 'text-amber-600' : 'text-emerald-600'}`}>
                                                        {currentStock}
                                                    </span>
                                                </td>

                                                {/* Status */}
                                                <td className="px-5 py-3 text-center">
                                                    {stockStatus === 'out' ? (
                                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-600">
                                                            <AlertTriangle size={10} /> Out
                                                        </span>
                                                    ) : stockStatus === 'low' ? (
                                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-600">
                                                            <AlertTriangle size={10} /> Low
                                                        </span>
                                                    ) : (
                                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-600">
                                                            <CheckCircle size={10} /> OK
                                                        </span>
                                                    )}
                                                </td>

                                                {/* Actions */}
                                                <td className="px-5 py-3 text-center">
                                                    {isRestocking ? (
                                                        <div className="flex items-center justify-center gap-1">
                                                            <button
                                                                onClick={() => setRestocking(prev => ({ ...prev, [item.id]: Math.max(1, restockValue - 1) }))}
                                                                className="w-7 h-7 flex items-center justify-center rounded-md bg-gray-100 hover:bg-gray-200 border-none cursor-pointer transition"
                                                            ><Minus size={14} /></button>
                                                            <input
                                                                type="number"
                                                                value={restockValue}
                                                                onChange={(e) => setRestocking(prev => ({ ...prev, [item.id]: Math.max(1, Number(e.target.value) || 1) }))}
                                                                className="w-14 text-center py-1 border border-gray-300 rounded-md text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-brand/50"
                                                            />
                                                            <button
                                                                onClick={() => setRestocking(prev => ({ ...prev, [item.id]: restockValue + 1 }))}
                                                                className="w-7 h-7 flex items-center justify-center rounded-md bg-gray-100 hover:bg-gray-200 border-none cursor-pointer transition"
                                                            ><Plus size={14} /></button>
                                                            <button
                                                                onClick={() => handleRestock(item, restockValue)}
                                                                disabled={saving === item.id}
                                                                className="flex items-center gap-1 px-2 py-1.5 rounded-lg bg-blue-500 text-white text-xs font-semibold border-none cursor-pointer hover:bg-blue-600 transition disabled:opacity-50"
                                                            ><Plus size={12} /> Add</button>
                                                            <button
                                                                onClick={() => setRestocking(prev => { const n = { ...prev }; delete n[item.id]; return n; })}
                                                                className="px-2 py-1.5 rounded-lg bg-gray-100 text-gray-600 text-xs font-medium border-none cursor-pointer hover:bg-gray-200 transition"
                                                            >✕</button>
                                                        </div>
                                                    ) : (
                                                        <button
                                                            onClick={() => setRestocking(prev => ({ ...prev, [item.id]: 1 }))}
                                                            className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-blue-50 text-blue-600 text-xs font-semibold border-none cursor-pointer hover:bg-blue-100 transition mx-auto"
                                                            title="Add stock mid-day without changing the daily reset amount"
                                                        ><Package size={12} /> Restock</button>
                                                    )}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                        {/* Pagination */}
                        {Math.ceil(filteredItems.length / ITEMS_PER_PAGE) > 1 && (
                            <div className="bg-gray-50 border-t border-gray-200 px-6 py-4 flex items-center justify-between">
                                <div className="text-sm text-gray-600">
                                    Showing {(currentPage - 1) * ITEMS_PER_PAGE + 1} to {Math.min(currentPage * ITEMS_PER_PAGE, filteredItems.length)} of {filteredItems.length} items
                                </div>
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                        disabled={currentPage === 1}
                                        className="flex items-center gap-1 px-3 py-2 rounded-lg border border-gray-300 text-gray-700 text-sm font-medium hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition cursor-pointer bg-white"
                                    >
                                        <ChevronLeft size={16} /> Previous
                                    </button>
                                    <div className="flex items-center gap-2">
                                        {Array.from({ length: Math.ceil(filteredItems.length / ITEMS_PER_PAGE) }, (_, i) => i + 1).map(page => (
                                            <button
                                                key={page}
                                                onClick={() => setCurrentPage(page)}
                                                className={`w-8 h-8 rounded-lg text-sm font-medium transition cursor-pointer border-none ${currentPage === page
                                                    ? 'bg-brand text-brand-dark font-semibold'
                                                    : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-100'
                                                    }`}
                                            >{page}</button>
                                        ))}
                                    </div>
                                    <button
                                        onClick={() => setCurrentPage(p => Math.min(Math.ceil(filteredItems.length / ITEMS_PER_PAGE), p + 1))}
                                        disabled={currentPage === Math.ceil(filteredItems.length / ITEMS_PER_PAGE)}
                                        className="flex items-center gap-1 px-3 py-2 rounded-lg border border-gray-300 text-gray-700 text-sm font-medium hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition cursor-pointer bg-white"
                                    >
                                        Next <ChevronRight size={16} />
                                    </button>
                                </div>
                            </div>
                        )}
                    </>
                )}
            </div>

            {/* Set All Stock Modal */}
            {showGeneralModal && (
                <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50" onClick={() => setShowGeneralModal(false)}>
                    <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl" onClick={(e) => e.stopPropagation()}>
                        <h3 className="text-lg font-bold text-gray-800 mb-1">Set Stock for All Items</h3>
                        <p className="text-sm text-gray-500 mb-4">This sets the stock for <strong>every</strong> menu item. Each item can still be adjusted individually afterwards.</p>
                        <div className="flex items-center gap-3 mb-6">
                            <button
                                onClick={() => setGeneralDefault(Math.max(0, generalDefault - 5))}
                                className="w-10 h-10 flex items-center justify-center rounded-xl bg-gray-100 hover:bg-gray-200 border-none cursor-pointer transition text-lg font-bold"
                            >-</button>
                            <input
                                type="number"
                                value={generalDefault}
                                onChange={(e) => setGeneralDefault(Math.max(0, Number(e.target.value) || 0))}
                                className="flex-1 text-center py-3 border-2 border-brand rounded-xl text-2xl font-bold focus:outline-none focus:ring-2 focus:ring-brand/50"
                            />
                            <button
                                onClick={() => setGeneralDefault(generalDefault + 5)}
                                className="w-10 h-10 flex items-center justify-center rounded-xl bg-gray-100 hover:bg-gray-200 border-none cursor-pointer transition text-lg font-bold"
                            >+</button>
                        </div>
                        <div className="flex gap-2">
                            <button
                                onClick={() => setShowGeneralModal(false)}
                                className="flex-1 py-2.5 rounded-xl bg-gray-100 text-gray-700 font-semibold border-none cursor-pointer hover:bg-gray-200 transition"
                            >Cancel</button>
                            <button
                                onClick={handleSetGeneralDefault}
                                className="flex-1 py-2.5 rounded-xl bg-brand text-brand-dark font-bold border-none cursor-pointer hover:shadow-md transition"
                            >Apply to All</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
