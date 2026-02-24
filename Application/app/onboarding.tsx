import { useRouter } from "expo-router";
import {
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  TrendingUp,
  Users
} from "lucide-react-native";
import React, { useState } from "react";
import {
  Dimensions,
  Image,
  Text,
  TouchableOpacity,
  View
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const { width, height } = Dimensions.get("window");

const onboardingSlides = [
  {
    icon: Users,
    title: "Create or Join a Chama",
    description:
      "Easily create a private savings group for friends or join public ones to meet your goals.",
    primaryColor: "#26a6a2", // downy-500
    accentColor: "#66d9d0", // downy-300
    bgColor: "#ffffff",
    imageSource: require("@/assets/images/welcome.png"),
  },
  {
    icon: TrendingUp,
    title: "Save in USDC (Digital Dollar)",
    description:
      "Protect your savings from local currency inflation. Save in USDC for global inclusivity and stability.",
    primaryColor: "#26a6a2",
    accentColor: "#a3ece4",
    bgColor: "#ffffff",
    imageSource: require("@/assets/images/secure.png"),
  },
  {
    icon: ShieldCheck,
    title: "Automatic Payouts & Transparency",
    description:
      "Enjoy stress-free savings with scheduled payouts and real-time balance tracking. Get notified the moment you receive your payout!",
    primaryColor: "#26a6a2",
    accentColor: "#d1f6f1",
    bgColor: "#ffffff",
    imageSource: require("@/assets/images/payoutProcessed.png"),
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

  return (
    <View className="flex-1 bg-white">
      <SafeAreaView className="flex-1">
        {/* Skip Button - Top Right */}
        <View className="flex-row justify-end px-6 pt-2">
          {currentSlide < onboardingSlides.length - 1 ? (
            <TouchableOpacity onPress={skipToEnd} className="flex-row items-center">
              <Text className="text-gray-400 text-base font-medium">Skip</Text>
              <ChevronRight size={18} color="#9ca3af" />
            </TouchableOpacity>
          ) : (
            <View style={{ height: 24 }} />
          )}
        </View>

        {/* Visual Content Section - Top Half (Aesthetic cards) */}
        <View className="flex-1 justify-center items-center px-6">
          {/* Decorative background elements (circles) */}
          <View
            className="absolute rounded-full"
            style={{
              width: width * 0.8,
              height: width * 0.8,
              backgroundColor: slide.accentColor,
              opacity: 0.1,
              top: height * 0.05
            }}
          />

          {/* Main Card Image */}
          <View
            className="bg-white rounded-3xl overflow-hidden shadow-2xl"
            style={{
              width: width * 0.75,
              height: height * 0.35,
              elevation: 10,
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 10 },
              shadowOpacity: 0.1,
              shadowRadius: 20,
            }}
          >
            <Image
              source={slide.imageSource}
              style={{ width: "100%", height: "100%" }}
              resizeMode="contain"
            />
          </View>

          {/* Floating Icon Badge (WanderWise style item) */}
          <View
            className="absolute bg-white p-4 rounded-2xl shadow-lg border border-gray-50"
            style={{
              top: height * 0.1,
              right: width * 0.08,
            }}
          >
            <slide.icon size={24} color={slide.primaryColor} />
          </View>
        </View>

        {/* Text Content Section */}
        <View className="px-10 pb-10">
          <Text className="text-3xl font-extrabold text-[#1a1a1a] mb-4 leading-tight">
            {slide.title}
          </Text>
          <Text className="text-gray-500 text-lg leading-relaxed mb-10">
            {slide.description}
          </Text>

          {/* Bottom Navigation Row */}
          <View className="flex-row items-center justify-between">
            {/* Back Button */}
            <TouchableOpacity
              onPress={prevSlide}
              style={{ opacity: currentSlide === 0 ? 0 : 1 }}
              disabled={currentSlide === 0}
              className="flex-row items-center"
            >
              <ChevronLeft size={20} color="#9ca3af" />
              <Text className="text-gray-400 text-lg font-medium ml-1">Prev</Text>
            </TouchableOpacity>

            {/* Progress Dots */}
            <View className="flex-row space-x-2 gap-1.5">
              {onboardingSlides.map((_, index) => (
                <View
                  key={index}
                  className="h-2 rounded-full"
                  style={{
                    width: index === currentSlide ? 20 : 8,
                    backgroundColor: index === currentSlide ? slide.primaryColor : "#e5e7eb",
                  }}
                />
              ))}
            </View>

            {/* Next/Proceed Button */}
            <TouchableOpacity
              onPress={nextSlide}
              className="px-8 py-3.5 rounded-2xl shadow-md"
              style={{
                backgroundColor: slide.primaryColor,
                minWidth: 120,
                alignItems: "center"
              }}
            >
              <Text className="text-white text-lg font-bold">
                {currentSlide === onboardingSlides.length - 1 ? "Proceed" : "Next"}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    </View>
  );
}
