import { useRouter } from "expo-router";
import {
  ArrowLeft,
  Bell,
  Calendar,
  CheckCircle,
  MessageCircle,
  Settings,
  Users,
  Wallet,
} from "lucide-react-native";
import React from "react";
import {
  SafeAreaView,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

interface Notification {
  id: string;
  type:
    | "contribution_due"
    | "payout_received"
    | "new_message"
    | "member_joined"
    | "payout_scheduled";
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  priority: "high" | "medium" | "low";
  chama: string;
}

const mockNotifications: Notification[] = [
  {
    id: "1",
    type: "contribution_due",
    title: "Contribution Due Tomorrow",
    message:
      "Your monthly contribution of KES 10,000 for Tech Developers Circle is due tomorrow.",
    timestamp: "2025-01-24T10:00:00Z",
    read: false,
    priority: "high",
    chama: "Tech Developers Circle",
  },
  {
    id: "2",
    type: "payout_received",
    title: "Payout Received!",
    message:
      "You have received KES 120,000 from Tech Developers Circle. Funds are now available in your wallet.",
    timestamp: "2025-01-23T14:30:00Z",
    read: false,
    priority: "medium",
    chama: "Tech Developers Circle",
  },
  {
    id: "3",
    type: "new_message",
    title: "New Message in Women Entrepreneurs Chama",
    message:
      'Grace Wanjiku: "Hello everyone! Excited to be part of this chama 🎉"',
    timestamp: "2025-01-23T09:15:00Z",
    read: true,
    priority: "low",
    chama: "Women Entrepreneurs Chama",
  },
  {
    id: "4",
    type: "member_joined",
    title: "New Member Joined",
    message:
      "Grace Wanjiku has joined Women Entrepreneurs Chama. Welcome them to the group!",
    timestamp: "2025-01-22T16:45:00Z",
    read: true,
    priority: "low",
    chama: "Women Entrepreneurs Chama",
  },
  {
    id: "5",
    type: "payout_scheduled",
    title: "Your Payout is Coming Up",
    message:
      "Your turn for payout in Tech Developers Circle is scheduled for March 10, 2025.",
    timestamp: "2025-01-20T11:20:00Z",
    read: true,
    priority: "medium",
    chama: "Tech Developers Circle",
  },
];

export default function Notifications() {
  const router = useRouter();
  const getNotificationIcon = (type: Notification["type"]) => {
    const iconProps = { size: 20 };

    switch (type) {
      case "contribution_due":
        return <Calendar {...iconProps} className="text-orange-600" />;
      case "payout_received":
        return <Wallet {...iconProps} className="text-emerald-600" />;
      case "new_message":
        return <MessageCircle {...iconProps} className="text-blue-600" />;
      case "member_joined":
        return <Users {...iconProps} className="text-purple-600" />;
      case "payout_scheduled":
        return <CheckCircle {...iconProps} className="text-teal-600" />;
      default:
        return <Bell {...iconProps} className="text-gray-400" />;
    }
  };

  const getPriorityClasses = (priority: Notification["priority"]): string => {
    switch (priority) {
      case "high":
        return "bg-red-100 text-red-700";
      case "medium":
        return "bg-yellow-100 text-yellow-700";
      case "low":
        return "bg-gray-100 text-gray-700";
      default:
        return "bg-gray-100 text-gray-700";
    }
  };

  const formatTime = (timestamp: string): string => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInHours = Math.floor(
      (now.getTime() - date.getTime()) / (1000 * 60 * 60)
    );

    if (diffInHours < 1) {
      return "Just now";
    } else if (diffInHours < 24) {
      return `${diffInHours}h ago`;
    } else {
      const diffInDays = Math.floor(diffInHours / 24);
      return `${diffInDays}d ago`;
    }
  };

  const unreadCount: number = mockNotifications.filter((n) => !n.read).length;

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      {/* Header */}
      <View className="bg-white mt-2 border-b border-gray-200 p-4">
        <View className="flex-row items-center gap-4 mb-4">
          <TouchableOpacity
            onPress={() => router.back()}
            className="p-2 rounded-lg active:bg-gray-100"
          >
            <ArrowLeft size={20} className="text-gray-700" />
          </TouchableOpacity>

          <View className="flex-1">
            <Text className="text-xl font-semibold text-gray-900">
              Notifications
            </Text>
            {unreadCount > 0 && (
              <Text className="text-sm text-gray-600">
                {unreadCount} unread notifications
              </Text>
            )}
          </View>

          <TouchableOpacity className="p-2 rounded-lg active:bg-gray-100">
            <Settings size={20} className="text-gray-700" />
          </TouchableOpacity>
        </View>

        {unreadCount > 0 && (
          <View className="flex-row justify-between items-center">
            <TouchableOpacity className="px-4 py-2 border border-gray-300 rounded-lg active:bg-gray-50">
              <Text className="text-sm font-medium text-gray-700">
                Mark all as read
              </Text>
            </TouchableOpacity>
            <TouchableOpacity className="px-4 py-2 rounded-lg active:bg-gray-100">
              <Text className="text-sm font-medium text-gray-700">
                Clear all
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Notifications List */}
      <ScrollView className="flex-1 p-4" showsVerticalScrollIndicator={false}>
        {mockNotifications.map((notification: Notification, index: number) => (
          <TouchableOpacity
            key={notification.id}
            className={`mb-3 p-4 bg-white rounded-xl border border-gray-200 ${
              !notification.read
                ? "border-l-4 border-l-emerald-500 bg-emerald-50"
                : ""
            }`}
            activeOpacity={0.7}
          >
            <View className="flex-row items-start gap-3">
              {getNotificationIcon(notification.type)}

              <View className="flex-1">
                <View className="flex-row items-center justify-between mb-1">
                  <Text
                    className={`font-medium flex-1 ${
                      !notification.read ? "text-gray-900" : "text-gray-700"
                    }`}
                  >
                    {notification.title}
                  </Text>

                  <View className="flex-row items-center gap-2 ml-2">
                    <View
                      className={`px-2 py-1 rounded-full ${getPriorityClasses(notification.priority)}`}
                    >
                      <Text className="text-xs font-medium capitalize">
                        {notification.priority}
                      </Text>
                    </View>
                    {!notification.read && (
                      <View className="w-2 h-2 bg-emerald-500 rounded-full" />
                    )}
                  </View>
                </View>

                <Text
                  className={`text-sm mb-2 ${
                    !notification.read ? "text-gray-700" : "text-gray-600"
                  }`}
                >
                  {notification.message}
                </Text>

                <View className="flex-row items-center justify-between">
                  <Text className="text-xs text-gray-500">
                    {notification.chama}
                  </Text>
                  <Text className="text-xs text-gray-500">
                    {formatTime(notification.timestamp)}
                  </Text>
                </View>
              </View>
            </View>
          </TouchableOpacity>
        ))}

        {mockNotifications.length === 0 && (
          <View className="bg-white rounded-xl border border-gray-200 p-8 items-center">
            <Bell size={48} className="text-gray-400 mb-4" />
            <Text className="text-lg font-medium text-gray-900 mb-2">
              No Notifications
            </Text>
            <Text className="text-sm text-gray-600 text-center">
              You&apos;re all caught up! We&apos;ll notify you of any important
              updates.
            </Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
