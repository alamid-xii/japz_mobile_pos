import { Clock, Home, CheckSquare, User } from 'lucide-react-native';
import { useCallback, useState, useEffect } from 'react';
import { Alert, ScrollView, Text, TouchableOpacity, View, ActivityIndicator, RefreshControl, Image } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import { BackHandler } from 'react-native';
import { Colors, Sizes } from '../../constants/colors';
import { useAuth } from '../../hooks/useAuth';
import { ordersAPI } from '../../services/api';
import { kitchenStyles } from '../../styles/kitchenStyles';
import { scaled } from '../../utils/responsive';

interface MenuItem {
  id: string;
  name: string;
  hasSize?: boolean;
  hasFlavor?: boolean;
  sizes?: any[];
  flavors?: any[];
}

interface OrderItem {
  id: string;
  name: string;
  quantity: number;
  total: number;
  menuItem?: MenuItem;
  modifiers?: {
    size?: string;
    flavors?: string[];
    notes?: string;
  };
}

interface KitchenOrder {
  id: string;
  orderNumber: string;
  items: OrderItem[];
  station: string;
  status: 'pending' | 'preparing' | 'ready' | 'completed' | 'cancelled';
  createdAt: string;
  totalAmount: number;
}

const statusColors = {
  pending: '#FFD700',
  preparing: '#1E90FF',
  ready: '#32CD32',
  completed: '#6B7280',
  cancelled: '#DC2626',
};

