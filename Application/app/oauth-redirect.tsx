import { useEffect } from 'react';
import { View, ActivityIndicator, Text } from 'react-native';
import { useRouter } from 'expo-router';

export default function OAuthRedirect() {
  const router = useRouter();

  useEffect(() => {
    // Give expo-auth-session time to capture the OAuth response
    console.log('OAuth redirect screen mounted');
    
    const timer = setTimeout(() => {
      // Navigate back to auth screen
      router.replace('/new-auth-screen');
    }, 1000);

    return () => clearTimeout(timer);
  }, []);

  return (
    <View className="flex-1 items-center justify-center bg-white">
      <ActivityIndicator size="large" color="#26a6a2" />
      <Text className="mt-4 text-gray-600">Completing sign in...</Text>
    </View>
  );
}