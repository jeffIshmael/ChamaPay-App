import { useAuth } from "@/Contexts/AuthContext";
import { getUserDetails, transformNotification } from "@/lib/chamaService";
import { handleTheRequestToJoin } from "@/lib/userService";
import { useQueryClient } from "@tanstack/react-query";
import { useFocusEffect, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import {
  ArrowLeft,
  Bell,
  Calendar,
  Check,
  CheckCircle,
  MessageCircle,
  RefreshCcw,
  UserPlus,
  Users,
  Wallet,
  X,
} from "lucide-react-native";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  RefreshControl,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import LottieLoader from "@/components/LottieLoader";

export interface Notification {
  id: string;
  type:
    | "contribution_due"
    | "payout_received"
    | "payout_refunded"
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

type FilterKey = "all" | "unread" | "action";

type DaySection = {
  title: string;
  data: Notification[];
};

const startOfDay = (d: Date) => {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
};

const getDayLabel = (timestamp: string): string => {
  const date = new Date(timestamp);
  const today = startOfDay(new Date());
  const thatDay = startOfDay(date);
  const diffDays = Math.round(
    (today.getTime() - thatDay.getTime()) / (1000 * 60 * 60 * 24)
  );

  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return "This week";
  return "Earlier";
};

export default function Notifications() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const { token, refreshUser, markNotificationsRead } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<FilterKey>("all");
  const [processingRequest, setProcessingRequest] = useState<{
    requestId: number;
    action: "approve" | "reject";
  } | null>(null);

  useEffect(() => {
    refreshUser();
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchNotifications();
    }, [token])
  );

  const getNotificationVisual = (type: Notification["type"]) => {
    switch (type) {
      case "contribution_due":
        return {
          icon: <Calendar size={20} color="#c2410c" />,
          iconBg: "bg-orange-100",
          accent: "border-l-orange-500",
          cardBg: "bg-orange-50/50",
        };
      case "payout_received":
        return {
          icon: <Wallet size={20} color="#047857" />,
          iconBg: "bg-emerald-100",
          accent: "border-l-emerald-500",
          cardBg: "bg-emerald-50/40",
        };
      case "payout_refunded":
        return {
          icon: <RefreshCcw size={20} color="#b45309" />,
          iconBg: "bg-amber-100",
          accent: "border-l-amber-500",
          cardBg: "bg-amber-50/60",
        };
      case "new_message":
        return {
          icon: <MessageCircle size={20} color="#1d4ed8" />,
          iconBg: "bg-blue-100",
          accent: "border-l-blue-500",
          cardBg: "bg-blue-50/40",
        };
      case "member_joined":
        return {
          icon: <Users size={20} color="#7e22ce" />,
          iconBg: "bg-purple-100",
          accent: "border-l-purple-500",
          cardBg: "bg-purple-50/50",
        };
      case "payout_scheduled":
      case "chama_started":
        return {
          icon: <CheckCircle size={20} color="#0f766e" />,
          iconBg: "bg-teal-100",
          accent: "border-l-teal-500",
          cardBg: "bg-teal-50/40",
        };
      case "join_request":
        return {
          icon: <UserPlus size={20} color="#b45309" />,
          iconBg: "bg-amber-100",
          accent: "border-l-amber-500",
          cardBg: "bg-amber-50/50",
        };
      default:
        return {
          icon: <Bell size={20} color="#6b7280" />,
          iconBg: "bg-gray-100",
          accent: "border-l-gray-400",
          cardBg: "bg-white",
        };
    }
  };

  const formatTime = (timestamp: string): string => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInHours = Math.floor(
      (now.getTime() - date.getTime()) / (1000 * 60 * 60)
    );

    if (diffInHours < 1) return "Just now";
    if (diffInHours < 24) return `${diffInHours}h ago`;

    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) return `${diffInDays}d ago`;

    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: date.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
    });
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
      setNotifications(transformedNotifications);
    } catch (error) {
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

  const markOneReadLocally = (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
  };

  const handleMarkAllRead = async () => {
    const unreadIds = notifications
      .filter((n) => !n.read && n.type !== "join_request")
      .map((n) => Number(n.id))
      .filter((id) => Number.isFinite(id));

    setNotifications((prev) =>
      prev.map((n) =>
        n.type === "join_request" ? n : { ...n, read: true }
      )
    );
    await markNotificationsRead(unreadIds.length ? unreadIds : undefined);
  };

  const handleJoinRequest = async (
    requestId: number,
    action: "approve" | "reject",
    userName: string,
    canAdd: boolean,
    chamaId: number
  ) => {
    if (!token) {
      Alert.alert("Error", "Please log in.");
      return;
    }
    if (!chamaId || !requestId) {
      Alert.alert("Error", "The request details are incomplete.");
      return;
    }

    if (!canAdd && action === "approve") {
      Alert.alert(
        "Can't approve yet",
        "Members can only be added at the start of a cycle (round 1). You can reject this request, or wait until the next cycle."
      );
      return;
    }

    setProcessingRequest({ requestId, action });

    try {
      const result = await handleTheRequestToJoin(
        chamaId,
        action,
        requestId,
        userName,
        token
      );
      if (!result.success) {
        Alert.alert("Error", result.error || "Action failed");
        setProcessingRequest(null);
        return;
      }

      Alert.alert(
        "Success",
        `Request ${action === "approve" ? "approved" : "rejected"} successfully`
      );
      if (action === "approve") {
        queryClient.invalidateQueries({ queryKey: ["userChamas"] });
      }
      setNotifications((prev) => prev.filter((n) => n.requestId !== requestId));
      refreshUser();
    } catch {
      Alert.alert("Error", "Something went wrong. Please try again.");
    } finally {
      setProcessingRequest(null);
    }
  };

  const navigateForNotification = (notification: Notification) => {
    if (!notification.chamaSlug) {
      Alert.alert(
        "Can't open",
        "This notification isn't linked to a chama page."
      );
      return;
    }

    switch (notification.type) {
      case "chama_started":
      case "payout_scheduled":
        router.push({
          pathname: "/(tabs)/joined-chama-details/[id]",
          params: { id: notification.chamaSlug, tab: "schedule" },
        });
        break;
      case "new_message":
        router.push({
          pathname: "/(tabs)/joined-chama-details/[id]",
          params: { id: notification.chamaSlug, tab: "chat" },
        });
        break;
      case "invite_link":
        router.push({
          pathname: "/(tabs)/chama-details/[slug]",
          params: { slug: notification.chamaSlug },
        });
        break;
      case "join_request":
      case "contribution_due":
      case "payout_received":
      case "payout_refunded":
      case "member_joined":
      default:
        router.push({
          pathname: "/(tabs)/joined-chama-details/[id]",
          params: { id: notification.chamaSlug },
        });
        break;
    }
  };

  const handleNotificationPress = async (notification: Notification) => {
    if (!notification.read && notification.type !== "join_request") {
      markOneReadLocally(notification.id);
      const numericId = Number(notification.id);
      if (Number.isFinite(numericId)) {
        markNotificationsRead([numericId]);
      }
    }

    // Join requests stay on the card for Approve/Reject; still allow opening chama
    if (notification.type === "join_request") {
      if (notification.chamaSlug) {
        navigateForNotification(notification);
      }
      return;
    }

    navigateForNotification(notification);
  };

  const filtered = useMemo(() => {
    switch (filter) {
      case "unread":
        return notifications.filter((n) => !n.read || n.type === "join_request");
      case "action":
        return notifications.filter((n) => n.actionRequired);
      default:
        return notifications;
    }
  }, [notifications, filter]);

  const sections: DaySection[] = useMemo(() => {
    const order = ["Today", "Yesterday", "This week", "Earlier"];
    const map = new Map<string, Notification[]>();
    for (const n of filtered) {
      const label = getDayLabel(n.timestamp);
      if (!map.has(label)) map.set(label, []);
      map.get(label)!.push(n);
    }
    return order
      .filter((title) => map.has(title))
      .map((title) => ({ title, data: map.get(title)! }));
  }, [filtered]);

  const unreadCount = notifications.filter(
    (n) => !n.read || n.type === "join_request"
  ).length;
  const actionCount = notifications.filter((n) => n.actionRequired).length;

  const filters: { key: FilterKey; label: string; count?: number }[] = [
    { key: "all", label: "All" },
    { key: "unread", label: "Unread", count: unreadCount },
    { key: "action", label: "Needs action", count: actionCount },
  ];

  if (loading) {
    return (
      <View className="flex-1 bg-gray-50">
        <StatusBar style="light" />
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
              <Text className="text-3xl font-bold text-white">Notifications</Text>
            </View>
            <View className="w-10" />
          </View>
        </View>
        <View className="flex-1 items-center justify-center px-6 bg-gray-50">
          <LottieLoader
            source="notifications"
            label="Fetching notifications..."
            size={160}
          />
        </View>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-gray-50">
      <StatusBar style="light" />
      <View
        className="bg-downy-800 rounded-b-3xl"
        style={{
          paddingTop: insets.top + 16,
          paddingBottom: 16,
          paddingHorizontal: 20,
        }}
      >
        <View className="flex-row items-center justify-between mb-4">
          <TouchableOpacity
            onPress={() => router.back()}
            className="w-10 h-10 rounded-full bg-white/20 items-center justify-center"
            activeOpacity={0.7}
          >
            <ArrowLeft size={20} color="white" />
          </TouchableOpacity>

          <View className="flex-1 items-center px-2">
            <Text className="text-2xl font-bold text-white">Notifications</Text>
            {unreadCount > 0 ? (
              <Text className="text-emerald-100 text-xs mt-1">
                {unreadCount} unread
              </Text>
            ) : null}
          </View>

          <TouchableOpacity
            onPress={handleMarkAllRead}
            disabled={unreadCount === 0}
            className={`px-3 py-2 rounded-full ${
              unreadCount > 0 ? "bg-white/25" : "bg-white/10"
            }`}
            activeOpacity={0.7}
          >
            <Text
              style={{
                color: unreadCount > 0 ? "#ffffff" : "rgba(255,255,255,0.45)",
                fontSize: 12,
                fontWeight: "700",
              }}
            >
              Mark all
            </Text>
          </TouchableOpacity>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: 10, paddingRight: 4 }}
        >
          {filters.map((f) => {
            const active = filter === f.key;
            return (
              <TouchableOpacity
                key={f.key}
                onPress={() => setFilter(f.key)}
                style={{
                  paddingHorizontal: 16,
                  paddingVertical: 10,
                  borderRadius: 999,
                  minWidth: f.key === "all" ? 72 : undefined,
                  backgroundColor: active ? "#ffffff" : "rgba(255,255,255,0.12)",
                  borderWidth: 1,
                  borderColor: active ? "#ffffff" : "rgba(255,255,255,0.35)",
                }}
                activeOpacity={0.8}
              >
                <Text
                  style={{
                    fontSize: 14,
                    fontWeight: "700",
                    color: active ? "#115e59" : "#ffffff",
                    textAlign: "center",
                  }}
                >
                  {f.label}
                  {typeof f.count === "number" && f.count > 0
                    ? ` · ${f.count}`
                    : ""}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      <ScrollView
        className="flex-1 px-4 pt-4"
        contentContainerStyle={{
          flexGrow: 1,
          paddingBottom: insets.bottom + 100,
        }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        {sections.map((section) => (
          <View key={section.title} className="mb-4">
            <Text className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 px-1">
              {section.title}
            </Text>
            {section.data.map((notification) => {
              const isProcessing =
                processingRequest?.requestId === notification.requestId;
              const isJoin = notification.type === "join_request";
              const visual = getNotificationVisual(notification.type);

              return (
                <TouchableOpacity
                  key={notification.id}
                  onPress={() => handleNotificationPress(notification)}
                  className={`mb-3 p-4 rounded-xl border border-gray-200 border-l-4 ${visual.accent} ${visual.cardBg} ${
                    !notification.read ? "" : "opacity-95"
                  }`}
                  activeOpacity={0.7}
                  disabled={isProcessing}
                >
                  <View className="flex-row items-start gap-3">
                    <View
                      className={`w-10 h-10 rounded-full items-center justify-center ${visual.iconBg}`}
                    >
                      {visual.icon}
                    </View>

                    <View className="flex-1">
                      <View className="flex-row items-center justify-between mb-1">
                        <Text
                          className={`flex-1 ${
                            !notification.read
                              ? "text-gray-900 font-bold"
                              : "text-gray-700 font-semibold"
                          }`}
                        >
                          {notification.title}
                        </Text>
                        {!notification.read && (
                          <View className="w-2.5 h-2.5 bg-emerald-500 rounded-full ml-2" />
                        )}
                      </View>

                      <Text
                        className={`text-sm mb-2 leading-5 ${
                          !notification.read
                            ? "text-gray-700"
                            : "text-gray-600"
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

                      {isJoin && notification.requestId && (
                        <View className="mt-3">
                          {!notification.canAdd && (
                            <View className="mb-2 px-3 py-2 rounded-lg bg-amber-100 border border-amber-200">
                              <Text className="text-amber-800 text-xs leading-4">
                                This chama is mid-cycle, so you can&apos;t approve
                                new members until round 1 of the next cycle. You
                                can still reject the request.
                              </Text>
                            </View>
                          )}

                          <View className="flex-row gap-2">
                            <TouchableOpacity
                              onPress={() =>
                                handleJoinRequest(
                                  notification.requestId!,
                                  "approve",
                                  notification.requestUserName || "User",
                                  notification.canAdd || false,
                                  notification.chamaId!
                                )
                              }
                              disabled={isProcessing}
                              className={`flex-1 py-2.5 rounded-lg flex-row items-center justify-center gap-2 ${
                                notification.canAdd
                                  ? isProcessing
                                    ? "bg-emerald-400"
                                    : "bg-emerald-500"
                                  : "bg-gray-300"
                              }`}
                              activeOpacity={0.7}
                            >
                              {isProcessing &&
                              processingRequest?.action === "approve" ? (
                                <>
                                  <ActivityIndicator size="small" color="white" />
                                  <Text className="text-white font-semibold text-sm">
                                    Approving...
                                  </Text>
                                </>
                              ) : (
                                <>
                                  <Check
                                    size={16}
                                    color={notification.canAdd ? "white" : "#6b7280"}
                                  />
                                  <Text
                                    className={`font-semibold text-sm ${
                                      notification.canAdd
                                        ? "text-white"
                                        : "text-gray-500"
                                    }`}
                                  >
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
                                  notification.canAdd || false,
                                  notification.chamaId!
                                )
                              }
                              disabled={isProcessing}
                              className={`flex-1 py-2.5 rounded-lg flex-row items-center justify-center gap-2 ${
                                isProcessing ? "bg-red-400" : "bg-red-500"
                              }`}
                              activeOpacity={0.7}
                            >
                              {isProcessing &&
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
                        </View>
                      )}
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        ))}

        {filtered.length === 0 && (
          <View className="flex-1 items-center justify-center px-6 pb-8">
            <Image
              source={require("@/assets/images/no-notification.png")}
              className="w-24 h-24 mb-4"
              resizeMode="contain"
            />
            <Text className="text-xl font-bold text-gray-900 mb-2">
              {filter === "action"
                ? "No actions needed"
                : filter === "unread"
                  ? "You're all caught up"
                  : "No Notifications"}
            </Text>
            <Text className="text-sm text-gray-500 text-center px-8 leading-5">
              {filter === "all"
                ? "We'll notify you when something important happens."
                : "Try another filter, or pull to refresh."}
            </Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}
