import { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, Alert, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import axios from 'axios';
import { setApiBaseUrl, getApiBaseUrl } from '../../services/api';
import { Colors, Sizes } from '../../constants/colors';

export default function ServerConfigScreen() {
  const router = useRouter();
  const [serverIp, setServerIp] = useState('');
  const [loading, setLoading] = useState(false);
  const [testingConnection, setTestingConnection] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'idle' | 'success' | 'error'>('idle');

  useEffect(() => {
    loadSavedIp();
  }, []);

  const loadSavedIp = async () => {
    const savedUrl = await getApiBaseUrl();
    // Extract IP from URL (e.g., "http://10.82.31.96:3000" -> "10.82.31.96")
    const ipMatch = savedUrl.match(/http:\/\/([^:]+)/);
    if (ipMatch) {
      setServerIp(ipMatch[1]);
    }
  };

  const testConnection = async () => {
    if (!serverIp.trim()) {
      Alert.alert('Error', 'Please enter a server IP address');
      return;
    }

    setTestingConnection(true);
    setConnectionStatus('idle');

    try {
      const testUrl = `http://${serverIp}:3000/api/auth/user`;
      // This will fail without auth, but if we get a proper error response (401), it means the server is reachable
      await axios.get(testUrl, { timeout: 5000 });
      setConnectionStatus('success');
      Alert.alert('Success', 'Connected to server successfully!');
    } catch (error: any) {
      // If we get a 401 error, the server is reachable but we're not authenticated
      // which is expected since we haven't logged in yet
      if (error.response?.status === 401 || error.code === 'ECONNABORTED') {
        if (error.response?.status === 401) {
          setConnectionStatus('success');
          Alert.alert('Success', 'Connected to server successfully!');
        } else {
          setConnectionStatus('error');
          Alert.alert('Error', 'Cannot reach the server. Please check the IP address and try again.');
        }
      } else if (error.code === 'ECONNREFUSED' || error.message?.includes('Network Error')) {
        setConnectionStatus('error');
        Alert.alert('Error', 'Cannot reach the server. Please check the IP address and network connection.');
      } else {
        setConnectionStatus('error');
        Alert.alert('Error', 'Connection failed. Please try again.');
      }
    } finally {
      setTestingConnection(false);
    }
  };

  const handleSaveAndContinue = async () => {
    if (!serverIp.trim()) {
      Alert.alert('Error', 'Please enter a server IP address');
      return;
    }

    if (connectionStatus !== 'success') {
      Alert.alert('Warning', 'Please test the connection first before continuing');
      return;
    }

    setLoading(true);
    try {
      await setApiBaseUrl(serverIp);
      router.push('/auth/login' as any);
    } catch (error) {
      Alert.alert('Error', 'Failed to save server configuration');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={{ flex: 1, backgroundColor: Colors.light.background }}>
      <View style={{ padding: Sizes.spacing.xl, paddingTop: Sizes.spacing.xxl }}>
        {/* Header */}
        <View style={{ marginBottom: Sizes.spacing.xl }}>
          <Text style={{ fontSize: 32, fontWeight: '900', color: '#ffce1b', marginBottom: Sizes.spacing.md }}>
            JAPZ POS
          </Text>
          <Text style={{ fontSize: 18, color: '#666', fontWeight: '600' }}>
            Server Configuration
          </Text>
        </View>

        {/* Info Section */}
        <View
          style={{
            backgroundColor: '#f5f5f5',
            padding: Sizes.spacing.lg,
            borderRadius: Sizes.radius.md,
            marginBottom: Sizes.spacing.xl,
          }}
        >
          <Text style={{ fontSize: 14, fontWeight: '600', color: '#333', marginBottom: Sizes.spacing.sm }}>
            📌 First time setup
          </Text>
          <Text style={{ fontSize: 13, color: '#666', lineHeight: 20 }}>
            Enter your restaurant server's IP address to connect. Ask your IT administrator for the server IP if you don't know it.
          </Text>
        </View>

        {/* IP Input Section */}
        <View style={{ marginBottom: Sizes.spacing.lg }}>
          <Text style={{ fontSize: 14, fontWeight: '700', color: '#333', marginBottom: Sizes.spacing.sm }}>
            Server IP Address
          </Text>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              borderWidth: 1,
              borderColor: '#ddd',
              borderRadius: Sizes.radius.md,
              paddingHorizontal: Sizes.spacing.md,
              backgroundColor: '#fff',
            }}
          >
            <Text style={{ fontSize: 14, color: '#999', marginRight: 8 }}>http://</Text>
            <TextInput
              placeholder="e.g., 192.168.1.100"
              value={serverIp}
              onChangeText={setServerIp}
              placeholderTextColor="#999"
              style={{
                flex: 1,
                paddingVertical: Sizes.spacing.md,
                fontSize: 14,
                color: '#333',
              }}
            />
            <Text style={{ fontSize: 14, color: '#999', marginLeft: 8 }}>:3000</Text>
          </View>
          <Text style={{ fontSize: 12, color: '#999', marginTop: Sizes.spacing.sm }}>
            Format: XXX.XXX.XXX.XXX (IPv4 address)
          </Text>
        </View>

        {/* Test Connection Button */}
        <TouchableOpacity
          onPress={testConnection}
          disabled={testingConnection}
          style={{
            backgroundColor: connectionStatus === 'success' ? '#22c55e' : '#3b82f6',
            paddingVertical: Sizes.spacing.md,
            borderRadius: Sizes.radius.md,
            marginBottom: Sizes.spacing.md,
            flexDirection: 'row',
            justifyContent: 'center',
            alignItems: 'center',
          }}
        >
          {testingConnection ? (
            <>
              <ActivityIndicator size="small" color="#fff" style={{ marginRight: 8 }} />
              <Text style={{ color: '#fff', fontWeight: '600', fontSize: 14 }}>
                Testing Connection...
              </Text>
            </>
          ) : connectionStatus === 'success' ? (
            <Text style={{ color: '#fff', fontWeight: '600', fontSize: 14 }}>
              ✓ Connection Successful
            </Text>
          ) : (
            <Text style={{ color: '#fff', fontWeight: '600', fontSize: 14 }}>
              Test Connection
            </Text>
          )}
        </TouchableOpacity>

        {/* Status Message */}
        {connectionStatus === 'success' && (
          <View
            style={{
              backgroundColor: '#dcfce7',
              borderLeftWidth: 4,
              borderLeftColor: '#22c55e',
              padding: Sizes.spacing.md,
              borderRadius: Sizes.radius.sm,
              marginBottom: Sizes.spacing.lg,
            }}
          >
            <Text style={{ color: '#166534', fontWeight: '600', fontSize: 13 }}>
              ✓ Server is reachable
            </Text>
          </View>
        )}

        {connectionStatus === 'error' && (
          <View
            style={{
              backgroundColor: '#fee2e2',
              borderLeftWidth: 4,
              borderLeftColor: '#ef4444',
              padding: Sizes.spacing.md,
              borderRadius: Sizes.radius.sm,
              marginBottom: Sizes.spacing.lg,
            }}
          >
            <Text style={{ color: '#991b1b', fontWeight: '600', fontSize: 13 }}>
              ✗ Cannot reach server. Check IP and network.
            </Text>
          </View>
        )}

        {/* Continue Button */}
        <TouchableOpacity
          onPress={handleSaveAndContinue}
          disabled={loading || connectionStatus !== 'success'}
          style={{
            backgroundColor: connectionStatus === 'success' ? '#ffce1b' : '#e5e7eb',
            paddingVertical: Sizes.spacing.md,
            borderRadius: Sizes.radius.md,
            flexDirection: 'row',
            justifyContent: 'center',
            alignItems: 'center',
            marginBottom: Sizes.spacing.lg,
          }}
        >
          {loading ? (
            <>
              <ActivityIndicator size="small" color="#000" style={{ marginRight: 8 }} />
              <Text style={{ color: '#000', fontWeight: '700', fontSize: 14 }}>
                Saving...
              </Text>
            </>
          ) : (
            <Text
              style={{
                color: connectionStatus === 'success' ? '#000' : '#999',
                fontWeight: '700',
                fontSize: 14,
              }}
            >
              Continue to Login
            </Text>
          )}
        </TouchableOpacity>

        {/* Help Section */}
        <View
          style={{
            backgroundColor: '#f9fafb',
            padding: Sizes.spacing.lg,
            borderRadius: Sizes.radius.md,
            borderWidth: 1,
            borderColor: '#e5e7eb',
          }}
        >
          <Text style={{ fontSize: 13, fontWeight: '700', color: '#333', marginBottom: Sizes.spacing.sm }}>
            💡 How to find the server IP:
          </Text>
          <Text style={{ fontSize: 12, color: '#666', lineHeight: 18, marginBottom: 8 }}>
            • On Windows: Open Command Prompt, type "ipconfig", look for IPv4 Address
          </Text>
          <Text style={{ fontSize: 12, color: '#666', lineHeight: 18, marginBottom: 8 }}>
            • On Mac/Linux: Open Terminal, type "ifconfig" or "hostname -I"
          </Text>
          <Text style={{ fontSize: 12, color: '#666', lineHeight: 18 }}>
            • Ask your IT administrator for the correct server IP
          </Text>
        </View>
      </View>
    </ScrollView>
  );
}
