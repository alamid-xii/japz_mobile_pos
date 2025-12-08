import { useRouter, useLocalSearchParams } from 'expo-router';
import { Banknote, Check, CreditCard, Smartphone, ChevronLeft } from 'lucide-react-native';
import { useState, useEffect } from 'react';
import { ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Colors, Sizes } from '../../constants/colors';
import { cashierStyles } from '../../styles/cashierStyles';
import { scaled } from '../../utils/responsive';

interface Payment {
  method: 'cash' | 'card' | 'digital';
  amount: number;
  discount: number;
  vat: number;
}

const getPaymentIcon = (method: string) => {
  const iconProps = { size: 24, color: Colors.light.primary };
  switch (method) {
    case 'cash': return <Banknote {...iconProps} />;
    case 'card': return <CreditCard {...iconProps} />;
    case 'digital': return <Smartphone {...iconProps} />;
    default: return null;
  }
};

export default function PaymentSelectionScreen() {
  const { total: cartTotal, items: cartItems, itemCount } = useLocalSearchParams();
  const router = useRouter();
  const [payment, setPayment] = useState<Payment>({
    method: 'cash',
    amount: parseFloat(cartTotal as string) || 0,
    discount: 0,
    vat: 0,
  });
  const [discountPercent, setDiscountPercent] = useState('0');

  useEffect(() => {
    if (cartTotal) {
      setPayment(prev => ({
        ...prev,
        amount: parseFloat(cartTotal as string),
      }));
    }
  }, [cartTotal]);

  const subtotal = payment.amount;
  const discountAmount = (subtotal * parseFloat(discountPercent || '0')) / 100;
  const afterDiscount = subtotal - discountAmount;
  const vatAmount = 0; // No VAT
  const total = afterDiscount;

  const handleProceed = () => {
    router.push({
      pathname: '/cashier/cash-payment',
      params: {
        total: total.toFixed(2),
        items: cartItems || null,
        itemCount: itemCount || null,
        paymentMethod: payment.method,
      },
    });
  };

  return (
    <View style={{ flex: 1, backgroundColor: Colors.light.background }}>
      {/* Header */}
      <View style={cashierStyles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <ChevronLeft size={28} color="#030213" />
        </TouchableOpacity>
        <Text style={cashierStyles.title}>Select Payment Method</Text>
        <View style={{ width: 28 }} />
      </View>

      <ScrollView
        contentContainerStyle={{ padding: scaled(Sizes.spacing.lg) }}
      >
        {/* Payment Methods */}
      <View style={{ gap: Sizes.spacing.md, marginBottom: Sizes.spacing.xl }}>
        {(['cash', 'card', 'digital'] as const).map((method) => (
          <TouchableOpacity
            key={method}
            style={{
              backgroundColor: payment.method === method ? Colors.light.primary : Colors.light.card,
              borderRadius: scaled(Sizes.radius.md),
              padding: scaled(Sizes.spacing.md),
              borderWidth: 2,
              borderColor: payment.method === method ? Colors.light.primary : Colors.light.border,
              flexDirection: 'row',
              alignItems: 'center',
              gap: scaled(Sizes.spacing.md),
            }}
            onPress={() => setPayment({ ...payment, method })}
          >
            {getPaymentIcon(method)}
            <View style={{ flex: 1 }}>
              <Text
                style={{
                  fontSize: Sizes.typography.base,
                  fontWeight: '600',
                  color: payment.method === method ? '#fff' : Colors.light.foreground,
                  textTransform: 'capitalize',
                }}
              >
                {method} Payment
              </Text>
            </View>
            {payment.method === method && (
              <View style={{ width: scaled(18), alignItems: 'center' }}>
                <Check size={scaled(18)} color="#fff" />
              </View>
            )}
          </TouchableOpacity>
        ))}
      </View>

      {/* Discount Section */}
      <View style={{ marginBottom: Sizes.spacing.xl }}>
        <Text style={{ fontSize: Sizes.typography.base, fontWeight: '600', marginBottom: Sizes.spacing.sm }}>
          Discount (%)
        </Text>
        <TextInput
          style={{
            borderWidth: 1,
            borderColor: Colors.light.border,
            borderRadius: Sizes.radius.md,
            padding: Sizes.spacing.md,
            color: Colors.light.foreground,
            fontSize: Sizes.typography.base,
          }}
          placeholder="0"
          placeholderTextColor={Colors.light.mutedForeground}
          value={discountPercent}
          onChangeText={setDiscountPercent}
          keyboardType="decimal-pad"
        />
      </View>

      {/* Summary */}
      <View style={{ backgroundColor: Colors.light.card, borderRadius: Sizes.radius.md, padding: Sizes.spacing.lg, marginBottom: Sizes.spacing.xl }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: Sizes.spacing.md }}>
          <Text style={{ color: Colors.light.mutedForeground }}>Subtotal:</Text>
          <Text style={{ fontWeight: '600' }}>₱{subtotal.toFixed(2)}</Text>
        </View>
        {discountAmount > 0 && (
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: Sizes.spacing.md }}>
            <Text style={{ color: Colors.light.mutedForeground }}>Discount:</Text>
            <Text style={{ fontWeight: '600', color: '#10B981' }}>-₱{discountAmount.toFixed(2)}</Text>
          </View>
        )}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: Sizes.spacing.md, paddingBottom: Sizes.spacing.md, borderBottomWidth: 1, borderBottomColor: Colors.light.border }}>
          <Text style={{ color: Colors.light.mutedForeground }}>VAT (12%):</Text>
          <Text style={{ fontWeight: '600' }}>₱{vatAmount.toFixed(2)}</Text>
        </View>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <Text style={{ fontSize: Sizes.typography.lg, fontWeight: '700' }}>Total:</Text>
          <Text style={{ fontSize: Sizes.typography.lg, fontWeight: '700', color: Colors.light.primary }}>
            ₱{total.toFixed(2)}
          </Text>
        </View>
      </View>

      <TouchableOpacity
        style={{
          backgroundColor: 'black',
              borderRadius: Sizes.radius.lg,
              paddingVertical: Sizes.spacing.md,
              paddingHorizontal: Sizes.spacing.xl,
              alignSelf: 'center',
              alignItems: 'center',
              marginBottom: Sizes.spacing.md
        }}
        onPress={handleProceed}
      >
        <Text style={{ color: '#fff', fontWeight: '700', fontSize: Sizes.typography.base }}>
          Proceed to {payment.method === 'cash' ? 'Cash Payment' : payment.method === 'card' ? 'Card Payment' : 'Digital Payment'}
        </Text>
      </TouchableOpacity>
      </ScrollView>
    </View>
  );
}