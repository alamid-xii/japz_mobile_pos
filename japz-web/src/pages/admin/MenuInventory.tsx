import { useState, useEffect } from 'react';
import { Plus, X, Search, Edit2, AlertTriangle, CheckCircle, XCircle, ChevronLeft, ChevronRight, Power, Archive, RotateCcw } from 'lucide-react';
import { menuCategoryAPI, menuItemAPI } from '../../services/api';

interface Category { id: number; name: string; description?: string; icon?: string; status?: 'available' | 'unavailable'; }
interface SizeWithPrice { name: string; price: number; }
interface MenuItem {
    id: number; name: string; price: number; categoryId: number;
    status: 'available' | 'unavailable'; description?: string;
    hasSize?: boolean; sizes?: SizeWithPrice[]; hasFlavor?: boolean; flavors?: string[];
    hasTemperature?: boolean; temperatures?: string[];
    trackStock?: boolean; stock?: number | null;
    archived?: boolean;
}

// Alert Modal Component - Toast style for success, modal for errors/confirms
interface AlertModalProps {
    isOpen: boolean;
    type: 'success' | 'error' | 'confirm';
    title: string;
    message: string;
    onClose: () => void;
    onConfirm?: () => void;
    confirmButtonLabel?: string;
    confirmButtonColor?: 'red' | 'amber' | 'blue';
}

