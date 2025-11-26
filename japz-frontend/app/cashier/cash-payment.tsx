import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Colors, Sizes } from '../../constants/colors';

interface CashPaymentState {
  totalAmount: number;
  amountReceived: string;
  notes: string;
}

export default function CashPaymentScreen() {
  const router = useRouter();
  const [state, setState] = useState<CashPaymentState>({
    totalAmount: 1650, // Example total
    amountReceived: '',
    notes: '',
  });

  const amountReceived = parseFloat(state.amountReceived || '0');
  const change = amountReceived - state.totalAmount;
  const isValidPayment = amountReceived >= state.totalAmount;

  const handleQuickAmount = (amount: number) => {
    setState({ ...state, amountReceived: amount.toString() });
  };

  const handleComplete = () => {
    if (isValidPayment) {
      router.push('/cashier/receipt');
    }
  };

  const roundedChange = Math.round(change * 100) / 100;

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: Colors.light.background }}
      contentContainerStyle={{ padding: Sizes.spacing.lg }}
    >
      <Text style={{ fontSize: Sizes.typography.lg, fontWeight: '700', marginBottom: Sizes.spacing.lg }}>
        Cash Payment
      </Text>

      {/* Amount Due */}
      <View style={{ backgroundColor: Colors.light.card, borderRadius: Sizes.radius.md, padding: Sizes.spacing.lg, marginBottom: Sizes.spacing.lg }}>
        <Text style={{ color: Colors.light.mutedForeground, marginBottom: Sizes.spacing.sm }}>
          Amount Due
        </Text>
        <Text style={{ fontSize: Sizes.typography.xl, fontWeight: '700', color: Colors.light.primary }}>
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
            borderRadius: Sizes.radius.md,
            padding: Sizes.spacing.md,
            color: Colors.light.foreground,
            fontSize: Sizes.typography.lg,
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
        {[1000, 2000, 3000, 5000].map((amount) => (
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
        <View style={{ backgroundColor: Colors.light.card, borderRadius: Sizes.radius.md, padding: Sizes.spacing.lg, marginBottom: Sizes.spacing.lg }}>
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
            minHeight: 80,
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
          backgroundColor: isValidPayment ? Colors.light.primary : Colors.light.muted,
          borderRadius: Sizes.radius.md,
          padding: Sizes.spacing.lg,
          alignItems: 'center',
        }}
        onPress={handleComplete}
        disabled={!isValidPayment}
      >
        <Text
          style={{
            color: isValidPayment ? '#fff' : Colors.light.mutedForeground,
            fontWeight: '700',
            fontSize: Sizes.typography.base,
          }}
        >
          Complete Transaction
        </Text>
      </TouchableOpacity>
    </ScrollView>
  );
}