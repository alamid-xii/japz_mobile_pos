import { useRouter, useLocalSearchParams } from 'expo-router';
import { ChevronLeft } from 'lucide-react-native';
import { useState, useEffect } from 'react';
import { ScrollView, Text, TextInput, TouchableOpacity, View, ActivityIndicator } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { generateOrderNumber } from '../../utils/helpers';
import { Colors, Sizes } from '../../constants/colors';
import { cashierStyles } from '../../styles/cashierStyles';
import { scaled } from '../../utils/responsive';
import { useAuth } from '../../hooks/useAuth';
import { ordersAPI } from '../../services/api';

interface CashPaymentState {
  totalAmount: number;
  amountReceived: string;
  notes: string;
}

export default function CashPaymentScreen() {
  const router = useRouter();
  const { total: totalParam, items: itemsParam, itemCount, paymentMethod: paymentMethodParam } = useLocalSearchParams();
  const { user } = useAuth();

  const [state, setState] = useState<CashPaymentState>({
    totalAmount: Number(totalParam ? parseFloat(totalParam as string) : 0) || 0,
    amountReceived: '',
    notes: '',
  });

  const [orderItems, setOrderItems] = useState<any[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card' | 'digital'>(
    (paymentMethodParam && ['cash', 'card', 'digital'].includes(paymentMethodParam as string)) 
      ? (paymentMethodParam as 'cash' | 'card' | 'digital') 
      : 'cash'
  );

  useEffect(() => {
    if (totalParam) {
      const t = Number(parseFloat(totalParam as string) || 0);
      setState(prev => ({ ...prev, totalAmount: t }));
    }
    if (itemsParam) {
      try {
        const parsed = typeof itemsParam === 'string' ? JSON.parse(itemsParam as string) : itemsParam;
        setOrderItems(parsed || []);
      } catch (e) {
        console.warn('Failed to parse items param', e);
        setOrderItems([]);
      }
    }
    if (paymentMethodParam) {
      setPaymentMethod(paymentMethodParam as 'cash' | 'card' | 'digital');
    }
  }, [totalParam, itemsParam, paymentMethodParam]);

  const amountReceived = parseFloat(state.amountReceived || '0');
  const change = amountReceived - state.totalAmount;
  const isValidPayment = amountReceived >= state.totalAmount;

  const handleQuickAmount = (amount: number) => {
    setState({ ...state, amountReceived: amount.toString() });
  };

  const handleComplete = async () => {
    if (!isValidPayment) return;

    setIsProcessing(true);

    try {
      // Build order object
      const order = {
        id: Date.now().toString(),
        orderNumber: generateOrderNumber(),
        items: orderItems.map((it: any) => ({
          id: String(it.id),
          name: it.name,
          price: Number(it.itemPrice || it.price || 0),
          quantity: it.quantity || 1,
          category: it.category || '',
          total: Number(it.itemPrice || it.price || 0) * (it.quantity || 1),
          selectedSize: it.selectedSize || undefined,
          selectedFlavor: it.selectedFlavor || undefined,
        })),
        status: 'pending',
        total: state.totalAmount,
        cashier: user?.name || 'Unknown Cashier',
        payment: {
          method: paymentMethod,
          amount: state.totalAmount,
          amountReceived: amountReceived,
          change: Math.round((amountReceived - state.totalAmount) * 100) / 100,
        },
        createdAt: new Date().toISOString(),
      };

      const payload = {
        orderNumber: order.orderNumber,
        cashierId: user?.id ? parseInt(user.id as string) : undefined,
        cashier: order.cashier,
        subtotal: order.items.reduce((s: number, it: any) => s + (Number(it.total) || 0), 0),
        discount: 0,
        total: order.total,
        payment: order.payment,
        items: orderItems.map((it: any) => ({ 
          id: it.id, 
          name: it.name, 
          price: it.itemPrice || it.price, 
          quantity: it.quantity || 1, 
          total: (it.itemPrice || it.price) * (it.quantity || 1),
          modifiers: {
            size: it.selectedSize || null,
            flavors: it.selectedFlavor ? [it.selectedFlavor] : null,
          }
        })),
        status: 'pending',
        createdAt: order.createdAt,
      };

      // Try to send order to backend
      try {
        const res = await Promise.race([
          ordersAPI.create(payload),
          new Promise((_, reject) => setTimeout(() => reject(new Error('Order save timeout')), 25000)),
        ]);
        const createdOrder = (res as any)?.data?.order || null;

        // Clear cart after successful order
        await AsyncStorage.removeItem('cashierCart');

        // Navigate to receipt screen with server order if available
        router.push({ pathname: '/cashier/receipt', params: { order: JSON.stringify(createdOrder || order) } });
      } catch (err) {
        console.error('Failed to send order to server, using local data', err);
        
        // Clear cart even if backend fails
        await AsyncStorage.removeItem('cashierCart');
        
        // Still navigate to receipt even if backend fails
        router.push({ pathname: '/cashier/receipt', params: { order: JSON.stringify(order) } });
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const roundedChange = Math.round(change * 100) / 100;

  return (
    <View style={{ flex: 1, backgroundColor: Colors.light.background }}>
      {/* Header */}
      <View style={cashierStyles.header}>
        <TouchableOpacity onPress={() => router.push({
          pathname: '/cashier/payment-selection',
          params: {
            total: state.totalAmount.toFixed(2),
            items: itemsParam || null,
            itemCount: itemCount || null,
          },
        })}>
          <ChevronLeft size={28} color="#030213" />
        </TouchableOpacity>
        <Text style={cashierStyles.title}>{paymentMethod.charAt(0).toUpperCase() + paymentMethod.slice(1)} Payment</Text>
        <View style={{ width: 28 }} />
      </View>

      <ScrollView
        contentContainerStyle={{ padding: scaled(Sizes.spacing.lg) }}
      >
        {/* Amount Due */}
      <View style={{ backgroundColor: Colors.light.card, borderRadius: Sizes.radius.md, padding: Sizes.spacing.lg, marginBottom: Sizes.spacing.lg }}>
        <Text style={{ color: Colors.light.mutedForeground, marginBottom: Sizes.spacing.sm }}>
          Amount Due
        </Text>
          <Text style={{ fontSize: scaled(Sizes.typography.xl), fontWeight: '700', color: Colors.light.primary }}>
          ₱{state.totalAmount.toFixed(2)}
        </Text>
      </View>

      {/* Amount Received Input */}
      <View style={{ marginBottom: Sizes.spacing.lg }}>
        <Text style={{ fontSize: Sizes.typography.base, fontWeight: '600', marginBottom: Sizes.spacing.sm }}>
          Amount Received
        </Text>
        <TextInput
          style={{
            borderWidth: 2,
            borderColor: amountReceived > 0 ? (isValidPayment ? '#10B981' : '#EF4444') : Colors.light.border,
            borderRadius: scaled(Sizes.radius.md),
            padding: scaled(Sizes.spacing.md),
            color: Colors.light.foreground,
            fontSize: scaled(Sizes.typography.lg),
            fontWeight: '600',
          }}
          placeholder="0.00"
          placeholderTextColor={Colors.light.mutedForeground}
          value={state.amountReceived}
          onChangeText={(text) => setState({ ...state, amountReceived: text })}
          keyboardType="decimal-pad"
        />
      </View>

      {/* Quick Amount Buttons */}
      <Text style={{ fontSize: Sizes.typography.sm, fontWeight: '600', marginBottom: Sizes.spacing.md, color: Colors.light.mutedForeground }}>
        Quick Amounts
      </Text>
      <View style={{ flexDirection: 'row', gap: Sizes.spacing.sm, marginBottom: Sizes.spacing.lg, flexWrap: 'wrap' }}>
        {[100, 200, 500, 1000].map((amount) => (
          <TouchableOpacity
            key={amount}
            style={{
              backgroundColor: state.amountReceived === amount.toString() ? Colors.light.primary : Colors.light.card,
              borderRadius: Sizes.radius.md,
              padding: Sizes.spacing.md,
              borderWidth: 1,
              borderColor: Colors.light.border,
              flex: 1,
              minWidth: '22%',
              alignItems: 'center',
            }}
            onPress={() => handleQuickAmount(amount)}
          >
            <Text
              style={{
                fontWeight: '600',
                color: state.amountReceived === amount.toString() ? '#fff' : Colors.light.foreground,
              }}
            >
              ₱{amount}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Change Display */}
      {amountReceived > 0 && (
        <View style={{ backgroundColor: Colors.light.card, borderRadius: Sizes.radius.md, padding: Sizes.spacing.sm, marginBottom: Sizes.spacing.sm }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: Sizes.spacing.md }}>
            <Text style={{ color: Colors.light.mutedForeground }}>Amount Received:</Text>
            <Text style={{ fontWeight: '600' }}>₱{amountReceived.toFixed(2)}</Text>
          </View>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingBottom: Sizes.spacing.md, borderBottomWidth: 1, borderBottomColor: Colors.light.border }}>
            <Text style={{ color: Colors.light.mutedForeground }}>Amount Due:</Text>
            <Text style={{ fontWeight: '600' }}>₱{state.totalAmount.toFixed(2)}</Text>
          </View>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: Sizes.spacing.md }}>
            <Text style={{ fontSize: Sizes.typography.base, fontWeight: '700' }}>Change:</Text>
            <Text
              style={{
                fontSize: Sizes.typography.base,
                fontWeight: '700',
                color: isValidPayment ? '#10B981' : '#EF4444',
              }}
            >
              {isValidPayment ? '+' : '-'}₱{Math.abs(roundedChange).toFixed(2)}
            </Text>
          </View>
        </View>
      )}

      {/* Notes */}
      <View style={{ marginBottom: Sizes.spacing.lg }}>
        <Text style={{ fontSize: Sizes.typography.sm, fontWeight: '600', marginBottom: Sizes.spacing.sm, color: Colors.light.mutedForeground }}>
          Notes (Optional)
        </Text>
        <TextInput
          style={{
            borderWidth: 1,
            borderColor: Colors.light.border,
            borderRadius: Sizes.radius.md,
            padding: Sizes.spacing.md,
            color: Colors.light.foreground,
            fontSize: Sizes.typography.base,
            minHeight: scaled(80),
          }}
          placeholder="Additional notes..."
          placeholderTextColor={Colors.light.mutedForeground}
          value={state.notes}
          onChangeText={(text) => setState({ ...state, notes: text })}
          multiline
        />
      </View>

      {/* Complete Button */}
      <TouchableOpacity
        style={{
          backgroundColor: isValidPayment && !isProcessing ? Colors.light.primary : Colors.light.muted,
          borderRadius: Sizes.radius.md,
          padding: Sizes.spacing.lg,
          alignItems: 'center',
          opacity: isProcessing ? 0.6 : 1,
        }}
        onPress={handleComplete}
        disabled={!isValidPayment || isProcessing}
      >
        {isProcessing ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: Sizes.spacing.md }}>
            <ActivityIndicator color="#fff" size="small" />
            <Text
              style={{
                color: '#fff',
                fontWeight: '700',
                fontSize: Sizes.typography.base,
              }}
            >
              Processing...
            </Text>
          </View>
        ) : (
          <Text
            style={{
              color: isValidPayment ? '#fff' : Colors.light.mutedForeground,
              fontWeight: '700',
              fontSize: Sizes.typography.base,
            }}
          >
            Complete Transaction
          </Text>
        )}  
      </TouchableOpacity>
      </ScrollView>
    </View>
  );
}