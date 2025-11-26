import { Banknote, CreditCard, Smartphone } from 'lucide-react-native';
import { useState } from 'react';
import { ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { CashierBottomNav } from '../../components/shared/CashierBottomNav';
import { Colors, Sizes } from '../../constants/colors';

interface HistoryOrder {
  id: string;
  orderNumber: string;
  date: string;
  time: string;
  customerName: string;
  items: number;
  totalAmount: number;
  paymentMethod: 'cash' | 'card' | 'digital';
  cashier: string;
}

const getPaymentMethodIcon = (method: string) => {
  const iconProps = { size: 16, color: Colors.light.primary };
  switch (method) {
    case 'cash': return <Banknote {...iconProps} />;
    case 'card': return <CreditCard {...iconProps} />;
    case 'digital': return <Smartphone {...iconProps} />;
    default: return null;
  }
};

const mockHistory: HistoryOrder[] = [
  {
    id: '1',
    orderNumber: 'ORD-001',
    date: '2024-01-15',
    time: '14:30',
    customerName: 'Juan Dela Cruz',
    items: 3,
    totalAmount: 1650,
    paymentMethod: 'cash',
    cashier: 'Maria',
  },
  {
    id: '2',
    orderNumber: 'ORD-002',
    date: '2024-01-15',
    time: '13:45',
    customerName: 'Pedro Garcia',
    items: 2,
    totalAmount: 1200,
    paymentMethod: 'card',
    cashier: 'Juan',
  },
  {
    id: '3',
    orderNumber: 'ORD-003',
    date: '2024-01-14',
    time: '19:20',
    customerName: 'Maria Santos',
    items: 4,
    totalAmount: 2100,
    paymentMethod: 'digital',
    cashier: 'Maria',
  },
];

export default function OrderHistoryScreen() {
  const [search, setSearch] = useState('');
  const [selectedPayment, setSelectedPayment] = useState<'all' | 'cash' | 'card' | 'digital'>('all');
  const [expanded, setExpanded] = useState<string | null>(null);

  const filteredOrders = mockHistory.filter(order => {
    const matchSearch =
      order.orderNumber.toLowerCase().includes(search.toLowerCase()) ||
      order.customerName.toLowerCase().includes(search.toLowerCase());
    const matchPayment = selectedPayment === 'all' || order.paymentMethod === selectedPayment;
    return matchSearch && matchPayment;
  });

  const toggleExpand = (id: string) => {
    setExpanded(expanded === id ? null : id);
  };

  const totalRevenue = filteredOrders.reduce((sum, order) => sum + order.totalAmount, 0);

  return (
    <View style={{ flex: 1 }}>
      <ScrollView
        style={{ flex: 1, backgroundColor: Colors.light.background }}
        contentContainerStyle={{ padding: Sizes.spacing.lg }}
      >
        <Text style={{ fontSize: Sizes.typography.lg, fontWeight: '700', marginBottom: Sizes.spacing.lg }}>
          Order History
        </Text>

        {/* Summary Card */}
        <View style={{ backgroundColor: Colors.light.card, borderRadius: Sizes.radius.md, padding: Sizes.spacing.lg, marginBottom: Sizes.spacing.lg }}>
          <Text style={{ color: Colors.light.mutedForeground, marginBottom: Sizes.spacing.sm }}>
            Total Revenue (Filtered)
          </Text>
          <Text style={{ fontSize: Sizes.typography.xl, fontWeight: '700', color: Colors.light.primary }}>
            ₱{totalRevenue.toFixed(2)}
          </Text>
          <Text style={{ color: Colors.light.mutedForeground, marginTop: Sizes.spacing.sm, fontSize: Sizes.typography.sm }}>
            {filteredOrders.length} order(s)
          </Text>
        </View>

        {/* Search */}
        <TextInput
          style={{
            borderWidth: 1,
            borderColor: Colors.light.border,
            borderRadius: Sizes.radius.md,
            padding: Sizes.spacing.md,
            color: Colors.light.foreground,
            marginBottom: Sizes.spacing.md,
            fontSize: Sizes.typography.base,
          }}
          placeholder="Search by order # or customer..."
          placeholderTextColor={Colors.light.mutedForeground}
          value={search}
          onChangeText={setSearch}
        />

        {/* Filter by Payment Method */}
        <Text style={{ fontSize: Sizes.typography.sm, fontWeight: '600', marginBottom: Sizes.spacing.sm, color: Colors.light.mutedForeground }}>
          Payment Method
        </Text>
        <View style={{ flexDirection: 'row', gap: Sizes.spacing.sm, marginBottom: Sizes.spacing.lg }}>
          {(['all', 'cash', 'card', 'digital'] as const).map((method) => (
            <TouchableOpacity
              key={method}
              style={{
                flex: 1,
                paddingVertical: Sizes.spacing.sm,
                paddingHorizontal: Sizes.spacing.md,
                borderRadius: Sizes.radius.sm,
                backgroundColor: selectedPayment === method ? Colors.light.primary : Colors.light.card,
                borderWidth: 1,
                borderColor: selectedPayment === method ? Colors.light.primary : Colors.light.border,
                alignItems: 'center',
              }}
              onPress={() => setSelectedPayment(method)}
            >
              <Text
                style={{
                  color: selectedPayment === method ? '#fff' : Colors.light.foreground,
                  fontWeight: '600',
                  fontSize: Sizes.typography.sm,
                  textTransform: 'capitalize',
                }}
              >
                {method === 'all' ? 'All' : method}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Orders List */}
        {filteredOrders.length > 0 ? (
          filteredOrders.map((order) => (
            <TouchableOpacity
              key={order.id}
              style={{
                backgroundColor: Colors.light.card,
                borderRadius: Sizes.radius.md,
                padding: Sizes.spacing.md,
                marginBottom: Sizes.spacing.md,
                borderLeftWidth: 4,
                borderLeftColor: Colors.light.primary,
              }}
              onPress={() => toggleExpand(order.id)}
            >
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Sizes.spacing.sm }}>
                <View>
                  <Text style={{ fontSize: Sizes.typography.base, fontWeight: '700' }}>
                    {order.orderNumber}
                  </Text>
                  <Text style={{ color: Colors.light.mutedForeground, fontSize: Sizes.typography.sm }}>
                    {order.date} • {order.time}
                  </Text>
                </View>
                <Text style={{ fontSize: Sizes.typography.lg, fontWeight: '700', color: Colors.light.primary }}>
                  ₱{order.totalAmount.toFixed(2)}
                </Text>
              </View>

              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text style={{ color: Colors.light.mutedForeground }}>
                  {order.customerName}
                </Text>
                <View style={{ width: 18 }}>
                  {getPaymentMethodIcon(order.paymentMethod)}
                </View>
              </View>

              {expanded === order.id && (
                <View style={{ marginTop: Sizes.spacing.md, paddingTop: Sizes.spacing.md, borderTopWidth: 1, borderTopColor: Colors.light.border }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: Sizes.spacing.sm }}>
                    <Text style={{ color: Colors.light.mutedForeground }}>Items:</Text>
                    <Text style={{ fontWeight: '600' }}>{order.items}</Text>
                  </View>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: Sizes.spacing.sm }}>
                    <Text style={{ color: Colors.light.mutedForeground }}>Payment:</Text>
                    <Text style={{ fontWeight: '600', textTransform: 'capitalize' }}>{order.paymentMethod}</Text>
                  </View>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                    <Text style={{ color: Colors.light.mutedForeground }}>Cashier:</Text>
                    <Text style={{ fontWeight: '600' }}>{order.cashier}</Text>
                  </View>
                </View>
              )}
            </TouchableOpacity>
          ))
        ) : (
          <View style={{ alignItems: 'center', paddingVertical: Sizes.spacing.xl }}>
            <Text style={{ color: Colors.light.mutedForeground, fontSize: Sizes.typography.base }}>
              No orders found
            </Text>
          </View>
        )}
      </ScrollView>
      <CashierBottomNav currentScreen="history" />
    </View>
  );
}