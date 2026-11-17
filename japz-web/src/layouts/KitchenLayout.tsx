import { Outlet } from 'react-router-dom';
import { Utensils, ClipboardList, CheckSquare, UserCircle, FileText, PackageMinus } from 'lucide-react';
import WorkspaceShell, { type NavigationGroup } from '../components/WorkspaceShell';
import KitchenProvider from '../components/kitchen/KitchenProvider';
const groups: NavigationGroup[] = [
  { label: 'Station', items: [
    { path: '/kitchen/incoming', label: 'Incoming orders', icon: ClipboardList },
    { path: '/kitchen/prep', label: 'Prep board', icon: Utensils },
    { path: '/kitchen/completed', label: 'Completed orders', icon: CheckSquare },
    { path: '/kitchen/waste', label: 'Waste reports', icon: PackageMinus },
  ] },
  { label: 'My work', items: [
    { path: '/kitchen/payslips', label: 'My payslips', icon: FileText },
    { path: '/kitchen/profile', label: 'My account', icon: UserCircle },
  ] },
];
export default function KitchenLayout() {
  return <KitchenProvider><WorkspaceShell title="Kitchen" groups={groups}><Outlet /></WorkspaceShell></KitchenProvider>;
}
