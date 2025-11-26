// app/auth/welcome.tsx
import { useRouter } from 'expo-router';
import { useEffect } from 'react';
import { View } from 'react-native';

export default function WelcomeScreen() {
  const router = useRouter();

  useEffect(() => {
    router.replace('./login');
  }, [router]);

  return <View />;
}