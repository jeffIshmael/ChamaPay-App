import { AuthProvider } from "@/Contexts/AuthContext";
import { Stack } from "expo-router";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { ThirdwebProvider } from "thirdweb/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import "./global.css";

const queryClient = new QueryClient();

export default function RootLayout() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThirdwebProvider>
        <AuthProvider>
          <SafeAreaProvider>
            <Stack screenOptions={{ headerShown: false }}>
              <Stack.Screen name="index" />
              <Stack.Screen name="auth-screen" />
              <Stack.Screen name="auth-form-screen" />
              <Stack.Screen name="edit-profile" />
              <Stack.Screen name="wallet-setup" />
            </Stack>
          </SafeAreaProvider>
        </AuthProvider>
      </ThirdwebProvider>
    </QueryClientProvider>
  );
}
