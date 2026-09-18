import GoalDepositModal from "@/components/GoalDepositModal";
import KycProfileAvatar from "@/components/KycProfileAvatar";
import { useAuth } from "@/Contexts/AuthContext";
import { useFormattedBalance } from "@/hooks/useFormattedBalance";
import {
  getGoalBySlug,
  GoalContribution,
  GoalFinance,
  GoalRecord,
  GoalWithdrawal,
  goalTypeLabel,
  setGoalYieldEnabled,
  uploadGoalCover,
  withdrawFromGoal,
} from "@/lib/goalService";
import { getMoonwellUsdcSnapshot } from "@/lib/moonwellService";
import { useCurrencyStore } from "@/store/useCurrencyStore";
import {
  formatAmountTyping,
  parseAmountTyping,
} from "@/Utils/helperFunctions";
import * as Clipboard from "expo-clipboard";
import * as ImagePicker from "expo-image-picker";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import {
  AlertTriangle,
  ArrowDownToLine,
  ArrowLeft,
  Camera,
  Copy,
  Info,
  Sparkles,
  TrendingUp,
  Users,
  Wallet,
} from "lucide-react-native";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  Platform,
  RefreshControl,
  ScrollView,
  Switch,
  Text,
  TextInput,
  ToastAndroid,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type HistoryItem =
  | { kind: "contribution"; data: GoalContribution }
  | { kind: "withdrawal"; data: GoalWithdrawal };

