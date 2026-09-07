import React from "react";
import { Image, Text, View } from "react-native";
import { BadgeCheck } from "lucide-react-native";

export function isIdentityVerified(user?: {
  kycTier?: number | null;
  kycStatus?: string | null;
} | null): boolean {
  return (user?.kycTier ?? 1) >= 2 && user?.kycStatus === "approved";
}

type Size = "sm" | "md";

const SIZES = {
  sm: { box: 48, ring: 3, badge: 18, icon: 11, bang: 11 },
  md: { box: 64, ring: 3, badge: 22, icon: 13, bang: 13 },
} as const;

type Props = {
  imageUrl?: string | null;
  initials?: string;
  verified: boolean;
  size?: Size;
  /** Use a light ring on dark headers */
  onDark?: boolean;
};

/**
 * Profile avatar with KYC ring:
 * - Unverified → amber ring + "!" badge
 * - Verified → emerald ring + green check badge
 */
export default function KycProfileAvatar({
  imageUrl,
  initials = "U",
  verified,
  size = "sm",
  onDark = false,
}: Props) {
  const s = SIZES[size];
  const ringColor = verified ? "#34d399" : "#fbbf24";
  const badgeBg = verified ? "#059669" : "#f59e0b";
  const fallbackBg = verified ? "#10b981" : "#f59e0b";

  return (
    <View style={{ width: s.box + 4, height: s.box + 4 }}>
      <View
        style={{
          width: s.box + 4,
          height: s.box + 4,
          borderRadius: (s.box + 4) / 2,
          borderWidth: s.ring,
          borderColor: ringColor,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: onDark ? "rgba(255,255,255,0.12)" : "#fff",
        }}
      >
        {imageUrl ? (
          <Image
            source={{ uri: imageUrl }}
            style={{
              width: s.box - s.ring * 2,
              height: s.box - s.ring * 2,
              borderRadius: (s.box - s.ring * 2) / 2,
            }}
          />
        ) : (
          <View
            style={{
              width: s.box - s.ring * 2,
              height: s.box - s.ring * 2,
              borderRadius: (s.box - s.ring * 2) / 2,
              backgroundColor: fallbackBg,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Text
              style={{
                color: "#fff",
                fontWeight: "700",
                fontSize: size === "md" ? 22 : 18,
              }}
            >
              {initials.charAt(0).toUpperCase()}
            </Text>
          </View>
        )}
      </View>

      <View
        style={{
          position: "absolute",
          right: -1,
          bottom: -1,
          width: s.badge,
          height: s.badge,
          borderRadius: s.badge / 2,
          backgroundColor: badgeBg,
          alignItems: "center",
          justifyContent: "center",
          borderWidth: 2,
          borderColor: onDark ? "#065f46" : "#ffffff",
        }}
      >
        {verified ? (
          <BadgeCheck size={s.icon} color="#ffffff" />
        ) : (
          <Text
            style={{
              color: "#ffffff",
              fontWeight: "800",
              fontSize: s.bang,
              lineHeight: s.bang + 2,
              includeFontPadding: false,
            }}
          >
            !
          </Text>
        )}
      </View>
    </View>
  );
}
