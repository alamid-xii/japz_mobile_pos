import { Outlet } from 'react-router-dom';
import { LayoutDashboard, Package, Truck, ClipboardCheck, Utensils, Boxes, List, ChartNoAxesCombined, Users, Settings, RefreshCw, ArrowLeft, BookOpen, UserCircle, FileText } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import WorkspaceShell, { type NavigationGroup } from '../../components/WorkspaceShell';
import { useInventory, useInventoryBase } from './data';
import { Notice } from './shared';
import InventoryData from './InventoryData';
import './inventory.css';
function Shell() {
  const { user } = useAuth();
  const data = useInventory();
  const base = useInventoryBase();
  const groups: NavigationGroup[] = [
    ...(user?.role === 'admin' ? [{ label: 'Administration', items: [{ path: '/admin/dashboard', label: 'Admin dashboard', icon: ArrowLeft }] }] : []),
    { label: 'Inventory', items: [
      { path: `${base}/overview`, label: 'Overview', icon: LayoutDashboard },
      { path: `${base}/supplies`, label: 'Ingredients & packaging', icon: Package },
      { path: `${base}/receiving`, label: 'Receiving', icon: Truck },
      { path: `${base}/prepared`, label: 'Prepared stock', icon: Boxes },
      { path: `${base}/menu`, label: 'Menu availability', icon: Utensils },
    ] },
    { label: 'Control & records', items: [
      { path: `${base}/counts`, label: 'Stock counts', icon: ClipboardCheck },
      { path: `${base}/losses`, label: 'Waste & returns', icon: List },
      { path: `${base}/suppliers`, label: 'Suppliers', icon: Users },
      { path: `${base}/movements`, label: 'Movement history', icon: List },
      { path: `${base}/reports`, label: 'Reports', icon: ChartNoAxesCombined },
    ] },
    { label: 'My workspace', items: [
      ...(user?.role !== 'admin' ? [{ path: `${base}/payslips`, label: 'My payslips', icon: FileText }] : []),
      { path: `${base}/guide`, label: 'Inventory guide', icon: BookOpen },
      { path: `${base}/profile`, label: 'My account', icon: UserCircle },
      { path: `${base}/settings`, label: 'Settings', icon: Settings },
    ] },
  ];
  return <WorkspaceShell title="Inventory" groups={groups} contentClassName="inv-content" headerActions={<button disabled={data.refreshing} onClick={() => void data.refresh()} aria-label="Refresh inventory"><RefreshCw size={16} /><span>{data.refreshing ? 'Refreshing...' : 'Refresh'}</span></button>}>
    {data.error && <div className="inv-page" style={{ paddingBottom: 0 }}><Notice error>{data.error} <button onClick={() => void data.refresh()}>Retry</button></Notice></div>}
    {data.loading ? <div className="inv-page" role="status">Loading inventory...</div> : <Outlet />}
  </WorkspaceShell>;
}
export default function InventoryLayout() {
  return <InventoryData><Shell /></InventoryData>;
}
