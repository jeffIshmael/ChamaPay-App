import React, { useEffect, useRef, useState } from "react";
import { Modal, Text, View } from "react-native";
import LottieView from "lottie-react-native";

type Props = {
  visible: boolean;
  onDone: () => void;
  amountLabel?: string;
};

export default function GoalDepositSuccess({ visible, onDone, amountLabel }: Props) {
  const lottieRef = useRef<LottieView>(null);
  const [phase, setPhase] = useState<"lottie" | "check">("lottie");

  useEffect(() => {
    if (!visible) {
      setPhase("lottie");
      return;
    }
    lottieRef.current?.reset();
    lottieRef.current?.play();
  }, [visible]);

  useEffect(() => {
    if (!visible || phase !== "check") return;
    const t = setTimeout(() => onDone(), 900);
    return () => clearTimeout(t);
  }, [visible, phase, onDone]);

  const handleAnimationFinish = () => {
    setPhase("check");
  };

  return (
    <Modal visible={visible} transparent animationType="fade" statusBarTranslucent>
      <View className="flex-1 bg-black/60 items-center justify-center px-8">
        <View className="bg-white rounded-3xl w-full max-w-sm items-center px-6 py-8">
          {amountLabel ? (
            <Text className="text-lg font-semibold text-gray-900 mb-2 text-center">
              {amountLabel}
            </Text>
          ) : null}
          <Text className="text-base text-gray-500 mb-4 text-center">
            Added to your goal
          </Text>

          {phase === "lottie" ? (
            <LottieView
              ref={lottieRef}
              source={require("@/assets/lottie/saving_lottie.json")}
              loop={false}
              autoPlay={false}
              onAnimationFinish={handleAnimationFinish}
              style={{ width: 200, height: 200 }}
            />
          ) : (
            <View className="w-24 h-24 rounded-full bg-emerald-100 items-center justify-center mb-2">
              <Text className="text-emerald-600 text-5xl font-bold">✓</Text>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
}
