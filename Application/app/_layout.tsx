import { AuthProvider, useAuth } from "@/Contexts/AuthContext";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import * as SystemUI from "expo-system-ui";
import { useEffect, useState } from "react";
import { ActivityIndicator, Image, StyleSheet, View } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import "./global.css";

import { useExchangeRateStore } from "@/store/useExchangeRateStore";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      // Prevent crashes from failed queries
      throwOnError: false,
    },
  },
});

// Keep splash screen visible - CRITICAL for preventing crashes
SplashScreen.preventAutoHideAsync().catch((error) => {
  console.warn("[SplashScreen] Failed to prevent auto hide:", error);
});

function LoadingSplashScreen() {
  return (
    <View style={styles.splashContainer}>
      <Image
        source={require('@/assets/images/chamapay-logo.png')}
        style={styles.logo}
        resizeMode="contain"
      />
      <View style={styles.loaderContainer}>
        <ActivityIndicator
          size="large"
          color="#10b981"
        />
      </View>
    </View>
  );
}

function RootLayoutNav() {
  const { isLoading, isAuthenticated } = useAuth();
  const [isReady, setIsReady] = useState(false);
  const [hasSplashHidden, setHasSplashHidden] = useState(false);
  const hydrateRates = useExchangeRateStore((state) => state.hydrate);

  // Initialize app resources
  useEffect(() => {
    const initializeApp = async () => {
      console.log("[RootLayout] 🚀 Starting app initialization...");

      try {
        // Set system UI background IMMEDIATELY
        await SystemUI.setBackgroundColorAsync("#d1f6f1");
        console.log("[RootLayout] ✅ System UI configured");

        // Hydrate exchange rates (don't await - do it in background)
        hydrateRates();
        console.log("[RootLayout] ✅ Exchange rates hydrating...");

        // Small delay to ensure everything is painted
        await new Promise(resolve => setTimeout(resolve, 100));

        setIsReady(true);
        console.log("[RootLayout] ✅ App resources ready");
      } catch (error) {
        console.error("[RootLayout] ❌ Initialization error:", error);
        // ALWAYS set ready to prevent app from hanging
        setIsReady(true);
      }
    };

    initializeApp();
  }, [hydrateRates]);

  // Hide native splash - with robust error handling
  useEffect(() => {
    const hideSplash = async () => {
      if (!isLoading && isReady && !hasSplashHidden) {
        console.log("[RootLayout] 🎯 All ready! Hiding splash...");

        try {
          // Small delay for React to render
          await new Promise(resolve => setTimeout(resolve, 100));

          await SplashScreen.hideAsync();
          setHasSplashHidden(true);
          console.log("[RootLayout] ✅ Splash hidden successfully");
        } catch (error) {
          console.error("[RootLayout] ⚠️ Error hiding splash (non-critical):", error);
          // Mark as hidden anyway to not block the app
          setHasSplashHidden(true);
        }
      }
    };

    hideSplash();
  }, [isLoading, isReady, hasSplashHidden]);

  // Show custom loading screen while initializing
  // IMPORTANT: Always show something, never return null
  if (isLoading || !isReady) {
    console.log("[RootLayout] 📱 Showing LoadingSplashScreen");
    return <LoadingSplashScreen />;
  }

  console.log("[RootLayout] 🎬 Rendering main navigation");

  return (
    <SafeAreaProvider style={{ flex: 1, backgroundColor: "#d1f6f1" }}>
      <StatusBar style="dark" translucent backgroundColor="transparent" />
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
        <Stack.Screen name="oauth-redirect" />
        <Stack.Screen name="auth-form-screen" />
        <Stack.Screen name="wallet-setup" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="edit-profile" />
        <Stack.Screen name="verify-email" />
        <Stack.Screen name="chama/[encryptedSlug]" />
      </Stack>
    </SafeAreaProvider>
  );
}

export default function RootLayout() {
  // Catch any errors at the root level
  useEffect(() => {
    const errorHandler = (error: any, isFatal?: boolean) => {
      console.error('[RootLayout] Global error:', error);
      if (isFatal) {
        console.error('[RootLayout] Fatal error - app may crash');
      }
    };

    // This helps catch errors but won't prevent all crashes
    const subscription = ErrorUtils?.setGlobalHandler?.(errorHandler);

    return () => {
      // Cleanup if possible
    };
  }, []);

  return (
    <View style={{ flex: 1, backgroundColor: "#d1f6f1" }}>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <RootLayoutNav />
        </AuthProvider>
      </QueryClientProvider>
    </View>
  );
}

const styles = StyleSheet.create({
  splashContainer: {
    flex: 1,
    backgroundColor: '#d1f6f1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logo: {
    width: 200,
    height: 200,
  },
  loaderContainer: {
    marginTop: 40,
    height: 60,
    justifyContent: 'center',
    alignItems: 'center',
  },
});