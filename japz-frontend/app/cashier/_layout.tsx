// app/(cashier)/_layout.tsx
import { Stack, useRouter } from 'expo-router';
import { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';
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
    <Stack>
      <Stack.Screen name="pos" options={{ headerShown: false }} />
      <Stack.Screen name="active-orders" options={{ headerShown: false }} />
      <Stack.Screen name="order-history" options={{ headerShown: false }} />
      <Stack.Screen name="payment-selection" options={{ title: 'Payment Method' }} />
      <Stack.Screen name="cash-payment" options={{ title: 'Payment' }} />
      <Stack.Screen name="receipt" options={{ title: 'Receipt', headerShown: false }} />
      <Stack.Screen name="profile" options={{ title: 'Profile', headerShown: false }} />
    </Stack>
  );
}