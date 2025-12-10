import { BarChart3, Calendar, TrendingUp, Download } from 'lucide-react-native';
import { useCallback, useState, useEffect } from 'react';
import { ScrollView, Text, View, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { BackHandler } from 'react-native';
import { Colors, Sizes } from '../../constants/colors';
import { ordersAPI } from '../../services/api';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';

interface DailySales {
  day: string;
  date: string;
  sales: number;
  orders: number;
  trend: number;
}

export default function SalesForecastScreen() {
  const [dailySalesData, setDailySalesData] = useState<DailySales[]>([]);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState<'week' | 'month'>('week');

  // Prevent back navigation
  useFocusEffect(
    useCallback(() => {
      const subscription = BackHandler.addEventListener('hardwareBackPress', () => true);
      return () => subscription.remove();
    }, [])
  );

  // Fetch sales data
  useEffect(() => {
    fetchSalesData();
  }, [selectedPeriod]);

  const fetchSalesData = async () => {
    try {
      setLoading(true);
      
      // Calculate date range
      const endDate = new Date();
      const startDate = new Date();
      if (selectedPeriod === 'week') {
        startDate.setDate(endDate.getDate() - 7);
      } else {
        startDate.setMonth(endDate.getMonth() - 1);
      }

      // Fetch all orders in the date range
      const response = await ordersAPI.getAll();
      const orders = response.data;

      // Filter and process orders by day
      const salesByDay: { [key: string]: { sales: number; count: number; date: string } } = {};
      
      orders.forEach((order: any) => {
        const orderDate = new Date(order.createdAt);
        
        // Check if order is within date range
        if (orderDate >= startDate && orderDate <= endDate) {
          const dayKey = orderDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
          const dateStr = orderDate.toISOString().split('T')[0];
          
          if (!salesByDay[dayKey]) {
            salesByDay[dayKey] = { sales: 0, count: 0, date: dateStr };
          }
          
          // Ensure total is a number
          const orderTotal = parseFloat(order.total) || 0;
          salesByDay[dayKey].sales += orderTotal;
          salesByDay[dayKey].count += 1;
        }
      });

      // Convert to array and calculate trends
      const salesArray: DailySales[] = Object.entries(salesByDay).map(([day, data], index, arr) => {
        let trend = 0;
        if (index > 0) {
          const prevValue = Object.values(arr[index - 1][1])[0] as number;
          const currValue = data.sales;
          trend = prevValue !== 0 ? Math.round(((currValue - prevValue) / prevValue) * 100) : 0;
        }
        
        return {
          day,
          date: data.date,
          sales: Math.round(data.sales),
          orders: data.count,
          trend
        };
      });

      setDailySalesData(salesArray.length > 0 ? salesArray : generateDefaultData());
    } catch (error) {
      console.error('Error fetching sales data:', error);
      Alert.alert('Error', 'Failed to load sales data');
      setDailySalesData(generateDefaultData());
    } finally {
      setLoading(false);
    }
  };

  // Generate default data if no orders exist
  const generateDefaultData = (): DailySales[] => {
    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    return days.map((day, index) => ({
      day,
      date: new Date(Date.now() - (7 - index) * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      sales: 0,
      orders: 0,
      trend: 0
    }));
  };

  // Generate PDF content
  const generatePDFContent = () => {
    const totalSales = dailySalesData.reduce((sum, d) => sum + d.sales, 0);
    const avgDailySales = dailySalesData.length > 0 ? Math.round(totalSales / dailySalesData.length) : 0;
    const totalOrders = dailySalesData.reduce((sum, d) => sum + d.orders, 0);
    const bestDay = dailySalesData.length > 0 ? dailySalesData.reduce((prev, curr) => curr.sales > prev.sales ? curr : prev) : dailySalesData[0];
    
    const periodText = selectedPeriod === 'week' ? 'Weekly' : 'Monthly';
    const currentDate = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    
    let htmlContent = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>JAPZ Sales Report - ${periodText}</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            margin: 20px;
            color: #333;
            line-height: 1.6;
        }
        .header {
            text-align: center;
            margin-bottom: 30px;
            border-bottom: 3px solid #ffce1b;
            padding-bottom: 15px;
        }
        .header h1 {
            margin: 0;
            color: #030213;
            font-size: 28px;
        }
        .header p {
            margin: 5px 0;
            color: #666;
        }
        .metrics {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 15px;
            margin-bottom: 30px;
        }
        .metric-box {
            border-left: 4px solid #ffce1b;
            padding: 15px;
            background-color: #fffbeb;
            border-radius: 5px;
        }
        .metric-label {
            font-size: 12px;
            color: #666;
            margin-bottom: 5px;
        }
        .metric-value {
            font-size: 20px;
            font-weight: bold;
            color: #030213;
        }
        .section-title {
            font-size: 16px;
            font-weight: bold;
            margin-top: 30px;
            margin-bottom: 15px;
            border-bottom: 2px solid #ffce1b;
            padding-bottom: 10px;
        }
        table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 20px;
        }
        th {
            background-color: #030213;
            color: #ffce1b;
            padding: 12px;
            text-align: left;
            font-weight: bold;
        }
        td {
            padding: 12px;
            border-bottom: 1px solid #ddd;
        }
        tr:nth-child(even) {
            background-color: #f9f9f9;
        }
        .footer {
            margin-top: 30px;
            padding-top: 15px;
            border-top: 1px solid #ddd;
            font-size: 12px;
            color: #666;
            text-align: center;
        }
        .trend-up {
            color: #10B981;
            font-weight: bold;
        }
        .trend-down {
            color: #EF4444;
            font-weight: bold;
        }
        .insights {
            background-color: #f0f9ff;
            border-left: 4px solid #3B82F6;
            padding: 15px;
            margin-top: 20px;
            border-radius: 5px;
        }
        .insights-title {
            font-weight: bold;
            color: #030213;
            margin-bottom: 10px;
        }
        .insights-text {
            font-size: 13px;
            color: #333;
            margin: 8px 0;
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>JAPZ POS - ${periodText} Sales Report</h1>
        <p>Generated on ${currentDate}</p>
        <p>Report Period: ${selectedPeriod === 'week' ? 'Last 7 Days' : 'Last 30 Days'}</p>
    </div>

    <div class="metrics">
        <div class="metric-box">
            <div class="metric-label">Total Revenue</div>
            <div class="metric-value">₱${totalSales.toLocaleString()}</div>
        </div>
        <div class="metric-box">
            <div class="metric-label">Average Daily</div>
            <div class="metric-value">₱${avgDailySales.toLocaleString()}</div>
        </div>
        <div class="metric-box">
            <div class="metric-label">Total Orders</div>
            <div class="metric-value">${totalOrders}</div>
        </div>
        <div class="metric-box">
            <div class="metric-label">Best Day</div>
            <div class="metric-value">${bestDay?.day || 'N/A'}</div>
        </div>
    </div>

    <div class="section-title">Daily Sales Breakdown</div>
    <table>
        <thead>
            <tr>
                <th>Date</th>
                <th>Day</th>
                <th>Sales (₱)</th>
                <th>Orders</th>
                <th>Trend</th>
            </tr>
        </thead>
        <tbody>
            ${dailySalesData.map(day => `
            <tr>
                <td>${day.date}</td>
                <td>${day.day}</td>
                <td>₱${day.sales.toLocaleString()}</td>
                <td>${day.orders}</td>
                <td class="${day.trend > 0 ? 'trend-up' : day.trend < 0 ? 'trend-down' : ''}">
                    ${day.trend > 0 ? '↑' : day.trend < 0 ? '↓' : '→'} ${Math.abs(day.trend)}%
                </td>
            </tr>
            `).join('')}
        </tbody>
    </table>

    <div class="insights">
        <div class="insights-title">📊 Key Insights</div>
        <div class="insights-text">• Total ${selectedPeriod === 'week' ? 'weekly' : 'monthly'} revenue: ₱${totalSales.toLocaleString()}</div>
        <div class="insights-text">• Average order value: ₱${totalOrders > 0 ? Math.round(totalSales / totalOrders).toLocaleString() : 0}</div>
        ${bestDay ? `<div class="insights-text">• Best performing day: ${bestDay.day} with ₱${bestDay.sales.toLocaleString()} (${bestDay.orders} orders)</div>` : ''}
        <div class="insights-text">• Total transactions: ${totalOrders}</div>
    </div>

    <div class="footer">
        <p>This is an automatically generated report from JAPZ POS System</p>
        <p>&copy; ${new Date().getFullYear()} JAPZ. All rights reserved.</p>
    </div>
</body>
</html>
    `;
    
    return htmlContent;
  };

  // Download PDF
  const handleDownloadPDF = async () => {
    try {
      setDownloading(true);
      
      const htmlContent = generatePDFContent();
      const fileName = `JAPZ_Sales_Report_${selectedPeriod}_${new Date().toISOString().split('T')[0]}.pdf`;
      
      // Generate PDF using expo-print
      const { uri } = await Print.printToFileAsync({
        html: htmlContent,
      });
      
      // Share the file
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, {
          mimeType: 'application/pdf',
          dialogTitle: 'Share Sales Report',
          UTI: 'com.adobe.pdf',
        });
      } else {
        Alert.alert('Success', `Report saved to ${uri}`);
      }
    } catch (error) {
      console.error('Error generating PDF:', error);
      Alert.alert('Error', 'Failed to generate report. Please try again.');
    } finally {
      setDownloading(false);
    }
  };

  // Calculate metrics
  const totalSales = Math.max(0, dailySalesData.reduce((sum, d) => sum + (parseFloat(d.sales.toString()) || 0), 0));
  const avgDailySales = dailySalesData.length > 0 ? Math.round(totalSales / dailySalesData.length) : 0;
  const totalOrders = dailySalesData.reduce((sum, d) => sum + d.orders, 0);
  const bestDay = dailySalesData.length > 0 ? dailySalesData.reduce((prev, curr) => curr.sales > prev.sales ? curr : prev) : null;
  const maxSales = dailySalesData.length > 0 ? Math.max(...dailySalesData.map(d => d.sales)) : 1;

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.light.background }}>
        <ActivityIndicator size="large" color={Colors.light.primary} />
        <Text style={{ marginTop: Sizes.spacing.md, color: Colors.light.mutedForeground }}>
          Loading sales data...
        </Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, marginTop: Sizes.spacing.lg }}>
      <ScrollView
        style={{ flex: 1, backgroundColor: Colors.light.background }}
        contentContainerStyle={{ padding: Sizes.spacing.lg }}
      >
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Sizes.spacing.lg }}>
          <Text style={{ fontSize: Sizes.typography['2xl'], fontWeight: '700', color: '#ffce1b' }}>
            Sales
          </Text>
          <View style={{ flexDirection: 'row', gap: Sizes.spacing.sm, alignItems: 'center' }}>
            <TouchableOpacity
              onPress={() => setSelectedPeriod('week')}
              style={{
                paddingHorizontal: Sizes.spacing.md,
                paddingVertical: Sizes.spacing.sm,
                borderRadius: Sizes.radius.sm,
                backgroundColor: selectedPeriod === 'week' ? '#ffce1b' : Colors.light.muted
              }}
            >
              <Text style={{ color: selectedPeriod === 'week' ? '#030213' : Colors.light.foreground, fontWeight: '600', fontSize: Sizes.typography.sm }}>
                Week
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setSelectedPeriod('month')}
              style={{
                paddingHorizontal: Sizes.spacing.md,
                paddingVertical: Sizes.spacing.sm,
                borderRadius: Sizes.radius.sm,
                backgroundColor: selectedPeriod === 'month' ? '#ffce1b' : Colors.light.muted
              }}
            >
              <Text style={{ color: selectedPeriod === 'month' ? '#030213' : Colors.light.foreground, fontWeight: '600', fontSize: Sizes.typography.sm }}>
                Month
              </Text>
            </TouchableOpacity>
          </View>
        </View>

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
              Total Revenue
            </Text>
            <Text style={{ fontSize: Sizes.typography.base, fontWeight: '700', marginTop: 4 }}>
              ₱{isNaN(totalSales / 1000) ? '0' : (totalSales / 1000).toFixed(1)}k
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
              ₱{isNaN(avgDailySales / 1000) ? '0' : (avgDailySales / 1000).toFixed(1)}k
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
              {bestDay?.day || 'N/A'}
            </Text>
          </View>
        </View>

        {/* Daily Breakdown */}
        <Text style={{ fontSize: Sizes.typography.base, fontWeight: '700', marginBottom: Sizes.spacing.md }}>
          Daily Sales Breakdown
        </Text>
        {dailySalesData.length > 0 ? (
          dailySalesData.map((day, index) => {
            const barWidth = maxSales > 0 ? (day.sales / maxSales) * 80 + 20 : 20;
            return (
              <View key={index} style={{ marginBottom: Sizes.spacing.md }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Sizes.spacing.sm }}>
                  <View style={{ minWidth: 60 }}>
                    <Text style={{ fontWeight: '600', fontSize: Sizes.typography.sm }}>
                      {day.day}
                    </Text>
                    <Text style={{ fontSize: Sizes.typography.xs, color: Colors.light.mutedForeground }}>
                      {day.date}
                    </Text>
                  </View>
                  <View style={{ flex: 1, marginLeft: Sizes.spacing.md }}>
                    <View
                      style={{
                        height: 30,
                        backgroundColor: '#ffde68',
                        borderRadius: Sizes.radius.sm,
                        width: `${barWidth}%`,
                        justifyContent: 'center',
                        paddingLeft: Sizes.spacing.sm,
                      }}
                    >
                      <Text style={{ color: 'black', fontWeight: '600', fontSize: Sizes.typography.xs }}>
                        ₱{day.sales.toLocaleString()}
                      </Text>
                    </View>
                  </View>
                  <View style={{ minWidth: 60, alignItems: 'flex-end' }}>
                    <Text style={{ fontSize: Sizes.typography.sm, fontWeight: '600' }}>
                      {day.orders}
                    </Text>
                    <Text style={{ color: Colors.light.mutedForeground, fontSize: Sizes.typography.xs }}>
                      {day.orders === 1 ? 'order' : 'orders'}
                    </Text>
                  </View>
                </View>
                {day.trend !== 0 && (
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
                )}
              </View>
            );
          })
        ) : (
          <Text style={{ color: Colors.light.mutedForeground, fontSize: Sizes.typography.sm, textAlign: 'center', marginVertical: Sizes.spacing.lg }}>
            No sales data available for this period
          </Text>
        )}

        {/* Insights */}
        <View style={{ backgroundColor: Colors.light.card, borderRadius: Sizes.radius.md, padding: Sizes.spacing.md, marginTop: Sizes.spacing.lg }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: Sizes.spacing.md, gap: Sizes.spacing.sm }}>
            <TrendingUp size={20} color={Colors.light.primary} />
            <Text style={{ fontSize: Sizes.typography.base, fontWeight: '700' }}>
              Key Insights
            </Text>
          </View>
          <View style={{ gap: Sizes.spacing.sm }}>
            <Text style={{ color: Colors.light.mutedForeground, fontSize: Sizes.typography.sm, lineHeight: 20 }}>
              • Total {selectedPeriod === 'week' ? 'weekly' : 'monthly'} revenue: ₱{totalSales.toLocaleString()}
            </Text>
            <Text style={{ color: Colors.light.mutedForeground, fontSize: Sizes.typography.sm, lineHeight: 20 }}>
              • Average order value: ₱{totalOrders > 0 ? Math.round(totalSales / totalOrders).toLocaleString() : 0}
            </Text>
            {bestDay && (
              <Text style={{ color: Colors.light.mutedForeground, fontSize: Sizes.typography.sm, lineHeight: 20 }}>
                • Best performing day: {bestDay.day} with ₱{bestDay.sales.toLocaleString()} ({bestDay.orders} orders)
              </Text>
            )}
            <Text style={{ color: Colors.light.mutedForeground, fontSize: Sizes.typography.sm, lineHeight: 20 }}>
              • Total transactions: {totalOrders}
            </Text>
          </View>
        </View>
      </ScrollView>

      {/* Floating Download Button */}
      <TouchableOpacity
        onPress={handleDownloadPDF}
        disabled={downloading}
        style={{
          position: 'absolute',
          bottom: Sizes.spacing.lg,
          right: Sizes.spacing.lg,
          backgroundColor: downloading ? Colors.light.muted : '#10B981',
          borderRadius: 50,
          width: 60,
          height: 60,
          justifyContent: 'center',
          alignItems: 'center',
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.25,
          shadowRadius: 3.84,
          elevation: 5
        }}
      >
        <Download size={24} color={downloading ? Colors.light.mutedForeground : '#fff'} />
      </TouchableOpacity>
    </View>
  );
}