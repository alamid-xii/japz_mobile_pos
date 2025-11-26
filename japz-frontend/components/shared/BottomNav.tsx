import { Home, ShoppingBag, History, Settings, LayoutDashboard, Users, Package } from 'lucide-react';

interface BottomNavProps {
  currentScreen: string;
  onNavigate: (screen: string) => void;
  role: 'admin' | 'cashier' | 'kitchen';
}

export function BottomNav({ currentScreen, onNavigate, role }: BottomNavProps) {
  const getNavItems = () => {
    if (role === 'admin') {
      return [
        { id: 'admin-dashboard', icon: Home, label: 'Home' },
        { id: 'employee-management', icon: Users, label: 'Staff' },
        { id: 'menu-inventory', icon: Package, label: 'Menu' },
        { id: 'system-settings', icon: Settings, label: 'Settings' },
      ];
    }

    if (role === 'cashier') {
      return [
        { id: 'pos-dashboard', icon: Home, label: 'POS' },
        { id: 'active-orders', icon: ShoppingBag, label: 'Orders' },
        { id: 'order-history', icon: History, label: 'History' },
      ];
    }

    return [];
  };

  const navItems = getNavItems();

  if (navItems.length === 0) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-[#C3C3C3] safe-area-bottom">
      <div className="flex justify-around items-center h-16 max-w-md mx-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentScreen === item.id;
          
          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className="flex flex-col items-center justify-center flex-1 h-full space-y-1"
            >
              <Icon
                className={`w-6 h-6 ${
                  isActive ? 'text-[#FFCE1B]' : 'text-[#C3C3C3]'
                }`}
              />
              <span
                className={`text-xs ${
                  isActive ? 'text-[#000000]' : 'text-[#C3C3C3]'
                }`}
              >
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
