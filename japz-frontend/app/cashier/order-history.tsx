import { Banknote, CreditCard, Smartphone, ChevronDown } from 'lucide-react-native';
import { useState, useEffect, useCallback } from 'react';
import { ScrollView, Text, TextInput, TouchableOpacity, View, ActivityIndicator, RefreshControl } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { BackHandler } from 'react-native';
import { CashierBottomNav } from '../../components/shared/CashierBottomNav';
import { Colors, Sizes } from '../../constants/colors';
import { scaled } from '../../utils/responsive';
import { ordersAPI } from '../../services/api';
import { cashierStyles } from '../../styles/cashierStyles';

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

export default function OrderHistoryScreen() {
  const [search, setSearch] = useState('');
  const [selectedPayment, setSelectedPayment] = useState<'all' | 'cash' | 'card' | 'digital'>('all');
  const [expanded, setExpanded] = useState<string | null>(null);
  const [orders, setOrders] = useState<HistoryOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState<'all' | 'today' | 'week' | 'month'>('all');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const fetchOrders = async () => {
    try {
      setError(null);
      const res = await ordersAPI.getAll();
      const ordersData = res.data || [];
      // Filter for completed orders only
      const completedOrders = ordersData.filter((o: any) => o.status === 'completed');
      // map order shape to HistoryOrder
      const history = completedOrders.map((o: any) => ({
        id: String(o.id),
        orderNumber: o.orderNumber,
        date: o.createdAt, // Keep as ISO string for accurate date comparison
        time: new Date(o.createdAt).toLocaleTimeString(),
        customerName: o.customerName || '-',
        items: o.items ? o.items.length : 0,
        totalAmount: parseFloat(o.total || 0),
        paymentMethod: o.payments?.[0]?.method || 'cash',
        cashier: o.cashier?.name || '-',
      }));
      setOrders(history);
    } catch (e: any) {
      console.error('Failed to load orders from server', e);
      setError(e.response?.data?.error || 'Failed to load order history');
      setOrders([]);
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

  const isWithinPeriod = (orderDate: string, period: string) => {
    const now = new Date();
    const orderDateObj = new Date(orderDate);
    const diffTime = now.getTime() - orderDateObj.getTime();
    const diffDays = diffTime / (1000 * 3600 * 24);
    switch (period) {
      case 'today': return diffDays < 1;
      case 'week': return diffDays < 7;
      case 'month': return diffDays < 30;
      default: return true;
    }
  };

  const filteredOrders = orders.filter(order => {
    const matchSearch =
      order.orderNumber.toLowerCase().includes(search.toLowerCase()) ||
      order.customerName.toLowerCase().includes(search.toLowerCase());
    const matchPayment = selectedPayment === 'all' || order.paymentMethod === selectedPayment;
    const matchPeriod = selectedPeriod === 'all' || isWithinPeriod(order.date, selectedPeriod);
    return matchSearch && matchPayment && matchPeriod;
  });

  const toggleExpand = (id: string) => {
    setExpanded(expanded === id ? null : id);
  };

  const totalRevenue = filteredOrders.length > 0 
    ? filteredOrders.reduce((sum, order) => sum + (parseFloat(String(order.totalAmount)) || 0), 0)
    : 0;

  return (
    <View style={{ flex: 1 }}>
      {/* Header */}
      <View style={cashierStyles.header}>
        <Text style={cashierStyles.title}>Order History</Text>
        <TouchableOpacity 
          style={{ flexDirection: 'row', alignItems: 'center', gap: Sizes.spacing.sm }}
          onPress={() => setIsDropdownOpen(!isDropdownOpen)}
        >
          <Text style={{ color: Colors.light.foreground, fontSize: Sizes.typography.sm }}>
            {selectedPeriod === 'all' ? 'All Time' : selectedPeriod.charAt(0).toUpperCase() + selectedPeriod.slice(1)}
          </Text>
          <ChevronDown size={16} color={Colors.light.foreground} />
        </TouchableOpacity>
      </View>

      {isDropdownOpen && (
        <View style={{ backgroundColor: Colors.light.card, borderBottomWidth: 1, borderBottomColor: Colors.light.border }}>
          {(['all', 'today', 'week', 'month'] as const).map((period) => (
            <TouchableOpacity
              key={period}
              style={{ padding: Sizes.spacing.md, borderBottomWidth: period !== 'month' ? 1 : 0, borderBottomColor: Colors.light.border }}
              onPress={() => {
                setSelectedPeriod(period);
                setIsDropdownOpen(false);
              }}
            >
              <Text style={{ color: Colors.light.foreground, textTransform: 'capitalize' }}>
                {period === 'all' ? 'All Time' : period}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {loading ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.light.background }}>
          <ActivityIndicator size="large" color={Colors.brand.primary} />
          <Text style={{ marginTop: Sizes.spacing.md, color: Colors.light.mutedForeground }}>Loading order history...</Text>
        </View>
      ) : error ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.light.background, padding: Sizes.spacing.lg }}>
          <Text style={{ fontSize: Sizes.typography.base, color: '#EF4444', textAlign: 'center'}}>
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

        {/* Summary Card */}
        <View style={{ backgroundColor: Colors.light.card, borderRadius: Sizes.radius.md, padding: scaled(Sizes.spacing.lg) }}>
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
        <View style={{ flexDirection: 'row', gap: scaled(Sizes.spacing.sm), marginBottom: scaled(Sizes.spacing.lg) }}>
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
                    {new Date(order.date).toLocaleDateString()} • {order.time}
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
                <View style={{ width: scaled(18) }}>
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
        </View>
        </ScrollView>
      )}
      <CashierBottomNav currentScreen="history" />
    </View>
  );
}