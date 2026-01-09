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
    primaryColor: "#26a6a2", // downy-500
    accentColor: "#66d9d0", // downy-300
    bgColor: "#d1f6f1", // downy-100
    imageSource: require("@/assets/images/intro.png"),
  },
  {
    icon: Shield,
    title: "Your Money Is Safe",
    subtitle: "Protected by Built-In Rules",
    description:
      "ChamaPay uses automated rules to protect contributions and ensure payouts happen exactly as agreed — no one can change or interfere with them.",
    primaryColor: "#1c8584", // downy-600
    accentColor: "#3fc2bb", // downy-400
    bgColor: "#f1fcfa", // downy-50
    imageSource: require("@/assets/images/secure.png"),
  },
  {
    icon: Smartphone,
    title: "Everything Happens Automatically",
    subtitle: "No Stress, No Follow-Ups",
    description:
      "Contributions, records, and payouts are handled automatically, so there's no chasing members or manual tracking.",
    primaryColor: "#26a6a2", // downy-500
    accentColor: "#a3ece4", // downy-200
    bgColor: "#d1f6f1", // downy-100
    imageSource: require("@/assets/images/payoutProcessed.png"),
  },
  {
    icon: Globe,
    title: "Save Without Borders",
    subtitle: "One Group, Any Location",
    description:
      "Invite friends or family from different countries. Everyone contributes and gets paid on time, wherever they are.",
    primaryColor: "#1a6b6b", // downy-700
    accentColor: "#66d9d0", // downy-300
    bgColor: "#f1fcfa", // downy-50
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
      {/* Colored Background Layer with decorative elements */}
      <View 
        className="absolute top-0 left-0 right-0 bottom-0 overflow-hidden"
        style={{ 
          height: height * 0.65,
          backgroundColor: slide.bgColor,
        }}
      >
        {/* Decorative circles */}
        <View 
          className="absolute rounded-full"
          style={{
            top: -80,
            right: -60,
            width: 200,
            height: 200,
            backgroundColor: slide.accentColor,
            opacity: 0.3,
          }}
        />
        <View 
          className="absolute rounded-full"
          style={{
            top: 150,
            left: -40,
            width: 150,
            height: 150,
            backgroundColor: slide.primaryColor,
            opacity: 0.15,
          }}
        />
        <View 
          className="absolute rounded-full"
          style={{
            bottom: 20,
            right: 30,
            width: 100,
            height: 100,
            backgroundColor: slide.accentColor,
            opacity: 0.2,
          }}
        />
      </View>

      {/* Full Screen Image */}
      <View className="absolute top-0 left-0 right-0" style={{ height: height * 0.65 }}>
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
              style={{ 
                backgroundColor: 'rgba(255, 255, 255, 0.95)',
                borderWidth: 1,
                borderColor: slide.accentColor,
              }}
            >
              <Text 
                className="text-sm font-semibold"
                style={{ color: slide.primaryColor }}
              >
                Skip
              </Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      )}

      {/* Content Card at Bottom with colored accent */}
      <View 
        className="absolute left-0 right-0 bottom-0 bg-white overflow-hidden"
        style={{ 
          paddingTop: 40,
          paddingBottom: 40,
          paddingHorizontal: 24,
          borderTopLeftRadius: 40,
          borderTopRightRadius: 40,
          shadowColor: slide.primaryColor,
          shadowOffset: {
            width: 0,
            height: -8,
          },
          shadowOpacity: 0.15,
          shadowRadius: 16,
          elevation: 12,
        }}
      >
        {/* Colored accent line at top */}
        <View 
          className="absolute top-0 left-0 right-0"
          style={{
            height: 4,
            backgroundColor: slide.primaryColor,
          }}
        />

        {/* Content */}
        <View className="items-center mb-6">
          <Text className="text-2xl mb-2 text-gray-900 text-center font-bold leading-tight px-4">
            {slide.title}
          </Text>

          <Text
            className="text-base mb-4 text-center font-semibold px-4"
            style={{ color: slide.primaryColor }}
          >
            {slide.subtitle}
          </Text>

          <Text className="text-gray-600 text-sm leading-6 text-center px-6 mb-6">
            {slide.description}
          </Text>
        </View>

        {/* Progress Indicators with colors */}
        <View className="flex-row justify-center space-x-2 mb-6 gap-1">
          {onboardingSlides.map((_, index) => (
            <View
              key={index}
              className="h-1.5 rounded-full"
              style={{
                width: index === currentSlide ? 28 : 8,
                backgroundColor: index === currentSlide 
                  ? slide.primaryColor
                  : slide.accentColor,
                opacity: index === currentSlide ? 1 : 0.3,
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
              backgroundColor: currentSlide === 0 ? "transparent" : slide.bgColor,
              borderWidth: currentSlide === 0 ? 0 : 1,
              borderColor: slide.accentColor,
            }}
          >
            <ChevronLeft size={20} style={{ borderColor : slide.primaryColor }} />
            <Text 
              className="ml-1 text-base font-medium"
              style={{ color: slide.primaryColor }}
            >
              Back
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={nextSlide}
            className="px-8 py-4 rounded-full flex-row items-center shadow-lg"
            style={{ 
              backgroundColor: slide.primaryColor,
              minWidth: 140,
              justifyContent: "center",
              shadowColor: slide.primaryColor,
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.3,
              shadowRadius: 8,
              elevation: 8,
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