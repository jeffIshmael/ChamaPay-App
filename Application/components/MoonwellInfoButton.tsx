import React, { useEffect, useRef, useState } from "react";
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  Animated,
  Easing,
  Pressable,
  ScrollView,
  Linking,
} from "react-native";
import { BlurView } from "expo-blur";
import { HelpCircle, X, PiggyBank, HandCoins, TrendingUp, ExternalLink } from "lucide-react-native";
import * as Haptics from "expo-haptics";

const MOONWELL_WEBSITE = "https://moonwell.fi";

type MoonwellInfoButtonProps = {
  size?: number;
  color?: string;
  currentApy?: number | null;
};

export default function MoonwellInfoButton({
  size = 18,
  color = "#6b7280",
  currentApy = null,
}: MoonwellInfoButtonProps) {
  const [visible, setVisible] = useState(false);
  const shake = useRef(new Animated.Value(0)).current;
  const fade = useRef(new Animated.Value(0)).current;
  const slide = useRef(new Animated.Value(28)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.delay(2800),
        Animated.timing(shake, {
          toValue: 1,
          duration: 70,
          easing: Easing.linear,
          useNativeDriver: true,
        }),
        Animated.timing(shake, {
          toValue: -1,
          duration: 70,
          easing: Easing.linear,
          useNativeDriver: true,
        }),
        Animated.timing(shake, {
          toValue: 1,
          duration: 70,
          easing: Easing.linear,
          useNativeDriver: true,
        }),
        Animated.timing(shake, {
          toValue: -1,
          duration: 70,
          easing: Easing.linear,
          useNativeDriver: true,
        }),
        Animated.timing(shake, {
          toValue: 0,
          duration: 70,
          easing: Easing.linear,
          useNativeDriver: true,
        }),
        Animated.delay(4200),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [shake]);

  useEffect(() => {
    if (visible) {
      fade.setValue(0);
      slide.setValue(28);
      Animated.parallel([
        Animated.timing(fade, {
          toValue: 1,
          duration: 220,
          useNativeDriver: true,
        }),
        Animated.spring(slide, {
          toValue: 0,
          friction: 9,
          tension: 80,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible, fade, slide]);

  const rotate = shake.interpolate({
    inputRange: [-1, 1],
    outputRange: ["-12deg", "12deg"],
  });

  const open = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    setVisible(true);
  };

  const close = () => setVisible(false);

  const apyLabel =
    currentApy != null && Number.isFinite(currentApy)
      ? `${currentApy.toFixed(1)}%`
      : null;

  return (
    <>
      <TouchableOpacity
        onPress={open}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        activeOpacity={0.7}
        accessibilityRole="button"
        accessibilityLabel="What is Moonwell?"
      >
        <Animated.View style={{ transform: [{ rotate }] }}>
          <HelpCircle size={size} color={color} strokeWidth={2.25} />
        </Animated.View>
      </TouchableOpacity>

      <Modal
        visible={visible}
        transparent
        animationType="none"
        statusBarTranslucent
        onRequestClose={close}
      >
        <View className="flex-1 justify-end">
          {/* Dim + blur backdrop so the open sheet is obvious */}
          <Animated.View
            pointerEvents="none"
            style={{ opacity: fade }}
            className="absolute inset-0"
          >
            <BlurView intensity={28} tint="dark" className="absolute inset-0" />
            <View className="absolute inset-0 bg-black/55" />
          </Animated.View>

          <Pressable className="absolute inset-0" onPress={close} />

          <Animated.View
            style={{
              opacity: fade,
              transform: [{ translateY: slide }],
            }}
            className="bg-white rounded-t-[28px] max-h-[88%] shadow-2xl"
          >
            <View className="items-center pt-3 pb-1">
              <View className="w-10 h-1 rounded-full bg-gray-300" />
            </View>

            <View className="flex-row items-center justify-between px-5 pt-2 pb-3">
              <View className="flex-row items-center flex-1 pr-3">
                <View className="w-10 h-10 rounded-full bg-blue-50 items-center justify-center mr-3">
                  <HelpCircle size={20} color="#2563eb" />
                </View>
                <View className="flex-1">
                  <Text className="text-xl font-bold text-gray-900">
                    Moonwell, simply put
                  </Text>
                  <Text className="text-sm text-gray-500 mt-0.5">
                    How Save & Earn works
                  </Text>
                </View>
              </View>
              <TouchableOpacity
                onPress={close}
                className="w-9 h-9 rounded-full bg-gray-100 items-center justify-center"
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <X size={18} color="#4b5563" />
              </TouchableOpacity>
            </View>

            <ScrollView
              className="px-5"
              contentContainerStyle={{ paddingBottom: 28 }}
              showsVerticalScrollIndicator={false}
              bounces={false}
            >
              <Text className="text-gray-700 text-[15px] leading-6 mb-5">
                Think of Moonwell like a community savings pot that other people
                can borrow from. When you put money in moonwell through Chamapay, it is
                supplied to that pot. Borrowers pay interest, and that interest
                is what you earn.
              </Text>

              <View className="bg-slate-50 rounded-2xl border border-slate-100 p-4 mb-3">
                <View className="flex-row items-start">
                  <View className="w-9 h-9 rounded-xl bg-emerald-50 items-center justify-center mr-3 mt-0.5">
                    <PiggyBank size={18} color="#059669" />
                  </View>
                  <View className="flex-1">
                    <Text className="text-gray-900 font-bold text-[15px] mb-1">
                      What happens when you supply
                    </Text>
                    <Text className="text-gray-600 text-[14px] leading-5">
                      Your deposit (KES or USDC) is converted and placed into the
                      Moonwell USDC pool. It stays yours. Interest starts adding
                      to your balance automatically. You do not need to do
                      anything else.
                    </Text>
                  </View>
                </View>
              </View>

              <View className="bg-slate-50 rounded-2xl border border-slate-100 p-4 mb-3">
                <View className="flex-row items-start">
                  <View className="w-9 h-9 rounded-xl bg-blue-50 items-center justify-center mr-3 mt-0.5">
                    <HandCoins size={18} color="#2563eb" />
                  </View>
                  <View className="flex-1">
                    <Text className="text-gray-900 font-bold text-[15px] mb-1">
                      Taking money out
                    </Text>
                    <Text className="text-gray-600 text-[14px] leading-5">
                      You can withdraw anytime. You get back what you put in,
                      plus whatever you have earned so far. There is no lock-up
                      period.
                    </Text>
                  </View>
                </View>
              </View>

              <View className="bg-amber-50 rounded-2xl border border-amber-100 p-4 mb-4">
                <View className="flex-row items-start">
                  <View className="w-9 h-9 rounded-xl bg-amber-100/80 items-center justify-center mr-3 mt-0.5">
                    <TrendingUp size={18} color="#d97706" />
                  </View>
                  <View className="flex-1">
                    <Text className="text-gray-900 font-bold text-[15px] mb-1">
                      Why the % rate jumps around
                    </Text>
                    <Text className="text-gray-600 text-[14px] leading-5">
                      The APY you see
                      {apyLabel ? ` (right now about ${apyLabel})` : ""} is a
                      live market rate, not a fixed bank rate. When many people
                      want to borrow, it can climb high (even past 100%). When
                      demand cools, it can drop to a few percent. That number
                      can change during the day, so treat it as a snapshot, not a
                      promise.
                    </Text>
                  </View>
                </View>
              </View>

              <Text className="text-gray-500 text-[12px] leading-4 mb-4 text-center px-2">
                Earnings are paid by borrowers on Moonwell. Chamapay shows you
                the live balance and rate.
              </Text>

              <TouchableOpacity
                onPress={() => Linking.openURL(MOONWELL_WEBSITE).catch(() => {})}
                className="flex-row items-center justify-center mb-4 py-2"
                activeOpacity={0.7}
              >
                <Text className="text-blue-600 font-semibold text-[14px] mr-1.5">
                  Learn more on moonwell.fi
                </Text>
                <ExternalLink size={14} color="#2563eb" />
              </TouchableOpacity>

              <TouchableOpacity
                onPress={close}
                className="bg-blue-600 py-4 rounded-2xl items-center mb-2"
                activeOpacity={0.85}
              >
                <Text className="text-white font-bold text-[16px]">Got it</Text>
              </TouchableOpacity>
            </ScrollView>
          </Animated.View>
        </View>
      </Modal>
    </>
  );
}
