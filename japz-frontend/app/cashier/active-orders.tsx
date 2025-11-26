import { useState } from 'react';
import { ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { CashierBottomNav } from '../../components/shared/CashierBottomNav';
import { Colors, Sizes } from '../../constants/colors';

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

const mockOrders: Order[] = [
  {
    id: '1',
    orderNumber: 'ORD-001',
    customerName: 'Juan Dela Cruz',
    status: 'ready',
    items: ['Adobo Platter', 'Iced Tea', 'Rice'],
    totalAmount: 1650,
    createdAt: new Date(Date.now() - 15 * 60000).toLocaleTimeString(),
    expandedId: null,
  },
  {
    id: '2',
    orderNumber: 'ORD-002',
    customerName: 'Maria Santos',
    status: 'preparing',
    items: ['Sinigang', 'Sprite', 'Dessert'],
    totalAmount: 1450,
    createdAt: new Date(Date.now() - 5 * 60000).toLocaleTimeString(),
    expandedId: null,
  },
  {
    id: '3',
    orderNumber: 'ORD-003',
    customerName: 'Pedro Garcia',
    status: 'pending',
    items: ['Kare-Kare', 'Mango Juice'],
    totalAmount: 1200,
    createdAt: new Date(Date.now() - 2 * 60000).toLocaleTimeString(),
    expandedId: null,
  },
];

const statusColors = {
  pending: '#F59E0B',
  preparing: '#3B82F6',
  ready: '#10B981',
  completed: '#6B7280',
};

export default function ActiveOrdersScreen() {
  const [orders, setOrders] = useState<Order[]>(mockOrders);
  const [expanded, setExpanded] = useState<string | null>(null);

  const toggleExpand = (id: string) => {
    setExpanded(expanded === id ? null : id);
  };

  const updateOrderStatus = (id: string, newStatus: 'pending' | 'preparing' | 'ready' | 'completed') => {
    setOrders(orders.map(order => 
      order.id === id ? { ...order, status: newStatus } : order
    ));
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

  return (
    <View style={{ flex: 1 }}>
      <ScrollView
        style={{ flex: 1, backgroundColor: Colors.light.background }}
        contentContainerStyle={{ padding: Sizes.spacing.lg }}
      >
        <View style={{ flexDirection: 'row', gap: Sizes.spacing.md, marginBottom: Sizes.spacing.lg }}>
          <View style={{ flex: 1, backgroundColor: Colors.light.card, borderRadius: Sizes.radius.md, padding: Sizes.spacing.md, alignItems: 'center' }}>
            <Text style={{ fontSize: Sizes.typography.lg, fontWeight: '700', color: '#F59E0B' }}>
              {pendingCount}
            </Text>
            <Text style={{ fontSize: Sizes.typography.sm, color: Colors.light.mutedForeground }}>
              Pending
            </Text>
          </View>
          <View style={{ flex: 1, backgroundColor: Colors.light.card, borderRadius: Sizes.radius.md, padding: Sizes.spacing.md, alignItems: 'center' }}>
            <Text style={{ fontSize: Sizes.typography.lg, fontWeight: '700', color: '#3B82F6' }}>
              {preparingCount}
            </Text>
            <Text style={{ fontSize: Sizes.typography.sm, color: Colors.light.mutedForeground }}>
              Preparing
            </Text>
          </View>
          <View style={{ flex: 1, backgroundColor: Colors.light.card, borderRadius: Sizes.radius.md, padding: Sizes.spacing.md, alignItems: 'center' }}>
            <Text style={{ fontSize: Sizes.typography.lg, fontWeight: '700', color: '#10B981' }}>
              {readyCount}
            </Text>
            <Text style={{ fontSize: Sizes.typography.sm, color: Colors.light.mutedForeground }}>
              Ready
            </Text>
          </View>
        </View>

        <Text style={{ fontSize: Sizes.typography.base, fontWeight: '700', marginBottom: Sizes.spacing.md }}>
          Active Orders
        </Text>

        {orders.map(order => renderOrderCard(order))}
      </ScrollView>
      <CashierBottomNav currentScreen="orders" />
    </View>
  );
}