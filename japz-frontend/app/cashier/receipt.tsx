import { useRouter } from 'expo-router';
import { ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { Colors, Sizes } from '../../constants/colors';

interface ReceiptItem {
  name: string;
  quantity: number;
  price: number;
  total: number;
}

const mockReceipt = {
  orderId: 'ORD-2024-001234',
  date: new Date().toLocaleDateString(),
  time: new Date().toLocaleTimeString(),
  items: [
    { name: 'Adobo Platter', quantity: 2, price: 250, total: 500 },
    { name: 'Iced Tea', quantity: 3, price: 75, total: 225 },
    { name: 'Rice', quantity: 1, price: 25, total: 25 },
  ] as ReceiptItem[],
  subtotal: 750,
  discount: 0,
  vat: 90,
  total: 1650,
  paymentMethod: 'Cash',
  amountReceived: 2000,
  change: 350,
  cashier: 'Juan Dela Cruz',
};

export default function ReceiptScreen() {
  const router = useRouter();

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: Colors.light.background }}
      contentContainerStyle={{ padding: Sizes.spacing.lg }}
    >
      <View style={{ backgroundColor: Colors.light.card, borderRadius: Sizes.radius.lg, padding: Sizes.spacing.lg, marginBottom: Sizes.spacing.lg }}>
        {/* Header */}
        <Text style={{ fontSize: Sizes.typography.lg, fontWeight: '700', textAlign: 'center', marginBottom: Sizes.spacing.lg }}>
          🧾 RECEIPT
        </Text>
        <View style={{ borderBottomWidth: 1, borderBottomColor: Colors.light.border, paddingBottom: Sizes.spacing.md, marginBottom: Sizes.spacing.md }}>
          <Text style={{ textAlign: 'center', color: Colors.light.mutedForeground, marginBottom: Sizes.spacing.sm }}>
            Order #{mockReceipt.orderId}
          </Text>
          <Text style={{ textAlign: 'center', color: Colors.light.mutedForeground, fontSize: Sizes.typography.sm }}>
            {mockReceipt.date} {mockReceipt.time}
          </Text>
        </View>

        {/* Items */}
        <View style={{ marginBottom: Sizes.spacing.lg }}>
          {mockReceipt.items.map((item, index) => (
            <View key={index} style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: Sizes.spacing.sm }}>
              <View style={{ flex: 1 }}>
                <Text style={{ fontWeight: '600', color: Colors.light.foreground }}>
                  {item.name}
                </Text>
                <Text style={{ fontSize: Sizes.typography.sm, color: Colors.light.mutedForeground }}>
                  {item.quantity} x ₱{item.price.toFixed(2)}
                </Text>
              </View>
              <Text style={{ fontWeight: '600', minWidth: 80, textAlign: 'right' }}>
                ₱{item.total.toFixed(2)}
              </Text>
            </View>
          ))}
        </View>

        {/* Summary */}
        <View style={{ borderTopWidth: 1, borderBottomWidth: 1, borderColor: Colors.light.border, paddingVertical: Sizes.spacing.md, marginBottom: Sizes.spacing.lg }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: Sizes.spacing.sm }}>
            <Text style={{ color: Colors.light.mutedForeground }}>Subtotal:</Text>
            <Text>₱{mockReceipt.subtotal.toFixed(2)}</Text>
          </View>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: Sizes.spacing.sm }}>
            <Text style={{ color: Colors.light.mutedForeground }}>VAT (12%):</Text>
            <Text>₱{mockReceipt.vat.toFixed(2)}</Text>
          </View>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <Text style={{ fontSize: Sizes.typography.base, fontWeight: '700' }}>Total:</Text>
            <Text style={{ fontSize: Sizes.typography.base, fontWeight: '700', color: Colors.light.primary }}>
              ₱{mockReceipt.total.toFixed(2)}
            </Text>
          </View>
        </View>

        {/* Payment Info */}
        <View style={{ marginBottom: Sizes.spacing.lg }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: Sizes.spacing.sm }}>
            <Text style={{ color: Colors.light.mutedForeground }}>Payment Method:</Text>
            <Text style={{ fontWeight: '600' }}>{mockReceipt.paymentMethod}</Text>
          </View>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: Sizes.spacing.sm }}>
            <Text style={{ color: Colors.light.mutedForeground }}>Amount Received:</Text>
            <Text>₱{mockReceipt.amountReceived.toFixed(2)}</Text>
          </View>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <Text style={{ color: Colors.light.mutedForeground }}>Change:</Text>
            <Text style={{ fontWeight: '600', color: '#10B981' }}>₱{mockReceipt.change.toFixed(2)}</Text>
          </View>
        </View>

        {/* Footer */}
        <View style={{ borderTopWidth: 1, borderTopColor: Colors.light.border, paddingTop: Sizes.spacing.md }}>
          <Text style={{ textAlign: 'center', color: Colors.light.mutedForeground, fontSize: Sizes.typography.sm, marginBottom: Sizes.spacing.sm }}>
            Cashier: {mockReceipt.cashier}
          </Text>
          <Text style={{ textAlign: 'center', color: Colors.light.mutedForeground, fontSize: Sizes.typography.xs }}>
            Thank you for your purchase!
          </Text>
        </View>
      </View>

      {/* Actions */}
      <TouchableOpacity
        style={{
          backgroundColor: Colors.light.primary,
          borderRadius: Sizes.radius.md,
          padding: Sizes.spacing.lg,
          alignItems: 'center',
          marginBottom: Sizes.spacing.md,
        }}
        onPress={() => router.push('/cashier/pos')}
      >
        <Text style={{ color: '#fff', fontWeight: '700', fontSize: Sizes.typography.base }}>
          New Order
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={{
          borderWidth: 2,
          borderColor: Colors.light.primary,
          borderRadius: Sizes.radius.md,
          padding: Sizes.spacing.lg,
          alignItems: 'center',
        }}
        onPress={() => {}}
      >
        <Text style={{ color: Colors.light.primary, fontWeight: '700', fontSize: Sizes.typography.base }}>
          Print Receipt
        </Text>
      </TouchableOpacity>
    </ScrollView>
  );
}