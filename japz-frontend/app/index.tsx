import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Image, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Colors } from '../constants/colors';
import { authStyles } from '../styles/authStyles';

export default function WelcomeScreen() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkApiConfig = async () => {
      const savedUrl = await AsyncStorage.getItem('apiBaseUrl');
      if (!savedUrl) {
        // First time - redirect to server config
        router.replace('/auth/server-config');
      } else {
        setIsLoading(false);
      }
    };
    checkApiConfig();
  }, [router]);

  if (isLoading) {
    return <View style={{ flex: 1, backgroundColor: Colors.light.background }} />;
  }

  return (
    <ScrollView style={{ backgroundColor: Colors.light.background }}>
      <View style={authStyles.welcomeContainer}>
        {/* Logo */}
        <View style={{height: 192, width: '100%'}}></View>
        <View style={authStyles.logo}>
          <Image
            source={require('../assets/images/logo.jpg')}
            style={{ width: '100%', height: '100%' }}
            resizeMode="contain"
          />
        </View>

        {/* Title and Subtitle */}
        <Text style={authStyles.title}>Welcome to JAPZ MobilePOS</Text>
        <Text style={authStyles.subtitle}>
          Complete POS and Communication System
        </Text>

        {/* Get Started Button */}
        <TouchableOpacity
          style={authStyles.primaryButton}
          onPress={() => router.push('/auth/registration')}
        >
          <Text style={authStyles.primaryButtonText}>Get Started</Text>
        </TouchableOpacity>

        {/* Login Link */}
        <View style={{ marginTop: 16, alignItems: 'center' }}>
          <Text>
            Already have an account?{' '}
            <Text
              style={[authStyles.linkHighlight, authStyles.linkText]}
              onPress={() => router.push('/auth/login')}
            >
              Login Here
            </Text>
          </Text>
        </View>
      </View>
    </ScrollView>
  );
}