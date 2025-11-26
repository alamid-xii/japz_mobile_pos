import { useRouter } from 'expo-router';
import { LayoutDashboard, MessageCircle, Package, Settings, TrendingUp, Users } from 'lucide-react-native';
import { Text, TouchableOpacity, View } from 'react-native';
import { Colors, Sizes } from '../../constants/colors';

interface AdminBottomNavProps {
  currentScreen: string;
}

export function AdminBottomNav({ currentScreen }: AdminBottomNavProps) {
  const router = useRouter();

  const navItems = [
    { id: 'dashboard', icon: LayoutDashboard, label: 'Dashboard', route: '/admin/dashboard' },
    { id: 'employees', icon: Users, label: 'Employees', route: '/admin/employees' },
    { id: 'menu', icon: Package, label: 'Menu', route: '/admin/menu-inventory' },
    { id: 'feedback', icon: MessageCircle, label: 'Feedback', route: '/admin/feedback-hub' },
    { id: 'sales', icon: TrendingUp, label: 'Sales', route: '/admin/sales-forecast' },
    { id: 'settings', icon: Settings, label: 'Settings', route: '/admin/setings' },
  ];

  const handleNavigate = (route: string, screenId: string) => {
    if (currentScreen !== screenId) {
      router.replace(route as any);
    }
  };

  return (
    <View
      style={{
        flexDirection: 'row',
        justifyContent: 'space-around',
        alignItems: 'center',
        backgroundColor: Colors.light.card,
        borderTopWidth: 1,
        borderTopColor: Colors.light.border,
        paddingVertical: Sizes.spacing.sm,
        paddingBottom: Sizes.spacing.xl
      }}
    >
      {navItems.map((item) => {
        const Icon = item.icon;
        const isActive = currentScreen === item.id;

        return (
          <TouchableOpacity
            key={item.id}
            style={{
              flex: 1,
              alignItems: 'center',
              justifyContent: 'center',
              paddingVertical: Sizes.spacing.sm,
            }}
            onPress={() => handleNavigate(item.route, item.id)}
          >
            <Icon
              size={24}
              color={isActive ? Colors.brand.primary : Colors.light.mutedForeground}
            />
            <Text
              style={{
                fontSize: Sizes.typography.xs,
                color: isActive ? Colors.brand.primary : Colors.light.mutedForeground,
                marginTop: Sizes.spacing.xs,
              }}
            >
              {item.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}
