import { useState, useEffect, useCallback } from 'react';
import { ScrollView, Text, TouchableOpacity, View, ActivityIndicator, RefreshControl } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { BackHandler } from 'react-native';
import { CashierBottomNav } from '../../components/shared/CashierBottomNav';
import { Colors, Sizes } from '../../constants/colors';
import { scaled } from '../../utils/responsive';
import { ordersAPI } from '../../services/api';
import { cashierStyles } from '../../styles/cashierStyles';

interface Order {
  id: string;
  orderNumber: string;
  customerName: string;
  status: 'pending' | 'preparing' | 'ready' | 'completed';
  items: string[];
  totalAmount: number;
  createdAt: string;
  expandedId: string | null;
}

const statusColors = {
  pending: '#F59E0B',
  preparing: '#3B82F6',
  ready: '#10B981',
  completed: '#6B7280',
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
        items: o.items ? o.items.map((item: any) => item.name) : [],
        totalAmount: parseFloat(o.total || 0),
        createdAt: new Date(o.createdAt).toLocaleTimeString(),
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

  const updateOrderStatus = async (id: string, newStatus: 'pending' | 'preparing' | 'ready' | 'completed') => {
    try {
      await ordersAPI.updateStatus(id, newStatus);
      // Update local state
      setOrders(orders.map(order => 
        order.id === id ? { ...order, status: newStatus } : order
      ));
    } catch (e) {
      console.error('Failed to update order status', e);
      // Still update local state for better UX
      setOrders(orders.map(order => 
        order.id === id ? { ...order, status: newStatus } : order
      ));
    }
  };

  const renderOrderCard = (order: Order) => (
    <TouchableOpacity
      key={order.id}
      style={{
        backgroundColor: Colors.light.card,
        borderRadius: Sizes.radius.md,
        padding: Sizes.spacing.md,
        marginBottom: Sizes.spacing.md,
        borderLeftWidth: 4,
        borderLeftColor: statusColors[order.status],
      }}
      onPress={() => toggleExpand(order.id)}
    >
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Sizes.spacing.sm }}>
        <Text style={{ fontSize: Sizes.typography.base, fontWeight: '700' }}>
          {order.orderNumber}
        </Text>
        <View
          style={{
            backgroundColor: statusColors[order.status],
            paddingHorizontal: Sizes.spacing.sm,
            paddingVertical: 4,
            borderRadius: Sizes.radius.sm,
          }}
        >
          <Text style={{ color: '#fff', fontSize: Sizes.typography.xs, fontWeight: '600', textTransform: 'capitalize' }}>
            {order.status}
          </Text>
        </View>
      </View>

      <Text style={{ color: Colors.light.mutedForeground, marginBottom: Sizes.spacing.sm }}>
        {order.customerName}
      </Text>

      <Text style={{ fontSize: Sizes.typography.sm, color: Colors.light.mutedForeground, marginBottom: Sizes.spacing.sm }}>
        {order.items.length} item(s) • ₱{order.totalAmount.toFixed(2)}
      </Text>

      {expanded === order.id && (
        <View style={{ marginTop: Sizes.spacing.md, paddingTop: Sizes.spacing.md, borderTopWidth: 1, borderTopColor: Colors.light.border }}>
          <Text style={{ fontWeight: '600', marginBottom: Sizes.spacing.sm }}>Items:</Text>
          {order.items.map((item, idx) => (
            <Text key={idx} style={{ color: Colors.light.mutedForeground, marginLeft: Sizes.spacing.md, marginBottom: 4 }}>
              • {item}
            </Text>
          ))}

          <View style={{ marginTop: Sizes.spacing.md, gap: Sizes.spacing.sm }}>
            {(['pending', 'preparing', 'ready'] as const).map((status) => (
              <TouchableOpacity
                key={status}
                style={{
                  backgroundColor: order.status === status ? statusColors[status] : Colors.light.muted,
                  paddingVertical: Sizes.spacing.sm,
                  paddingHorizontal: Sizes.spacing.md,
                  borderRadius: Sizes.radius.sm,
                }}
                onPress={() => updateOrderStatus(order.id, status)}
              >
                <Text
                  style={{
                    color: order.status === status ? '#fff' : Colors.light.mutedForeground,
                    textAlign: 'center',
                    fontWeight: '600',
                    textTransform: 'capitalize',
                  }}
                >
                  Mark as {status}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
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
          <View style={{ padding: scaled(Sizes.spacing.lg) }}>
          <View style={{ flexDirection: 'row', gap: scaled(Sizes.spacing.md), marginBottom: scaled(Sizes.spacing.lg) }}>
          <TouchableOpacity 
            style={{ 
              flex: 1, 
              backgroundColor: selectedStatus === 'pending' ? Colors.brand.primary : Colors.light.card, 
              borderRadius: Sizes.radius.md, 
              padding: Sizes.spacing.md, 
              alignItems: 'center',
              borderWidth: selectedStatus === 'pending' ? 2 : 0,
              borderColor: Colors.brand.primary,
            }}
            onPress={() => setSelectedStatus(selectedStatus === 'pending' ? null : 'pending')}
          >
            <Text style={{ fontSize: Sizes.typography.lg, fontWeight: '700', color: selectedStatus === 'pending' ? '#fff' : '#F59E0B' }}>
              {pendingCount}
            </Text>
            <Text style={{ fontSize: Sizes.typography.sm, color: selectedStatus === 'pending' ? '#fff' : Colors.light.mutedForeground }}>
              Pending
            </Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={{ 
              flex: 1, 
              backgroundColor: selectedStatus === 'preparing' ? Colors.brand.primary : Colors.light.card, 
              borderRadius: Sizes.radius.md, 
              padding: Sizes.spacing.md, 
              alignItems: 'center',
              borderWidth: selectedStatus === 'preparing' ? 2 : 0,
              borderColor: Colors.brand.primary,
            }}
            onPress={() => setSelectedStatus(selectedStatus === 'preparing' ? null : 'preparing')}
          >
            <Text style={{ fontSize: Sizes.typography.lg, fontWeight: '700', color: selectedStatus === 'preparing' ? '#fff' : '#3B82F6' }}>
              {preparingCount}
            </Text>
            <Text style={{ fontSize: Sizes.typography.sm, color: selectedStatus === 'preparing' ? '#fff' : Colors.light.mutedForeground }}>
              Preparing
            </Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={{ 
              flex: 1, 
              backgroundColor: selectedStatus === 'ready' ? Colors.brand.primary : Colors.light.card, 
              borderRadius: Sizes.radius.md, 
              padding: Sizes.spacing.md, 
              alignItems: 'center',
              borderWidth: selectedStatus === 'ready' ? 2 : 0,
              borderColor: Colors.brand.primary,
            }}
            onPress={() => setSelectedStatus(selectedStatus === 'ready' ? null : 'ready')}
          >
            <Text style={{ fontSize: Sizes.typography.lg, fontWeight: '700', color: selectedStatus === 'ready' ? '#fff' : '#10B981' }}>
              {readyCount}
            </Text>
            <Text style={{ fontSize: Sizes.typography.sm, color: selectedStatus === 'ready' ? '#fff' : Colors.light.mutedForeground }}>
              Ready
            </Text>
          </TouchableOpacity>
        </View>

          <Text style={{ fontSize: Sizes.typography.base, fontWeight: '700', marginBottom: Sizes.spacing.md }}>
            {selectedStatus ? `${selectedStatus.charAt(0).toUpperCase() + selectedStatus.slice(1)} Orders` : 'Active Orders'}
          </Text>

          {filteredOrders.length === 0 ? (
            <View style={{ alignItems: 'center', paddingVertical: scaled(Sizes.spacing.xl * 2) }}>
              <Text style={{ fontSize: Sizes.typography.lg, color: Colors.light.mutedForeground, marginBottom: Sizes.spacing.sm }}>
                {selectedStatus ? `No ${selectedStatus} Orders` : 'No Active Orders'}
              </Text>
              <Text style={{ fontSize: Sizes.typography.sm, color: Colors.light.mutedForeground, textAlign: 'center' }}>
                {selectedStatus ? `All orders have been moved from ${selectedStatus} status` : 'All orders have been completed'}
              </Text>
            </View>
          ) : (
            filteredOrders.map(order => renderOrderCard(order))
          )}
          </View>
        </ScrollView>
      )}
      <CashierBottomNav currentScreen="orders" />
    </View>
  );
}