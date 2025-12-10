import { BarChart3, MessageCircle, Package, Settings, TrendingUp, Users, RefreshCw } from 'lucide-react-native';
import { useCallback, useState, useEffect } from 'react';
import { ScrollView, Text, TouchableOpacity, View, Image, ActivityIndicator, RefreshControl } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { BackHandler } from 'react-native';
import { Colors, Sizes } from '../../constants/colors';
import { useAuth } from '../../hooks/useAuth';
import { scaled } from '../../utils/responsive';
import { ordersAPI, employeesAPI, logsAPI } from '../../services/api';

interface DashboardStats {
  monthlyRevenue: number;
  monthlyOrders: number;
  activeEmployees: number;
  todaysSales: number;
  monthlyTrend: number;
  ordersTrend: number;
  salesToday: number;
  todayTrend: number;
}

interface ActivityLog {
  id: number;
  action: string;
  userName: string;
  description: string;
  createdAt: string;
}

const StatIcon = ({ icon, size }: { icon: string; size: number }) => {
  const iconProps = { size, color: Colors.light.primary };
  switch (icon) {
    case 'revenue': return <TrendingUp {...iconProps} />;
    case 'orders': return <Package {...iconProps} />;
    case 'employees': return <Users {...iconProps} />;
    case 'sales': return <BarChart3 {...iconProps} />;
    default: return null;
  }
};


const getActivityIcon = (action: string) => {
  const iconProps = { size: 16, color: 'black' };
  
  if (action.includes('ORDER')) {
    return <Package {...iconProps} />;
  } else if (action.includes('LOGIN') || action.includes('LOGOUT') || action.includes('REGISTER')) {
    return <Users {...iconProps} />;
  } else if (action.includes('FEEDBACK')) {
    return <MessageCircle {...iconProps} />;
  }
  return <MessageCircle {...iconProps} />;
};

const getTimeAgo = (dateString: string): string => {
  const date = new Date(dateString);
  const now = new Date();
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);
  
  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
  return date.toLocaleDateString();
};

