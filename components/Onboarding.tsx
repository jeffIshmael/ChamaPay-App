import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Dimensions,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import {
  ChevronRight,
  ChevronLeft,
  Users,
  Shield,
  TrendingUp,
  Smartphone,
} from "lucide-react-native";

interface OnboardingProps {
  onNext: () => void;
}

const onboardingSlides = [
  {
    icon: Users,
    title: "Welcome to ChamaPay",
    subtitle: "Digital Chama Savings Groups",
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

const { height } = Dimensions.get("window");

export function Onboarding({ onNext }: OnboardingProps) {
  const [currentSlide, setCurrentSlide] = useState(0);

  const nextSlide = () => {
    if (currentSlide < onboardingSlides.length - 1) {
      setCurrentSlide(currentSlide + 1);
    } else {
      onNext();
    }
  };

  const prevSlide = () => {
    if (currentSlide > 0) {
      setCurrentSlide(currentSlide - 1);
    }
  };

  const goToSlide = (index: number) => {
    setCurrentSlide(index);
  };

  const slide = onboardingSlides[currentSlide];
  const IconComponent = slide.icon;

  const getFeatureHighlights = () => {
    switch (currentSlide) {
      case 0:
        return ["Create or join savings groups", "Automatic payout rotation"];
      case 1:
        return ["Smart contract security", "Transparent blockchain records"];
      case 2:
        return ["Build financial discipline", "Support your community"];
      case 3:
        return ["Mobile-first experience", "No geographical limits"];
      default:
        return [];
    }
  };

  return (
    <LinearGradient
      colors={["#ecfdf5", "#f0fdfa"]} // emerald-50 to teal-50
      className="flex-1"
    >
      <View className="flex-1 px-6" style={{ paddingTop: 60 }}>
        {/* Progress indicators */}
        <View className="flex-row justify-center space-x-2 mb-8">
          {onboardingSlides.map((_, index) => (
            <TouchableOpacity
              key={index}
              onPress={() => goToSlide(index)}
              className="h-2 rounded-full"
              style={{
                backgroundColor:
                  index === currentSlide
                    ? "#059669"
                    : index < currentSlide
                      ? "#34d399"
                      : "#d1d5db",
                width: index === currentSlide ? 32 : 8,
                marginHorizontal: 4,
              }}
            />
          ))}
        </View>

        {/* Main content */}
        <ScrollView
          className="flex-1"
          contentContainerStyle={{
            flexGrow: 1,
            justifyContent: "center",
            alignItems: "center",
            paddingHorizontal: 16,
          }}
        >
          <View
            className="w-32 h-32 rounded-3xl shadow-lg items-center justify-center mb-8"
            style={{ backgroundColor: slide.bgColor }}
          >
            <IconComponent color={slide.color} size={48} />
          </View>

          <Text className="text-3xl mb-3 text-gray-900 text-center font-bold max-w-xs">
            {slide.title}
          </Text>

          <Text
            className="text-lg mb-6 text-center font-medium max-w-sm"
            style={{ color: "#059669" }}
          >
            {slide.subtitle}
          </Text>

          <Text className="text-gray-600 leading-relaxed max-w-sm mb-8 text-base text-center">
            {slide.description}
          </Text>

          {/* Feature highlights */}
          <View className="w-full max-w-sm mb-8">
            {getFeatureHighlights().map((feature, index) => (
              <View
                key={index}
                className="bg-white/70 rounded-lg p-3 flex-row items-center mb-3"
                style={{ backgroundColor: "rgba(255, 255, 255, 0.7)" }}
              >
                <View
                  className="w-2 h-2 rounded-full mr-3"
                  style={{ backgroundColor: slide.color }}
                />
                <Text className="text-sm text-gray-700 flex-1">{feature}</Text>
              </View>
            ))}
          </View>
        </ScrollView>

        {/* Navigation */}
        <View className="flex-row items-center justify-between pb-8">
          <TouchableOpacity
            onPress={prevSlide}
            disabled={currentSlide === 0}
            className="p-2 flex-row items-center"
            style={{ opacity: currentSlide === 0 ? 0.3 : 1 }}
          >
            <ChevronLeft size={16} color="#6b7280" />
            <Text className="text-gray-500 ml-2">Back</Text>
          </TouchableOpacity>

          <View className="flex-row">
            {onboardingSlides.map((_, index) => (
              <View
                key={index}
                className="w-1.5 h-1.5 rounded-full mx-0.5"
                style={{
                  backgroundColor:
                    index === currentSlide ? "#059669" : "#d1d5db",
                }}
              />
            ))}
          </View>

          <TouchableOpacity
            onPress={nextSlide}
            className="px-6 py-2 rounded-full flex-row items-center"
            style={{ backgroundColor: "#059669" }}
          >
            <Text className="text-white mr-2">
              {currentSlide === onboardingSlides.length - 1
                ? "Get Started"
                : "Next"}
            </Text>
            <ChevronRight size={16} color="white" />
          </TouchableOpacity>
        </View>
      </View>
    </LinearGradient>
  );
}
