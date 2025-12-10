import { useRouter } from 'expo-router';
import { Eye, EyeOff, Settings } from 'lucide-react-native';
import { useState } from 'react';
import { Alert, Image, KeyboardAvoidingView, ScrollView, Text, TextInput, TouchableOpacity, View, Modal } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { useAuth } from '../../hooks/useAuth';
import { authStyles } from '../../styles/authStyles';
import { Colors, Sizes } from '../../constants/colors';
import { setApiBaseUrl } from '../../services/api';

export default function LoginScreen() {
  const router = useRouter();
  const { login, loading } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [showServerModal, setShowServerModal] = useState(false);
  const [serverIp, setServerIp] = useState('');
  const [testingConnection, setTestingConnection] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'idle' | 'success' | 'error'>('idle');

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
        router.replace('/kitchen/incoming' as any);
      } else {
        // Default to admin dashboard for admin users
        router.replace('/admin/dashboard' as any);
      }
    } catch (err: any) {
      setError(err.message || 'Login failed');
    }
  };

  const loadSavedIp = async () => {
    const savedUrl = await AsyncStorage.getItem('apiBaseUrl');
    if (savedUrl) {
      // Extract IP from URL like "http://192.168.1.100:3000"
      const match = savedUrl.match(/http:\/\/([\d.]+):/);
      if (match) {
        setServerIp(match[1]);
      }
    }
  };

  const testConnection = async () => {
    if (!serverIp) {
      Alert.alert('Error', 'Please enter a server IP address');
      return;
    }

    setTestingConnection(true);
    setConnectionStatus('idle');

    try {
      const url = `http://${serverIp}:3000/api/auth/user`;
      await axios.get(url, { timeout: 5000 });
      setConnectionStatus('success');
    } catch (err: any) {
      if (err.response?.status === 401) {
        // 401 means server is reachable but user not authenticated (expected)
        setConnectionStatus('success');
      } else {
        setConnectionStatus('error');
      }
    } finally {
      setTestingConnection(false);
    }
  };

  const handleSaveServer = async () => {
    if (connectionStatus !== 'success') {
      Alert.alert('Error', 'Please test connection first');
      return;
    }

    try {
      await setApiBaseUrl(serverIp);
      Alert.alert('Success', 'Server configuration updated');
      setShowServerModal(false);
      setServerIp('');
      setConnectionStatus('idle');
    } catch (err) {
      Alert.alert('Error', 'Failed to save server configuration');
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

      {/* Change Server Link */}
      <TouchableOpacity 
        style={[authStyles.linkButton, { marginTop: Sizes.spacing.md }]}
        onPress={() => {
          loadSavedIp();
          setShowServerModal(true);
        }}
      >
        <Settings size={16} color={Colors.light.primary} />
        <Text style={{ color: Colors.light.primary, marginLeft: Sizes.spacing.xs }}>
          Change Server Configuration
        </Text>
      </TouchableOpacity>

      {/* Server Configuration Modal */}
      <Modal
        visible={showServerModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowServerModal(false)}
      >
        <View style={{
          flex: 1,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          justifyContent: 'flex-end',
        }}>
          <View style={{
            backgroundColor: Colors.light.background,
            borderTopLeftRadius: Sizes.radius.lg,
            borderTopRightRadius: Sizes.radius.lg,
            padding: Sizes.spacing.lg,
            paddingBottom: Sizes.spacing.xl,
            gap: Sizes.spacing.md,
          }}>
            <Text style={{
              fontSize: Sizes.typography.lg,
              fontWeight: '600',
              color: Colors.light.foreground,
              marginBottom: Sizes.spacing.sm,
            }}>
              Change Server
            </Text>

            <View>
              <Text style={{
                fontSize: Sizes.typography.sm,
                color: Colors.light.mutedForeground,
                marginBottom: Sizes.spacing.xs,
                fontWeight: '500',
              }}>
                Server IP Address
              </Text>
              <TextInput
                style={{
                  backgroundColor: '#fff',
                  borderRadius: Sizes.radius.sm,
                  padding: Sizes.spacing.md,
                  color: Colors.light.foreground,
                  fontWeight: '500',
                  borderWidth: 1,
                  borderColor: Colors.light.border,
                }}
                placeholder="e.g., 192.168.1.100"
                placeholderTextColor={Colors.light.mutedForeground}
                value={serverIp}
                onChangeText={setServerIp}
                keyboardType="decimal-pad"
              />
            </View>

            {/* Test Connection Button */}
            <TouchableOpacity
              onPress={testConnection}
              disabled={testingConnection || !serverIp}
              style={{
                backgroundColor: testingConnection ? Colors.light.muted : Colors.light.primary,
                borderRadius: Sizes.radius.sm,
                padding: Sizes.spacing.md,
                alignItems: 'center',
              }}
            >
              <Text style={{
                color: testingConnection ? Colors.light.mutedForeground : '#fff',
                fontWeight: '600',
                fontSize: Sizes.typography.base,
              }}>
                {testingConnection ? 'Testing...' : 'Test Connection'}
              </Text>
            </TouchableOpacity>

            {/* Connection Status */}
            {connectionStatus === 'success' && (
              <View style={{
                backgroundColor: '#d1f7d1',
                borderRadius: Sizes.radius.sm,
                padding: Sizes.spacing.md,
                borderLeftWidth: 4,
                borderLeftColor: '#4caf50',
              }}>
                <Text style={{ color: '#2e7d32', fontWeight: '500' }}>
                  ✓ Server connection successful
                </Text>
              </View>
            )}

            {connectionStatus === 'error' && (
              <View style={{
                backgroundColor: '#ffebee',
                borderRadius: Sizes.radius.sm,
                padding: Sizes.spacing.md,
                borderLeftWidth: 4,
                borderLeftColor: '#f44336',
              }}>
                <Text style={{ color: '#c62828', fontWeight: '500' }}>
                  ✗ Cannot reach server. Check IP and network connection.
                </Text>
              </View>
            )}

            {/* Save Button */}
            <TouchableOpacity
              onPress={handleSaveServer}
              disabled={connectionStatus !== 'success'}
              style={{
                backgroundColor: connectionStatus === 'success' ? '#FFCE1B' : Colors.light.muted,
                borderRadius: Sizes.radius.sm,
                padding: Sizes.spacing.md,
                alignItems: 'center',
              }}
            >
              <Text style={{
                color: connectionStatus === 'success' ? '#030213' : Colors.light.mutedForeground,
                fontWeight: '600',
                fontSize: Sizes.typography.base,
              }}>
                Save Configuration
              </Text>
            </TouchableOpacity>

            {/* Cancel Button */}
            <TouchableOpacity
              onPress={() => {
                setShowServerModal(false);
                setServerIp('');
                setConnectionStatus('idle');
              }}
              style={{
                backgroundColor: Colors.light.border,
                borderRadius: Sizes.radius.sm,
                padding: Sizes.spacing.md,
                alignItems: 'center',
              }}
            >
              <Text style={{
                color: Colors.light.foreground,
                fontWeight: '600',
                fontSize: Sizes.typography.base,
              }}>
                Cancel
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </ScrollView>
    </KeyboardAvoidingView>
  );
}