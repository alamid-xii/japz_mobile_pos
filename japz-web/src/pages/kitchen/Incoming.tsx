import { useFeedback } from '../../components/FeedbackProvider';
import { useState, useEffect, useRef } from 'react';
import { Clock, ChefHat, CheckCircle, UtensilsCrossed, User, StickyNote, Play, Check, MapPin, Speaker, Mic } from 'lucide-react';
import { ordersAPI } from '../../services/api';
import { useAuth } from '../../hooks/useAuth';
import { isAxiosError } from 'axios';

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
    const { notify } = useFeedback();
    const { user } = useAuth();
    const [speakerEnabled, setSpeakerEnabled] = useState(true);
    const [inventoryError, setInventoryError] = useState('');
    const [listening, setListening] = useState(false);
    const recognitionRef = useRef<any>(null);
    const prevOrderIdsRef = useRef<number[]>([]);
    const [orders, setOrders] = useState<KitchenOrder[]>([]);
    const [loading, setLoading] = useState(true);
    const [statusFilter, setStatusFilter] = useState<StatusFilter>('pending');
    const [processingOrders, setProcessingOrders] = useState<Set<number>>(new Set());

    const fetchOrders = async () => {
        try { 
            const res = await ordersAPI.getIncomingByCategories({ 
                assignedCategories: user?.assignedCategories || [] 
            }); 
            const newOrders: KitchenOrder[] = res.data?.orders || [];
            // Announce newly arrived orders when speaker is enabled
            if (speakerEnabled && prevOrderIdsRef.current && prevOrderIdsRef.current.length) {
                const prevSet = new Set(prevOrderIdsRef.current);
                const added = newOrders.filter(o => !prevSet.has(o.id));
                if (added.length > 0) {
                    added.forEach(o => announceOrder(o));
                }
            }
            prevOrderIdsRef.current.length = 0;
            newOrders.forEach(o => prevOrderIdsRef.current.push(o.id));
            setOrders(newOrders);
        }
        catch (e) { console.error(e); }
        finally { setLoading(false); }
    };

    const speakText = (text: string) => {
        try {
            const utter = new SpeechSynthesisUtterance(text);
            speechSynthesis.cancel();
            speechSynthesis.speak(utter);
        } catch (e) { console.error('TTS error', e); }
    };

    const announceOrder = (order: KitchenOrder) => {
        const message = `New order ${order.orderNumber}. Please check the incoming orders.`;
        // play short beep then speak
        try {
            // simple beep using WebAudio
            const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
            const o = ctx.createOscillator();
            const g = ctx.createGain();
            o.type = 'sine'; o.frequency.value = 880;
            g.gain.value = 0.05;
            o.connect(g); g.connect(ctx.destination);
            o.start();
            setTimeout(() => { o.stop(); ctx.close(); }, 150);
        } catch { /* Audio may be blocked until user interaction. */ }
        speakText(message);
    };

    const startListening = () => {
        const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
        if (!SpeechRecognition) return notify('Speech recognition not supported in this browser');
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
                // speak out the recognized text as a broadcast
                speakText(text);
            };
            rec.start();
            recognitionRef.current = rec;
        } catch (e) { console.error(e); }
    };

    const stopListening = () => {
        try { recognitionRef.current?.stop(); } catch { /* Speech recognition may already be stopped. */ }
        setListening(false);
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
            setInventoryError('');
            await ordersAPI.updateOrderStatus(orderId, newStatus);
            await fetchOrders();
        } catch (error) {
            const message = isAxiosError<{ error?: string }>(error) ? error.response?.data?.error : undefined;
            setInventoryError(message || 'Order status could not be changed. Try again.');
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
                // Handing over is the cashier's step. The kitchen's job ends here.
                return (
                    <div className="w-full py-3 mt-3 rounded-lg bg-green-50 border border-green-200 text-green-700 font-semibold text-[15px] flex items-center justify-center gap-2">
                        <CheckCircle size={18} />
                        Sent to Cashier
                    </div>
                );
            default:
                return null;
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-full">
                <div className="spinner" role="status" aria-label="Loading content" />
            </div>
        );
    }

    return (
        <div className="app-page kitchen-page">
            {inventoryError && <div role="alert" className="p-3 m-3 bg-red-50 border border-red-200 rounded-md text-red-800">{inventoryError}</div>}
            {/* Header */}
            <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800">Kitchen Orders</h1>
                    <p className="text-gray-500 text-sm mt-1">Manage incoming orders for your assigned stations</p>
                </div>
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

            {/* Status Filter Tabs */}
            <div className="order-filters flex gap-2 mb-6" aria-label="Order status">
                <button
                    aria-pressed={statusFilter === 'pending'} onClick={() => setStatusFilter('pending')}
                    className={`flex items-center gap-2 px-4 py-2.5 rounded-lg font-medium transition-all whitespace-nowrap ${
                        statusFilter === 'pending'
                            ? 'bg-brand text-brand-dark'
                            : 'bg-white text-gray-600 hover:bg-gray-100'
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
                    aria-pressed={statusFilter === 'preparing'} onClick={() => setStatusFilter('preparing')}
                    className={`flex items-center gap-2 px-4 py-2.5 rounded-lg font-medium transition-all whitespace-nowrap ${
                        statusFilter === 'preparing'
                            ? 'bg-brand text-brand-dark'
                            : 'bg-white text-gray-600 hover:bg-gray-100'
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
                    aria-pressed={statusFilter === 'ready'} onClick={() => setStatusFilter('ready')}
                    className={`flex items-center gap-2 px-4 py-2.5 rounded-lg font-medium transition-all whitespace-nowrap ${
                        statusFilter === 'ready'
                            ? 'bg-brand text-brand-dark'
                            : 'bg-white text-gray-600 hover:bg-gray-100'
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
