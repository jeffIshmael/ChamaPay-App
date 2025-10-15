import { env } from "@/constants/env";
import { serverUrl } from "@/constants/serverUrl";
import { chain, client } from "@/constants/thirdweb";
import { useAuth } from "@/Contexts/AuthContext";
import { checkUserDetails } from "@/lib/chamaService";
import { storage } from "@/Utils/storage";
import * as Google from "expo-auth-session/providers/google";
import { useRouter } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import { Shield, Users } from "lucide-react-native";
import { useEffect, useState } from "react";
import {
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Path, Svg } from "react-native-svg";
import { useActiveAccount, useConnect } from "thirdweb/react";
import {
  getProfiles,
  getUserEmail,
  inAppWallet,
} from "thirdweb/wallets/in-app";

const GoogleIcon = () => (
  <Svg width={20} height={20} viewBox="0 0 24 24">
    <Path
      fill="#4285F4"
      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
    />
    <Path
      fill="#34A853"
      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
    />
    <Path
      fill="#FBBC05"
      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
    />
    <Path
      fill="#EA4335"
      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
    />
  </Svg>
);
const AppleIcon = () => (
  <Svg width={18} height={18} viewBox="0 0 24 24">
    <Path
      fill="#ffffff"
      d="M19.665 17.025c-.315.735-.69 1.41-1.125 2.02-.59.835-1.071 1.41-1.44 1.725-.575.53-1.191.805-1.854.825-.474 0-1.047-.135-1.72-.405-.674-.27-1.293-.405-1.86-.405-.59 0-1.225.135-1.905.405-.68.27-1.234.41-1.665.42-.64.03-1.27-.255-1.89-.855-.405-.375-.91-1.005-1.515-1.89-.65-.945-1.185-2.04-1.605-3.285-.45-1.365-.675-2.685-.675-3.96 0-1.465.32-2.73.96-3.795.5-.855 1.165-1.53 1.995-2.025.83-.495 1.72-.75 2.67-.765.525 0 1.215.155 2.07.465.855.31 1.405.47 1.65.48.18 0 .79-.195 1.83-.585 1-.36 1.845-.51 2.535-.45 1.875.15 3.285.885 4.23 2.205-1.68 1.02-2.52 2.46-2.52 4.32 0 1.44.54 2.64 1.62 3.6.48.45 1.02.795 1.62 1.035-.13.39-.27.765-.42 1.125zM15.27 2.385c0 .435-.16.9-.48 1.395-.305.48-.69.87-1.155 1.17-.435.27-.84.42-1.215.45-.03-.09-.06-.195-.075-.315a2.77 2.77 0 0 1 .66-2.04c.22-.27.5-.495.84-.675.34-.18.665-.28.975-.3.01.105.02.21.02.315z"
    />
  </Svg>
);

WebBrowser.maybeCompleteAuthSession();

