import React, { useState } from "react";
import { Text, View } from "react-native";
import { AuthScreen } from "./auth-screen";
import { Dashboard } from "./dashboard";
import { Onboarding } from "./onboarding";
import { WalletSetup } from "./wallet-setup";

type AppState = "onboarding" | "auth" | "wallet-setup" | "dashboard" | "main";

export default function Index() {
  const [currentScreen, setCurrentScreen] = useState<AppState>("onboarding");
  const [userData, setUserData] = useState<any>(null);

  const handleOnboardingComplete = () => {
    setCurrentScreen("auth");
  };

  const handleLogin = (user: any) => {
    setUserData(user);
    setCurrentScreen("wallet-setup");
  };

  const handleWalletSetupComplete = () => {
    setCurrentScreen("dashboard");
  };

  const handleNavigate = (screen: string, data?: any) => {
    // Handle navigation to different screens
    // You can implement specific navigation logic here
  };

  // Render appropriate screen based on current state
  switch (currentScreen) {
    case "onboarding":
      return <Onboarding onNext={handleOnboardingComplete} />;

    case "auth":
      return <AuthScreen onLogin={handleLogin} />;

    case "wallet-setup":
      return <WalletSetup onComplete={handleWalletSetupComplete} />;

    case "dashboard":
      return <Dashboard onNavigate={handleNavigate} user={userData} />;

    case "main":
    default:
      return (
        <View className="flex-1 items-center justify-center bg-white">
          <Text className="text-xl font-bold text-blue-500">
            Welcome to ChamaPay, {userData?.name || "User"}!
          </Text>
          <Text className="text-gray-600 mt-2 text-center px-6">
            Your wallet is set up and ready to use.
          </Text>
        </View>
      );
  }
}
