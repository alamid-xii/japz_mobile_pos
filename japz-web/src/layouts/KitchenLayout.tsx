import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useEffect } from 'react';
import { ClipboardList, CheckSquare, User, Clock, FileText } from 'lucide-react';

export default function KitchenLayout() {
    const { user, isInitialized } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();

    useEffect(() => {
        if (isInitialized && (!user || user.role !== 'kitchen')) {
            navigate('/login', { replace: true });
        }
    }, [user, isInitialized, navigate]);

    if (!isInitialized || !user || user.role !== 'kitchen') {
        return <div className="spinner" />;
    }

    const tabs = [
        { path: '/kitchen/incoming', icon: ClipboardList, label: 'Incoming' },
        { path: '/kitchen/completed', icon: CheckSquare, label: 'Completed' },
        { path: '/kitchen/attendance', icon: Clock, label: 'Clock In' },
        { path: '/kitchen/payslips', icon: FileText, label: 'Payslips' },
        { path: '/kitchen/profile', icon: User, label: 'Profile' },
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
                        <div className="text-[10px] text-gray-400 font-medium">Kitchen Display</div>
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
                            {user?.name?.charAt(0)?.toUpperCase() || 'K'}
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
                <div className="flex-1 overflow-y-auto bg-gray-50">
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
