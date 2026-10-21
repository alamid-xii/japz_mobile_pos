import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

const titles: Record<string, string> = {
    '': 'Welcome', login: 'Login', register: 'Create account', 'forgot-password': 'Forgot password',
    'reset-password': 'Reset password', 'role-selection': 'Select your role', dashboard: 'Dashboard',
    employees: 'Users', menu: 'Menu', sales: 'Sales', 'discounts-vouchers': 'Promotions', feedback: 'Feedback',
    pos: 'Point of sale', orders: 'Active orders', history: 'Order history', payment: 'Checkout',
    'cash-payment': 'Payment', receipt: 'Receipt', menuboard: 'Menu board', incoming: 'Incoming orders',
    completed: 'Completed orders', waste: 'Kitchen waste', profile: 'My account', settings: 'Settings',
    overview: 'Inventory overview', supplies: 'Ingredients & packaging', receiving: 'Receiving',
    prepared: 'Prepared stock', counts: 'Stock counts', losses: 'Waste & returns', suppliers: 'Suppliers',
    movements: 'Movement history', reports: 'Reports', guide: 'Inventory guide',
};
export default function RouteAnnouncement() {
    const { pathname } = useLocation();
    useEffect(() => {
        const section = pathname.split('/').filter(Boolean).at(-1) || '';
        document.title = `${titles[section] || 'Page not found'} · JAPZ POS`;
    }, [pathname]);
    return null;
}
