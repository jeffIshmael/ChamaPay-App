import { Onboarding } from '@/components/Onboarding';
import React, { useState } from 'react';
import { Text, View } from "react-native";

export default function Index() {
  const [showOnboarding, setShowOnboarding] = useState(true);

  const handleOnboardingComplete = () => {
    setShowOnboarding(false);
  };

  if (showOnboarding) {
    return <Onboarding onNext={handleOnboardingComplete} />;
  }

  return (
    <View className="flex-1 items-center justify-center bg-white">
      <Text className="text-xl font-bold text-blue-500">
        Welcome to ChamaPay!
      </Text>
    </View>
  );
}