export default function IncomingOrdersScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [orders, setOrders] = useState<KitchenOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState<'pending' | 'preparing' | 'ready'>('pending');

  const fetchOrders = async () => {
    try {
      const response = await ordersAPI.getIncomingByCategories();
      const data = response.data;
      
      // Map and sort by FIFO (oldest first)
      const incomingOrders = (data.orders || [])
        .filter((o: any) => o.status !== 'completed')
        .map((o: any) => ({
          id: o.id.toString(),
          orderNumber: o.orderNumber,
          items: o.items || [],
          station: o.station || '',
          status: o.status,
          createdAt: o.createdAt,
          totalAmount: parseFloat(o.total || 0),
        }))
        .sort((a: KitchenOrder, b: KitchenOrder) => {
          return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        });
      
      setOrders(incomingOrders);
    } catch (error) {
      console.error('Error fetching orders:', error);
      Alert.alert('Error', 'Failed to load orders');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchOrders();
    
    // Auto-refresh every 3 seconds
    const interval = setInterval(() => {
      fetchOrders();
    }, 3000);
    
    return () => clearInterval(interval);
  }, []);

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

  const updateOrderStatus = async (orderId: string, newStatus: 'pending' | 'preparing' | 'ready' | 'completed' | 'cancelled') => {
    try {
      await ordersAPI.updateOrderStatus(orderId, newStatus);
      setOrders(orders.map(order => 
        order.id === orderId ? { ...order, status: newStatus } : order
      ));
    } catch (error) {
      console.error('Error updating order:', error);
      setOrders(orders.map(order => 
        order.id === orderId ? { ...order, status: newStatus } : order
      ));
    }
  };

  const getWaitTime = (createdAt: string) => {
    const now = new Date();
    const created = new Date(createdAt);
    const diffMs = now.getTime() - created.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffSecs = Math.floor((diffMs % 60000) / 1000);
    
    if (diffMins > 0) {
      return `${diffMins}m ${diffSecs}s`;
    }
    return `${diffSecs}s`;
  };

  const renderOrderCard = (order: KitchenOrder) => (
    <View
      key={order.id}
      style={{
        backgroundColor: order.status === 'pending' ? '#FFFFCC' : order.status === 'preparing' ? '#ADD8E6' : order.status === 'ready' ? '#D4F1D4' : Colors.light.card,
        borderRadius: Sizes.radius.md,
        padding: Sizes.spacing.md,
        marginBottom: Sizes.spacing.md,
        borderLeftWidth: 4,
        borderLeftColor: statusColors[order.status as keyof typeof statusColors],
      }}
    >
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Sizes.spacing.sm }}>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: Sizes.typography.base, fontWeight: '700' }}>
            Order {order.orderNumber}
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: Sizes.spacing.xs }}>
            <Clock size={14} color={Colors.light.mutedForeground} />
            <Text style={{ fontSize: Sizes.typography.sm, color: Colors.light.mutedForeground, marginLeft: Sizes.spacing.xs }}>
              {getWaitTime(order.createdAt)}
            </Text>
          </View>
        </View>
      </View>

      <Text style={{ fontSize: Sizes.typography.sm, color: Colors.light.mutedForeground, marginBottom: Sizes.spacing.sm }}>
        {order.items.length} item(s)
      </Text>

      {/* Items List - Always Visible */}
      <View style={{ marginBottom: Sizes.spacing.md }}>
        {order.items.map((item, idx) => (
          <View key={idx} style={{ paddingBottom: Sizes.spacing.sm, borderBottomWidth: idx < order.items.length - 1 ? 1 : 0, borderBottomColor: Colors.light.border }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <Text style={{ color: Colors.light.foreground, fontWeight: '500', flex: 1 }}>
                {item.quantity}x {item.menuItem?.name || item.name}
              </Text>
              {item.total && (
                <Text style={{ color: Colors.light.foreground, fontWeight: '500', marginLeft: Sizes.spacing.sm }}>
                  ₱{typeof item.total === 'number' ? item.total.toFixed(2) : parseFloat(item.total).toFixed(2)}
                </Text>
              )}
            </View>
            {item.modifiers && (
              <View style={{ marginTop: Sizes.spacing.xs, marginLeft: Sizes.spacing.md }}>
                {item.modifiers.size && (
                  <Text style={{ color: Colors.light.mutedForeground, fontSize: Sizes.typography.xs }}>
                    Size: {item.modifiers.size}
                  </Text>
                )}
                {item.modifiers.flavors && Array.isArray(item.modifiers.flavors) && item.modifiers.flavors.length > 0 && (
                  <Text style={{ color: Colors.light.mutedForeground, fontSize: Sizes.typography.xs }}>
                    Flavors: {item.modifiers.flavors.join(', ')}
                  </Text>
                )}
                {item.modifiers.notes && (
                  <Text style={{ color: Colors.light.mutedForeground, fontSize: Sizes.typography.xs, fontStyle: 'italic' }}>
                    Note: {item.modifiers.notes}
                  </Text>
                )}
              </View>
            )}
          </View>
        ))}
      </View>

      {/* Action Button - Update to Next Status */}
      <TouchableOpacity
        style={{
          backgroundColor: order.status === 'pending' ? '#FF6B35' : order.status === 'preparing' ? '#1E90FF' : '#4CAF50',
          paddingVertical: Sizes.spacing.sm,
          paddingHorizontal: Sizes.spacing.md,
          borderRadius: Sizes.radius.md,
        }}
        onPress={() => {
          if (order.status === 'pending') {
            updateOrderStatus(order.id, 'preparing');
          } else if (order.status === 'preparing') {
            updateOrderStatus(order.id, 'ready');
          } else if (order.status === 'ready') {
            updateOrderStatus(order.id, 'completed');
          }
        }}
      >
        <Text style={{ color: '#fff', fontWeight: '600', fontSize: Sizes.typography.sm, textAlign: 'center' }}>
          {order.status === 'pending' ? 'Start Preparing' : order.status === 'preparing' ? 'Mark Ready' : 'Complete Order'}
        </Text>
      </TouchableOpacity>
    </View>
  );

  const pendingCount = orders.filter(o => o.status === 'pending').length;
  const preparingCount = orders.filter(o => o.status === 'preparing').length;
  const readyCount = orders.filter(o => o.status === 'ready').length;

  const filteredOrders = orders.filter(o => o.status === selectedStatus);

  return (
    <View style={kitchenStyles.container}>
      <View style={kitchenStyles.header}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: Sizes.spacing.sm }}>
          <Image
            source={require('../../assets/images/logo.jpg')}
            style={{ width: scaled(36), height: scaled(36), borderRadius: scaled(8) }}
          />
          <Text style={kitchenStyles.title}>Incoming Orders</Text>
        </View>
      </View>

      {/* Status Filter Tabs */}
      <View style={{ flexDirection: 'row', paddingHorizontal: Sizes.spacing.lg, paddingVertical: Sizes.spacing.md, gap: Sizes.spacing.sm }}>
        <TouchableOpacity
          onPress={() => setSelectedStatus('pending')}
          style={{
            flex: 1,
            paddingVertical: Sizes.spacing.sm,
            paddingHorizontal: Sizes.spacing.md,
            borderRadius: Sizes.radius.md,
            backgroundColor: selectedStatus === 'pending' ? '#FFD700' : Colors.light.muted,
          }}
        >
          <Text style={{ textAlign: 'center', fontWeight: '600', fontSize: Sizes.typography.sm, color: selectedStatus === 'pending' ? '#000' : Colors.light.mutedForeground }}>
            Pending ({pendingCount})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => setSelectedStatus('preparing')}
          style={{
            flex: 1,
            paddingVertical: Sizes.spacing.sm,
            paddingHorizontal: Sizes.spacing.md,
            borderRadius: Sizes.radius.md,
            backgroundColor: selectedStatus === 'preparing' ? '#1E90FF' : Colors.light.muted,
          }}
        >
          <Text style={{ textAlign: 'center', fontWeight: '600', fontSize: Sizes.typography.sm, color: selectedStatus === 'preparing' ? '#fff' : Colors.light.mutedForeground }}>
            Preparing ({preparingCount})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => setSelectedStatus('ready')}
          style={{
            flex: 1,
            paddingVertical: Sizes.spacing.sm,
            paddingHorizontal: Sizes.spacing.md,
            borderRadius: Sizes.radius.md,
            backgroundColor: selectedStatus === 'ready' ? '#32CD32' : Colors.light.muted,
          }}
        >
          <Text style={{ textAlign: 'center', fontWeight: '600', fontSize: Sizes.typography.sm, color: selectedStatus === 'ready' ? '#fff' : Colors.light.mutedForeground }}>
            Ready ({readyCount})
          </Text>
        </TouchableOpacity>
      </View>

      {/* Orders List */}
      {filteredOrders.length > 0 ? (
        <ScrollView
          showsVerticalScrollIndicator={false}
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingHorizontal: Sizes.spacing.lg, paddingBottom: Sizes.spacing.lg }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        >
          {filteredOrders.map((order) => renderOrderCard(order))}
        </ScrollView>
      ) : (
        <View style={kitchenStyles.emptyState}>
          <Text style={kitchenStyles.emptyStateText}>No Orders</Text>
          <Text style={kitchenStyles.emptyStateSubtext}>
            {selectedStatus ? `No ${selectedStatus} orders at the moment` : 'No incoming orders at the moment'}
          </Text>
        </View>
      )}
    </View>
  );
}
