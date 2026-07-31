import { AuthProvider, useAuth } from "@/Contexts/AuthContext";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import * as SystemUI from "expo-system-ui";
import { useEffect, useState } from "react";
import { ActivityIndicator, Image, StyleSheet, View, Text } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import "./global.css";

import { useExchangeRateStore } from "@/store/useExchangeRateStore";
import { logAppOpen } from "@/lib/analytics";

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
});



function RootLayoutNav() {
  const { isLoading, isAuthenticated } = useAuth();
  const [isReady, setIsReady] = useState(false);
  const [hasSplashHidden, setHasSplashHidden] = useState(false);
  const hydrateRates = useExchangeRateStore((state) => state.hydrate);

  // Initialize app resources
  useEffect(() => {
    const initializeApp = async () => {
try {
        // Set system UI background IMMEDIATELY
        await SystemUI.setBackgroundColorAsync("#d1f6f1");
// Hydrate exchange rates (don't await - do it in background)
        hydrateRates();
        
        // Log app open
        logAppOpen();

// Small delay to ensure everything is painted
        await new Promise(resolve => setTimeout(resolve, 100));

        setIsReady(true);
} catch (error) {
// ALWAYS set ready to prevent app from hanging
        setIsReady(true);
      }
    };

    initializeApp();
  }, [hydrateRates]);

  // Hide native splash - with robust error handling
  useEffect(() => {
    const hideSplash = async () => {
      // Only hide when auth is initialized AND custom resources are ready
      if (!isLoading && isReady && !hasSplashHidden) {
try {
          // Double check if we're really ready to paint
          // This prevents a white flash on some devices
          await new Promise(resolve => setTimeout(resolve, 200));

          await SplashScreen.hideAsync();
          setHasSplashHidden(true);
} catch (error) {
setHasSplashHidden(true);
        }
      }
    };

    hideSplash();
  }, [isLoading, isReady, hasSplashHidden]);

  // Keep returning null while initializing. 
  // The native splash screen will remain visible because of SplashScreen.preventAutoHideAsync()
  if (isLoading || !isReady) {
    return null;
  }

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
        <Stack.Screen name="auth-form-screen" />
        <Stack.Screen name="wallet-setup" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="edit-profile" />
        <Stack.Screen name="verify-email" />
        <Stack.Screen name="pin-setup" />
        <Stack.Screen name="lock-screen" />
        <Stack.Screen name="notification-trial" />
        <Stack.Screen name="chama/[encryptedSlug]" />
      </Stack>
    </SafeAreaProvider>
  );
}

export default function RootLayout() {
  // Catch any errors at the root level
  useEffect(() => {
    const errorHandler = (error: any, isFatal?: boolean) => {
if (isFatal) {
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
    // Remove center alignment from container so we can separate top/bottom
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logo: {
    width: 200,
    height: 200,
  },
  bottomLoaderContainer: {
    height: 100, // Fixed height area at bottom
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 40,
  },
});

export function ErrorBoundary({ error, retry }: { error: Error; retry: () => void }) {
  return (
    <View style={{ flex: 1, backgroundColor: "#d1f6f1", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <Text style={{ color: "#dc2626", fontWeight: "600", fontSize: 18, marginBottom: 8 }}>Root Error</Text>
      <Text style={{ color: "#6b7280", textAlign: "center", marginBottom: 24 }}>{error.message}</Text>
      <View style={{ backgroundColor: "#059669", paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12 }}>
        <Text style={{ color: "white", fontWeight: "500" }} onPress={retry}>Try again</Text>
      </View>
    </View>
  );
}