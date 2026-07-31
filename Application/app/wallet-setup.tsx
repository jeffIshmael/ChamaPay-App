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
  Modal,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  ToastAndroid
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Animated, {
  FadeIn,
  FadeOut,
  FadeInDown,
  FadeInUp,
  FadeOutDown,
  ZoomIn,
  Layout,
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withSequence,
  withTiming,
} from "react-native-reanimated";

export default function WalletSetup() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    email?: string;
    name?: string;
    picture?: string;
  }>();
  const { registerUser } = useAuth();

  /* Simulated process state */
  const [step, setStep] = useState<"creating" | "created" | "secured">("creating");
  const [walletAddress, setWalletAddress] = useState<string | null>(null);

  /* Username popup — controlled explicitly instead of re-derived on every render,
     so it "pops" exactly once, the moment step 2 starts loading. */
  const [showUsernamePopup, setShowUsernamePopup] = useState(false);
  const [username, setUsername] = useState("");
  const [savingName, setSavingName] = useState(false);
  const [hasNameMissing, setHasNameMissing] = useState(true);

  const [usernameStatus, setUsernameStatus] = useState<
    "idle" | "checking" | "available" | "unavailable" | "invalid"
  >("idle");
  const [usernameMessage, setUsernameMessage] = useState("");

  const isUsernameValid =
    username.trim().length > 2 && usernameStatus === "available";

  /* Header icon idle bounce, just to make the screen feel alive from frame one */
  const iconScale = useSharedValue(1);
  useEffect(() => {
    iconScale.value = withSequence(
      withTiming(1.08, { duration: 500 }),
      withTiming(1, { duration: 500 })
    );
  }, [step]);
  const iconStyle = useAnimatedStyle(() => ({
    transform: [{ scale: iconScale.value }],
  }));

  /* Simulated wallet creation steps */
  useEffect(() => {
    const t1 = setTimeout(() => setStep("created"), 2000);
    const t2 = setTimeout(() => setStep("secured"), 4000);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, []);

  /* Pop the username input in the exact instant "Enabling Smart Features" starts loading */
  useEffect(() => {
    if (step === "created" && hasNameMissing) {
      // tiny delay so it visibly "arrives" after the step indicator flips, rather than
      // appearing in the same frame
      const t = setTimeout(() => setShowUsernamePopup(true), 150);
      return () => clearTimeout(t);
    }
  }, [step, hasNameMissing]);

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
        setWalletAddress(res.user.smartAddress);
        ToastAndroid.show("Account created successfully", ToastAndroid.SHORT);

        // let the popup exit gracefully before the summary + step 3 checkmark land
        setShowUsernamePopup(false);
        setTimeout(() => setHasNameMissing(false), 250);

        router.replace("/pin-setup");
      } else {
        ToastAndroid.show(res.error || "Failed to register", ToastAndroid.SHORT);
      }
    } catch (error) {
      Alert.alert("Error", "An unexpected error occurred");
    } finally {
      setSavingName(false);
    }
  };

  const copyAddress = async () => {
    if (!walletAddress) return;
    await Clipboard.setStringAsync(walletAddress);
  };

  const BRAND = "#059669";
  const BRAND_DIM = "#d1d5db";

  const StepIndicator = ({
    isActive,
    isCompleted,
  }: {
    isActive: boolean;
    isCompleted: boolean;
  }) => (
    <Animated.View
      layout={Layout.springify()}
      className="w-8 h-8 rounded-full flex items-center justify-center"
      style={{
        backgroundColor: isCompleted || isActive ? BRAND : BRAND_DIM,
        zIndex: 2,
      }}
    >
      {isCompleted ? (
        <Animated.View entering={ZoomIn.springify().damping(10)}>
          <CheckCircle color="white" size={20} />
        </Animated.View>
      ) : isActive ? (
        <ActivityIndicator size="small" color="white" />
      ) : (
        <View className="w-3 h-3 bg-white rounded-full" />
      )}
    </Animated.View>
  );

  /* Vertical connector segment between two step circles — fills in brand green
     once the step above it is complete, same idea as a horizontal stepper's
     connecting line, just rotated. */
  const Connector = ({ filled }: { filled: boolean }) => (
    <View
      style={{
        width: 2,
        flex: 1,
        minHeight: 28,
        alignSelf: "center",
        backgroundColor: filled ? BRAND : "#e5e7eb",
        marginVertical: 2,
      }}
    />
  );

  return (
    <SafeAreaView className="flex-1 bg-white">
      <ScrollView
        className="flex-1 px-6"
        contentContainerStyle={{ flexGrow: 1 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <Animated.View entering={FadeInDown.duration(600)} className="items-center mb-8" style={{ paddingTop: 20 }}>
          <Animated.View
            style={[iconStyle, { backgroundColor: "#059669" }]}
            className="w-20 h-20 rounded-full items-center justify-center mb-6"
          >
            <Wallet color="white" size={32} />
          </Animated.View>
          <Text className="text-2xl mb-2 text-gray-900 font-bold text-center">
            Setting Up Your Account
          </Text>
          <Text className="text-gray-600 text-center">
            We&apos;re preparing everything for your chama journey
          </Text>
        </Animated.View>

        {/* Progress steps — a single connected vertical timeline */}
        <View className="mb-8">
          {/* Step 1 */}
          <Animated.View entering={FadeInDown.delay(200).duration(500)} layout={Layout.springify()} className="flex-row items-start">
            <View style={{ alignItems: "center" }}>
              <StepIndicator isActive={step === "creating"} isCompleted={step !== "creating"} />
              <Connector filled={step !== "creating"} />
            </View>
            <View className="ml-4 flex-1 pb-6">
              <Text className="text-gray-900 font-medium">Creating Your Account</Text>
              <Text className="text-sm text-gray-600">
                Setting up secure payment infrastructure
              </Text>
            </View>
          </Animated.View>

          {/* Step 2 */}
          <Animated.View entering={FadeInDown.delay(400).duration(500)} layout={Layout.springify()} className="flex-row items-start">
            <View style={{ alignItems: "center" }}>
              <StepIndicator isActive={step === "created"} isCompleted={step === "secured"} />
              <Connector filled={step === "secured"} />
            </View>
            <View className="ml-4 flex-1 pb-6">
              <Text className="text-gray-900 font-medium">Enabling Smart Features</Text>
              <Text className="text-sm text-gray-600">
                Setting up automatic payments and contributions
              </Text>
            </View>
          </Animated.View>

          {/* Step 3 */}
          <Animated.View entering={FadeInDown.delay(600).duration(500)} layout={Layout.springify()} className="flex-row items-start">
            <View style={{ alignItems: "center" }}>
              <StepIndicator isActive={hasNameMissing && step === "secured"} isCompleted={!hasNameMissing} />
              <Connector filled={!hasNameMissing} />
            </View>
            <View className="ml-4 flex-1 pb-6">
              <Text className="text-gray-900 font-medium">Personalizing Your Profile</Text>
              <Text className="text-sm text-gray-600">Choose your unique username</Text>
            </View>
          </Animated.View>

          {/* Step 4 — no connector below since it's the last one */}
          <Animated.View entering={FadeInDown.delay(700).duration(500)} layout={Layout.springify()} className="flex-row items-start">
            <StepIndicator isActive={false} isCompleted={!hasNameMissing} />
            <View className="ml-4 flex-1">
              <Text className="text-gray-900 font-medium">All Set!</Text>
              <Text className="text-sm text-gray-600">
                Your account is ready for chama contributions
              </Text>
            </View>
          </Animated.View>
        </View>

        {/* Account summary — appears once username is confirmed */}
        {!hasNameMissing && walletAddress && (
          <Animated.View entering={FadeInUp.springify().delay(200)} className="mb-8">
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
          </Animated.View>
        )}

      </ScrollView>

      {/* Username modal */}
      <Modal
        visible={showUsernamePopup && hasNameMissing}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={() => {}}
      >
        <View
          style={{
            flex: 1,
            backgroundColor: "rgba(17, 24, 39, 0.65)",
            justifyContent: "center",
            paddingHorizontal: 24,
          }}
        >
          <View
            className="bg-white rounded-2xl p-6"
            style={{
              borderTopWidth: 4,
              borderTopColor: BRAND,
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 8 },
              shadowOpacity: 0.25,
              shadowRadius: 20,
              elevation: 12,
            }}
          >
            <View
              className="w-12 h-12 rounded-full items-center justify-center mb-4"
              style={{ backgroundColor: "#ecfdf5" }}
            >
              <Text style={{ color: BRAND, fontWeight: "bold", fontSize: 20 }}>@</Text>
            </View>
            <Text className="text-gray-900 font-bold text-lg mb-1">Choose your username</Text>
            <Text className="text-gray-500 text-sm mb-4">How should others find you in the platform?</Text>
            <View className={`flex-row items-center border-2 rounded-xl px-4 py-1 mb-3 ${usernameStatus === "available"
              ? "border-green-500 bg-green-50"
              : usernameStatus === "unavailable" || usernameStatus === "invalid"
                ? "border-red-500 bg-red-50"
                : usernameStatus === "checking"
                  ? "border-yellow-500 bg-yellow-50"
                  : "border-gray-200"
              }`}>
              <Text className="text-gray-700 font-bold text-lg">@</Text>
              <TextInput
                className="flex-1 text-gray-900 text-base py-3 ml-1"
                placeholder="your-username"
                placeholderTextColor="#9ca3af"
                autoCapitalize="none"
                value={username}
                onChangeText={(text) => {
                  const cleaned = text.toLowerCase().replace(/[^a-z0-9]/g, "");
                  setUsername(cleaned);
                }}
                editable={!savingName}
                autoFocus
              />
              {usernameStatus === "checking" && (
                <ActivityIndicator size="small" color="#eab308" />
              )}
              {usernameStatus === "available" && (
                <CheckCircle size={20} color="#10b981" />
              )}
              {(usernameStatus === "unavailable" || usernameStatus === "invalid") && (
                <X size={20} color="#ef4444" />
              )}
            </View>

            {usernameMessage && (
              <Text className={`text-sm mb-4 font-medium ${usernameStatus === "available"
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
              className="w-full py-4 rounded-xl items-center justify-center mt-2"
              style={{
                backgroundColor: savingName || !isUsernameValid ? "#e5e7eb" : BRAND,
              }}
              activeOpacity={0.8}
            >
              <Text className={`font-bold text-base ${savingName || !isUsernameValid ? "text-gray-400" : "text-white"}`}>
                {savingName ? "Creating account..." : "Create account"}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}