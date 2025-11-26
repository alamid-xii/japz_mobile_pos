import { useRouter } from 'expo-router';
import { Banknote, Check, CreditCard, Smartphone } from 'lucide-react-native';
import { useState } from 'react';
import { ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Colors, Sizes } from '../../constants/colors';

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
  const router = useRouter();
  const [payment, setPayment] = useState<Payment>({
    method: 'cash',
    amount: 1500,
    discount: 0,
    vat: 0,
  });
  const [discountPercent, setDiscountPercent] = useState('0');

  const subtotal = payment.amount;
  const discountAmount = (subtotal * parseFloat(discountPercent || '0')) / 100;
  const afterDiscount = subtotal - discountAmount;
  const vatAmount = (afterDiscount * 0.12); // 12% VAT
  const total = afterDiscount + vatAmount;

  const handleProceed = () => {
    router.push('/cashier/cash-payment');
  };

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: Colors.light.background }}
      contentContainerStyle={{ padding: Sizes.spacing.lg }}
    >
      <Text style={{ fontSize: Sizes.typography.lg, fontWeight: '700', marginBottom: Sizes.spacing.lg }}>
        Select Payment Method
      </Text>

      {/* Payment Methods */}
      <View style={{ gap: Sizes.spacing.md, marginBottom: Sizes.spacing.xl }}>
        {(['cash', 'card', 'digital'] as const).map((method) => (
          <TouchableOpacity
            key={method}
            style={{
              backgroundColor: payment.method === method ? Colors.light.primary : Colors.light.card,
              borderRadius: Sizes.radius.md,
              padding: Sizes.spacing.md,
              borderWidth: 2,
              borderColor: payment.method === method ? Colors.light.primary : Colors.light.border,
              flexDirection: 'row',
              alignItems: 'center',
              gap: Sizes.spacing.md,
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
              <View style={{ width: 18, alignItems: 'center' }}>
                <Check size={18} color="#fff" />
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
          backgroundColor: Colors.light.primary,
          borderRadius: Sizes.radius.md,
          padding: Sizes.spacing.lg,
          alignItems: 'center',
        }}
        onPress={handleProceed}
      >
        <Text style={{ color: '#fff', fontWeight: '700', fontSize: Sizes.typography.base }}>
          Proceed to {payment.method === 'cash' ? 'Cash Payment' : 'Payment'}
        </Text>
      </TouchableOpacity>
    </ScrollView>
  );
}