import { Outlet } from 'react-router-dom';
import { CalendarCheck, Banknote, Clock3, SlidersHorizontal, PieChart, UserCheck, LayoutDashboard, Users, Package, Warehouse, MessageCircle, BarChart3, Settings, Ticket } from 'lucide-react';
import WorkspaceShell, { type NavigationGroup } from '../components/WorkspaceShell';
import '../features/inventory/inventory.css';
const groups: NavigationGroup[] = [
  { label: 'Overview', items: [{ path: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard }] },
  { label: 'Restaurant', items: [
    { path: '/admin/menu', label: 'Menu management', icon: Package },
    { path: '/admin/inventory', label: 'Inventory', icon: Warehouse },
    { path: '/admin/reservations', label: 'Reservations', icon: CalendarCheck },
    { path: '/admin/sales', label: 'Sales & analytics', icon: BarChart3 },
    { path: '/admin/discounts-vouchers', label: 'Promotions', icon: Ticket },
    { path: '/admin/feedback', label: 'Customer feedback', icon: MessageCircle },
  ] },
  { label: 'People & payroll', items: [
    { path: '/admin/employees', label: 'Users & employees', icon: Users },
    { path: '/admin/attendance', label: 'Attendance', icon: Clock3 },
    { path: '/admin/payroll', label: 'Payroll periods', icon: Banknote },
    { path: '/admin/payroll-staff', label: 'Staff pay rates', icon: UserCheck },
    { path: '/admin/payroll-reports', label: 'Payroll reports', icon: PieChart },
    { path: '/admin/payroll-settings', label: 'Payroll settings', icon: SlidersHorizontal },
  ] },
  { label: 'Administration', items: [{ path: '/admin/settings', label: 'System settings', icon: Settings }] },
];
export default function AdminLayout() {
  return <WorkspaceShell title="Admin" groups={groups} contentClassName="inv-content"><Outlet /></WorkspaceShell>;
}
