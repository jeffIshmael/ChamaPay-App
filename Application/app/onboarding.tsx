import {
  ChevronLeft,
  ChevronRight,
  Shield,
  Smartphone,
  Users,
  Globe,
} from "lucide-react-native";
import React, { useState } from "react";
import { ScrollView, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";

const onboardingSlides = [
  {
    icon: Users,
    title: "Welcome to ChamaPay",
    subtitle: "A Better Way to Save Together",
    description:
      "Create or join digital savings groups where members contribute regularly and receive payouts in a fair rotating order — just like a chama.",
    color: "#059669",
    bgColor: "#d1fae5",
  },
  {
    icon: Shield,
    title: "Your Money Is Safe",
    subtitle: "Protected by Built-In Rules",
    description:
      "ChamaPay uses automated rules to protect contributions and ensure payouts happen exactly as agreed — no one can change or interfere with them.",
    color: "#0d9488",
    bgColor: "#ccfbf1",
  },
  {
    icon: Smartphone,
    title: "Everything Happens Automatically",
    subtitle: "No Stress, No Follow-Ups",
    description:
      "Contributions, records, and payouts are handled automatically, so there’s no chasing members or manual tracking.",
    color: "#059669",
    bgColor: "#d1fae5",
  },
  {
    icon: Globe,
    title: "Save Without Borders",
    subtitle: "One Group, Any Location",
    description:
      "Invite friends or family from different countries. Everyone contributes and gets paid on time, wherever they are.",
    color: "#0d9488",
    bgColor: "#ccfbf1",
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

  const slide = onboardingSlides[currentSlide];
  const IconComponent = slide.icon;

  return (
    <SafeAreaView className="flex-1 bg-white">
      <View className="flex-1 px-6 justify-center">
        <ScrollView
          contentContainerStyle={{
            flexGrow: 1,
            justifyContent: "center",
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

            {/* Progress Indicators */}
            <View className="flex-row space-x-2">
              {onboardingSlides.map((_, index) => (
                <View
                  key={index}
                  className={`h-2 rounded-full ${
                    index === currentSlide
                      ? "w-6 bg-emerald-600"
                      : "w-2 bg-gray-300"
                  }`}
                />
              ))}
            </View>
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
                ? "Start Saving"
                : "Next"}
            </Text>
            <ChevronRight size={20} color="white" />
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}
