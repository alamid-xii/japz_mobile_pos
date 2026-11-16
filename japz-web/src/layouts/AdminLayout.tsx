import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useEffect } from 'react';
import { LayoutDashboard, Users, Package, Warehouse, MessageCircle, BarChart3, Settings, Ticket, CalendarCheck, Banknote, Clock, SlidersHorizontal, PieChart, UserCheck } from 'lucide-react';

export default function AdminLayout() {
    const { user, isInitialized } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();

    useEffect(() => {
        if (isInitialized && (!user || user.role !== 'admin')) {
            navigate('/login', { replace: true });
        }
    }, [user, isInitialized, navigate]);

    if (!isInitialized || !user || user.role !== 'admin') {
        return <div className="spinner" />;
    }

    const tabs = [
        { path: '/admin/dashboard',        icon: LayoutDashboard,   label: 'Dashboard' },
        { path: '/admin/employees',         icon: Users,             label: 'Users' },
        { path: '/admin/menu',              icon: Package,           label: 'Menu' },
        { path: '/admin/stocks',            icon: Warehouse,         label: 'Stocks' },
        { path: '/admin/sales',             icon: BarChart3,         label: 'Sales' },
        { path: '/admin/discounts-vouchers',icon: Ticket,            label: 'Promotions' },
        { path: '/admin/feedback',          icon: MessageCircle,     label: 'Feedback' },
        // ── Payroll Module ────────────────────────────────────────
        { path: '/admin/payroll',           icon: Banknote,          label: 'Payroll' },
        { path: '/admin/payroll-staff',     icon: UserCheck,         label: 'Staff Rates' },
        { path: '/admin/attendance',        icon: Clock,             label: 'Attendance' },
        { path: '/admin/payroll-reports',   icon: PieChart,          label: 'Pay Reports' },
        { path: '/admin/payroll-settings',  icon: SlidersHorizontal, label: 'Pay Config' },
        // ─────────────────────────────────────────────────────────
        { path: '/admin/settings',          icon: Settings,          label: 'Settings' },
        { path: '/admin/reservations', icon: CalendarCheck, label: 'Reservations' },
    ];

    const isActive = (path: string) => location.pathname === path;

    return (
        <div className="flex h-full overflow-hidden">
            {/* Desktop Sidebar */}
            <aside className="hidden md:flex flex-col w-56 bg-white border-r border-gray-200 shrink-0">
                {/* Logo / Brand */}
                <div className="flex items-center gap-2.5 px-5 py-4 border-b border-gray-100">
                    <img src="/logo.jpg" alt="JAPZ" className="w-9 h-9 rounded-lg" />
                    <div>
                        <div className="font-bold text-sm text-gray-900 leading-tight">JAPZ POS</div>
                        <div className="text-[10px] text-gray-400 font-medium">Admin Panel</div>
                    </div>
                </div>

                {/* Nav links */}
                <nav className="flex-1 flex flex-col gap-0.5 px-3 py-3 overflow-y-auto">
                    {tabs.map(({ path, icon: Icon, label }) => (
                        <button key={path} onClick={() => navigate(path)}
                            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-[13px] font-medium transition-all border-none cursor-pointer font-[inherit] w-full text-left ${isActive(path)
                                ? 'bg-brand text-brand-dark font-semibold shadow-sm shadow-yellow-300/30'
                                : 'bg-transparent text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                                }`}>
                            <Icon size={18} className={isActive(path) ? 'text-brand-dark' : 'text-gray-400'} />
                            {label}
                        </button>
                    ))}
                </nav>

                {/* User info at bottom */}
                <div className="px-4 py-3 border-t border-gray-100">
                    <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-brand flex items-center justify-center text-brand-dark font-bold text-xs">
                            {user?.name?.charAt(0)?.toUpperCase() || 'A'}
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="text-xs font-semibold text-gray-900 truncate">{user?.name}</div>
                            <div className="text-[10px] text-gray-400 truncate">{user?.email}</div>
                        </div>
                    </div>
                </div>
            </aside>

            {/* Main content */}
            <div className="flex-1 flex flex-col overflow-hidden min-w-0">
                <div className="flex-1 overflow-y-auto">
                    <Outlet />
                </div>

                {/* Mobile Bottom Nav */}
                <nav className="md:hidden flex items-center justify-around bg-white border-t border-gray-200 py-1.5 pb-[max(6px,env(safe-area-inset-bottom))] shrink-0">
                    {tabs.map(({ path, icon: Icon, label }) => (
                        <button key={path} onClick={() => navigate(path)} title={label}
                            className={`flex flex-col items-center justify-center gap-0.5 px-1.5 py-1.5 rounded-lg transition-colors text-[10px] font-medium border-none cursor-pointer font-[inherit] bg-transparent ${isActive(path)
                                ? 'text-brand-dark'
                                : 'text-gray-400'
                                }`}>
                            <div className={`p-1 rounded-md ${isActive(path) ? 'bg-brand' : ''}`}>
                                <Icon size={20} />
                            </div>
                            <span>{label}</span>
                        </button>
                    ))}
                </nav>
            </div>
        </div>
    );
}
