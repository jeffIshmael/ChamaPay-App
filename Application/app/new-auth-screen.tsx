import { serverUrl } from "@/constants/serverUrl";
import { useAuth } from "@/Contexts/AuthContext";
import { checkUserDetails } from "@/lib/chamaService";
import { Buffer } from "buffer";
import * as AppleAuthentication from "expo-apple-authentication";
import { makeRedirectUri } from "expo-auth-session";
import * as Google from "expo-auth-session/providers/google";
import * as Linking from "expo-linking";
import { useRouter } from "expo-router";
import * as SecureStore from "expo-secure-store";
import * as WebBrowser from "expo-web-browser";
import { Mail, Shield, ChevronLeft, KeyRound, ChevronDown, ChevronUp, Check } from "lucide-react-native";
import { useEffect, useState, useRef } from "react";
import {
  ActivityIndicator,
  Animated,
  Easing,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  Modal,
  Dimensions
} from "react-native";

const { height: SCREEN_HEIGHT } = Dimensions.get("window");
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { Path, Svg } from "react-native-svg";
import AuthLoadingView from "@/components/AuthLoadingView";

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

// CRITICAL: Complete the auth session so the browser can redirect back to the app
WebBrowser.maybeCompleteAuthSession();

export default function AuthScreen() {
  const [errorText, setErrorText] = useState("");
  const [email, setEmail] = useState("");
  const [showEmailInput, setShowEmailInput] = useState(false);
  const [showVerificationModal, setShowVerificationModal] = useState(false);
  const [verificationCode, setVerificationCode] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState("");
  const router = useRouter();
  const inputRef = useRef<TextInput>(null);

  // --- Verification modal UX state ---
  // Kept separate from the global `isLoading`/AuthLoadingView so the modal
  // itself can show inline feedback instead of being hidden behind a
  // full-screen overlay while it's open.
  const [verifying, setVerifying] = useState(false);
  const [verifySuccess, setVerifySuccess] = useState(false);
  const verifyingRef = useRef(false); // guards against double-submit races
  const shakeAnim = useRef(new Animated.Value(0)).current;
  const successAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (showVerificationModal) {
      const timer = setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [showVerificationModal]);

  const { setAuth, isAuthenticated } = useAuth();
  const insets = useSafeAreaInsets();

  const [request, response, promptAsync] = Google.useAuthRequest({
    androidClientId: process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID,
    iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
    webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
    redirectUri: makeRedirectUri({
      scheme: "com.jeff.chamapay",
    }),
  });

  // CRITICAL: Detect deep link on mount to prevent flicker
  useEffect(() => {
    const handleUrl = (event: { url: string }) => {
const url = event.url;
      if (url && (url.includes("code=") || url.includes("token=") || url.includes("state=") || url.includes("prompt="))) {
setIsLoading(true);
        setLoadingMessage("Signing in...");
      }
    };

    const subscription = Linking.addEventListener("url", handleUrl);

    const checkDeepLinkAndPendingAuth = async () => {
      // 1. Check if auth was in progress before app backgrounded/killed
      const isAuthPending = await SecureStore.getItemAsync("google_auth_pending");
      if (isAuthPending === "true") {
setIsLoading(true);
        setLoadingMessage("Signing in...");
        
        // Safety timeout to clear it if response never arrives
        setTimeout(async () => {
          const stillPending = await SecureStore.getItemAsync("google_auth_pending");
          if (stillPending === "true") {
            await SecureStore.deleteItemAsync("google_auth_pending");
            setIsLoading((prev) => {
              if (prev) {
                setLoadingMessage("");
                return false;
              }
              return prev;
            });
          }
        }, 12000);
      }

      // 2. Check initial URL just in case
      const url = await Linking.getInitialURL();
if (url && (url.includes("code=") || url.includes("token=") || url.includes("state=") || url.includes("prompt="))) {
setIsLoading(true);
        setLoadingMessage("Signing in...");
      }
    };
    checkDeepLinkAndPendingAuth();

    return () => {
      subscription.remove();
    };
  }, []);

// Handle Google OAuth response logic reactively
  useEffect(() => {
    const handleResponse = async () => {
      if (response) {
// Clear pending auth state since we have a response
        await SecureStore.deleteItemAsync("google_auth_pending");

        if (response.type === "success") {
          setIsLoading(true);
          setLoadingMessage("Redirecting...");
          const { authentication, params } = response;

          try {
            if (authentication?.accessToken) {
await handleGoogleAuth(authentication.accessToken, 'access');
            } else if (authentication?.idToken) {
await handleGoogleAuth(authentication.idToken, 'id');
            } else if (params?.id_token) {
await handleGoogleAuth(params.id_token, 'id');
            } else if (params?.access_token) {
await handleGoogleAuth(params.access_token, 'access');
            } else {
setErrorText("Authentication successful but no tokens found.");
              setIsLoading(false);
              setLoadingMessage("");
            }
          } catch (err) {
setErrorText("Error completing sign in.");
            setIsLoading(false);
            setLoadingMessage("");
          }
        } else if (response.type === "error") {
setErrorText(`Google Auth Error: ${response.error?.message || 'Unknown error'}`);
          setIsLoading(false);
          setLoadingMessage("");
        } else if (response.type === "cancel" || response.type === "dismiss") {
// Delay hiding the loading screen in case this "dismiss" is just the browser closing 
          // automatically during a successful deep-link redirect on Android.
          // We change the message so the user knows something is happening.
          setLoadingMessage("Signing in...");

          setTimeout(() => {
            // We only clear it if we are still stuck on "Finishing sign in..."
            // If success arrived, setLoadingMessage was called with "Redirecting..." etc.
            setLoadingMessage((currentMsg) => {
              if (currentMsg === "Signing in...") {
setIsLoading(false);
                return "";
              }
              return currentMsg;
            });
          }, 8000); // 8 seconds gives expo-auth-session enough time to parse the deep-link
        }
      }
    };

    handleResponse();
  }, [response]);

  useEffect(() => {
}, [isLoading, loadingMessage]);

  const handleGoogleAuth = async (token: string | undefined, type: 'access' | 'id' = 'access') => {
if (!token) {
setErrorText(`Failed to get ${type} token from Google`);
      setIsLoading(false);
      setLoadingMessage("");
      return;
    }

    setErrorText("");
    try {
      setLoadingMessage("Fetching details...");
      let googleEmail, googleName, googlePicture;

      if (type === 'id') {
        const payloadBase64 = token.split('.')[1];
        const payload = JSON.parse(Buffer.from(payloadBase64, 'base64').toString());
        googleEmail = payload.email;
        googleName = payload.name;
        googlePicture = payload.picture;
      } else {
        const response = await fetch(
          "https://www.googleapis.com/userinfo/v2/me",
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );
        const userInfo = await response.json();
        googleEmail = userInfo.email;
        googleName = userInfo.name;
        googlePicture = userInfo.picture;
      }

      setLoadingMessage("Verifying account...");
      const email = googleEmail;
      const name = googleName;
      const picture = googlePicture;

      if (!email) {
        setErrorText("Could not retrieve email from Google");
        setIsLoading(false);
        setLoadingMessage("");
        return;
      }

      setLoadingMessage("Checking account...");
const userDetails = await checkUserDetails(email);
if (userDetails.success) {
        setLoadingMessage("Taking you to your account...");
const resp = await fetch(`${serverUrl}/auth/authenticate`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, provider: "google" }),
        });

        const data = await resp.json();
if (resp.ok && data?.token && data?.user) {
          setLoadingMessage("Almost there...");
await setAuth(data.token, data.user, data.refreshToken || null);

          const storedPin = await SecureStore.getItemAsync("user_pin");
          if (storedPin) {
            router.replace("/(tabs)");
          } else {
            router.replace("/pin-setup");
          }
        } else {
setErrorText(data?.message || "Authentication failed on server.");
          setIsLoading(false);
          setLoadingMessage("");
        }
      } else {
        setLoadingMessage("Preparing your wallet...");
router.push({
          pathname: "/wallet-setup",
          params: {
            email,
            name: name || "",
            picture: picture || "",
          },
        } as any);
      }
    } catch (error) {
setErrorText("Failed to sign in with Google. Please try again.");
      setIsLoading(false);
      setLoadingMessage("");
    }
  };

  const handleGoogleSignIn = async () => {
setIsLoading(true);
    setLoadingMessage("Opening Google...");
    setErrorText("");
    try {
      await SecureStore.setItemAsync("google_auth_pending", "true");
      const result = await promptAsync();
// Removed immediate setIsLoading(false) on cancel/dismiss here because 
      // Android Custom Tabs often return "dismiss" when closing automatically for a deep link.
      // The useEffect watching 'response' will handle true cancellations with a timeout.
    } catch (error) {
setErrorText(`Failed to start Google sign in: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setIsLoading(false);
      setLoadingMessage("");
    }
  };

  const handleAppleAuth = async () => {
    setIsLoading(true);
    setLoadingMessage("Opening Apple...");
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
        setLoadingMessage("");
        return;
      }

      const name = fullName
        ? `${fullName.givenName || ""} ${fullName.familyName || ""}`.trim()
        : "";

      setLoadingMessage("Checking account...");
      // Check if user exists
      const userDetails = await checkUserDetails(email);

      if (userDetails.success) {
        setLoadingMessage("Logging in...");
        // User exists, authenticate
        const resp = await fetch(`${serverUrl}/auth/authenticate`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email,
            provider: "apple",
            identityToken,
          }),
        });

        const data = await resp.json();

        if (resp.ok && data?.token && data?.user) {
          setLoadingMessage("Finalizing...");
          await setAuth(data.token, data.user, data.refreshToken || null);

          // Check if PIN is set
          const storedPin = await SecureStore.getItemAsync("user_pin");
          if (storedPin) {
            router.replace("/(tabs)");
          } else {
            router.replace("/pin-setup");
          }
        } else {
          setErrorText(data?.message || "Authentication failed");
          setIsLoading(false);
          setLoadingMessage("");
        }
      } else {
        // New user, redirect to setup
        setLoadingMessage("Setting up wallet...");
        router.push({
          pathname: "/wallet-setup",
          params: {
            mode: "apple",
            email,
            name,
          },
        });
      }
    } catch (error: any) {
      if (error.code === "ERR_REQUEST_CANCELED") {
        // User canceled the sign-in flow
        setIsLoading(false);
        setLoadingMessage("");
        return;
      }
setErrorText("Failed to sign in with Apple. Please try again.");
      setIsLoading(false);
      setLoadingMessage("");
    }
  };

  const handleEmailSubmit = async () => {
    if (!email.trim()) {
      setErrorText("Please enter your email address");
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setErrorText("Please enter a valid email address");
      return;
    }

    setIsSendingEmail(true);
    setErrorText("");

    try {
      // Send verification code to email
      const resp = await fetch(`${serverUrl}/auth/send-code`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.toLowerCase().trim() }),
      });

      const data = await resp.json();

      if (resp.ok) {
        // Reset any leftover state from a previous attempt, then show the modal
        setVerificationCode("");
        setVerifySuccess(false);
        setErrorText("");
        successAnim.setValue(0);
        shakeAnim.setValue(0);
        setShowVerificationModal(true);
      } else {
        setErrorText(data?.message || "Failed to send verification code");
      }
    } catch (error) {
      setErrorText("Failed to send verification code. Please try again.");
    } finally {
      setIsSendingEmail(false);
    }
  };

  // Quick shake on the code boxes to signal a wrong/rejected code
  const triggerShake = () => {
    shakeAnim.setValue(0);
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 1, duration: 55, easing: Easing.linear, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -1, duration: 55, easing: Easing.linear, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 1, duration: 55, easing: Easing.linear, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -1, duration: 55, easing: Easing.linear, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0, duration: 55, easing: Easing.linear, useNativeDriver: true }),
    ]).start();
  };

  const closeVerificationModal = () => {
    if (verifying || verifySuccess) return; // don't allow closing mid-verification/navigation
    setShowVerificationModal(false);
    setVerificationCode("");
    setErrorText("");
  };

  const handleVerifyCode = async (code: string) => {
    if (verifyingRef.current) return; // ignore double-fires (e.g. fast re-entry of last digit)
    verifyingRef.current = true;
    setVerifying(true);
    setErrorText("");
    try {
      const res = await fetch(`${serverUrl}/auth/verify-code`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.toLowerCase().trim(), code }),
      });
      const data = await res.json();

      if (res.ok && data.success) {
        // Show a brief success state inside the modal before navigating,
        // so the transition doesn't feel like an abrupt cut.
        setVerifySuccess(true);
        Animated.timing(successAnim, {
          toValue: 1,
          duration: 280,
          easing: Easing.out(Easing.back(1.4)),
          useNativeDriver: true,
        }).start();

        setTimeout(async () => {
          if (data.isNewUser) {
            setShowVerificationModal(false);
            router.replace({
              pathname: "/wallet-setup",
              params: { mode: "email", email: email.toLowerCase().trim(), name: "", picture: "" },
            } as any);
          } else {
            await setAuth(data.token, data.user, data.refreshToken);
            setShowVerificationModal(false);
            router.replace("/pin-setup");
          }
        }, 600);
      } else {
        triggerShake();
        setErrorText(data.message || "Invalid code");
        setVerificationCode("");
        setTimeout(() => inputRef.current?.focus(), 50);
      }
    } catch (e) {
      triggerShake();
      setErrorText("Network error");
      setVerificationCode("");
      setTimeout(() => inputRef.current?.focus(), 50);
    } finally {
      setVerifying(false);
      verifyingRef.current = false;
    }
  };

  return (
    <View className="flex-1 bg-white">
      {/* <StatusBar style="dark" translucent backgroundColor="transparent" /> */}
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
          contentContainerStyle={{ flexGrow: 1, minHeight: SCREEN_HEIGHT }}
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
                  width: 140,
                  height: 140,
                  backgroundColor: "transparent",
                  shadowColor: "#26a6a2",
                  // shadowOffset: { width: 0, height: 10 },
                  // shadowOpacity: 0.25,
                  // shadowRadius: 20,
                  // elevation: 8,
                }}
              >
                <Image
                  source={chamapayLogo}
                  style={{ width: "100%", height: "100%" }}
                  resizeMode="contain"
                />
              </View>

              <Text className="text-5xl mb-4 text-gray-900 font-bold text-center">
                Chamapay
              </Text>
              <Text
                className="text-center text-xl font-medium px-8"
                style={{ color: "#1c8584" }}
              >
                The circular savings app
              </Text>
            </View>

            {/* Error Message */}
            {errorText && !showVerificationModal ? (
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
              {/* Auth Buttons in Column */}
              <View className="mb-6">
                {/* Email Button / Input Section */}
                <View className="mb-3">
                  <Pressable
                    onPress={() => setShowEmailInput(!showEmailInput)}
                    className="w-full p-3 rounded-2xl flex-row items-center h-16"
                    style={[
                      styles.authButton,
                      {
                        borderWidth: 1,
                        borderColor: showEmailInput ? "#26a6a2" : "#e5e7eb",
                        backgroundColor: showEmailInput ? "#f0fdfa" : "white",
                      },
                    ]}
                  >
                    {!showEmailInput && (
                      <View className="w-10 h-10 bg-gray-100 rounded-lg items-center justify-center ml-1">
                        <Mail size={20} color="#4b5563" />
                      </View>
                    )}
                    <View className={`flex-1 ${!showEmailInput ? "ml-3" : "ml-4"} items-start justify-center`}>
                      <Text className="text-gray-800 font-medium text-base">
                        Continue with email
                      </Text>
                    </View>
                    <View className="mr-2">
                      {showEmailInput ? (
                        <ChevronUp size={20} color="#26a6a2" />
                      ) : (
                        <ChevronDown size={20} color="#6b7280" />
                      )}
                    </View>
                  </Pressable>

                  {/* Render Input Box Below if expanded */}
                  {showEmailInput && (
                    <View className="w-full bg-white rounded-2xl flex-row items-center border border-[#e5e7eb] p-1 h-16 mt-1" style={styles.authButton}>
                      <View className="w-10 h-10 bg-[#f3f4f6] rounded-xl items-center justify-center ml-1">
                        <Mail size={20} color="#4b5563" />
                      </View>
                      <TextInput
                        value={email}
                        onChangeText={setEmail}
                        placeholder="your@email.com"
                        className="flex-1 text-gray-800 px-3 font-medium text-base h-full"
                        keyboardType="email-address"
                        autoCapitalize="none"
                        autoCorrect={false}
                        editable={!isLoading}
                        autoFocus={true}
                        onSubmitEditing={handleEmailSubmit}
                        returnKeyType="send"
                      />
                      <Pressable
                        onPress={handleEmailSubmit}
                        disabled={!email || isSendingEmail}
                        className="px-4 h-full justify-center items-center"
                      >
                        {isSendingEmail ? (
                          <ActivityIndicator size="small" color="#26a6a2" />
                        ) : (
                          <Text className={`font-semibold text-base ${email ? "text-gray-800" : "text-gray-300"}`}>
                            Submit
                          </Text>
                        )}
                      </Pressable>
                    </View>
                  )}
                </View>

                {/* Divider */}
                <View className="flex-row items-center my-4">
                  <View className="flex-1 h-px bg-gray-200" />
                  <Text className="px-4 text-gray-400 text-sm font-medium">or</Text>
                  <View className="flex-1 h-px bg-gray-200" />
                </View>

                {/* Google Button */}
                <Pressable
                  onPress={handleGoogleSignIn}
                  disabled={isLoading || !request || isAuthenticated}
                  className="w-full bg-white p-3 rounded-2xl flex-row items-center h-16 mb-3"
                  style={[
                    styles.authButton,
                    {
                      borderWidth: 1,
                      borderColor: "#e5e7eb", // gray-200
                    },
                    (isLoading || !request || isAuthenticated) && { opacity: 0.6 },
                  ]}
                >
                  <View className="w-10 h-10 bg-gray-100 rounded-lg items-center justify-center ml-1">
                    <GoogleIcon />
                  </View>
                  <View className="flex-1 ml-3 items-start justify-center">
                    <Text className="text-gray-800 font-medium text-base">
                      {isLoading || isAuthenticated ? "Signing in..." : "Continue with Google"}
                    </Text>
                  </View>
                  <View className="bg-gray-100 px-3 py-1 rounded-full mr-1">
                    <Text className="text-gray-500 font-medium text-xs">Recent</Text>
                  </View>
                </Pressable>

                {/* Apple Button */}
                {Platform.OS === "ios" && (
                  <Pressable
                    onPress={handleAppleAuth}
                    disabled={isLoading}
                    className="w-full bg-white p-3 rounded-2xl flex-row items-center h-16 mb-3"
                    style={[
                      styles.authButton,
                      {
                        borderWidth: 1,
                        borderColor: "#e5e7eb", // gray-200
                      },
                      isLoading && { opacity: 0.6 },
                    ]}
                  >
                    <View className="w-10 h-10 bg-gray-100 rounded-lg items-center justify-center ml-1">
                      {/* Apple icon with black fill */}
                      <Svg width={18} height={18} viewBox="0 0 24 24">
                        <Path
                          fill="#000000"
                          d="M19.665 17.025c-.315.735-.69 1.41-1.125 2.02-.59.835-1.071 1.41-1.44 1.725-.575.53-1.191.805-1.854.825-.474 0-1.047-.135-1.72-.405-.674-.27-1.293-.405-1.86-.405-.59 0-1.225.135-1.905.405-.68.27-1.234.41-1.665.42-.64.03-1.27-.255-1.89-.855-.405-.375-.91-1.005-1.515-1.89-.65-.945-1.185-2.04-1.605-3.285-.45-1.365-.675-2.685-.675-3.96 0-1.465.32-2.73.96-3.795.5-.855 1.165-1.53 1.995-2.025.83-.495 1.72-.75 2.67-.765.525 0 1.215.155 2.07.465.855.31 1.405.47 1.65.48.18 0 .79-.195 1.83-.585 1-.36 1.845-.51 2.535-.45 1.875.15 3.285.885 4.23 2.205-1.68 1.02-2.52 2.46-2.52 4.32 0 1.44.54 2.64 1.62 3.6.48.45 1.02.795 1.62 1.035-.13.39-.27.765-.42 1.125zM15.27 2.385c0 .435-.16.9-.48 1.395-.305.48-.69.87-1.155 1.17-.435.27-.84.42-1.215.45-.03-.09-.06-.195-.075-.315a2.77 2.77 0 0 1 .66-2.04c.22-.27.5-.495.84-.675.34-.18.665-.28.975-.3.01.105.02.21.02.315z"
                        />
                      </Svg>
                    </View>
                    <View className="flex-1 ml-3 items-start justify-center">
                      <Text className="text-gray-800 font-medium text-base">Apple</Text>
                    </View>
                  </Pressable>
                )}
              </View>

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

      {/* Loading Overlay - Using Video-based AuthLoadingView */}
      {(isLoading || isAuthenticated) && (
        <AuthLoadingView 
          message={loadingMessage || (isAuthenticated ? "Completing sign in..." : "Processing...")} 
        />
      )}

      {/* Verification Modal */}
      <Modal
        visible={showVerificationModal}
        animationType="fade"
        transparent={true}
        onRequestClose={closeVerificationModal}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          className="flex-1 justify-center items-center bg-black/50 px-4"
        >
          <View className="bg-white w-full max-w-sm rounded-[24px] p-6 shadow-xl relative">
            {/* Header Icons */}
            <View className="flex-row justify-between w-full mb-4">
              <Pressable
                onPress={closeVerificationModal}
                disabled={verifying || verifySuccess}
                className="w-8 h-8 bg-gray-100 rounded-full items-center justify-center"
                style={(verifying || verifySuccess) && { opacity: 0.4 }}
              >
                <ChevronLeft size={20} color="#6b7280" />
              </Pressable>
              <Pressable
                onPress={closeVerificationModal}
                disabled={verifying || verifySuccess}
                className="w-8 h-8 bg-gray-100 rounded-full items-center justify-center"
                style={(verifying || verifySuccess) && { opacity: 0.4 }}
              >
                <Text className="text-gray-500 text-lg leading-none mb-1">×</Text>
              </Pressable>
            </View>

            <View className="items-center mb-6">
              <View
                className="w-16 h-16 rounded-full items-center justify-center mb-4"
                style={{ backgroundColor: verifySuccess ? "#dcfce7" : "#e0f2f1" }}
              >
                {verifySuccess ? (
                  <Check size={28} color="#16a34a" />
                ) : (
                  <KeyRound size={28} color="#26a6a2" />
                )}
              </View>
              <Text className="text-xl font-bold text-gray-900 mb-2 text-center">
                {verifySuccess ? "Verified!" : "Enter confirmation code"}
              </Text>
              {!verifySuccess && (
                <Text className="text-gray-500 text-center text-sm leading-relaxed px-2">
                  Please check <Text className="font-bold text-gray-800">{email}</Text> for an email and enter your code below.
                </Text>
              )}
            </View>

            {/* Code Input Boxes */}
            <Animated.View
              style={{
                transform: [
                  {
                    translateX: shakeAnim.interpolate({
                      inputRange: [-1, 0, 1],
                      outputRange: [-10, 0, 10],
                    }),
                  },
                ],
              }}
            >
              <Pressable
                onPress={() => !verifying && !verifySuccess && inputRef.current?.focus()}
                className="flex-row justify-center mb-2 gap-x-2 relative"
              >
                <TextInput
                  ref={inputRef}
                  value={verificationCode}
                  onChangeText={(val) => {
                    setVerificationCode(val);
                    if (val.length === 6) {
                      handleVerifyCode(val);
                    }
                  }}
                  maxLength={6}
                  keyboardType="number-pad"
                  className="absolute w-full h-full z-10" 
                  style={{ opacity: 0.01 }}
                  editable={!verifying && !verifySuccess}
                  caretHidden={true}
                />
                {[0, 1, 2, 3, 4, 5].map((index) => {
                  const filled = index < verificationCode.length;
                  const isActive = verificationCode.length === index && !verifying && !verifySuccess;
                  return (
                    <View
                      key={index}
                      className="w-11 h-14 rounded-xl items-center justify-center bg-white"
                      style={{
                        borderWidth: isActive ? 2 : 1,
                        borderColor: verifySuccess
                          ? "#16a34a"
                          : errorText
                          ? "#ef4444"
                          : isActive
                          ? "#26a6a2"
                          : filled
                          ? "#26a6a2"
                          : "#d1d5db",
                        backgroundColor: verifySuccess ? "#f0fdf4" : "white",
                        opacity: verifying ? 0.5 : 1,
                      }}
                    >
                      {verifySuccess ? (
                        index === 5 && (
                          <Animated.View
                            style={{
                              opacity: successAnim,
                              transform: [{ scale: successAnim }],
                            }}
                          >
                            <Check size={18} color="#16a34a" />
                          </Animated.View>
                        )
                      ) : (
                        <Text className="text-2xl font-bold text-gray-900">
                          {verificationCode[index] || ""}
                        </Text>
                      )}
                    </View>
                  );
                })}
              </Pressable>
            </Animated.View>

            {/* Inline verifying indicator */}
            {verifying && (
              <View className="flex-row items-center justify-center mb-4 mt-1">
                <ActivityIndicator size="small" color="#26a6a2" />
                <Text className="text-gray-500 text-xs font-medium ml-2">Verifying...</Text>
              </View>
            )}

            {/* Error Message */}
            {errorText && !verifySuccess ? (
              <Text className="text-red-500 text-center mb-2 mt-2 font-medium text-sm">
                {errorText}
              </Text>
            ) : (
              <View style={{ height: verifying ? 0 : 8 }} />
            )}

            {/* Resend Link */}
            {!verifySuccess && (
              <View className="items-center pb-2 pt-2">
                <Text className="text-gray-500 text-sm">
                  Didn't get an email?{" "}
                  <Text
                    onPress={isSendingEmail || verifying ? undefined : handleEmailSubmit}
                    className="font-medium"
                    style={{ color: isSendingEmail || verifying ? "#9ca3af" : "#26a6a2" }}
                  >
                    {isSendingEmail ? "Sending..." : "Resend code"}
                  </Text>
                </Text>
              </View>
            )}
          </View>
        </KeyboardAvoidingView>
      </Modal>
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