export default function DashboardScreen() {
  const { user } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [activities, setActivities] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Prevent back navigation
  useFocusEffect(
    useCallback(() => {
      const subscription = BackHandler.addEventListener('hardwareBackPress', () => true);
      return () => subscription.remove();
    }, [])
  );

  // Refresh data when dashboard comes into focus
  useFocusEffect(
    useCallback(() => {
      fetchDashboardData();
    }, [])
  );

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      
      // Fetch orders
      const ordersResponse = await ordersAPI.getAll();
      const orders = ordersResponse.data || [];
      
      // Fetch employees
      const employeesResponse = await employeesAPI.getAll();
      const employees = employeesResponse.data || [];
      
      // Fetch recent activity logs
      const logsResponse = await logsAPI.getAll({ limit: 10, offset: 0 });
      console.log('Full logs response:', logsResponse);
      
      // Handle both possible response structures
      let logs = [];
      if (logsResponse.data?.logs && Array.isArray(logsResponse.data.logs)) {
        logs = logsResponse.data.logs;
      } else if (Array.isArray(logsResponse.data)) {
        logs = logsResponse.data;
      }
      
      console.log('Parsed logs:', logs);
      console.log('Number of logs:', logs.length);
      setActivities(logs);
      
      // Calculate current date ranges
      const today = new Date();
      const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      const todayEnd = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);
      
      const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
      const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 1);
      
      const lastMonthStart = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      const lastMonthEnd = new Date(today.getFullYear(), today.getMonth(), 1);
      
      // Calculate metrics
      const todayOrders = orders.filter((o: any) => {
        const orderDate = new Date(o.createdAt);
        return orderDate >= todayStart && orderDate < todayEnd;
      });
      
      const monthOrders = orders.filter((o: any) => {
        const orderDate = new Date(o.createdAt);
        return orderDate >= monthStart && orderDate < monthEnd;
      });
      
      const lastMonthOrders = orders.filter((o: any) => {
        const orderDate = new Date(o.createdAt);
        return orderDate >= lastMonthStart && orderDate < lastMonthEnd;
      });
      
      const todaysSales = todayOrders.reduce((sum: number, o: any) => sum + (parseFloat(o.total) || 0), 0);
      const monthlyRevenue = monthOrders.reduce((sum: number, o: any) => sum + (parseFloat(o.total) || 0), 0);
      const lastMonthRevenue = lastMonthOrders.reduce((sum: number, o: any) => sum + (parseFloat(o.total) || 0), 0);
      
      // Calculate trends
      const monthlyTrend = lastMonthRevenue > 0 
        ? Math.round(((monthlyRevenue - lastMonthRevenue) / lastMonthRevenue) * 100) 
        : 0;
      
      const ordersTrend = lastMonthOrders.length > 0 
        ? Math.round(((monthOrders.length - lastMonthOrders.length) / lastMonthOrders.length) * 100) 
        : 0;
      
      setStats({
        monthlyRevenue: isNaN(Math.round(monthlyRevenue)) ? 0 : Math.round(monthlyRevenue),
        monthlyOrders: monthOrders.length,
        activeEmployees: employees.length,
        todaysSales: isNaN(Math.round(todaysSales)) ? 0 : Math.round(todaysSales),
        monthlyTrend,
        ordersTrend,
        salesToday: isNaN(Math.round(todaysSales)) ? 0 : Math.round(todaysSales),
        todayTrend: 0,
      });
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      console.error('Error details:', error instanceof Error ? error.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };
  
  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.light.background }}>
        <ActivityIndicator size="large" color={Colors.light.primary} />
        <Text style={{ marginTop: Sizes.spacing.md, color: Colors.light.mutedForeground }}>
          Loading dashboard...
        </Text>
      </View>
    );
  }
  
  return (
    <View style={{ flex: 1, marginTop: Sizes.spacing.lg }}>
      <ScrollView
        style={{ flex: 1, backgroundColor: Colors.light.background,  }}
        contentContainerStyle={{ padding: Sizes.spacing.lg }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={async () => {
              setRefreshing(true);
              await fetchDashboardData();
              setRefreshing(false);
            }}
            tintColor={Colors.light.primary}
          />
        }
      >
        {/* Header */}
        <View style={{ marginBottom: Sizes.spacing.xl }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: Sizes.spacing.sm, marginBottom: Sizes.spacing.sm }}>
            <Image
              source={require('../../assets/images/logo.jpg')}
              style={{ width: scaled(36), height: scaled(36), borderRadius: scaled(8) }}
            />
            <Text style={{ 
              fontSize: Sizes.typography['2xl'], 
              fontWeight: '700',
              color: '#ffce1b'
            }}>
              Welcome back, {user?.name || 'Admin'}
            </Text>
          </View>
          <Text style={{ color: Colors.light.mutedForeground, fontSize: Sizes.typography.sm }}>
            Here's what's happening today
          </Text>
        </View>

        {/* Stats Grid */}
        {stats && (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: Sizes.spacing.md, marginBottom: Sizes.spacing.xl }}>
            <View
              style={{
                flex: 1,
                minWidth: '40%',
                backgroundColor: '#ffde68',
                borderRadius: Sizes.radius.md,
                padding: Sizes.spacing.md,
                borderLeftWidth: 4,
                borderLeftColor: Colors.light.primary,
              }}
            >
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: Colors.light.mutedForeground, marginBottom: Sizes.spacing.sm, fontSize: Sizes.typography.xs }}>
                    Monthly Revenue
                  </Text>
                  <Text style={{ fontSize: Sizes.typography.base, fontWeight: '700', marginBottom: Sizes.spacing.sm }}>
                    ₱{stats.monthlyRevenue.toLocaleString()}
                  </Text>
                  <Text style={{ color: stats.monthlyTrend >= 0 ? '#10B981' : '#EF4444', fontSize: Sizes.typography.xs, fontWeight: '600' }}>
                    {stats.monthlyTrend >= 0 ? '+' : ''}{stats.monthlyTrend}%
                  </Text>
                </View>
                <StatIcon icon="revenue" size={24} />
              </View>
            </View>

            <View
              style={{
                flex: 1,
                minWidth: '40%',
                backgroundColor: '#ffde68',
                borderRadius: Sizes.radius.md,
                padding: Sizes.spacing.md,
                borderLeftWidth: 4,
                borderLeftColor: '#3B82F6',
              }}
            >
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: Colors.light.mutedForeground, marginBottom: Sizes.spacing.sm, fontSize: Sizes.typography.xs }}>
                    Monthly Orders
                  </Text>
                  <Text style={{ fontSize: Sizes.typography.base, fontWeight: '700', marginBottom: Sizes.spacing.sm }}>
                    {stats.monthlyOrders}
                  </Text>
                  <Text style={{ color: stats.ordersTrend >= 0 ? '#10B981' : '#EF4444', fontSize: Sizes.typography.xs, fontWeight: '600' }}>
                    {stats.ordersTrend >= 0 ? '+' : ''}{stats.ordersTrend}%
                  </Text>
                </View>
                <StatIcon icon="orders" size={24} />
              </View>
            </View>

            <View
              style={{
                flex: 1,
                minWidth: '40%',
                backgroundColor: '#ffde68',
                borderRadius: Sizes.radius.md,
                padding: Sizes.spacing.md,
                borderLeftWidth: 4,
                borderLeftColor: '#8B5CF6',
              }}
            >
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: Colors.light.mutedForeground, marginBottom: Sizes.spacing.sm, fontSize: Sizes.typography.xs }}>
                    Active Employees
                  </Text>
                  <Text style={{ fontSize: Sizes.typography.base, fontWeight: '700', marginBottom: Sizes.spacing.sm }}>
                    {stats.activeEmployees}
                  </Text>
                  <Text style={{ color: '#FFB800', fontSize: Sizes.typography.xs, fontWeight: '600' }}>
                    Staff
                  </Text>
                </View>
                <StatIcon icon="employees" size={24} />
              </View>
            </View>

            <View
              style={{
                flex: 1,
                minWidth: '40%',
                backgroundColor: '#ffde68',
                borderRadius: Sizes.radius.md,
                padding: Sizes.spacing.md,
                borderLeftWidth: 4,
                borderLeftColor: '#F59E0B',
              }}
            >
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: Colors.light.mutedForeground, marginBottom: Sizes.spacing.sm, fontSize: Sizes.typography.xs }}>
                    Today's Sales
                  </Text>
                  <Text style={{ fontSize: Sizes.typography.base, fontWeight: '700', marginBottom: Sizes.spacing.sm }}>
                    ₱{stats.todaysSales.toLocaleString()}
                  </Text>
                  <Text style={{ color: '#10B981', fontSize: Sizes.typography.xs, fontWeight: '600' }}>
                    +15.3%
                  </Text>
                </View>
                <StatIcon icon="sales" size={24} />
              </View>
            </View>
          </View>
        )}


        {/* Recent Activity */}
        <View style={{  padding: Sizes.spacing.md, borderColor: '#FFD700', borderWidth: 1, borderRadius: Sizes.radius.md, backgroundColor: '#FFFFCC' }}>
          <Text style={{ fontSize: Sizes.typography.base, fontWeight: '700', marginBottom: Sizes.spacing.md, color: 'black' }}>
            Recent Activity
          </Text>
          {activities.length > 0 ? (
            activities.slice(0, 5).map((item, index) => (
              <View
                key={item.id || index}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  paddingVertical: Sizes.spacing.sm,
                  borderBottomWidth: index < Math.min(4, activities.length - 1) ? 1 : 0,
                  borderBottomColor: Colors.light.border,
                }}
              >
                {getActivityIcon(item.action)}
                <View style={{ flex: 1, marginLeft: Sizes.spacing.md }}>
                  <Text style={{ fontWeight: '500', marginBottom: 2 }}>
                    {item.userName} - {item.action.replace(/_/g, ' ').toLowerCase()}
                  </Text>
                  <Text style={{ color: Colors.light.mutedForeground, fontSize: Sizes.typography.xs }}>
                    {getTimeAgo(item.createdAt)}
                  </Text>
                </View>
              </View>
            ))
          ) : (
            <Text style={{ color: Colors.light.mutedForeground, fontSize: Sizes.typography.sm, textAlign: 'center', paddingVertical: Sizes.spacing.md }}>
              No recent activity
            </Text>
          )}
        </View>
      </ScrollView>
    </View>
  );
}