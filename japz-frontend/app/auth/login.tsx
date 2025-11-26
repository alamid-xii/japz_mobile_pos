import { useRouter } from 'expo-router';
import { Eye, EyeOff } from 'lucide-react-native';
import { useState } from 'react';
import { Alert, Image, KeyboardAvoidingView, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useAuth } from '../../hooks/useAuth';
import { authStyles } from '../../styles/authStyles';

export default function LoginScreen() {
  const router = useRouter();
  const { login, loading } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async () => {
    if (!email || !password) {
      setError('Please enter both email and password');
      return;
    }

    try {
      const result = await login(email, password);
      setError('');
      
      // Redirect based on user role
      if (result?.role === 'cashier') {
        router.replace('/cashier/pos' as any);
      } else if (result?.role === 'kitchen') {
        router.replace('/kitchen/display' as any);
      } else {
        // Default to admin dashboard for admin users
        router.replace('/admin/dashboard' as any);
      }
    } catch (err: any) {
      setError(err.message || 'Login failed');
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

      <Text style={[authStyles.subtitle, { marginTop: -50 }]}>Welcome back to JAPZ MobilePOS</Text>

      {error && (
        <View style={authStyles.demoBox}>
          <Text style={{ color: '#ff4444' }}>{error}</Text>
        </View>
      )}

      <View style={authStyles.form}>
        <View style={authStyles.inputGroup}>
          <Text style={authStyles.label}>Email</Text>
          <TextInput
            style={authStyles.input}
            placeholder="Enter your email"
            placeholderTextColor="#C3C3C3"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
          />
        </View>

        <View style={authStyles.inputGroup}>
          <Text style={authStyles.label}>Password</Text>
          <View style={{ position: 'relative' }}>
            <TextInput
              style={authStyles.input}
              placeholder="Enter your password"
              placeholderTextColor="#C3C3C3"
              value={password}
              onChangeText={setPassword}
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
        </View>

        <TouchableOpacity
          style={[authStyles.primaryButton, loading && authStyles.buttonDisabled]}
          onPress={handleLogin}
          disabled={loading}
        >
          <Text style={authStyles.primaryButtonText}>
            {loading ? 'Logging in...' : 'Login'}
          </Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity style={authStyles.linkButton} onPress={() => router.push('./registration')}>
        <Text>
          Don't have an account? <Text style={[authStyles.linkHighlight, authStyles.linkText]}>Register here</Text>
        </Text>
      </TouchableOpacity>
    </ScrollView>
    </KeyboardAvoidingView>
  );
}