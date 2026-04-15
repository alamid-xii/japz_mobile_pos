import { useState, useEffect } from 'react';
import { Clock, ChefHat, CheckCircle, UtensilsCrossed, User, StickyNote, Play, Check, MapPin } from 'lucide-react';
import { ordersAPI } from '../../services/api';
import { useAuth } from '../../hooks/useAuth';

type StatusFilter = 'pending' | 'preparing' | 'ready';

interface KitchenOrder {
    id: number;
    orderNumber: string;
    status: string;
    createdAt: string;
    customerName?: string;
    orderType?: string;
    tableNumber?: string;
    deliveryAddress?: string;
    notes?: string;
    items?: {
        name: string;
        quantity: number;
        modifiers?: {
            size?: string;
            flavors?: string[];
            temperature?: string;
        };
    }[];
}

export default function KitchenIncoming() {
    const { user } = useAuth();
    const [orders, setOrders] = useState<KitchenOrder[]>([]);
    const [loading, setLoading] = useState(true);
    const [statusFilter, setStatusFilter] = useState<StatusFilter>('pending');
    const [processingOrders, setProcessingOrders] = useState<Set<number>>(new Set());

    const fetchOrders = async () => {
        try { 
            const res = await ordersAPI.getIncomingByCategories({ 
                assignedCategories: user?.assignedCategories || [] 
            }); 
            setOrders(res.data?.orders || []); 
        }
        catch (e) { console.error(e); }
        finally { setLoading(false); }
    };

    useEffect(() => { 
        if (user) {
            fetchOrders(); 
            const id = setInterval(fetchOrders, 3000); 
            return () => clearInterval(id); 
        }
    }, [user]);

    const updateOrderStatus = async (orderId: number, newStatus: string) => {
        if (processingOrders.has(orderId)) return;
        
        setProcessingOrders(prev => new Set(prev).add(orderId));
        try {
            await ordersAPI.updateOrderStatus(orderId, newStatus);
            await fetchOrders();
        } catch (e) {
            console.error(e);
        } finally {
            setProcessingOrders(prev => {
                const next = new Set(prev);
                next.delete(orderId);
                return next;
            });
        }
    };

    const getWaitTime = (createdAt: string) => {
        const created = new Date(createdAt);
        const now = new Date();
        const diffMs = now.getTime() - created.getTime();
        const minutes = Math.floor(diffMs / 60000);
        
        if (minutes < 1) return 'Just now';
        if (minutes < 60) return `${minutes}m`;
        const hours = Math.floor(minutes / 60);
        const mins = minutes % 60;
        return `${hours}h ${mins}m`;
    };

    // Ensure orders are explicitly sorted FIFO (oldest first) on the client
    const sortedOrders = [...orders].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

    // Filter orders by status from the sorted list
    const filteredOrders = sortedOrders.filter(order => {
        if (statusFilter === 'pending') return order.status === 'pending';
        if (statusFilter === 'preparing') return order.status === 'preparing';
        if (statusFilter === 'ready') return order.status === 'ready';
        return false;
    });

    // Count orders by status (from sortedOrders for consistency)
    const pendingCount = sortedOrders.filter(o => o.status === 'pending').length;
    const preparingCount = sortedOrders.filter(o => o.status === 'preparing').length;
    const readyCount = sortedOrders.filter(o => o.status === 'ready').length;

    const getStatusConfig = (status: StatusFilter) => {
        switch (status) {
            case 'pending':
                return {
                    bg: 'bg-yellow-50',
                    border: 'border-yellow-400',
                    badge: 'bg-yellow-500',
                    icon: Clock,
                    label: 'PENDING'
                };
            case 'preparing':
                return {
                    bg: 'bg-blue-50',
                    border: 'border-blue-400',
                    badge: 'bg-blue-500',
                    icon: ChefHat,
                    label: 'PREPARING'
                };
            case 'ready':
                return {
                    bg: 'bg-green-50',
                    border: 'border-green-400',
                    badge: 'bg-green-500',
                    icon: CheckCircle,
                    label: 'READY'
                };
        }
    };

    const getActionButton = (order: KitchenOrder) => {
        const isProcessing = processingOrders.has(order.id);
        
        switch (order.status) {
            case 'pending':
                return (
                    <button
                        onClick={(e) => { e.stopPropagation(); updateOrderStatus(order.id, 'preparing'); }}
                        disabled={isProcessing}
                        className="w-full py-3 mt-3 rounded-lg bg-blue-500 hover:bg-blue-600 text-white font-semibold text-[15px] flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                    >
                        <Play size={18} />
                        {isProcessing ? 'Processing...' : 'Start Preparing'}
                    </button>
                );
            case 'preparing':
                return (
                    <button
                        onClick={(e) => { e.stopPropagation(); updateOrderStatus(order.id, 'ready'); }}
                        disabled={isProcessing}
                        className="w-full py-3 mt-3 rounded-lg bg-green-500 hover:bg-green-600 text-white font-semibold text-[15px] flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                    >
                        <Check size={18} />
                        {isProcessing ? 'Processing...' : 'Mark Ready'}
                    </button>
                );
            case 'ready':
                return (
                    <button
                        onClick={(e) => { e.stopPropagation(); updateOrderStatus(order.id, 'completed'); }}
                        disabled={isProcessing}
                        className="w-full py-3 mt-3 rounded-lg bg-gray-600 hover:bg-gray-700 text-white font-semibold text-[15px] flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                    >
                        <CheckCircle size={18} />
                        {isProcessing ? 'Processing...' : 'Complete Order'}
                    </button>
                );
            default:
                return null;
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-full">
                <div className="spinner" />
            </div>
        );
    }

    return (
        <div className="p-4 md:p-6">
            {/* Header */}
            <div className="mb-6">
                <h1 className="text-2xl font-bold text-gray-800">Kitchen Orders</h1>
                <p className="text-gray-500 text-sm mt-1">Manage incoming orders for your assigned stations</p>
            </div>

            {/* Status Filter Tabs */}
            <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
                <button
                    onClick={() => setStatusFilter('pending')}
                    className={`flex items-center gap-2 px-4 py-2.5 rounded-lg font-medium transition-all whitespace-nowrap ${
                        statusFilter === 'pending'
                            ? 'bg-yellow-500 text-white shadow-md'
                            : 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200'
                    }`}
                >
                    <Clock size={18} />
                    Pending
                    {pendingCount > 0 && (
                        <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                            statusFilter === 'pending' ? 'bg-white text-yellow-600' : 'bg-yellow-500 text-white'
                        }`}>
                            {pendingCount}
                        </span>
                    )}
                </button>
                <button
                    onClick={() => setStatusFilter('preparing')}
                    className={`flex items-center gap-2 px-4 py-2.5 rounded-lg font-medium transition-all whitespace-nowrap ${
                        statusFilter === 'preparing'
                            ? 'bg-blue-500 text-white shadow-md'
                            : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                    }`}
                >
                    <ChefHat size={18} />
                    Preparing
                    {preparingCount > 0 && (
                        <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                            statusFilter === 'preparing' ? 'bg-white text-blue-600' : 'bg-blue-500 text-white'
                        }`}>
                            {preparingCount}
                        </span>
                    )}
                </button>
                <button
                    onClick={() => setStatusFilter('ready')}
                    className={`flex items-center gap-2 px-4 py-2.5 rounded-lg font-medium transition-all whitespace-nowrap ${
                        statusFilter === 'ready'
                            ? 'bg-green-500 text-white shadow-md'
                            : 'bg-green-100 text-green-700 hover:bg-green-200'
                    }`}
                >
                    <CheckCircle size={18} />
                    Ready
                    {readyCount > 0 && (
                        <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                            statusFilter === 'ready' ? 'bg-white text-green-600' : 'bg-green-500 text-white'
                        }`}>
                            {readyCount}
                        </span>
                    )}
                </button>
            </div>

            {/* Orders Grid */}
            {filteredOrders.length === 0 ? (
                <div className="flex flex-col items-center justify-center text-gray-500 gap-3 py-16 bg-gray-50 rounded-xl">
                    <UtensilsCrossed size={48} className="text-gray-300" />
                    <p className="text-lg font-medium">No {statusFilter} orders</p>
                    <p className="text-sm">Orders will appear here when available</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredOrders.map((order) => {
                        const config = getStatusConfig(order.status as StatusFilter);
                        const StatusIcon = config.icon;
                        
                        return (
                            <div
                                key={order.id}
                                className={`${config.bg} border-2 ${config.border} rounded-xl p-4 transition-all hover:shadow-lg`}
                            >
                                {/* Order Header */}
                                <div className="flex justify-between items-start mb-3">
                                    <div>
                                        <span className="font-bold text-lg">Order #{order.orderNumber}</span>
                                        <div className="flex items-center gap-1.5 mt-1 text-gray-600">
                                            <Clock size={14} />
                                            <span className="text-sm font-medium">{getWaitTime(order.createdAt)}</span>
                                        </div>
                                    </div>
                                    <span className={`${config.badge} text-white px-2.5 py-1 rounded-md text-xs font-bold flex items-center gap-1`}>
                                        <StatusIcon size={12} />
                                        {config.label}
                                    </span>
                                </div>

                                {/* Customer Info */}
                                <div className="bg-white/60 rounded-lg p-3 mb-3 space-y-2">
                                    {order.customerName && (
                                        <div className="flex items-center gap-2 text-sm">
                                            <User size={14} className="text-gray-500" />
                                            <span className="font-medium">{order.customerName}</span>
                                        </div>
                                    )}
                                    {order.orderType && (
                                        <div className="flex items-center gap-2 text-sm">
                                            <UtensilsCrossed size={14} className="text-gray-500" />
                                            <span className="capitalize">{order.orderType.replace('-', ' ')}</span>
                                            {order.orderType === 'dine-in' && order.tableNumber && (
                                                <span className="bg-gray-200 px-2 py-0.5 rounded text-xs font-medium">
                                                    Table {order.tableNumber}
                                                </span>
                                            )}
                                        </div>
                                    )}
                                    {order.orderType === 'delivery' && order.deliveryAddress && (
                                        <div className="flex items-start gap-2 text-sm">
                                            <MapPin size={14} className="text-red-500 mt-0.5 shrink-0" />
                                            <span className="text-gray-700">{order.deliveryAddress}</span>
                                        </div>
                                    )}
                                    {order.notes && (
                                        <div className="flex items-start gap-2 text-sm">
                                            <StickyNote size={14} className="text-gray-500 mt-0.5" />
                                            <span className="text-gray-600 italic">{order.notes}</span>
                                        </div>
                                    )}
                                </div>

                                {/* Order Items */}
                                <div className="space-y-1.5 mb-2">
                                    <p className="text-xs font-semibold text-gray-500 uppercase">Items</p>
                                    {order.items?.map((item, idx) => (
                                        <div key={idx} className="text-sm py-1 pl-2 border-l-2 border-gray-300">
                                            <span className="font-medium">{item.name}</span>
                                            {item.modifiers?.size && (
                                                <span className="text-gray-500 ml-1">({item.modifiers.size})</span>
                                            )}
                                            {item.modifiers?.temperature && (
                                                <span className="text-gray-500 ml-1">• {item.modifiers.temperature}</span>
                                            )}
                                            <span className="text-gray-600 ml-2">×{item.quantity}</span>
                                            {item.modifiers?.flavors && item.modifiers.flavors.length > 0 && (
                                                <p className="text-xs text-gray-500 mt-0.5">
                                                    Flavors: {item.modifiers.flavors.join(', ')}
                                                </p>
                                            )}
                                        </div>
                                    ))}
                                </div>

                                {/* Action Button */}
                                {getActionButton(order)}
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
