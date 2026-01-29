import { useAuth } from "@/Contexts/AuthContext";
import { getUserDetails, transformNotification } from "@/lib/chamaService";
import { handleTheRequestToJoin } from "@/lib/userService";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import {
  ArrowLeft,
  Bell,
  Calendar,
  Check,
  CheckCircle,
  MessageCircle,
  UserPlus,
  Users,
  Wallet,
  X,
} from "lucide-react-native";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  RefreshControl,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";


export interface Notification {
  id: string;
  type:
  | "contribution_due"
  | "payout_received"
  | "new_message"
  | "member_joined"
  | "payout_scheduled"
  | "join_request"
  | "invite_link"
  | "chama_started"
  | "other";
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  actionRequired: boolean;
  chama: string;
  chamaId?: number | null;
  chamaSlug?: string;
  requestId?: number;
  requestUserId?: number;
  requestUserName?: string;
  requestUserAddress?: string;
  chamaBlockchainId?: number;
  canAdd?: boolean;
}

export default function Notifications() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user, token } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [processingRequest, setProcessingRequest] = useState<{
    requestId: number;
    action: "approve" | "reject";
  } | null>(null);

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
      case "chama_started":
        return <CheckCircle {...iconProps} className="text-teal-600" />;
      case "join_request":
        return <UserPlus {...iconProps} className="text-amber-600" />;
      default:
        return <Bell {...iconProps} className="text-gray-400" />;
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

  const fetchNotifications = async () => {
    if (!token) return;

    try {
      setLoading(true);
      const details = await getUserDetails(token);

      const transformedNotifications = await transformNotification(
        details.user.notifications,
        details.user.sentRequests
      );
      console.log("the transformed notifications", transformedNotifications);
      setNotifications(transformedNotifications);
    } catch (error) {
      console.error("Error fetching notifications:", error);
      Alert.alert("Error", "Failed to load notifications");
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchNotifications();
    setRefreshing(false);
  };

  useEffect(() => {
    fetchNotifications();
  }, [token]);

  // function to handle join request
  const handleJoinRequest = async (
    requestId: number,
    action: "approve" | "reject",
    userName: string,
    userAddress: `0x${string}`,
    canAdd: boolean,
    chamaBlockchainId: number,
    chamaId: number
  ) => {
    if (!token) {
      Alert.alert("error", "Please log in.");
      return;
    }
    if (!chamaBlockchainId || !userAddress || !chamaId) {
      Alert.alert("error", "Some details are not defined.");
      return;
    }
    setProcessingRequest({ requestId, action });

    try {
      if (!canAdd && action === "approve") {
        Alert.alert("error", "Member can't be added in the middle of cycle.");
        setProcessingRequest(null);
        return;
      }

      const result = await handleTheRequestToJoin(
        chamaId,
        action,
        requestId,
        userName,
        token
      );
      if (!result.success) {
        Alert.alert("Error", "Action failed");
        setProcessingRequest(null);
        return;
      }

      Alert.alert(
        "Success",
        `Request ${action === "approve" ? "approved" : "rejected"} successfully`
      );
      // Remove the notification from the list
      setNotifications((prev) => prev.filter((n) => n.requestId !== requestId));
    } catch (error) {
      console.error("Error happened in handle request", error);
    } finally {
      setProcessingRequest(null);
    }
  };

  // Handle notification press with navigation
  const handleNotificationPress = (notification: Notification) => {
    // Don't navigate if it's an action-required notification (join requests)
    if (notification.actionRequired) {
      return;
    }

    // Check if we have the required data for navigation
    if (!notification.chamaSlug) {
      console.warn("Missing chamaSlug for navigation");
      return;
    }

    // Navigate based on notification type
    switch (notification.type) {
      case "chama_started":
      case "payout_scheduled":
        router.push({
          pathname: "/(tabs)/[joined-chama-details]/[id]",
          params: {
            "joined-chama-details": notification.chamaSlug,
            id: notification.chamaSlug,
            tab: "schedule",
          },
        });
        break;

      case "new_message":
        router.push({
          pathname: "/(tabs)/[joined-chama-details]/[id]",
          params: {
            "joined-chama-details": notification.chamaSlug,
            id: notification.chamaSlug,
            tab: "chat",
          },
        });
        break;

      case "invite_link":
        router.push({
          pathname: "/(tabs)/chama-details/[slug]",
          params: { slug: notification.chamaSlug },
        });
        break;

      // Add more cases as needed
      case "contribution_due":
      case "payout_received":
      case "member_joined":
        // Navigate to chama details (home tab by default)
        router.push({
          pathname: "/(tabs)/[joined-chama-details]/[id]",
          params: {
            "joined-chama-details": notification.chamaSlug,
            id: notification.chamaSlug,
          },
        });
        break;

      default:
        // For other notification types, you can add a default behavior
        console.log("No specific navigation for type:", notification.type);
        break;
    }
  };

  const unreadCount: number = notifications.filter((n) => !n.read).length;

  if (loading) {
    return (
      <View className="flex-1 bg-gray-50">
        {/* Header Skeleton */}
        <View
          className="bg-downy-800 rounded-b-3xl"
          style={{
            paddingTop: insets.top + 16,
            paddingBottom: 6,
            paddingHorizontal: 20,
          }}
        >
          <View className="flex-row items-center justify-between mb-6">
            <TouchableOpacity
              onPress={() => router.back()}
              className="w-10 h-10 rounded-full bg-white/20 items-center justify-center"
              activeOpacity={0.7}
            >
              <ArrowLeft size={20} color="white" />
            </TouchableOpacity>

            <View className="flex-1 items-center">
              <Text className="text-3xl font-bold text-white">
                Notifications
              </Text>
            </View>

            <View className="w-10" />
          </View>
        </View>

        {/* Loading Content */}
        <View className="flex-1 p-4">
          {/* Skeleton Cards */}
          {[1, 2, 3, 4, 5].map((item) => (
            <View
              key={item}
              className="mb-3 p-4 bg-white rounded-xl border border-gray-200"
            >
              <View className="flex-row items-start gap-3">
                {/* Icon Skeleton */}
                <View className="w-5 h-5 bg-gray-200 rounded-full" />

                <View className="flex-1">
                  {/* Title Skeleton */}
                  <View className="h-4 bg-gray-200 rounded w-3/4 mb-2" />

                  {/* Message Skeleton */}
                  <View className="h-3 bg-gray-200 rounded w-full mb-1" />
                  <View className="h-3 bg-gray-200 rounded w-5/6 mb-3" />

                  {/* Footer Skeleton */}
                  <View className="flex-row items-center justify-between">
                    <View className="h-3 bg-gray-200 rounded w-20" />
                    <View className="h-3 bg-gray-200 rounded w-16" />
                  </View>
                </View>
              </View>
            </View>
          ))}
        </View>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-gray-50">
      <StatusBar style="light" />
      {/* Modern Digital Header */}
      <View
        className="bg-downy-800 rounded-b-3xl"
        style={{
          paddingTop: insets.top + 16,
          paddingBottom: 6,
          paddingHorizontal: 20,
        }}
      >
        {/* Top Bar */}
        <View className="flex-row items-center justify-between mb-6">
          <TouchableOpacity
            onPress={() => router.back()}
            className="w-10 h-10 rounded-full bg-white/20 items-center justify-center active:bg-white/30"
            activeOpacity={0.7}
          >
            <ArrowLeft size={20} color="white" />
          </TouchableOpacity>

          <View className="flex-1 items-center">
            <View className="flex-row items-center gap-3">
              <Text className="text-3xl font-bold text-white">
                Notifications
              </Text>
            </View>
          </View>

          {unreadCount > 0 && (
            <View className="bg-emerald-500 px-3 py-1.5 rounded-full">
              <Text className="text-xs font-bold text-white">
                {unreadCount}
              </Text>
            </View>
          )}
        </View>
      </View>

      {/* Notifications List */}
      <ScrollView
        className="flex-1 p-4"
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        {notifications.map((notification: Notification) => (
          <TouchableOpacity
            key={notification.id}
            onPress={() => handleNotificationPress(notification)}
            className={`mb-3 p-4 bg-white rounded-xl border border-gray-200 ${!notification.read
              ? "border-l-4 border-l-emerald-500 bg-emerald-50"
              : ""
              }`}
            activeOpacity={0.7}
            disabled={notification.actionRequired && processingRequest !== null}
          >
            <View className="flex-row items-start gap-3">
              {getNotificationIcon(notification.type)}

              <View className="flex-1">
                <View className="flex-row items-center justify-between mb-1">
                  <Text
                    className={`font-medium flex-1 ${!notification.read ? "text-gray-900" : "text-gray-700"
                      }`}
                  >
                    {notification.title}
                  </Text>

                  <View className="flex-row items-center gap-2 ml-2">
                    {!notification.read && (
                      <View className="w-2 h-2 bg-emerald-500 rounded-full" />
                    )}
                  </View>
                </View>

                <Text
                  className={`text-sm mb-2 ${!notification.read ? "text-gray-700" : "text-gray-600"
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

                {/* Action Buttons for Join Requests */}
                {notification.actionRequired && notification.requestId && (
                  <View className="flex-row gap-2 mt-3">
                    <TouchableOpacity
                      onPress={() =>
                        handleJoinRequest(
                          notification.requestId!,
                          "approve",
                          notification.requestUserName || "User",
                          notification.requestUserAddress as `0x${string}`,
                          notification.canAdd || false,
                          notification.chamaBlockchainId!,
                          notification.chamaId!
                        )
                      }
                      disabled={
                        processingRequest?.requestId === notification.requestId
                      }
                      className={`flex-1 py-2.5 rounded-lg flex-row items-center justify-center gap-2 ${processingRequest?.requestId === notification.requestId
                        ? "bg-emerald-400"
                        : "bg-emerald-500"
                        }`}
                      activeOpacity={0.7}
                    >
                      {processingRequest?.requestId === notification.requestId &&
                        processingRequest?.action === "approve" ? (
                        <>
                          <ActivityIndicator size="small" color="white" />
                          <Text className="text-white font-semibold text-sm">
                            Approving...
                          </Text>
                        </>
                      ) : (
                        <>
                          <Check size={16} color="white" />
                          <Text className="text-white font-semibold text-sm">
                            Approve
                          </Text>
                        </>
                      )}
                    </TouchableOpacity>

                    <TouchableOpacity
                      onPress={() =>
                        handleJoinRequest(
                          notification.requestId!,
                          "reject",
                          notification.requestUserName || "User",
                          notification.requestUserAddress as `0x${string}`,
                          notification.canAdd || false,
                          notification.chamaBlockchainId!,
                          notification.chamaId!
                        )
                      }
                      disabled={
                        processingRequest?.requestId === notification.requestId
                      }
                      className={`flex-1 py-2.5 rounded-lg flex-row items-center justify-center gap-2 ${processingRequest?.requestId === notification.requestId
                          ? "bg-red-400"
                          : "bg-red-500"
                        }`}
                      activeOpacity={0.7}
                    >
                      {processingRequest?.requestId === notification.requestId &&
                        processingRequest?.action === "reject" ? (
                        <>
                          <ActivityIndicator size="small" color="white" />
                          <Text className="text-white font-semibold text-sm">
                            Rejecting...
                          </Text>
                        </>
                      ) : (
                        <>
                          <X size={16} color="white" />
                          <Text className="text-white font-semibold text-sm">
                            Reject
                          </Text>
                        </>
                      )}
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            </View>
          </TouchableOpacity>
        ))}

        {notifications.length === 0 && (
          <View className="bg-white rounded-xl border border-gray-200 p-8 items-center">
            <Bell size={48} className="text-gray-400 mb-4" />
            <Text className="text-lg font-medium text-gray-900 mb-2">
              No Notifications
            </Text>
            <Text className="text-sm text-gray-600 text-center">
              You're all caught up! We'll notify you of any important updates.
            </Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}