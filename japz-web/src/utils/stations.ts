import type { User } from '../hooks/useAuth';

export const stations = {
  admin: { path: '/admin/dashboard', label: 'Admin dashboard' },
  cashier: { path: '/cashier/pos', label: 'Cashier station' },
  kitchen: { path: '/kitchen/incoming', label: 'Kitchen station' },
  inventory: { path: '/inventory/overview', label: 'Inventory station' },
  rider: { path: '/rider/deliveries', label: 'Delivery station' },
} as const;

export const needsClockIn = (user: User | null) => Boolean(user && user.role !== 'admin');
export const loginDestination = (user: User) => needsClockIn(user) ? '/attendance' : stations[user.role].path;
