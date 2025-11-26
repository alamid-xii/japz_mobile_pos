import { BarChart3 } from 'lucide-react-native';
import { ScrollView, Text, View } from 'react-native';
import { Colors, Sizes } from '../../constants/colors';

interface DailySales {
  day: string;
  sales: number;
  orders: number;
  trend: number;
}

const salesData: DailySales[] = [
  { day: 'Mon', sales: 8450, orders: 125, trend: 12 },
  { day: 'Tue', sales: 7890, orders: 118, trend: -5 },
  { day: 'Wed', sales: 9200, orders: 138, trend: 16 },
  { day: 'Thu', sales: 8750, orders: 132, trend: 8 },
  { day: 'Fri', sales: 11200, orders: 168, trend: 28 },
  { day: 'Sat', sales: 13450, orders: 195, trend: 35 },
  { day: 'Sun', sales: 10800, orders: 162, trend: 22 },
];

export default function SalesForecastScreen() {
  const totalWeekSales = salesData.reduce((sum, d) => sum + d.sales, 0);
  const avgDailySales = Math.round(totalWeekSales / salesData.length);
  const totalOrders = salesData.reduce((sum, d) => sum + d.orders, 0);
  const bestDay = salesData.reduce((prev, curr) => curr.sales > prev.sales ? curr : prev);

  return (
    <View style={{ flex: 1, marginTop: Sizes.spacing.lg }}>
      <ScrollView
        style={{ flex: 1, backgroundColor: Colors.light.background }}
        contentContainerStyle={{ padding: Sizes.spacing.lg }}
      >
        <Text style={{ fontSize: Sizes.typography.xl, fontWeight: '700', marginBottom: Sizes.spacing.lg }}>
          Sales Forecast
        </Text>

        {/* Key Metrics */}
        <View style={{ flexDirection: 'row', gap: Sizes.spacing.sm, marginBottom: Sizes.spacing.lg }}>
          <View
            style={{
              flex: 1,
              backgroundColor: '#FFFBEB',
              borderRadius: Sizes.radius.md,
              padding: Sizes.spacing.sm,
              alignItems: 'center',
              borderLeftWidth: 4,
              borderLeftColor: Colors.light.primary,
            }}
          >
            <Text style={{ color: Colors.light.mutedForeground, fontSize: Sizes.typography.xs }}>
              Weekly Revenue
            </Text>
            <Text style={{ fontSize: Sizes.typography.base, fontWeight: '700', marginTop: 4 }}>
              ₱{(totalWeekSales / 1000).toFixed(1)}k
            </Text>
          </View>

          <View
            style={{
              flex: 1,
              backgroundColor: '#FFFBEB',
              borderRadius: Sizes.radius.md,
              padding: Sizes.spacing.sm,
              alignItems: 'center',
              borderLeftWidth: 4,
              borderLeftColor: '#3B82F6',
            }}
          >
            <Text style={{ color: Colors.light.mutedForeground, fontSize: Sizes.typography.xs }}>
              Avg Daily
            </Text>
            <Text style={{ fontSize: Sizes.typography.base, fontWeight: '700', marginTop: 4 }}>
              ₱{(avgDailySales / 1000).toFixed(1)}k
            </Text>
          </View>

          <View
            style={{
              flex: 1,
              backgroundColor: '#FFFBEB',
              borderRadius: Sizes.radius.md,
              padding: Sizes.spacing.sm,
              alignItems: 'center',
              borderLeftWidth: 4,
              borderLeftColor: '#8B5CF6',
            }}
          >
            <Text style={{ color: Colors.light.mutedForeground, fontSize: Sizes.typography.xs }}>
              Total Orders
            </Text>
            <Text style={{ fontSize: Sizes.typography.base, fontWeight: '700', marginTop: 4 }}>
              {totalOrders}
            </Text>
          </View>

          <View
            style={{
              flex: 1,
              backgroundColor: '#FFFBEB',
              borderRadius: Sizes.radius.md,
              padding: Sizes.spacing.sm,
              alignItems: 'center',
              borderLeftWidth: 4,
              borderLeftColor: '#F59E0B',
            }}
          >
            <Text style={{ color: Colors.light.mutedForeground, fontSize: Sizes.typography.xs }}>
              Best Day
            </Text>
            <Text style={{ fontSize: Sizes.typography.base, fontWeight: '700', marginTop: 4, color: Colors.light.primary }}>
              {bestDay.day}
            </Text>
          </View>
        </View>

        {/* Daily Breakdown */}
        <Text style={{ fontSize: Sizes.typography.base, fontWeight: '700', marginBottom: Sizes.spacing.md }}>
          Daily Sales Breakdown
        </Text>
        {salesData.map((day, index) => {
          const maxSales = Math.max(...salesData.map(d => d.sales));
          const barWidth = (day.sales / maxSales) * 80 + 20;
          return (
            <View key={index} style={{ marginBottom: Sizes.spacing.md }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Sizes.spacing.sm }}>
                <Text style={{ fontWeight: '600', minWidth: 40 }}>
                  {day.day}
                </Text>
                <View style={{ flex: 1, marginLeft: Sizes.spacing.md }}>
                  <View
                    style={{
                      height: 30,
                      backgroundColor: Colors.light.primary,
                      borderRadius: Sizes.radius.sm,
                      width: `${barWidth}%`,
                      justifyContent: 'center',
                      paddingLeft: Sizes.spacing.sm,
                    }}
                  >
                    <Text style={{ color: '#fff', fontWeight: '600', fontSize: Sizes.typography.xs }}>
                      ₱{day.sales / 1000}k
                    </Text>
                  </View>
                </View>
                <View style={{ minWidth: 60, alignItems: 'flex-end' }}>
                  <Text style={{ fontSize: Sizes.typography.sm, fontWeight: '600' }}>
                    {day.orders}
                  </Text>
                  <Text style={{ color: Colors.light.mutedForeground, fontSize: Sizes.typography.xs }}>
                    orders
                  </Text>
                </View>
              </View>
              <View style={{ flexDirection: 'row', justifyContent: 'flex-end', paddingRight: Sizes.spacing.md }}>
                <Text
                  style={{
                    fontSize: Sizes.typography.xs,
                    color: day.trend > 0 ? '#10B981' : '#EF4444',
                    fontWeight: '600',
                  }}
                >
                  {day.trend > 0 ? '↑' : '↓'} {Math.abs(day.trend)}%
                </Text>
              </View>
            </View>
          );
        })}

        {/* Insights */}
        <View style={{ backgroundColor: Colors.light.card, borderRadius: Sizes.radius.md, padding: Sizes.spacing.md, marginTop: Sizes.spacing.lg }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: Sizes.spacing.md, gap: Sizes.spacing.sm }}>
            <BarChart3 size={20} color={Colors.light.primary} />
            <Text style={{ fontSize: Sizes.typography.base, fontWeight: '700' }}>
              Insights
            </Text>
          </View>
          <View style={{ gap: Sizes.spacing.sm }}>
            <Text style={{ color: Colors.light.mutedForeground, fontSize: Sizes.typography.sm, lineHeight: 20 }}>
              • Weekend sales are 35% higher than weekdays
            </Text>
            <Text style={{ color: Colors.light.mutedForeground, fontSize: Sizes.typography.sm, lineHeight: 20 }}>
              • Average order value is ₱{Math.round(totalWeekSales / totalOrders)}
            </Text>
            <Text style={{ color: Colors.light.mutedForeground, fontSize: Sizes.typography.sm, lineHeight: 20 }}>
              • Monday shows lowest performance
            </Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}