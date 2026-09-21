import { useAuth } from "@/Contexts/AuthContext";
import { getChamaBySlug } from "@/lib/chamaService";
import { decryptChamaSlug } from "@/lib/encryption";
import { setPendingChamaInvite } from "@/lib/pendingInvite";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect } from "react";
import { ActivityIndicator, SafeAreaView, Text } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function ChamaRedirect() {
  const { encryptedSlug } = useLocalSearchParams();
  const router = useRouter();
  const { token, user } = useAuth();
  const insets = useSafeAreaInsets();
  const [isProcessing, setIsProcessing] = React.useState(true);

  useEffect(() => {
    const handleRedirect = async () => {
      if (!encryptedSlug || typeof encryptedSlug !== "string") {
        router.replace("/(tabs)/index");
        return;
      }

      if (!token) {
        await setPendingChamaInvite(encryptedSlug);
        router.replace("/new-auth-screen");
        return;
      }

      try {
        setIsProcessing(true);

        const originalSlug = decryptChamaSlug(encryptedSlug);
        if (!originalSlug) {
          router.replace("/(tabs)/index");
          return;
        }

        const response = await getChamaBySlug(originalSlug, token);
        if (response.success && response.chama) {
          const chama = response.chama;

          const isMember = chama.members?.some(
            (member) =>
              member.user?.id === user?.id ||
              member.user?.email === user?.email ||
              member.user?.userName === user?.userName
          );

          if (isMember) {
            router.replace(`/(tabs)/joined-chama-details/${originalSlug}`);
          } else {
            router.replace({
              pathname: "/chama-details/[slug]",
              params: { slug: originalSlug },
            });
          }
        } else {
          router.replace("/(tabs)/index");
        }
      } catch {
        router.replace("/(tabs)/index");
      } finally {
        setIsProcessing(false);
      }
    };

    void handleRedirect();
  }, [encryptedSlug, token, user, router]);

  return (
    <SafeAreaView
      className="flex-1 items-center justify-center bg-gray-50"
      style={{ paddingTop: insets.top }}
    >
      <ActivityIndicator size="large" color="#10b981" />
      <Text className="text-gray-600 mt-4">
        {isProcessing ? "Processing link..." : "Loading chama..."}
      </Text>
    </SafeAreaView>
  );
}
