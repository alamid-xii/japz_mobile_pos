// app/(admin)/_layout.tsx
import { Tabs, useRouter } from 'expo-router';
import { LayoutDashboard, MessageCircle, Package, Settings, TrendingUp, Users } from 'lucide-react-native';
import { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { Colors, Sizes } from '../../constants/colors';
import { useAuth } from '../../hooks/useAuth';

export default function AdminLayout() {
  const { user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!user || user.role !== 'admin') {
      router.push('/auth/login' as any);
    }
  }, [user, router])

  if (!user || user.role !== 'admin') {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#FFCE1B" />
      </View>
    );
  }

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: Colors.light.card,
          borderTopWidth: 1,
          borderTopColor: Colors.light.border,
          paddingBottom: Sizes.spacing.sm,
          paddingVertical: Sizes.spacing.xl
        },
        tabBarLabelStyle: {
          fontSize: Sizes.typography.xs,
        },
        tabBarActiveTintColor: Colors.brand?.primary || Colors.light.primary,
        tabBarInactiveTintColor: Colors.light.mutedForeground,
      }}
    >
      <Tabs.Screen
        name="dashboard"
        options={{
          title: 'Dashboard',
          tabBarIcon: ({ color, size }) => <LayoutDashboard size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="employees"
        options={{
          title: 'Employees',
          tabBarIcon: ({ color, size }) => <Users size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="menu-inventory"
        options={{
          title: 'Menu',
          tabBarIcon: ({ color, size }) => <Package size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="feedback-hub"
        options={{
          title: 'Feedback',
          tabBarIcon: ({ color, size }) => <MessageCircle size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="sales-forecast"
        options={{
          title: 'Sales',
          tabBarIcon: ({ color, size }) => <TrendingUp size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="setings"
        options={{
          title: 'Settings',
          tabBarIcon: ({ color, size }) => <Settings size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="employee-form"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="activities-log"
        options={{
          href: null,
        }}
      />
    </Tabs>
  );
}