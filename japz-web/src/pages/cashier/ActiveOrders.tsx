import { useState, useEffect } from 'react';
import { ordersAPI } from '../../services/api';
import { Clock, Loader2, ClipboardList, UtensilsCrossed, User, StickyNote, CheckCircle2, X } from 'lucide-react';

type OrderStatus = 'pending' | 'preparing' | 'ready';

export default function ActiveOrders() {
    const [orders, setOrders] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<OrderStatus>('pending');
    const [selectedCustomer, setSelectedCustomer] = useState<string | null>(null);

    const fetchOrders = async () => {
        try { 
            const res = await ordersAPI.getAll(); 
            const allOrders = Array.isArray(res.data) ? res.data : (res.data?.data || []);
            const activeOnes = allOrders.filter((o: any) => 
                o.status === 'pending' || o.status === 'preparing' || o.status === 'ready'
            );
            setOrders(activeOnes); 
        }
        catch (e) { console.error(e); }
        finally { setLoading(false); }
    };

    useEffect(() => { 
        fetchOrders(); 
        const id = setInterval(fetchOrders, 5000); 
        return () => clearInterval(id); 
    }, []);

    const filteredOrders = orders.filter(o => o.status === activeTab);

    const getWaitTime = (createdAt: string) => {
        const diff = Math.floor((new Date().getTime() - new Date(createdAt).getTime()) / 60000);
        return diff < 1 ? 'Just now' : `${diff}m ago`;
    };

    const getCustomerOrders = (customerName: string) => {
        return orders.filter(o => (o.customerName || 'Walk-in') === customerName);
    };

    if (loading && orders.length === 0) return (
        <div className="flex flex-col items-center justify-center h-[60vh] text-gray-400 font-medium">
            <Loader2 className="animate-spin mb-3 text-brand" size={40} />
            <p className="animate-pulse">Syncing active orders...</p>
        </div>
    );

    return (
        <div className="p-2 md:p-4 h-full overflow-y-auto bg-gradient-to-b from-white to-slate-100">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 mb-8">
                <div>
                    <h1 className="text-2xl font-bold text-yellow-900">Active Orders</h1>
                    <p className="text-gray-500 text-sm">Track progress from kitchen to customer</p>
                </div>
                
                {/* Modern Tabs */}
                <div className="flex gap-2">
                    {[
                        { id: 'pending', label: 'Pending', icon: Clock, color: 'text-orange-500', bg: 'bg-orange-50' },
                        { id: 'preparing', label: 'Preparing', icon: Loader2, color: 'text-blue-500', bg: 'bg-blue-50' },
                        { id: 'ready', label: 'Ready', icon: CheckCircle2, color: 'text-emerald-500', bg: 'bg-emerald-50' }
                    ].map((tab) => {
                        const count = orders.filter(o => o.status === tab.id).length;
                        const Icon = tab.icon;
                        const isActive = activeTab === tab.id;
                        
                        return (
                            <button 
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id as any)}
                                className={`flex items-center gap-1 px-4 py-2 rounded-lg text-sm font-medium cursor-pointer transition ${
                                    isActive ? 'border-none bg-brand text-brand-dark hover:shadow-md hover:shadow-yellow-300/40' : 'border border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
                                }`}
                            >
                                <Icon size={18} className={isActive && tab.id === 'preparing' ? 'animate-spin' : ''} />
                                {tab.label}
                                {count > 0 && (
                                    <span className={`px-2 py-0.5 rounded-lg text-[10px] font-black ${
                                        isActive ? 'bg-white/20 text-white' : `${tab.bg} ${tab.color}`
                                    }`}>
                                        {count}
                                    </span>
                                )}
                            </button>
                        );
                    })}
                </div>
            </div>

            {filteredOrders.length === 0 ? (
                <div className="flex flex-col items-center justify-center bg-white border-2 border-dashed border-gray-200 rounded-xl py-24 text-gray-400 gap-4 shadow-sm">
                    <div className="bg-gray-50 p-6 rounded-full border border-gray-100">
                        <ClipboardList size={48} className="text-gray-200" />
                    </div>
                    <div className="text-center px-6">
                        <p className="font-black text-xl text-gray-700 tracking-tight">No {activeTab} orders at the moment</p>
                        <p className="text-gray-400 max-w-xs mx-auto">New orders will automatically appear here as they are processed</p>
                    </div>
                </div>
            ) : (
                <>
                    {/* Mobile Card View */}
                    <div className="block md:hidden">
                        <div className="grid grid-cols-1 gap-6">
                    {filteredOrders.map((o: any) => (
                        <div key={o.id} className={`group bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm hover:shadow-2xl transition-all duration-500 transform hover:-translate-y-1`}>
                            {/* Card Header */}
                            <div className={`p-4 flex justify-between items-center ${
                                activeTab === 'pending' ? 'bg-orange-50/50' : 
                                activeTab === 'preparing' ? 'bg-blue-50/50' : 'bg-emerald-50/50'
                            }`}>
                                <div>
                                    <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest block">ORDER</span>
                                    <span className="font-black text-2xl text-gray-900 tracking-tight">#{o.orderNumber}</span>
                                </div>
                                <div className="text-right">
                                    <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest block">WAIT TIME</span>
                                    <div className="text-xs font-black text-gray-700 flex items-center justify-end gap-1">
                                        <Clock size={12} className="text-brand" />
                                        {getWaitTime(o.createdAt)}
                                    </div>
                                </div>
                            </div>

                            <div className="p-5 space-y-5">
                                {/* Customer Summary */}
                                <div className="flex items-center justify-between pb-4 border-b border-gray-50">
                                    <div className="flex items-center gap-2">
                                        <div className="bg-gray-100 p-2 rounded-xl">
                                            <User size={16} className="text-gray-500" />
                                        </div>
                                        <div>
                                            <span className="text-[10px] text-gray-400 font-bold uppercase block tracking-tighter">CUSTOMER</span>
                                            <span className="text-sm font-black text-gray-800">{o.customerName || 'Walk-in'}</span>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <span className="text-[10px] text-gray-400 font-bold uppercase block tracking-tighter">TYPE</span>
                                        <span className="text-xs font-black text-gray-700 capitalize p-1 px-2 bg-gray-50 rounded-lg border border-gray-100">
                                            {o.orderType?.replace('-', ' ') || 'Dine-in'}
                                        </span>
                                    </div>
                                </div>

                                {/* Order Items (Kitchen Style) */}
                                <div className="space-y-3 cursor-pointer" onClick={() => setSelectedCustomer(o.customerName || 'Walk-in')}>
                                    <div className="flex items-center gap-2 mb-1">
                                        <UtensilsCrossed size={14} className="text-gray-400" />
                                        <span className="text-[10px] text-gray-400 font-black uppercase tracking-widest">ORDER DETAIL</span>
                                    </div>
                                    <div className="space-y-2.5">
                                        {o.items?.map((item: any, idx: number) => (
                                            <div key={idx} className="bg-slate-50/50 rounded-xl p-3 border border-slate-100 group-hover:border-brand/20 transition-colors">
                                                <div className="flex justify-between items-start">
                                                    <div className="flex-1">
                                                        <div className="flex items-center gap-2">
                                                            <span className="font-black text-gray-900 text-sm">{item.name}</span>
                                                            <span className="bg-brand/10 text-brand-dark px-1.5 py-0.5 rounded text-[10px] font-black italic">x{item.quantity}</span>
                                                        </div>
                                                        {/* Modifiers */}
                                                        <div className="flex flex-wrap gap-1.5 mt-1.5">
                                                            {item.modifiers?.size && (
                                                                <span className="bg-blue-100 text-blue-700 text-[10px] font-bold px-1.5 py-0.5 rounded uppercase">{item.modifiers.size}</span>
                                                            )}
                                                            {item.modifiers?.temperature && (
                                                                <span className="bg-orange-100 text-orange-700 text-[10px] font-bold px-1.5 py-0.5 rounded uppercase">{item.modifiers.temperature}</span>
                                                            )}
                                                            {item.modifiers?.flavors?.map((f: string, i: number) => (
                                                                <span key={i} className="bg-gray-100 text-gray-600 text-[10px] font-bold px-1.5 py-0.5 rounded">{f}</span>
                                                            ))}
                                                        </div>
                                                    </div>
                                                    <span className="font-black text-gray-400 text-xs">₱{(item.price * item.quantity).toFixed(2)}</span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Notes if any */}
                                {o.notes && (
                                    <div className="bg-amber-50/50 border border-amber-100 p-3 rounded-2xl flex items-start gap-2">
                                        <StickyNote size={14} className="text-amber-500 mt-0.5" />
                                        <div>
                                            <span className="text-[10px] text-amber-600 font-black uppercase tracking-tighter block mb-0.5">KITCHEN NOTE</span>
                                            <p className="text-xs text-amber-700 font-medium italic">"{o.notes}"</p>
                                        </div>
                                    </div>
                                )}

                                {/* Card Footer with Total */}
                                <div className="pt-4 border-t border-gray-100 flex items-center justify-between">
                                    <div className="bg-emerald-50 px-4 py-2 rounded-2xl border border-emerald-100">
                                        <span className="text-[10px] text-emerald-600 font-bold uppercase block tracking-tighter">Grand Total</span>
                                        <div className="text-2xl font-black text-emerald-700 tracking-tighter">
                                            ₱{Number(o.total || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <span className={`px-4 py-2 rounded-2xl text-[10px] font-black uppercase tracking-widest inline-block ${
                                            o.status === 'ready' ? 'bg-emerald-500 text-white animate-bounce' : 
                                            o.status === 'preparing' ? 'bg-blue-500 text-white animate-pulse' : 'bg-gray-900 text-white'
                                        }`}>
                                            {o.status}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                        </div>
                    </div>

                    {/* Desktop Table View */}
                    <div className="hidden md:block bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                        <table className="w-full">
                            <thead>
                                <tr className={`${
                                    activeTab === 'pending' ? 'bg-yellow-50' : 
                                    activeTab === 'preparing' ? 'bg-yellow-50' : 'bg-yellow-50'
                                } border-b border-gray-200`}>
                                    <th className="px-6 py-4 text-left text-[10px] font-black uppercase tracking-widest text-yellow-700">Order</th>
                                    <th className="px-6 py-4 text-left text-[10px] font-black uppercase tracking-widest text-yellow-700">Customer</th>
                                    <th className="px-6 py-4 text-left text-[10px] font-black uppercase tracking-widest text-yellow-700">Type</th>
                                    <th className="px-6 py-4 text-left text-[10px] font-black uppercase tracking-widest text-yellow-700">Items</th>
                                    <th className="px-6 py-4 text-center text-[10px] font-black uppercase tracking-widest text-yellow-700">Wait Time</th>
                                    <th className="px-6 py-4 text-right text-[10px] font-black uppercase tracking-widest text-yellow-700">Total</th>
                                    <th className="px-6 py-4 text-center text-[10px] font-black uppercase tracking-widest text-yellow-700">Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredOrders.map((o: any, idx: number) => (
                                    <tr key={o.id} className={`border-b border-gray-100 hover:bg-yellow-50 transition-colors ${idx === filteredOrders.length - 1 ? 'border-b-0' : ''}`}>
                                        <td className="px-6 py-4">
                                            <span className="font-black text-xl text-gray-900">#{o.orderNumber}</span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2">
                                                <div className="bg-gray-100 p-2 rounded-lg">
                                                    <User size={14} className="text-gray-500" />
                                                </div>
                                                <span className="text-sm font-semibold text-gray-800">{o.customerName || 'Walk-in'}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="text-xs font-black text-gray-700 capitalize px-3 py-1.5 bg-gray-100 rounded-lg border border-gray-200">
                                                {o.orderType?.replace('-', ' ') || 'Dine-in'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="text-xs font-semibold text-gray-600 space-y-1 cursor-pointer hover:text-brand" onClick={() => setSelectedCustomer(o.customerName || 'Walk-in')}>
                                                {o.items?.slice(0, 2).map((item: any, i: number) => (
                                                    <div key={i} className="text-gray-700">
                                                        {item.name} <span className="text-brand font-bold">×{item.quantity}</span>
                                                    </div>
                                                ))}
                                                {o.items?.length > 2 && (
                                                    <div className="text-gray-500 italic">+{o.items.length - 2} more</div>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <div className="flex items-center justify-center gap-1 text-xs font-bold text-gray-700">
                                                <Clock size={14} className="text-brand" />
                                                {getWaitTime(o.createdAt)}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <span className="font-black text-lg text-emerald-700">₱{Number(o.total || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <span className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest inline-block ${
                                                o.status === 'ready' ? 'bg-emerald-500 text-white animate-bounce' : 
                                                o.status === 'preparing' ? 'bg-blue-500 text-white animate-pulse' : 'bg-gray-900 text-white'
                                            }`}>
                                                {o.status}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </>
            )}

            {/* Customer Orders Modal */}
            {selectedCustomer && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setSelectedCustomer(null)}>
                    <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
                        {/* Modal Header */}
                        <div className="sticky top-0 bg-gradient-to-r from-yellow-50 to-yellow-100/50 px-6 py-4 flex items-center justify-between border-b border-yellow-200">
                            <div>
                                <h2 className="text-xl font-bold text-yellow-900">Orders for {selectedCustomer}</h2>
                                <p className="text-sm text-gray-600">Total orders: {getCustomerOrders(selectedCustomer).length}</p>
                            </div>
                            <button
                                onClick={() => setSelectedCustomer(null)}
                                className="p-2 hover:bg-yellow-200/50 rounded-lg transition"
                            >
                                <X size={24} className="text-gray-600" />
                            </button>
                        </div>

                        {/* Modal Content */}
                        <div className="p-6 space-y-4">
                            {getCustomerOrders(selectedCustomer).length === 0 ? (
                                <div className="text-center py-8 text-gray-400">
                                    <p>No orders found for this customer</p>
                                </div>
                            ) : (
                                getCustomerOrders(selectedCustomer).map((order: any) => (
                                    <div key={order.id} className={`border rounded-xl p-4 transition ${
                                        order.status === 'ready' ? 'border-emerald-300 bg-emerald-50' : 
                                        order.status === 'preparing' ? 'border-blue-300 bg-blue-50' : 
                                        'border-gray-200 bg-gray-50'
                                    }`}>
                                        <div className="flex items-center justify-between mb-3">
                                            <div className="flex items-center gap-3">
                                                <span className="text-xl font-black text-gray-900">#{order.orderNumber}</span>
                                                <span className={`px-2.5 py-0.5 rounded-lg text-[11px] font-black uppercase ${
                                                    order.status === 'ready' ? 'bg-emerald-200 text-emerald-800' : 
                                                    order.status === 'preparing' ? 'bg-blue-200 text-blue-800' : 
                                                    'bg-gray-300 text-gray-800'
                                                }`}>
                                                    {order.status}
                                                </span>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-sm font-semibold text-gray-700">{getWaitTime(order.createdAt)}</p>
                                                <p className="text-xs text-gray-500">{order.orderType?.replace('-', ' ') || 'Dine-in'}</p>
                                            </div>
                                        </div>

                                        {/* Order Items */}
                                        <div className="space-y-2 mb-3">
                                            {order.items?.map((item: any, idx: number) => (
                                                <div key={idx} className="flex justify-between items-start bg-white p-2.5 rounded-lg border border-gray-100">
                                                    <div className="flex-1">
                                                        <p className="font-semibold text-gray-800 text-sm">{item.name} <span className="text-brand font-bold">×{item.quantity}</span></p>
                                                        {item.modifiers && (Object.values(item.modifiers).filter(Boolean).length > 0) && (
                                                            <div className="flex flex-wrap gap-1 mt-1">
                                                                {item.modifiers?.size && (
                                                                    <span className="bg-blue-100 text-blue-700 text-[10px] font-bold px-1.5 py-0.5 rounded">{item.modifiers.size}</span>
                                                                )}
                                                                {item.modifiers?.temperature && (
                                                                    <span className="bg-orange-100 text-orange-700 text-[10px] font-bold px-1.5 py-0.5 rounded">{item.modifiers.temperature}</span>
                                                                )}
                                                                {item.modifiers?.flavors?.map((f: string, i: number) => (
                                                                    <span key={i} className="bg-gray-100 text-gray-600 text-[10px] font-bold px-1.5 py-0.5 rounded">{f}</span>
                                                                ))}
                                                            </div>
                                                        )}
                                                    </div>
                                                    <p className="font-semibold text-gray-700 text-sm ml-2">₱{(item.price * item.quantity).toFixed(2)}</p>
                                                </div>
                                            ))}
                                        </div>

                                        {/* Order Notes */}
                                        {order.notes && (
                                            <div className="bg-amber-50 border border-amber-200 p-2.5 rounded-lg mb-3 flex items-start gap-2">
                                                <StickyNote size={14} className="text-amber-600 mt-0.5 flex-shrink-0" />
                                                <p className="text-xs text-amber-700 italic">"{order.notes}"</p>
                                            </div>
                                        )}

                                        {/* Order Total */}
                                        <div className="pt-3 border-t border-gray-200 flex justify-between items-center">
                                            <span className="text-sm font-bold text-gray-600">Total:</span>
                                            <span className="text-lg font-black text-emerald-700">₱{Number(order.total || 0).toFixed(2)}</span>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

