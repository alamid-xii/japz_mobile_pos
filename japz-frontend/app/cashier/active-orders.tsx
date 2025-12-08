import { useState, useEffect, useCallback } from 'react';
import { ScrollView, Text, TouchableOpacity, View, ActivityIndicator, RefreshControl } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { BackHandler } from 'react-native';
import { Clock } from 'lucide-react-native';
import { Colors, Sizes } from '../../constants/colors';
import { scaled } from '../../utils/responsive';
import { ordersAPI } from '../../services/api';
import { cashierStyles } from '../../styles/cashierStyles';

interface OrderItem {
  id: string;
  name: string;
  quantity: number;
  price?: number;
  total?: number;
  modifiers?: {
    size?: string;
    flavors?: string[];
    notes?: string;
  };
}

interface Order {
  id: string;
  orderNumber: string;
  customerName: string;
  status: 'pending' | 'preparing' | 'ready' | 'completed';
  items: OrderItem[];
  totalAmount: number;
  createdAt: string;
  timestamp: string;
  expandedId: string | null;
}

const statusColors = {
  pending: '#F59E0B',
  preparing: '#3B82F6',
  ready: '#10B981',
  completed: '#6B7280',
};

const getWaitTime = (createdAt: string) => {
  try {
    const created = new Date(createdAt);
    const now = new Date();
    const diffMs = now.getTime() - created.getTime();
    const totalSeconds = Math.floor(diffMs / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    
    if (minutes === 0) {
      return `${seconds}s`;
    } else if (minutes < 60) {
      return `${minutes}m ${seconds}s`;
    } else {
      const hours = Math.floor(minutes / 60);
      const mins = minutes % 60;
      return `${hours}h ${mins}m`;
    }
  } catch (error) {
    return '0s';
  }
};

const getCardBackgroundColor = (status: string) => {
  switch (status) {
    case 'pending': return '#FFFFCC';
    case 'preparing': return '#ADD8E6';
    case 'ready': return '#D4F1D4';
    default: return Colors.light.card;
  }
};

export default function ActiveOrdersScreen() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState<'pending' | 'preparing' | 'ready' | null>(null);

  const fetchOrders = async () => {
    try {
      setError(null);
      const res = await ordersAPI.getAll();
      const ordersData = res.data || [];
      // Filter for active orders (not completed)
      const activeOrders = ordersData.filter((o: any) => o.status !== 'completed').map((o: any) => ({
        id: o.id.toString(),
        orderNumber: o.orderNumber,
        customerName: o.customerName || 'Walk-in Customer',
        status: o.status,
        items: o.items ? o.items.map((item: any) => ({
          id: item.id,
          name: item.menuItem?.name || item.name,
          quantity: item.quantity,
          price: item.price,
          total: item.total,
          modifiers: item.modifiers,
        })) : [],
        totalAmount: parseFloat(o.total || 0),
        createdAt: o.createdAt,
        timestamp: o.createdAt,
        expandedId: null,
      }));
      setOrders(activeOrders);
    } catch (e: any) {
      console.error('Failed to load active orders', e);
      setError(e.response?.data?.error || 'Failed to load orders');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchOrders();
    
    // Set up auto-refresh every 3 seconds
    const interval = setInterval(() => {
      fetchOrders();
    }, 3000);
    
    return () => clearInterval(interval);
  }, []);

  // Prevent back navigation
  useFocusEffect(
    useCallback(() => {
      const subscription = BackHandler.addEventListener('hardwareBackPress', () => true);
      return () => subscription.remove();
    }, [])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchOrders();
  };

  const toggleExpand = (id: string) => {
    setExpanded(expanded === id ? null : id);
  };

  const renderOrderCard = (order: Order) => (
    <TouchableOpacity
      key={order.id}
      style={{
        backgroundColor: getCardBackgroundColor(order.status),
        borderRadius: Sizes.radius.md,
        padding: Sizes.spacing.md,
        marginBottom: Sizes.spacing.md,
        borderLeftWidth: 4,
        borderLeftColor: statusColors[order.status],
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
      }}
      onPress={() => toggleExpand(order.id)}
    >
      {/* Order Header */}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: Sizes.spacing.md }}>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: Sizes.typography.base, fontWeight: '700', color: '#030213' }}>
            Order {order.orderNumber}
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: Sizes.spacing.xs, gap: Sizes.spacing.xs }}>
            <Clock size={12} color={statusColors[order.status]} />
            <Text style={{ color: statusColors[order.status], fontWeight: '600', fontSize: Sizes.typography.xs }}>
              {getWaitTime(order.createdAt)}
            </Text>
          </View>
        </View>
        <View style={{
          paddingHorizontal: Sizes.spacing.md,
          paddingVertical: Sizes.spacing.xs,
          borderRadius: Sizes.radius.md,
          backgroundColor: statusColors[order.status],
        }}>
          <Text style={{
            color: '#fff',
            fontSize: Sizes.typography.xs,
            fontWeight: '700',
            letterSpacing: 0.5,
            textTransform: 'uppercase',
          }}>
            {order.status}
          </Text>
        </View>
      </View>

      {/* Order Info Box */}
      <View style={{ 
        backgroundColor: `${statusColors[order.status]}15`,
        paddingHorizontal: Sizes.spacing.md,
        paddingVertical: Sizes.spacing.sm,
        borderRadius: Sizes.radius.md,
        marginBottom: Sizes.spacing.md,
      }}>
        <Text style={{ fontSize: Sizes.typography.sm, fontWeight: '600', color: '#030213' }}>
          {order.items.length} item(s) • ₱{order.totalAmount.toFixed(2)}
        </Text>
        {order.customerName && order.customerName !== 'Walk-in Customer' && (
          <Text style={{ fontSize: Sizes.typography.xs, color: Colors.light.mutedForeground, marginTop: Sizes.spacing.xs }}>
            Customer: {order.customerName}
          </Text>
        )}
      </View>

      {/* Expanded Items View */}
      {expanded === order.id && (
        <View style={{ marginBottom: Sizes.spacing.md, paddingTop: Sizes.spacing.md, borderTopWidth: 1, borderTopColor: Colors.light.border }}>
          <Text style={{ fontWeight: '600', marginBottom: Sizes.spacing.sm, color: '#030213' }}>Items:</Text>
          {order.items.map((item, idx) => (
            <View key={idx} style={{ 
              marginBottom: idx < order.items.length - 1 ? Sizes.spacing.md : 0,
              paddingBottom: idx < order.items.length - 1 ? Sizes.spacing.md : 0,
              borderBottomWidth: idx < order.items.length - 1 ? 1 : 0,
              borderBottomColor: Colors.light.border,
            }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: Sizes.spacing.xs }}>
                <Text style={{ 
                  color: Colors.light.foreground, 
                  fontSize: Sizes.typography.base, 
                  fontWeight: '700', 
                  flex: 1 
                }}>
                  {item.quantity}× {item.name}
                </Text>
                {item.total !== undefined && item.total !== null && (
                  <Text style={{
                    color: statusColors[order.status],
                    fontSize: Sizes.typography.base,
                    fontWeight: '700',
                    marginLeft: Sizes.spacing.sm,
                  }}>
                    ₱{(typeof item.total === 'number' ? item.total : parseFloat(item.total || 0)).toFixed(2)}
                  </Text>
                )}
              </View>

              {item.modifiers && typeof item.modifiers === 'object' && (
                <View style={{ marginTop: Sizes.spacing.xs, marginLeft: Sizes.spacing.sm, paddingLeft: Sizes.spacing.md, borderLeftWidth: 2, borderLeftColor: statusColors[order.status] }}>
                  {item.modifiers.size && (
                    <Text style={{
                      color: Colors.light.mutedForeground,
                      fontSize: Sizes.typography.sm,
                      marginTop: Sizes.spacing.xs,
                    }}>
                      📏 Size: {item.modifiers.size}
                    </Text>
                  )}
                  {item.modifiers.flavors && Array.isArray(item.modifiers.flavors) && item.modifiers.flavors.length > 0 && (
                    <Text style={{
                      color: Colors.light.mutedForeground,
                      fontSize: Sizes.typography.sm,
                      marginTop: Sizes.spacing.xs,
                    }}>
                      🍨 Flavors: {item.modifiers.flavors.join(', ')}
                    </Text>
                  )}
                  {item.modifiers.notes && (
                    <Text style={{
                      color: Colors.light.mutedForeground,
                      fontSize: Sizes.typography.xs,
                      fontStyle: 'italic',
                      marginTop: Sizes.spacing.xs,
                    }}>
                      📝 Note: {item.modifiers.notes}
                    </Text>
                  )}
                </View>
              )}
            </View>
          ))}
        </View>
      )}
    </TouchableOpacity>
  );

  const pendingCount = orders.filter(o => o.status === 'pending').length;
  const preparingCount = orders.filter(o => o.status === 'preparing').length;
  const readyCount = orders.filter(o => o.status === 'ready').length;

  const filteredOrders = selectedStatus ? orders.filter(o => o.status === selectedStatus) : orders;

  return (
    <View style={{ flex: 1 }}>
      {/* Header */}
      <View style={cashierStyles.header}>
        <Text style={cashierStyles.title}>Active Orders</Text>
      </View>

      {loading ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.light.background }}>
          <ActivityIndicator size="large" color={Colors.brand.primary} />
          <Text style={{ marginTop: Sizes.spacing.md, color: Colors.light.mutedForeground }}>Loading orders...</Text>
        </View>
      ) : error ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.light.background, padding: Sizes.spacing.lg }}>
          <Text style={{ fontSize: Sizes.typography.base, color: '#EF4444', textAlign: 'center', marginBottom: Sizes.spacing.md }}>
            {error}
          </Text>
          <TouchableOpacity
            style={{ backgroundColor: Colors.brand.primary, paddingVertical: Sizes.spacing.sm, paddingHorizontal: Sizes.spacing.lg, borderRadius: Sizes.radius.md }}
            onPress={fetchOrders}
          >
            <Text style={{ color: '#030213', fontWeight: '600' }}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView
          style={{ flex: 1, backgroundColor: Colors.light.background }}
          contentContainerStyle={{ flexGrow: 1 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[Colors.brand.primary]} />}
        >
          <View style={{ padding: scaled(Sizes.spacing.md) }}>
          <View style={{ flexDirection: 'row', gap: scaled(Sizes.spacing.xs), marginBottom: scaled(Sizes.spacing.sm) }}>
          <TouchableOpacity 
            style={{ 
              flex: 1, 
              backgroundColor: selectedStatus === 'pending' ? '#FFD700' : '#F0F0F0', 
              borderRadius: Sizes.radius.sm, 
              padding: Sizes.spacing.sm, 
              alignItems: 'center',
              justifyContent: 'center',
              height: scaled(36),
              borderWidth: selectedStatus === 'pending' ? 2 : 0,
              borderColor: '#FFD700',
            }}
            onPress={() => setSelectedStatus(selectedStatus === 'pending' ? null : 'pending')}
          >
            <Text style={{ fontSize: scaled(Sizes.typography.sm), fontWeight: '600', color: selectedStatus === 'pending' ? '#030213' : '#F59E0B' }}>
              {pendingCount} Pending
            </Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={{ 
              flex: 1, 
              backgroundColor: selectedStatus === 'preparing' ? '#1E90FF' : '#F0F0F0', 
              borderRadius: Sizes.radius.sm, 
              padding: Sizes.spacing.sm, 
              alignItems: 'center',
              justifyContent: 'center',
              height: scaled(36),
              borderWidth: selectedStatus === 'preparing' ? 2 : 0,
              borderColor: '#1E90FF',
            }}
            onPress={() => setSelectedStatus(selectedStatus === 'preparing' ? null : 'preparing')}
          >
            <Text style={{ fontSize: scaled(Sizes.typography.sm), fontWeight: '600', color: selectedStatus === 'preparing' ? '#fff' : '#3B82F6' }}>
              {preparingCount} Preparing
            </Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={{ 
              flex: 1, 
              backgroundColor: selectedStatus === 'ready' ? '#32CD32' : '#F0F0F0', 
              borderRadius: Sizes.radius.sm, 
              padding: Sizes.spacing.sm, 
              alignItems: 'center',
              justifyContent: 'center',
              height: scaled(36),
              borderWidth: selectedStatus === 'ready' ? 2 : 0,
              borderColor: '#32CD32',
            }}
            onPress={() => setSelectedStatus(selectedStatus === 'ready' ? null : 'ready')}
          >
            <Text style={{ fontSize: scaled(Sizes.typography.sm), fontWeight: '600', color: selectedStatus === 'ready' ? '#fff' : '#10B981' }}>
              {readyCount} Ready
            </Text>
          </TouchableOpacity>
        </View>

          <Text style={{ fontSize: Sizes.typography.lg, fontWeight: '700',marginTop: Sizes.spacing.sm, marginBottom: Sizes.spacing.sm }}>
            {selectedStatus ? `${selectedStatus.charAt(0).toUpperCase() + selectedStatus.slice(1)} Orders` : 'Active Orders'}
          </Text>

          {filteredOrders.length === 0 ? (
            <View style={{ alignItems: 'center', paddingVertical: scaled(Sizes.spacing.lg) }}>
              <Text style={{ fontSize: Sizes.typography.base, color: Colors.light.mutedForeground, marginBottom: Sizes.spacing.xs }}>
                {selectedStatus ? `No ${selectedStatus} Orders` : 'No Active Orders'}
              </Text>
              <Text style={{ fontSize: Sizes.typography.xs, color: Colors.light.mutedForeground, textAlign: 'center' }}>
                {selectedStatus ? `All orders have been moved from ${selectedStatus} status` : 'All orders have been completed'}
              </Text>
            </View>
          ) : (
            filteredOrders.map(order => renderOrderCard(order))
          )}
          </View>
        </ScrollView>
      )}
    </View>
  );
}