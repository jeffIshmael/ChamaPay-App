import { serverUrl } from "@/constants/serverUrl";
import { useAuth } from "@/Contexts/AuthContext";
import { checkUserDetails } from "@/lib/chamaService";
import { useRouter } from "expo-router";
import * as AppleAuthentication from "expo-apple-authentication";
import * as Google from "expo-auth-session/providers/google";
import * as WebBrowser from "expo-web-browser";
import { Shield, Mail } from "lucide-react-native";
import { useState, useEffect } from "react";
import {
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  ActivityIndicator,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Path, Svg } from "react-native-svg";

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

const chamapayLogo = require("@/assets/images/chamapay-logo.png");

WebBrowser.maybeCompleteAuthSession();

export default function AuthScreen() {
  const [errorText, setErrorText] = useState("");
  const [email, setEmail] = useState("");
  const [showEmailInput, setShowEmailInput] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const { setAuth } = useAuth();
  
  const [request, response, promptAsync] = Google.useAuthRequest({
    androidClientId: process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID,
    iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
    webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
  });

  // Handle Google OAuth response
  useEffect(() => {
    if (response?.type === "success") {
      const { authentication } = response;
      handleGoogleAuth(authentication?.accessToken);
    }
  }, [response]);

  const handleGoogleAuth = async (accessToken: string | undefined) => {
    if (!accessToken) {
      setErrorText("Failed to get access token from Google");
      return;
    }

    setIsLoading(true);
    setErrorText("");

    try {
      // Get user info from Google
      const userInfoResponse = await fetch(
        "https://www.googleapis.com/userinfo/v2/me",
        {
          headers: { Authorization: `Bearer ${accessToken}` },
        }
      );

      const userInfo = await userInfoResponse.json();
      const email = userInfo.email;
      const name = userInfo.name;
      const picture = userInfo.picture;

      if (!email) {
        setErrorText("Could not retrieve email from Google");
        setIsLoading(false);
        return;
      }

      // Check if user exists
      const userDetails = await checkUserDetails(email);
      
      if (userDetails.success) {
        // User exists, authenticate
        const resp = await fetch(`${serverUrl}/auth/authenticate`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, provider: "google" }),
        });
        
        const data = await resp.json();
        
        if (resp.ok && data?.token && data?.user) {
          await setAuth(data.token, data.user, data.refreshToken || null);
          router.replace("/(tabs)");
        } else {
          setErrorText(data?.message || "Authentication failed");
        }
      } else {
        // New user, redirect to setup
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
    } catch (error) {
      console.error("Google auth error:", error);
      setErrorText("Failed to sign in with Google. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleAppleAuth = async () => {
    setIsLoading(true);
    setErrorText("");

    try {
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });

      const { email, fullName, identityToken } = credential;

      if (!email) {
        setErrorText("Could not retrieve email from Apple");
        setIsLoading(false);
        return;
      }

      const name = fullName
        ? `${fullName.givenName || ""} ${fullName.familyName || ""}`.trim()
        : "";

      // Check if user exists
      const userDetails = await checkUserDetails(email);
      
      if (userDetails.success) {
        // User exists, authenticate
        const resp = await fetch(`${serverUrl}/auth/authenticate`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ 
            email, 
            provider: "apple",
            identityToken 
          }),
        });
        
        const data = await resp.json();
        
        if (resp.ok && data?.token && data?.user) {
          await setAuth(data.token, data.user, data.refreshToken || null);
          router.replace("/(tabs)");
        } else {
          setErrorText(data?.message || "Authentication failed");
        }
      } else {
        // New user, redirect to setup
        router.replace({
          pathname: "/wallet-setup",
          params: {
            mode: "apple",
            email,
            name,
          },
        } as any);
      }
    } catch (error: any) {
      if (error.code === "ERR_REQUEST_CANCELED") {
        // User canceled the sign-in flow
        setIsLoading(false);
        return;
      }
      console.error("Apple auth error:", error);
      setErrorText("Failed to sign in with Apple. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleEmailSubmit = async () => {
    if (!email.trim()) {
      setErrorText("Please enter your email address");
      return;
    }
    console.log("the email", email);

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setErrorText("Please enter a valid email address");
      return;
    }

    setIsLoading(true);
    setErrorText("");

    try {
      console.log("calling the api,");
      // Send verification code to email
      const resp = await fetch(`${serverUrl}/auth/send-code`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.toLowerCase().trim() }),
      });

      const data = await resp.json();
      console.log("the data", data);

      if (resp.ok) {
        // Navigate to verification screen
        router.push({
          pathname: "/verify-email",
          params: { email: email.toLowerCase().trim() },
        } as any);
      } else {
        setErrorText(data?.message || "Failed to send verification code");
      }
    } catch (error) {
      console.error("Email auth error:", error);
      setErrorText("Failed to send verification code. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View className="flex-1 bg-white">
      {/* Gradient Background */}
      <View
        className="absolute top-0 left-0 right-0 overflow-hidden"
        style={{
          height: "75%",
          backgroundColor: "#d1f6f1",
          borderBottomLeftRadius: 30,
          borderBottomRightRadius: 30,
        }}
      />

      {/* Decorative circles */}
      <View
        className="absolute rounded-full"
        style={{
          top: -120,
          right: -90,
          width: 280,
          height: 280,
          backgroundColor: "#a3ece4",
          opacity: 0.4,
        }}
      />
      <View
        className="absolute rounded-full"
        style={{
          top: 80,
          left: -120,
          width: 200,
          height: 200,
          backgroundColor: "#66d9d0",
          opacity: 0.3,
        }}
      />

      <SafeAreaView className="flex-1">
        <ScrollView
          className="flex-1"
          contentContainerStyle={{ flexGrow: 1 }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View className="flex-1 px-6 justify-between">
            {/* Header with Logo */}
            <View
              className="items-center flex-1 justify-center"
              style={{ paddingTop: 60 }}
            >
              <View
                className="mb-8 rounded-full overflow-hidden"
                style={{
                  width: 120,
                  height: 120,
                  backgroundColor: "white",
                  shadowColor: "#26a6a2",
                  shadowOffset: { width: 0, height: 10 },
                  shadowOpacity: 0.25,
                  shadowRadius: 20,
                  elevation: 12,
                }}
              >
                <Image
                  source={chamapayLogo}
                  style={{ width: "100%", height: "100%" }}
                  resizeMode="contain"
                />
              </View>

              <Text className="text-5xl mb-4 text-gray-900 font-bold text-center">
                ChamaPay
              </Text>
              <Text
                className="text-center text-xl font-medium px-8"
                style={{ color: "#1c8584" }}
              >
                The circular savings app
              </Text>
            </View>

            {/* Error Message */}
            {errorText ? (
              <View
                className="flex-row items-center bg-red-50 p-4 rounded-2xl mb-6 border border-red-200"
                style={styles.card}
              >
                <Shield color="#ef4444" size={20} />
                <Text className="text-red-600 ml-3 text-sm font-medium flex-1">
                  {errorText}
                </Text>
              </View>
            ) : null}

            {/* Auth Section */}
            <View className="pb-8">
              {showEmailInput ? (
                // Email Input Section
                <View className="mb-6">
                  <View className="mb-4">
                    <TextInput
                      className="bg-white p-4 rounded-2xl text-base border-2"
                      style={{
                        borderColor: "#a3ece4",
                        ...styles.card,
                      }}
                      placeholder="Enter your email"
                      placeholderTextColor="#9ca3af"
                      value={email}
                      onChangeText={setEmail}
                      keyboardType="email-address"
                      autoCapitalize="none"
                      autoCorrect={false}
                      editable={!isLoading}
                    />
                  </View>

                  <Pressable
                    onPress={handleEmailSubmit}
                    disabled={isLoading}
                    className="p-4 rounded-2xl items-center justify-center mb-4"
                    style={[
                      styles.authButton,
                      { backgroundColor: "#26a6a2" },
                      isLoading && { opacity: 0.6 },
                    ]}
                  >
                    {isLoading ? (
                      <ActivityIndicator color="white" />
                    ) : (
                      <Text className="text-white font-bold text-base">
                        Continue
                      </Text>
                    )}
                  </Pressable>

                  <Pressable
                    onPress={() => {
                      setShowEmailInput(false);
                      setEmail("");
                      setErrorText("");
                    }}
                    disabled={isLoading}
                    className="items-center"
                  >
                    <Text
                      className="text-sm font-semibold"
                      style={{ color: "#26a6a2" }}
                    >
                      Back to other options
                    </Text>
                  </Pressable>
                </View>
              ) : (
                // OAuth Buttons Section
                <>
                  <View className="flex-row mb-4" style={{ gap: 12 }}>
                    {/* Google Button */}
                    <Pressable
                      onPress={() => promptAsync()}
                      disabled={isLoading || !request}
                      className="flex-1 bg-white p-2 rounded-2xl flex-row items-center justify-center"
                      style={[
                        styles.authButton,
                        {
                          borderWidth: 2,
                          borderColor: "#a3ece4",
                        },
                        isLoading && { opacity: 0.6 },
                      ]}
                    >
                      <GoogleIcon />
                      <View className="ml-3 items-start justify-center">
                        <Text className="text-gray-800 font-semibold text-xs mt-2">
                          Continue with
                        </Text>
                        <Text className="text-gray-900 font-bold text-sm">
                          Google
                        </Text>
                      </View>
                    </Pressable>

                    {/* Apple Button - Only show on iOS */}
                    {Platform.OS === "ios" && (
                      <Pressable
                        onPress={handleAppleAuth}
                        disabled={isLoading}
                        className="flex-1 p-2 rounded-2xl flex-row items-center justify-center"
                        style={[
                          styles.authButton,
                          { backgroundColor: "black" },
                          isLoading && { opacity: 0.6 },
                        ]}
                      >
                        <AppleIcon />
                        <View className="ml-3 items-start justify-center">
                          <Text className="text-gray-300 font-semibold text-xs mt-2">
                            Continue with
                          </Text>
                          <Text className="text-white font-bold text-sm">
                            Apple
                          </Text>
                        </View>
                      </Pressable>
                    )}
                  </View>

                  {/* Divider */}
                  <View className="flex-row items-center mb-4">
                    <View className="flex-1 h-px bg-gray-300" />
                    <Text className="px-4 text-gray-500 text-sm">or</Text>
                    <View className="flex-1 h-px bg-gray-300" />
                  </View>

                  {/* Email Button */}
                  <Pressable
                    onPress={() => setShowEmailInput(true)}
                    disabled={isLoading}
                    className="bg-white p-4 rounded-2xl flex-row items-center justify-center mb-6"
                    style={[
                      styles.authButton,
                      {
                        borderWidth: 2,
                        borderColor: "#a3ece4",
                      },
                      isLoading && { opacity: 0.6 },
                    ]}
                  >
                    <Mail color="#26a6a2" size={20} />
                    <Text
                      className="ml-3 font-bold text-base"
                      style={{ color: "#26a6a2" }}
                    >
                      Continue with Email
                    </Text>
                  </Pressable>
                </>
              )}

              {/* Terms */}
              <Text className="text-xs text-gray-500 text-center px-8 leading-relaxed mb-6">
                By continuing, you agree to our{" "}
                <Text className="font-semibold" style={{ color: "#26a6a2" }}>
                  Terms of Service
                </Text>{" "}
                and{" "}
                <Text className="font-semibold" style={{ color: "#26a6a2" }}>
                  Privacy Policy
                </Text>
              </Text>
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>

      {/* Loading Overlay */}
      {isLoading && (
        <View
          className="absolute inset-0 bg-black/20 items-center justify-center"
          style={{ zIndex: 999 }}
        >
          <View className="bg-white p-6 rounded-3xl" style={styles.card}>
            <ActivityIndicator size="large" color="#26a6a2" />
          </View>
        </View>
      )}
    </View>
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
  authButton: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 6,
  },
});