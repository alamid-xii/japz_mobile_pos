import { useState, useEffect, useMemo } from 'react';
import { ordersAPI } from '../../services/api';
import { Calendar, ChevronLeft, ChevronRight, FileText, TrendingUp, ShoppingCart, DollarSign } from 'lucide-react';

export default function OrderHistory() {
    const [orders, setOrders] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [timeSlot, setTimeSlot] = useState<'today' | 'week'>('today');
    const perPage = 10;

    useEffect(() => {
        (async () => {
            try {
                setLoading(true);
                const res = await ordersAPI.getAll();
                let all = Array.isArray(res.data) ? res.data : (res.data?.data || []);
                
                // Only show completed orders in history
                const completed = all.filter((o: any) => o.status === 'completed');
                
                // Sort LIFO
                setOrders(completed.sort((a: any, b: any) => 
                    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
                ));
            } catch (e) { 
                console.error(e); 
            } finally { 
                setLoading(false); 
            }
        })();
    }, []);

    const filteredByTime = useMemo(() => {
        const now = new Date();
        const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
        
        if (timeSlot === 'today') {
            return orders.filter(o => new Date(o.createdAt).getTime() >= startOfDay);
        } else {
            // Last 7 days
            const sevenDaysAgo = startOfDay - (7 * 24 * 60 * 60 * 1000);
            return orders.filter(o => new Date(o.createdAt).getTime() >= sevenDaysAgo);
        }
    }, [orders, timeSlot]);

    // Reset to page 1 when filter changes
    useEffect(() => {
        setPage(1);
    }, [timeSlot]);

    const stats = useMemo(() => {
        const totalRevenue = filteredByTime.reduce((sum, o) => sum + Number(o.total || 0), 0);
        const totalItems = filteredByTime.reduce((sum, o) => {
            if (Array.isArray(o.items)) {
                return sum + o.items.reduce((itemSum: number, item: any) => itemSum + (item.quantity || 0), 0);
            }
            return sum;
        }, 0);
        const avgOrder = filteredByTime.length > 0 ? totalRevenue / filteredByTime.length : 0;

        return {
            totalRevenue,
            orderCount: filteredByTime.length,
            totalItems,
            avgOrder
        };
    }, [filteredByTime]);

    const totalPages = useMemo(() => Math.max(1, Math.ceil(filteredByTime.length / perPage)), [filteredByTime.length]);

    const paginated = useMemo(() => {
        const start = (page - 1) * perPage;
        return filteredByTime.slice(start, start + perPage);
    }, [filteredByTime, page]);

    if (loading) return <div className="p-6"><div className="spinner" /></div>;

    return (
        <div className="p-2 md:p-4 h-full overflow-y-auto bg-gradient-to-b from-white to-slate-100">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
                <div>
                    <h1 className="text-2xl font-bold text-yellow-900">Order History</h1>
                    <p className="text-gray-500 text-sm">Review past transactions and sales</p>
                </div>

                {/* Filter Buttons */}
                <div className="flex gap-2">
                    <button 
                        onClick={() => setTimeSlot('today')}
                        className={`flex items-center gap-1 px-4 py-2 rounded-lg text-sm font-medium cursor-pointer transition ${
                            timeSlot === 'today' ? 'border-none bg-brand text-brand-dark hover:shadow-md hover:shadow-yellow-300/40' : 'border border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
                        }`}
                    >
                        <Calendar size={16} />
                        Today
                    </button>
                    <button 
                        onClick={() => setTimeSlot('week')}
                        className={`flex items-center gap-1 px-4 py-2 rounded-lg text-sm font-medium cursor-pointer transition ${
                            timeSlot === 'week' ? 'border-none bg-brand text-brand-dark hover:shadow-md hover:shadow-yellow-300/40' : 'border border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
                        }`}
                    >
                        <Calendar size={16} />
                        This Week
                    </button>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
                {/* Total Revenue */}
                <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex items-center justify-between mb-3">
                        <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wide">Total Revenue</h3>
                        <div className="bg-emerald-100 p-2 rounded-lg">
                            <DollarSign size={16} className="text-emerald-600" />
                        </div>
                    </div>
                    <p className="text-2xl font-black text-gray-900">₱{stats.totalRevenue.toFixed(2)}</p>
                    <p className="text-xs text-gray-400 mt-1">{timeSlot === 'today' ? 'Today' : 'This week'}</p>
                </div>

                {/* Orders Count */}
                <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex items-center justify-between mb-3">
                        <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wide">Orders</h3>
                        <div className="bg-blue-100 p-2 rounded-lg">
                            <ShoppingCart size={16} className="text-blue-600" />
                        </div>
                    </div>
                    <p className="text-2xl font-black text-gray-900">{stats.orderCount}</p>
                    <p className="text-xs text-gray-400 mt-1">Total transactions</p>
                </div>

                {/* Avg Order Value */}
                <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex items-center justify-between mb-3">
                        <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wide">Avg Order</h3>
                        <div className="bg-brand/10 p-2 rounded-lg">
                            <TrendingUp size={16} className="text-brand" />
                        </div>
                    </div>
                    <p className="text-2xl font-black text-gray-900">₱{stats.avgOrder.toFixed(2)}</p>
                    <p className="text-xs text-gray-400 mt-1">Per transaction</p>
                </div>

                {/* Total Items */}
                <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex items-center justify-between mb-3">
                        <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wide">Items Sold</h3>
                        <div className="bg-purple-100 p-2 rounded-lg">
                            <ShoppingCart size={16} className="text-purple-600" />
                        </div>
                    </div>
                    <p className="text-2xl font-black text-gray-900">{stats.totalItems}</p>
                    <p className="text-xs text-gray-400 mt-1">Total units</p>
                </div>
            </div>

            <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-100 table-fixed">
                        <thead className="bg-yellow-50">
                            <tr>
                                <th className="px-6 py-4 text-left text-[10px] font-black text-yellow-700 uppercase tracking-widest w-24">Order #</th>
                                <th className="px-6 py-4 text-left text-[10px] font-black text-yellow-700 uppercase tracking-widest w-40">Customer</th>
                                <th className="px-6 py-4 text-left text-[10px] font-black text-yellow-700 uppercase tracking-widest">Items Purchased</th>
                                <th className="px-6 py-4 text-left text-[10px] font-black text-yellow-700 uppercase tracking-widest w-32">Type</th>
                                <th className="px-6 py-4 text-right text-[10px] font-black text-yellow-700 uppercase tracking-widest w-32">Total</th>
                                <th className="px-6 py-4 text-left text-[10px] font-black text-yellow-700 uppercase tracking-widest w-32">Time</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-100">
                            {paginated.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-6 py-20 text-center">
                                        <div className="flex flex-col items-center gap-2 text-gray-300">
                                            <FileText size={48} />
                                            <p className="font-bold text-gray-400">No completed orders found for this period</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : paginated.map((o: any) => (
                                <tr key={o.id} className="hover:bg-yellow-50 transition-colors group">
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-black text-gray-900">#{o.orderNumber}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-700">{o.customerName || <span className="text-gray-300 italic">Walk-in</span>}</td>
                                    <td className="px-6 py-4 text-sm text-gray-600 truncate max-w-0">
                                        {Array.isArray(o.items) ? o.items.map((it: any) => `${it.name} (x${it.quantity})`).join(', ') : (o.items || '')}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <span className={`px-2 py-1 rounded-md text-[10px] font-black uppercase tracking-tighter bg-gray-100 text-gray-600`}>
                                            {o.orderType?.replace('-', ' ') || 'Walk-in'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-emerald-600 text-right font-black">
                                        ₱{Number(o.total || 0).toFixed(2)}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-400">
                                        {new Date(o.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Pagination Controls */}
                {filteredByTime.length > 0 && (
                    <div className="px-6 py-4 bg-yellow-50 border-t border-gray-100 flex items-center justify-between">
                        <div className="text-xs font-medium text-gray-600 uppercase tracking-wider">
                            Showing <span className="text-gray-900 font-bold">{Math.min((page - 1) * perPage + 1, filteredByTime.length)}</span> to <span className="text-gray-900 font-bold">{Math.min(page * perPage, filteredByTime.length)}</span> of <span className="text-gray-900 font-bold">{filteredByTime.length}</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <button
                                className={`p-2 rounded-lg border-none shadow-sm transition-all cursor-pointer ${page === 1 ? 'bg-gray-100 text-gray-300 cursor-not-allowed' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'}`}
                                onClick={() => setPage(p => Math.max(1, p - 1))}
                                disabled={page === 1}
                            >
                                <ChevronLeft size={18} />
                            </button>

                            <div className="flex items-center gap-1 mx-2">
                                {Array.from({ length: Math.min(5, totalPages) }).map((_, i) => {
                                    const p = i + 1;
                                    return (
                                        <button key={p}
                                            onClick={() => setPage(p)}
                                            className={`w-8 h-8 rounded-lg text-xs font-medium transition-all border-none cursor-pointer ${p === page ? 'border-none bg-brand text-brand-dark shadow-md scale-110' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'}`}
                                        >{p}</button>
                                    );
                                })}
                            </div>

                            <button
                                className={`p-2 rounded-lg border-none shadow-sm transition-all cursor-pointer ${page === totalPages ? 'bg-gray-100 text-gray-300 cursor-not-allowed' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'}`}
                                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                                disabled={page === totalPages}
                            >
                                <ChevronRight size={18} />
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
