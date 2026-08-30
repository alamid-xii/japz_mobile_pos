import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { Home, UtensilsCrossed, ShoppingBag, Receipt, User, Clock, Bell } from 'lucide-react';
import { StorefrontProvider, useStorefront } from './StorefrontContext';
import MiniCart from './components/MiniCart';
import Toast from './components/Toast';
import SkeletonCard from './components/SkeletonCard';
import NotificationPanel from './components/NotificationPanel';
import FloatingCart from './components/FloatingCart';
import { CustomerAuthProvider, useCustomerAuth } from './CustomerAuthContext';

/** The storefront is mounted at /japz (canonical) and /order (legacy QR codes). */
export const useStorefrontBase = () => {
    const { pathname } = useLocation();
    return pathname.startsWith('/japz') ? '/japz' : '/order';
};

/** "22:00:00" -> "10:00 PM" */
const to12h = (t: string) => {
    const [h, m] = t.split(':').map(Number);
    const suffix = h >= 12 ? 'PM' : 'AM';
    const hour = h % 12 === 0 ? 12 : h % 12;
    return `${hour}:${String(m).padStart(2, '0')} ${suffix}`;
};

const TABS = [
    { to: '', label: 'Home', icon: Home, end: true },
    { to: '/menu', label: 'Menu', icon: UtensilsCrossed, end: false },
    { to: '/cart', label: 'Cart', icon: ShoppingBag, end: false },
    { to: '/track', label: 'Orders', icon: Receipt, end: false },
    { to: '/profile', label: 'Profile', icon: User, end: false },
];

