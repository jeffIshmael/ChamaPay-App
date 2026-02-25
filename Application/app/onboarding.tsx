import { storage } from "@/Utils/storage";
import { useRouter } from "expo-router";
import {
  ChevronLeft,
  ChevronRight,
} from "lucide-react-native";
import React, { useRef, useState } from "react";
import {
  Dimensions,
  FlatList,
  Image,
  NativeScrollEvent,
  NativeSyntheticEvent,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

const { width, height } = Dimensions.get("window");

const onboardingSlides = [
  {
    id: "1",
    title: "Create or Join a Chama",
    description:
      "Easily create a private savings group for friends or join public ones to meet your goals.",
    primaryColor: "#26a6a2",
    accentColor: "#E6F7F6",
    imageSource: require("@/assets/images/creat.png"),
  },
  {
    id: "2",
    title: "Save in USDC (Digital Dollar)",
    description:
      "Save in USDC — a stable digital dollar that protects your money from inflation and works globally.",
    primaryColor: "#26a6a2",
    accentColor: "#E8FBF9",
    imageSource: require("@/assets/images/stable.png"),
  },
  {
    id: "3",
    title: "Automatic Payouts & Transparency",
    description:
      "Enjoy stress-free savings with scheduled payouts and real-time balance tracking.",
    primaryColor: "#26a6a2",
    accentColor: "#F0FDFA",
    imageSource: require("@/assets/images/payoutProcessed.png"),
  },
];

export default function Onboarding() {
  const [currentSlide, setCurrentSlide] = useState(0);
  const router = useRouter();
  const flatListRef = useRef<FlatList>(null);

  const updateCurrentSlideIndex = (
    e: NativeSyntheticEvent<NativeScrollEvent>
  ) => {
    const contentOffsetX = e.nativeEvent.contentOffset.x;
    const currentIndex = Math.round(contentOffsetX / width);
    setCurrentSlide(currentIndex);
  };

  const nextSlide = async () => {
    const nextIndex = currentSlide + 1;
    if (nextIndex < onboardingSlides.length) {
      flatListRef.current?.scrollToIndex({
        index: nextIndex,
        animated: true,
      });
      setCurrentSlide(nextIndex);
    } else {
      await storage.setHasSeenOnboarding(true);
      router.replace("/new-auth-screen");
    }
  };

  const prevSlide = () => {
    const prevIndex = currentSlide - 1;
    if (prevIndex >= 0) {
      flatListRef.current?.scrollToIndex({
        index: prevIndex,
        animated: true,
      });
      setCurrentSlide(prevIndex);
    }
  };

  const skipToEnd = async () => {
    await storage.setHasSeenOnboarding(true);
    router.replace("/new-auth-screen");
  };

  const Slide = ({ item }: { item: typeof onboardingSlides[0] }) => {
    return (
      <View style={{ width, height }} className="bg-white">
        {/* Top Image Section */}
        <View
          style={{
            height: height * 0.6,
            width: width,
            borderBottomLeftRadius: 60,
            borderBottomRightRadius: 60,
            overflow: "hidden",
            backgroundColor: item.accentColor,
          }}
        >
          <Image
            source={item.imageSource}
            style={{ width: "100%", height: "100%" }}
            resizeMode="cover"
          />

          {/* Soft overlay */}
          <View style={styles.overlay} />
        </View>

        {/* Text Section */}
        <View
          className="flex-1 bg-white"
          style={{
            paddingTop: 50,
            paddingHorizontal: 30,
          }}
        >
          <Text className="text-[34px] font-extrabold text-center text-[#111827] leading-tight tracking-tight">
            {item.title}
          </Text>

          <Text className="text-gray-500 text-lg text-center leading-relaxed font-medium mt-6">
            {item.description}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <View className="flex-1 bg-white">
      <StatusBar translucent backgroundColor="transparent" barStyle="dark-content" />

      {/* Skip Button */}
      <View className="absolute top-14 right-6 z-20">
        <TouchableOpacity
          onPress={skipToEnd}
          activeOpacity={0.7}
          style={styles.skipButton}
        >
          <Text style={styles.skipText}>Skip</Text>
          
        </TouchableOpacity>
      </View>

      <FlatList
        ref={flatListRef}
        onMomentumScrollEnd={updateCurrentSlideIndex}
        data={onboardingSlides}
        renderItem={({ item }) => <Slide item={item} />}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        bounces={false}
        keyExtractor={(item) => item.id}
      />

      {/* Footer */}
      <View style={styles.footer}>
        {/* Progress Dots */}
        <View style={styles.dotsContainer}>
          {onboardingSlides.map((_, index) => (
            <View
              key={index}
              style={[
                styles.dot,
                {
                  width: index === currentSlide ? 28 : 8,
                  backgroundColor:
                    index === currentSlide
                      ? onboardingSlides[currentSlide].primaryColor
                      : "#E5E7EB",
                  opacity: index === currentSlide ? 1 : 0.5,
                },
              ]}
            />
          ))}
        </View>

        {/* Navigation */}
        <View style={styles.navigationRow}>
          <View style={{ flex: 1 }}>
            {currentSlide > 0 && (
              <TouchableOpacity
                onPress={prevSlide}
                style={styles.prevButton}
              >
                <ChevronLeft size={20} color="#9ca3af" />
                <Text style={styles.prevText}>Back</Text>
              </TouchableOpacity>
            )}
          </View>

          <View style={{ flex: 1, alignItems: "flex-end" }}>
            <TouchableOpacity
              onPress={nextSlide}
              activeOpacity={0.85}
              style={[
                styles.nextButton,
                {
                  backgroundColor:
                    onboardingSlides[currentSlide].primaryColor,
                },
              ]}
            >
              <Text style={styles.nextText}>
                {currentSlide === onboardingSlides.length - 1
                  ? "Get Started"
                  : "Next"}
              </Text>
              <ChevronRight size={18} color="white" style={{ marginLeft: 6 }} />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(255,255,255,0.15)",
  },
  skipButton: {
    backgroundColor: "rgba(255,255,255,0.95)",
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 999,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 3,
  },
  skipText: {
    color: "#26a6a2",
    fontWeight: "800",
    fontSize: 13,
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  footer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 30,
    paddingBottom: 50,
    paddingTop: 10,
    backgroundColor: "#fff",
  },
  dotsContainer: {
    flexDirection: "row",
    justifyContent: "center",
    marginBottom: 30,
    gap: 8,
  },
  dot: {
    height: 8,
    borderRadius: 20,
  },
  navigationRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  prevButton: {
    flexDirection: "row",
    alignItems: "center",
  },
  prevText: {
    marginLeft: 4,
    color: "#9ca3af",
    fontWeight: "700",
    fontSize: 16,
  },
  nextButton: {
    paddingHorizontal: 18,
    paddingVertical: 18,
    borderRadius: 999,
    flexDirection: "row",
    alignItems: "center",
    minWidth: 130,
    justifyContent: "center",
    shadowColor: "#26a6a2",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 8,
  },
  nextText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
});