export default function AuthScreen() {
  const [errorText, setErrorText] = useState("");
  const router = useRouter();
  const { setAuth } = useAuth();
  const [request, response, promptAsync] = Google.useAuthRequest({
    androidClientId: env.GOOGLE_ANDROID_CLIENT_ID,
    iosClientId: env.GOOGLE_IOS_CLIENT_ID,
    webClientId: env.GOOGLE_WEB_CLIENT_ID,
  });
  const { connect, isConnecting } = useConnect();
  const account = useActiveAccount();

  //   const handlePhoneSignIn = () => {
  //     router.push("/phone-verification");
  //   };

  useEffect(() => {
    handleResponse();
  }, [response]);

  async function handleResponse() {
    try {
      if (response?.type === "success") {
        const accessToken = response.authentication?.accessToken;
        // Fetch profile from Google
        const profileRes = await fetch(
          "https://www.googleapis.com/oauth2/v3/userinfo",
          {
            headers: { Authorization: `Bearer ${accessToken}` },
          }
        );
        const profile = await profileRes.json();
        const email = profile?.email;
        const name = profile?.name;
        const picture = profile?.picture;
        if (!email) {
          setErrorText("Google account email not available.");
          return;
        }

        const userDetails = await checkUserDetails(email);

        if (userDetails.success) {
          // If backend returns token on existing user login via Google, call auth endpoint
          // Fallback: navigate and let app fetch user with stored token
          try {
            const resp = await fetch(`${serverUrl}/auth/google/complete`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ email }),
            });
            const data = await resp.json();
            if (resp.ok && data?.token && data?.user) {
              await setAuth(data.token, data.user, data.refreshToken || null);
            }
          } catch {}
          router.replace("/(tabs)");
        } else {
          // Proceed to wallet setup to simulate and prompt username first
          router.replace({
            pathname: "/wallet-setup",
            params: {
              mode: "google",
              email,
              name: name || "",
              picture: picture || "",
            },
          } as any);
        }
      } else if (response?.type === "cancel") {
        return;
      }
    } catch (error) {
      setErrorText("An error happened. Try again.");
      console.log("the error", error);
      return;
    }
  }

  // normal google sign in
  const handleGoogleSignIn = async () => {
    setErrorText("");
    try {
      await promptAsync();
    } catch (e) {
      setErrorText("Google sign-in failed. Please try again.");
    }
  };

  // thirdweb google auth
  const handleThirdwebAuth = async (type: "google" | "apple") => {
    setErrorText("");
    try {
      const wallet = inAppWallet({
        smartAccount: {
          chain,
          sponsorGas: true,
        },
      });

      const account = await wallet.connect({
        client,
        strategy: type,
      });
      // Register wallet with connection manager so it persists across app
      try {
        await connect(wallet);
        // Store wallet connection data
        const walletData = {
          address: account.address,
          connected: true,
          timestamp: Date.now(),
        };
        await storage.setWalletConnection(walletData);
        console.log('Wallet connection stored during auth:', walletData);
      } catch (error) {
        console.log("connecting error", error);
      }
      console.log("auth account", account);
      console.log("auth wallet", wallet);

      // Get thirdweb profile + email
      const profiles = await getProfiles({ client });
      const primaryProfile: any = Array.isArray(profiles)
        ? profiles[0]
        : undefined;
      const emailFromProfile = primaryProfile?.details?.email as
        | string
        | undefined;
      const nameFromProfile = primaryProfile?.details?.name as
        | string
        | undefined;
      const pictureFromProfile = primaryProfile?.details?.picture as
        | string
        | undefined;
      const email = emailFromProfile || (await getUserEmail({ client }));

      if (!email) {
        setErrorText("Thirdweb did not return an email.");
        return;
      }

      // Check backend for existing user
      const userDetails = await checkUserDetails(email);
      if (userDetails.success) {
        try {
          const resp = await fetch(`${serverUrl}/auth/google/complete`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email }),
          });
          const data = await resp.json();
          if (resp.ok && data?.token && data?.user) {
            await setAuth(data.token, data.user, data.refreshToken || null);
          }
        } catch {}
        router.replace("/(tabs)");
      } else {
        // Not in backend; send to wallet setup to choose username
        router.replace({
          pathname: "/wallet-setup",
          params: {
            mode: type,
            email,
            name: nameFromProfile || "",
            picture: pictureFromProfile || "",
            wallet: account.address,
          },
        } as any);
      }
    } catch (error) {
      console.log("thirdweb auth error:", error);
      setErrorText("Failed to sign in. Please try again.");
    }
  };

  const handleAppleSignIn = () => {
    setErrorText("Apple Sign-In is under development.");
  };

  return (
    <SafeAreaView className="flex-1 bg-gradient-to-b from-green-50 to-white">
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ flexGrow: 1 }}
        showsVerticalScrollIndicator={false}
      >
        <View className="flex-1 px-6">
          {/* Header */}
          <View className="items-center mb-12" style={{ paddingTop: 60 }}>
            <View
              className="w-24 h-24 rounded-full items-center justify-center mb-8 shadow-lg"
              style={{
                backgroundColor: "#059669",
                shadowColor: "#059669",
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.3,
                shadowRadius: 12,
                elevation: 8,
              }}
            >
              <Users color="white" size={36} />
            </View>
            <Text className="text-4xl mb-3 text-gray-900 font-bold text-center">
              Welcome to ChamaPay
            </Text>
            <Text className="text-gray-600 text-center text-lg">
              Sign in to continue your journey
            </Text>
          </View>
          {/* Messages */}
          {errorText ? (
            <View
              className="flex-row items-center bg-red-50 p-4 rounded-xl mb-8 mx-2 border border-red-200"
              style={styles.card}
            >
              <Shield color="#ef4444" size={20} />
              <Text className="text-red-600 ml-3 text-sm font-medium">
                {errorText}
              </Text>
            </View>
          ) : null}

          {/* spacer to push footer to bottom */}
          <View style={{ flexGrow: 1 }} />

          {/* Footer with buttons at bottom */}
          <View className="pb-8">
            {/* Secondary in two columns */}
            <View className="flex-row mb-6" style={{ gap: 12 }}>
              <Pressable
                onPress={() => handleThirdwebAuth("google")}
                className="flex-1 bg-white border border-gray-200 py-4 rounded-xl flex-row items-center justify-center"
                style={[styles.card, { shadowOpacity: 0.08 }]}
              >
                <GoogleIcon />
                <View className="ml-3 items-start justify-center">
                  <Text className="text-gray-500 text-xs">Continue with</Text>
                  <Text className="text-gray-800 font-semibold text-sm">
                    Google
                  </Text>
                </View>
              </Pressable>

              <Pressable
                onPress={() => handleThirdwebAuth("apple")}
                className="flex-1 bg-black py-4 rounded-xl flex-row items-center justify-center"
                style={[styles.card, { shadowOpacity: 0.15 }]}
              >
                <AppleIcon />
                <View className="ml-3 items-start justify-center">
                  <Text className="text-gray-300 text-xs">Continue with</Text>
                  <Text className="text-white font-semibold text-sm">
                    Apple
                  </Text>
                </View>
              </Pressable>
            </View>

            <Text className="text-xs text-gray-500 text-center px-4 leading-relaxed">
              By continuing, you agree to our{" "}
              <Text className="text-green-600 font-medium">
                Terms of Service
              </Text>{" "}
              and{" "}
              <Text className="text-green-600 font-medium">Privacy Policy</Text>
            </Text>

            {/* Powered by section */}
            <View className="items-center mt-8">
              <View className="flex-row items-center bg-gray-50 px-5 py-4 rounded-xl border border-gray-100">
                <Text className="text-xs text-gray-500 mr-2 font-medium">
                  Powered by
                </Text>
                <Image
                  source={require("@/assets/images/thirdweb.png")}
                  className="w-7 h-7 mr-2 rounded-full"
                  resizeMode="contain"
                />
                <Text className="text-sm font-semibold text-gray-800">
                  Thirdweb
                </Text>
              </View>
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  card: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
});
