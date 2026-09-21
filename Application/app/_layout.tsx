import { AuthProvider, useAuth } from "@/Contexts/AuthContext";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import * as SystemUI from "expo-system-ui";
import { useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import "./global.css";

import { useExchangeRateStore } from "@/store/useExchangeRateStore";
import { useCurrencyStore } from "@/store/useCurrencyStore";
import { serverUrl } from "@/constants/serverUrl";
import { logAppOpen } from "@/lib/analytics";
import PushNotificationRouter from "@/components/PushNotificationRouter";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      throwOnError: false,
    },
  },
});

SplashScreen.preventAutoHideAsync().catch(() => {});

function RootLayoutNav() {
  const { isLoading, isAuthenticated } = useAuth();
  const [isReady, setIsReady] = useState(false);
  const [hasSplashHidden, setHasSplashHidden] = useState(false);
  const hydrateRates = useExchangeRateStore((state) => state.hydrate);
  const setPlatformRate = useCurrencyStore((state) => state.setPlatformRate);
  const { setCurrency, hasSetCurrency } = useCurrencyStore();
  const { user } = useAuth();

  useEffect(() => {
    const initializeApp = async () => {
      try {
        await SystemUI.setBackgroundColorAsync("#d1f6f1");
        hydrateRates();
        fetch(`${serverUrl}/api/rates`)
          .then((res) => res.json())
          .then((data) => {
            if (data?.rate) setPlatformRate(data.rate);
          })
          .catch(() => {});
        logAppOpen();
        await new Promise((resolve) => setTimeout(resolve, 100));
        setIsReady(true);
      } catch {
        setIsReady(true);
      }
    };
    void initializeApp();
  }, [hydrateRates, setPlatformRate]);

  useEffect(() => {
    const hideSplash = async () => {
      if (!isLoading && isReady && !hasSplashHidden) {
        try {
          await new Promise((resolve) => setTimeout(resolve, 200));
          await SplashScreen.hideAsync();
        } catch {
          // ignore
        } finally {
          setHasSplashHidden(true);
        }
      }
    };
    void hideSplash();
  }, [isLoading, isReady, hasSplashHidden]);

  useEffect(() => {
    if (isAuthenticated && user?.location === "KE" && !hasSetCurrency) {
      setCurrency("KES");
    }
  }, [isAuthenticated, user?.location, hasSetCurrency, setCurrency]);

  if (isLoading || !isReady) {
    return null;
  }

  return (
    <>
      <StatusBar style="dark" translucent backgroundColor="transparent" />
      <PushNotificationRouter />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: "#d1f6f1" },
          animation: "fade",
        }}
      >
        <Stack.Screen name="index" options={{ animation: "none" }} />
        <Stack.Screen name="auth-screen" />
        <Stack.Screen name="new-auth-screen" />
        <Stack.Screen name="auth-form-screen" />
        <Stack.Screen name="wallet-setup" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="edit-profile" />
        <Stack.Screen name="verify-identity" />
        <Stack.Screen name="verify-email" />
        <Stack.Screen name="pin-setup" />
        <Stack.Screen name="lock-screen" />
        <Stack.Screen name="notification-trial" />
        <Stack.Screen name="chama/[encryptedSlug]" />
        <Stack.Screen name="goal-details/[slug]" />
      </Stack>
    </>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider style={{ flex: 1, backgroundColor: "#d1f6f1" }}>
      <View style={{ flex: 1, backgroundColor: "#d1f6f1" }}>
        <QueryClientProvider client={queryClient}>
          <AuthProvider>
            <RootLayoutNav />
          </AuthProvider>
        </QueryClientProvider>
      </View>
    </SafeAreaProvider>
  );
}

export function ErrorBoundary({
  error,
  retry,
}: {
  error: Error;
  retry: () => void;
}) {
  return (
    <View
      style={{
        flex: 1,
        backgroundColor: "#d1f6f1",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
      }}
    >
      <Text
        style={{
          color: "#dc2626",
          fontWeight: "600",
          fontSize: 18,
          marginBottom: 8,
        }}
      >
        Root Error
      </Text>
      <Text
        style={{ color: "#6b7280", textAlign: "center", marginBottom: 24 }}
      >
        {error.message}
      </Text>
      <View
        style={{
          backgroundColor: "#059669",
          paddingHorizontal: 24,
          paddingVertical: 12,
          borderRadius: 12,
        }}
      >
        <Text style={{ color: "white", fontWeight: "500" }} onPress={retry}>
          Try again
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  splashContainer: {
    flex: 1,
    backgroundColor: "#d1f6f1",
  },
});
