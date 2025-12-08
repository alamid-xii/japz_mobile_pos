import { LogOut, User, Home, CheckSquare } from 'lucide-react-native';
import { useCallback, useState, useEffect } from 'react';
import { Alert, ScrollView, Text, TouchableOpacity, View, ActivityIndicator } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import { BackHandler } from 'react-native';
import { Colors, Sizes } from '../../constants/colors';
import { useAuth } from '../../hooks/useAuth';
import { menuCategoryAPI } from '../../services/api';
import { kitchenStyles } from '../../styles/kitchenStyles';

interface Category {
  id: number;
  name: string;
}

export default function ProfileScreen() {
  const router = useRouter();
  const { logout, user } = useAuth();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        setLoading(true);
        const response = await menuCategoryAPI.getAll();
        setCategories(response.data || []);
      } catch (error) {
        console.error('Error fetching categories:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchCategories();
  }, []);

  const getAssignedCategoryNames = () => {
    if (!user?.assignedCategories || user.assignedCategories.length === 0) {
      return [];
    }
    
    return user.assignedCategories
      .map(categoryId => {
        const numericId = typeof categoryId === 'number' ? categoryId : parseInt(categoryId);
        const category = categories.find(cat => cat.id === numericId);
        return category?.name || `Category ${categoryId}`;
      })
      .filter(Boolean);
  };

  // Prevent back navigation
  useFocusEffect(
    useCallback(() => {
      const subscription = BackHandler.addEventListener('hardwareBackPress', () => true);
      return () => subscription.remove();
    }, [])
  );

  const handleLogout = () => {
    Alert.alert(
      'Logout Confirmation',
      'Are you sure you want to logout?',
      [
        {
          text: 'Cancel',
          onPress: () => {},
          style: 'cancel',
        },
        {
          text: 'Logout',
          onPress: () => {
            logout();
            router.replace('/auth/login');
          },
          style: 'destructive',
        },
      ]
    );
  };

  return (
    <View style={kitchenStyles.container}>
      {/* Header */}
      <View style={kitchenStyles.header}>
        <View>
          <Text style={kitchenStyles.title}>Profile</Text>
        </View>
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
            {user?.name || 'Kitchen Staff'}
          </Text>
          <Text style={{
            fontSize: Sizes.typography.base,
            color: Colors.light.mutedForeground,
            marginBottom: Sizes.spacing.xs,
          }}>
            {user?.email || 'kitchen@japz.com'}
          </Text>
          <Text style={{
            fontSize: Sizes.typography.sm,
            color: Colors.light.mutedForeground,
            textTransform: 'capitalize',
          }}>
            {user?.role || 'Kitchen Staff'}
          </Text>
        </View>

        {/* Info Card */}
        {(user?.assignedCategories && user.assignedCategories.length > 0) && (
          <View style={{
            backgroundColor: Colors.light.card,
            borderRadius: Sizes.radius.md,
            padding: Sizes.spacing.lg,
            marginBottom: Sizes.spacing.lg,
          }}>
            <Text style={{
              fontSize: Sizes.typography.base,
              fontWeight: '600',
              color: Colors.light.foreground,
              marginBottom: Sizes.spacing.md,
            }}>
              Assigned Categories
            </Text>
            {loading ? (
              <ActivityIndicator size="small" color={Colors.brand.primary} />
            ) : (
              <Text style={{
                fontSize: Sizes.typography.base,
                color: Colors.light.mutedForeground,
              }}>
                {getAssignedCategoryNames().join(', ')}
              </Text>
            )}
          </View>
        )}
      </ScrollView>
    </View>
  );
}
