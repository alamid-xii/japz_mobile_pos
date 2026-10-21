import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useEffect, useState } from 'react';
import { ShoppingCart, ClipboardList, History, BookOpen, UserCircle, ChevronsLeft, ChevronsRight } from 'lucide-react';

export default function CashierLayout() {
    const { user, isInitialized } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const [collapsed, setCollapsed] = useState(() => {
        const saved = localStorage.getItem('cashier-sidebar-collapsed');
        return saved === 'true';
    });

    useEffect(() => {
        if (isInitialized && (!user || user.role !== 'cashier')) {
            navigate('/login', { replace: true });
        }
    }, [user, isInitialized, navigate]);

    if (!isInitialized || !user || user.role !== 'cashier') {
        return <div className="spinner" role="status" aria-label="Loading content" />;
    }

    const toggleCollapsed = () => {
        setCollapsed(prev => {
            const next = !prev;
            localStorage.setItem('cashier-sidebar-collapsed', String(next));
            return next;
        });
    };

    const hideTabBar = ['/cashier/payment', '/cashier/cash-payment', '/cashier/receipt'].some(p =>
        location.pathname.startsWith(p)
    );

    const tabs = [
        { path: '/cashier/pos', icon: ShoppingCart, label: 'POS' },
        { path: '/cashier/orders', icon: ClipboardList, label: 'Orders' },
        { path: '/cashier/history', icon: History, label: 'History' },
        { path: '/cashier/menuboard', icon: BookOpen, label: 'Menu' },
        { path: '/cashier/profile', icon: UserCircle, label: 'Profile' },
    ];

    const isActive = (path: string) => location.pathname === path;

    return (
        <div className="app-workspace flex h-full overflow-hidden"><a className="skip-link" href="#main-content">Skip to content</a>
            {/* Desktop Sidebar */}
            {!hideTabBar && (
                <aside
                    className="hidden md:flex flex-col bg-white border-r border-gray-200 shrink-0 relative"
                    style={{
                        width: collapsed ? '64px' : '224px',
                        transition: 'width 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                    }}
                >
                    {/* Logo / Brand */}
                    <div className="flex items-center gap-2.5 py-4 border-b border-gray-100"
                        style={{
                            paddingLeft: collapsed ? '14px' : '20px',
                            paddingRight: collapsed ? '14px' : '20px',
                            justifyContent: collapsed ? 'center' : 'flex-start',
                            transition: 'padding 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                        }}
                    >
                        <img src="/logo.jpg" alt="JAPZ" className="w-9 h-9 rounded-lg shrink-0" />
                        <div style={{
                            overflow: 'hidden',
                            whiteSpace: 'nowrap',
                            opacity: collapsed ? 0 : 1,
                            width: collapsed ? 0 : 'auto',
                            transition: 'opacity 0.2s ease, width 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                        }}>
                            <div className="font-bold text-sm text-gray-900 leading-tight">JAPZ POS</div>
                            <div className="text-[10px] text-gray-400 font-medium">Cashier</div>
                        </div>
                    </div>

                    {/* Nav links */}
                    <nav aria-label="Workspace navigation" className="flex-1 flex flex-col gap-0.5 py-3 overflow-y-auto"
                        style={{
                            paddingLeft: collapsed ? '8px' : '12px',
                            paddingRight: collapsed ? '8px' : '12px',
                            transition: 'padding 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                        }}
                    >
                        {tabs.map(({ path, icon: Icon, label }) => (
                            <NavLink
                                key={path}
                                to={path} aria-label={label}
                                title={collapsed ? label : undefined}
                                className={`flex items-center gap-3 py-2.5 rounded-lg text-[13px] font-medium transition-all border-none cursor-pointer font-[inherit] w-full ${isActive(path)
                                    ? 'bg-brand text-brand-dark font-semibold '
                                    : 'bg-transparent text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                                    }`}
                                style={{
                                    paddingLeft: collapsed ? '0' : '12px',
                                    paddingRight: collapsed ? '0' : '12px',
                                    justifyContent: collapsed ? 'center' : 'flex-start',
                                    transition: 'padding 0.25s cubic-bezier(0.4, 0, 0.2, 1), justify-content 0.25s',
                                }}
                            >
                                <Icon size={18} className={`shrink-0 ${isActive(path) ? 'text-brand-dark' : 'text-gray-400'}`} />
                                <span style={{
                                    overflow: 'hidden',
                                    whiteSpace: 'nowrap',
                                    opacity: collapsed ? 0 : 1,
                                    width: collapsed ? 0 : 'auto',
                                    transition: 'opacity 0.2s ease, width 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                                }}>
                                    {label}
                                </span>
                            </NavLink>
                        ))}
                    </nav>

                    {/* Collapse Toggle Button */}
                    <div className="px-3 py-2 border-t border-gray-100">
                        <button
                            onClick={toggleCollapsed}
                            className="flex items-center gap-2 w-full rounded-lg py-2 text-[12px] font-medium text-gray-400 hover:bg-gray-50 hover:text-gray-600 transition-all border-none cursor-pointer bg-transparent font-[inherit]"
                            style={{
                                paddingLeft: collapsed ? '0' : '12px',
                                paddingRight: collapsed ? '0' : '12px',
                                justifyContent: collapsed ? 'center' : 'flex-start',
                                transition: 'padding 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                            }}
                            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
                        >
                            {collapsed
                                ? <ChevronsRight size={18} className="shrink-0" />
                                : <ChevronsLeft size={18} className="shrink-0" />
                            }
                            <span style={{
                                overflow: 'hidden',
                                whiteSpace: 'nowrap',
                                opacity: collapsed ? 0 : 1,
                                width: collapsed ? 0 : 'auto',
                                transition: 'opacity 0.2s ease, width 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                            }}>
                                Collapse
                            </span>
                        </button>
                    </div>

                    {/* User info at bottom */}
                    <div className="py-3 border-t border-gray-100"
                        style={{
                            paddingLeft: collapsed ? '12px' : '16px',
                            paddingRight: collapsed ? '12px' : '16px',
                            transition: 'padding 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                        }}
                    >
                        <div className="flex items-center gap-2.5"
                            style={{ justifyContent: collapsed ? 'center' : 'flex-start' }}
                        >
                            <div className="w-8 h-8 rounded-full bg-brand flex items-center justify-center text-brand-dark font-bold text-xs shrink-0">
                                {user?.name?.charAt(0)?.toUpperCase() || 'C'}
                            </div>
                            <div style={{
                                overflow: 'hidden',
                                whiteSpace: 'nowrap',
                                opacity: collapsed ? 0 : 1,
                                width: collapsed ? 0 : 'auto',
                                minWidth: 0,
                                transition: 'opacity 0.2s ease, width 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                            }}>
                                <div className="text-xs font-semibold text-gray-900 truncate">{user?.name}</div>
                                <div className="text-[10px] text-gray-400 truncate">{user?.email}</div>
                            </div>
                        </div>
                    </div>
                </aside>
            )}

            {/* Main content */}
            <div className="flex-1 flex flex-col overflow-hidden min-w-0">
                <main id="main-content" tabIndex={-1} className="app-main">
                    <Outlet />
                </main>

                {/* Mobile Bottom Nav */}
                {!hideTabBar && (
                    <nav aria-label="Workspace navigation" className="md:hidden flex items-center justify-around bg-white border-t border-gray-200 py-1.5 pb-[max(6px,env(safe-area-inset-bottom))] shrink-0">
                        {tabs.map(({ path, icon: Icon, label }) => (
                            <NavLink key={path} to={path} aria-label={label} title={label}
                                className={`flex flex-col items-center justify-center gap-0.5 px-1.5 py-1.5 rounded-lg transition-colors text-[10px] font-medium border-none cursor-pointer font-[inherit] bg-transparent ${isActive(path)
                                    ? 'text-brand-dark'
                                    : 'text-gray-400'
                                    }`}>
                                <div className={`p-1 rounded-md ${isActive(path) ? 'bg-brand' : ''}`}>
                                    <Icon size={20} />
                                </div>
                                <span>{label}</span>
                            </NavLink>
                        ))}
                    </nav>
                )}
            </div>
        </div>
    );
}

