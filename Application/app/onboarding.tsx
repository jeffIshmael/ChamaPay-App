import { storage } from "@/Utils/storage";
import { useRouter } from "expo-router";
import { ChevronRight } from "lucide-react-native";
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

const { width } = Dimensions.get("window");

type OnboardingSlide = {
  id: string;
  title: string;
  description: string;
  features: string[];
  cardColor: string;
  imageSource: any;
};

const onboardingSlides: OnboardingSlide[] = [
  {
    id: "1",
    title: "Create or join chama",
    description:
      "Bring the trusted tradition of chamas into the digital age.",
    features: [
      "Private invite-only groups",
      "Automatic payouts",
      "Transparent records",
    ],
    cardColor: "#0F7A6E",
    imageSource: require("@/assets/images/screen1.png"),
  },
  {
    id: "2",
    title: "Grow Your Savings",
    description:
      "Put your idle USDC to work and earn passive yield while keeping full control of your funds.",
    features: [
      "Earn 4–8% APY",
      "Deposit or withdraw anytime",
      "No lock-up period",
    ],
    cardColor: "#0F7A6E",
    imageSource: require("@/assets/images/screen2.png"),
  },
  {
    id: "3",
    title: "Cash In & Cash Out",
    description:
      "Move money between M-Pesa and your ChamaPay wallet in just a few taps.",
    features: [
      "Instant M-Pesa deposits",
      "Fast M-Pesa withdrawals",
      "Low transaction fees",
    ],
    cardColor: "#0F7A6E",
    imageSource: require("@/assets/images/screen3.png"),
  },
];

export default function Onboarding() {
  const router = useRouter();
  const flatListRef = useRef<FlatList>(null);

  const [currentSlide, setCurrentSlide] = useState(0);

  const updateCurrentSlideIndex = (
    e: NativeSyntheticEvent<NativeScrollEvent>
  ) => {
    const index = Math.round(e.nativeEvent.contentOffset.x / width);
    setCurrentSlide(index);
  };

  const goToIndex = (index: number) => {
    flatListRef.current?.scrollToIndex({
      index,
      animated: true,
    });
    setCurrentSlide(index);
  };

  const nextSlide = async () => {
    if (currentSlide < onboardingSlides.length - 1) {
      goToIndex(currentSlide + 1);
    } else {
      await storage.setHasSeenOnboarding(true);
      router.replace("/new-auth-screen");
    }
  };

  const skip = async () => {
    await storage.setHasSeenOnboarding(true);
    router.replace("/new-auth-screen");
  };

  const Slide = ({ item }: { item: OnboardingSlide }) => (
    <View style={styles.container}>
      <View style={styles.imageSection}>
        <TouchableOpacity
          onPress={skip}
          style={styles.skipButton}
        >
          <Text style={styles.skipText}>Skip </Text>
        </TouchableOpacity>

        <Image
          source={item.imageSource}
          style={styles.image}
          resizeMode="contain"
        />
      </View>

      <View
        style={[
          styles.bottomCard,
          { backgroundColor: item.cardColor },
        ]}
      >
        <Text style={styles.title}>{item.title}</Text>

        <Text style={styles.description}>
          {item.description}
        </Text>

        <View style={styles.features}>
          {item.features.map((feature, index) => (
            <View
              key={index}
              style={styles.featureRow}
            >
              <View style={styles.check}>
                <Text style={styles.checkText}>✓</Text>
              </View>

              <Text style={styles.featureText}>
                {feature}
              </Text>
            </View>
          ))}
        </View>

        <View style={{ flex: 1 }} />

        <View style={styles.dotsRow}>
          {onboardingSlides.map((_, index) => (
            <View
              key={index}
              style={[
                styles.dot,
                {
                  width: currentSlide === index ? 24 : 8,
                  opacity: currentSlide === index ? 1 : 0.35,
                },
              ]}
            />
          ))}
        </View>

        <TouchableOpacity
          style={styles.button}
          onPress={nextSlide}
          activeOpacity={0.85}
        >
          <Text
            style={[
              styles.buttonText,
              { color: item.cardColor },
            ]}
          >
            {currentSlide === onboardingSlides.length - 1
              ? "Get Started"
              : "Next"}
          </Text>

          <ChevronRight
            color={item.cardColor}
            size={20}
          />
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={{ flex: 1 }}>
      <StatusBar
        translucent
        backgroundColor="transparent"
        barStyle="dark-content"
      />

      <FlatList
        ref={flatListRef}
        data={onboardingSlides}
        horizontal
        pagingEnabled
        bounces={false}
        showsHorizontalScrollIndicator={false}
        keyExtractor={(item) => item.id}
        onMomentumScrollEnd={updateCurrentSlideIndex}
        renderItem={({ item }) => <Slide item={item} />}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width,
    flex: 1,
    backgroundColor: "#fff",
  },

  imageSection: {
    flex: 0.58,
    backgroundColor: "#fff",
    justifyContent: "center",
    alignItems: "center",
    paddingTop: 40,
  },
  features: {
    marginTop: 24,
  },

  featureRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 14,
  },

  check: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: "rgba(255,255,255,0.15)",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },

  featureText: {
    fontSize: 15,
    fontWeight: "600",
    lineHeight: 20,
  },

  checkText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "800",
  },

  bottomCard: {
    flex: 0.42,
    borderTopLeftRadius: 42,
    borderTopRightRadius: 42,
    paddingHorizontal: 30,
    paddingTop: 34,
    paddingBottom: 30,
  },

  image: {
    width: "94%",
    height: "94%",
  },

  skipButton: {
    position: "absolute",
    top: 55,
    right: 24,
  },

  skipText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#6B7280",
  },


  title: {
    fontSize: 34,
    fontWeight: "800",
    color: "#fff",
    lineHeight: 40,
    textAlign: "left",
  },

  description: {
    marginTop: 16,
    fontSize: 17,
    lineHeight: 28,
    color: "rgba(255,255,255,0.85)",
    textAlign: "left",
  },

  dotsRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 24,
  },

  dot: {
    height: 8,
    borderRadius: 4,
    marginHorizontal: 4,
    backgroundColor: "#fff",
  },

  button: {
    height: 58,
    borderRadius: 30,
    backgroundColor: "#fff",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },

  buttonText: {
    fontSize: 17,
    fontWeight: "700",
    marginRight: 8,
  },
});