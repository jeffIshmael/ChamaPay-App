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
          // First time user, show onboarding
          router.replace("/onboarding");
        } else if (isAuthenticated) {
          // User is authenticated, go to main app
          router.replace("/(tabs)");
        } else {
          // User has seen onboarding but not authenticated
          router.replace("/auth-screen");
        }
      } catch (error) {
        console.error("Error checking initial route:", error);
        // Default to onboarding on error
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
