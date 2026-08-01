import { env } from "@/constants/env";
import { serverUrl } from "@/constants/serverUrl";
import { useAuth } from "@/Contexts/AuthContext";
import { checkUserDetails } from "@/lib/chamaService";
import { storage } from "@/Utils/storage";
import * as Google from "expo-auth-session/providers/google";
import { useRouter } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import { Shield, Mail, ArrowRight, ChevronLeft, KeyRound, Delete } from "lucide-react-native";
import { useState } from "react";
import {
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  Dimensions,
  ToastAndroid,
  TextInput,
  Modal,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Path, Svg } from "react-native-svg";

const { width } = Dimensions.get("window");

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
  const [showVerificationModal, setShowVerificationModal] = useState(false);
  const [verificationCode, setVerificationCode] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const router = useRouter();
  const { setAuth } = useAuth();
  const [request, response, promptAsync] = Google.useAuthRequest({
    androidClientId: env.GOOGLE_ANDROID_CLIENT_ID,
    iosClientId: env.GOOGLE_IOS_CLIENT_ID,
    webClientId: env.GOOGLE_WEB_CLIENT_ID,
  });

  const handleEmailSubmit = async () => {
    if (!email) return;
    setIsLoading(true);
    setErrorText("");
    try {
      const res = await fetch(`${serverUrl}/auth/send-verification-code`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setShowVerificationModal(true);
        setVerificationCode("");
      } else {
        setErrorText(data.message || "Failed to send code");
      }
    } catch (e) {
      setErrorText("Network error");
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyCode = async (code: string) => {
    setIsLoading(true);
    setErrorText("");
    try {
      const res = await fetch(`${serverUrl}/auth/verify-email-code`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, code }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        if (data.isNewUser) {
          setShowVerificationModal(false);
          router.replace({
            pathname: "/wallet-setup",
            params: { mode: "email", email, name: "", picture: "" },
          } as any);
        } else {
          await setAuth(data.token, data.user, data.refreshToken);
          setShowVerificationModal(false);
          router.replace("/pin-setup");
        }
      } else {
        setErrorText(data.message || "Invalid code");
        setVerificationCode(""); 
      }
    } catch (e) {
      setErrorText("Network error");
      setVerificationCode("");
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (key: string) => {
    if (key === 'delete') {
      setVerificationCode(prev => prev.slice(0, -1));
    } else if (key !== '') {
      if (verificationCode.length < 6) {
        const newCode = verificationCode + key;
        setVerificationCode(newCode);
        if (newCode.length === 6) {
          handleVerifyCode(newCode);
        }
      }
    }
  };

  const handleAuth = async (type: "google" | "apple") => {
    setErrorText("");
    try {
      if (type === "apple") {
        ToastAndroid.show("Apple Sign-In coming soon", ToastAndroid.SHORT);
        return;
      }

      const result = await promptAsync();

      if (result?.type === "success") {
        const accessToken = result.authentication?.accessToken;
        
        if (!accessToken) {
          setErrorText("Failed to retrieve access token.");
          return;
        }

        const profileResponse = await fetch("https://www.googleapis.com/userinfo/v2/me", {
          headers: { Authorization: `Bearer ${accessToken}` },
        });

        const profile = await profileResponse.json();

        if (!profile.email) {
          setErrorText("Failed to get email from Google.");
          return;
        }

        const email = profile.email;
        const nameFromProfile = profile.name || "";
        const pictureFromProfile = profile.picture || "";

        const userDetails = await checkUserDetails(email);
        
        if (userDetails.success) {
          const resp = await fetch(`${serverUrl}/auth/authenticate`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, provider: "google" }),
          });
          
          const data = await resp.json();
          if (resp.ok && data?.token && data?.user) {
            await setAuth(data.token, data.user, data.refreshToken || null);
          }
  
          router.replace("/(tabs)");
        } else {
          router.replace({
            pathname: "/wallet-setup",
            params: {
              mode: type,
              email,
              name: nameFromProfile,
              picture: pictureFromProfile,
            },
          } as any);
        }
      }
    } catch (error) {
      console.error(error);
      setErrorText("Failed to sign in. Please try again.");
    }
  };

  return (
    <View className="flex-1 bg-white">
      {/* Gradient Background using your Downy colors with rounded bottom */}
      <View
        className="absolute top-0 left-0 right-0 overflow-hidden"
        style={{
          height: "75%",
          backgroundColor: "#d1f6f1", // downy-100
          borderBottomLeftRadius: 30,
          borderBottomRightRadius: 30,
        }}
      />

      {/* Decorative circles using Downy palette */}
      <View
        className="absolute rounded-full"
        style={{
          top: -120,
          right: -90,
          width: 280,
          height: 280,
          backgroundColor: "#a3ece4", // downy-200
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
          backgroundColor: "#66d9d0", // downy-300
          opacity: 0.3,
        }}
      />
      {/* <View
        className="absolute rounded-full"
        style={{
          top: 300,
          right: 40,
          width: 150,
          height: 150,
          backgroundColor: "#3fc2bb", // downy-400
          opacity: 0.2,
        }}
      /> */}

      <SafeAreaView className="flex-1">
        <ScrollView
          className="flex-1"
          contentContainerStyle={{ flexGrow: 1 }}
          showsVerticalScrollIndicator={false}
        >
          <View className="flex-1 px-6 justify-between">
            {/* Header with Logo */}
            <View
              className="items-center flex-1 justify-center"
              style={{ paddingTop: 60 }}
            >
              {/* Logo */}
              <View
                className="mb-8 rounded-full overflow-hidden"
                style={{
                  width: 120,
                  height: 120,
                  backgroundColor: "white",
                  shadowColor: "#26a6a2", // downy-500
                  shadowOffset: { width: 0, height: 10 },
                  shadowOpacity: 0.25,
                  shadowRadius: 20,
                  elevation: 12,
                }}
              >
                <Image
                  source={chamapayLogo}
                  style={{
                    width: "100%",
                    height: "100%",
                  }}
                  resizeMode="contain"
                />
              </View>

              <Text className="text-5xl mb-4 text-gray-900 font-bold text-center">
                ChamaPay
              </Text>
              <Text
                className="text-center text-xl font-medium px-8"
                style={{ color: "#1c8584" }} // downy-600
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

            {/* Auth Buttons Section */}
            <View className="pb-8">
              {/* CTA Buttons in Row */}
              {/* CTA Buttons in Column */}
              <View className="mb-6">
                {/* Email Input / Button */}
                <View className="mb-3">
                  {!showEmailInput ? (
                    <Pressable
                      onPress={() => setShowEmailInput(true)}
                      className="w-full bg-white p-3 rounded-2xl flex-row items-center h-14"
                      style={[
                        styles.authButton,
                        {
                          borderWidth: 1,
                          borderColor: "#e5e7eb", // gray-200
                        },
                      ]}
                    >
                      <View className="w-8 h-8 bg-gray-100 rounded-lg items-center justify-center ml-1">
                        <Mail size={18} color="#4b5563" />
                      </View>
                      <View className="flex-1 ml-3 items-start justify-center">
                        <Text className="text-gray-800 font-medium text-base">
                          Continue with email
                        </Text>
                      </View>
                    </Pressable>
                  ) : (
                    <View className="w-full bg-white rounded-2xl flex-row items-center border border-[#e5e7eb] p-1 h-14" style={styles.authButton}>
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
                      />
                      <Pressable
                        onPress={handleEmailSubmit}
                        disabled={!email || isLoading}
                        className="px-4 h-full justify-center items-center"
                      >
                        {isLoading ? (
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

                {/* Google Button */}
                <Pressable
                  onPress={() => handleAuth("google")}
                  className="w-full bg-white p-3 rounded-2xl flex-row items-center h-14 mb-3"
                  style={[
                    styles.authButton,
                    {
                      borderWidth: 1,
                      borderColor: "#e5e7eb", // gray-200
                    },
                  ]}
                >
                  <View className="w-8 h-8 bg-gray-100 rounded-lg items-center justify-center ml-1">
                    <GoogleIcon />
                  </View>
                  <View className="flex-1 ml-3 items-start justify-center">
                    <Text className="text-gray-800 font-medium text-base">
                      Google
                    </Text>
                  </View>
                  <View className="bg-gray-100 px-3 py-1 rounded-full mr-1">
                    <Text className="text-gray-500 font-medium text-xs">Recent</Text>
                  </View>
                </Pressable>

                {/* Apple Button */}
                <Pressable
                  onPress={() => handleAuth("apple")}
                  className="w-full bg-white p-3 rounded-2xl flex-row items-center h-14 mb-3"
                  style={[
                    styles.authButton,
                    {
                      borderWidth: 1,
                      borderColor: "#e5e7eb", // gray-200
                    },
                  ]}
                >
                  <View className="w-8 h-8 bg-gray-100 rounded-lg items-center justify-center ml-1">
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
              </View>

              {/* Terms */}
              <Text className="text-xs text-gray-500 text-center px-8 leading-relaxed mb-6">
                By continuing, you agree to our{" "}
                <Text
                  className="font-semibold"
                  style={{ color: "#26a6a2" }} // downy-500
                >
                  Terms of Service
                </Text>{" "}
                and{" "}
                <Text
                  className="font-semibold"
                  style={{ color: "#26a6a2" }} // downy-500
                >
                  Privacy Policy
                </Text>
              </Text>

              {/* Powered by */}
              <View className="items-center mb-3 mt-2">
                <View
                  className="flex-row items-center "
                  style={{
                    // borderWidth: 1,
                    // borderColor: "#d1f6f1", // downy-100
                    // shadowColor: "#000",
                    // shadowOffset: { width: 0, height: 2 },
                    // shadowOpacity: 0.05,
                    // shadowRadius: 8,
                    // elevation: 2,
                  }}
                >
                  <Text className="text-xs text-gray-500 mr-2">Powered by</Text>
                  <Image
                    source={require("@/assets/images/thirdweb.png")}
                    className="w-6 h-6 mr-2 rounded-full"
                    resizeMode="contain"
                  />
                  <Text className="text-sm font-bold text-gray-800">
                    Thirdweb
                  </Text>
                </View>
              </View>
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>

      {/* Verification Modal */}
      <Modal visible={showVerificationModal} animationType="fade" transparent={true}>
        <View className="flex-1 justify-center items-center bg-black/50 px-4">
          <View className="bg-white w-full max-w-sm rounded-[24px] p-6 shadow-xl relative">
            {/* Header Icons */}
            <View className="flex-row justify-between w-full mb-4">
              <Pressable
                onPress={() => setShowVerificationModal(false)}
                className="w-8 h-8 bg-gray-100 rounded-full items-center justify-center"
              >
                <ChevronLeft size={20} color="#6b7280" />
              </Pressable>
              <Pressable
                onPress={() => setShowVerificationModal(false)}
                className="w-8 h-8 bg-gray-100 rounded-full items-center justify-center"
              >
                <Text className="text-gray-500 text-lg leading-none mb-1">×</Text>
              </Pressable>
            </View>

            <View className="items-center mb-6">
              <View className="w-16 h-16 bg-[#e0f2f1] rounded-full items-center justify-center mb-4">
                <KeyRound size={28} color="#26a6a2" />
              </View>
              <Text className="text-xl font-bold text-gray-900 mb-2 text-center">
                Enter confirmation code
              </Text>
              <Text className="text-gray-500 text-center text-sm leading-relaxed px-2">
                Please check <Text className="font-bold text-gray-800">{email}</Text> for an email and enter your code below.
              </Text>
            </View>

            {/* Code Input Boxes */}
            <View className="flex-row justify-center mb-6 gap-x-2 relative">
              <TextInput
                value={verificationCode}
                onChangeText={(val) => {
                  setVerificationCode(val);
                  if (val.length === 6) {
                    handleVerifyCode(val);
                  }
                }}
                maxLength={6}
                keyboardType="number-pad"
                autoFocus={true}
                className="absolute w-full h-full opacity-0" 
                editable={!isLoading}
                caretHidden={true}
              />
              {[0, 1, 2, 3, 4, 5].map((index) => (
                <View
                  key={index}
                  className={`w-11 h-14 rounded-xl items-center justify-center bg-white`}
                  style={{
                    borderWidth: verificationCode.length === index ? 2 : 1,
                    borderColor: verificationCode.length === index ? "#26a6a2" : "#d1d5db",
                  }}
                >
                  <Text className="text-2xl font-bold text-gray-900">
                    {verificationCode[index] || ""}
                  </Text>
                </View>
              ))}
            </View>

            {/* Error Message */}
            {errorText ? (
              <Text className="text-red-500 text-center mb-4 font-medium text-sm">
                {errorText}
              </Text>
            ) : null}

            {/* Resend Link */}
            <View className="items-center pb-2">
              <Text className="text-gray-500 text-sm">
                Didn't get an email?{" "}
                <Text
                  onPress={handleEmailSubmit}
                  className="font-medium"
                  style={{ color: "#26a6a2" }}
                >
                  Resend code
                </Text>
              </Text>
            </View>

            {/* Powered by */}
            <View className="items-center mt-4">
              <View className="flex-row items-center">
                <Text className="text-xs text-gray-400 mr-2">Protected by</Text>
                <Image
                  source={require("@/assets/images/thirdweb.png")}
                  className="w-4 h-4 mr-1 rounded-full opacity-50"
                  resizeMode="contain"
                />
                <Text className="text-xs font-bold text-gray-400">
                  Thirdweb
                </Text>
              </View>
            </View>
          </View>
        </View>
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
