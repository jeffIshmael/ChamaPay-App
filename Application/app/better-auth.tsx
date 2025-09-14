import { TabButton } from "@/components/ui/TabButton";
import { serverUrl } from "@/constants/serverUrl";
import { useAuth } from "@/contexts/AuthContext";
import axios from "axios";
import { useRouter, useLocalSearchParams } from "expo-router";
import { Lock, Mail, Shield, User, Users } from "lucide-react-native";
import React, { useState, useEffect } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
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

export default function AuthScreen() {
  const [activeSection, setActiveSection] = useState("signup");
  const [email, setEmail] = useState("");
  const [userName, setUserName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [errorText, setErrorText] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { login } = useAuth();
  const params = useLocalSearchParams();

  // Handle incoming success message and email from OTP verification
  useEffect(() => {
    if (params.message) {
      setSuccessMessage(params.message as string);
      setActiveSection("login");
      if (params.email) {
        setEmail(params.email as string);
      }
    }
  }, [params]);

  const handleLogin = async () => {
    setErrorText("");
    setSuccessMessage("");
    if (!email || !password) {
      setErrorText("All fields are required");
      return;
    }
    
    try {
      setLoading(true);
      const result = await login(email, password);
      
      if (result.success) {
        router.replace("/(tabs)");
      } else {
        setErrorText(result.error || "Login failed. Please try again.");
      }
    } catch (error) {
      console.error("Login error:", error);
      setErrorText("An error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = async () => {
    setErrorText("");
    setSuccessMessage("");
    if (!email || !password || !userName) {
      setErrorText("All fields are required");
      return;
    }
    if (password !== confirmPassword) {
      setErrorText("Passwords do not match");
      return;
    }
    try {
      setLoading(true);
      const response = await axios.post(`${serverUrl}/auth/request-registration`, {
        email,
        password,
        userName,
      });
      
      if (response.status === 200) {
        // Navigate to OTP verification screen
        router.push({
          pathname: "/otp-verification",
          params: {
            pendingUserId: response.data.pendingUserId,
            email: response.data.email,
          },
        });
      } else {
        setErrorText("Registration failed. Please try again.");
      }
    } catch (error: any) {
      console.error("Registration error:", error);
      setErrorText(
        error.response?.data?.error || "Registration failed. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  const resetFormFields = () => {
    setEmail("");
    setUserName("");
    setPassword("");
    setConfirmPassword("");
    setErrorText("");
    setSuccessMessage("");
  };

  const handleGoogleLogin = () => {
    setErrorText("Google Sign-In is under development.");
  };

  return (
    <SafeAreaView className="flex-1 bg-white">
      <ScrollView
        className="flex-1 px-6"
        contentContainerStyle={{ flexGrow: 1 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View className="items-center mb-8" style={{ paddingTop: 40 }}>
          <View
            className="w-20 h-20 rounded-full items-center justify-center mb-6"
            style={{ backgroundColor: "#059669" }}
          >
            <Users color="white" size={32} />
          </View>
          <Text className="text-3xl mb-2 text-gray-900 font-bold">
            {activeSection === "login" ? "Welcome Back" : "Join ChamaPay"}
          </Text>
          <Text className="text-gray-600 text-center">
            {activeSection === "login" 
              ? "Sign in to continue to your account"
              : "Create your account to get started"}
          </Text>
        </View>

        {/* Toggle */}
        <View className="flex-row bg-gray-100 rounded-xl p-1 mb-6">
          <TabButton label="Log In" value="login" isActive={activeSection === "login"} onPress={() => {
            resetFormFields();
            setActiveSection("login");
          }} />
          <TouchableOpacity
            className={`flex-1 py-3 rounded-lg ${activeSection !== "login"  ? "bg-white shadow-sm" : ""}`}
            onPress={() => {
              resetFormFields();
              setActiveSection("signup");
            }}
          >
            <Text className={`text-center font-medium ${activeSection !== "login" ? "text-gray-900" : "text-gray-500"}`}>
              Sign Up
            </Text>
          </TouchableOpacity>
        </View>

        {/* Form */}
        <View className="bg-white rounded-2xl p-6 mb-8" style={styles.card}>
          {/* Success Message */}
          {successMessage && (
            <View className="flex-row items-center bg-green-50 p-3 rounded-lg mb-4">
              <Shield color="#059669" size={18} />
              <Text className="text-green-600 ml-2 text-sm">{successMessage}</Text>
            </View>
          )}

          {/* Error Message */}
          {errorText && (
            <View className="flex-row items-center bg-red-50 p-3 rounded-lg mb-4">
              <Shield color="#ef4444" size={18} />
              <Text className="text-red-600 ml-2 text-sm">{errorText}</Text>
            </View>
          )}

          {activeSection !== "login" && (
            <View className="mb-4">
              <Text className="text-gray-500 text-sm mb-1">Username</Text>
              <View className="flex-row items-center border border-gray-200 rounded-lg px-4 py-3">
                <User size={18} color="#9ca3af" />
                <TextInput
                  className="flex-1 ml-3 text-gray-900"
                  placeholder="Enter your username"
                  value={userName}
                  onChangeText={setUserName}
                  autoCapitalize="none"
                />
              </View>
            </View>
          )}

          <View className="mb-4">
            <Text className="text-gray-500 text-sm mb-1">Email</Text>
            <View className="flex-row items-center border border-gray-200 rounded-lg px-4 py-3">
              <Mail size={18} color="#9ca3af" />
              <TextInput
                className="flex-1 ml-3 text-gray-900"
                placeholder="Enter your email"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>
          </View>

          <View className="mb-4">
            <Text className="text-gray-500 text-sm mb-1">Password</Text>
            <View className="flex-row items-center border border-gray-200 rounded-lg px-4 py-3">
              <Lock size={18} color="#9ca3af" />
              <TextInput
                className="flex-1 ml-3 text-gray-900"
                placeholder="Enter your password"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
              />
            </View>
          </View>

          {activeSection !== "login" && (
            <View className="mb-6">
              <Text className="text-gray-500 text-sm mb-1">Confirm Password</Text>
              <View className="flex-row items-center border border-gray-200 rounded-lg px-4 py-3">
                <Lock size={18} color="#9ca3af" />
                <TextInput
                  className="flex-1 ml-3 text-gray-900"
                  placeholder="Confirm your password"
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  secureTextEntry
                />
              </View>
            </View>
          )}

          {activeSection === "login" && (
            <TouchableOpacity className="mb-6">
              <Text className="text-right text-emerald-600 text-sm">
                Forgot password?
              </Text>
            </TouchableOpacity>
          )}

          <Pressable
            onPress={activeSection === "login" ? handleLogin : handleSignUp}
            className={`py-3 rounded-lg items-center ${loading ? "bg-emerald-700" : "bg-emerald-600"}`}
            disabled={loading}
          >
            <Text className="text-white font-medium">
              {loading ? "Processing..." : activeSection === "login" ? "Login" : "Create Account"}
            </Text>
          </Pressable>
        </View>

        {/* Divider */}
        <View className="flex-row items-center mb-6">
          <View className="flex-1 h-px bg-gray-200" />
          <Text className="mx-4 text-gray-500 text-sm">OR</Text>
          <View className="flex-1 h-px bg-gray-200" />
        </View>

        {/* Google Sign In */}
        <Pressable
          onPress={handleGoogleLogin}
          className="w-full bg-white border border-gray-200 py-3 rounded-lg flex-row items-center justify-center mb-6"
          style={styles.card}
        >
          <GoogleIcon />
          <Text className="text-gray-700 ml-3 font-medium">
            Continue with Google
          </Text>
        </Pressable>

        <Text className="text-xs text-gray-500 text-center mb-8 px-4 leading-relaxed">
          By continuing, you agree to our Terms of Service and Privacy Policy
        </Text>
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
