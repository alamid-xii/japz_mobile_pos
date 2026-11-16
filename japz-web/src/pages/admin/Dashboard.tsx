import { useState, useEffect } from 'react';
import { TrendingUp, Package, Users, BarChart3 } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { ordersAPI, usersAPI, logsAPI } from '../../services/api';
import { DashboardCharts } from '../../components/admin';

interface DashboardStats {
    monthlyRevenue: number; monthlyOrders: number; activeEmployees: number;
    todaysSales: number; monthlyTrend: number; ordersTrend: number;
}
interface ActivityLog { id: number; action: string; userName: string; description: string; createdAt: string; }

const getTimeAgo = (dateString: string): string => {
    const seconds = Math.floor((Date.now() - new Date(dateString).getTime()) / 1000);
    if (seconds < 60) return 'just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
    return new Date(dateString).toLocaleDateString();
};

export default function Dashboard() {
    const { user } = useAuth();
    const [stats, setStats] = useState<DashboardStats | null>(null);
    const [activities, setActivities] = useState<ActivityLog[]>([]);
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState('');

    useEffect(() => { fetchDashboardData(); }, []);

    const fetchDashboardData = async () => {
        try {
            setLoading(true);
            setLoadError('');
            const [ordersRes, usersRes, logsRes] = await Promise.all([
                ordersAPI.getAll(), usersAPI.getApproved(), logsAPI.getAll({ limit: 10, offset: 0 }),
            ]);
            const orders = (ordersRes.data || []).filter((order: { status: string }) => order.status !== 'cancelled');
            const employees = usersRes.data || [];
            // Filter out admin users - count approved operational staff, including Inventory
            const activeStaff = employees.filter((emp: any) => emp.role !== 'admin');
            const logs = logsRes.data?.logs || (Array.isArray(logsRes.data) ? logsRes.data : []);
            setActivities(logs);

            const today = new Date();
            const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
            const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
            const lastMonthStart = new Date(today.getFullYear(), today.getMonth() - 1, 1);
            const lastMonthEnd = new Date(today.getFullYear(), today.getMonth(), 1);

            const todayOrders = orders.filter((o: any) => new Date(o.createdAt) >= todayStart);
            const monthOrders = orders.filter((o: any) => new Date(o.createdAt) >= monthStart);
            const lastMonthOrders = orders.filter((o: any) => { const d = new Date(o.createdAt); return d >= lastMonthStart && d < lastMonthEnd; });

            const todaysSales = todayOrders.reduce((s: number, o: any) => s + (parseFloat(o.total) || 0), 0);
            const monthlyRevenue = monthOrders.reduce((s: number, o: any) => s + (parseFloat(o.total) || 0), 0);
            const lastMonthRevenue = lastMonthOrders.reduce((s: number, o: any) => s + (parseFloat(o.total) || 0), 0);

            setStats({
                monthlyRevenue: Math.round(monthlyRevenue), monthlyOrders: monthOrders.length,
                activeEmployees: activeStaff.length, todaysSales: Math.round(todaysSales),
                monthlyTrend: lastMonthRevenue > 0 ? Math.round(((monthlyRevenue - lastMonthRevenue) / lastMonthRevenue) * 100) : 0,
                ordersTrend: lastMonthOrders.length > 0 ? Math.round(((monthOrders.length - lastMonthOrders.length) / lastMonthOrders.length) * 100) : 0,
            });
        } catch { setLoadError('Dashboard data could not be loaded. Check your connection and try again.'); }
        finally { setLoading(false); }
    };

    if (loading) return <div className="spinner" role="status" aria-label="Loading content" />;

    const statCards = [
        { label: 'Monthly Revenue', value: `₱${stats?.monthlyRevenue.toLocaleString()}`, trend: `${(stats?.monthlyTrend ?? 0) >= 0 ? '+' : ''}${stats?.monthlyTrend}%`, trendUp: (stats?.monthlyTrend ?? 0) >= 0, icon: TrendingUp },
        { label: 'Monthly Orders', value: stats?.monthlyOrders, trend: `${(stats?.ordersTrend ?? 0) >= 0 ? '+' : ''}${stats?.ordersTrend}%`, trendUp: (stats?.ordersTrend ?? 0) >= 0, icon: Package },
        { label: 'Active Employees', value: stats?.activeEmployees, trend: 'Staff', trendUp: true, icon: Users },
        { label: "Today's Sales", value: `₱${stats?.todaysSales.toLocaleString()}`, trend: 'Today', trendUp: true, icon: BarChart3 },
    ];

    return (
        <div className="app-page">
            {loadError && <div role="alert" className="app-form-error">{loadError} <button className="underline ml-2" onClick={() => void fetchDashboardData()}>Retry</button></div>}
            <div className="">
                <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
                <p className="text-gray-500 text-sm">Sales and staff activity for {user?.name || 'Admin'}.</p>
            </div>

            {stats && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-5">
                    {statCards.map(({ label, value, trend, trendUp, icon: Icon }) => (
                        <div key={label} className={`bg-white rounded-lg p-4 border border-gray-200 flex justify-between items-start`}>
                            <div>
                                <div className="text-xs text-gray-500 mb-1.5">{label}</div>
                                <div className="text-base font-bold mb-1">{value}</div>
                                <div className={`text-[11px] font-semibold ${trendUp ? 'text-gray-600' : 'text-gray-600'}`}>{trend}</div>
                            </div>
                            <Icon size={22} className="text-brand-dark" />
                        </div>
                    ))}
                </div>
            )}

            {/* Charts Section */}
            <div className="mt-4">
                
                <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-4 gap-4">
                    {/* Left: Line Chart (spans 2 columns) */}
                    <div className="lg:col-span-2 xl:col-span-2 min-w-0">
                        <DashboardCharts.LineChartOnly />
                    </div>
                    
                    {/* Middle: Doughnut Chart */}
                    <DashboardCharts.DoughnutChartOnly />
                    
                    {/* Right: Recent Activity */}
                    <div className="bg-white border border-gray-200 rounded-lg p-3.5 overflow-y-auto">
                        <h2 className="text-base font-bold mb-3">Recent Activity</h2>
                        {activities.length > 0 ? (
                            activities.slice(0, 5).map((item, idx) => (
                                <div key={item.id || idx} className="flex items-center gap-3 py-2 border-b border-gray-200 last:border-b-0">
                                    <Package size={16} />
                                    <div>
                                        <h3 className="text-[13px] font-medium">{item.userName} - {item.action.replace(/_/g, ' ').toLowerCase()}</h3>
                                        <p className="text-[11px] text-gray-500 mt-0.5">{getTimeAgo(item.createdAt)}</p>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <p className="text-center text-gray-500 py-4">No recent activity</p>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
