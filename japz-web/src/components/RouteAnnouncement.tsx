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
    attendance: 'Attendance', payslips: 'My payslips', reservations: 'Reservations',
    payroll: 'Payroll periods', 'payroll-staff': 'Staff pay rates', 'payroll-reports': 'Payroll reports',
    'payroll-settings': 'Payroll settings', deliveries: 'My deliveries',
};
const orderingTitles: Record<string,string> = { '':'Online Ordering',menu:'Menu',cart:'Your cart',reserve:'Reservations',auth:'Sign in',profile:'My account',track:'Track order' };
export default function RouteAnnouncement() {
    const { pathname } = useLocation();
    useEffect(() => {
        const parts = pathname.split('/').filter(Boolean);
        if (parts[0] === 'japz' || parts[0] === 'order') {
            const section = parts[1] || '';
            const known = parts.length <= 2 || (section === 'track' && parts.length === 3);
            const title = section === 'pay' && parts[2] === 'return' && parts.length === 3 ? 'Payment' : known ? orderingTitles[section] : undefined;
            document.title = `${title || 'Page not found'} · JAPZ GRILL`;
        } else {
            const section = parts.at(-1) || '';
            const title = parts[0] === 'admin' && parts[1] === 'payroll' && parts.length === 3 ? 'Payroll period' : titles[section];
            document.title = `${title || 'Page not found'} · JAPZ POS`;
        }
    }, [pathname]);
    return null;
}
