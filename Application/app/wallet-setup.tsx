import { useAuth } from "@/Contexts/AuthContext";
import { checkUsernameAvailability } from "@/lib/chamaService";
import * as Clipboard from "expo-clipboard";
import { useLocalSearchParams, useRouter } from "expo-router";
import {
  CheckCircle,
  Copy,
  Shield,
  Wallet,
  X
} from "lucide-react-native";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  ToastAndroid
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function WalletSetup() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    email?: string;
    name?: string;
    picture?: string;
  }>();
  const { registerUser } = useAuth();

  /* State */
  const [step, setStep] = useState<"creating" | "created" | "secured">("creating");
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [username, setUsername] = useState("");
  const [savingName, setSavingName] = useState(false);
  const [hasNameMissing, setHasNameMissing] = useState(true);

  const [usernameStatus, setUsernameStatus] = useState<
    "idle" | "checking" | "available" | "unavailable" | "invalid"
  >("idle");
  const [usernameMessage, setUsernameMessage] = useState("");

  const isUsernameValid =
    username.trim().length > 2 && usernameStatus === "available";

  /* Simulated wallet creation steps */
  useEffect(() => {
    const t1 = setTimeout(() => setStep("created"), 2000);
    const t2 = setTimeout(() => setStep("secured"), 4000);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, []);

  /* Username availability (debounced) */
  useEffect(() => {
    if (username.trim().length < 3) {
      setUsernameStatus("idle");
      setUsernameMessage("");
      return;
    }

    const timer = setTimeout(async () => {
      setUsernameStatus("checking");
      setUsernameMessage("Checking availability...");

      try {
        const res = await checkUsernameAvailability(username.trim());
        if (res.success && res.available) {
          setUsernameStatus("available");
          setUsernameMessage("Username is available");
        } else {
          setUsernameStatus("unavailable");
          setUsernameMessage(res.message || "Username is not available");
        }
      } catch {
        setUsernameStatus("invalid");
        setUsernameMessage("Error checking username");
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [username]);

  const saveUsername = async () => {
    if (!isUsernameValid || !params.email) {
      ToastAndroid.show("Please enter a valid username", ToastAndroid.SHORT);
      return;
    }

    setSavingName(true);
    try {
      const res = await registerUser({
        email: params.email,
        userName: username.trim(),
        profileImageUrl: params.picture,
      });

      if (res.success && res.user) {
        setHasNameMissing(false);
        setWalletAddress(res.user.smartAddress);

        ToastAndroid.show("Account created successfully", ToastAndroid.SHORT);

        router.replace("/pin-setup");

      } else {
        ToastAndroid.show(res.error || "Failed to register", ToastAndroid.SHORT);
      }
    } catch (error) {
      console.error("Save username error:", error);
      Alert.alert("Error", "An unexpected error occurred");
    } finally {
      setSavingName(false);
    }
  };

  const copyAddress = async () => {
    if (!walletAddress) return;
    await Clipboard.setStringAsync(walletAddress);
  };

  const StepIndicator = ({
    isActive,
    isCompleted,
  }: {
    isActive: boolean;
    isCompleted: boolean;
  }) => (
    <View
      className="w-8 h-8 rounded-full flex items-center justify-center"
      style={{
        backgroundColor: isCompleted
          ? "#059669"
          : isActive
            ? "#059669"
            : "#d1d5db",
      }}
    >
      {isActive && !isCompleted ? (
        <ActivityIndicator size="small" color="white" />
      ) : isCompleted ? (
        <CheckCircle color="white" size={20} />
      ) : (
        <View className="w-3 h-3 bg-white rounded-full" />
      )}
    </View>
  );

  return (
    <SafeAreaView className="flex-1 bg-white">
      <ScrollView
        className="flex-1 px-6"
        contentContainerStyle={{ flexGrow: 1 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View className="items-center mb-8" style={{ paddingTop: 20 }}>
          <View
            className="w-20 h-20 rounded-full items-center justify-center mb-6"
            style={{ backgroundColor: "#059669" }}
          >
            <Wallet color="white" size={32} />
          </View>
          <Text className="text-2xl mb-2 text-gray-900 font-bold text-center">
            Setting Up Your Account
          </Text>
          <Text className="text-gray-600 text-center">
            We&apos;re preparing everything for your chama journey
          </Text>
        </View>

        {/* Progress steps */}
        <View className="mb-8">
          <View className="flex-row items-center mb-6">
            <StepIndicator
              isActive={step === "creating"}
              isCompleted={step !== "creating"}
            />
            <View className="ml-4 flex-1">
              <Text className="text-gray-900 font-medium">
                Creating Your Account
              </Text>
              <Text className="text-sm text-gray-600">
                Setting up secure payment infrastructure
              </Text>
            </View>
          </View>

          <View className="flex-row items-center mb-6">
            <StepIndicator
              isActive={step === "created"}
              isCompleted={step === "secured"}
            />
            <View className="ml-4 flex-1">
              <Text className="text-gray-900 font-medium">
                Enabling Smart Features
              </Text>
              <Text className="text-sm text-gray-600">
                Setting up automatic payments and contributions
              </Text>
            </View>
          </View>

          <View className="flex-row items-center mb-6">
            <StepIndicator
              isActive={hasNameMissing && step === "secured"}
              isCompleted={!hasNameMissing}
            />
            <View className="ml-4 flex-1">
              <Text className="text-gray-900 font-medium">
                Personalizing Your Profile
              </Text>
              <Text className="text-sm text-gray-600">
                Choose your unique username
              </Text>
            </View>
          </View>

          {/* Show final indicator only after username is set */}
          {!hasNameMissing && (
            <View className="flex-row items-center">
              <StepIndicator isActive={false} isCompleted={step === "secured"} />
              <View className="ml-4 flex-1">
                <Text className="text-gray-900 font-medium">All Set!</Text>
                <Text className="text-sm text-gray-600">
                  Your account is ready for chama contributions
                </Text>
              </View>
            </View>
          )}
        </View>

        {/* Account summary appears only after secured AND username set */}
        {step === "secured" && !hasNameMissing && walletAddress && (
          <View className="mb-8">
            {/* Account Details */}
            <View
              className="bg-white rounded-2xl p-6 mb-4"
              style={{
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.1,
                shadowRadius: 8,
                elevation: 5,
              }}
            >
              <View className="flex-row items-center justify-center mb-4">
                <Shield color="#059669" size={20} />
                <Text className="text-gray-700 ml-2 font-medium">
                  Account Created Successfully
                </Text>
              </View>

              <View className="bg-gray-50 rounded-lg p-4 mb-4">
                <Text className="text-xs text-gray-600 mb-2">
                  Your Account ID:
                </Text>
                <View className="flex-row items-center justify-between">
                  <Text
                    className="text-sm text-gray-800 flex-1 font-mono"
                    numberOfLines={2}
                  >
                    {walletAddress}
                  </Text>
                  <TouchableOpacity
                    onPress={copyAddress}
                    className="ml-2 p-2"
                    activeOpacity={0.7}
                  >
                    <Copy color="#6b7280" size={16} />
                  </TouchableOpacity>
                </View>
              </View>

              <View className="gap-2">
                <Text className="text-sm text-gray-600">
                  ✓ Secure payment processing enabled
                </Text>
                <Text className="text-sm text-gray-600">
                  ✓ Multi-member transaction verification
                </Text>
                <Text className="text-sm text-gray-600">
                  ✓ Automatic contribution tracking
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* Prompt for username right after first two indicators */}
        {(step === "created" || step === "secured") && hasNameMissing && (
          <View
            className="bg-white rounded-2xl p-6 mb-8"
            style={{
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.1,
              shadowRadius: 8,
              elevation: 5,
            }}
          >
            <Text className="text-gray-900 font-medium mb-2">Choose your username</Text>
            <View className={`flex-row items-center border-2 rounded-lg px-4  mb-3 ${usernameStatus === "available"
              ? "border-green-500 bg-green-50"
              : usernameStatus === "unavailable" || usernameStatus === "invalid"
                ? "border-red-500 bg-red-50"
                : usernameStatus === "checking"
                  ? "border-yellow-500 bg-yellow-50"
                  : "border-gray-200"
              }`}>
              <Text className="text-gray-700 ">@</Text>
              <TextInput
                className="flex-1 text-gray-900"
                placeholder="your-username"
                autoCapitalize="none"
                value={username}
                onChangeText={setUsername}
                editable={!savingName}
              />
              {usernameStatus === "checking" && (
                <ActivityIndicator size="small" color="#eab308" />
              )}
              {usernameStatus === "available" && (
                <CheckCircle size={16} color="#10b981" />
              )}
              {(usernameStatus === "unavailable" || usernameStatus === "invalid") && (
                <X size={16} color="#ef4444" />
              )}
            </View>

            {/* Username status message */}
            {usernameMessage && (
              <Text className={`text-sm mb-3 ${usernameStatus === "available"
                ? "text-green-600"
                : usernameStatus === "unavailable" || usernameStatus === "invalid"
                  ? "text-red-600"
                  : "text-yellow-600"
                }`}>
                {usernameMessage}
              </Text>
            )}
            <TouchableOpacity
              onPress={saveUsername}
              disabled={savingName || !isUsernameValid}
              className="w-full py-3 rounded-lg items-center justify-center"
              style={{
                backgroundColor: savingName || !isUsernameValid ? "#808080" : "#059669",
                opacity: savingName ? 0.8 : 1
              }}
              activeOpacity={0.8}
            >
              <Text className="text-white font-medium">
                {savingName ? "Creating account..." : "Create account"}
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}