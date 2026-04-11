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

type OnboardingSlide = {
  id: string;
  title: string;
  description: string;
  primaryColor: string;
  accentColor: string;
  imageSource: any;
  isFullDesign?: boolean;
};

const onboardingSlides: OnboardingSlide[] = [
  {
    id: "1",
    title: "",
    description: "",
    primaryColor: "#26a6a2",
    accentColor: "#E6F7F6",
    imageSource: require("@/assets/images/firstOnboard.png"),
    isFullDesign: true,
  },
  {
    id: "2",
    title: "",
    description: "",
    primaryColor: "#26a6a2",
    accentColor: "#E8FBF9",
    imageSource: require("@/assets/images/second.png"),
    isFullDesign: true,
  },
  {
    id: "3",
    title: "",
    description: "",
    primaryColor: "#26a6a2",
    accentColor: "#F0FDFA",
    imageSource: require("@/assets/images/third.png"),
    isFullDesign: true,
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

  const Slide = ({ item }: { item: OnboardingSlide }) => {
    if (item.isFullDesign) {
      return (
        <View style={{ width, height, backgroundColor: item.accentColor }}>
          <Image
            source={item.imageSource}
            style={{ width: "100%", height: "100%" }}
            resizeMode="cover"
          />
        </View>
      );
    }

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
        <View style={{ width: 60, alignItems: "flex-start" }}>
          {currentSlide > 0 && (
            <TouchableOpacity onPress={prevSlide} style={styles.navButton}>
              <Text style={styles.navText}>Previous</Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.dotsContainer}>
          {onboardingSlides.map((_, index) => (
            <View
              key={index}
              style={[
                styles.dot,
                {
                  width: index === currentSlide ? 20 : 6,
                  backgroundColor: "#fff",
                  opacity: index === currentSlide ? 1 : 0.4,
                },
              ]}
            />
          ))}
        </View>

        <View style={{ width: 60, alignItems: "flex-end" }}>
          <TouchableOpacity onPress={nextSlide} style={styles.navButton}>
            <Text style={[styles.navText, { fontWeight: "bold" }]}>
              {currentSlide === onboardingSlides.length - 1 ? "Proceed >" : "Next"}
            </Text>
          </TouchableOpacity>
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
  footer: {
    position: "absolute",
    bottom: 50,
    alignSelf: "center",
    width: width * 0.85,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "rgba(0,0,0,0.8)",
    borderRadius: 999,
    paddingVertical: 16,
    paddingHorizontal: 24,
  },
  dotsContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  dot: {
    height: 6,
    borderRadius: 3,
  },
  navButton: {
    paddingVertical: 4,
  },
  navText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
});