function AlertModal({ isOpen, type, title, message, onClose, onConfirm, confirmButtonLabel = 'Delete', confirmButtonColor = 'red' }: AlertModalProps) {
    useEffect(() => {
        if (isOpen && type === 'success') {
            const timer = setTimeout(() => {
                onClose();
            }, 800); // Auto-dismiss after 800ms - quick check animation
            return () => clearTimeout(timer);
        }
    }, [isOpen, type, onClose]);

    if (!isOpen) return null;

    const icons = {
        success: <CheckCircle size={type === 'success' ? 28 : 48} className="text-emerald-500" />,
        error: <XCircle size={48} className="text-red-500" />,
        confirm: <AlertTriangle size={48} className="text-amber-500" />
    };

    const bgColors = {
        success: 'bg-emerald-50',
        error: 'bg-red-50',
        confirm: 'bg-amber-50'
    };

    // Toast style for success - centered on screen
    if (type === 'success') {
        return (
            <div className="fixed inset-0 flex items-center justify-center z-[9999] pointer-events-none">
                <div className="bg-white rounded-xl px-6 py-5 shadow-2xl border border-emerald-200 flex flex-col items-center gap-3 min-w-[280px] animate-[popIn_0.1s_ease-out] pointer-events-auto">
                    <div className={`w-16 h-16 rounded-full ${bgColors.success} flex items-center justify-center`}>
                        <CheckCircle size={36} className="text-emerald-500" />
                    </div>
                    <div className="text-center">
                        <h3 className="font-bold text-base text-gray-900">{title}</h3>
                        <p className="text-sm text-gray-500 mt-1">{message}</p>
                    </div>
                    {/* Progress bar */}
                    <div className="w-full h-1 bg-emerald-100 rounded-full overflow-hidden mt-1">
                        <div className="h-full bg-emerald-500 animate-[shrink_0.8s_linear_forwards]" />
                    </div>
                </div>
                <style>{`
                    @keyframes popIn {
                        from { opacity: 0; transform: scale(0.5); }
                        to { opacity: 1; transform: scale(0.7); }
                    }
                    @keyframes shrink {
                        from { width: 100%; }
                        to { width: 0%; }
                    }
                `}</style>
            </div>
        );
    }

    // Modal style for error and confirm
    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[9999] p-4 animate-[fadeIn_0.2s]" onClick={onClose}>
            <div className={`bg-white rounded-xl p-6 w-full max-w-[380px] text-center`} onClick={e => e.stopPropagation()}>
                <div className={`w-20 h-20 rounded-full ${bgColors[type]} flex items-center justify-center mx-auto mb-4`}>
                    {icons[type]}
                </div>
                <h2 className="text-lg font-bold mb-2">{title}</h2>
                <p className="text-sm text-gray-600 mb-6">{message}</p>
                <div className="flex gap-3">
                    {type === 'confirm' ? (
                        <>
                            <button
                                className="flex-1 py-2.5 rounded-lg border border-gray-200 bg-white font-medium cursor-pointer hover:bg-gray-50 transition"
                                onClick={onClose}
                            >
                                Cancel
                            </button>
                            <button
                                className={`flex-1 py-2.5 rounded-lg border-none text-white font-semibold cursor-pointer transition ${confirmButtonColor === 'red' ? 'bg-red-500 hover:bg-red-600' :
                                    confirmButtonColor === 'amber' ? 'bg-amber-500 hover:bg-amber-600' :
                                        'bg-blue-500 hover:bg-blue-600'
                                    }`}
                                onClick={() => { onConfirm?.(); onClose(); }}
                            >
                                {confirmButtonLabel}
                            </button>
                        </>
                    ) : (
                        <button
                            className="flex-1 py-2.5 rounded-lg border-none bg-brand text-brand-dark font-semibold cursor-pointer hover:shadow-md transition"
                            onClick={onClose}
                        >
                            OK
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}

export default function MenuInventory() {
    const [categories, setCategories] = useState<Category[]>([]);
    const [items, setItems] = useState<MenuItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [showCatModal, setShowCatModal] = useState(false);
    const [showItemModal, setShowItemModal] = useState(false);
    const [editingCat, setEditingCat] = useState<Category | null>(null);
    const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCategory, setSelectedCategory] = useState<number | 'all'>('all');
    const [currentPage, setCurrentPage] = useState(1);
    const ITEMS_PER_PAGE = 10;
    const [viewMode, setViewMode] = useState<'items' | 'categories'>('items');
    const [catName, setCatName] = useState('');
    const [catDesc, setCatDesc] = useState('');
    const [itemName, setItemName] = useState('');
    const [itemPrice, setItemPrice] = useState('');
    const [itemCatId, setItemCatId] = useState<number | ''>('');
    const [itemHasSize, setItemHasSize] = useState(false);
    const [itemSizesData, setItemSizesData] = useState<SizeWithPrice[]>([{ name: '', price: 0 }]);
    const [itemHasFlavor, setItemHasFlavor] = useState(false);
    const [itemFlavors, setItemFlavors] = useState('');
    const [itemHasTemperature, setItemHasTemperature] = useState(false);
    const [itemTemperatures, setItemTemperatures] = useState({ hot: true, cold: true });
    const [itemTrackStock, setItemTrackStock] = useState(false);
    const [itemStock, setItemStock] = useState('');
    const [hasCombo, setHasCombo] = useState(false);
    const [comboSuffix, setComboSuffix] = useState('Combo');
    const [comboPrice, setComboPrice] = useState('');
    const [saving, setSaving] = useState(false);
    const [openMenuId, setOpenMenuId] = useState<number | null>(null);
    const [viewArchived, setViewArchived] = useState(false);

    // Alert modal state
    const [alertModal, setAlertModal] = useState<{
        isOpen: boolean;
        type: 'success' | 'error' | 'confirm';
        title: string;
        message: string;
        onConfirm?: () => void;
        confirmButtonLabel?: string;
        confirmButtonColor?: 'red' | 'amber' | 'blue';
    }>({ isOpen: false, type: 'success', title: '', message: '' });

    const showAlert = (type: 'success' | 'error', title: string, message: string) => {
        setAlertModal({ isOpen: true, type, title, message });
    };

    const showConfirm = (title: string, message: string, onConfirm: () => void, confirmButtonLabel = 'Delete', confirmButtonColor: 'red' | 'amber' | 'blue' = 'red') => {
        setAlertModal({ isOpen: true, type: 'confirm', title, message, onConfirm, confirmButtonLabel, confirmButtonColor });
    };

    const closeAlert = () => setAlertModal(prev => ({ ...prev, isOpen: false }));

    const fetchData = async () => {
        try {
            const [catRes, itemRes] = await Promise.all([menuCategoryAPI.getAll(), menuItemAPI.getAllAdmin()]);
            setCategories(catRes.data?.data || catRes.data || []);
            setItems((itemRes.data?.data || itemRes.data || []).map((i: any) => ({
                ...i,
                categoryId: i.categoryId || i.MenuCategoryId,
                price: Number(i.price || 0),
                // Ensure boolean fields are properly converted (database may return 0/1)
                hasSize: Boolean(i.hasSize),
                hasFlavor: Boolean(i.hasFlavor),
                hasTemperature: Boolean(i.hasTemperature),
                trackStock: Boolean(i.trackStock),
                stock: i.stock != null ? Number(i.stock) : null,
                archived: Boolean(i.archived),
            })));
        } catch (e) { console.error(e); }
        finally { setLoading(false); }
    };

    useEffect(() => { fetchData(); }, []);

    useEffect(() => {
        const handleClickOutside = () => setOpenMenuId(null);
        document.addEventListener('click', handleClickOutside);
        return () => document.removeEventListener('click', handleClickOutside);
    }, []);

    const openAddCategory = () => { setEditingCat(null); setCatName(''); setCatDesc(''); setShowCatModal(true); };
    const openEditCategory = (cat: Category) => { setEditingCat(cat); setCatName(cat.name); setCatDesc(cat.description || ''); setShowCatModal(true); };
    const handleSaveCategory = async () => {
        if (!catName.trim()) return;
        setSaving(true);
        try {
            if (editingCat) await menuCategoryAPI.update(editingCat.id, { name: catName.trim(), description: catDesc.trim() });
            else await menuCategoryAPI.create({ name: catName.trim(), description: catDesc.trim() });
            setShowCatModal(false); await fetchData();
            showAlert('success', 'Success', editingCat ? 'Category updated successfully!' : 'Category created successfully!');
        } catch (e: any) { showAlert('error', 'Error', e.response?.data?.message || 'Failed to save category'); }
        finally { setSaving(false); }
    };
    const openAddItem = (catId?: number) => {
        setEditingItem(null); setItemName(''); setItemPrice(''); setItemCatId(catId || '');
        setItemHasSize(false); setItemSizesData([{ name: '', price: 0 }]); setItemHasFlavor(false); setItemFlavors('');
        setItemHasTemperature(false); setItemTemperatures({ hot: true, cold: true });
        setItemTrackStock(false); setItemStock('');
        setHasCombo(false); setComboSuffix('Combo'); setComboPrice('');
        setShowItemModal(true);
    };
    const openEditItem = (item: MenuItem) => {
        setEditingItem(item); setItemName(item.name); setItemPrice(String(item.price));
        setItemCatId(item.categoryId); setItemHasSize(item.hasSize || false);
        // Handle sizes - can be array of objects or legacy string array
        if (item.sizes && item.sizes.length > 0) {
            const sizesData = item.sizes.map(s =>
                typeof s === 'object' ? s : { name: String(s), price: item.price }
            );
            setItemSizesData(sizesData);
        } else {
            setItemSizesData([{ name: '', price: 0 }]);
        }
        setItemHasFlavor(item.hasFlavor || false);
        setItemFlavors(item.flavors ? item.flavors.join(', ') : '');
        setItemHasTemperature(item.hasTemperature || false);
        if (item.temperatures && item.temperatures.length > 0) {
            setItemTemperatures({
                hot: item.temperatures.includes('Hot'),
                cold: item.temperatures.includes('Cold')
            });
        } else {
            setItemTemperatures({ hot: true, cold: true });
        }
        setItemTrackStock(item.trackStock || false);
        setItemStock(item.stock != null ? String(item.stock) : '');
        setHasCombo(false); setComboSuffix('Combo'); setComboPrice(''); // Combo only for new items
        setShowItemModal(true);
    };
    const handleSaveItem = async () => {
        // Validate base fields
        if (!itemName.trim() || !itemCatId) return;

        // If has sizes, validate sizes; otherwise validate base price
        const validSizes = itemSizesData.filter(s => s.name.trim() && s.price > 0);
        if (itemHasSize) {
            if (validSizes.length === 0) {
                showAlert('error', 'Error', 'Please add at least one size with name and price');
                return;
            }
        } else {
            if (!itemPrice) return;
        }

        if (hasCombo && !editingItem && (!comboPrice || !comboSuffix.trim())) {
            showAlert('error', 'Error', 'Please fill in combo suffix and price');
            return;
        }
        setSaving(true);

        // Use first size price as base price if has sizes, otherwise use itemPrice
        const basePrice = itemHasSize ? validSizes[0].price : Number(itemPrice);

        // Build temperatures array
        const temps: string[] = [];
        if (itemHasTemperature) {
            if (itemTemperatures.hot) temps.push('Hot');
            if (itemTemperatures.cold) temps.push('Cold');
        }

        const data: any = {
            name: itemName.trim(),
            price: basePrice,
            categoryId: Number(itemCatId),
            hasSize: itemHasSize,
            hasFlavor: itemHasFlavor,
            hasTemperature: itemHasTemperature,
            sizes: itemHasSize ? validSizes : [],
            flavors: itemHasFlavor ? itemFlavors.split(',').map(f => f.trim()).filter(Boolean) : [],
            temperatures: itemHasTemperature ? temps : [],
            trackStock: itemTrackStock,
            stock: itemTrackStock && itemStock ? Number(itemStock) : null,
        };
        try {
            if (editingItem) {
                await menuItemAPI.update(editingItem.id, data);
                showAlert('success', 'Success', 'Menu item updated successfully!');
            } else {
                // Create base item
                await menuItemAPI.create(data);

                // Create combo version if enabled
                if (hasCombo) {
                    const comboData = {
                        ...data,
                        name: `${itemName.trim()} ${comboSuffix.trim()}`,
                        price: Number(comboPrice),
                    };
                    await menuItemAPI.create(comboData);
                    showAlert('success', 'Success', 'Menu item and combo version created successfully!');
                } else {
                    showAlert('success', 'Success', 'Menu item created successfully!');
                }
            }
            setShowItemModal(false); await fetchData();
        } catch (e: any) { showAlert('error', 'Error', e.response?.data?.message || 'Failed to save item'); }
        finally { setSaving(false); }
    };
    const archiveItem = async (item: MenuItem) => {
        showConfirm(
            'Archive Menu Item',
            `Archive "${item.name}"? You can restore it from the archived items view.`,
            async () => {
                try {
                    await menuItemAPI.update(item.id, { archived: true });
                    await fetchData();
                    showAlert('success', 'Archived', 'Menu item archived successfully!');
                }
                catch (e: any) { showAlert('error', 'Error', e.response?.data?.message || 'Failed to archive item'); }
            },
            'Archive',
            'amber'
        );
    };

    const restoreItem = async (item: MenuItem) => {
        showConfirm(
            'Restore Menu Item',
            `Restore "${item.name}" to active items?`,
            async () => {
                try {
                    await menuItemAPI.update(item.id, { archived: false });
                    await fetchData();
                    showAlert('success', 'Restored', 'Menu item restored successfully!');
                }
                catch (e: any) { showAlert('error', 'Error', e.response?.data?.message || 'Failed to restore item'); }
            },
            'Restore',
            'blue'
        );
    };

    const toggleItemStatus = async (item: MenuItem) => {
        const newStatus = item.status === 'available' ? 'unavailable' : 'available';
        const message = newStatus === 'unavailable'
            ? `Make "${item.name}" unavailable? It won't appear in the POS.`
            : `Make "${item.name}" available again? It will appear in the POS.`;
        const buttonLabel = newStatus === 'unavailable' ? 'Disable' : 'Enable';
        const buttonColor: 'amber' | 'blue' = newStatus === 'unavailable' ? 'amber' : 'blue';

        showConfirm(
            `${buttonLabel} Item`,
            message,
            async () => {
                try {
                    await menuItemAPI.update(item.id, { status: newStatus });
                    await fetchData();
                    showAlert('success', 'Success', `Item ${newStatus === 'unavailable' ? 'disabled' : 'enabled'} successfully!`);
                }
                catch (e) {
                    console.error(e);
                    showAlert('error', 'Error', 'Failed to update item status');
                }
            },
            buttonLabel,
            buttonColor
        );
    };
    const toggleCategoryStatus = async (cat: Category) => {
        const newStatus = cat.status === 'available' ? 'unavailable' : 'available';
        const message = newStatus === 'unavailable'
            ? `Disable "${cat.name}"? All items in this category will be temporarily unavailable.`
            : `Enable "${cat.name}"? All items in this category will be available.`;
        const buttonLabel = newStatus === 'unavailable' ? 'Disable' : 'Enable';
        const buttonColor: 'amber' | 'blue' = newStatus === 'unavailable' ? 'amber' : 'blue';

        showConfirm(
            `${buttonLabel} Category`,
            message,
            async () => {
                try {
                    await menuCategoryAPI.update(cat.id, { status: newStatus });
                    await fetchData();
                    showAlert('success', 'Success', `Category ${newStatus === 'unavailable' ? 'disabled' : 'enabled'} successfully!`);
                }
                catch (e) {
                    console.error(e);
                    showAlert('error', 'Error', 'Failed to update category status');
                }
            },
            buttonLabel,
            buttonColor
        );
    };

    if (loading) return <div className="spinner" />;

    const inputCls = "w-full px-3 py-2.5 border border-gray-200 rounded-lg bg-gray-50 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/15 transition font-[inherit]";

    // Filter items based on search and category
    const filteredItems = items.filter(item => {
        const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesCategory = selectedCategory === 'all' || item.categoryId === selectedCategory;
        const matchesArchiveStatus = viewArchived ? (item as any).archived === true : (item as any).archived !== true;
        return matchesSearch && matchesCategory && matchesArchiveStatus;
    });

    // Filter categories based on search
    const filteredCategories = categories.filter(cat =>
        cat.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    // Pagination for items
    const totalPages = Math.ceil(filteredItems.length / ITEMS_PER_PAGE);
    const startIdx = (currentPage - 1) * ITEMS_PER_PAGE;
    const paginatedItems = filteredItems.slice(startIdx, startIdx + ITEMS_PER_PAGE);

    // Pagination for categories
    const categoryTotalPages = Math.ceil(filteredCategories.length / ITEMS_PER_PAGE);
    const categoryStartIdx = (currentPage - 1) * ITEMS_PER_PAGE;
    const paginatedCategories = filteredCategories.slice(categoryStartIdx, categoryStartIdx + ITEMS_PER_PAGE);

    const handlePreviousPage = () => setCurrentPage(prev => Math.max(1, prev - 1));
    const handleNextPage = () => setCurrentPage(prev => Math.min(viewMode === 'items' ? totalPages : categoryTotalPages, prev + 1));

    return (
        <div className="p-2 md:p-4 h-full overflow-y-auto bg-gradient-to-b from-white to-slate-100">
            {/* Header */}
            <div className="mb-4 flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-yellow-900">Menu & Inventory</h1>
                    <p className="text-gray-500 text-sm">Manage menu items and categories</p>
                </div>
                {viewMode === 'items' && (
                    <button
                        onClick={() => { setViewArchived(!viewArchived); setCurrentPage(1); }}
                        className={`px-4 py-2 rounded-lg text-sm font-medium cursor-pointer transition border-none flex items-center gap-2 ${viewArchived
                            ? 'bg-amber-100 text-amber-700 hover:bg-amber-200'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                            }`}>
                        <Archive size={16} />
                        {viewArchived ? 'Archived Items' : 'View Archived'}
                    </button>
                )}
            </div>

            {/* Controls - Search and Filters */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-4">
                <div className="flex gap-2">
                    <button onClick={() => { setViewMode('categories'); setCurrentPage(1); }}
                        className={`flex items-center gap-1 px-4 py-2 rounded-lg text-sm font-medium cursor-pointer transition ${viewMode === 'categories'
                            ? 'border-none bg-brand text-brand-dark hover:shadow-md hover:shadow-yellow-300/40'
                            : 'border border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
                            }`}>
                        Category
                    </button>
                    <button onClick={() => { setViewMode('items'); setCurrentPage(1); }}
                        className={`flex items-center gap-1 px-4 py-2 rounded-lg text-sm font-medium cursor-pointer transition ${viewMode === 'items'
                            ? 'border-none bg-brand text-brand-dark hover:shadow-md hover:shadow-yellow-300/40'
                            : 'border border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
                            }`}>
                        Menu Item
                    </button>
                    <button
                        onClick={() => viewMode === 'categories' ? openAddCategory() : openAddItem()}
                        className="flex items-center gap-1 px-4 py-2 rounded-lg border-none bg-emerald-500 text-white text-sm font-medium cursor-pointer hover:bg-emerald-600 transition">
                        <Plus size={16} /> Add {viewMode === 'categories' ? 'Category' : 'Item'}
                    </button>
                </div>
                <div className="flex gap-3 items-center">
                    <div className="relative w-64">
                        <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                            type="text"
                            placeholder={viewMode === 'items' ? "Search menu items..." : "Search categories..."}
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg bg-white text-sm focus:outline-none focus:ring-2 focus:ring-brand/50"
                        />
                    </div>
                </div>
            </div>

            {/* Category Filter - Only show when viewing items */}
            {viewMode === 'items' && categories.length > 0 && (
                <div className="mb-4 flex gap-2 flex-wrap">
                    <button
                        onClick={() => setSelectedCategory('all')}
                        className={`px-3 py-1.5 rounded-lg text-sm font-medium transition cursor-pointer ${selectedCategory === 'all'
                            ? 'bg-brand text-brand-dark'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                            }`}
                    >
                        All Categories
                    </button>
                    {categories.map(cat => (
                        <button
                            key={cat.id}
                            onClick={() => setSelectedCategory(cat.id)}
                            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition cursor-pointer ${selectedCategory === cat.id
                                ? 'bg-brand text-brand-dark'
                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                }`}
                        >
                            {cat.name}
                        </button>
                    ))}
                </div>
            )}

            {/* Data Table - Conditional rendering based on viewMode */}
            {viewMode === 'items' ? (
                // MENU ITEMS VIEW
                categories.length === 0 ? (
                    <div className="flex flex-col items-center justify-center text-gray-500 gap-2 py-8"><p>No categories yet. Add one to get started!</p></div>
                ) : filteredItems.length === 0 ? (
                    <div className="flex flex-col items-center justify-center text-gray-500 gap-2 py-8"><p>{viewArchived ? 'No item in archive' : (searchQuery ? 'No menu items match your search' : 'No items in this category')}</p></div>
                ) : (
                    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead className="bg-yellow-100 border-b border-gray-200">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700">Item Name</th>
                                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700">Category</th>
                                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700">Price</th>
                                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700">Options</th>
                                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700">Status</th>
                                        <th className="px-6 py-3 text-right text-xs font-semibold text-gray-700">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200">
                                    {paginatedItems.map(item => {
                                        const category = categories.find(c => c.id === item.categoryId);
                                        return (
                                            <tr key={item.id} className="hover:bg-yellow-50 transition">
                                                <td className="px-6 py-3">
                                                    <div className="font-semibold text-sm text-gray-800">{item.name}</div>
                                                    {item.description && <div className="text-xs text-gray-500 mt-0.5">{item.description}</div>}
                                                </td>
                                                <td className="px-6 py-3 text-sm text-gray-600">{category?.name || '-'}</td>
                                                <td className="px-6 py-3">
                                                    {item.hasSize && item.sizes && item.sizes.length > 0 ? (
                                                        <div className="text-sm">
                                                            {item.sizes.map((s, i) => (
                                                                <div key={i} className="text-xs text-gray-600">
                                                                    {typeof s === 'object' ? `${s.name}: ₱${Number(s.price).toFixed(2)}` : s}
                                                                </div>
                                                            ))}
                                                        </div>
                                                    ) : (
                                                        <div className="text-sm font-medium text-gray-800">₱{item.price.toFixed(2)}</div>
                                                    )}
                                                </td>
                                                <td className="px-6 py-3 text-sm">
                                                    <div className="flex flex-wrap gap-1">
                                                        {item.hasSize && <span className="inline-block px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded-full">Size</span>}
                                                        {item.hasFlavor && <span className="inline-block px-2 py-0.5 bg-purple-100 text-purple-700 text-xs rounded-full">Flavor</span>}
                                                        {item.hasTemperature && <span className="inline-block px-2 py-0.5 bg-orange-100 text-orange-700 text-xs rounded-full">Temp</span>}
                                                    </div>
                                                </td>

                                                <td className="px-6 py-3">
                                                    <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-semibold ${item.status === 'available'
                                                            ? 'bg-emerald-100 text-emerald-600'
                                                            : 'bg-red-100 text-red-600'
                                                            }`}
                                                    >
                                                        {item.status || 'available'}
                                                    </span>
                                                </td>

                                                <td className="px-6 py-3">
                                                    <div className="flex items-center justify-end gap-1.5 relative">
                                                        <button
                                                            onClick={() => openEditItem(item)}
                                                            title="Edit"
                                                            className="p-1.5 rounded-lg text-blue-600 hover:bg-blue-100 transition cursor-pointer border-none bg-transparent"
                                                        >
                                                            <Edit2 size={16} />
                                                        </button>
                                                        <button
                                                            onClick={() => toggleItemStatus(item)}
                                                            title={item.status === 'available' ? 'Disable' : 'Enable'}
                                                            className="p-1.5 rounded-lg text-gray-600 hover:bg-gray-100 transition cursor-pointer border-none bg-transparent"
                                                        >
                                                            <Power size={16} />
                                                        </button>
                                                        {!viewArchived ? (
                                                            <button
                                                                onClick={() => archiveItem(item)}
                                                                title="Archive"
                                                                className="p-1.5 rounded-lg text-amber-600 hover:bg-amber-100 transition cursor-pointer border-none bg-transparent"
                                                            >
                                                                <Archive size={16} />
                                                            </button>
                                                        ) : (
                                                            <button
                                                                onClick={() => restoreItem(item)}
                                                                title="Restore"
                                                                className="p-1.5 rounded-lg text-green-600 hover:bg-green-100 transition cursor-pointer border-none bg-transparent"
                                                            >
                                                                <RotateCcw size={16} />
                                                            </button>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>

                        {/* Pagination */}
                        {totalPages > 1 && (
                            <div className="bg-gray-50 border-t border-gray-200 px-6 py-4 flex items-center justify-between">
                                <div className="text-sm text-gray-600">
                                    Showing {startIdx + 1} to {Math.min(startIdx + ITEMS_PER_PAGE, filteredItems.length)} of {filteredItems.length} items
                                </div>
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={handlePreviousPage}
                                        disabled={currentPage === 1}
                                        className="flex items-center gap-1 px-3 py-2 rounded-lg border border-gray-300 text-gray-700 text-sm font-medium hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition cursor-pointer bg-white"
                                    >
                                        <ChevronLeft size={16} />
                                        Previous
                                    </button>
                                    <div className="flex items-center gap-2">
                                        {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                                            <button
                                                key={page}
                                                onClick={() => setCurrentPage(page)}
                                                className={`w-8 h-8 rounded-lg text-sm font-medium transition cursor-pointer border-none ${currentPage === page
                                                    ? 'bg-brand text-brand-dark font-semibold'
                                                    : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-100'
                                                    }`}
                                            >
                                                {page}
                                            </button>
                                        ))}
                                    </div>
                                    <button
                                        onClick={handleNextPage}
                                        disabled={currentPage === totalPages}
                                        className="flex items-center gap-1 px-3 py-2 rounded-lg border border-gray-300 text-gray-700 text-sm font-medium hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition cursor-pointer bg-white"
                                    >
                                        Next
                                        <ChevronRight size={16} />
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                )
            ) : (
                categories.length === 0 ? (
                    <div className="flex flex-col items-center justify-center text-gray-500 gap-2 py-8"><p>No categories yet. Click the Category button to add one!</p></div>
                ) : filteredCategories.length === 0 ? (
                    <div className="flex flex-col items-center justify-center text-gray-500 gap-2 py-8"><p>No categories match your search</p></div>
                ) : (
                    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead className="bg-yellow-100 border-b border-gray-200">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700">Category Name</th>
                                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700">Items Count</th>
                                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700">Status</th>
                                        <th className="px-6 py-3 text-right text-xs font-semibold text-gray-700">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200">
                                    {paginatedCategories.map(cat => {
                                        const itemCount = items.filter(item => item.categoryId === cat.id).length;
                                        const catStatus = cat.status || 'available';
                                        return (
                                            <tr key={cat.id} className={`hover:bg-yellow-50 transition ${catStatus === 'unavailable' ? 'opacity-60' : ''}`}>
                                                <td className="px-6 py-3">
                                                    <div className="font-semibold text-sm text-gray-800">{cat.name}</div>
                                                </td>
                                                <td className="px-6 py-3 text-sm">
                                                    <span className="inline-block px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-semibold">
                                                        {itemCount} item{itemCount !== 1 ? 's' : ''}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-3">
                                                    <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-semibold ${catStatus === 'available'
                                                            ? 'bg-emerald-100 text-emerald-600'
                                                            : 'bg-red-100 text-red-600'
                                                            }`}
                                                    >
                                                        {catStatus}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-3">
                                                    <div className="flex items-center justify-end gap-1.5 relative">
                                                        <button
                                                            onClick={() => openEditCategory(cat)}
                                                            title="Edit"
                                                            className="p-1.5 rounded-lg text-blue-600 hover:bg-blue-100 transition cursor-pointer border-none bg-transparent"
                                                        >
                                                            <Edit2 size={16} />
                                                        </button>
                                                        <div className="relative">
                                                            <button
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    setOpenMenuId(openMenuId === cat.id ? null : cat.id);
                                                                }}
                                                                title="Enable/Disable"
                                                                className="p-1.5 rounded-lg text-gray-600 hover:bg-gray-100 transition cursor-pointer border-none bg-transparent"
                                                            >
                                                                <Power size={16} />
                                                            </button>
                                                            {openMenuId === cat.id && (
                                                                <div onClick={(e) => e.stopPropagation()} className="absolute right-0 mt-1 w-40 bg-white border border-gray-200 rounded-lg shadow-lg z-10 overflow-hidden">
                                                                    <button
                                                                        onClick={() => {
                                                                            toggleCategoryStatus(cat);
                                                                            setOpenMenuId(null);
                                                                        }}
                                                                        className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 transition cursor-pointer border-none bg-transparent flex items-center gap-2"
                                                                    >
                                                                        <Power size={14} />
                                                                        {catStatus === 'available' ? 'Disable' : 'Enable'}
                                                                    </button>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>

                        {/* Pagination */}
                        {categoryTotalPages > 1 && (
                            <div className="bg-gray-50 border-t border-gray-200 px-6 py-4 flex items-center justify-between">
                                <div className="text-sm text-gray-600">
                                    Showing {categoryStartIdx + 1} to {Math.min(categoryStartIdx + ITEMS_PER_PAGE, filteredCategories.length)} of {filteredCategories.length} categories
                                </div>
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={handlePreviousPage}
                                        disabled={currentPage === 1}
                                        className="flex items-center gap-1 px-3 py-2 rounded-lg border border-gray-300 text-gray-700 text-sm font-medium hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition cursor-pointer bg-white"
                                    >
                                        <ChevronLeft size={16} />
                                        Previous
                                    </button>
                                    <div className="flex items-center gap-2">
                                        {Array.from({ length: categoryTotalPages }, (_, i) => i + 1).map(page => (
                                            <button
                                                key={page}
                                                onClick={() => setCurrentPage(page)}
                                                className={`w-8 h-8 rounded-lg text-sm font-medium transition cursor-pointer border-none ${currentPage === page
                                                    ? 'bg-brand text-brand-dark font-semibold'
                                                    : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-100'
                                                    }`}
                                            >
                                                {page}
                                            </button>
                                        ))}
                                    </div>
                                    <button
                                        onClick={handleNextPage}
                                        disabled={currentPage === categoryTotalPages}
                                        className="flex items-center gap-1 px-3 py-2 rounded-lg border border-gray-300 text-gray-700 text-sm font-medium hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition cursor-pointer bg-white"
                                    >
                                        Next
                                        <ChevronRight size={16} />
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                )
            )}

            {/* Category Modal */}
            {showCatModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[9990] p-4 animate-[fadeIn_0.2s]" onClick={() => setShowCatModal(false)}>
                    <div className="bg-white rounded-xl p-6 w-full max-w-[420px]" onClick={e => e.stopPropagation()}>
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-lg font-bold">{editingCat ? 'Edit Category' : 'Add Category'}</h2>
                            <button onClick={() => setShowCatModal(false)} className="border-none bg-transparent cursor-pointer"><X size={20} /></button>
                        </div>
                        <div className="flex flex-col gap-1 mb-3">
                            <label className="text-[13px] font-medium">Category Name *</label>
                            <input type="text" value={catName} onChange={e => setCatName(e.target.value)} placeholder="e.g. Main Dishes" autoFocus className={inputCls} />
                        </div>
                        <div className="flex flex-col gap-1 mb-4">
                            <label className="text-[13px] font-medium">Description</label>
                            <input type="text" value={catDesc} onChange={e => setCatDesc(e.target.value)} placeholder="Optional description" className={inputCls} />
                        </div>
                        <div className="flex gap-3">
                            <button className="flex-1 py-3 rounded-lg border border-gray-200 bg-transparent font-medium cursor-pointer" onClick={() => setShowCatModal(false)}>Cancel</button>
                            <button className="flex-1 py-3 rounded-lg border-none bg-brand text-brand-dark font-semibold cursor-pointer disabled:opacity-60" onClick={handleSaveCategory} disabled={saving || !catName.trim()}>
                                {saving ? 'Saving...' : (editingCat ? 'Update' : 'Create')}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Item Modal */}
            {showItemModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[9990] p-4 animate-[fadeIn_0.2s]" onClick={() => setShowItemModal(false)}>
                    <div className="bg-white rounded-xl p-6 w-full max-w-[480px] max-h-[85vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-lg font-bold">{editingItem ? 'Edit Menu Item' : 'Add Menu Item'}</h2>
                            <button onClick={() => setShowItemModal(false)} className="border-none bg-transparent cursor-pointer"><X size={20} /></button>
                        </div>
                        <div className="flex flex-col gap-1 mb-3">
                            <label className="text-[13px] font-medium">Item Name *</label>
                            <input type="text" value={itemName} onChange={e => setItemName(e.target.value)} placeholder="e.g. Adobo" autoFocus className={inputCls} />
                        </div>
                        <div className="flex flex-col gap-1 mb-3">
                            <label className="text-[13px] font-medium">Category *</label>
                            <select value={itemCatId} onChange={e => setItemCatId(Number(e.target.value) || '')}
                                className="w-full px-3 py-2.5 rounded-lg border border-gray-200 text-sm font-[inherit] bg-white">
                                <option value="">Select category</option>
                                {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                            </select>
                        </div>
                        <div className="flex items-center gap-2 mb-2">
                            <input type="checkbox" id="hasFlavor" checked={itemHasFlavor} onChange={e => setItemHasFlavor(e.target.checked)} />
                            <label htmlFor="hasFlavor" className="text-sm font-medium">Has Flavors</label>
                        </div>
                        {itemHasFlavor && (
                            <div className="flex flex-col gap-1 mb-3">
                                <label className="text-[13px] font-medium">Flavors (comma-separated)</label>
                                <input type="text" value={itemFlavors} onChange={e => setItemFlavors(e.target.value)} placeholder="Vanilla, Chocolate, Strawberry" className={inputCls} />
                            </div>
                        )}
                        <div className="flex items-center gap-2 mb-2">
                            <input type="checkbox" id="hasTemperature" checked={itemHasTemperature} onChange={e => setItemHasTemperature(e.target.checked)} />
                            <label htmlFor="hasTemperature" className="text-sm font-medium">Has Temperature(Hot/Cold)</label>
                        </div>
                        {itemHasTemperature && (
                            <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 mb-3">
                                <label className="text-[13px] font-medium mb-2 block">Available Temperatures</label>
                                <div className="flex gap-4">
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={itemTemperatures.hot}
                                            onChange={e => setItemTemperatures({ ...itemTemperatures, hot: e.target.checked })}
                                            className="w-4 h-4"
                                        />
                                        <span className="text-sm flex items-center gap-1">
                                            <span className="text-red-500">🔥</span> Hot
                                        </span>
                                    </label>
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={itemTemperatures.cold}
                                            onChange={e => setItemTemperatures({ ...itemTemperatures, cold: e.target.checked })}
                                            className="w-4 h-4"
                                        />
                                        <span className="text-sm flex items-center gap-1">
                                            <span className="text-blue-500">❄️</span> Cold
                                        </span>
                                    </label>
                                </div>
                            </div>
                        )}
                        <div className="flex items-center gap-2 mb-2">
                            <input type="checkbox" id="hasSize" checked={itemHasSize} onChange={e => setItemHasSize(e.target.checked)} />
                            <label htmlFor="hasSize" className="text-sm font-medium">Has Sizes</label>
                        </div>
                        {itemHasSize && (
                            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-3">
                                <div className="flex justify-between items-center mb-2">
                                    <label className="text-[13px] font-medium">Sizes & Prices</label>
                                    <button
                                        type="button"
                                        onClick={() => setItemSizesData([...itemSizesData, { name: '', price: 0 }])}
                                        className="text-xs text-blue-600 hover:text-blue-800 font-medium flex items-center gap-1"
                                    >
                                        <Plus size={12} /> Add Size
                                    </button>
                                </div>
                                <div className="flex flex-col gap-2">
                                    {itemSizesData.map((size, index) => (
                                        <div key={index} className="flex gap-2 items-center">
                                            <input
                                                type="text"
                                                value={size.name}
                                                onChange={e => {
                                                    const newSizes = [...itemSizesData];
                                                    newSizes[index].name = e.target.value;
                                                    setItemSizesData(newSizes);
                                                }}
                                                placeholder="Size name (e.g. Small)"
                                                className={`flex-1 ${inputCls}`}
                                            />
                                            <div className="flex items-center gap-1">
                                                <span className="text-sm text-gray-500">₱</span>
                                                <input
                                                    type="number"
                                                    value={size.price || ''}
                                                    onChange={e => {
                                                        const newSizes = [...itemSizesData];
                                                        newSizes[index].price = Number(e.target.value);
                                                        setItemSizesData(newSizes);
                                                    }}
                                                    placeholder="0.00"
                                                    min="0"
                                                    step="0.01"
                                                    className={`w-24 ${inputCls}`}
                                                />
                                            </div>
                                            {itemSizesData.length > 1 && (
                                                <button
                                                    type="button"
                                                    onClick={() => setItemSizesData(itemSizesData.filter((_, i) => i !== index))}
                                                    className="text-red-500 hover:text-red-700 p-1"
                                                >
                                                    <X size={16} />
                                                </button>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                        {!itemHasSize && (
                            <div className="flex flex-col gap-1 mb-3">
                                <label className="text-[13px] font-medium">Base Price (₱) *</label>
                                <input type="number" value={itemPrice} onChange={e => setItemPrice(e.target.value)} placeholder="0.00" min="0" step="0.01" className={inputCls} />
                            </div>
                        )}
                        {!editingItem && (
                            <>
                                <div className="flex items-center gap-2 mb-2">
                                    <input type="checkbox" id="hasCombo" checked={hasCombo} onChange={e => setHasCombo(e.target.checked)} />
                                    <label htmlFor="hasCombo" className="text-sm font-medium">Also create Combo version</label>
                                </div>
                                {hasCombo && (
                                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-3">
                                        <p className="text-xs text-amber-700 mb-2">Combo version will be created with a different name and price</p>
                                        <div className="flex gap-3">
                                            <div className="flex-1 flex flex-col gap-1">
                                                <label className="text-[12px] font-medium">Name Suffix</label>
                                                <input type="text" value={comboSuffix} onChange={e => setComboSuffix(e.target.value)} placeholder="Combo" className={inputCls} />
                                                <span className="text-[11px] text-gray-500">Result: {itemName.trim() || 'Item'} {comboSuffix.trim()}</span>
                                            </div>
                                            <div className="flex-1 flex flex-col gap-1">
                                                <label className="text-[12px] font-medium">Combo Price (₱)</label>
                                                <input type="number" value={comboPrice} onChange={e => setComboPrice(e.target.value)} placeholder="0.00" min="0" step="0.01" className={inputCls} />
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </>
                        )}


                        <div className="flex gap-3 mt-4">
                            <button className="flex-1 py-3 rounded-lg border border-gray-200 bg-transparent font-medium cursor-pointer" onClick={() => setShowItemModal(false)}>Cancel</button>
                            <button className="flex-1 py-3 rounded-lg border-none bg-brand text-brand-dark font-semibold cursor-pointer disabled:opacity-60"
                                onClick={handleSaveItem} disabled={saving || !itemName.trim() || !itemCatId || (!itemHasSize && !itemPrice) || (itemHasSize && itemSizesData.filter(s => s.name.trim() && s.price > 0).length === 0)}>
                                {saving ? 'Saving...' : (editingItem ? 'Update' : 'Create')}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Alert Modal */}
            <AlertModal
                isOpen={alertModal.isOpen}
                type={alertModal.type}
                title={alertModal.title}
                message={alertModal.message}
                onClose={closeAlert}
                onConfirm={alertModal.onConfirm}
                confirmButtonLabel={alertModal.confirmButtonLabel}
                confirmButtonColor={alertModal.confirmButtonColor}
            />
        </div>
    );
}
