// app/(cashier)/_layout.tsx
import { Tabs, useRouter } from 'expo-router';
import { History, ShoppingCart, User, Home, ClipboardList } from 'lucide-react-native';
import { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { Colors } from '../../constants/colors';
import { useAuth } from '../../hooks/useAuth';

export default function CashierLayout() {
  const { user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!user || user.role !== 'cashier') {
      router.push('/auth/login' as any);
    }
  }, [user, router]);

  if (!user || user.role !== 'cashier') {
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
        name="pos"
        options={{
          title: 'POS',
          tabBarIcon: ({ color, focused }) => (
            <View style={{
              backgroundColor: focused ? '#FFCE1B' : 'transparent',
              padding: 8,
              borderRadius: 8,
            }}>
              <ShoppingCart size={28} color={focused ? '#000000' : color} />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="active-orders"
        options={{
          title: 'Orders',
          tabBarIcon: ({ color, focused }) => (
            <View style={{
              backgroundColor: focused ? '#FFCE1B' : 'transparent',
              padding: 8,
              borderRadius: 8,
            }}>
              <ClipboardList size={28} color={focused ? '#000000' : color} />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="order-history"
        options={{
          title: 'History',
          tabBarIcon: ({ color, focused }) => (
            <View style={{
              backgroundColor: focused ? '#FFCE1B' : 'transparent',
              padding: 8,
              borderRadius: 8,
            }}>
              <History size={28} color={focused ? '#000000' : color} />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, focused }) => (
            <View style={{
              backgroundColor: focused ? '#FFCE1B' : 'transparent',
              padding: 8,
              borderRadius: 8,
            }}>
              <User size={28} color={focused ? '#000000' : color} />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="payment-selection"
        options={{
          href: null,
          tabBarStyle: { display: 'none' },
        }}
      />
      <Tabs.Screen
        name="cash-payment"
        options={{
          href: null,
          tabBarStyle: { display: 'none' },
        }}
      />
      <Tabs.Screen
        name="receipt"
        options={{
          href: null,
          tabBarStyle: { display: 'none' },
        }}
      />
    </Tabs>
  );
}
