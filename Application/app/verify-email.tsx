import { serverUrl } from "@/constants/serverUrl";
import { useAuth } from "@/Contexts/AuthContext";
import { checkUserDetails } from "@/lib/chamaService";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Shield, Mail, ArrowLeft } from "lucide-react-native";
import { useState, useRef, useEffect } from "react";
import {
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const chamapayLogo = require("@/assets/images/chamapay-logo.png");

export default function VerifyEmailScreen() {
  const params = useLocalSearchParams();
  const email = params.email as string;
  const router = useRouter();
  const { setAuth } = useAuth();
  
  const [code, setCode] = useState(["", "", "", "", "", ""]);
  const [errorText, setErrorText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [resendTimer, setResendTimer] = useState(60);
  const [canResend, setCanResend] = useState(false);

  const inputRefs = useRef<(TextInput | null)[]>([]);

  // Timer for resend button
  useEffect(() => {
    if (resendTimer > 0) {
      const timer = setTimeout(() => setResendTimer(resendTimer - 1), 1000);
      return () => clearTimeout(timer);
    } else {
      setCanResend(true);
    }
  }, [resendTimer]);

  const handleCodeChange = (value: string, index: number) => {
    // Only allow numbers
    if (value && !/^\d$/.test(value)) return;

    const newCode = [...code];
    newCode[index] = value;
    setCode(newCode);
    setErrorText("");

    // Auto-focus next input
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }

    // Auto-submit when all fields are filled
    if (value && index === 5 && newCode.every((digit) => digit !== "")) {
      handleVerify(newCode.join(""));
    }
  };

  const handleKeyPress = (e: any, index: number) => {
    // Handle backspace
    if (e.nativeEvent.key === "Backspace" && !code[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleVerify = async (verificationCode?: string) => {
    const codeToVerify = verificationCode || code.join("");

    if (codeToVerify.length !== 6) {
      setErrorText("Please enter the complete 6-digit code");
      return;
    }

    setIsLoading(true);
    setErrorText("");

    try {
      // Verify the code
      const resp = await fetch(`${serverUrl}/auth/verify-code`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.toLowerCase().trim(),
          code: codeToVerify,
        }),
      });

      const data = await resp.json();

      if (resp.ok) {
        // Check if user exists
        const userDetails = await checkUserDetails(email);

        if (userDetails.success && data?.token && data?.user) {
          // Existing user - log them in
          await setAuth(data.token, data.user, data.refreshToken || null);
          router.replace("/(tabs)");
        } else {
          // New user - redirect to setup
          router.replace({
            pathname: "/wallet-setup",
            params: {
              mode: "email",
              email: email.toLowerCase().trim(),
              verified: "true",
            },
          } as any);
        }
      } else {
        setErrorText(
          data?.message || "Invalid code. Please check and try again."
        );
        // Clear the code on error
        setCode(["", "", "", "", "", ""]);
        inputRefs.current[0]?.focus();
      }
    } catch (error) {
      console.error("Verification error:", error);
      setErrorText("Failed to verify code. Please try again.");
      setCode(["", "", "", "", "", ""]);
      inputRefs.current[0]?.focus();
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendCode = async () => {
    if (!canResend || isResending) return;

    setIsResending(true);
    setErrorText("");

    try {
      const resp = await fetch(`${serverUrl}/auth/send-code`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.toLowerCase().trim() }),
      });

      const data = await resp.json();

      if (resp.ok) {
        setResendTimer(60);
        setCanResend(false);
        setCode(["", "", "", "", "", ""]);
        inputRefs.current[0]?.focus();
      } else {
        setErrorText(data?.message || "Failed to resend code");
      }
    } catch (error) {
      console.error("Resend error:", error);
      setErrorText("Failed to resend code. Please try again.");
    } finally {
      setIsResending(false);
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
          <View className="flex-1 px-6">
            {/* Back Button */}
            <Pressable
              onPress={() => router.back()}
              className="flex-row items-center mb-8 mt-4"
              disabled={isLoading}
            >
              <ArrowLeft color="#26a6a2" size={24} />
              <Text
                className="ml-2 text-base font-semibold"
                style={{ color: "#26a6a2" }}
              >
                Back
              </Text>
            </Pressable>

            {/* Header */}
            <View className="items-center mb-8">
              <View
                className="mb-6 rounded-full overflow-hidden"
                style={{
                  width: 80,
                  height: 80,
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

              <View
                className="w-16 h-16 rounded-full items-center justify-center mb-4"
                style={{ backgroundColor: "#d1f6f1" }}
              >
                <Mail color="#26a6a2" size={32} />
              </View>

              <Text className="text-3xl font-bold text-gray-900 text-center mb-3">
                Check your email
              </Text>
              <Text className="text-center text-base text-gray-600 px-4">
                We've sent a 6-digit code to
              </Text>
              <Text
                className="text-center text-base font-semibold mt-1"
                style={{ color: "#26a6a2" }}
              >
                {email}
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

            {/* Code Input */}
            <View className="mb-8">
              <Text className="text-sm font-semibold text-gray-700 mb-3 text-center">
                Enter verification code
              </Text>
              <View className="flex-row justify-center" style={{ gap: 10 }}>
                {code.map((digit, index) => (
                  <TextInput
                    key={index}
                    ref={(ref) => {
                      inputRefs.current[index] = ref;
                    }}
                    className="text-center text-2xl font-bold rounded-xl"
                    style={[
                      {
                        width: 50,
                        height: 60,
                        borderWidth: 2,
                        borderColor: digit ? "#26a6a2" : "#a3ece4",
                        backgroundColor: "white",
                        color: "#1f2937",
                      },
                      styles.card,
                    ]}
                    value={digit}
                    onChangeText={(value) => handleCodeChange(value, index)}
                    onKeyPress={(e) => handleKeyPress(e, index)}
                    keyboardType="number-pad"
                    maxLength={1}
                    selectTextOnFocus
                    editable={!isLoading}
                  />
                ))}
              </View>
            </View>

            {/* Verify Button */}
            <Pressable
              onPress={() => handleVerify()}
              disabled={isLoading || code.some((digit) => !digit)}
              className="p-4 rounded-2xl items-center justify-center mb-6"
              style={[
                styles.authButton,
                {
                  backgroundColor:
                    isLoading || code.some((digit) => !digit)
                      ? "#a3ece4"
                      : "#26a6a2",
                },
              ]}
            >
              {isLoading ? (
                <ActivityIndicator color="white" />
              ) : (
                <Text className="text-white font-bold text-base">
                  Verify Code
                </Text>
              )}
            </Pressable>

            {/* Resend Code */}
            <View className="items-center">
              <Text className="text-gray-600 text-sm mb-2">
                Didn't receive the code?
              </Text>
              {canResend ? (
                <Pressable
                  onPress={handleResendCode}
                  disabled={isResending}
                  className="px-6 py-2"
                >
                  {isResending ? (
                    <ActivityIndicator size="small" color="#26a6a2" />
                  ) : (
                    <Text
                      className="text-base font-bold"
                      style={{ color: "#26a6a2" }}
                    >
                      Resend Code
                    </Text>
                  )}
                </Pressable>
              ) : (
                <Text className="text-gray-500 text-sm">
                  Resend code in {resendTimer}s
                </Text>
              )}
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