import { useEffect, useState } from 'react';
import { Outlet } from 'react-router-dom';
import { ShoppingCart, ClipboardList, PackageCheck, History, BookOpen, CalendarCheck, FileText, UserCircle } from 'lucide-react';
import WorkspaceShell, { type NavigationGroup } from '../components/WorkspaceShell';
import { workflowAPI } from '../services/api';

interface ReadyOrderNotification {
  allReady: boolean;
  status?: string;
  delivery: unknown;
}

const groups: NavigationGroup[] = [
  { label: 'Station', items: [
    { path: '/cashier/pos', label: 'Point of sale', icon: ShoppingCart },
    { path: '/cashier/orders', label: 'Active orders', icon: ClipboardList },
    { path: '/cashier/ready', label: 'Ready for pickup', icon: PackageCheck },
    { path: '/cashier/reservations', label: 'Table reservations', icon: CalendarCheck },
  ] },
  { label: 'Records', items: [
    { path: '/cashier/history', label: 'Order history', icon: History },
    { path: '/cashier/menuboard', label: 'Menu board', icon: BookOpen },
  ] },
  { label: 'My work', items: [
    { path: '/cashier/payslips', label: 'My payslips', icon: FileText },
    { path: '/cashier/profile', label: 'My account', icon: UserCircle },
  ] },
];
export default function CashierLayout() {
  const [readyCount, setReadyCount] = useState<number | null>(null);

  useEffect(() => {
    let active = true;
    let pending = false;
    let refreshAgain = false;
    const refresh = async () => {
      if (!active) return;
      if (pending) { refreshAgain = true; return; }
      pending = true;
      try {
        const { data } = await workflowAPI.readyOrders();
        if (active && Array.isArray(data.orders)) {
          // Assigned deliveries stay "ready" until the rider starts the trip.
          // Any delivery record means the cashier has already assigned it.
          setReadyCount(data.orders.filter((order: ReadyOrderNotification) =>
            order.allReady === true && !order.delivery && (!order.status || order.status === 'ready')
          ).length);
        }
      } catch {
        // Keep the last known count through a transient connection failure.
      } finally {
        pending = false;
        if (active && refreshAgain) { refreshAgain = false; void refresh(); }
      }
    };
    const visible = () => { if (document.visibilityState === 'visible') void refresh(); };
    void refresh();
    const interval = window.setInterval(() => void refresh(), 5000);
    window.addEventListener('focus', refresh);
    window.addEventListener('online', refresh);
    window.addEventListener('japz:workflow-changed', refresh);
    document.addEventListener('visibilitychange', visible);
    return () => {
      active = false;
      window.clearInterval(interval);
      window.removeEventListener('focus', refresh);
      window.removeEventListener('online', refresh);
      window.removeEventListener('japz:workflow-changed', refresh);
      document.removeEventListener('visibilitychange', visible);
    };
  }, []);

  const navigation = groups.map(group => ({
    ...group,
    items: group.items.map(item => item.path === '/cashier/ready' ? {
      ...item,
      notification: {
        count: readyCount ?? 0,
        description: readyCount === null ? '' : readyCount === 0
          ? 'No ready orders awaiting handover.'
          : `${readyCount} ready ${readyCount === 1 ? 'order' : 'orders'} awaiting handover.`,
      },
    } : item),
  }));
  return <WorkspaceShell title="Cashier" groups={navigation}><Outlet /></WorkspaceShell>;
}
