// app/(admin)/employees.tsx
import { useRouter, useFocusEffect } from 'expo-router';
import { ChevronDown, ChevronRight, Truck, UserCheck, Users, UtensilsCrossed, Trash2 } from 'lucide-react-native';
import { useState, useCallback } from 'react';
import { ScrollView, Text, TextInput, TouchableOpacity, View, ActivityIndicator, Alert } from 'react-native';
import { Colors, Sizes } from '../../constants/colors';
import { employeeAPI } from '../../services/api';

interface Employee {
  id: number;
  name: string;
  email: string;
  phone: string;
  role: 'cashier' | 'kitchen';
  status: 'active' | 'inactive';
  joinDate: string;
  station?: {
    id: number;
    name: string;
    category: string;
  };
}

const getRoleIcon = (role: string) => {
  const iconProps = { size: 20, color: Colors.light.primary };
  switch (role) {
    case 'cashier': return <Users {...iconProps} />;
    case 'kitchen': return <UtensilsCrossed {...iconProps} />;
    default: return null;
  }
};

export default function EmployeesScreen() {
  const router = useRouter();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [expanded, setExpanded] = useState<number | null>(null);
  const [filterRole, setFilterRole] = useState<'all' | 'cashier' | 'kitchen'>('all');

  const loadEmployees = async () => {
    try {
      setLoading(true);
      const response = await employeeAPI.getAll();
      setEmployees(response.data);
    } catch (error) {
      console.error('Error loading employees:', error);
      Alert.alert('Error', 'Failed to load employees');
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadEmployees();
    }, [])
  );

  const filteredEmployees = employees.filter(emp => {
    const matchSearch = emp.name.toLowerCase().includes(search.toLowerCase()) || emp.email.toLowerCase().includes(search.toLowerCase());
    const matchRole = filterRole === 'all' || emp.role === filterRole;
    return matchSearch && matchRole;
  });

  const toggleExpand = (id: number) => {
    setExpanded(expanded === id ? null : id);
  };

  const handleDelete = (id: number, name: string) => {
    Alert.alert(
      'Delete Employee',
      `Are you sure you want to delete ${name}?`,
      [
        { text: 'Cancel', onPress: () => {}, style: 'cancel' },
        {
          text: 'Delete',
          onPress: async () => {
            try {
              await employeeAPI.delete(id);
              setEmployees(employees.filter(emp => emp.id !== id));
              Alert.alert('Success', 'Employee deleted successfully');
            } catch (error: any) {
              Alert.alert('Error', error.response?.data?.error || 'Failed to delete employee');
            }
          },
          style: 'destructive',
        },
      ]
    );
  };

  const handleStatusToggle = async (id: number, currentStatus: string) => {
    try {
      const newStatus = currentStatus === 'active' ? 'inactive' : 'active';
      const response = await employeeAPI.update(id, { status: newStatus });
      setEmployees(
        employees.map(emp =>
          emp.id === id ? { ...emp, status: newStatus as 'active' | 'inactive' } : emp
        )
      );
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.error || 'Failed to update employee status');
    }
  };

  return (
    <View style={{ flex: 1, marginTop: Sizes.spacing.lg }}>
      <ScrollView
        style={{ flex: 1, backgroundColor: Colors.light.background }}
        contentContainerStyle={{ padding: Sizes.spacing.lg }}
      >
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Sizes.spacing.lg }}>
          <Text style={{ fontSize: Sizes.typography.xl, fontWeight: '700' }}>
            Employee Management
          </Text>
          <TouchableOpacity
            style={{
              backgroundColor: '#FFCE1B',
              width: 40,
              height: 40,
              borderRadius: 20,
              alignItems: 'center',
              justifyContent: 'center',
            }}
            onPress={() => router.push('/admin/employee-form')}
          >
            <Text style={{ fontSize: 24, fontWeight: '700', color: '#fff'}}>
              +
            </Text>
          </TouchableOpacity>
        </View>

        {/* Search */}
        <TextInput
          style={{
            borderWidth: 1,
            borderColor: Colors.light.border,
            borderRadius: Sizes.radius.md,
            padding: Sizes.spacing.md,
            color: Colors.light.foreground,
            marginBottom: Sizes.spacing.md,
            fontSize: Sizes.typography.base,
          }}
          placeholder="Search by name or email..."
          placeholderTextColor={Colors.light.mutedForeground}
          value={search}
          onChangeText={setSearch}
        />

        {/* Role Filter */}
        <View style={{ flexDirection: 'row', gap: Sizes.spacing.sm, marginBottom: Sizes.spacing.lg }}>
          {(['all', 'cashier', 'kitchen'] as const).map((role) => (
            <TouchableOpacity
              key={role}
              style={{
                paddingVertical: Sizes.spacing.sm,
                paddingHorizontal: Sizes.spacing.md,
                borderRadius: Sizes.radius.sm,
                backgroundColor: filterRole === role ? '#FFCE1B' : Colors.light.card,
                borderWidth: 1,
                borderColor: filterRole === role ? '#FFCE1B' : Colors.light.border,
              }}
              onPress={() => setFilterRole(role as 'all' | 'cashier' | 'kitchen')}
            >
              <Text
                style={{
                  color: filterRole === role ? '#030213' : Colors.light.foreground,
                  fontWeight: '600',
                  fontSize: Sizes.typography.xs,
                  textTransform: 'capitalize',
                }}
              >
                {role}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Employee List */}
        {filteredEmployees.length > 0 ? (
          filteredEmployees.map((employee) => (
            <TouchableOpacity
              key={employee.id}
              style={{
                backgroundColor: Colors.light.card,
                borderRadius: Sizes.radius.md,
                padding: Sizes.spacing.md,
                marginBottom: Sizes.spacing.md,
                borderLeftWidth: 4,
                borderLeftColor: employee.status === 'active' ? Colors.light.primary : Colors.light.muted,
              }}
              onPress={() => toggleExpand(employee.id)}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: Sizes.spacing.md, marginBottom: Sizes.spacing.sm }}>
                <View style={{ width: 28 }}>
                  {getRoleIcon(employee.role)}
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: Sizes.typography.base, fontWeight: '700' }}>
                    {employee.name}
                  </Text>
                  <Text style={{ color: Colors.light.mutedForeground, fontSize: Sizes.typography.sm }}>
                    {employee.email}
                  </Text>
                </View>
                <View
                  style={{
                    paddingHorizontal: Sizes.spacing.sm,
                    paddingVertical: 4,
                    borderRadius: Sizes.radius.sm,
                    backgroundColor: employee.status === 'active' ? '#DCFCE7' : Colors.light.muted,
                  }}
                >
                  <Text
                    style={{
                      color: employee.status === 'active' ? '#15803D' : Colors.light.mutedForeground,
                      fontSize: Sizes.typography.xs,
                      fontWeight: '600',
                      textTransform: 'capitalize',
                    }}
                  >
                    {employee.status}
                  </Text>
                </View>
              </View>

              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text style={{ color: Colors.light.mutedForeground, fontSize: Sizes.typography.sm }}>
                  Joined {employee.joinDate}
                </Text>
                {expanded === employee.id ? <ChevronDown size={18} color={Colors.light.primary} /> : <ChevronRight size={18} color={Colors.light.primary} />}
              </View>

              {expanded === employee.id && (
                <View style={{ marginTop: Sizes.spacing.md, paddingTop: Sizes.spacing.md, borderTopWidth: 1, borderTopColor: Colors.light.border }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: Sizes.spacing.md }}>
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: Colors.light.mutedForeground, fontSize: Sizes.typography.xs, marginBottom: 4 }}>
                        Role
                      </Text>
                      <Text style={{ fontWeight: '600', textTransform: 'capitalize' }}>
                        {employee.role}
                      </Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: Colors.light.mutedForeground, fontSize: Sizes.typography.xs, marginBottom: 4 }}>
                        Status
                      </Text>
                      <Text style={{ fontWeight: '600', textTransform: 'capitalize' }}>
                        {employee.status}
                      </Text>
                    </View>
                  </View>

                  <TouchableOpacity
                    style={{
                      backgroundColor: employee.status === 'active' ? '#FEE2E2' : '#DCFCE7',
                      paddingVertical: Sizes.spacing.sm,
                      paddingHorizontal: Sizes.spacing.md,
                      borderRadius: Sizes.radius.sm,
                      marginBottom: Sizes.spacing.sm,
                    }}
                    onPress={() => handleStatusToggle(employee.id, employee.status)}
                  >
                    <Text
                      style={{
                        textAlign: 'center',
                        color: employee.status === 'active' ? '#991B1B' : '#15803D',
                        fontWeight: '600',
                        fontSize: Sizes.typography.sm,
                      }}
                    >
                      {employee.status === 'active' ? 'Deactivate' : 'Activate'}
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={{
                      backgroundColor: '#FEE2E2',
                      paddingVertical: Sizes.spacing.sm,
                      paddingHorizontal: Sizes.spacing.md,
                      borderRadius: Sizes.radius.sm,
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: Sizes.spacing.sm,
                    }}
                    onPress={() => handleDelete(employee.id, employee.name)}
                  >
                    <Trash2 size={16} color="#991B1B" />
                    <Text
                      style={{
                        textAlign: 'center',
                        color: '#991B1B',
                        fontWeight: '600',
                        fontSize: Sizes.typography.sm,
                      }}
                    >
                      Delete
                    </Text>
                  </TouchableOpacity>
                </View>
              )}
            </TouchableOpacity>
          ))
        ) : loading ? (
          <ActivityIndicator size="large" color={Colors.light.primary} style={{ marginVertical: Sizes.spacing.xl }} />
        ) : (
          <View style={{ alignItems: 'center', paddingVertical: Sizes.spacing.xl }}>
            <Text style={{ color: Colors.light.mutedForeground, fontSize: Sizes.typography.base }}>
              No employees found
            </Text>
          </View>
        )}

        {/* Add Employee Button */}
        
      </ScrollView>
    </View>
  );
}