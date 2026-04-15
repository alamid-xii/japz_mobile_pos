import { useState, useEffect } from 'react';
import { Clock, ChevronDown, ChevronUp, CheckCircle2, User, UtensilsCrossed, StickyNote, Calendar, MapPin } from 'lucide-react';
import { ordersAPI } from '../../services/api';
import { useAuth } from '../../hooks/useAuth';

interface CompletedOrder {
    id: number;
    orderNumber: string;
    status: string;
    createdAt: string;
    completedAt?: string;
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

export default function KitchenCompleted() {
    const { user } = useAuth();
    const [orders, setOrders] = useState<CompletedOrder[]>([]);
    const [loading, setLoading] = useState(true);
    const [expanded, setExpanded] = useState<number | null>(null);

    const fetchOrders = async () => {
        try {
            const res = await ordersAPI.getCompletedByCategories({
                assignedCategories: user?.assignedCategories || []
            });
            setOrders(res.data?.orders || []);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (user) {
            fetchOrders();
            const id = setInterval(fetchOrders, 10000);
            return () => clearInterval(id);
        }
    }, [user]);

    const getPhilippineTime = (timestamp?: string) => {
        try {
            const date = timestamp ? new Date(timestamp) : new Date();
            return date.toLocaleString('en-PH', {
                timeZone: 'Asia/Manila',
                month: 'short',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit',
                hour12: true,
            });
        } catch {
            return 'N/A';
        }
    };

    const getTotalWaitDuration = (createdAt?: string, completedAt?: string) => {
        try {
            if (!createdAt) return 'N/A';
            const created = new Date(createdAt);
            const completed = completedAt ? new Date(completedAt) : new Date();
            const diffMs = completed.getTime() - created.getTime();
            const totalMinutes = Math.floor(diffMs / 60000);

            if (totalMinutes < 1) {
                const seconds = Math.floor(diffMs / 1000);
                return `${seconds}s`;
            } else if (totalMinutes < 60) {
                return `${totalMinutes}m`;
            } else {
                const hours = Math.floor(totalMinutes / 60);
                const mins = totalMinutes % 60;
                return `${hours}h ${mins}m`;
            }
        } catch {
            return 'N/A';
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-full">
                <div className="spinner" />
            </div>
        );
    }
    // Show newest completed orders first on this page
    const sortedOrders = [...orders].sort((a, b) => {
        const aTime = a.completedAt ? new Date(a.completedAt).getTime() : new Date(a.createdAt).getTime();
        const bTime = b.completedAt ? new Date(b.completedAt).getTime() : new Date(b.createdAt).getTime();
        return bTime - aTime;
    });

    return (
        <div className="p-4 md:p-6">
            {/* Header */}
            <div className="mb-6">
                <h1 className="text-2xl font-bold text-gray-800">Completed Orders</h1>
                <p className="text-gray-500 text-sm mt-1">View orders completed today</p>
            </div>

            {/* Stats Card */}
                <div className="bg-green-50 border-l-4 border-green-500 rounded-lg p-4 mb-6">
                <div className="flex items-center gap-3">
                    <div className="bg-green-500 p-2 rounded-lg">
                        <CheckCircle2 size={24} className="text-white" />
                    </div>
                    <div>
                            <p className="text-2xl font-bold text-green-700">{sortedOrders.length}</p>
                        <p className="text-sm text-green-600">Orders Completed Today</p>
                    </div>
                </div>
            </div>

            {sortedOrders.length === 0 ? (
                <div className="flex flex-col items-center justify-center text-gray-500 gap-3 py-16 bg-gray-50 rounded-xl">
                    <Calendar size={48} className="text-gray-300" />
                    <p className="text-lg font-medium">No completed orders today</p>
                    <p className="text-sm">Completed orders will appear here</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {sortedOrders.map((order) => (
                        <div
                            key={order.id}
                            className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm cursor-pointer transition-all hover:shadow-md"
                            onClick={() => setExpanded(expanded === order.id ? null : order.id)}
                        >
                            {/* Order Header */}
                            <div className="flex justify-between items-start mb-3">
                                <div>
                                    <span className="font-bold text-lg">Order #{order.orderNumber}</span>
                                    <div className="flex items-center gap-1.5 mt-1 text-green-600">
                                        <Clock size={14} />
                                        <span className="text-sm font-medium">
                                            {getTotalWaitDuration(order.createdAt, order.completedAt)} total
                                        </span>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    
                                    {expanded === order.id ? (
                                        <ChevronUp size={18} className="text-gray-400" />
                                    ) : (
                                        <ChevronDown size={18} className="text-gray-400" />
                                    )}
                                </div>
                            </div>

                            {/* Compact info: only show on card header */}
                            <div className="mb-3">
                                <div className="flex items-center justify-start gap-3">
                                    {order.customerName ? (
                                        <span className="font-medium">{order.customerName}</span>
                                    ) : (
                                        <span className="text-sm text-gray-500">Guest</span>
                                    )}
                                    {order.orderType && (
                                        <span className="text-xs px-2 py-0.5 bg-gray-100 rounded capitalize">{order.orderType.replace('-', ' ')}</span>
                                    )}
                                </div>
                            </div>

                            {/* Expanded details (customer info, timestamps, items) */}
                            {expanded === order.id && (
                                <div className="mt-3 pt-3 border-t border-gray-100 space-y-3">
                                    <div className="bg-gray-50 rounded-lg p-3 space-y-2">
                                        
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

                                    <div className="bg-green-50 rounded-lg px-3 py-2.5">
                                        <div className="flex justify-between text-xs text-gray-600">
                                            <div className="flex items-center gap-1">
                                                <Clock size={12} />
                                                <span>Ordered: {getPhilippineTime(order.createdAt)}</span>
                                            </div>
                                            <div className="flex items-center gap-1">
                                                <CheckCircle2 size={12} />
                                                <span>Completed: {getPhilippineTime(order.completedAt)}</span>
                                            </div>
                                        </div>
                                    </div>

                                    <div>
                                        <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Order Items</p>
                                        {order.items?.map((item, idx) => (
                                            <div key={idx} className="text-sm py-1.5 pl-2 border-l-2 border-green-300">
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
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
