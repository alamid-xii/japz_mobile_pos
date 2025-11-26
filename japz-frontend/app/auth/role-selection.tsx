// app/(auth)/role-selection.tsx
import { useRouter } from 'expo-router';
import { Image, Text, TouchableOpacity, View } from 'react-native';
import { authStyles } from '../../styles/authStyles';

export default function RoleSelectionScreen() {
  const router = useRouter();

  const handleRoleSelect = (role: string) => {
    router.push({
      pathname: '/auth/login' as any,
      params: { selectedRole: role }
    });
  };

  return (
    <View style={authStyles.container}>
      <View style={authStyles.content}>
        <Image
          source={require('../../assets/images/logo.jpg')}
          style={[authStyles.logo, { alignSelf: 'center' }] as any}
          resizeMode="contain"
        />

        <Text style={authStyles.title}>Select Your Role</Text>

        <View style={authStyles.roleButtons}>
          <TouchableOpacity
            style={authStyles.roleButton}
            onPress={() => handleRoleSelect('admin')}
          >
            <Text style={authStyles.roleButtonText}>Admin</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={authStyles.roleButton}
            onPress={() => handleRoleSelect('cashier')}
          >
            <Text style={authStyles.roleButtonText}>Cashier</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={authStyles.roleButton}
            onPress={() => handleRoleSelect('kitchen')}
          >
            <Text style={authStyles.roleButtonText}>Kitchen Staff</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}
