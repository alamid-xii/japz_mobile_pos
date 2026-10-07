import React, { useState, useEffect } from 'react';
import { TrendingUp } from 'lucide-react';
import { salesAPI } from '../../services/api';

interface DashboardChartsProps {
  salesData?: {
    labels: string[];
    values: number[];
  };
  paymentMethodData?: {
    labels: string[];
    values: number[];
  };
}

interface SalesAnalyticsData {
  period: string;
  dailyData: { date: string; dayLabel: string; revenue: number; orders: number; items: number }[];
  topItems: { name: string; quantity: number; revenue: number }[];
}

// Custom SVG Line Chart
const LineChart: React.FC<{
  data: { labels: string[]; values: number[] };
  title: string;
  color?: string;
  onPeriodChange?: (period: 'today' | 'week' | 'month' | 'year') => void;
  selectedPeriod?: 'today' | 'week' | 'month' | 'year' | string;
  loading?: boolean;
}> = ({ data, title, color = '#fbbf24', onPeriodChange, selectedPeriod = 'month', loading = false }) => {
  const padding = 20;
  const width = 800;
  const height = 400;
  const chartWidth = width - padding * 2;
  const chartHeight = height - padding * 2;

  const maxValue = data.values.length > 0 ? Math.max(...data.values) : 100;
  const minValue = 0;

  const points = data.values.map((value, idx) => {
    const x = padding + (idx / (data.values.length - 1 || 1)) * chartWidth;
    const y = padding + chartHeight - ((value - minValue) / (maxValue - minValue || 1)) * chartHeight;
    return { x, y, value };
  });

  const pathD = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
  const fillPath = points.length > 0 ? `${pathD} L ${points[points.length - 1].x} ${height - padding} L ${padding} ${height - padding} Z` : '';

  const periods: Array<'today' | 'week' | 'month' | 'year'> = ['today', 'week', 'month', 'year'];

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 md:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div className="flex items-center gap-2">
          <TrendingUp size={20} className="text-yellow-500" />
          <h3 className="text-lg font-semibold">{title}</h3>
        </div>
        {onPeriodChange && (
          <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
            {periods.map((period) => (
              <button
                key={period}
                onClick={() => onPeriodChange(period as 'today' | 'week' | 'month' | 'year')}
                disabled={loading}
                className={`px-3 py-1 text-xs font-medium rounded capitalize transition-colors disabled:opacity-50 ${selectedPeriod === period
                    ? 'bg-yellow-500 text-white'
                    : 'bg-transparent text-gray-600 hover:text-gray-900'
                  }`}
              >
                {period}
              </button>
            ))}
          </div>
        )}
      </div>
      {loading ? (
        <div className="flex items-center justify-center h-80 text-gray-500">
          <div className="animate-spin"></div>
          <span className="ml-2">Loading...</span>
        </div>
      ) : (
        <svg width={width} height={height} className="w-full h-auto" viewBox={`0 0 ${width} ${height}`}>
          {/* Grid lines */}
          {[0, 1, 2, 3, 4].map((i) => (
            <line
              key={`grid-${i}`}
              x1={padding}
              y1={padding + (chartHeight / 4) * i}
              x2={width - padding}
              y2={padding + (chartHeight / 4) * i}
              stroke="#e5e7eb"
              strokeWidth="1"
            />
          ))}

          {/* Axes */}
          <line x1={padding} y1={padding} x2={padding} y2={height - padding} stroke="#374151" strokeWidth="2" />
          <line x1={padding} y1={height - padding} x2={width - padding} y2={height - padding} stroke="#374151" strokeWidth="2" />

          {/* Fill area */}
          {fillPath && <path d={fillPath} fill={`${color}20`} />}

          {/* Line */}
          {pathD && <path d={pathD} fill="none" stroke={color} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />}

          {/* Points */}
          {points.map((p, i) => (
            <circle key={`point-${i}`} cx={p.x} cy={p.y} r="5" fill={color} stroke="white" strokeWidth="2" />
          ))}

          {/* Y-axis labels */}
          {[0, 1, 2, 3, 4].map((i) => (
            <text
              key={`y-label-${i}`}
              x={padding - 10}
              y={padding + (chartHeight / 4) * i + 5}
              textAnchor="end"
              className="text-xs fill-gray-600"
            >
              {Math.round((maxValue / 4) * (4 - i))}
            </text>
          ))}

          {/* X-axis labels */}
          {data.labels.map((label, i) => (
            <text
              key={`x-label-${i}`}
              x={padding + (i / (data.labels.length - 1 || 1)) * chartWidth}
              y={height - padding + 20}
              textAnchor="middle"
              className="text-xs fill-gray-600"
            >
              {label}
            </text>
          ))}
        </svg>
      )}
    </div>
  );
};

