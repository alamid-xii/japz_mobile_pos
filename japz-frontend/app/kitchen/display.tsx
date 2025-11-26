import { CheckCircle, Clock } from 'lucide-react-native';
import { useState } from 'react';
import { FlatList, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { KitchenBottomNav } from '../../components/shared/KitchenBottomNav';
import { Colors, Sizes } from '../../constants/colors';

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.light.background,
  },
  header: {
    paddingHorizontal: Sizes.spacing.lg,
    paddingVertical: Sizes.spacing.md,
    backgroundColor: Colors.light.background,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.border,
  },
  title: {
    fontSize: Sizes.typography.lg,
    fontWeight: '600',
    color: Colors.light.foreground,
  },
  stationButton: {
    paddingHorizontal: Sizes.spacing.md,
    paddingVertical: Sizes.spacing.sm,
    marginRight: Sizes.spacing.sm,
    borderRadius: Sizes.radius.md,
    backgroundColor: Colors.light.border,
  },
  stationButtonActive: {
    backgroundColor: Colors.light.primary,
  },
  stationButtonText: {
    color: Colors.light.foreground,
    fontWeight: '500',
    fontSize: Sizes.typography.sm,
  },
  stationButtonTextActive: {
    color: '#fff',
  },
  orderCard: {
    backgroundColor: Colors.light.card,
    borderRadius: Sizes.radius.md,
    padding: Sizes.spacing.md,
    marginBottom: Sizes.spacing.md,
    borderLeftWidth: 4,
    borderLeftColor: Colors.light.primary,
  },
  orderNumber: {
    fontSize: Sizes.typography.lg,
    fontWeight: '700',
    color: Colors.light.foreground,
  },
});

interface KitchenOrder {
  id: string;
  orderNumber: string;
  items: { name: string; quantity: number; notes?: string }[];
  station: string;
  status: 'new' | 'preparing' | 'ready';
  timestamp: string;
  waitTime: string;
}

export default function KitchenDisplayScreen() {
  const [selectedStation, setSelectedStation] = useState('Burger Station');
  const [orders, setOrders] = useState<KitchenOrder[]>([
    {
      id: '1',
      orderNumber: 'JAPZ001',
      items: [
        { name: 'Classic Burger', quantity: 2, notes: 'No onions' },
        { name: 'Cheese Burger', quantity: 1 },
      ],
      station: 'Burger Station',
      status: 'new',
      timestamp: '10:30 AM',
      waitTime: '2 min',
    },
    {
      id: '2',
      orderNumber: 'JAPZ002',
      items: [
        { name: 'BBQ Burger', quantity: 1 },
      ],
      station: 'Burger Station',
      status: 'preparing',
      timestamp: '10:25 AM',
      waitTime: '7 min',
    },
  ]);

  const stations = ['Burger Station', 'Pasta & Fries', 'Coffee & Beverage'];
  const filteredOrders = orders.filter(
    order => order.station === selectedStation
  );

  const updateOrderStatus = (orderId: string, newStatus: 'preparing' | 'ready') => {
    setOrders(prev =>
      prev.map(order =>
        order.id === orderId ? { ...order, status: newStatus } : order
      )
    );
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'new':
        return '#EF4444';
      case 'preparing':
        return '#F59E0B';
      case 'ready':
        return '#10B981';
      default:
        return Colors.light.mutedForeground;
    }
  };

  return (
    <View style={[styles.container, { flex: 1 }]}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Kitchen Display System</Text>
      </View>

      {/* Station Selector */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={{ paddingVertical: Sizes.spacing.md }}
        contentContainerStyle={{ paddingHorizontal: Sizes.spacing.md }}
      >
        {stations.map(station => (
          <TouchableOpacity
            key={station}
            style={[
              styles.stationButton,
              selectedStation === station && styles.stationButtonActive,
            ]}
            onPress={() => setSelectedStation(station)}
          >
            <Text
              style={[
                styles.stationButtonText,
                selectedStation === station && styles.stationButtonTextActive,
              ]}
            >
              {station}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Orders List */}
      <FlatList
        data={filteredOrders}
        keyExtractor={item => item.id}
        renderItem={({ item }) => (
          <View style={styles.orderCard}>
            {/* Order Header */}
            <View style={{ marginBottom: Sizes.spacing.md }}>
              <View style={{ flex: 1 }}>
                <Text style={styles.orderNumber}>Order {item.orderNumber}</Text>
                <View style={{ flexDirection: 'row', marginTop: 4 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginRight: 12 }}>
                    <Clock size={14} color={Colors.light.mutedForeground} />
                    <Text style={{ marginLeft: 4, color: Colors.light.mutedForeground }}>
                      {item.waitTime}
                    </Text>
                  </View>
                  <Text
                    style={{
                      paddingHorizontal: 8,
                      paddingVertical: 2,
                      borderRadius: 4,
                      backgroundColor: getStatusColor(item.status),
                      color: '#fff',
                      fontSize: 12,
                      fontWeight: '600',
                    }}
                  >
                    {item.status.toUpperCase()}
                  </Text>
                </View>
              </View>
            </View>

            {/* Items */}
            {item.items.map((lineItem, idx) => (
              <View key={idx} style={{ paddingVertical: 8, borderTopWidth: idx === 0 ? 0 : 1, borderTopColor: Colors.light.border }}>
                <Text style={{ fontWeight: '600', color: Colors.light.foreground, fontSize: 14 }}>
                  {lineItem.quantity}x {lineItem.name}
                </Text>
                {lineItem.notes && (
                  <Text style={{ color: Colors.light.mutedForeground, fontSize: 12, fontStyle: 'italic', marginTop: 4 }}>Note: {lineItem.notes}</Text>
                )}
              </View>
            ))}

            {/* Action Buttons */}
            <View style={{ flexDirection: 'row', marginTop: 12, gap: 8 }}>
              {item.status === 'new' && (
                <TouchableOpacity
                  style={{ backgroundColor: '#F59E0B', borderRadius: 8, paddingVertical: 8, paddingHorizontal: 12, flex: 1, alignItems: 'center' }}
                  onPress={() => updateOrderStatus(item.id, 'preparing')}
                >
                  <Text style={{ color: '#fff', fontWeight: '600' }}>Start Preparing</Text>
                </TouchableOpacity>
              )}
              {item.status === 'preparing' && (
                <TouchableOpacity
                  style={{ backgroundColor: '#10B981', borderRadius: 8, paddingVertical: 8, paddingHorizontal: 12, flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 }}
                  onPress={() => updateOrderStatus(item.id, 'ready')}
                >
                  <CheckCircle size={16} color="#fff" />
                  <Text style={{ color: '#fff', fontWeight: '600' }}>Mark Ready</Text>
                </TouchableOpacity>
              )}
              {item.status === 'ready' && (
                <View style={{ flex: 1, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 4 }}>
                  <CheckCircle size={18} color="#10B981" />
                  <Text style={{ color: '#10B981', fontWeight: '600' }}>
                    Ready for Pickup
                  </Text>
                </View>
              )}
            </View>
          </View>
        )}
        contentContainerStyle={{ padding: Sizes.spacing.md }}
      />
      <KitchenBottomNav currentScreen="display" />
    </View>
  );
}