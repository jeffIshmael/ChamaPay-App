import { Shield, Users } from "lucide-react-native";
import React from "react";
import { ScrollView, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Path, Svg } from "react-native-svg";

import { useRouter } from "expo-router";

const GoogleIcon = () => (
  <Svg width={20} height={20} viewBox="0 0 24 24">
    <Path
      fill="#4285F4"
      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
    />
    <Path
      fill="#34A853"
      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
    />
    <Path
      fill="#FBBC05"
      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
    />
    <Path
      fill="#EA4335"
      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
    />
  </Svg>
);

export default function AuthScreen() {
  const router = useRouter();

  const handleGoogleLogin = () => {
    // Simulate successful login
    router.push("/wallet-setup");
  };

  return (
    <SafeAreaView className="flex-1 bg-white">
      <ScrollView
        className="flex-1 px-6"
        contentContainerStyle={{ flexGrow: 1 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View className="items-center mb-12" style={{ paddingTop: 20 }}>
          <View
            className="w-20 h-20 rounded-full items-center justify-center mb-6"
            style={{ backgroundColor: "#059669" }}
          >
            <Users color="white" size={32} />
          </View>
          <Text className="text-3xl mb-2 text-gray-900 font-bold">
            ChamaPay
          </Text>
          <Text className="text-gray-600 text-center">
            Join the future of community savings
          </Text>
        </View>

        {/* Main content */}
        <View className="justify-center">
          <View
            className="bg-white rounded-2xl p-6 mb-8"
            style={{
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.1,
              shadowRadius: 8,
              elevation: 5,
            }}
          >
            <View className="flex-row items-center justify-center mb-4">
              <Shield color="#059669" size={20} />
              <Text className="text-gray-700 ml-2 font-medium">
                Secure & Trusted
              </Text>
            </View>
            <Text className="text-sm text-gray-600 text-center leading-relaxed">
              Your data is protected with enterprise-grade security. We never
              store your financial information.
            </Text>
          </View>

          <TouchableOpacity
            onPress={handleGoogleLogin}
            className="w-full bg-white border border-gray-300 py-4 rounded-xl flex-row items-center justify-center mb-4"
            style={{
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.1,
              shadowRadius: 4,
              elevation: 3,
            }}
            activeOpacity={0.8}
          >
            <GoogleIcon />
            <Text className="text-gray-700 ml-3 font-medium text-base">
              Continue with Google
            </Text>
          </TouchableOpacity>

          <Text className="text-xs text-gray-500 text-center mt-4 px-4 leading-relaxed">
            By continuing, you agree to our Terms of Service and Privacy Policy
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
