import { serverUrl } from "@/constants/serverUrl";
import { useAuth } from "@/Contexts/AuthContext";
import { checkUsernameAvailability } from "@/lib/chamaService";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Clipboard from "expo-clipboard";
import { useLocalSearchParams, useRouter } from "expo-router";
import {
  CheckCircle,
  Copy,
  Shield,
  Wallet,
  X,
  Loader2,
  Sparkles,
  Lock,
  User,
} from "lucide-react-native";
import React, { useEffect, useState } from "react";
import {
  Alert,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Animated,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function WalletSetup() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    mode?: string;
    email?: string;
    name?: string;
    picture?: string;
    verified?: string;
  }>();
  const { registerUser } = useAuth();

  // Animation values
  const fadeAnim = new Animated.Value(0);
  const slideAnim = new Animated.Value(50);

  const [step, setStep] = useState<"creating" | "created" | "secured">("creating");
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [username, setUsername] = useState("");
  const [savingName, setSavingName] = useState(false);
  const [hasNameMissing, setHasNameMissing] = useState(true);
  const [usernameStatus, setUsernameStatus] = useState<
    "idle" | "checking" | "available" | "unavailable" | "invalid"
  >("idle");
  const [usernameMessage, setUsernameMessage] = useState("");
  const isUsernameValid = username.trim().length > 2 && usernameStatus === "available";

  // Animate on mount
  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 500,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  // Check username availability with debouncing
  useEffect(() => {
    const checkUsername = async () => {
      if (username.trim().length < 3) {
        setUsernameStatus("idle");
        setUsernameMessage("");
        return;
      }

      setUsernameStatus("checking");
      setUsernameMessage("Checking availability...");

      try {
        const result = await checkUsernameAvailability(username.trim());
        if (result.success && result.available) {
          setUsernameStatus("available");
          setUsernameMessage("✓ Username is available");
        } else {
          setUsernameStatus("unavailable");
          setUsernameMessage(result.message || "Username is not available");
        }
      } catch (error) {
        setUsernameStatus("invalid");
        setUsernameMessage("Error checking username");
      }
    };

    const timeoutId = setTimeout(checkUsername, 500);
    return () => clearTimeout(timeoutId);
  }, [username]);

  // Simulate wallet creation steps
  useEffect(() => {
    const timer1 = setTimeout(() => setStep("created"), 2000);
    const timer2 = setTimeout(() => setStep("secured"), 4000);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
    };
  }, []);

  // Pre-fill username from params
  useEffect(() => {
    if (params.name) {
      setUsername(params.name);
    }
  }, [params.name]);

  const getUserDetails = async () => {
    try {
      const token = await AsyncStorage.getItem("token");
      if (!token) {
        return;
      }

      const response = await fetch(`${serverUrl}/user`, {
        method: "GET",
        headers: { Authorization: `Bearer ${token}` },
      });

      const Details = await response.json();

      if (response.ok) {
        setWalletAddress(Details.user.address);
        const currentName = Details.user?.userName;
        setHasNameMissing(!currentName || !String(currentName).trim());
        setUsername(currentName || "");
      }
    } catch (error) {
      console.log("Error fetching user details:", error);
    }
  };

  useEffect(() => {
    const fetchUser = async () => {
      const token = await AsyncStorage.getItem("token");
      if (token) {
        await getUserDetails();
      } else {
        setHasNameMissing(true);
      }
    };
    fetchUser();
  }, []);

  const saveUsername = async () => {
    if (!isUsernameValid) {
      Alert.alert("Invalid Username", "Please choose a valid username");
      return;
    }

    if (!params.email) {
      Alert.alert("Error", "Email not found. Please sign in again.");
      return;
    }

    setSavingName(true);

    try {
      const response = await registerUser({
        email: params.email,
        userName: username.trim(),
        profileImageUrl: params.picture || undefined,
      });

      if (response.success) {
        setHasNameMissing(false);
        
        // Wait a bit to show success state before redirecting
        setTimeout(() => {
          router.replace("/(tabs)");
        }, 2000);
      } else {
        Alert.alert(
          "Registration Failed",
          response.error || "Could not create your account. Please try again."
        );
      }
    } catch (error) {
      console.error("Registration error:", error);
      Alert.alert("Error", "An unexpected error occurred. Please try again.");
    } finally {
      setSavingName(false);
    }
  };

  const copyAddress = async () => {
    if (walletAddress) {
      await Clipboard.setStringAsync(walletAddress);
      Alert.alert("Copied!", "Address copied to clipboard");
    }
  };

  const StepIndicator = ({
    isActive,
    isCompleted,
    icon: Icon,
  }: {
    isActive: boolean;
    isCompleted: boolean;
    icon?: any;
  }) => (
    <View
      className="w-10 h-10 rounded-full flex items-center justify-center"
      style={{
        backgroundColor: isCompleted ? "#059669" : isActive ? "#059669" : "#e5e7eb",
      }}
    >
      {isActive && !isCompleted ? (
        <ActivityIndicator color="white" size="small" />
      ) : isCompleted ? (
        <CheckCircle color="white" size={22} />
      ) : Icon ? (
        <Icon color="#9ca3af" size={20} />
      ) : (
        <View className="w-4 h-4 bg-gray-400 rounded-full" />
      )}
    </View>
  );

  return (
    <SafeAreaView className="flex-1 bg-white">
      <ScrollView
        className="flex-1 px-6"
        contentContainerStyle={{ flexGrow: 1 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <Animated.View
          style={{
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }],
          }}
        >
          {/* Header */}
          <View className="items-center mb-10" style={{ paddingTop: 30 }}>
            <View
              className="w-24 h-24 rounded-full items-center justify-center mb-6"
              style={{
                backgroundColor: "#d1f6f1",
                shadowColor: "#059669",
                shadowOffset: { width: 0, height: 8 },
                shadowOpacity: 0.3,
                shadowRadius: 16,
                elevation: 12,
              }}
            >
              <View
                className="w-20 h-20 rounded-full items-center justify-center"
                style={{ backgroundColor: "#059669" }}
              >
                <Wallet color="white" size={36} />
              </View>
            </View>
            <Text className="text-3xl mb-3 text-gray-900 font-bold text-center">
              Setting Up Your Wallet
            </Text>
            <Text className="text-gray-600 text-center text-base px-4">
              {step === "creating"
                ? "Creating your secure wallet..."
                : step === "created"
                ? "Almost there! Finalizing setup..."
                : hasNameMissing
                ? "Just one more step to complete"
                : "All done! Welcome aboard"}
            </Text>
          </View>

          {/* Progress Steps */}
          <View className="mb-8">
            {/* Step 1: Creating Wallet */}
            <View className="flex-row items-center mb-7">
              <StepIndicator
                isActive={step === "creating"}
                isCompleted={step !== "creating"}
                icon={Lock}
              />
              <View className="ml-4 flex-1">
                <Text
                  className={`font-semibold text-base ${
                    step !== "creating" ? "text-gray-900" : "text-gray-900"
                  }`}
                >
                  Creating Your Wallet
                </Text>
                <Text className="text-sm text-gray-600 mt-1">
                  {step === "creating"
                    ? "Generating secure keys..."
                    : "Wallet created successfully"}
                </Text>
              </View>
              {step !== "creating" && (
                <Sparkles color="#059669" size={18} />
              )}
            </View>

            {/* Step 2: Smart Account */}
            <View className="flex-row items-center mb-7">
              <StepIndicator
                isActive={step === "created"}
                isCompleted={step === "secured"}
                icon={Shield}
              />
              <View className="ml-4 flex-1">
                <Text
                  className={`font-semibold text-base ${
                    step === "secured" ? "text-gray-900" : step === "created" ? "text-gray-900" : "text-gray-400"
                  }`}
                >
                  Securing Your Account
                </Text>
                <Text className="text-sm text-gray-600 mt-1">
                  {step === "secured"
                    ? "Account secured with encryption"
                    : step === "created"
                    ? "Encrypting your keys..."
                    : "Pending..."}
                </Text>
              </View>
              {step === "secured" && (
                <Sparkles color="#059669" size={18} />
              )}
            </View>

            {/* Step 3: Username Setup */}
            <View className="flex-row items-center mb-7">
              <StepIndicator
                isActive={step === "secured" && hasNameMissing}
                isCompleted={!hasNameMissing}
                icon={User}
              />
              <View className="ml-4 flex-1">
                <Text
                  className={`font-semibold text-base ${
                    !hasNameMissing ? "text-gray-900" : step === "secured" ? "text-gray-900" : "text-gray-400"
                  }`}
                >
                  Choose Your Username
                </Text>
                <Text className="text-sm text-gray-600 mt-1">
                  {!hasNameMissing
                    ? "Username set successfully"
                    : step === "secured"
                    ? "Ready for your input"
                    : "Almost there..."}
                </Text>
              </View>
              {!hasNameMissing && (
                <Sparkles color="#059669" size={18} />
              )}
            </View>
          </View>

          {/* Username Input - Shows when wallet is ready */}
          {step === "secured" && hasNameMissing && (
            <View
              className="bg-white rounded-3xl p-6 mb-8"
              style={{
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.08,
                shadowRadius: 12,
                elevation: 6,
                borderWidth: 1,
                borderColor: "#f0f0f0",
              }}
            >
              <View className="items-center mb-6">
                <View
                  className="w-12 h-12 rounded-full items-center justify-center mb-3"
                  style={{ backgroundColor: "#d1f6f1" }}
                >
                  <User color="#059669" size={24} />
                </View>
                <Text className="text-xl font-bold text-gray-900 mb-2">
                  Choose Your Username
                </Text>
                <Text className="text-sm text-gray-600 text-center">
                  This is how others will find you on ChamaPay
                </Text>
              </View>

              <View className="mb-4">
                <View
                  className={`flex-row items-center border-2 rounded-2xl px-5 py-4 ${
                    usernameStatus === "available"
                      ? "border-green-500 bg-green-50"
                      : usernameStatus === "unavailable" || usernameStatus === "invalid"
                      ? "border-red-500 bg-red-50"
                      : usernameStatus === "checking"
                      ? "border-yellow-400 bg-yellow-50"
                      : "border-gray-200 bg-gray-50"
                  }`}
                >
                  <Text className="text-gray-700 mr-2 text-lg font-medium">@</Text>
                  <TextInput
                    className="flex-1 text-gray-900 text-base"
                    placeholder="username"
                    placeholderTextColor="#9ca3af"
                    autoCapitalize="none"
                    value={username}
                    onChangeText={setUsername}
                    editable={!savingName}
                  />
                  {usernameStatus === "checking" && (
                    <Loader2 color="#eab308" size={20} />
                  )}
                  {usernameStatus === "available" && (
                    <CheckCircle size={20} color="#10b981" />
                  )}
                  {(usernameStatus === "unavailable" || usernameStatus === "invalid") && (
                    <X size={20} color="#ef4444" />
                  )}
                </View>

                {/* Status Message */}
                {usernameMessage && (
                  <View className="mt-3 px-2">
                    <Text
                      className={`text-sm font-medium ${
                        usernameStatus === "available"
                          ? "text-green-600"
                          : usernameStatus === "unavailable" || usernameStatus === "invalid"
                          ? "text-red-600"
                          : "text-yellow-600"
                      }`}
                    >
                      {usernameMessage}
                    </Text>
                  </View>
                )}
              </View>

              <TouchableOpacity
                onPress={saveUsername}
                disabled={savingName || !isUsernameValid}
                className="w-full py-4 rounded-2xl items-center justify-center flex-row"
                style={{
                  backgroundColor:
                    savingName || !isUsernameValid ? "#d1d5db" : "#059669",
                  shadowColor: "#059669",
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: savingName || !isUsernameValid ? 0 : 0.3,
                  shadowRadius: 8,
                  elevation: savingName || !isUsernameValid ? 0 : 4,
                }}
                activeOpacity={0.8}
              >
                {savingName ? (
                  <>
                    <ActivityIndicator color="white" size="small" />
                    <Text className="text-white font-bold text-base ml-2">
                      Creating Account...
                    </Text>
                  </>
                ) : (
                  <Text className="text-white font-bold text-base">
                    Continue
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          )}

          {/* Success State - Wallet Created */}
          {step === "secured" && !hasNameMissing && (
            <View className="mb-8">
              {/* Success Card */}
              <View
                className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-3xl p-6 mb-6"
                style={{
                  borderWidth: 2,
                  borderColor: "#86efac",
                }}
              >
                <View className="items-center mb-4">
                  <View
                    className="w-16 h-16 rounded-full items-center justify-center mb-4"
                    style={{ backgroundColor: "#059669" }}
                  >
                    <CheckCircle color="white" size={32} />
                  </View>
                  <Text className="text-2xl font-bold text-gray-900 mb-2">
                    You're All Set!
                  </Text>
                  <Text className="text-gray-600 text-center">
                    Your secure wallet has been created
                  </Text>
                </View>
              </View>

              {/* Wallet Details */}
              {walletAddress && (
                <View
                  className="bg-white rounded-3xl p-6 mb-6"
                  style={{
                    shadowColor: "#000",
                    shadowOffset: { width: 0, height: 4 },
                    shadowOpacity: 0.08,
                    shadowRadius: 12,
                    elevation: 6,
                  }}
                >
                  <View className="flex-row items-center justify-center mb-4">
                    <Shield color="#059669" size={22} />
                    <Text className="text-gray-700 ml-2 font-semibold text-base">
                      Your Wallet Address
                    </Text>
                  </View>

                  <View className="bg-gray-50 rounded-2xl p-4 mb-4">
                    <View className="flex-row items-center justify-between">
                      <Text
                        className="text-sm text-gray-800 flex-1 font-mono"
                        numberOfLines={2}
                      >
                        {walletAddress}
                      </Text>
                      <TouchableOpacity
                        onPress={copyAddress}
                        className="ml-3 p-2 bg-white rounded-lg"
                        activeOpacity={0.7}
                        style={{
                          shadowColor: "#000",
                          shadowOffset: { width: 0, height: 2 },
                          shadowOpacity: 0.1,
                          shadowRadius: 4,
                          elevation: 2,
                        }}
                      >
                        <Copy color="#059669" size={18} />
                      </TouchableOpacity>
                    </View>
                  </View>

                  <View className="gap-3">
                    <View className="flex-row items-start">
                      <Text className="text-green-600 mr-2 text-base">✓</Text>
                      <Text className="text-sm text-gray-700 flex-1">
                        Secured with military-grade encryption
                      </Text>
                    </View>
                    <View className="flex-row items-start">
                      <Text className="text-green-600 mr-2 text-base">✓</Text>
                      <Text className="text-sm text-gray-700 flex-1">
                        Recovery passphrase safely stored
                      </Text>
                    </View>
                    <View className="flex-row items-start">
                      <Text className="text-green-600 mr-2 text-base">✓</Text>
                      <Text className="text-sm text-gray-700 flex-1">
                        Ready for chama contributions
                      </Text>
                    </View>
                  </View>
                </View>
              )}

              {/* Continue Button */}
              <TouchableOpacity
                onPress={() => router.replace("/(tabs)")}
                className="w-full py-5 rounded-2xl items-center justify-center mb-8"
                style={{
                  backgroundColor: "#059669",
                  shadowColor: "#059669",
                  shadowOffset: { width: 0, height: 6 },
                  shadowOpacity: 0.4,
                  shadowRadius: 12,
                  elevation: 8,
                }}
                activeOpacity={0.8}
              >
                <Text className="text-white font-bold text-lg">
                  Continue to Dashboard
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </Animated.View>
      </ScrollView>
    </SafeAreaView>
  );
}