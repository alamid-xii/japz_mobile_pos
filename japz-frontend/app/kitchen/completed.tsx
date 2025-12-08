import { Clock, Home, CheckSquare, User } from 'lucide-react-native';
import { useCallback, useState, useEffect } from 'react';
import { Alert, FlatList, ScrollView, Text, TouchableOpacity, View, ActivityIndicator, Image, RefreshControl } from 'react-native';
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
  status: 'new' | 'preparing' | 'ready' | 'completed';
  timestamp: string;
  createdAt?: string;
  completedAt?: string;
  waitTime: string;
}

export default function CompletedOrdersScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [orders, setOrders] = useState<KitchenOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);

  // Fetch completed orders from database
  useEffect(() => {
    const fetchCompletedOrders = async () => {
      try {
        setLoading(true);
        
        const response = await ordersAPI.getCompletedByCategories();
        const data = response.data;
        
        setOrders(data.orders || []);
      } catch (error) {
        console.error('Error fetching completed orders:', error);
        Alert.alert('Error', 'Failed to load completed orders');
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    };

    fetchCompletedOrders();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    const fetchCompletedOrders = async () => {
      try {
        const response = await ordersAPI.getCompletedByCategories();
        const data = response.data;
        
        setOrders(data.orders || []);
      } catch (error) {
        console.error('Error fetching completed orders:', error);
        Alert.alert('Error', 'Failed to load completed orders');
      } finally {
        setRefreshing(false);
      }
    };
    fetchCompletedOrders();
  };

  // Prevent back navigation and refresh when page comes into focus
  useFocusEffect(
    useCallback(() => {
      const subscription = BackHandler.addEventListener('hardwareBackPress', () => true);
      
      // Fetch completed orders when page comes into focus
      const fetchCompletedOrders = async () => {
        try {
          const response = await ordersAPI.getCompletedByCategories();
          const data = response.data;
          
          setOrders(data.orders || []);
        } catch (error) {
          console.error('Error fetching completed orders:', error);
        }
      };

      fetchCompletedOrders();
      
      return () => subscription.remove();
    }, [])
  );

  const completedOrders = orders.filter(order => order.status === 'completed');

  const getPhilippineTime = (timestamp?: string) => {
    try {
      const date = timestamp ? new Date(timestamp) : new Date();
      return date.toLocaleString('en-PH', {
        timeZone: 'Asia/Manila',
        year: 'numeric',
        month: 'short',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true,
      });
    } catch (error) {
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
    } catch (error) {
      return 'N/A';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'new':
        return '#EF4444';
      case 'preparing':
        return '#F59E0B';
      case 'ready':
        return '#10B981';
      case 'completed':
        return '#6B7280';
      default:
        return Colors.light.mutedForeground;
    }
  };

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: Colors.light.background, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color={Colors.light.primary} />
      </View>
    );
  }

  return (
    <View style={kitchenStyles.container}>
      <View style={kitchenStyles.header}>
        <View>
          <Text style={kitchenStyles.title}>Completed Orders</Text>
        </View>
      </View>
      {completedOrders.length > 0 ? (
        <FlatList
          data={completedOrders}
          keyExtractor={item => item.id}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[Colors.brand.primary]} />}
          renderItem={({ item }) => (
            <TouchableOpacity 
              style={[kitchenStyles.orderCard, { 
                opacity: 0.95,
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.1,
                shadowRadius: 4,
                elevation: 3,
              }]}
              onPress={() => setExpanded(expanded === item.id ? null : item.id)}
            >
              <View style={{ ...kitchenStyles.orderHeader, marginBottom: Sizes.spacing.md }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ ...kitchenStyles.orderNumber, color: '#030213' }}>
                    Order {item.orderNumber}
                  </Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: Sizes.spacing.xs, gap: Sizes.spacing.xs }}>
                    <Clock size={12} color="#10B981" />
                    <Text style={{ color: '#10B981', fontWeight: '600', fontSize: Sizes.typography.xs }}>
                      {item.waitTime}
                    </Text>
                  </View>
                </View>
                <View
                  style={{
                    paddingHorizontal: Sizes.spacing.md,
                    paddingVertical: Sizes.spacing.xs,
                    borderRadius: Sizes.radius.md,
                    backgroundColor: getStatusColor(item.status),
                  }}
                >
                  <Text
                    style={{
                      color: '#fff',
                      fontSize: Sizes.typography.xs,
                      fontWeight: '700',
                      letterSpacing: 0.5,
                    }}
                  >
                    ✓ COMPLETED
                  </Text>
                </View>
              </View>

              <View style={{ 
                backgroundColor: 'rgba(16, 185, 129, 0.08)', 
                paddingHorizontal: Sizes.spacing.md,
                paddingVertical: Sizes.spacing.sm,
                borderRadius: Sizes.radius.md,
                marginBottom: Sizes.spacing.md,
              }}>
                <Text style={{ fontSize: Sizes.typography.sm, color: '#10B981', fontWeight: '600' }}>
                  {item.items.length} item(s) • ₱{item.items.reduce((sum, i) => sum + (typeof i.total === 'number' ? i.total : parseFloat(i.total || 0)), 0).toFixed(2)}
                </Text>
              </View>

              {expanded === item.id && (
                <View style={{ ...kitchenStyles.orderItems, marginBottom: Sizes.spacing.md, paddingTop: Sizes.spacing.md, borderTopWidth: 1, borderTopColor: Colors.light.border }}>
                  {item.items.map((lineItem, idx) => (
                    <View key={idx} style={{ 
                      marginBottom: idx < item.items.length - 1 ? Sizes.spacing.md : 0, 
                      paddingBottom: idx < item.items.length - 1 ? Sizes.spacing.md : 0, 
                      borderBottomWidth: idx < item.items.length - 1 ? 1 : 0, 
                      borderBottomColor: Colors.light.border 
                    }}>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: Sizes.spacing.xs }}>
                        <Text
                          style={{
                            color: Colors.light.foreground,
                            fontSize: Sizes.typography.base,
                            fontWeight: '700',
                            flex: 1,
                          }}
                        >
                          {lineItem.quantity}× {lineItem.menuItem?.name || lineItem.name || 'Unknown Item'}
                        </Text>
                        <Text
                          style={{
                            color: '#10B981',
                            fontSize: Sizes.typography.base,
                            fontWeight: '700',
                            marginLeft: Sizes.spacing.sm,
                          }}
                        >
                          ₱{typeof lineItem.total === 'number' ? lineItem.total.toFixed(2) : parseFloat(lineItem.total || 0).toFixed(2)}
                        </Text>
                      </View>

                      {lineItem.modifiers && typeof lineItem.modifiers === 'object' && (
                        <View style={{ marginTop: Sizes.spacing.xs, marginLeft: Sizes.spacing.sm, paddingLeft: Sizes.spacing.md, borderLeftWidth: 2, borderLeftColor: '#10B981' }}>
                          {lineItem.modifiers.size && (
                            <Text
                              style={{
                                color: Colors.light.mutedForeground,
                                fontSize: Sizes.typography.sm,
                                marginTop: Sizes.spacing.xs,
                              }}
                            >
                              📏 Size: {lineItem.modifiers.size}
                            </Text>
                          )}
                          {lineItem.modifiers.flavors && Array.isArray(lineItem.modifiers.flavors) && lineItem.modifiers.flavors.length > 0 && (
                            <Text
                              style={{
                                color: Colors.light.mutedForeground,
                                fontSize: Sizes.typography.sm,
                                marginTop: Sizes.spacing.xs,
                              }}
                            >
                              🍨 Flavors: {lineItem.modifiers.flavors.join(', ')}
                            </Text>
                          )}
                          {lineItem.modifiers.notes && (
                            <Text
                              style={{
                                color: Colors.light.mutedForeground,
                                fontSize: Sizes.typography.xs,
                                fontStyle: 'italic',
                                marginTop: Sizes.spacing.xs,
                              }}
                            >
                              📝 Note: {lineItem.modifiers.notes}
                            </Text>
                          )}
                        </View>
                      )}
                    </View>
                  ))}
                </View>
              )}

              <View style={{ ...kitchenStyles.orderFooter, backgroundColor: 'rgba(16, 185, 129, 0.05)', paddingHorizontal: Sizes.spacing.md, paddingVertical: Sizes.spacing.sm, borderRadius: Sizes.radius.md }}>
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: Sizes.spacing.xs, marginBottom: Sizes.spacing.xs }}>
                    <Clock size={14} color="#10B981" />
                    <Text style={{ color: '#10B981', fontWeight: '600', fontSize: Sizes.typography.xs }}>
                      Total duration: {getTotalWaitDuration(item.createdAt || item.timestamp, item.completedAt)}
                    </Text>
                  </View>
                  <Text style={{ color: '#10B981', fontWeight: '500', fontSize: Sizes.typography.xs }}>
                    🕐 Completed: {getPhilippineTime(item.completedAt || item.timestamp)}
                  </Text>
                </View>
              </View>
            </TouchableOpacity>
          )}
          contentContainerStyle={kitchenStyles.ordersList}
        />
      ) : (
        <View style={kitchenStyles.emptyState}>
          <CheckSquare size={48} color={Colors.light.primary} style={{ marginBottom: Sizes.spacing.md }} />
          <Text style={kitchenStyles.emptyStateText}>No Completed Orders</Text>
          <Text style={kitchenStyles.emptyStateSubtext}>Completed orders will appear here</Text>
        </View>
      )}
    </View>
  );
}
