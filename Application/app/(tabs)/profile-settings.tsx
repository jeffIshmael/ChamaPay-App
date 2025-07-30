import { useAuth } from "@/contexts/AuthContext";
import * as Clipboard from 'expo-clipboard';
import { useRouter } from "expo-router";
import {
  ArrowLeft,
  Bell,
  Check,
  Copy,
  Edit,
  LogOut,
  Shield,
  User,
  Wallet,
} from "lucide-react-native";
import React, { useState } from "react";
import {
  Alert,
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
  const [notifications, setNotifications] = useState<NotificationSettings>({
    pushNotifications: true,
    emailNotifications: true,
    contributionReminders: true,
  });

  const handleSignOut = () => {
    Alert.alert("Sign Out", "Are you sure you want to sign out?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Sign Out",
        style: "destructive",
        onPress: async () => {
          try {
            await logout();
            router.replace("/auth-screen");
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

  if (isLoading) {
    return (
      <SafeAreaView className="flex-1 bg-gray-50 items-center justify-center">
        <Text className="text-gray-600">Loading profile...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      className="flex-1 bg-gray-50"
      style={{ paddingTop: insets.top }}
    >
      {/* Header */}
      <View className="bg-white border-b border-gray-200 px-4 py-2">
        <View className="flex-row items-center gap-4">
          <TouchableOpacity
            onPress={() => router.back()}
            className="p-2 rounded-lg active:bg-gray-100"
          >
            <ArrowLeft size={20} color="#374151" />
          </TouchableOpacity>
          <Text className="text-xl font-semibold text-gray-900">
            Profile & Settings
          </Text>
        </View>
      </View>

      <ScrollView className="flex-1 p-4" showsVerticalScrollIndicator={false}>
        {/* Profile Info */}
        <View className="bg-white rounded-xl border border-gray-200 p-4 mb-6">
          <View className="flex-row items-center gap-4 mb-4">
            <View className="w-16 h-16 rounded-full bg-emerald-100 items-center justify-center">
              <User size={24} color="#059669" />
            </View>
            <View className="flex-1">
              <Text className="text-xl font-semibold text-gray-900">
                {user?.name || "User"}
              </Text>
              <Text className="text-gray-600">
                {user?.email || "No email provided"}
              </Text>
              {user?.role && (
                <Text className="text-sm text-emerald-600 mt-1 capitalize">
                  {user.role}
                </Text>
              )}
            </View>
            <TouchableOpacity className="p-2 border border-gray-300 rounded-lg active:bg-gray-50">
              <Edit size={16} color="#374151" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Wallet Info */}
        {user?.address && (
          <View className="bg-white rounded-xl border border-gray-200 p-4 mb-6">
            <View className="flex-row items-center gap-2 mb-4">
              <Wallet size={20} color="#059669" />
              <Text className="text-lg font-medium text-gray-900">
                Wallet Information
              </Text>
            </View>
            <View className="bg-gray-50 rounded-lg p-4">
              <Text className="text-sm text-gray-600 mb-2">Wallet Address</Text>
              <View className="flex-row items-center justify-between">
                <Text className="text-gray-900 font-mono text-sm flex-1">
                  {formatWalletAddress(user.address)}
                </Text>
                <TouchableOpacity
                  onPress={copyWalletAddress}
                  className="ml-2 p-2 rounded-lg active:bg-gray-200"
                >
                  {copiedAddress ? (
                    <Check size={16} color="#059669" />
                  ) : (
                    <Copy size={16} color="#374151" />
                  )}
                </TouchableOpacity>
              </View>
              <Text className="text-xs text-gray-500 mt-2">
                {copiedAddress ? "Address copied!" : "Tap to copy full address"}
              </Text>
            </View>
          </View>
        )}

        {/* Notification Settings */}
        <View className="bg-white rounded-xl border border-gray-200 p-4 mb-6">
          <View className="flex-row items-center gap-2 mb-4">
            <Bell size={20} color="#ea580c" />
            <Text className="text-lg font-medium text-gray-900">
              Notifications
            </Text>
          </View>
          <View className="gap-4">
            <View className="flex-row items-center justify-between">
              <View className="flex-1 pr-4">
                <Text className="text-gray-900 font-medium">
                  Push Notifications
                </Text>
                <Text className="text-sm text-gray-600">
                  Receive notifications on your device
                </Text>
              </View>
              <Switch
                value={notifications.pushNotifications}
                onValueChange={(value) =>
                  updateNotificationSetting("pushNotifications", value)
                }
                trackColor={{ false: "#f3f4f6", true: "#10b981" }}
                thumbColor="#ffffff"
              />
            </View>
            <View className="flex-row items-center justify-between">
              <View className="flex-1 pr-4">
                <Text className="text-gray-900 font-medium">
                  Email Notifications
                </Text>
                <Text className="text-sm text-gray-600">
                  Receive updates via email
                </Text>
              </View>
              <Switch
                value={notifications.emailNotifications}
                onValueChange={(value) =>
                  updateNotificationSetting("emailNotifications", value)
                }
                trackColor={{ false: "#f3f4f6", true: "#10b981" }}
                thumbColor="#ffffff"
              />
            </View>
            <View className="flex-row items-center justify-between">
              <View className="flex-1 pr-4">
                <Text className="text-gray-900 font-medium">
                  Contribution Reminders
                </Text>
                <Text className="text-sm text-gray-600">
                  Reminders before due dates
                </Text>
              </View>
              <Switch
                value={notifications.contributionReminders}
                onValueChange={(value) =>
                  updateNotificationSetting("contributionReminders", value)
                }
                trackColor={{ false: "#f3f4f6", true: "#10b981" }}
                thumbColor="#ffffff"
              />
            </View>
          </View>
        </View>

        {/* Security */}
        <View className="bg-white rounded-xl border border-gray-200 p-4 mb-6">
          <View className="flex-row items-center gap-2 mb-4">
            <Shield size={20} color="#059669" />
            <Text className="text-lg font-medium text-gray-900">Security</Text>
          </View>
          <View className="gap-3">
            <TouchableOpacity className="w-full p-4 border border-gray-300 rounded-lg active:bg-gray-50">
              <Text className="text-gray-700 font-medium">
                Two-Factor Authentication
              </Text>
              <Text className="text-sm text-gray-500 mt-1">
                Add an extra layer of security
              </Text>
            </TouchableOpacity>
            <TouchableOpacity className="w-full p-4 border border-gray-300 rounded-lg active:bg-gray-50">
              <Text className="text-gray-700 font-medium">
                Change Password
              </Text>
              <Text className="text-sm text-gray-500 mt-1">
                Update your account password
              </Text>
            </TouchableOpacity>
            <TouchableOpacity className="w-full p-4 border border-gray-300 rounded-lg active:bg-gray-50">
              <Text className="text-gray-700 font-medium">
                Backup Seed Phrase
              </Text>
              <Text className="text-sm text-gray-500 mt-1">
                Secure your wallet recovery phrase
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Account Actions */}
        <View className="bg-white rounded-xl border border-gray-200 p-4 mb-6">
          <View className="gap-3">
            <TouchableOpacity className="w-full p-4 border border-gray-300 rounded-lg active:bg-gray-50">
              <Text className="text-gray-700 font-medium">Export Data</Text>
              <Text className="text-sm text-gray-500 mt-1">
                Download your account data
              </Text>
            </TouchableOpacity>
            <TouchableOpacity className="w-full p-4 border border-gray-300 rounded-lg active:bg-gray-50">
              <Text className="text-gray-700 font-medium">Privacy Policy</Text>
              <Text className="text-sm text-gray-500 mt-1">
                Read our privacy policy
              </Text>
            </TouchableOpacity>
            <TouchableOpacity className="w-full p-4 border border-gray-300 rounded-lg active:bg-gray-50">
              <Text className="text-gray-700 font-medium">
                Terms of Service
              </Text>
              <Text className="text-sm text-gray-500 mt-1">
                Review our terms and conditions
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Sign Out Button */}
        <View className="bg-white rounded-xl border border-gray-200 p-4 mb-6">
          <TouchableOpacity
            onPress={handleSignOut}
            className="w-full p-4 bg-red-600 rounded-lg active:bg-red-700 flex-row items-center justify-center"
          >
            <LogOut size={16} color="#ffffff" style={{ marginRight: 8 }} />
            <Text className="text-white font-medium">Sign Out</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
