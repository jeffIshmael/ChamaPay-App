import { useAuth } from "@/Contexts/AuthContext";
import { useFormattedBalance } from "@/hooks/useFormattedBalance";
import { getGoalBySlug, GoalFinance, GoalRecord, goalTypeLabel } from "@/lib/goalService";
import * as Clipboard from "expo-clipboard";
import { useLocalSearchParams, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import {
  ArrowLeft,
  Calendar,
  Copy,
  Link2,
  Target,
  Users,
  Wallet,
} from "lucide-react-native";
import React, { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  RefreshControl,
  ScrollView,
  Text,
  ToastAndroid,
  TouchableOpacity,
  View,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useFocusEffect } from "expo-router";

export default function GoalDetailsScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const { token } = useAuth();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { formatBalance } = useFormattedBalance();

  const [goal, setGoal] = useState<GoalRecord | null>(null);
  const [finance, setFinance] = useState<GoalFinance | null>(null);
  const [payLink, setPayLink] = useState("");
  const [isCreator, setIsCreator] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    if (!token || !slug) return;
    try {
      const res = await getGoalBySlug(slug, token);
      if (res.success && res.goal) {
        setGoal(res.goal);
        setFinance(res.finance ?? null);
        setPayLink(res.payLink || `https://chamapay.com/goal/${res.goal.slug}`);
        setIsCreator(Boolean(res.isCreator));
      } else {
        Alert.alert("Error", res.error || "Goal not found");
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [token, slug]);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      load();
    }, [load])
  );

  const copyLink = async () => {
    await Clipboard.setStringAsync(payLink);
    if (Platform.OS === "android") ToastAndroid.show("Pay link copied", ToastAndroid.SHORT);
    else Alert.alert("Copied", "Pay link copied to clipboard");
  };

  const target = parseFloat(goal?.targetAmount || "0") || 0;
  const balance = parseFloat(finance?.totalBalance || "0") || 0;
  const progress = target > 0 ? Math.min(100, (balance / target) * 100) : 0;

  if (loading) {
    return (
      <View className="flex-1 bg-gray-50 items-center justify-center">
        <ActivityIndicator size="large" color="#059669" />
      </View>
    );
  }

  if (!goal) {
    return (
      <View className="flex-1 bg-gray-50 items-center justify-center px-6">
        <Text className="text-gray-600 mb-4">Goal not found</Text>
        <TouchableOpacity onPress={() => router.back()} className="bg-downy-600 px-4 py-2 rounded-xl">
          <Text className="text-white font-semibold">Go back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-gray-50">
      <StatusBar style="light" />
      <View
        className="bg-downy-800 rounded-b-3xl px-5 pb-6"
        style={{ paddingTop: insets.top + 12 }}
      >
        <View className="flex-row items-center justify-between mb-4">
          <TouchableOpacity
            onPress={() => router.back()}
            className="w-10 h-10 rounded-full bg-white/20 items-center justify-center"
          >
            <ArrowLeft size={20} color="white" />
          </TouchableOpacity>
          <Text className="text-white text-lg font-bold flex-1 text-center">Goal</Text>
          <View className="w-10" />
        </View>
        <Text className="text-white text-2xl font-bold mb-1">{goal.name}</Text>
        <Text className="text-white/80 text-sm mb-3" numberOfLines={2}>
          {goal.description}
        </Text>
        <View className="flex-row gap-2">
          <View className="bg-white/20 px-3 py-1 rounded-full">
            <Text className="text-white text-xs font-semibold">
              {goalTypeLabel(goal.goalType)}
            </Text>
          </View>
          {goal.yieldEnabled && (
            <View className="bg-emerald-400/30 px-3 py-1 rounded-full">
              <Text className="text-white text-xs font-semibold">Yield on</Text>
            </View>
          )}
          <View className="bg-white/20 px-3 py-1 rounded-full">
            <Text className="text-white text-xs font-semibold capitalize">{goal.status}</Text>
          </View>
        </View>
      </View>

      <ScrollView
        className="flex-1 px-5"
        contentContainerStyle={{ paddingTop: 20, paddingBottom: insets.bottom + 40 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              load();
            }}
            tintColor="#059669"
          />
        }
      >
        <View className="bg-white rounded-2xl border border-gray-100 p-5 mb-4">
          <Text className="text-sm font-semibold text-gray-500 mb-2">Progress</Text>
          <Text className="text-3xl font-bold text-gray-900 mb-1">
            {formatBalance(balance)}
          </Text>
          <Text className="text-sm text-gray-500 mb-3">
            of {formatBalance(target)} target
            {finance ? ` · earned ${formatBalance(parseFloat(finance.yieldEarned) || 0)}` : ""}
          </Text>
          <View className="h-3 bg-gray-100 rounded-full overflow-hidden">
            <View
              className="h-full bg-downy-600 rounded-full"
              style={{ width: `${progress}%` }}
            />
          </View>
          <Text className="text-xs text-gray-500 mt-2">{progress.toFixed(0)}% funded</Text>

          {finance && (
            <View className="flex-row mt-4 gap-3">
              <View className="flex-1 bg-gray-50 rounded-xl p-3">
                <Text className="text-xs text-gray-500">Idle</Text>
                <Text className="text-sm font-semibold text-gray-900">
                  {formatBalance(parseFloat(finance.idleUsdc) || 0)}
                </Text>
              </View>
              <View className="flex-1 bg-gray-50 rounded-xl p-3">
                <Text className="text-xs text-gray-500">In Moonwell</Text>
                <Text className="text-sm font-semibold text-gray-900">
                  {formatBalance(parseFloat(finance.moonwellUsdc) || 0)}
                </Text>
              </View>
            </View>
          )}
        </View>

        <View className="bg-white rounded-2xl border border-gray-100 p-5 mb-4">
          <Text className="text-base font-semibold text-gray-900 mb-3">Pay link</Text>
          <Text className="text-sm text-gray-600 mb-3" numberOfLines={2}>
            {payLink}
          </Text>
          <TouchableOpacity
            onPress={copyLink}
            className="bg-downy-600 py-3 rounded-xl flex-row items-center justify-center gap-2"
          >
            <Copy size={18} color="white" />
            <Text className="text-white font-semibold">Copy pay link</Text>
          </TouchableOpacity>
        </View>

        <View className="bg-white rounded-2xl border border-gray-100 p-5 mb-4 gap-3">
          <View className="flex-row items-center gap-3">
            <Users size={18} color="#059669" />
            <Text className="text-gray-800 font-medium">
              {goal.members?.length || 1} member{(goal.members?.length || 1) === 1 ? "" : "s"}
            </Text>
          </View>
          {goal.endDate && (
            <View className="flex-row items-center gap-3">
              <Calendar size={18} color="#059669" />
              <Text className="text-gray-800 font-medium">
                Ends {new Date(goal.endDate).toLocaleDateString()}
              </Text>
            </View>
          )}
          <View className="flex-row items-center gap-3">
            <Wallet size={18} color="#059669" />
            <Text className="text-gray-800 font-medium">
              Creator: {goal.creator?.userName || "You"}
              {isCreator ? " (you)" : ""}
            </Text>
          </View>
          <View className="flex-row items-center gap-3">
            <Target size={18} color="#059669" />
            <Text className="text-gray-800 font-medium">
              On-chain id #{goal.blockchainId}
            </Text>
          </View>
          <View className="flex-row items-center gap-3">
            <Link2 size={18} color="#059669" />
            <Text className="text-gray-500 text-xs flex-1" numberOfLines={1}>
              {goal.createTxHash || "—"}
            </Text>
          </View>
        </View>

        <View className="bg-white rounded-2xl border border-gray-100 p-5 mb-4">
          <Text className="text-base font-semibold text-gray-900 mb-3">Recent contributions</Text>
          {!goal.contributions?.length ? (
            <Text className="text-sm text-gray-500">
              No contributions yet. Share the pay link to get started.
            </Text>
          ) : (
            goal.contributions.map((c) => (
              <View
                key={c.id}
                className="flex-row justify-between py-3 border-b border-gray-100"
              >
                <Text className="text-gray-800 font-medium">
                  {c.isGuest
                    ? c.guestDisplayName || "Guest"
                    : c.contributorUser?.userName || "Member"}
                </Text>
                <Text className="text-downy-700 font-semibold">
                  {formatBalance(parseFloat(c.amount) || 0)}
                </Text>
              </View>
            ))
          )}
        </View>

        {isCreator && (
          <Text className="text-center text-xs text-gray-400 mb-6">
            Contribute, add members, and withdraw flows come next. For now you can share the pay
            link and track progress here.
          </Text>
        )}
      </ScrollView>
    </View>
  );
}
