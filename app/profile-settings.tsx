import * as Clipboard from "expo-clipboard";
import {
  ArrowLeft,
  Bell,
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
  View
} from "react-native";

interface ProfileSettingsProps {
  user?: {
    name?: string;
    email?: string;
  };
  onBack: () => void;
}

interface NotificationSettings {
  pushNotifications: boolean;
  emailNotifications: boolean;
  contributionReminders: boolean;
}

export function ProfileSettings({ user, onBack }: ProfileSettingsProps) {
  const [notifications, setNotifications] = useState<NotificationSettings>({
    pushNotifications: true,
    emailNotifications: true,
    contributionReminders: true,
  });

  const walletAddress = "0x742d35Cc6Cd3C...9C4F6";
  const walletBalance = 45000;

  const handleCopyWallet = async () => {
    await Clipboard.setStringAsync(walletAddress);
    Alert.alert("Copied", "Wallet address copied to clipboard");
  };

  const handleSignOut = () => {
    Alert.alert("Sign Out", "Are you sure you want to sign out?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Sign Out",
        style: "destructive",
        onPress: () => console.log("Sign out"),
      },
    ]);
  };

  const updateNotificationSetting = (
    key: keyof NotificationSettings,
    value: boolean
  ) => {
    setNotifications((prev) => ({ ...prev, [key]: value }));
  };

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      {/* Header */}
      <View className="bg-white border-b border-gray-200 p-4">
        <View className="flex-row items-center space-x-4">
          <TouchableOpacity
            onPress={onBack}
            className="p-2 rounded-lg active:bg-gray-100"
          >
            <ArrowLeft size={20} className="text-gray-700" />
          </TouchableOpacity>
          <Text className="text-xl font-semibold text-gray-900">
            Profile & Settings
          </Text>
        </View>
      </View>

      <ScrollView className="flex-1 p-4" showsVerticalScrollIndicator={false}>
        {/* Profile Info */}
        <View className="bg-white rounded-xl border border-gray-200 p-4 mb-6">
          <View className="flex-row items-center space-x-4 mb-4">
            <View className="w-16 h-16 rounded-full bg-emerald-100 items-center justify-center">
              <User size={24} className="text-emerald-600" />
            </View>
            <View className="flex-1">
              <Text className="text-xl font-semibold text-gray-900">
                {user?.name || "Sarah Njeri"}
              </Text>
              <Text className="text-gray-600">
                {user?.email || "sarah.njeri@gmail.com"}
              </Text>
            </View>
            <TouchableOpacity className="p-2 border border-gray-300 rounded-lg active:bg-gray-50">
              <Edit size={16} className="text-gray-700" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Wallet Info */}
        <View className="bg-white rounded-xl border border-gray-200 p-4 mb-6">
          <View className="flex-row items-center space-x-2 mb-4">
            <Wallet size={20} className="text-blue-600" />
            <Text className="text-lg font-medium text-gray-900">
              Wallet Information
            </Text>
          </View>
          <View className="space-y-3">
            <View>
              <Text className="text-sm text-gray-600 mb-1">Wallet Address</Text>
              <View className="flex-row items-center space-x-2">
                <View className="flex-1 bg-gray-100 p-3 rounded-lg">
                  <Text className="text-sm font-mono text-gray-800">
                    {walletAddress}
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={handleCopyWallet}
                  className="px-3 py-3 border border-gray-300 rounded-lg active:bg-gray-50"
                >
                  <Copy size={16} className="text-gray-700" />
                </TouchableOpacity>
              </View>
            </View>
            <View>
              <Text className="text-sm text-gray-600 mb-1">Balance</Text>
              <Text className="text-2xl font-bold text-gray-900">
                KES {walletBalance.toLocaleString()}
              </Text>
            </View>
          </View>
        </View>

        {/* Notification Settings */}
        <View className="bg-white rounded-xl border border-gray-200 p-4 mb-6">
          <View className="flex-row items-center space-x-2 mb-4">
            <Bell size={20} className="text-orange-600" />
            <Text className="text-lg font-medium text-gray-900">
              Notifications
            </Text>
          </View>
          <View className="space-y-4">
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
                thumbColor={
                  notifications.pushNotifications ? "#ffffff" : "#ffffff"
                }
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
                thumbColor={
                  notifications.emailNotifications ? "#ffffff" : "#ffffff"
                }
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
                thumbColor={
                  notifications.contributionReminders ? "#ffffff" : "#ffffff"
                }
              />
            </View>
          </View>
        </View>

        {/* Security */}
        <View className="bg-white rounded-xl border border-gray-200 p-4 mb-6">
          <View className="flex-row items-center space-x-2 mb-4">
            <Shield size={20} className="text-green-600" />
            <Text className="text-lg font-medium text-gray-900">Security</Text>
          </View>
          <View className="space-y-3">
            <TouchableOpacity className="w-full p-4 border border-gray-300 rounded-lg active:bg-gray-50">
              <Text className="text-gray-700 font-medium">Change Password</Text>
            </TouchableOpacity>
            <TouchableOpacity className="w-full p-4 border border-gray-300 rounded-lg active:bg-gray-50">
              <Text className="text-gray-700 font-medium">
                Two-Factor Authentication
              </Text>
            </TouchableOpacity>
            <TouchableOpacity className="w-full p-4 border border-gray-300 rounded-lg active:bg-gray-50">
              <Text className="text-gray-700 font-medium">
                Connected Accounts
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Account Actions */}
        <View className="bg-white rounded-xl border border-gray-200 p-4 mb-6">
          <View className="space-y-3">
            <TouchableOpacity className="w-full p-4 border border-gray-300 rounded-lg active:bg-gray-50">
              <Text className="text-gray-700 font-medium">Export Data</Text>
            </TouchableOpacity>
            <TouchableOpacity className="w-full p-4 border border-gray-300 rounded-lg active:bg-gray-50">
              <Text className="text-gray-700 font-medium">Privacy Policy</Text>
            </TouchableOpacity>
            <TouchableOpacity className="w-full p-4 border border-gray-300 rounded-lg active:bg-gray-50">
              <Text className="text-gray-700 font-medium">
                Terms of Service
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleSignOut}
              className="w-full p-4 bg-red-600 rounded-lg active:bg-red-700 flex-row items-center justify-center"
            >
              <LogOut size={16} className="text-white mr-2" />
              <Text className="text-white font-medium">Sign Out</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
