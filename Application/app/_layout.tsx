import { AuthProvider } from "@/Contexts/AuthContext";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { ThirdwebProvider } from "thirdweb/react";
import "./global.css";

import { useExchangeRateStore } from "@/store/useExchangeRateStore";
import { useEffect } from "react";

const queryClient = new QueryClient();

export default function RootLayout() {
  const hydrateRates = useExchangeRateStore((state) => state.hydrate);

  useEffect(() => {
    hydrateRates();
  }, [hydrateRates]);

  return (
    <QueryClientProvider client={queryClient}>
      <ThirdwebProvider>
        <AuthProvider>
          <SafeAreaProvider>
            <Stack screenOptions={{ headerShown: false }}>
              <Stack.Screen name="index" />
              <Stack.Screen name="auth-screen" />
              <Stack.Screen name="new-auth-screen" />
              <Stack.Screen name="animated-splash" />
              <Stack.Screen name="oauth-redirect" />
              <Stack.Screen name="auth-form-screen" />
              <Stack.Screen name="wallet-setup" />
              <Stack.Screen name="(tabs)" />
              <Stack.Screen name="edit-profile" />
              <Stack.Screen name="verify-email" />
              <Stack.Screen name="chama/[encryptedSlug]" />
            </Stack>
          </SafeAreaProvider>
        </AuthProvider>
      </ThirdwebProvider>
    </QueryClientProvider>
  );
}
