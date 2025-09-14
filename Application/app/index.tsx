import { useAuth } from "@/contexts/AuthContext";
import { storage } from "@/utils/storage";
import { router } from "expo-router";
import { useEffect } from "react";
import { ActivityIndicator, Text, View } from "react-native";

export default function Index() {
  const { isAuthenticated, isLoading } = useAuth();

  useEffect(() => {
    const handleInitialRoute = async () => {
      if (isLoading) return; // Wait for auth to load

      try {
        const hasSeenOnboarding = await storage.getHasSeenOnboarding();
        
        if (!hasSeenOnboarding) {
          router.replace("/onboarding");
        } else if (isAuthenticated) {
          router.replace("/(tabs)");
        } else {
          router.replace("/auth-screen");
        }
      } catch (error) {
        console.error("Error checking initial route:", error);
        router.replace("/onboarding");
      }
    };

    handleInitialRoute();
  }, [isLoading, isAuthenticated]);

  // Show loading screen while determining route
  if (isLoading) {
    return (
      <View className="flex-1 bg-white items-center justify-center">
        <ActivityIndicator size="large" color="#059669" />
        <Text className="text-gray-600 mt-4">Loading...</Text>
      </View>
    );
  }

  return null;
}
