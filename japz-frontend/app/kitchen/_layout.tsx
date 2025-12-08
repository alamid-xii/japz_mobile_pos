// app/kitchen/_layout.tsx
import { Tabs, useRouter } from 'expo-router';
import React, { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { AlertCircle, CheckSquare, ClipboardList, User } from 'lucide-react-native';
import { Colors } from '../../constants/colors';
import { useAuth } from '../../hooks/useAuth';

export default function KitchenLayout() {
  const { user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!user || user.role !== 'kitchen') {
      router.push('/auth/login' as any);
    }
  }, [user, router]);

  if (!user || user.role !== 'kitchen') {
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
        name="incoming"
        options={{
          title: 'Incoming Orders',
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
        name="completed"
        options={{
          title: 'Completed Orders',
          tabBarIcon: ({ color, focused }) => (
            <View style={{
              backgroundColor: focused ? '#FFCE1B' : 'transparent',
              padding: 8,
              borderRadius: 8,
            }}>
              <CheckSquare size={28} color={focused ? '#000000' : color} />
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
    </Tabs>
  );
}
