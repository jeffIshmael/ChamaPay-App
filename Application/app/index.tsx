// app/index.tsx
import { useAuth } from "@/Contexts/AuthContext";
import { storage } from "@/Utils/storage";
import { Redirect } from "expo-router";
import * as SecureStore from "expo-secure-store";
import { useEffect, useState } from "react";
import { ActivityIndicator, View } from "react-native";

export default function Index() {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const [loading, setLoading] = useState(true);
  const [hasSeenOnboarding, setHasSeenOnboarding] = useState<boolean | null>(null);
  const [hasPin, setHasPin] = useState<boolean | null>(null);

  useEffect(() => {
    async function checkState() {
      try {
        const seen = await storage.getHasSeenOnboarding();
        const pin = await SecureStore.getItemAsync("user_pin");
        setHasSeenOnboarding(seen);
        setHasPin(!!pin);
      } catch (error) {
        console.error("[Index] Error checking state:", error);
      } finally {
        setLoading(false);
      }
    }
    checkState();
  }, []);

  console.log("[Index] State:", { isAuthenticated, authLoading, hasSeenOnboarding, hasPin, loading });

  if (authLoading || loading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#d1f6f1" }}>
        <ActivityIndicator size="large" color="#26a6a2" />
      </View>
    );
  }

  // 1. If NOT authenticated and NEVER seen onboarding -> Onboarding
  if (!isAuthenticated && !hasSeenOnboarding) {
    console.log("[Index] Redirect -> Onboarding");
    return <Redirect href="/onboarding" />;
  }

  // 2. If NOT authenticated and HAS seen onboarding -> Auth Screen
  if (!isAuthenticated && hasSeenOnboarding) {
    console.log("[Index] Redirect -> Auth Screen");
    return <Redirect href="/new-auth-screen" />;
  }

  // 3. If authenticated but NO PIN set -> Dashboard (Tabs) 
  if (isAuthenticated && !hasPin) {
    console.log("[Index] Redirect -> Tabs (No PIN set)");
    return <Redirect href="/(tabs)" />;
  }

  // 4. If authenticated and HAS PIN -> Lock Screen
  if (isAuthenticated && hasPin) {
    console.log("[Index] Redirect -> Lock Screen");
    return <Redirect href="/lock-screen" />;
  }

  // Fallback
  return <Redirect href="/new-auth-screen" />;
}