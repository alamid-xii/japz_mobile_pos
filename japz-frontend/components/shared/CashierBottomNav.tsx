import { useRouter } from 'expo-router';
import { History, Home, ShoppingCart, User } from 'lucide-react-native';
import { Text, TouchableOpacity, View } from 'react-native';
import { Colors, Sizes } from '../../constants/colors';
import { cashierStyles } from '../../styles/cashierStyles';

interface CashierBottomNavProps {
  currentScreen?: 'pos' | 'orders' | 'history' | 'profile';
}

export function CashierBottomNav({ currentScreen = 'pos' }: CashierBottomNavProps) {
  const router = useRouter();

  const navItems = [
    { id: 'pos', icon: ShoppingCart, route: '/cashier/pos' },
    { id: 'orders', icon: Home, route: '/cashier/active-orders' },
    { id: 'history', icon: History, route: '/cashier/order-history' },
    { id: 'profile', icon: User, route: '/cashier/profile' },
  ];

  return (
    <View style={{
        flexDirection: 'row',
        justifyContent: 'space-around',
        alignItems: 'center',
        backgroundColor: Colors.light.card,
        borderTopWidth: 1,
        borderTopColor: Colors.light.border,
        paddingTop: 5,
        height: 90,
      }}>
      {navItems.map(item => {
        const Icon = item.icon;
        const isActive = currentScreen === item.id;

        return (
          <TouchableOpacity
            key={item.id}
            style={{
              alignItems: 'center',
              justifyContent: 'center',
              paddingVertical: Sizes.spacing.sm,
              backgroundColor: isActive ? '#FFF8DC' : 'transparent',
              borderRadius: 8,
              paddingHorizontal: 12,
            }}
            onPress={() => currentScreen !== item.id && router.replace(item.route as any)}
          >
            <Icon
              size={32}
              color={isActive ? '#FFCE1B' : Colors.light.mutedForeground}
            />
          </TouchableOpacity>
        );
      })}
    </View>
  );
}
