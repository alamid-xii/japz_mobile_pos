import { useRouter } from 'expo-router';
import { AlertCircle, CheckCircle, Clock } from 'lucide-react-native';
import { Text, TouchableOpacity, View } from 'react-native';
import { Colors, Sizes } from '../../constants/colors';

interface KitchenBottomNavProps {
  currentScreen?: 'display' | 'pending' | 'completed';
}

export function KitchenBottomNav({ currentScreen = 'display' }: KitchenBottomNavProps) {
  const router = useRouter();

  const navItems = [
    { id: 'display', icon: AlertCircle, label: 'Display', route: '/kitchen/display' },
    { id: 'pending', icon: Clock, label: 'Pending', route: '/kitchen/display' },
    { id: 'completed', icon: CheckCircle, label: 'Completed', route: '/kitchen/display' },
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
