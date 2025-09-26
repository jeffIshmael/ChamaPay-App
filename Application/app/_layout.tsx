import { chain, client } from "@/constants/thirdweb";
import { AuthProvider } from "@/Contexts/AuthContext";
import { Stack } from "expo-router";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { ThirdwebProvider } from "thirdweb/react";
import "./global.css";

export default function RootLayout() {
  return (
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
  </AuthProvider></ThirdwebProvider>
  
  );
}
