import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Suspense, useEffect, useState } from 'react';
import { Home, UtensilsCrossed, ShoppingBag, Receipt, User, Bell, CalendarCheck } from 'lucide-react';
import { StorefrontProvider, useStorefront } from './StorefrontContext';
import MiniCart from './components/MiniCart';
import Toast from './components/Toast';
import NotificationPanel from './components/NotificationPanel';
import FloatingCart from './components/FloatingCart';
import { CustomerAuthProvider, useCustomerAuth } from './CustomerAuthContext';
import ThemeToggle from '../../../components/ThemeToggle';
import InstallApp from '../../../components/InstallApp';
import OrderingIntro from '../../../components/OrderingIntro';
import { hasEnteredOrdering, introEnteredKey } from '../../../utils/orderingSession';
import { useStorefrontBase } from './storefrontRouting';
import { registerOrderingWorker } from '../../../pwa';
import '../../../styles/storefront.css';

const time = (value:string) => {
    const [hour, minute] = value.split(':').map(Number);
    return `${hour % 12 || 12}:${String(minute).padStart(2,'0')} ${hour >= 12 ? 'PM' : 'AM'}`;
};
const tabs = [
    { to:'', label:'Home', icon:Home }, { to:'/menu', label:'Menu', icon:UtensilsCrossed },
    { to:'/cart', label:'Cart', icon:ShoppingBag }, { to:'/reserve', label:'Reserve', icon:CalendarCheck },
    { to:'/track', label:'Orders', icon:Receipt }, { to:'/profile', label:'Profile', icon:User },
];
function Shell() {
    const base = useStorefrontBase();
    const navigate = useNavigate();
    const { pathname } = useLocation();
    const { cartCount, cartTotal, tableNumber, shopOpen, hours, loading, loadError, toast } = useStorefront();
    const { customer, unreadCount, notifications, markNotificationsRead } = useCustomerAuth();
    const [bellOpen, setBellOpen] = useState(false);
    const onCartPage = pathname.endsWith('/cart');
    const pageLoading = <div className="storefront-loading" role="status"><img src="/logo.jpg" alt="" width="100" height="100" /><h1>JAPZ GRILL</h1><p>Getting the fresh menu ready…</p></div>;
    return <div className="storefront-shell storefront-enter">
        <a className="skip-link" href="#ordering-content">Skip to menu</a>
        <header className="storefront-header">
            <div className="storefront-topbar">
                <button className="storefront-brand" onClick={() => navigate(base)} aria-label="JAPZ GRILL home"><img src="/logo.jpg" alt="" width="42" height="42" /><span>JAPZ GRILL<small>Burger &amp; Bistro</small></span></button>
                <div className="storefront-context"><span className={`storefront-status ${shopOpen ? 'is-open' : ''}`}>{loading ? 'Checking opening hours' : loadError ? 'Connection unavailable' : shopOpen ? 'Open for orders' : 'Currently closed'}</span>{hours.openTime && hours.closeTime && <span>{time(hours.openTime)} – {time(hours.closeTime)} · PH</span>}{tableNumber && <strong>Table {tableNumber}</strong>}</div>
                <nav className="storefront-desktop-nav" aria-label="Ordering navigation">{tabs.map(({ to,label,icon:Icon }) => <NavLink key={label} to={`${base}${to}`} end={!to}><Icon size={17} />{label}{label === 'Cart' && cartCount > 0 && <b>{cartCount}</b>}</NavLink>)}</nav>
                <div className="storefront-install-slot"><InstallApp /></div>
                <div className="storefront-header-actions"><ThemeToggle />{customer && <button className="storefront-notification" onClick={() => setBellOpen(value => !value)} aria-label={`Notifications${unreadCount ? `, ${unreadCount} unread` : ''}`}><Bell size={20} />{unreadCount > 0 && <b>{unreadCount > 9 ? '9+' : unreadCount}</b>}</button>}</div>
            </div>
        </header>
        <main id="ordering-content" tabIndex={-1} className="storefront-content">
            {loadError && <div className="storefront-connection" role="alert">{loadError}<button onClick={() => location.reload()}>Retry connection</button></div>}
            {loading ? pageLoading : <Suspense fallback={pageLoading}><Outlet /></Suspense>}
        </main>
        {toast && <Toast message={toast} />}
        {bellOpen && <NotificationPanel notifications={notifications} onClose={() => setBellOpen(false)} onOpenOrder={number => navigate(`${base}/track/${number}`)} onMarkRead={markNotificationsRead} />}
        {!onCartPage && <FloatingCart count={cartCount} total={cartTotal} onView={() => navigate(`${base}/cart`)} />}
        <div className="storefront-mobile-footer">{!onCartPage && <MiniCart count={cartCount} total={cartTotal} onView={() => navigate(`${base}/cart`)} />}
            <nav aria-label="Ordering navigation">{tabs.map(({ to,label,icon:Icon }) => <NavLink key={label} to={`${base}${to}`} end={!to}><span><Icon size={20} />{label === 'Cart' && cartCount > 0 && <b>{cartCount > 9 ? '9+' : cartCount}</b>}</span>{label}</NavLink>)}</nav>
        </div>
    </div>;
}
function Experience() {
    const base = useStorefrontBase();
    const location = useLocation();
    const navigate = useNavigate();
    const [entered, setEntered] = useState(hasEnteredOrdering);
    const { shopOpen, hours, loading, loadError } = useStorefront();
    const entry = location.pathname === base || location.pathname === `${base}/` || location.pathname === `${base}/menu`;
    useEffect(() => { registerOrderingWorker(); }, []);
    const enter = () => {
        try { sessionStorage.setItem(introEnteredKey,'yes'); } catch { /* Keep access in memory. */ }
        setEntered(true);
        navigate(`${base}/menu${location.search}`, { replace:true });
    };
    // Payment returns, order tracking and authentication links must open directly.
    return entry && !entered ? <OrderingIntro onEnter={enter} trackPath={`${base}/track`} shopOpen={shopOpen} openingTime={hours.openTime} loading={loading} statusError={loadError} /> : <Shell />;
}
export default function StorefrontLayout() {
    return <CustomerAuthProvider><StorefrontProvider><Experience /></StorefrontProvider></CustomerAuthProvider>;
}
