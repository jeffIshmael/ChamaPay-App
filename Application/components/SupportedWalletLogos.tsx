import React from "react";
import { Image, Text, View, type ImageSourcePropType } from "react-native";

const WALLET_LOGOS: { name: string; source: ImageSourcePropType }[] = [
  { name: "Binance", source: require("@/assets/images/Binance-Icon-Logo.png") },
  { name: "OKX", source: require("@/assets/images/Okx_Logo.png") },
  { name: "Bitget", source: require("@/assets/images/bitget_Logo.png") },
  { name: "Base", source: require("@/assets/images/base_logo.webp") },
  { name: "MetaMask", source: require("@/assets/images/metamask_logo.png") },
];

type SupportedWalletLogosProps = {
  variant?: "compact" | "default";
  showLabel?: boolean;
  label?: string;
  light?: boolean;
};

export default function SupportedWalletLogos({
  variant = "default",
  showLabel = true,
  label = "Works with Binance, OKX, MetaMask & more",
  light = false,
}: SupportedWalletLogosProps) {
  const size = variant === "compact" ? 22 : 26;
  const overlap = variant === "compact" ? -7 : -9;
  const visibleCount = 4;
  const visible = WALLET_LOGOS.slice(0, visibleCount);
  const remaining = WALLET_LOGOS.length - visibleCount;

  return (
    <View className="flex-row items-center">
      <View className="flex-row items-center">
        {visible.map((wallet, index) => (
          <View
            key={wallet.name}
            className="rounded-full bg-white border border-gray-200 overflow-hidden items-center justify-center"
            style={{
              width: size,
              height: size,
              marginLeft: index === 0 ? 0 : overlap,
              zIndex: visibleCount - index,
            }}
          >
            <Image
              source={wallet.source}
              style={{ width: size - 6, height: size - 6 }}
              resizeMode="contain"
            />
          </View>
        ))}
        {remaining > 0 && (
          <View
            className="rounded-full bg-gray-100 border border-gray-200 items-center justify-center"
            style={{
              width: size,
              height: size,
              marginLeft: overlap,
              zIndex: 0,
            }}
          >
            <Text className="text-[9px] font-bold text-gray-600">
              +{remaining}
            </Text>
          </View>
        )}
      </View>
      {showLabel && (
        <Text
          className={`text-xs ml-2.5 flex-1 leading-4 ${
            light ? "text-emerald-100/90" : "text-gray-500"
          }`}
        >
          {label}
        </Text>
      )}
    </View>
  );
}
