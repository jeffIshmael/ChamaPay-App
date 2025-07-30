import { NavigationContainer } from "@react-navigation/native";
import { Stack } from "expo-router";
import { SafeAreaProvider } from "react-native-safe-area-context";
import "./global.css";

export default function RootLayout() {
  return (

      <SafeAreaProvider>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="index" />
          <Stack.Screen name="auth-screen" />
          <Stack.Screen name="wallet-setup" />
        </Stack>
      </SafeAreaProvider>

  );
}