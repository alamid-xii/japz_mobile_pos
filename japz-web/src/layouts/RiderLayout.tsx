import { Outlet } from 'react-router-dom';
import { Bike, FileText } from 'lucide-react';
import WorkspaceShell, { type NavigationGroup } from '../components/WorkspaceShell';
const groups: NavigationGroup[] = [
  { label: 'Station', items: [{ path: '/rider/deliveries', label: 'My deliveries', icon: Bike }] },
  { label: 'My work', items: [
    { path: '/rider/payslips', label: 'My payslips', icon: FileText },
  ] },
];
export default function RiderLayout() {
  return <WorkspaceShell title="Rider" groups={groups}><Outlet /></WorkspaceShell>;
}