function Shell() {
    const base = useStorefrontBase();
    const navigate = useNavigate();
    const { pathname } = useLocation();
    const { cartCount, cartTotal, tableNumber, shopOpen, hours, loading, toast } = useStorefront();
    const { customer, unreadCount, notifications, markNotificationsRead } = useCustomerAuth();
    const [bellOpen, setBellOpen] = useState(false);

    const onCartPage = pathname.endsWith('/cart');

    if (loading) {
        return (
            <div className="h-full bg-gray-50 flex flex-col overflow-hidden">
                <header className="shrink-0 h-14 bg-white border-b border-gray-100 flex items-center px-4">
                    <span className="font-extrabold text-xl text-slate-900 tracking-tight">
                        JAPZ<span className="text-brand">.</span>
                    </span>
                </header>
                <div className="flex-1 overflow-y-auto px-4 py-4">
                    <div className="max-w-5xl mx-auto">
                        <div className="h-32 bg-white rounded-3xl animate-pulse mb-6 border border-gray-100" />
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                            {Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)}
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        // index.css locks html/body/#root to overflow:hidden for the staff kiosk
        // layouts, so the storefront fills that locked viewport and scrolls inside
        // <main>. overflow-x-hidden guarantees no sideways page scroll.
        <div className="h-full bg-gray-50 flex flex-col overflow-hidden">
            {/* ---------- Top bar ----------
                On desktop this carries the full navigation and the cart; on
                mobile it stays minimal and the bottom bar does the navigating. */}
            <header className="shrink-0 bg-white border-b border-gray-100">
                <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between gap-3">
                    <button onClick={() => navigate(base)} className="font-extrabold text-xl text-slate-900 tracking-tight shrink-0">
                        JAPZ<span className="text-brand">.</span>
                    </button>

                    {/* Desktop-only inline navigation. */}
                    <nav className="hidden md:flex items-center gap-1 flex-1 justify-center">
                        {TABS.filter(t => t.label !== 'Cart').map(({ to, label, icon: Icon, end }) => (
                            <NavLink
                                key={label}
                                to={`${base}${to}`}
                                end={end}
                                className={({ isActive }) =>
                                    `flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold transition duration-150 ${
                                        isActive ? "bg-brand text-slate-900" : "text-slate-500 hover:bg-gray-100"
                                    }`
                                }
                            >
                                <Icon size={17} />
                                {label}
                            </NavLink>
                        ))}
                    </nav>

                    <div className="flex items-center gap-2 shrink-0">
                        {/* Desktop cart lives here because the bottom bar is hidden. */}
                        <NavLink
                            to={`${base}/cart`}
                            aria-label={`Cart${cartCount ? `, ${cartCount} items` : ''}`}
                            className={({ isActive }) =>
                                `hidden md:flex relative items-center gap-2 px-4 py-2 rounded-full text-sm font-bold transition duration-150 ${
                                    isActive ? "bg-brand text-slate-900" : "text-slate-500 hover:bg-gray-100"
                                }`
                            }
                        >
                            <ShoppingBag size={17} />
                            Cart
                            {cartCount > 0 && (
                                <span className="min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center">
                                    {cartCount > 9 ? '9+' : cartCount}
                                </span>
                            )}
                        </NavLink>

                        {customer && (
                            <button
                                onClick={() => setBellOpen(v => !v)}
                                aria-label={`Notifications${unreadCount ? `, ${unreadCount} unread` : ''}`}
                                className="relative w-9 h-9 rounded-full hover:bg-gray-100 flex items-center justify-center transition duration-150"
                            >
                                <Bell size={19} className="text-gray-700" />
                                {unreadCount > 0 && (
                                    <span className="absolute top-1 right-1 min-w-[16px] h-4 px-1 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center ring-2 ring-white">
                                        {unreadCount > 9 ? '9+' : unreadCount}
                                    </span>
                                )}
                            </button>
                        )}
                        {tableNumber && (
                            <span className="text-xs font-bold bg-brand text-gray-900 rounded-full px-3 py-1.5">
                                Table {tableNumber}
                            </span>
                        )}
                        {/* Always visible, so a customer knows the shop's state
                            before they build a cart rather than at checkout. */}
                        {hours.openTime && hours.closeTime && (
                            <span
                                className={`hidden sm:flex items-center gap-1.5 text-[11px] font-bold rounded-full px-3 py-1.5 ${
                                    shopOpen ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-slate-500'
                                }`}
                            >
                                <span className={`w-1.5 h-1.5 rounded-full ${shopOpen ? 'bg-green-500' : 'bg-slate-400'}`} />
                                {shopOpen ? 'Open' : 'Closed'} · {to12h(hours.openTime)} – {to12h(hours.closeTime)}
                            </span>
                        )}
                        {/* Compact form for narrow phones. */}
                        {hours.openTime && (
                            <span
                                className={`sm:hidden flex items-center gap-1 text-[11px] font-bold rounded-full px-2.5 py-1.5 ${
                                    shopOpen ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-slate-500'
                                }`}
                            >
                                <Clock size={12} />
                                {shopOpen ? 'Open' : 'Closed'}
                            </span>
                        )}
                    </div>
                </div>
            </header>

            {/* ---------- The one scrolling region ---------- */}
            <main className="flex-1 overflow-y-auto overflow-x-hidden overscroll-contain">
                <Outlet />
            </main>

            {toast && <Toast message={toast} />}

            {bellOpen && (
                <NotificationPanel
                    notifications={notifications}
                    onClose={() => setBellOpen(false)}
                    onOpenOrder={(num) => navigate(`${base}/track/${num}`)}
                    onMarkRead={markNotificationsRead}
                />
            )}

            {/* Desktop floating summary; mobile keeps the bar above the tabs. */}
            {!onCartPage && (
                <FloatingCart count={cartCount} total={cartTotal} onView={() => navigate(`${base}/cart`)} />
            )}

            {/* ---------- Mini cart + bottom navigation ----------
                Mobile only. On desktop the top bar already carries the tabs and
                the cart, so a second bar at the bottom would just be clutter. */}
            <div className="shrink-0 md:hidden">
                {!onCartPage && (
                    <MiniCart count={cartCount} total={cartTotal} onView={() => navigate(`${base}/cart`)} />
                )}

                <nav className="bg-white border-t border-gray-100 pb-[env(safe-area-inset-bottom)]">
                    <div className="max-w-5xl mx-auto grid grid-cols-5">
                        {TABS.map(({ to, label, icon: Icon, end }) => (
                            <NavLink
                                key={label}
                                to={`${base}${to}`}
                                end={end}
                                className={({ isActive }) =>
                                    `relative flex flex-col items-center justify-center gap-1 py-2.5 text-[11px] font-semibold transition duration-150 ${
                                        isActive ? 'text-gray-900' : 'text-gray-400'
                                    }`
                                }
                            >
                                {({ isActive }) => (
                                    <>
                                        <span className={`relative flex items-center justify-center w-12 h-7 rounded-full transition duration-150 ${
                                            isActive ? 'bg-brand' : ''
                                        }`}>
                                            <Icon size={19} />
                                            {label === 'Cart' && cartCount > 0 && (
                                                <span
                                                    key={cartCount}
                                                    className="absolute -top-1 right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center ring-2 ring-white animate-[slideDown_200ms_ease-out]"
                                                >
                                                    {cartCount > 9 ? '9+' : cartCount}
                                                </span>
                                            )}
                                        </span>
                                        {label}
                                    </>
                                )}
                            </NavLink>
                        ))}
                    </div>
                </nav>
            </div>
        </div>
    );
}

export default function StorefrontLayout() {
    return (
        <CustomerAuthProvider>
            <StorefrontProvider>
                <Shell />
            </StorefrontProvider>
        </CustomerAuthProvider>
    );
}
