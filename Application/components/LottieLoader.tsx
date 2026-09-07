import React from "react";
import { Text, View } from "react-native";
import LottieView from "lottie-react-native";

export type LottieSource =
  | "home"
  | "notifications"
  | "history"
  | "schedule"
  | "wallet";

const SOURCES: Record<LottieSource, ReturnType<typeof require>> = {
  home: require("@/assets/lottie/home-lottie.json"),
  notifications: require("@/assets/lottie/notification-lottie.json"),
  history: require("@/assets/lottie/history.json"),
  schedule: require("@/assets/lottie/chama-schedule.json"),
  wallet: require("@/assets/lottie/wallettxs-lotie.json"),
};

type Props = {
  source: LottieSource;
  label?: string;
  /** Width/height of the Lottie view */
  size?: number;
  /** Playback speed (1 = normal). Defaults slower for a calmer load. */
  speed?: number;
  className?: string;
};

/**
 * Shared looping Lottie for screen/section loading states.
 */
export default function LottieLoader({
  source,
  label,
  size = 140,
  speed = 0.55,
  className = "",
}: Props) {
  // Large canvases leave empty padding under the art — pull the label up.
  const labelPull = Math.round(size * 0.18);

  return (
    <View className={`w-full items-center justify-center ${className}`}>
      <LottieView
        source={SOURCES[source]}
        autoPlay
        loop
        speed={speed}
        style={{ width: size, height: size }}
      />
      {label ? (
        <Text
          className="text-center text-gray-500"
          style={{ marginTop: -labelPull }}
        >
          {label}
        </Text>
      ) : null}
    </View>
  );
}
