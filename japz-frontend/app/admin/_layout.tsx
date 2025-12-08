// app/(admin)/_layout.tsx
import { Tabs, useRouter } from 'expo-router';
import { LayoutDashboard, MessageCircle, Package, Settings, TrendingUp, Users } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { Colors, Sizes } from '../../constants/colors';
import { useAuth } from '../../hooks/useAuth';

export default function AdminLayout() {
  const { user, isInitialized } = useAuth();
  const router = useRouter();
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (isMounted && isInitialized && (!user || user.role !== 'admin')) {
      router.replace('/auth/login' as any);
    }
  }, [user, isInitialized, isMounted, router]);

  if (!isInitialized || !isMounted) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#FFCE1B" />
      </View>
    );
  }

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
          paddingTop: 5,
        },
        tabBarShowLabel: false,
        tabBarActiveTintColor: '#000000',
        tabBarInactiveTintColor: '#FFCE1B',
      }}
    >
      <Tabs.Screen
        name="dashboard"
        options={{
          title: 'Dashboard',
          tabBarIcon: ({ color, focused }) => (
            <View style={{
              backgroundColor: focused ? '#FFCE1B' : 'transparent',
              padding: 8,
              borderRadius: 8,
            }}>
              <LayoutDashboard size={28} color={focused ? '#000000' : color} />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="employees"
        options={{
          title: 'Employees',
          tabBarIcon: ({ color, focused }) => (
            <View style={{
              backgroundColor: focused ? '#FFCE1B' : 'transparent',
              padding: 8,
              borderRadius: 8,
            }}>
              <Users size={28} color={focused ? '#000000' : color} />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="menu-inventory"
        options={{
          title: 'Menu',
          tabBarIcon: ({ color, focused }) => (
            <View style={{
              backgroundColor: focused ? '#FFCE1B' : 'transparent',
              padding: 8,
              borderRadius: 8,
            }}>
              <Package size={28} color={focused ? '#000000' : color} />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="feedback-hub"
        options={{
          title: 'Feedback',
          tabBarIcon: ({ color, focused }) => (
            <View style={{
              backgroundColor: focused ? '#FFCE1B' : 'transparent',
              padding: 8,
              borderRadius: 8,
            }}>
              <MessageCircle size={28} color={focused ? '#000000' : color} />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="sales-forecast"
        options={{
          title: 'Sales',
          tabBarIcon: ({ color, focused }) => (
            <View style={{
              backgroundColor: focused ? '#FFCE1B' : 'transparent',
              padding: 8,
              borderRadius: 8,
            }}>
              <TrendingUp size={28} color={focused ? '#000000' : color} />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="setings"
        options={{
          title: 'Settings',
          tabBarIcon: ({ color, focused }) => (
            <View style={{
              backgroundColor: focused ? '#FFCE1B' : 'transparent',
              padding: 8,
              borderRadius: 8,
            }}>
              <Settings size={28} color={focused ? '#000000' : color} />
            </View>
          ),
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
      <Tabs.Screen
        name="employee-edit"
        options={{
          href: null,
        }}
      />
    </Tabs>
    
  );
}