import { useRouter } from 'expo-router';
import { LogOut, User } from 'lucide-react-native';
import { useCallback } from 'react';
import { ScrollView, Text, TouchableOpacity, View, Alert } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { BackHandler } from 'react-native';
import { Colors, Sizes } from '../../constants/colors';
import { useAuth } from '../../hooks/useAuth';

export default function ProfileScreen() {
  const { user, logout } = useAuth();
  const router = useRouter();

  const handleLogout = async () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        {
          text: 'Cancel',
          onPress: () => {},
          style: 'cancel',
        },
        {
          text: 'Logout',
          onPress: async () => {
            await logout();
            router.replace('/auth/login');
          },
          style: 'destructive',
        },
      ]
    );
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
        paddingHorizontal: Sizes.spacing.md,
        paddingVertical: Sizes.spacing.sm,
        paddingTop: Sizes.spacing.sm + 30,
        backgroundColor: Colors.light.background,
        borderBottomWidth: 0.5,
        borderBottomColor: Colors.light.border,
      }}>
        <Text style={{
          fontSize: Sizes.typography['2xl'],
          fontWeight: '700',
          color: Colors.light.foreground,
        }}>
          Profile
        </Text>
        <TouchableOpacity
          onPress={handleLogout}
          style={{
            padding: Sizes.spacing.sm,
            borderRadius: Sizes.radius.sm,
            backgroundColor: Colors.light.muted,
          }}
        >
          <LogOut size={20} color="#EF4444" />
        </TouchableOpacity>
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
    </View>
  );
}