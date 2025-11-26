import { useRouter } from 'expo-router';
import { History, Home, ShoppingCart } from 'lucide-react-native';
import { Text, TouchableOpacity, View } from 'react-native';
import { Colors, Sizes } from '../../constants/colors';

interface CashierBottomNavProps {
  currentScreen?: 'pos' | 'orders' | 'history';
}

export function CashierBottomNav({ currentScreen = 'pos' }: CashierBottomNavProps) {
  const router = useRouter();

  const navItems = [
    { id: 'pos', icon: ShoppingCart, label: 'POS', route: '/cashier/pos' },
    { id: 'orders', icon: Home, label: 'Active', route: '/cashier/active-orders' },
    { id: 'history', icon: History, label: 'History', route: '/cashier/order-history' },
  ];

  return (
    <View
      style={{
        flexDirection: 'row',
        backgroundColor: Colors.light.background,
        borderTopWidth: 1,
        borderTopColor: Colors.light.border,
        paddingBottom: 8,
      }}
    >
      {navItems.map(item => {
        const Icon = item.icon;
        const isActive = currentScreen === item.id;

        return (
          <TouchableOpacity
            key={item.id}
            style={{
              flex: 1,
              alignItems: 'center',
              paddingVertical: Sizes.spacing.md,
              borderBottomWidth: isActive ? 3 : 0,
              borderBottomColor: isActive ? Colors.light.primary : 'transparent',
            }}
            onPress={() => currentScreen !== item.id && router.replace(item.route as any)}
          >
            <Icon
              size={24}
              color={isActive ? Colors.light.primary : Colors.light.mutedForeground}
            />
            <Text
              style={{
                fontSize: 12,
                marginTop: 4,
                color: isActive ? Colors.light.primary : Colors.light.mutedForeground,
                fontWeight: isActive ? '600' : '400',
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
