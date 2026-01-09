import {
  ChevronLeft,
  ChevronRight,
  Shield,
  Smartphone,
  Users,
  Globe,
} from "lucide-react-native";
import React, { useState } from "react";
import { ScrollView, Text, TouchableOpacity, View, Image, Dimensions } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";

const { width, height } = Dimensions.get('window');

const onboardingSlides = [
  {
    icon: Users,
    title: "Welcome to ChamaPay",
    subtitle: "A Better Way to Save Together",
    description:
      "Create or join digital savings groups where members contribute regularly and receive payouts in a fair rotating order — just like a chama.",
    gradientColors: ["#059669", "#10b981"],
    bgColor: "#ecfdf5",
    imageSource: require("@/assets/images/intro.png"),
  },
  {
    icon: Shield,
    title: "Your Money Is Safe",
    subtitle: "Protected by Built-In Rules",
    description:
      "ChamaPay uses automated rules to protect contributions and ensure payouts happen exactly as agreed — no one can change or interfere with them.",
    gradientColors: ["#0d9488", "#14b8a6"],
    bgColor: "#f0fdfa",
    imageSource: require("@/assets/images/secure.png"),
  },
  {
    icon: Smartphone,
    title: "Everything Happens Automatically",
    subtitle: "No Stress, No Follow-Ups",
    description:
      "Contributions, records, and payouts are handled automatically, so there's no chasing members or manual tracking.",
    gradientColors: ["#059669", "#10b981"],
    bgColor: "#ecfdf5",
    imageSource: require("@/assets/images/payoutProcessed.png"),
  },
  {
    icon: Globe,
    title: "Save Without Borders",
    subtitle: "One Group, Any Location",
    description:
      "Invite friends or family from different countries. Everyone contributes and gets paid on time, wherever they are.",
    gradientColors: ["#0d9488", "#14b8a6"],
    bgColor: "#f0fdfa",
    imageSource: require("@/assets/images/payout.png"),
  },
];

export default function Onboarding() {
  const [currentSlide, setCurrentSlide] = useState(0);
  const router = useRouter();

  const nextSlide = () => {
    if (currentSlide < onboardingSlides.length - 1) {
      setCurrentSlide(currentSlide + 1);
    } else {
      router.push("/auth-screen");
    }
  };

  const prevSlide = () => {
    if (currentSlide > 0) {
      setCurrentSlide(currentSlide - 1);
    }
  };

  const skipToEnd = () => {
    router.push("/auth-screen");
  };

  const slide = onboardingSlides[currentSlide];
  const IconComponent = slide.icon;

  return (
    <View className="flex-1 bg-white">
      {/* Full Screen Image Background - extends to status bar */}
      <View className="absolute top-0 left-0 right-0 bottom-0" style={{ height: height * 0.65 }}>
        <Image
          source={slide.imageSource}
          style={{
            width: "100%",
            height: "100%",
          }}
          resizeMode="cover"
        />
      </View>

      {/* Skip Button */}
      {currentSlide < onboardingSlides.length - 1 && (
        <SafeAreaView>
          <View className="absolute top-4 right-6 z-20">
            <TouchableOpacity 
              onPress={skipToEnd}
              className="px-4 py-2 rounded-full"
              style={{ backgroundColor: 'rgba(255, 255, 255, 0.9)' }}
            >
              <Text className="text-gray-700 text-sm font-semibold">Skip</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      )}

      {/* Content Card at Bottom */}
      <View 
        className="absolute left-0 right-0 bottom-0 bg-white rounded-t-3xl"
        style={{ 
          paddingTop: 32,
          paddingBottom: 40,
          paddingHorizontal: 24,
          shadowColor: "#000",
          shadowOffset: {
            width: 0,
            height: -4,
          },
          shadowOpacity: 0.1,
          shadowRadius: 12,
          elevation: 10,
        }}
      >
        {/* Content */}
        <View className="items-center mb-6">
          <Text className="text-2xl mb-2 text-gray-900 text-center font-bold leading-tight px-4">
            {slide.title}
          </Text>

          <Text
            className="text-base mb-4 text-center font-semibold px-4"
            style={{ color: slide.gradientColors[0] }}
          >
            {slide.subtitle}
          </Text>

          <Text className="text-gray-600 text-sm leading-6 text-center px-6 mb-6">
            {slide.description}
          </Text>
        </View>

        {/* Progress Indicators */}
        <View className="flex-row justify-center space-x-2 mb-6 gap-1">
          {onboardingSlides.map((_, index) => (
            <View
              key={index}
              className="h-1.5 rounded-full"
              style={{
                width: index === currentSlide ? 24 : 8,
                backgroundColor: index === currentSlide 
                  ? slide.gradientColors[0]
                  : "#d1d5db"
              }}
            />
          ))}
        </View>

        {/* Navigation Buttons */}
        <View className="flex-row items-center justify-between">
          <TouchableOpacity
            onPress={prevSlide}
            disabled={currentSlide === 0}
            className="px-6 py-3 rounded-full flex-row items-center"
            style={{ 
              opacity: currentSlide === 0 ? 0 : 1,
              backgroundColor: currentSlide === 0 ? "transparent" : "#f3f4f6"
            }}
          >
            <ChevronLeft size={20} color="#6b7280" />
            <Text className="text-gray-700 ml-1 text-base font-medium">Back</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={nextSlide}
            className="px-8 py-4 rounded-full flex-row items-center shadow-lg"
            style={{ 
              backgroundColor: slide.gradientColors[0],
              minWidth: 140,
              justifyContent: "center"
            }}
          >
            <Text className="text-white text-base font-semibold mr-1">
              {currentSlide === onboardingSlides.length - 1
                ? "Get Started"
                : "Next"}
            </Text>
            <ChevronRight size={20} color="white" />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}