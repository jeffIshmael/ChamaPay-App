import SeedPhraseModal from "@/components/SeedPhraseModal";
import { useAuth } from "@/Contexts/AuthContext";
import * as Clipboard from "expo-clipboard";
import { useRouter } from "expo-router";
import {
  ArrowLeft,
  Check,
  ChevronRight,
  Copy,
  Edit,
  FileText,
  Fingerprint,
  HelpCircle,
  LogOut
} from "lucide-react-native";
import React, { useState } from "react";
import {
  Alert,
  Image,
  SafeAreaView,
  ScrollView,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

interface NotificationSettings {
  pushNotifications: boolean;
  emailNotifications: boolean;
  contributionReminders: boolean;
}

export default function ProfileSettings() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user, logout, isLoading } = useAuth();
  const [copiedAddress, setCopiedAddress] = useState(false);
  const [showSeedPhraseModal, setShowSeedPhraseModal] = useState(false);
  const [notifications, setNotifications] = useState<NotificationSettings>({
    pushNotifications: true,
    emailNotifications: true,
    contributionReminders: true,
  });

  // Default avatar URLs based on user's initials
  const getDefaultAvatar = () => {
    const initials = (user?.userName || user?.email || "U")
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);

    return `https://api.dicebear.com/7.x/initials/svg?seed=${initials}&backgroundColor=10b981&textColor=ffffff`;
  };

  const getUserProfileImage = () => {
    return user?.profileImageUrl || getDefaultAvatar();
  };

  const handleSignOut = () => {
    Alert.alert("Sign Out", "Are you sure you want to sign out?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Sign Out",
        style: "destructive",
        onPress: async () => {
          try {
            router.replace("/new-auth-screen");
            await logout();
          } catch (error) {
            console.error("Sign out error:", error);
            Alert.alert("Error", "Failed to sign out. Please try again.");
          }
        },
      },
    ]);
  };

  const copyWalletAddress = async () => {
    if (user?.address) {
      try {
        await Clipboard.setStringAsync(user.address);
        setCopiedAddress(true);
        setTimeout(() => setCopiedAddress(false), 2000);
      } catch (error) {
        console.error("Copy error:", error);
        Alert.alert("Error", "Failed to copy address");
      }
    }
  };

  const updateNotificationSetting = (
    key: keyof NotificationSettings,
    value: boolean
  ) => {
    setNotifications((prev) => ({ ...prev, [key]: value }));
  };

  const formatWalletAddress = (address: string) => {
    if (!address) return "";
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const handleShowSeedPhrase = () => {
    Alert.alert(
      "Show Seed Phrase",
      "You are about to view your wallet recovery phrase. Make sure you are in a private location and no one can see your screen.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Continue",
          onPress: () => setShowSeedPhraseModal(true),
          style: "default",
        },
      ]
    );
  };

  if (isLoading) {
    return (
      <SafeAreaView className="flex-1 bg-gray-50 items-center justify-center">
        <Text className="text-gray-600">Loading profile...</Text>
      </SafeAreaView>
    );
  }

  return (
    <View className="flex-1 bg-gray-50">
      {/* Enhanced Header */}
      <View
        className="bg-downy-800 px-6 pb-4 pt-4"
        style={{ paddingTop: insets.top + 16 }}
      >
        <View className="flex-row items-center justify-between mb-6">
          <TouchableOpacity
            onPress={() => router.back()}
            className="w-10 h-10 bg-white/20 rounded-full items-center justify-center"
            activeOpacity={0.8}
          >
            <ArrowLeft size={20} color="white" />
          </TouchableOpacity>
          <View className="flex-row items-center gap-2">
            <Text className="text-xl font-bold text-white">
              Profile & Settings
            </Text>
          </View>
          <View className="w-10" />
        </View>

        {/* Profile Preview Card */}
        <View className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 border border-white/20">
          <View className="flex-row items-center gap-4">
            <View className="relative">
              <Image
                source={{ uri: getUserProfileImage() }}
                className="w-16 h-16 rounded-full border-2 border-white/30"
              />

            </View>
            <View className="flex-1">
              <Text className="text-lg font-bold text-white">
                {user?.userName || "User"}
              </Text>
              <Text className="text-emerald-100 text-sm">
                {user?.email || "No email provided"}
              </Text>
              <View className="flex-row items-center gap-1 mt-1">
                <View className="w-2 h-2 bg-emerald-300 rounded-full" />
                <Text className="text-emerald-100 text-xs">Active</Text>
              </View>
            </View>
          </View>
        </View>
      </View>

      <ScrollView className="flex-1 mt-2" showsVerticalScrollIndicator={false}>
        <View className="px-6">
          {/* Edit Profile Card */}
          <TouchableOpacity onPress={() => router.push("/edit-profile")}>
            <View className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6 mb-6">
              <View className="flex-row items-center justify-between">
                <View className="flex-row items-center gap-4">
                  <View className="w-12 h-12 bg-emerald-100 rounded-xl items-center justify-center">
                    <Edit size={20} color="#10b981" />
                  </View>
                  <View>
                    <Text className="text-lg font-bold text-gray-900">
                      Edit Profile
                    </Text>
                    <Text className="text-gray-600 text-sm">
                      Update your personal information
                    </Text>
                  </View>
                </View>
                <TouchableOpacity
                  onPress={() => router.push("/edit-profile")}
                  className="w-10 h-10 bg-emerald-50 rounded-xl items-center justify-center"
                  activeOpacity={0.8}
                >
                  <ChevronRight size={20} color="#10b981" />
                </TouchableOpacity>
              </View>
            </View>
          </TouchableOpacity>

          {/* Wallet Info */}
          {user?.address && (
            <View className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6 mb-6">
              <View className="flex-row items-center gap-3 mb-4">
                {/* <View className="w-12 h-12 bg-blue-100 rounded-xl items-center justify-center">
                  <Wallet size={20} color="#3b82f6" />
                </View> */}
                <View>
                  <Text className="text-lg font-bold text-gray-900">
                    Wallet Information
                  </Text>
                  <Text className="text-gray-600 text-sm">
                    Your onchain wallet details
                  </Text>
                </View>
              </View>
              <View className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-4 border border-blue-100">
                <Text className="text-sm text-blue-700 font-medium mb-2">
                  Wallet Address
                </Text>
                <View className="flex-row items-center justify-between">
                  <Text className="text-gray-900 font-mono text-sm flex-1">
                    {formatWalletAddress(user.smartAddress)}
                  </Text>
                  <TouchableOpacity
                    onPress={copyWalletAddress}
                    className="ml-3 p-2 bg-blue-600 rounded-lg active:bg-blue-700"
                    activeOpacity={0.8}
                  >
                    {copiedAddress ? (
                      <Check size={16} color="white" />
                    ) : (
                      <Copy size={16} color="white" />
                    )}
                  </TouchableOpacity>
                </View>
                <Text className="text-xs text-blue-600 mt-2 font-medium">
                  {copiedAddress
                    ? "✓ Address copied to clipboard!"
                    : "Tap to copy full address"}
                </Text>
              </View>
            </View>
          )}

          {/* Notification Settings */}
          <View className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6 mb-6">
            <View className="flex-row items-center gap-3 mb-6">
              <View>
                <Text className="text-lg font-bold text-gray-900">
                  Notifications
                </Text>
                <Text className="text-gray-600 text-sm">
                  Manage your notification preferences
                </Text>
              </View>
            </View>
            <View className="gap-4">
              <View className="flex-row items-center justify-between p-4 bg-gray-50 rounded-xl">
                <View className="flex-1 pr-4">
                  <Text className="text-gray-900 font-semibold text-base">
                    Push Notifications
                  </Text>
                  <Text className="text-sm text-gray-600 mt-1">
                    Receive notifications on your device
                  </Text>
                </View>
                <Switch
                  value={notifications.pushNotifications}
                  onValueChange={(value) =>
                    updateNotificationSetting("pushNotifications", value)
                  }
                  trackColor={{ false: "#e5e7eb", true: "#10b981" }}
                  thumbColor="#ffffff"
                />
              </View>
              <View className="flex-row items-center justify-between p-4 bg-gray-50 rounded-xl">
                <View className="flex-1 pr-4">
                  <Text className="text-gray-900 font-semibold text-base">
                    Email Notifications
                  </Text>
                  <Text className="text-sm text-gray-600 mt-1">
                    Receive updates via email
                  </Text>
                </View>
                <Switch
                  value={notifications.emailNotifications}
                  onValueChange={(value) =>
                    updateNotificationSetting("emailNotifications", value)
                  }
                  trackColor={{ false: "#e5e7eb", true: "#10b981" }}
                  thumbColor="#ffffff"
                />
              </View>
              <View className="flex-row items-center justify-between p-4 bg-gray-50 rounded-xl">
                <View className="flex-1 pr-4">
                  <Text className="text-gray-900 font-semibold text-base">
                    Contribution Reminders
                  </Text>
                  <Text className="text-sm text-gray-600 mt-1">
                    Reminders before due dates
                  </Text>
                </View>
                <Switch
                  value={notifications.contributionReminders}
                  onValueChange={(value) =>
                    updateNotificationSetting("contributionReminders", value)
                  }
                  trackColor={{ false: "#e5e7eb", true: "#10b981" }}
                  thumbColor="#ffffff"
                />
              </View>
            </View>
          </View>

          {/* Security */}
          <View className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6 mb-6">
            <View className="flex-row items-center gap-3 mb-6">

              <View>
                <Text className="text-lg font-bold text-gray-900">
                  Security
                </Text>
                <Text className="text-gray-600 text-sm">
                  Protect your account and wallet
                </Text>
              </View>
            </View>
            <View className="gap-3">
              {/* <TouchableOpacity className="w-full p-4 bg-gray-50 rounded-xl active:bg-gray-100 flex-row items-center justify-between">
                <View className="flex-row items-center gap-3">
                  <View className="w-10 h-10 bg-blue-100 rounded-lg items-center justify-center">
                    <Key size={16} color="#3b82f6" />
                  </View>
                  <View>
                    <Text className="text-gray-900 font-semibold text-base">
                      Two-Factor Authentication
                    </Text>
                    <Text className="text-sm text-gray-600 mt-1">
                      Add an extra layer of security
                    </Text>
                  </View>
                </View>
                <ChevronRight size={20} color="#9ca3af" />
              </TouchableOpacity> */}

              <TouchableOpacity className="w-full p-4 bg-gray-50 rounded-xl active:bg-gray-100 flex-row items-center justify-between">
                <View className="flex-row items-center gap-3">
                  <View className="w-10 h-10 bg-green-100 rounded-lg items-center justify-center">
                    <Fingerprint size={16} color="#059669" />
                  </View>
                  <View>
                    <Text className="text-gray-900 font-semibold text-base">
                      Change Password
                    </Text>
                    <Text className="text-sm text-gray-600 mt-1">
                      Update your account password
                    </Text>
                  </View>
                </View>
                <ChevronRight size={20} color="#9ca3af" />
              </TouchableOpacity>
            </View>
          </View>

          {/* Legal & Support */}
          <View className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6 mb-6">
            <View className="flex-row items-center gap-3 mb-6">
              {/* <View className="w-12 h-12 bg-indigo-100 rounded-xl items-center justify-center">
                <FileText size={20} color="#4f46e5" />
              </View> */}
              <View>
                <Text className="text-lg font-bold text-gray-900">
                  Legal & Support
                </Text>
                <Text className="text-gray-600 text-sm">
                  Policies and help resources
                </Text>
              </View>
            </View>
            <View className="gap-3">
              <TouchableOpacity className="w-full p-4 bg-gray-50 rounded-xl active:bg-gray-100 flex-row items-center justify-between">
                <View className="flex-row items-center gap-3">
                  <View className="w-10 h-10 bg-blue-100 rounded-lg items-center justify-center">
                    <FileText size={16} color="#3b82f6" />
                  </View>
                  <View>
                    <Text className="text-gray-900 font-semibold text-base">
                      Privacy Policy
                    </Text>
                    <Text className="text-sm text-gray-600 mt-1">
                      Read our privacy policy
                    </Text>
                  </View>
                </View>
                <ChevronRight size={20} color="#9ca3af" />
              </TouchableOpacity>

              <TouchableOpacity className="w-full p-4 bg-gray-50 rounded-xl active:bg-gray-100 flex-row items-center justify-between">
                <View className="flex-row items-center gap-3">
                  <View className="w-10 h-10 bg-green-100 rounded-lg items-center justify-center">
                    <FileText size={16} color="#059669" />
                  </View>
                  <View>
                    <Text className="text-gray-900 font-semibold text-base">
                      Terms of Service
                    </Text>
                    <Text className="text-sm text-gray-600 mt-1">
                      Review our terms and conditions
                    </Text>
                  </View>
                </View>
                <ChevronRight size={20} color="#9ca3af" />
              </TouchableOpacity>

              <TouchableOpacity className="w-full p-4 bg-gray-50 rounded-xl active:bg-gray-100 flex-row items-center justify-between">
                <View className="flex-row items-center gap-3">
                  <View className="w-10 h-10 bg-orange-100 rounded-lg items-center justify-center">
                    <HelpCircle size={16} color="#ea580c" />
                  </View>
                  <View>
                    <Text className="text-gray-900 font-semibold text-base">
                      Help & Support
                    </Text>
                    <Text className="text-sm text-gray-600 mt-1">
                      Get help and contact support
                    </Text>
                  </View>
                </View>
                <ChevronRight size={20} color="#9ca3af" />
              </TouchableOpacity>
            </View>
          </View>

          {/* Sign Out Button */}
          <View className="bg-red-500 opacity-85 rounded-2xl shadow-lg border border-gray-100 p-2 mb-8">
            <TouchableOpacity
              onPress={handleSignOut}
              className="w-full py-4 bg-red-700 opacity-95 rounded-xl active:bg-red-600 flex-row items-center justify-center shadow-lg"
              activeOpacity={0.8}
            >
              <LogOut size={20} color="white" style={{ marginRight: 8 }} />
              <Text className="text-white font-bold text-lg">Sign Out</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      {/* Seed Phrase Modal */}
      <SeedPhraseModal
        visible={showSeedPhraseModal}
        onClose={() => setShowSeedPhraseModal(false)}
      />
    </View>
  );
}
