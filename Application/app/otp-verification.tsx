import { serverUrl } from "@/constants/serverUrl";
import { useRouter, useLocalSearchParams } from "expo-router";
import { ArrowLeft, Mail, RotateCcw } from "lucide-react-native";
import React, { useState, useRef, useEffect } from "react";
import {
  SafeAreaView,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function OTPVerification() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams();
  
  const { pendingUserId, email } = params;
  
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [errorText, setErrorText] = useState("");
  const [timer, setTimer] = useState(600); // 10 minutes
  const [canResend, setCanResend] = useState(false);
  
  const inputRefs = useRef<(TextInput | null)[]>([]);

  useEffect(() => {
    const countdown = setInterval(() => {
      setTimer((prev) => {
        if (prev <= 1) {
          setCanResend(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(countdown);
  }, []);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleOtpChange = (value: string, index: number) => {
    if (value.length > 1) return; // Prevent multiple characters
    
    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);
    setErrorText("");

    // Auto-focus next input
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyPress = (key: string, index: number) => {
    if (key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleVerifyOTP = async () => {
    const otpString = otp.join('');
    
    if (otpString.length !== 6) {
      setErrorText("Please enter the complete 6-digit code");
      return;
    }

    try {
      setLoading(true);
      setErrorText("");
      
      const response = await fetch(`${serverUrl}/auth/verify-email`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pendingUserId: parseInt(pendingUserId as string),
          otp: otpString,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        // Registration completed successfully
        router.replace({
          pathname: "/auth-screen",
          params: { 
            message: "Registration completed! Please login with your credentials.",
            email: email
          }
        });
      } else {
        setErrorText(data.error || "Verification failed. Please try again.");
        // Clear OTP inputs on error
        setOtp(['', '', '', '', '', '']);
        inputRefs.current[0]?.focus();
      }
    } catch (error) {
      console.error("OTP verification error:", error);
      setErrorText("An error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleResendOTP = async () => {
    try {
      setResendLoading(true);
      setErrorText("");
      
      const response = await fetch(`${serverUrl}/auth/resend-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pendingUserId: parseInt(pendingUserId as string),
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setTimer(600); // Reset timer to 10 minutes
        setCanResend(false);
        setOtp(['', '', '', '', '', '']);
        inputRefs.current[0]?.focus();
      } else {
        setErrorText(data.error || "Failed to resend code. Please try again.");
      }
    } catch (error) {
      console.error("Resend OTP error:", error);
      setErrorText("An error occurred. Please try again.");
    } finally {
      setResendLoading(false);
    }
  };

  return (
    <SafeAreaView
      className="flex-1 bg-white"
      style={{ paddingTop: insets.top }}
    >
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        {/* Header */}
        <View className="flex-row items-center px-4 py-2 border-b border-gray-200">
          <TouchableOpacity
            onPress={() => router.back()}
            className="p-2 rounded-lg active:bg-gray-100"
          >
            <ArrowLeft size={20} color="#374151" />
          </TouchableOpacity>
          <Text className="text-lg font-semibold text-gray-900 ml-4">
            Verify Email
          </Text>
        </View>

        <ScrollView
          className="flex-1 px-6"
          contentContainerStyle={{ flexGrow: 1 }}
          showsVerticalScrollIndicator={false}
        >
          {/* Header Section */}
          <View className="items-center mb-8" style={{ paddingTop: 40 }}>
            <View
              className="w-20 h-20 rounded-full items-center justify-center mb-6"
              style={{ backgroundColor: "#059669" }}
            >
              <Mail color="white" size={32} />
            </View>
            <Text className="text-3xl mb-2 text-gray-900 font-bold text-center">
              Check Your Email
            </Text>
            <Text className="text-gray-600 text-center max-w-sm">
              We've sent a 6-digit verification code to{'\n'}
              <Text className="font-medium text-emerald-600">{email}</Text>
            </Text>
          </View>

          {/* OTP Input */}
          <View className="mb-6">
            <Text className="text-gray-700 text-center mb-4">
              Enter verification code
            </Text>
            <View className="flex-row justify-center gap-3 mb-4">
              {otp.map((digit, index) => (
                <TextInput
                  key={index}
                  ref={(ref) => { inputRefs.current[index] = ref; }}
                  className="w-12 h-12 border-2 border-gray-300 rounded-lg text-center text-xl font-semibold text-gray-900"
                  style={{
                    borderColor: digit ? "#059669" : "#d1d5db",
                  }}
                  value={digit}
                  onChangeText={(value) => handleOtpChange(value, index)}
                  onKeyPress={({ nativeEvent }) => handleKeyPress(nativeEvent.key, index)}
                  keyboardType="numeric"
                  maxLength={1}
                  selectTextOnFocus
                />
              ))}
            </View>
            
            {/* Timer */}
            <Text className="text-center text-gray-600 text-sm">
              {timer > 0 ? `Code expires in ${formatTime(timer)}` : "Code expired"}
            </Text>
          </View>

          {/* Error Message */}
          {errorText && (
            <View className="bg-red-50 p-3 rounded-lg mb-4">
              <Text className="text-red-600 text-sm text-center">{errorText}</Text>
            </View>
          )}

          {/* Verify Button */}
          <TouchableOpacity
            onPress={handleVerifyOTP}
            disabled={loading || otp.join('').length !== 6}
            className={`py-4 rounded-lg items-center justify-center mb-4 ${
              loading || otp.join('').length !== 6
                ? "bg-gray-300"
                : "bg-emerald-600 active:bg-emerald-700"
            }`}
          >
            <Text className="text-white font-medium text-lg">
              {loading ? "Verifying..." : "Verify Email"}
            </Text>
          </TouchableOpacity>

          {/* Resend Code */}
          <View className="items-center">
            <Text className="text-gray-600 text-sm mb-2">
              Didn't receive the code?
            </Text>
            <TouchableOpacity
              onPress={handleResendOTP}
              disabled={!canResend || resendLoading}
              className={`flex-row items-center px-4 py-2 rounded-lg ${
                canResend && !resendLoading
                  ? "active:bg-gray-100"
                  : "opacity-50"
              }`}
            >
              <RotateCcw size={16} color="#059669" style={{ marginRight: 8 }} />
              <Text className="text-emerald-600 font-medium">
                {resendLoading ? "Sending..." : "Resend Code"}
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
