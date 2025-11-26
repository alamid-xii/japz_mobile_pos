// app/(admin)/dashboard.tsx
import { BarChart3, MessageCircle, Package, Settings, TrendingUp, Users } from 'lucide-react-native';
import { ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { Colors, Sizes } from '../../constants/colors';
import { useAuth } from '../../hooks/useAuth';

const stats = [
  { label: 'Monthly Revenue', value: '₱45,230', icon: 'revenue', trend: '+12.5%' },
  { label: 'Monthly Orders', value: '1,234', icon: 'orders', trend: '+8.2%' },
  { label: 'Active Employees', value: '24', icon: 'employees', trend: '0%' },
  { label: 'Today\'s Sales', value: '₱8,450', icon: 'sales', trend: '+15.3%' },
];



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


const getActivityIcon = (iconName: string) => {
  const iconProps = { size: 16, color: Colors.light.mutedForeground };
  switch (iconName) {
    case 'Package': return <Package {...iconProps} />;
    case 'Users': return <Users {...iconProps} />;
    case 'MessageCircle': return <MessageCircle {...iconProps} />;
    default: return null;
  }
};

export default function DashboardScreen() {
  const { user } = useAuth();
  
  return (
    <View style={{ flex: 1, marginTop: Sizes.spacing.lg }}>
      <ScrollView
        style={{ flex: 1, backgroundColor: Colors.light.background }}
        contentContainerStyle={{ padding: Sizes.spacing.lg }}
      >
        {/* Header */}
        <View style={{ marginBottom: Sizes.spacing.xl }}>
          <Text style={{ fontSize: Sizes.typography.xl, fontWeight: '700', marginBottom: Sizes.spacing.sm }}>
            Welcome back, {user?.name || 'Admin'}
          </Text>
          <Text style={{ color: Colors.light.mutedForeground, fontSize: Sizes.typography.sm }}>
            Here's what's happening today
          </Text>
        </View>

        {/* Stats Grid */}
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: Sizes.spacing.md, marginBottom: Sizes.spacing.xl }}>
          {stats.map((stat, index) => (
            <View
              key={index}
              style={{
                flex: 1,
                minWidth: '40%',
                backgroundColor: '#FFFFCC',
                borderRadius: Sizes.radius.md,
                padding: Sizes.spacing.md,
                borderLeftWidth: 4,
                borderLeftColor: Colors.light.primary,
              }}
            >
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: Colors.light.mutedForeground, marginBottom: Sizes.spacing.sm, fontSize: Sizes.typography.xs }}>
                    {stat.label}
                  </Text>
                  <Text style={{ fontSize: Sizes.typography.base, fontWeight: '700', marginBottom: Sizes.spacing.sm }}>
                    {stat.value}
                  </Text>
                  <Text style={{ color: '#10B981', fontSize: Sizes.typography.xs, fontWeight: '600' }}>
                    {stat.trend}
                  </Text>
                </View>
                <StatIcon icon={stat.icon} size={24} />
              </View>
            </View>
          ))}
        </View>


        {/* Recent Activity */}
        <View style={{ backgroundColor: Colors.light.card, borderRadius: Sizes.radius.md, padding: Sizes.spacing.md }}>
          <Text style={{ fontSize: Sizes.typography.base, fontWeight: '700', marginBottom: Sizes.spacing.md }}>
            Recent Activity
          </Text>
          {[
            { time: '2 hours ago', activity: 'Juan Dela Cruz placed order #1234', icon: 'Package' },
            { time: '4 hours ago', activity: 'Maria Santos logged in', icon: 'Users' },
            { time: '6 hours ago', activity: 'New feedback received', icon: 'MessageCircle' },
          ].map((item, index) => (
            <View
              key={index}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                paddingVertical: Sizes.spacing.sm,
                borderBottomWidth: index < 2 ? 1 : 0,
                borderBottomColor: Colors.light.border,
              }}
            >
              {getActivityIcon(item.icon)}
              <View style={{ flex: 1, marginLeft: Sizes.spacing.md }}>
                <Text style={{ fontWeight: '500', marginBottom: 2 }}>
                  {item.activity}
                </Text>
                <Text style={{ color: Colors.light.mutedForeground, fontSize: Sizes.typography.xs }}>
                  {item.time}
                </Text>
              </View>
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}