// app/_layout.tsx
import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AuthProvider } from '../hooks/useAuth';
import { initializeApi } from '../services/api';

export default function RootLayout() {
  useEffect(() => {
    const initApp = async () => {
      // Check if user has configured API URL
      const savedUrl = await AsyncStorage.getItem('apiBaseUrl');
      if (savedUrl) {
        // User has configured IP before, initialize with saved URL
        await initializeApi();
      }
      // If no saved URL, auth flow will redirect to server-config screen
    };
    initApp();
  }, []);

  return (
    <AuthProvider>
      <StatusBar style="auto" />
      <Stack>
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen 
          name="auth" 
          options={{ 
            headerShown: false
          }} 
        />
        <Stack.Screen name="admin" options={{ headerShown: false }} />
        <Stack.Screen name="cashier" options={{ headerShown: false }} />
        <Stack.Screen name="kitchen" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="modal" options={{ presentation: 'modal' }} />
      </Stack>
    </AuthProvider>
  );
}