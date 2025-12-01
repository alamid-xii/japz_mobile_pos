import { useRouter, useLocalSearchParams } from 'expo-router';
import { ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { useEffect, useState } from 'react';
import { Colors, Sizes } from '../../constants/colors';
import { scaled } from '../../utils/responsive';

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
  vat: 0,
  total: 750,
  paymentMethod: 'Cash',
  amountReceived: 2000,
  change: 1250,
  cashier: 'Juan Dela Cruz',
};

export default function ReceiptScreen() {
  const router = useRouter();
  const { order: orderParam } = useLocalSearchParams();
  const [order, setOrder] = useState<any | null>(null);

  useEffect(() => {
    if (orderParam) {
      try {
        const parsed = typeof orderParam === 'string' ? JSON.parse(orderParam as string) : orderParam;
        setOrder(parsed);
      } catch (e) {
        console.warn('Failed to parse order param', e);
        setOrder(null);
      }
    }
  }, [orderParam]);

  const activeReceipt = order || mockReceipt;

  const handlePrint = async () => {
    try {
      const html = `
        <html>
        <body style="font-family: Helvetica, Arial, sans-serif; padding: 20px;">
          <h2>JAPZ Mobile POS - Receipt</h2>
          <p>Order #: ${activeReceipt.orderNumber || activeReceipt.orderId}</p>
          <p>Date: ${activeReceipt.date || new Date(activeReceipt.createdAt || Date.now()).toLocaleDateString()}</p>
          <table style="width:100%; border-collapse: collapse; margin-top: 10px;">
            ${activeReceipt.items.map((it: any) => `
                    <tr>
                      <td style="padding:6px 0">${it.name} x ${it.quantity}</td>
                      <td style="text-align:right">₱${Number(it.total || (it.price * it.quantity) || 0).toFixed(2)}</td>
                    </tr>
                  `).join('')}
          </table>
          <hr />
          <p style="text-align:right; font-weight:700">Total: ₱${(activeReceipt.total || activeReceipt.subtotal || 0).toFixed(2)}</p>
        </body>
        </html>
      `;
      // dynamic import so the bundler doesn't crash on environments without native modules
      try {
        const PrintModule = await import('expo-print');
        if (PrintModule && PrintModule.printAsync) {
          await PrintModule.printAsync({ html });
        } else {
          throw new Error('Print API not available');
        }
      } catch (err: any) {
        // User cancelled is not an error, silently ignore
        if (err?.message?.includes('cancelled') || err?.message?.includes('Cancelled')) {
          console.log('Print cancelled by user');
          return;
        }
        console.error('Print failed (dynamic import)', err);
        alert('Printing is not available in this environment.');
      }
    } catch (e) {
      console.error('Print failed', e);
      alert('Printing failed.');
    }
  };

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: Colors.light.background }}
      contentContainerStyle={{ padding: scaled(Sizes.spacing.lg) }}
    >
      <View style={{ backgroundColor: Colors.light.card, borderRadius: Sizes.radius.lg, padding: scaled(Sizes.spacing.lg), marginBottom: scaled(Sizes.spacing.lg) }}>
        {/* Header */}
                <Text style={{ fontSize: scaled(Sizes.typography.lg), fontWeight: '700', textAlign: 'center', marginBottom: scaled(Sizes.spacing.lg) }}>
          🧾 RECEIPT
        </Text>
        <View style={{ borderBottomWidth: 1, borderBottomColor: Colors.light.border, paddingBottom: Sizes.spacing.md, marginBottom: Sizes.spacing.md }}>
          <Text style={{ textAlign: 'center', color: Colors.light.mutedForeground, marginBottom: Sizes.spacing.sm }}>
            Order #{activeReceipt.orderNumber || activeReceipt.orderId}
          </Text>
          <Text style={{ textAlign: 'center', color: Colors.light.mutedForeground, fontSize: Sizes.typography.sm }}>
            {activeReceipt.date || new Date(activeReceipt.createdAt || Date.now()).toLocaleDateString()} {activeReceipt.time || new Date(activeReceipt.createdAt || Date.now()).toLocaleTimeString()}
          </Text>
        </View>

        {/* Items */}
        <View style={{ marginBottom: Sizes.spacing.lg }}>
          {activeReceipt.items.map((item: any, index: number) => (
            <View key={index} style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: Sizes.spacing.sm }}>
              <View style={{ flex: 1 }}>
                <Text style={{ fontWeight: '600', color: Colors.light.foreground }}>
                  {item.name}
                </Text>
                <Text style={{ fontSize: Sizes.typography.sm, color: Colors.light.mutedForeground }}>
                  {item.quantity} x ₱{Number(item.price || 0).toFixed(2)}
                </Text>
              </View>
              <Text style={{ fontWeight: '600', minWidth: 80, textAlign: 'right' }}>
                ₱{Number(item.total || (item.price * item.quantity) || 0).toFixed(2)}
              </Text>
            </View>
          ))}
        </View>

        {/* Summary */}
        <View style={{ borderTopWidth: 1, borderBottomWidth: 1, borderColor: Colors.light.border, paddingVertical: Sizes.spacing.md, marginBottom: Sizes.spacing.lg }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: Sizes.spacing.sm }}>
            <Text style={{ color: Colors.light.mutedForeground }}>Subtotal:</Text>
            <Text>₱{Number(activeReceipt.subtotal || activeReceipt.total || 0).toFixed(2)}</Text>
          </View>

          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <Text style={{ fontSize: Sizes.typography.base, fontWeight: '700' }}>Total:</Text>
            <Text style={{ fontSize: Sizes.typography.base, fontWeight: '700', color: Colors.light.primary }}>
              ₱{Number(activeReceipt.total || activeReceipt.subtotal || 0).toFixed(2)}
            </Text>
          </View>
        </View>

        {/* Payment Info */}
        <View style={{ marginBottom: Sizes.spacing.lg }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: Sizes.spacing.sm }}>
            <Text style={{ color: Colors.light.mutedForeground }}>Payment Method:</Text>
            <Text style={{ fontWeight: '600' }}>{activeReceipt.payment?.method || activeReceipt.paymentMethod}</Text>
          </View>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: Sizes.spacing.sm }}>
            <Text style={{ color: Colors.light.mutedForeground }}>Amount Received:</Text>
            <Text>₱{Number(activeReceipt.payment?.amountReceived || activeReceipt.amountReceived || 0).toFixed(2)}</Text>
          </View>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <Text style={{ color: Colors.light.mutedForeground }}>Change:</Text>
            <Text style={{ fontWeight: '600', color: '#10B981' }}>₱{Number(activeReceipt.payment?.change || activeReceipt.change || 0).toFixed(2)}</Text>
          </View>
        </View>

        {/* Footer */}
        <View style={{ borderTopWidth: 1, borderTopColor: Colors.light.border, paddingTop: Sizes.spacing.md }}>
          <Text style={{ textAlign: 'center', color: Colors.light.mutedForeground, fontSize: Sizes.typography.sm, marginBottom: Sizes.spacing.sm }}>
            Cashier: {activeReceipt.cashier || '—'}
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
        onPress={handlePrint}
      >
        <Text style={{ color: Colors.light.primary, fontWeight: '700', fontSize: Sizes.typography.base }}>
          Print Receipt
        </Text>
      </TouchableOpacity>
    </ScrollView>
  );
}