export default function GoalDetailsScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const { token, user } = useAuth();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { formatBalance } = useFormattedBalance();
  const { platformRate } = useCurrencyStore();

  const [goal, setGoal] = useState<GoalRecord | null>(null);
  const [finance, setFinance] = useState<GoalFinance | null>(null);
  const [payLink, setPayLink] = useState("");
  const [isCreator, setIsCreator] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [coverUploading, setCoverUploading] = useState(false);
  const [yieldToggling, setYieldToggling] = useState(false);
  const [supplyApy, setSupplyApy] = useState<number | null>(null);
  const [depositOpen, setDepositOpen] = useState(false);
  const [withdrawOpen, setWithdrawOpen] = useState(false);
  const [yieldInfoOpen, setYieldInfoOpen] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [withdrawLoading, setWithdrawLoading] = useState(false);

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

  useEffect(() => {
    if (!token) {
      setSupplyApy(null);
      return;
    }
    let cancelled = false;
    void getMoonwellUsdcSnapshot(
      user?.smartAddress || "",
      0,
      "base",
      platformRate,
      token
    ).then((snap) => {
      if (!cancelled) setSupplyApy(snap.supplyApy);
    });
    return () => {
      cancelled = true;
    };
  }, [token, user?.smartAddress, platformRate]);

  const handleBack = () => {
    router.replace({
      pathname: "/(tabs)",
      params: { tab: "goals" },
    });
  };

  const copyLink = async () => {
    await Clipboard.setStringAsync(payLink);
    if (Platform.OS === "android") ToastAndroid.show("Pay link copied", ToastAndroid.SHORT);
    else Alert.alert("Copied", "Pay link copied to clipboard");
  };

  const pickCover = async () => {
    if (!goal || !token || !isCreator) return;
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert("Permission required", "Allow photo access to set a cover image.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [3, 1],
      quality: 0.85,
    });
    if (result.canceled || !result.assets[0]) return;

    setCoverUploading(true);
    const asset = result.assets[0];
    const upload = await uploadGoalCover(
      goal.id,
      {
        uri: asset.uri,
        fileName: asset.fileName ?? undefined,
        mimeType: asset.mimeType ?? undefined,
      },
      token
    );
    setCoverUploading(false);
    if (upload.success && upload.coverImageUrl) {
      setGoal((g) => (g ? { ...g, coverImageUrl: upload.coverImageUrl } : g));
    } else {
      Alert.alert("Upload failed", upload.error || "Could not update cover");
    }
  };

  const handleYieldToggle = async (enabled: boolean) => {
    if (!goal || !token || !isCreator) return;
    if (goal.goalType === "public") return;
    if (enabled) setYieldInfoOpen(true);
    setYieldToggling(true);
    const res = await setGoalYieldEnabled(goal.id, enabled, token);
    setYieldToggling(false);
    if (res.success) {
      setGoal((g) =>
        g ? { ...g, yieldEnabled: res.yieldEnabled ?? enabled } : g
      );
      load();
    } else {
      Alert.alert("Error", res.error || "Could not update yield setting");
    }
  };

  const submitWithdraw = async (mode: "all" | "amount") => {
    if (!goal || !token) return;
    setWithdrawLoading(true);
    try {
      let opts: { mode: "all" | "amount"; amount?: string };
      if (mode === "all") {
        opts = { mode: "all" };
      } else {
        const parsed = parseAmountTyping(withdrawAmount);
        if (!parsed || parsed <= 0) {
          Alert.alert("Invalid amount", "Enter a valid withdrawal amount.");
          return;
        }
        opts = { mode: "amount", amount: parsed.toFixed(6) };
      }
      const res = await withdrawFromGoal(goal.id, opts, token);
      if (!res.success) {
        Alert.alert("Withdrawal failed", res.error || "Try again later.");
        return;
      }
      setWithdrawOpen(false);
      setWithdrawAmount("");
      if (Platform.OS === "android") ToastAndroid.show("Withdrawal submitted", ToastAndroid.SHORT);
      load();
    } finally {
      setWithdrawLoading(false);
    }
  };

  const target = parseFloat(goal?.targetAmount || "0") || 0;
  const balance = parseFloat(finance?.totalBalance || "0") || 0;
  const progress = target > 0 ? Math.min(100, (balance / target) * 100) : 0;
  const yieldEarned = parseFloat(finance?.yieldEarned || "0") || 0;
  const maxWithdraw = parseFloat(finance?.maxWithdrawable || "0") || balance;

  const historyItems = useMemo((): HistoryItem[] => {
    const items: HistoryItem[] = [];
    goal?.contributions?.forEach((c) => items.push({ kind: "contribution", data: c }));
    goal?.withdrawals?.forEach((w) => items.push({ kind: "withdrawal", data: w }));
    items.sort(
      (a, b) =>
        new Date(b.data.createdAt).getTime() - new Date(a.data.createdAt).getTime()
    );
    return items.slice(0, 25);
  }, [goal?.contributions, goal?.withdrawals]);

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
        <TouchableOpacity onPress={handleBack} className="bg-downy-600 px-4 py-2 rounded-xl">
          <Text className="text-white font-semibold">Go back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const showYieldCard =
    isCreator && goal.goalType !== "public" && goal.status === "active";

  return (
    <View className="flex-1 bg-gray-50">
      <StatusBar style="light" />

      <View className="relative bg-downy-800" style={{ height: 168 }}>
        {goal.coverImageUrl ? (
          <Image
            source={{ uri: goal.coverImageUrl }}
            className="absolute inset-0 w-full h-full"
            resizeMode="cover"
          />
        ) : (
          <View className="absolute inset-0 bg-downy-700" />
        )}
        <View className="absolute inset-0 bg-black/35" />
        <View
          className="absolute left-0 right-0 px-5 flex-row items-center justify-between"
          style={{ top: insets.top + 8 }}
        >
          <TouchableOpacity
            onPress={handleBack}
            className="w-10 h-10 rounded-full bg-black/30 items-center justify-center"
          >
            <ArrowLeft size={20} color="white" />
          </TouchableOpacity>
          {isCreator ? (
            <TouchableOpacity
              onPress={pickCover}
              disabled={coverUploading}
              className="flex-row items-center bg-black/30 px-3 py-2 rounded-full"
            >
              {coverUploading ? (
                <ActivityIndicator size="small" color="white" />
              ) : (
                <>
                  <Camera size={16} color="white" />
                  <Text className="text-white text-xs font-semibold ml-1.5">Cover</Text>
                </>
              )}
            </TouchableOpacity>
          ) : (
            <View className="w-10" />
          )}
        </View>
        <View className="absolute bottom-4 left-5 right-5">
          <Text className="text-white text-2xl font-bold" numberOfLines={2}>
            {goal.name}
          </Text>
          <View className="flex-row flex-wrap gap-2 mt-2">
            <View className="bg-white/20 px-2.5 py-1 rounded-full">
              <Text className="text-white text-xs font-semibold">
                {goalTypeLabel(goal.goalType)}
              </Text>
            </View>
            {goal.yieldEnabled && (
              <View className="bg-emerald-400/30 px-2.5 py-1 rounded-full">
                <Text className="text-white text-xs font-semibold">Yield on</Text>
              </View>
            )}
          </View>
        </View>
      </View>

      <ScrollView
        className="flex-1 px-5"
        contentContainerStyle={{ paddingTop: 16, paddingBottom: insets.bottom + 40 }}
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
          <Text className="text-sm font-semibold text-gray-500 mb-1">Saved so far</Text>
          <Text className="text-3xl font-bold text-gray-900 mb-1">
            {formatBalance(balance)}
          </Text>
          <Text className="text-sm text-gray-500 mb-1">
            of {formatBalance(target)} target · {progress.toFixed(0)}% funded
          </Text>
          {goal.yieldEnabled ? (
            <Text className="text-sm text-downy-600 font-medium mb-2">
              Yield +{formatBalance(yieldEarned)}
              {supplyApy != null ? ` · ${supplyApy.toFixed(2)}% APY` : ""}
            </Text>
          ) : null}
          <View className="h-3 bg-gray-100 rounded-full overflow-hidden mb-4">
            <View
              className="h-full bg-downy-600 rounded-full"
              style={{ width: `${progress}%` }}
            />
          </View>

          <View className="flex-row gap-3">
            <TouchableOpacity
              onPress={() => setDepositOpen(true)}
              className="flex-1 bg-downy-600 py-3.5 rounded-xl items-center"
            >
              <Text className="text-white font-bold">Deposit</Text>
            </TouchableOpacity>
            {isCreator && (
              <TouchableOpacity
                onPress={() => setWithdrawOpen(true)}
                className="flex-1 border border-downy-600 py-3.5 rounded-xl items-center flex-row justify-center gap-2"
              >
                <ArrowDownToLine size={18} color="#0f766e" />
                <Text className="text-downy-700 font-bold">Withdraw</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {showYieldCard && (
          <View
            className={`rounded-2xl border p-4 mb-4 ${
              goal.yieldEnabled
                ? "bg-emerald-50 border-emerald-200"
                : "bg-white border-gray-100"
            }`}
          >
            <View className="flex-row items-center justify-between">
              <TouchableOpacity
                className="flex-1 pr-3 flex-row items-start"
                activeOpacity={0.75}
                onPress={() => setYieldInfoOpen(true)}
              >
                <View
                  className={`w-9 h-9 rounded-xl items-center justify-center mr-3 ${
                    goal.yieldEnabled ? "bg-emerald-100" : "bg-gray-50"
                  }`}
                >
                  <Sparkles
                    size={16}
                    color={goal.yieldEnabled ? "#059669" : "#9ca3af"}
                  />
                </View>
                <View className="flex-1">
                  <View className="flex-row items-center flex-wrap">
                    <Text className="text-sm font-bold text-gray-900 mr-1">
                      Put your savings to work
                    </Text>
                    <Info size={14} color="#059669" />
                  </View>
                  <Text className="text-xs text-gray-500 mt-1 leading-4">
                    Idle goal funds can earn on Moonwell.
                  </Text>
                  {supplyApy != null && (
                    <Text className="text-sm font-semibold text-downy-600 mt-2">
                      Moonwell APY ~{supplyApy.toFixed(2)}%
                    </Text>
                  )}
                </View>
              </TouchableOpacity>
              <Switch
                value={goal.yieldEnabled}
                disabled={yieldToggling}
                onValueChange={handleYieldToggle}
                trackColor={{ false: "#d1d5db", true: "#6ee7b7" }}
                thumbColor={goal.yieldEnabled ? "#059669" : "#f4f4f5"}
              />
            </View>
          </View>
        )}

        <View className="bg-white rounded-2xl border border-gray-100 p-5 mb-4">
          <Text className="text-base font-semibold text-gray-900 mb-2">Pay link</Text>
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

        <View className="bg-white rounded-2xl border border-gray-100 p-5 mb-4">
          <View className="flex-row items-center gap-2 mb-3">
            <Users size={18} color="#059669" />
            <Text className="text-base font-semibold text-gray-900">Members</Text>
          </View>
          {(goal.members?.length
            ? goal.members
            : [
                {
                  id: 0,
                  userId: goal.creatorId,
                  user: goal.creator ?? {
                    id: goal.creatorId,
                    userName: "Creator",
                    smartAddress: "",
                  },
                },
              ]
          ).map(
            (m) => (
              <View key={m.id} className="flex-row items-center py-2.5 border-b border-gray-50">
                <KycProfileAvatar
                  imageUrl={m.user?.profileImageUrl}
                  initials={(m.user?.userName || "M").slice(0, 2).toUpperCase()}
                  verified={false}
                  size="sm"
                />
                <View className="ml-3 flex-1">
                  <Text className="text-gray-900 font-medium">
                    {m.user?.userName || "Member"}
                    {m.userId === goal.creatorId ? " · Creator" : ""}
                  </Text>
                </View>
              </View>
            )
          )}
        </View>

        <View className="bg-white rounded-2xl border border-gray-100 p-5 mb-4">
          <Text className="text-base font-semibold text-gray-900 mb-3">Recent activity</Text>
          {!historyItems.length ? (
            <Text className="text-sm text-gray-500">
              No activity yet. Share the pay link or deposit to get started.
            </Text>
          ) : (
            historyItems.map((item) => {
              if (item.kind === "contribution") {
                const c = item.data;
                return (
                  <View
                    key={`c-${c.id}`}
                    className="flex-row justify-between items-center py-3 border-b border-gray-100"
                  >
                    <View className="flex-row items-center flex-1 pr-2">
                      {c.contributorUser ? (
                        <KycProfileAvatar
                          imageUrl={c.contributorUser.profileImageUrl}
                          initials={(c.contributorUser.userName || "U").slice(0, 2).toUpperCase()}
                          verified={false}
                          size="sm"
                        />
                      ) : (
                        <View className="w-9 h-9 rounded-full bg-gray-100 items-center justify-center">
                          <Wallet size={16} color="#6b7280" />
                        </View>
                      )}
                      <View className="ml-2 flex-1">
                        <Text className="text-gray-800 font-medium" numberOfLines={1}>
                          {c.isGuest
                            ? c.guestDisplayName || "Guest"
                            : c.contributorUser?.userName || "Deposit"}
                        </Text>
                        <Text className="text-xs text-gray-400">
                          {new Date(c.createdAt).toLocaleString()}
                        </Text>
                      </View>
                    </View>
                    <Text className="text-downy-700 font-semibold">
                      +{formatBalance(parseFloat(c.amount) || 0)}
                    </Text>
                  </View>
                );
              }
              const w = item.data;
              return (
                <View
                  key={`w-${w.id}`}
                  className="flex-row justify-between items-center py-3 border-b border-gray-100"
                >
                  <View>
                    <Text className="text-gray-800 font-medium">Withdrawal · {w.mode}</Text>
                    <Text className="text-xs text-gray-400">
                      {new Date(w.createdAt).toLocaleString()}
                    </Text>
                  </View>
                  <Text className="text-amber-700 font-semibold">
                    −{formatBalance(parseFloat(w.amount) || 0)}
                  </Text>
                </View>
              );
            })
          )}
        </View>

        {goal.description ? (
          <Text className="text-sm text-gray-500 text-center px-2 mb-4">{goal.description}</Text>
        ) : null}
      </ScrollView>

      <GoalDepositModal
        visible={depositOpen}
        goalId={goal.id}
        goalName={goal.name}
        onClose={() => setDepositOpen(false)}
        onSuccess={() => load()}
      />

      <Modal visible={withdrawOpen} transparent animationType="slide">
        <View className="flex-1 justify-end bg-black/50">
          <View className="bg-white rounded-t-3xl p-5 pb-10">
            <Text className="text-xl font-bold text-gray-900 mb-1">Withdraw</Text>
            <Text className="text-sm text-gray-500 mb-4">
              Up to {formatBalance(maxWithdraw)} available
            </Text>
            <TextInput
              className="border border-gray-200 rounded-xl px-4 py-3 text-lg mb-3"
              placeholder="Amount (USDC)"
              keyboardType="decimal-pad"
              value={withdrawAmount}
              onChangeText={(t) => setWithdrawAmount(formatAmountTyping(t, true))}
            />
            <TouchableOpacity
              onPress={() => submitWithdraw("amount")}
              disabled={withdrawLoading}
              className="bg-downy-600 py-4 rounded-xl items-center mb-3"
            >
              {withdrawLoading ? (
                <ActivityIndicator color="white" />
              ) : (
                <Text className="text-white font-bold">Withdraw amount</Text>
              )}
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => submitWithdraw("all")}
              disabled={withdrawLoading}
              className="border border-gray-300 py-4 rounded-xl items-center"
            >
              <Text className="text-gray-800 font-semibold">Withdraw all & close goal</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setWithdrawOpen(false)} className="py-4 items-center mt-2">
              <Text className="text-gray-500">Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal visible={yieldInfoOpen} transparent animationType="fade">
        <View className="flex-1 bg-black/50 justify-end">
          <View className="bg-white rounded-t-3xl p-5 pb-10 max-h-[85%]">
            <View className="flex-row items-center mb-4">
              <Sparkles size={22} color="#059669" />
              <Text className="text-xl font-bold text-gray-900 ml-2 flex-1">
                Put your savings to work
              </Text>
            </View>
            <Text className="text-sm text-gray-500 mb-5 leading-5">
              Here’s what happens when you turn this on for your goal.
            </Text>

            <View className="mb-3 rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3.5 flex-row items-start">
              <View className="w-8 h-8 rounded-lg bg-white items-center justify-center mr-3 mt-0.5">
                <Users size={16} color="#0f766e" />
              </View>
              <View className="flex-1">
                <Text className="text-sm font-semibold text-gray-900 mb-1">
                  Supplied to Moonwell
                </Text>
                <Text className="text-sm text-gray-500 leading-5">
                  Goal funds are supplied to a Moonwell pool to provide liquidity. ChamaPay
                  does not hold this yield pool itself.
                </Text>
              </View>
            </View>

            <View className="mb-3 rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3.5 flex-row items-start">
              <View className="w-8 h-8 rounded-lg bg-white items-center justify-center mr-3 mt-0.5">
                <TrendingUp size={16} color="#0f766e" />
              </View>
              <View className="flex-1">
                <Text className="text-sm font-semibold text-gray-900 mb-1">APY is relative</Text>
                <Text className="text-sm text-gray-500 leading-5">
                  APY can go up or down — it depends on borrowing demand and is not
                  guaranteed.
                </Text>
              </View>
            </View>

            <View className="mb-5 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3.5 flex-row items-start">
              <View className="w-8 h-8 rounded-lg bg-white items-center justify-center mr-3 mt-0.5">
                <AlertTriangle size={16} color="#d97706" />
              </View>
              <View className="flex-1">
                <Text className="text-sm font-semibold text-amber-900 mb-1">
                  Withdrawal risk
                </Text>
                <Text className="text-sm text-amber-800/80 leading-5">
                  Withdrawals depend on pool liquidity. Your balance remains yours and can
                  keep earning when cash is borrowed.
                </Text>
              </View>
            </View>

            <TouchableOpacity
              onPress={() => setYieldInfoOpen(false)}
              className="bg-downy-600 py-4 rounded-2xl items-center"
            >
              <Text className="text-white font-bold text-base">Got it</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}
