import { useRouter } from "expo-router";
import {
  ChevronLeft,
  ChevronRight,
  Shield,
  Smartphone,
  TrendingUp,
  Users,
} from "lucide-react-native";
import React, { useState } from "react";
import { ScrollView, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { storage } from "@/utils/storage";

const onboardingSlides = [
  {
    icon: Users,
    title: "Welcome to ChamaPay",
    subtitle: "Digital Circular Savings App",
    description:
      "Join or create community savings groups (chamas) where members contribute regularly and receive payouts in rotating turns.",
    color: "#059669", // emerald-600
    bgColor: "#d1fae5", // emerald-100
  },
  {
    icon: Shield,
    title: "Secure & Transparent",
    subtitle: "Blockchain-Powered Trust",
    description:
      "Your contributions are secured by smart contracts. Every transaction is recorded on the blockchain for complete transparency.",
    color: "#0d9488", // teal-600
    bgColor: "#ccfbf1", // teal-100
  },
  {
    icon: TrendingUp,
    title: "Grow Together",
    subtitle: "Community-Based Savings",
    description:
      "Build financial discipline while helping your community. Save regularly and receive larger payouts when it's your turn.",
    color: "#059669", // emerald-600
    bgColor: "#d1fae5", // emerald-100
  },
  {
    icon: Smartphone,
    title: "Simple & Modern",
    subtitle: "Traditional Savings, Digital Experience",
    description:
      "No more manual record-keeping or geographical limitations. Manage your chamas from anywhere, anytime.",
    color: "#0d9488", // teal-600
    bgColor: "#ccfbf1", // teal-100
  },
];

export default function Onboarding() {
  const [currentSlide, setCurrentSlide] = useState(0);
  const router = useRouter();

  const nextSlide = async () => {
    if (currentSlide < onboardingSlides.length - 1) {
      setCurrentSlide(currentSlide + 1);
    } else {
      // Mark onboarding as seen before navigating to auth
      await storage.setHasSeenOnboarding(true);
      router.replace("/auth-screen");
    }
  };

  const prevSlide = () => {
    if (currentSlide > 0) {
      setCurrentSlide(currentSlide - 1);
    }
  };

  const slide = onboardingSlides[currentSlide];
  const IconComponent = slide.icon;


  return (
      <SafeAreaView className="flex-1 bg-white ">
        <View className="flex-1 px-6 justify-center">
          {/* Main content */}
          <ScrollView
            contentContainerStyle={{
              flexGrow: 1,
              justifyContent: 'center',
              paddingBottom: 40,
            }}
            showsVerticalScrollIndicator={false}
          >
            <View className="items-center">
              <View
                className="w-40 h-40 rounded-3xl shadow-lg items-center justify-center mb-10"
                style={{ backgroundColor: slide.bgColor }}
              >
                <IconComponent color={slide.color} size={60} />
              </View>

              <Text className="text-4xl mb-4 text-gray-900 text-center font-bold max-w-xs">
                {slide.title}
              </Text>

              <Text
                className="text-xl mb-8 text-center font-medium max-w-sm"
                style={{ color: "#059669" }}
              >
                {slide.subtitle}
              </Text>

              <Text className="text-gray-600 text-lg leading-relaxed max-w-sm mb-12 text-center">
                {slide.description}
              </Text>
            </View>
          </ScrollView>

          {/* Navigation */}
          <View className="flex-row items-center justify-between pb-6">
            <TouchableOpacity
              onPress={prevSlide}
              disabled={currentSlide === 0}
              className="p-3 flex-row items-center"
              style={{ opacity: currentSlide === 0 ? 0.3 : 1 }}
            >
              <ChevronLeft size={20} color="#6b7280" />
              <Text className="text-gray-500 ml-2 text-lg">Back</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={nextSlide}
              className="px-8 py-3 rounded-full flex-row items-center"
              style={{ backgroundColor: "#059669" }}
            >
              <Text className="text-white mr-2 text-lg">
                {currentSlide === onboardingSlides.length - 1
                  ? "Get Started"
                  : "Next"}
              </Text>
              <ChevronRight size={20} color="white" />
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
   
  );
}

