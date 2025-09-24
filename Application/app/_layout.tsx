import { NavigationContainer } from "@react-navigation/native";
import { Stack } from "expo-router";
import { AuthProvider } from "@/Contexts/AuthContext";
import { SafeAreaProvider } from "react-native-safe-area-context";
import "./global.css";

export default function RootLayout() {
  return (
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
  );
}
