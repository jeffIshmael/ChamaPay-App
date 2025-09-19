// import { getAuth, PhoneAuthProvider, signInWithCredential, signInWithPhoneNumber } from '@react-native-firebase/auth';
import { useLocalSearchParams, useRouter } from "expo-router";
import { ArrowLeft, Clock, Shield } from "lucide-react-native";
import React, { useEffect, useRef, useState } from "react";
import {
    Alert,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function OTPVerificationScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  
  // Get phone number and delivery method from previous screen
  const phoneNumber = params.phoneNumber as string || "+254712345678";
  const deliveryMethod = params.deliveryMethod as string || "sms";
  
  const [otpCode, setOtpCode] = useState(["", "", "", "", "", ""]);
  const [loading, setLoading] = useState(false);
  const [errorText, setErrorText] = useState("");
  const [resendLoading, setResendLoading] = useState(false);
  const [countdown, setCountdown] = useState(30);
  const [canResend, setCanResend] = useState(false);
  
  // Refs for OTP inputs
  const otpRefs = useRef<TextInput[]>([]);

  // Countdown timer for resend
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    } else {
      setCanResend(true);
    }
  }, [countdown]);

  const handleOtpChange = (value: string, index: number) => {
    setErrorText("");
    const newOtp = [...otpCode];
    newOtp[index] = value;
    setOtpCode(newOtp);

    // Auto focus next input
    if (value && index < 5) {
      otpRefs.current[index + 1]?.focus();
    }

    // Auto verify when all digits are entered
    if (newOtp.every(digit => digit !== "") && newOtp.join("").length === 6) {
      verifyOTP(newOtp.join(""));
    }
  };

  const handleKeyPress = (e: any, index: number) => {
    if (e.nativeEvent.key === 'Backspace' && !otpCode[index] && index > 0) {
      otpRefs.current[index - 1]?.focus();
    }
  };

  const verifyOTP = async (code?: string) => {
    const codeToVerify = code || otpCode.join("");
    
    if (codeToVerify.length !== 6) {
      setErrorText("Please enter the complete 6-digit code");
      return;
    }

    try {
      setLoading(true);
      setErrorText("");
      
      // Use React Native Firebase to verify the OTP
      // const credential = PhoneAuthProvider.credential(phoneNumber, codeToVerify);
      // await signInWithCredential(getAuth(), credential);
      
      setLoading(false);
      
      // Success
      Alert.alert(
        "Verification Successful!",
        "Your phone number has been verified.",
        [
          {
            text: "Continue",
            onPress: () => router.replace("/(tabs)"),
          },
        ]
      );
    } catch (e: any) {
      setLoading(false);
      console.log("OTP verification error:", e);
      
      // Handle specific error cases
      if (e.code === 'auth/invalid-verification-code') {
        setErrorText("Invalid verification code. Please try again.");
        setOtpCode(["", "", "", "", "", ""]);
        otpRefs.current[0]?.focus();
      } else if (e.code === 'auth/code-expired') {
        setErrorText("Verification code has expired. Please request a new one.");
        setOtpCode(["", "", "", "", "", ""]);
        otpRefs.current[0]?.focus();
      } else {
        setErrorText("Verification failed. Please try again.");
        setOtpCode(["", "", "", "", "", ""]);
        otpRefs.current[0]?.focus();
      }
    }
  };

  const resendCode = async () => {
    if (!canResend || resendLoading) return;
    
    try {
      setResendLoading(true);
      setErrorText("");
      
      // Use React Native Firebase to resend OTP
      // await signInWithPhoneNumber(getAuth(), phoneNumber);
      
      setResendLoading(false);
      setCountdown(30);
      setCanResend(false);
      setOtpCode(["", "", "", "", "", ""]);
      otpRefs.current[0]?.focus();
      
      Alert.alert(
        "Code Sent!",
        `A new verification code has been sent to your phone via ${deliveryMethod.toUpperCase()}.`
      );
    } catch (e: any) {
      setResendLoading(false);
      console.log("Resend code error:", e);
      
      if (e.code === 'auth/too-many-requests') {
        setErrorText("Too many requests. Please try again later.");
      } else if (e.code === 'auth/quota-exceeded') {
        setErrorText("SMS quota exceeded. Please try again later.");
      } else {
        setErrorText("Failed to resend code. Please try again.");
      }
    }
  };

  const formatPhoneNumber = (phone: string) => {
    // Format phone number for display
    if (phone.length > 10) {
      return phone.replace(/(\+\d{1,3})(\d{3})(\d{3})(\d{3})/, "$1 $2 $3 $4");
    }
    return phone;
  };

  return (
    <SafeAreaView className="flex-1" style={{ backgroundColor: "#f8fafc" }}>
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ flexGrow: 1 }}
        showsVerticalScrollIndicator={false}
      >
        <View className="flex-1 px-6">
          {/* Header with back button */}
          <View className="flex-row items-center justify-between" style={{ paddingTop: 20, marginBottom: 40 }}>
            <Pressable
              onPress={() => router.back()}
              className="w-10 h-10 rounded-full bg-white items-center justify-center"
              style={styles.backButton}
            >
              <ArrowLeft color="#6b7280" size={20} />
            </Pressable>
            <Text className="text-lg font-semibold text-gray-900">Verify Code</Text>
            <View className="w-10" />
          </View>

          {/* Main Content */}
          <View className="items-center mb-8">
            <View
              className="w-20 h-20 rounded-full items-center justify-center mb-6"
              style={[styles.headerIcon, { backgroundColor: "#059669" }]}
            >
              <Shield color="white" size={32} />
            </View>
            <Text className="text-3xl mb-3 text-gray-900 font-bold text-center">
              Enter verification code
            </Text>
            <Text className="text-gray-500 text-center text-base leading-6 px-4">
              We sent a 6-digit code to {formatPhoneNumber(phoneNumber)} via {deliveryMethod.toUpperCase()}
            </Text>
          </View>

          {/* Error Message */}
          {errorText ? (
            <View
              className="flex-row items-center bg-red-50 p-4 rounded-xl mb-6"
              style={[styles.card, { borderLeftWidth: 4, borderLeftColor: "#ef4444" }]}
            >
              <Shield color="#ef4444" size={20} />
              <Text className="text-red-600 ml-3 text-sm font-medium">{errorText}</Text>
            </View>
          ) : null}

          {/* OTP Input */}
          <View className="bg-white rounded-2xl p-6 mb-6" style={styles.card}>
            <Text className="text-gray-700 text-base font-semibold mb-6 text-center">
              Enter the 6-digit code
            </Text>
            
            <View className="flex-row justify-center gap-3 mb-6">
              {otpCode.map((digit, index) => (
                <TextInput
                  key={index}
                  ref={(ref) => {
                    if (ref) otpRefs.current[index] = ref;
                  }}
                  className="w-12 h-14 text-center text-xl font-bold text-gray-900 bg-gray-50 rounded-xl border-2"
                  style={[
                    styles.otpInput,
                    {
                      borderColor: digit ? "#059669" : "#e5e7eb",
                      backgroundColor: digit ? "#f0fdf4" : "#f9fafb",
                    }
                  ]}
                  value={digit}
                  onChangeText={(value) => handleOtpChange(value, index)}
                  onKeyPress={(e) => handleKeyPress(e, index)}
                  keyboardType="numeric"
                  maxLength={1}
                  selectTextOnFocus
                />
              ))}
            </View>

            {/* Manual Verify Button */}
            <Pressable
              onPress={() => verifyOTP()}
              className={`py-4 rounded-xl items-center ${
                loading 
                  ? "bg-emerald-400" 
                  : otpCode.every(d => d !== "") 
                    ? "bg-emerald-600" 
                    : "bg-gray-300"
              }`}
              disabled={loading || !otpCode.every(d => d !== "")}
              style={!otpCode.every(d => d !== "") ? { opacity: 0.6 } : {}}
            >
              <Text className="text-white font-semibold text-lg">
                {loading ? "Verifying..." : "Verify Code"}
              </Text>
            </Pressable>
          </View>

          {/* Resend Section */}
          <View className="bg-white rounded-2xl p-6 mb-6" style={styles.card}>
            <View className="flex-row items-center justify-center mb-4">
              <Clock color="#6b7280" size={18} />
              <Text className="text-gray-600 ml-2 text-base">
                {canResend ? "You can resend the code now" : `Resend code in ${countdown}s`}
              </Text>
            </View>
            
            <Pressable
              onPress={resendCode}
              className={`py-3 rounded-xl items-center border-2 ${
                canResend && !resendLoading
                  ? "border-emerald-500 bg-emerald-50" 
                  : "border-gray-200 bg-gray-50"
              }`}
              disabled={!canResend || resendLoading}
              style={(!canResend || resendLoading) ? { opacity: 0.6 } : {}}
            >
              <Text className={`font-semibold ${
                canResend && !resendLoading ? "text-emerald-600" : "text-gray-400"
              }`}>
                {resendLoading ? "Sending..." : "Resend Code"}
              </Text>
            </Pressable>

            <Pressable
              onPress={() => router.back()}
              className="py-3 mt-3 rounded-xl items-center"
            >
              <Text className="text-gray-500 font-medium">
                Change phone number
              </Text>
            </Pressable>
          </View>

          {/* Spacer */}
          <View style={{ flexGrow: 1 }} />

          {/* Footer */}
          <View className="pb-8">
            <Text className="text-xs text-gray-400 text-center px-6 leading-5">
              Didn't receive the code? Check your spam folder or try resending.
            </Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  card: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 8,
  },
  headerIcon: {
    shadowColor: "#059669",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 10,
  },
  backButton: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 3,
  },
  otpInput: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
});