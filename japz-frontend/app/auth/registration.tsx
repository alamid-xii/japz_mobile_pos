import { useRouter } from 'expo-router';
import { Eye, EyeOff } from 'lucide-react-native';
import { useState } from 'react';
import { Alert, Image, KeyboardAvoidingView, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useAuth } from '../../hooks/useAuth';
import { authStyles } from '../../styles/authStyles';

export default function RegistrationScreen() {
  const router = useRouter();
  const { register, loading } = useAuth();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const handleSubmit = async () => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Name is required';
    }
    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Invalid email format';
    }
    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }
    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    setErrors(newErrors);

    if (Object.keys(newErrors).length === 0) {
      try {
        await register(formData.name, formData.email, formData.password);
        Alert.alert('Success', 'Registration successful! Please log in.');
        router.replace('./login' as any);
      } catch (err: any) {
        Alert.alert('Registration Failed', err.message);
      }
    }
  };

  return (
    <KeyboardAvoidingView
      behavior="padding"
      style={{ flex: 1 }}
    >
      <ScrollView style={authStyles.container} contentContainerStyle={authStyles.content} scrollEnabled keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag">
      <Image
        source={require('../../assets/images/logo.jpg')}
        style={[authStyles.logo, { alignSelf: 'center' }] as any}
        resizeMode="contain"
      />

      <Text style={[authStyles.title, { marginTop: -50 }]}>Create Your Account</Text>
      <Text style={authStyles.subtitle}>Get started with JAPZ MobilePOS</Text>

      <View style={authStyles.form}>
        <View style={authStyles.inputGroup}>
          <Text style={authStyles.label}>Full Name</Text>
          <TextInput
            style={[authStyles.input, errors.name && authStyles.inputError]}
            placeholder="Enter your full name"
            placeholderTextColor="#C3C3C3"
            value={formData.name}
            onChangeText={(text) => setFormData({ ...formData, name: text })}
            autoCapitalize="words"
          />
          {errors.name && <Text style={authStyles.errorText}>{errors.name}</Text>}
        </View>

        <View style={authStyles.inputGroup}>
          <Text style={authStyles.label}>Email Address</Text>
          <TextInput
            style={[authStyles.input, errors.email && authStyles.inputError]}
            placeholder="Enter your email"
            placeholderTextColor="#C3C3C3"
            value={formData.email}
            onChangeText={(text) => setFormData({ ...formData, email: text })}
            keyboardType="email-address"
            autoCapitalize="none"
          />
          {errors.email && <Text style={authStyles.errorText}>{errors.email}</Text>}
        </View>

        <View style={authStyles.inputGroup}>
          <Text style={authStyles.label}>Password</Text>
          <View style={{ position: 'relative' }}>
            <TextInput
              style={[authStyles.input, errors.password && authStyles.inputError]}
              placeholder="Enter password"
              placeholderTextColor="#C3C3C3"
              value={formData.password}
              onChangeText={(text) => setFormData({ ...formData, password: text })}
              secureTextEntry={!showPassword}
            />
            <TouchableOpacity
              style={{
                position: 'absolute',
                right: 12,
                top: '50%',
                transform: [{ translateY: -12 }],
              }}
              onPress={() => setShowPassword(!showPassword)}
            >
              {showPassword ? (
                <Eye size={20} color="#666" />
              ) : (
                <EyeOff size={20} color="#666" />
              )}
            </TouchableOpacity>
          </View>
          {errors.password && <Text style={authStyles.errorText}>{errors.password}</Text>}
        </View>

        <View style={authStyles.inputGroup}>
          <Text style={authStyles.label}>Confirm Password</Text>
          <View style={{ position: 'relative' }}>
            <TextInput
              style={[authStyles.input, errors.confirmPassword && authStyles.inputError]}
              placeholder="Confirm password"
              placeholderTextColor="#C3C3C3"
              value={formData.confirmPassword}
              onChangeText={(text) => setFormData({ ...formData, confirmPassword: text })}
              secureTextEntry={!showConfirmPassword}
            />
            <TouchableOpacity
              style={{
                position: 'absolute',
                right: 12,
                top: '50%',
                transform: [{ translateY: -12 }],
              }}
              onPress={() => setShowConfirmPassword(!showConfirmPassword)}
            >
              {showConfirmPassword ? (
                <Eye size={20} color="#666" />
              ) : (
                <EyeOff size={20} color="#666" />
              )}
            </TouchableOpacity>
          </View>
          {errors.confirmPassword && <Text style={authStyles.errorText}>{errors.confirmPassword}</Text>}
        </View>

        <TouchableOpacity
          style={[authStyles.primaryButton, loading && authStyles.buttonDisabled]}
          onPress={handleSubmit}
          disabled={loading}
        >
          <Text style={authStyles.primaryButtonText}>
            {loading ? 'Creating Account...' : 'Create Account'}
          </Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity style={authStyles.linkButton} onPress={() => router.push('./login')}>
        <Text>
          Already have an account? <Text style={[authStyles.linkHighlight, authStyles.linkText]}>Login</Text>
        </Text>
      </TouchableOpacity>
    </ScrollView>
    </KeyboardAvoidingView>
  );
}