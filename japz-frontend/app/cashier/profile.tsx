import { useRouter } from 'expo-router';
import { LogOut, User } from 'lucide-react-native';
import { useCallback } from 'react';
import { ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { BackHandler } from 'react-native';
import { CashierBottomNav } from '../../components/shared/CashierBottomNav';
import { Colors, Sizes } from '../../constants/colors';
import { useAuth } from '../../hooks/useAuth';

export default function ProfileScreen() {
  const { user, logout } = useAuth();
  const router = useRouter();

  const handleLogout = async () => {
    await logout();
    router.replace('/auth/login');
  };

  // Prevent back navigation
  useFocusEffect(
    useCallback(() => {
      const subscription = BackHandler.addEventListener('hardwareBackPress', () => true);
      return () => subscription.remove();
    }, [])
  );

  return (
    <View style={{ flex: 1 }}>
      {/* Header */}
      <View style={{
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: Sizes.spacing.lg,
        paddingTop: Sizes.spacing.lg + 40,
        backgroundColor: Colors.light.background,
        borderBottomWidth: 1,
        borderBottomColor: Colors.light.border,
      }}>
        <Text style={{
          fontSize: Sizes.typography.xl,
          fontWeight: '700',
          color: Colors.light.foreground,
        }}>
          Profile
        </Text>
      </View>

      <ScrollView
        style={{ flex: 1, backgroundColor: Colors.light.background }}
        contentContainerStyle={{ padding: Sizes.spacing.lg }}
      >
        {/* Profile Card */}
        <View style={{
          backgroundColor: Colors.light.card,
          borderRadius: Sizes.radius.md,
          padding: Sizes.spacing.lg,
          alignItems: 'center',
          marginBottom: Sizes.spacing.lg,
        }}>
          <View style={{
            width: 80,
            height: 80,
            borderRadius: 40,
            backgroundColor: Colors.brand.primary,
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: Sizes.spacing.md,
          }}>
            <User size={40} color="#fff" />
          </View>
          <Text style={{
            fontSize: Sizes.typography.lg,
            fontWeight: '700',
            color: Colors.light.foreground,
            marginBottom: Sizes.spacing.sm,
          }}>
            {user?.name || 'User'}
          </Text>
          <Text style={{
            fontSize: Sizes.typography.base,
            color: Colors.light.mutedForeground,
            marginBottom: Sizes.spacing.xs,
          }}>
            {user?.email || 'user@example.com'}
          </Text>
          <Text style={{
            fontSize: Sizes.typography.sm,
            color: Colors.light.mutedForeground,
            textTransform: 'capitalize',
          }}>
            {user?.role || 'cashier'}
          </Text>
        </View>
      </ScrollView>

      {/* Logout Button */}
      <View style={{
        backgroundColor: Colors.light.background,
        padding: Sizes.spacing.lg,
        borderTopWidth: 1,
        borderTopColor: Colors.light.border,
      }}>
        <TouchableOpacity
          style={{
            backgroundColor: Colors.light.destructive,
            borderRadius: Sizes.radius.md,
            padding: Sizes.spacing.md,
            alignItems: 'center',
            flexDirection: 'row',
            justifyContent: 'center',
            gap: Sizes.spacing.sm,
          }}
          onPress={handleLogout}
        >
          <LogOut size={20} color="#fff" />
          <Text style={{
            color: '#fff',
            fontSize: Sizes.typography.base,
            fontWeight: '600',
          }}>
            Logout
          </Text>
        </TouchableOpacity>
      </View>

      <CashierBottomNav currentScreen="profile" />
    </View>
  );
}