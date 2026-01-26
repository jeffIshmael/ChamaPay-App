import { useAuth } from "@/Contexts/AuthContext";
import { getChamaBySlug } from "@/lib/chamaService";
import { decryptChamaSlug } from "@/lib/encryption";
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
      if (!encryptedSlug || typeof encryptedSlug !== "string" || !token) {
        router.replace("/discover-chamas");
        return;
      }

      try {
        setIsProcessing(true);

        const originalSlug = decryptChamaSlug(encryptedSlug);
        if (!originalSlug) {
          router.replace("/discover-chamas");
          return;
        }

        // Check if chama exists and get membership info
        const response = await getChamaBySlug(originalSlug, token);
        if (response.success && response.chama) {
          const chama = response.chama;

          // Check if user is already a member of this chama
          const isMember = chama.members?.some(member =>
            member.user?.id === user?.id ||
            member.user?.email === user?.email ||
            member.user?.userName === user?.userName
          );

          if (isMember) {
            // User is already a member - route to joined chama details
            router.replace(`/(tabs)/[joined-chama-details]/${originalSlug}`);
          } else {
            // User is not a member - route to chama details (join page)
            router.replace({
              pathname: "/chama-details/[slug]",
              params: { slug: originalSlug },
            });
          }
        } else {
          router.replace("/discover-chamas");
        }
      } catch (error) {
        console.error("Error during chama redirect:", error);
        router.replace("/discover-chamas");
      } finally {
        setIsProcessing(false);
      }
    };

    handleRedirect();
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
