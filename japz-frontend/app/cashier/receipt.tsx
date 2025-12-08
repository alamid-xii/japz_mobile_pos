import { useRouter, useLocalSearchParams } from 'expo-router';
import { ChevronLeft } from 'lucide-react-native';
import { ScrollView, Text, TouchableOpacity, View, Image } from 'react-native';
import { useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Colors, Sizes } from '../../constants/colors';
import { cashierStyles } from '../../styles/cashierStyles';
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
    <View style={{ flex: 1, backgroundColor: Colors.light.background }}>
      {/* Header */}
      <View style={cashierStyles.header}>
        <TouchableOpacity onPress={() => router.push('/cashier/cash-payment')}>
          <ChevronLeft size={28} color="#030213" />
        </TouchableOpacity>
        <Text style={cashierStyles.title}>Receipt</Text>
        <View style={{ width: 28 }} />
      </View>

      <ScrollView
        contentContainerStyle={{ padding: scaled(Sizes.spacing.lg) }}
      >
      <View style={{ backgroundColor: '#fff', borderRadius: Sizes.radius.lg, padding: scaled(Sizes.spacing.xl), marginBottom: scaled(Sizes.spacing.lg) }}>
        {/* Logo and Header */}
        <View style={{ alignItems: 'center', marginBottom: scaled(Sizes.spacing.lg) }}>
          <Image
            source={require('../../assets/images/logo.jpg')}
            style={{ width: scaled(60), height: scaled(60), marginBottom: scaled(Sizes.spacing.md) }}
          />
          <Text style={{ fontSize: scaled(20), fontWeight: '700', textAlign: 'center', color: '#000', marginBottom: scaled(4) }}>
            JAPZ GRILL
          </Text>
          <Text style={{ fontSize: scaled(14), fontWeight: '600', textAlign: 'center', color: '#000', marginBottom: scaled(Sizes.spacing.sm) }}>
            Burger & Bistro
          </Text>
          <Text style={{ fontSize: scaled(11), textAlign: 'center', color: '#333', marginBottom: scaled(3) }}>
            Quezon St., Bagumbayan I, Bongabong, Philippines
          </Text>
          <Text style={{ fontSize: scaled(11), textAlign: 'center', color: '#333', marginBottom: scaled(3) }}>
            0966 359 9235
          </Text>
          <Text style={{ fontSize: scaled(11), textAlign: 'center', color: '#333' }}>
            japzgrillburgerandbistro@gmail.com
          </Text>
        </View>

        <View style={{ borderTopWidth: 1, borderBottomWidth: 1, borderColor: '#000', paddingVertical: scaled(Sizes.spacing.sm), marginBottom: scaled(Sizes.spacing.md) }} />

        {/* Order Details */}
        <View style={{ marginBottom: scaled(Sizes.spacing.md) }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: scaled(4) }}>
            <Text style={{ fontSize: scaled(11), color: '#333' }}>Order #: {activeReceipt.orderNumber || activeReceipt.orderId}</Text>
            <Text style={{ fontSize: scaled(11), color: '#333' }}>POS: POS 1</Text>
          </View>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: scaled(4) }}>
            <Text style={{ fontSize: scaled(11), color: '#333' }}>Employee: {activeReceipt.cashier || '—'}</Text>
          </View>
          <Text style={{ fontSize: scaled(11), color: '#333' }}>
            {activeReceipt.date || new Date(activeReceipt.createdAt || Date.now()).toLocaleDateString()} {activeReceipt.time || new Date(activeReceipt.createdAt || Date.now()).toLocaleTimeString()}
          </Text>
        </View>

        <View style={{ borderTopWidth: 1, borderBottomWidth: 1, borderColor: '#000', paddingVertical: scaled(Sizes.spacing.sm), marginBottom: scaled(Sizes.spacing.md) }} />

        {/* Items */}
        <View style={{ marginBottom: scaled(Sizes.spacing.lg) }}>
          {activeReceipt.items.map((item: any, index: number) => (
            <View key={index}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: scaled(4) }}>
                <Text style={{ fontSize: scaled(11), fontWeight: '600', color: '#000', flex: 1 }}>
                  {item.name}
                </Text>
                <Text style={{ fontSize: scaled(11), fontWeight: '600', color: '#000', textAlign: 'right', minWidth: scaled(60) }}>
                  ₱{Number(item.total || (item.price * item.quantity) || 0).toFixed(2)}
                </Text>
              </View>
              <Text style={{ fontSize: scaled(10), color: '#666', marginBottom: scaled(6) }}>
                {item.quantity} x ₱{Number(item.price || 0).toFixed(2)}
              </Text>
            </View>
          ))}
        </View>

        <View style={{ borderTopWidth: 1, borderBottomWidth: 1, borderColor: '#000', paddingVertical: scaled(Sizes.spacing.sm), marginBottom: scaled(Sizes.spacing.md) }} />

        {/* Totals */}
        <View style={{ marginBottom: scaled(Sizes.spacing.lg) }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: scaled(8) }}>
            <Text style={{ fontSize: scaled(11), color: '#333' }}>Subtotal:</Text>
            <Text style={{ fontSize: scaled(11), color: '#333' }}>₱{Number(activeReceipt.subtotal || activeReceipt.total || 0).toFixed(2)}</Text>
          </View>
          
          {(activeReceipt.payment?.vat || activeReceipt.vat) ? (
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: scaled(8) }}>
              <Text style={{ fontSize: scaled(11), color: '#333' }}>VAT, {activeReceipt.payment?.vatPercent || '20'}%:</Text>
              <Text style={{ fontSize: scaled(11), color: '#333' }}>₱{Number(activeReceipt.payment?.vat || activeReceipt.vat || 0).toFixed(2)}</Text>
            </View>
          ) : null}

          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: scaled(Sizes.spacing.md) }}>
            <Text style={{ fontSize: scaled(13), fontWeight: '700', color: '#000' }}>Total</Text>
            <Text style={{ fontSize: scaled(13), fontWeight: '700', color: '#000' }}>₱{Number(activeReceipt.total || activeReceipt.subtotal || 0).toFixed(2)}</Text>
          </View>
        </View>

        <View style={{ borderTopWidth: 1, borderBottomWidth: 1, borderColor: '#000', paddingVertical: scaled(Sizes.spacing.sm), marginBottom: scaled(Sizes.spacing.md) }} />

        {/* Payment */}
        <View style={{ marginBottom: scaled(Sizes.spacing.lg) }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: scaled(6) }}>
            <Text style={{ fontSize: scaled(11), color: '#333' }}>{activeReceipt.payment?.method || activeReceipt.paymentMethod}</Text>
            <Text style={{ fontSize: scaled(11), fontWeight: '600', color: '#000' }}>₱{Number(activeReceipt.payment?.amountReceived || activeReceipt.amountReceived || 0).toFixed(2)}</Text>
          </View>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <Text style={{ fontSize: scaled(11), color: '#333' }}>Change</Text>
            <Text style={{ fontSize: scaled(11), fontWeight: '600', color: '#000' }}>₱{Number(activeReceipt.payment?.change || activeReceipt.change || 0).toFixed(2)}</Text>
          </View>
        </View>

        <View style={{ borderTopWidth: 1, borderColor: '#000', paddingTop: scaled(Sizes.spacing.sm) }}>
          <Text style={{ fontSize: scaled(11), textAlign: 'center', color: '#333', marginBottom: scaled(4) }}>
            See you next time!
          </Text>
          <Text style={{ fontSize: scaled(10), textAlign: 'center', color: '#666' }}>
            {activeReceipt.date || new Date(activeReceipt.createdAt || Date.now()).toLocaleDateString()} {activeReceipt.time || new Date(activeReceipt.createdAt || Date.now()).toLocaleTimeString()} #{activeReceipt.orderNumber || activeReceipt.orderId}
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
        onPress={async () => {
          await AsyncStorage.removeItem('cashierCart');
          router.push('/cashier/pos');
        }}
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
    </View>
  );
}