import { useRouter } from 'expo-router';
import { ArrowLeft, Check, X } from 'lucide-react-native';
import { useState, useEffect } from 'react';
import { ScrollView, Text, TextInput, TouchableOpacity, View, Alert, ActivityIndicator } from 'react-native';
import { Colors, Sizes } from '../../constants/colors';
import { employeeAPI, menuCategoryAPI } from '../../services/api';

interface FormData {
  name: string;
  email: string;
  phone: string;
  role: 'cashier' | 'kitchen';
  joinDate: string;
  password: string;
  confirmPassword: string;
  assignedStationId?: number;
  assignedCategories?: number[];
}

interface MenuCategory {
  id: number;
  name: string;
  description: string;
  icon: string;
}

const roles = ['cashier', 'kitchen'];

export default function EmployeeFormScreen() {
  const router = useRouter();
  const [formData, setFormData] = useState<FormData>({
    name: '',
    email: '',
    phone: '',
    role: 'cashier',
    joinDate: new Date().toISOString().split('T')[0],
    password: '',
    confirmPassword: '',
    assignedStationId: undefined,
    assignedCategories: [],
  });
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
  const [menuCategories, setMenuCategories] = useState<MenuCategory[]>([]);
  const [loading, setLoading] = useState(false);
  const [categoriesLoading, setCategoriesLoading] = useState(true);

  useEffect(() => {
    loadMenuCategories();
  }, []);

  const loadMenuCategories = async () => {
    try {
      setCategoriesLoading(true);
      const response = await menuCategoryAPI.getAll();
      setMenuCategories(response.data);
    } catch (error) {
      console.error('Error loading menu categories:', error);
      Alert.alert('Error', 'Failed to load menu categories');
    } finally {
      setCategoriesLoading(false);
    }
  };

  const handleInputChange = (field: keyof FormData, value: string | number) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  const toggleCategory = (categoryId: number) => {
    setFormData(prev => {
      const categories = prev.assignedCategories || [];
      const isSelected = categories.includes(categoryId);
      
      return {
        ...prev,
        assignedCategories: isSelected
          ? categories.filter(id => id !== categoryId)
          : [...categories, categoryId],
      };
    });
  };

  const handleSubmit = async () => {
    if (!formData.name || !formData.email || !formData.phone || !formData.password || !formData.confirmPassword) {
      Alert.alert('Validation Error', 'Please fill in all required fields');
      return;
    }

    if (formData.role === 'kitchen' && (!formData.assignedCategories || formData.assignedCategories.length === 0)) {
      Alert.alert('Validation Error', 'Please assign at least one menu category');
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      Alert.alert('Password Mismatch', 'Passwords do not match');
      return;
    }

    if (formData.password.length < 6) {
      Alert.alert('Weak Password', 'Password must be at least 6 characters long');
      return;
    }

    try {
      setLoading(true);
      await employeeAPI.create({
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        password: formData.password,
        role: formData.role,
        assignedStationId: formData.assignedStationId,
        assignedCategories: formData.assignedCategories,
        joinDate: formData.joinDate,
      });

      Alert.alert('Success', `Employee ${formData.name} has been added`, [
        {
          text: 'OK',
          onPress: () => router.push('/admin/employees'),
        },
      ]);
    } catch (error: any) {
      const errorMessage = error.response?.data?.error || 'Failed to create employee';
      Alert.alert('Error', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: Colors.light.background, marginTop: Sizes.spacing.lg }}>
      {/* Header */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          paddingHorizontal: Sizes.spacing.lg,
          paddingVertical: Sizes.spacing.md,
          backgroundColor: Colors.light.card,
          borderBottomWidth: 1,
          borderBottomColor: Colors.light.border,
        }}
      >
        <TouchableOpacity onPress={() => router.push('/admin/employees')} style={{ marginRight: Sizes.spacing.md }}>
          <ArrowLeft size={24} color='#000000' />
        </TouchableOpacity>
        <Text style={{ fontSize: Sizes.typography.lg, fontWeight: '700', color: Colors.light.foreground }}>
          Add Employee
        </Text>
      </View>

      <ScrollView
        contentContainerStyle={{
          padding: Sizes.spacing.lg,
          paddingBottom: Sizes.spacing.xl,
        }}
      >
        {/* Name Field */}
        <View style={{ marginBottom: Sizes.spacing.lg }}>
          <Text style={{ fontSize: Sizes.typography.sm, fontWeight: '600', marginBottom: Sizes.spacing.sm, color: Colors.light.foreground }}>
            Full Name *
          </Text>
          <TextInput
            style={{
              borderWidth: 1,
              borderColor: Colors.light.border,
              borderRadius: 8,
              paddingHorizontal: Sizes.spacing.md,
              paddingVertical: Sizes.spacing.sm,
              fontSize: Sizes.typography.base,
              color: Colors.light.foreground,
            }}
            placeholder="Enter employee name"
            placeholderTextColor={Colors.light.mutedForeground}
            value={formData.name}
            onChangeText={(value) => handleInputChange('name', value)}
          />
        </View>

        {/* Email Field */}
        <View style={{ marginBottom: Sizes.spacing.lg }}>
          <Text style={{ fontSize: Sizes.typography.sm, fontWeight: '600', marginBottom: Sizes.spacing.sm, color: Colors.light.foreground }}>
            Email Address *
          </Text>
          <TextInput
            style={{
              borderWidth: 1,
              borderColor: Colors.light.border,
              borderRadius: 8,
              paddingHorizontal: Sizes.spacing.md,
              paddingVertical: Sizes.spacing.sm,
              fontSize: Sizes.typography.base,
              color: Colors.light.foreground,
            }}
            placeholder="Enter email address"
            placeholderTextColor={Colors.light.mutedForeground}
            keyboardType="email-address"
            value={formData.email}
            onChangeText={(value) => handleInputChange('email', value)}
          />
        </View>

        {/* Phone Field */}
        <View style={{ marginBottom: Sizes.spacing.lg }}>
          <Text style={{ fontSize: Sizes.typography.sm, fontWeight: '600', marginBottom: Sizes.spacing.sm, color: Colors.light.foreground }}>
            Phone Number *
          </Text>
          <TextInput
            style={{
              borderWidth: 1,
              borderColor: Colors.light.border,
              borderRadius: 8,
              paddingHorizontal: Sizes.spacing.md,
              paddingVertical: Sizes.spacing.sm,
              fontSize: Sizes.typography.base,
              color: Colors.light.foreground,
            }}
            placeholder="Enter phone number"
            placeholderTextColor={Colors.light.mutedForeground}
            keyboardType="phone-pad"
            value={formData.phone}
            onChangeText={(value) => handleInputChange('phone', value)}
          />
        </View>

        {/* Role Selection */}
        <View style={{ marginBottom: Sizes.spacing.lg }}>
          <Text style={{ fontSize: Sizes.typography.sm, fontWeight: '600', marginBottom: Sizes.spacing.sm, color: Colors.light.foreground }}>
            Role *
          </Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: Sizes.spacing.sm }}>
            {roles.map((role) => (
              <TouchableOpacity
                key={role}
                style={{
                  paddingHorizontal: Sizes.spacing.md,
                  paddingVertical: Sizes.spacing.sm,
                  borderRadius: 20,
                  backgroundColor: formData.role === role ? '#FFCE1B' : Colors.light.card,
                  borderWidth: 1,
                  borderColor: formData.role === role ? '#FFCE1B' : Colors.light.border,
                }}
                onPress={() => {
                  handleInputChange('role', role as any);
                  if (role !== 'kitchen') {
                    setFormData(prev => ({ ...prev, assignedCategories: [] }));
                  }
                }}
              >
                <Text
                  style={{
                    fontSize: Sizes.typography.sm,
                    fontWeight: '500',
                    color: formData.role === role ? '#030213' : Colors.light.foreground,
                    textTransform: 'capitalize',
                  }}
                >
                  {role}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Menu Category Selection - Only show if kitchen role is selected */}
        {formData.role === 'kitchen' && (
          <View style={{ marginBottom: Sizes.spacing.lg }}>
            <Text style={{ fontSize: Sizes.typography.sm, fontWeight: '600', marginBottom: Sizes.spacing.sm, color: Colors.light.foreground }}>
              Assign Menu Categories *
            </Text>
            {categoriesLoading ? (
              <ActivityIndicator size="large" color={Colors.light.primary} />
            ) : (
              <>
                <TouchableOpacity
                  style={{
                    borderWidth: 1,
                    borderColor: Colors.light.border,
                    borderRadius: 8,
                    paddingHorizontal: Sizes.spacing.md,
                    paddingVertical: Sizes.spacing.md,
                    backgroundColor: Colors.light.card,
                  }}
                  onPress={() => setShowCategoryDropdown(!showCategoryDropdown)}
                >
                  <Text style={{ fontSize: Sizes.typography.base, color: formData.assignedCategories && formData.assignedCategories.length > 0 ? Colors.light.foreground : Colors.light.mutedForeground }}>
                    {formData.assignedCategories && formData.assignedCategories.length > 0
                      ? `${formData.assignedCategories.length} ${formData.assignedCategories.length === 1 ? 'category' : 'categories'} selected`
                      : 'Select categories'}
                  </Text>
                </TouchableOpacity>

                {/* Selected Categories Display */}
                {formData.assignedCategories && formData.assignedCategories.length > 0 && (
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: Sizes.spacing.xs, marginTop: Sizes.spacing.sm }}>
                    {formData.assignedCategories.map((categoryId) => {
                      const category = menuCategories.find(c => c.id === categoryId);
                      return category ? (
                        <View
                          key={categoryId}
                          style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            backgroundColor: '#FFF8DC',
                            paddingVertical: 6,
                            paddingHorizontal: 12,
                            borderRadius: 16,
                            gap: 6,
                          }}
                        >
                          <Text style={{ fontSize: Sizes.typography.sm, color: '#030213' }}>{category.name}</Text>
                          <TouchableOpacity onPress={() => toggleCategory(categoryId)}>
                            <X size={14} color="#666" />
                          </TouchableOpacity>
                        </View>
                      ) : null;
                    })}
                  </View>
                )}

                {showCategoryDropdown && (
                  <View style={{
                    borderWidth: 1,
                    borderColor: Colors.light.border,
                    borderRadius: 8,
                    marginTop: Sizes.spacing.sm,
                    backgroundColor: Colors.light.card,
                    overflow: 'hidden',
                  }}>
                    {menuCategories.map((category) => {
                      const isSelected = formData.assignedCategories?.includes(category.id) || false;
                      return (
                        <TouchableOpacity
                          key={category.id}
                          style={{
                            paddingHorizontal: Sizes.spacing.md,
                            paddingVertical: Sizes.spacing.md,
                            borderBottomWidth: 1,
                            borderBottomColor: Colors.light.border,
                            backgroundColor: isSelected ? '#FFF8DC' : 'transparent',
                            flexDirection: 'row',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                          }}
                          onPress={() => toggleCategory(category.id)}
                        >
                          <View style={{ flex: 1 }}>
                            <Text style={{ fontSize: Sizes.typography.base, color: Colors.light.foreground, fontWeight: isSelected ? '600' : '400' }}>
                              {category.name}
                            </Text>
                            {category.description && (
                              <Text style={{ fontSize: Sizes.typography.xs, color: Colors.light.mutedForeground }}>
                                {category.description}
                              </Text>
                            )}
                          </View>
                          {isSelected && (
                            <View
                              style={{
                                width: 20,
                                height: 20,
                                borderRadius: 10,
                                backgroundColor: '#FFCE1B',
                                justifyContent: 'center',
                                alignItems: 'center',
                              }}
                            >
                              <Check size={14} color="#030213" />
                            </View>
                          )}
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                )}
              </>
            )}
          </View>
        )}

        {/* Join Date Field */}
        <View style={{ marginBottom: Sizes.spacing.lg }}>
          <Text style={{ fontSize: Sizes.typography.sm, fontWeight: '600', marginBottom: Sizes.spacing.sm, color: Colors.light.foreground }}>
            Join Date
          </Text>
          <TextInput
            style={{
              borderWidth: 1,
              borderColor: Colors.light.border,
              borderRadius: 8,
              paddingHorizontal: Sizes.spacing.md,
              paddingVertical: Sizes.spacing.sm,
              fontSize: Sizes.typography.base,
              color: Colors.light.foreground,
            }}
            placeholder="YYYY-MM-DD"
            placeholderTextColor={Colors.light.mutedForeground}
            value={formData.joinDate}
            onChangeText={(value) => handleInputChange('joinDate', value)}
          />
        </View>

        {/* Password Field */}
        <View style={{ marginBottom: Sizes.spacing.lg }}>
          <Text style={{ fontSize: Sizes.typography.sm, fontWeight: '600', marginBottom: Sizes.spacing.sm, color: Colors.light.foreground }}>
            Password *
          </Text>
          <TextInput
            style={{
              borderWidth: 1,
              borderColor: Colors.light.border,
              borderRadius: 8,
              paddingHorizontal: Sizes.spacing.md,
              paddingVertical: Sizes.spacing.sm,
              fontSize: Sizes.typography.base,
              color: Colors.light.foreground,
            }}
            placeholder="Enter password"
            placeholderTextColor={Colors.light.mutedForeground}
            secureTextEntry={true}
            value={formData.password}
            onChangeText={(value) => handleInputChange('password', value)}
          />
        </View>

        {/* Confirm Password Field */}
        <View style={{ marginBottom: Sizes.spacing.lg }}>
          <Text style={{ fontSize: Sizes.typography.sm, fontWeight: '600', marginBottom: Sizes.spacing.sm, color: Colors.light.foreground }}>
            Confirm Password *
          </Text>
          <TextInput
            style={{
              borderWidth: 1,
              borderColor: Colors.light.border,
              borderRadius: 8,
              paddingHorizontal: Sizes.spacing.md,
              paddingVertical: Sizes.spacing.sm,
              fontSize: Sizes.typography.base,
              color: Colors.light.foreground,
            }}
            placeholder="Confirm password"
            placeholderTextColor={Colors.light.mutedForeground}
            secureTextEntry={true}
            value={formData.confirmPassword}
            onChangeText={(value) => handleInputChange('confirmPassword', value)}
          />
        </View>
      </ScrollView>

      {/* Submit Button */}
      <View
        style={{
          paddingHorizontal: Sizes.spacing.lg,
          paddingBottom: Sizes.spacing.lg,
          backgroundColor: Colors.light.background,
          borderTopWidth: 1,
          borderTopColor: Colors.light.border,
        }}
      >
        <TouchableOpacity
          style={{
            backgroundColor: '#FFCE1B',
            paddingVertical: Sizes.spacing.md,
            borderRadius: 8,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: Sizes.spacing.sm,
            opacity: loading ? 0.6 : 1,
          }}
          onPress={handleSubmit}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator size="small" color="#030213" />
          ) : (
            <>
              <Check size={20} color="#030213" />
              <Text style={{ fontSize: Sizes.typography.base, fontWeight: '600', color: '#030213' }}>
                Add Employee
              </Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}