// Custom SVG Doughnut Chart
const DoughnutChart: React.FC<{
  data: { labels: string[]; values: number[] };
  title: string;
  colors?: string[];
}> = ({ data, title, colors = ['#22c55e', '#3b82f6', '#fbbf24', '#ec4899'] }) => {
  const total = data.values.reduce((a, b) => a + b, 0);
  const centerX = 150;
  const centerY = 150;
  const outerRadius = 80;
  const innerRadius = 50;

  let currentAngle = -Math.PI / 2;
  const slices = data.values.map((value, idx) => {
    const sliceAngle = (value / total) * 2 * Math.PI;
    const startAngle = currentAngle;
    const endAngle = currentAngle + sliceAngle;

    const x1 = centerX + outerRadius * Math.cos(startAngle);
    const y1 = centerY + outerRadius * Math.sin(startAngle);
    const x2 = centerX + outerRadius * Math.cos(endAngle);
    const y2 = centerY + outerRadius * Math.sin(endAngle);

    const x3 = centerX + innerRadius * Math.cos(endAngle);
    const y3 = centerY + innerRadius * Math.sin(endAngle);
    const x4 = centerX + innerRadius * Math.cos(startAngle);
    const y4 = centerY + innerRadius * Math.sin(startAngle);

    const largeArc = sliceAngle > Math.PI ? 1 : 0;

    const pathData = `
      M ${x1} ${y1}
      A ${outerRadius} ${outerRadius} 0 ${largeArc} 1 ${x2} ${y2}
      L ${x3} ${y3}
      A ${innerRadius} ${innerRadius} 0 ${largeArc} 0 ${x4} ${y4}
      Z
    `;

    const percentage = ((value / total) * 100).toFixed(1);
    currentAngle = endAngle;

    return { pathData, color: colors[idx % colors.length], percentage, label: data.labels[idx] };
  });

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 md:p-6">
      <div className="flex items-center gap-2 mb-6">
        <TrendingUp size={20} className="text-green-500" />
        <h3 className="text-lg font-semibold">{title}</h3>
      </div>
      <div className="flex flex-col items-center gap-4">
        <svg width="180" height="180" viewBox="0 0 300 300" className="w-44 h-44">
          {slices.map((slice, i) => (
            <path key={`slice-${i}`} d={slice.pathData} fill={slice.color} opacity="0.8" stroke="white" strokeWidth="2" />
          ))}
        </svg>
        <div className="flex flex-col gap-2 w-full">
          {slices.map((slice, i) => (
            <div key={`legend-${i}`} className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: slice.color }} />
              <span className="text-xs">{slice.label}: {slice.percentage}%</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

const DashboardCharts: React.FC<DashboardChartsProps> & {
  LineChartOnly: () => React.ReactElement;
  DoughnutChartOnly: () => React.ReactElement;
} = ({
  salesData = {
    labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
    values: [2000, 3000, 2500, 4500, 3800, 5200, 4100],
  },
  paymentMethodData = {
    labels: ['Cash', 'Card', 'Mobile', 'Online'],
    values: [35, 45, 15, 5],
  },
}) => {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:p-6 w-full">
        <LineChart data={salesData} title="Sales Trend" color="#fbbf24" />
        <DoughnutChart data={paymentMethodData} title="Revenue by Payment" />
      </div>
    );
  };

DashboardCharts.LineChartOnly = function LineChartOnly() {
  const [selectedPeriod, setSelectedPeriod] = useState<'today' | 'week' | 'month' | 'year'>('today');
  const [salesData, setSalesData] = useState({ labels: [] as string[], values: [] as number[] });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchSalesData(selectedPeriod);
  }, [selectedPeriod]);

  const fetchSalesData = async (period: 'today' | 'week' | 'month' | 'year') => {
    try {
      setLoading(true);
      const res = await salesAPI.getAnalytics(period);
      const data = res.data as SalesAnalyticsData;

      // Extract daily data
      const dailyData = data.dailyData || [];
      const labels = dailyData.map(d => d.dayLabel);
      const values = dailyData.map(d => Math.round(d.revenue));

      setSalesData({ labels, values });
    } catch (error) {
      console.error('Error fetching sales analytics:', error);
      // Fallback to empty data
      setSalesData({ labels: [], values: [] });
    } finally {
      setLoading(false);
    }
  };

  const displayData = salesData.values.length > 0 ? salesData : {
    labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
    values: [2000, 3000, 2500, 4500, 3800, 5200, 4100],
  };

  return (
    <LineChart
      data={displayData}
      title="Sales Trend"
      color="#fbbf24"
      selectedPeriod={selectedPeriod}
      onPeriodChange={setSelectedPeriod}
      loading={loading}
    />
  );
};

DashboardCharts.DoughnutChartOnly = function DoughnutChartOnly() {
  const [doughnutData, setDoughnutData] = useState({ labels: [] as string[], values: [] as number[] });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchTopSellingItems();
  }, []);

  const fetchTopSellingItems = async () => {
    try {
      setLoading(true);
      const res = await salesAPI.getAnalytics('month');
      const data = res.data as SalesAnalyticsData;

      // Get top 5 items from the same topItems data as Sales page
      const topItems = (data.topItems || [])
        .filter(item => item && item.name && item.name.trim().length > 0) // Validate item names
        .slice(0, 5);

      const labels = topItems.map(item => item.name);
      const values = topItems.map(item => item.quantity || 0);

      setDoughnutData({ labels, values });
    } catch (error) {
      console.error('Error fetching top selling items:', error);
      // Fallback to empty data
      setDoughnutData({ labels: [], values: [] });
    } finally {
      setLoading(false);
    }
  };

  const displayData = doughnutData.values.length > 0 ? doughnutData : {
    labels: [],
    values: [],
  };

  return (
    <div className="relative">
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-white/80 rounded-xl z-10">
          <div className="animate-spin"></div>
          <span className="ml-2">Loading...</span>
        </div>
      )}
      {displayData.labels.length > 0 ? (
        <DoughnutChart data={displayData} title="Top 5 Selling Items" />
      ) : (
        <div className="bg-white border border-gray-200 rounded-lg p-4 md:p-6 flex items-center justify-center h-64 text-gray-500">
          <p>No sales data available</p>
        </div>
      )}
    </div>
  );
};

export default DashboardCharts;
