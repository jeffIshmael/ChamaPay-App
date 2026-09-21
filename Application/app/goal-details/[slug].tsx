import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useLocalSearchParams, router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import * as SystemUI from "expo-system-ui";
import {
  AlertTriangle,
  ArrowDownCircle,
  ArrowLeft,
  ArrowUpCircle,
  Camera,
  ExternalLink,
  Link2,
  TrendingUp,
  Users,
  UserPlus,
  X,
  Zap,
} from "lucide-react-native";
import {
  ActivityIndicator,
  Alert,
  Image,
  Linking,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  Share,
  Text,
  ToastAndroid,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import GoalDepositModal from "@/components/GoalDepositModal";
import GoalWithdrawModal from "@/components/GoalWithdrawModal";
import { useAuth } from "@/Contexts/AuthContext";
import { generateGoalPayUrl } from "@/lib/encryption";
import { useFormattedBalance } from "@/hooks/useFormattedBalance";
import {
  getGoalBySlug,
  GoalContribution,
  GoalFinance,
  GoalRecord,
  GoalWithdrawal,
  goalTypeLabel,
  goalTypeTagColors,
  setGoalYieldEnabled,
  uploadGoalCover,
} from "@/lib/goalService";
import { getMoonwellUsdcSnapshot } from "@/lib/moonwellService";
import { useCurrencyStore } from "@/store/useCurrencyStore";
import * as Clipboard from "expo-clipboard";
import * as ImagePicker from "expo-image-picker";

/** Matches other app headers (notifications, home, settings). */
const HEADER_TEAL = "#1a6b6b";

type TabId = "members" | "history";

type MemberSlice = {
  key: string;
  name: string;
  avatar?: string | null;
  amount: number;
  color: string;
  role: "member" | "guest" | "contributor";
};

type HistoryItem =
  | {
      kind: "in";
      id: string;
      amount: number;
      label: string;
      avatar?: string | null;
      date: Date;
      txHash?: string;
    }
  | {
      kind: "out";
      id: string;
      amount: number;
      label: string;
      date: Date;
      txHash?: string;
    };

const MEMBER_PALETTE = [
  "#3B82F6",
  "#6B7280",
  "#E5E7EB",
  "#F59E0B",
  "#10B981",
  "#0EA5E9",
  "#F97316",
  "#14B8A6",
  "#64748B",
  "#84CC16",
];

function relativeDay(d: Date) {
  const now = new Date();
  const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startThen = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const diff = Math.round(
    (startToday.getTime() - startThen.getTime()) / (1000 * 60 * 60 * 24)
  );
  if (diff === 0) return "Today";
  if (diff === 1) return "Yesterday";
  return d.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: d.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
  });
}

function formatGoalCreatedAt(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const date = d.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
  const time = d.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
  return `${date}, ${time}`;
}

function ContributorAvatar({
  name,
  imageUrl,
}: {
  name: string;
  imageUrl?: string | null;
}) {
  const initial = (name.replace(/^@/, "").trim()[0] || "?").toUpperCase();
  if (imageUrl) {
    return (
      <Image
        source={{ uri: imageUrl }}
        className="h-9 w-9 rounded-full bg-gray-100"
      />
    );
  }
  return (
    <View className="h-9 w-9 rounded-full bg-gray-100 items-center justify-center">
      <Text className="text-[12px] font-bold text-gray-500">{initial}</Text>
    </View>
  );
}

export default function GoalDetailsScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const { token, user } = useAuth();
  const insets = useSafeAreaInsets();
  const { formatBalance, formatUsdc, showUsdcPeek } = useFormattedBalance();
  const { platformRate } = useCurrencyStore();

  const [goal, setGoal] = useState<GoalRecord | null>(null);
  const [finance, setFinance] = useState<GoalFinance | null>(null);
  const [payLink, setPayLink] = useState("");
  const [isCreator, setIsCreator] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [coverUploading, setCoverUploading] = useState(false);
  const [yieldBusy, setYieldBusy] = useState(false);
  const [supplyApy, setSupplyApy] = useState<number | null>(null);
  const [depositOpen, setDepositOpen] = useState(false);
  const [withdrawOpen, setWithdrawOpen] = useState(false);
  const [yieldInfoOpen, setYieldInfoOpen] = useState(false);
  const [tab, setTab] = useState<TabId>("members");
  const [selectedSlice, setSelectedSlice] = useState<string | null>(null);

  const load = useCallback(
    async (opts?: { silent?: boolean }) => {
      if (!token || !slug) return;
      try {
        if (!opts?.silent) setLoading(true);
        const res = await getGoalBySlug(slug, token);
        if (res.success && res.goal) {
          setGoal(res.goal);
          setFinance(res.finance ?? null);
          setPayLink(
            res.payLink || generateGoalPayUrl(res.goal.slug)
          );
          const creatorMatch =
            Boolean(res.isCreator) ||
            (user?.id != null && Number(user.id) === Number(res.goal.creatorId));
          setIsCreator(creatorMatch);
        } else if (!opts?.silent) {
          Alert.alert("Error", res.error || "Goal not found");
          setGoal(null);
        }
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [token, slug, user?.id]
  );

  useEffect(() => {
    void load();
  }, [load]);

  // Solid downy status-bar chrome while this screen is open (same as other headers).
  useEffect(() => {
    void SystemUI.setBackgroundColorAsync(HEADER_TEAL);
    return () => {
      void SystemUI.setBackgroundColorAsync("#d1f6f1");
    };
  }, []);

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
    // Pushed from Home — prefer history. Avoid throwing if nav ref is unset.
    try {
      if (router.canGoBack()) {
        router.back();
        return;
      }
    } catch {
      // fall through
    }
    router.replace({
      pathname: "/(tabs)/index",
      params: { tab: "goals" },
    });
  };

  const toast = (msg: string) => {
    if (Platform.OS === "android") ToastAndroid.show(msg, ToastAndroid.SHORT);
    else Alert.alert("", msg);
  };

  const copyLink = async () => {
    await Clipboard.setStringAsync(payLink);
    toast("Pay link copied");
  };

  const shareInvite = async () => {
    if (!goal) return;
    try {
      await Share.share({
        message: `Join my Chamapay goal "${goal.name}": ${payLink}`,
        url: payLink,
      });
    } catch {
      await copyLink();
    }
  };

  const pickCover = async () => {
    if (!goal || !token || !isCreator) return;
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert(
        "Permission required",
        "Allow photo access to set a cover image."
      );
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
      toast("Cover photo updated");
    } else {
      Alert.alert("Upload failed", upload.error || "Could not update cover");
    }
  };

  const applyYieldToggle = async (enabled: boolean) => {
    if (!goal || !token || !isCreator) return;
    setYieldBusy(true);
    try {
      const res = await setGoalYieldEnabled(goal.id, enabled, token);
      if (!res.success) {
        Alert.alert("Error", res.error || "Could not update yield");
        return;
      }
      setFinance((f) => (f ? { ...f, yieldEnabled: enabled } : f));
      setGoal((g) => (g ? { ...g, yieldEnabled: enabled } : g));
      toast(
        enabled ? "Money is going to work" : "Yield paused — funds stay idle"
      );
      void load({ silent: true });
    } finally {
      setYieldBusy(false);
      setYieldInfoOpen(false);
    }
  };

  const onYieldSwitch = () => {
    if (!isCreator || yieldBusy) return;
    if (!yieldOn) {
      setYieldInfoOpen(true);
      return;
    }
    void applyYieldToggle(false);
  };

  const memberIds = useMemo(
    () => (goal?.members || []).map((m) => m.userId),
    [goal?.members]
  );

  const memberSlices = useMemo((): MemberSlice[] => {
    if (!goal) return [];
    const map = new Map<string, MemberSlice>();
    let colorIdx = 0;
    const memberIdSet = new Set(memberIds);

    const ensure = (
      key: string,
      name: string,
      role: MemberSlice["role"],
      avatar?: string | null
    ): MemberSlice => {
      let row = map.get(key);
      if (!row) {
        row = {
          key,
          name,
          avatar,
          amount: 0,
          color: MEMBER_PALETTE[colorIdx % MEMBER_PALETTE.length],
          role,
        };
        colorIdx += 1;
        map.set(key, row);
      }
      return row;
    };

    for (const m of goal.members || []) {
      const isMe =
        user?.id != null && Number(m.userId) === Number(user.id);
      ensure(
        `u-${m.userId}`,
        isMe
          ? "You"
          : m.user?.userName
            ? `@${m.user.userName}`
            : "Member",
        "member",
        m.user?.profileImageUrl
      );
    }

    for (const c of goal.contributions || []) {
      const amt = parseFloat(c.amount) || 0;
      if (c.isGuest) {
        const key = `g-${(
          c.guestDisplayName ||
          c.contributorAddress ||
          "guest"
        ).toLowerCase()}`;
        const row = ensure(
          key,
          c.guestDisplayName || "Guest contributor",
          "guest"
        );
        row.amount += amt;
      } else if (c.contributorUser?.id != null) {
        const isOfficial = memberIdSet.has(c.contributorUser.id);
        const isMe =
          user?.id != null &&
          Number(c.contributorUser.id) === Number(user.id);
        const row = ensure(
          `u-${c.contributorUser.id}`,
          isMe
            ? "You"
            : c.contributorUser.userName
              ? `@${c.contributorUser.userName}`
              : "Contributor",
          isOfficial ? "member" : "contributor",
          c.contributorUser.profileImageUrl
        );
        row.amount += amt;
      } else {
        const addr = (c.contributorAddress || "unknown").toLowerCase();
        const row = ensure(
          `a-${addr}`,
          addr.length > 10 ? `${addr.slice(0, 6)}…${addr.slice(-4)}` : "Unknown",
          "contributor"
        );
        row.amount += amt;
      }
    }

    if (map.size === 0 && goal.creator) {
      const isMe =
        user?.id != null && Number(goal.creatorId) === Number(user.id);
      ensure(
        `u-${goal.creatorId}`,
        isMe
          ? "You"
          : goal.creator.userName
            ? `@${goal.creator.userName}`
            : "You",
        "member",
        goal.creator.profileImageUrl
      );
    }

    return Array.from(map.values())
      .map((row) =>
        user?.id != null && row.key === `u-${user.id}`
          ? { ...row, name: "You" }
          : row
      )
      .sort((a, b) => b.amount - a.amount);
  }, [goal, memberIds, user?.id]);

  const history = useMemo((): HistoryItem[] => {
    if (!goal) return [];
    const ins: HistoryItem[] = (goal.contributions || []).map(
      (c: GoalContribution) => ({
        kind: "in" as const,
        id: `c-${c.id}`,
        amount: parseFloat(c.amount) || 0,
        label: c.isGuest
          ? c.guestDisplayName || "Guest"
          : c.contributorUser?.userName
            ? `@${c.contributorUser.userName}`
            : "Contribution",
        avatar: c.contributorUser?.profileImageUrl,
        date: new Date(c.createdAt),
        txHash: c.txHash,
      })
    );
    const outs: HistoryItem[] = (goal.withdrawals || []).map(
      (w: GoalWithdrawal) => ({
        kind: "out" as const,
        id: `w-${w.id}`,
        amount: parseFloat(w.amount) || 0,
        label: `Withdraw · ${w.mode}`,
        date: new Date(w.createdAt),
        txHash: w.txHash,
      })
    );
    return [...ins, ...outs].sort(
      (a, b) => b.date.getTime() - a.date.getTime()
    );
  }, [goal]);

  if (loading) {
    return (
      <View className="flex-1 bg-gray-50">
        <StatusBar style="light" />
        {/* Status-bar strip only */}
        <View style={{ height: insets.top, backgroundColor: HEADER_TEAL }} />
        <View
          className="relative overflow-hidden"
          style={{ height: 168 }}
        >
          <LinearGradient
            colors={["#0f4f4f", "#1a6b6b", "#2a9a8a"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
            }}
          />
          <LinearGradient
            colors={["transparent", "rgba(0,0,0,0.45)", "rgba(0,0,0,0.8)"]}
            style={{
              position: "absolute",
              left: 0,
              right: 0,
              bottom: 0,
              height: "58%",
            }}
          />
          <View className="flex-1 px-4 pt-1.5 pb-3 justify-between">
            <View className="flex-row items-center justify-between min-h-[36px]">
              <TouchableOpacity
                onPress={handleBack}
                className="h-9 w-9 rounded-full bg-black/40 items-center justify-center border border-white/15"
              >
                <ArrowLeft size={16} color="white" />
              </TouchableOpacity>
              <View className="w-9" />
            </View>
            <View style={{ gap: 8 }}>
              <View className="h-4 w-16 rounded-md bg-white/25" />
              <View className="h-6 w-48 rounded-md bg-white/35" />
            </View>
          </View>
        </View>
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#059669" />
        </View>
      </View>
    );
  }

  if (!goal) {
    return (
      <View className="flex-1 bg-gray-50 items-center justify-center px-6">
        <StatusBar style="light" />
        <Text className="text-gray-600 mb-4">Goal not found</Text>
        <TouchableOpacity
          onPress={handleBack}
          className="bg-downy-600 px-4 py-2 rounded-xl"
        >
          <Text className="text-white font-semibold">Back to My Goals</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const yieldOn = Boolean(finance?.yieldEnabled ?? goal.yieldEnabled);
  const target = parseFloat(goal.targetAmount || "0") || 0;
  const balance = parseFloat(finance?.totalBalance || "0") || 0;
  const progress = target > 0 ? Math.min(100, (balance / target) * 100) : 0;
  const isGreen = progress >= 60;
  const yieldEarned = parseFloat(finance?.yieldEarned || "0") || 0;
  const inMw = parseFloat(finance?.moonwellUsdc || "0") || 0;
  const maxWithdrawable =
    parseFloat(finance?.maxWithdrawable || "0") || balance;
  const barDenom = target > 0 ? target : Math.max(balance, 1);
  const activeSlice = memberSlices.find((m) => m.key === selectedSlice);
  const canInviteMembers =
    goal.goalType === "invite" || goal.goalType === "public";
  const hasContributions = memberSlices.some((m) => m.amount > 0);
  const typeTag = goalTypeTagColors(goal.goalType);

  return (
    <View className="flex-1 bg-gray-50">
      <StatusBar style="light" />

      {/* Only the system status bar strip is downy — cover + controls sit below */}
      <View style={{ height: insets.top, backgroundColor: HEADER_TEAL }} />

      {/* Cover hero with back / camera overlaid on the image */}
      <View className="relative overflow-hidden" style={{ height: 168 }}>
        {goal.coverImageUrl ? (
          <Image
            source={{ uri: goal.coverImageUrl }}
            className="absolute inset-0 w-full h-full"
            resizeMode="cover"
          />
        ) : (
          <LinearGradient
            colors={["#0f4f4f", "#1a6b6b", "#2a9a8a"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }}
          />
        )}
        <LinearGradient
          colors={["transparent", "rgba(0,0,0,0.45)", "rgba(0,0,0,0.8)"]}
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            bottom: 0,
            height: "58%",
          }}
        />

        <View className="flex-1 px-4 pt-1.5 pb-3 justify-between">
          <View className="flex-row items-center justify-between min-h-[36px]">
            <TouchableOpacity
              onPress={handleBack}
              className="h-9 w-9 rounded-full bg-black/40 items-center justify-center border border-white/15"
            >
              <ArrowLeft size={16} color="white" />
            </TouchableOpacity>
            <View className="flex-row items-center" style={{ gap: 6 }}>
              {isCreator && canInviteMembers ? (
                <TouchableOpacity
                  onPress={() => void shareInvite()}
                  className="h-9 w-9 rounded-full bg-white/20 items-center justify-center border border-white/25"
                >
                  <UserPlus size={17} color="white" />
                </TouchableOpacity>
              ) : null}
              {isCreator ? (
                <TouchableOpacity
                  onPress={() => void pickCover()}
                  disabled={coverUploading}
                  className="h-9 w-9 rounded-full bg-black/40 items-center justify-center border border-white/15"
                >
                  {coverUploading ? (
                    <ActivityIndicator size="small" color="white" />
                  ) : (
                    <Camera size={14} color="white" />
                  )}
                </TouchableOpacity>
              ) : null}
            </View>
          </View>

          <View>
            <View className="flex-row flex-wrap mb-1.5" style={{ gap: 4 }}>
              <View
                className="px-2 py-0.5 rounded-md border"
                style={{
                  backgroundColor: typeTag.bg,
                  borderColor: typeTag.bg,
                }}
              >
                <Text
                  className="text-[9px] font-semibold"
                  style={{ color: typeTag.color }}
                >
                  {goalTypeLabel(goal.goalType)}
                </Text>
              </View>
              {yieldOn ? (
                <View className="bg-emerald-500/45 px-2 py-0.5 rounded-md border border-white/10">
                  <Text className="text-white text-[9px] font-semibold">
                    At work
                  </Text>
                </View>
              ) : null}
            </View>
            <Text
              className="text-white text-[19px] font-extrabold leading-tight"
              numberOfLines={2}
              style={{ textShadowColor: "rgba(0,0,0,0.4)", textShadowRadius: 4 }}
            >
              {goal.name}
            </Text>
            {goal.description ? (
              <Text
                className="text-white/90 text-[11px] mt-0.5"
                numberOfLines={1}
              >
                {goal.description}
              </Text>
            ) : null}
          </View>
        </View>
      </View>

      {/* Fixed: balance + actions + yield */}
      <View className="px-4 z-10" style={{ marginTop: -12 }}>
        <View
          className="bg-white rounded-2xl border border-downy-100 px-4 py-3.5 mb-2.5"
          style={{
            shadowColor: "#0f172a",
            shadowOffset: { width: 0, height: 8 },
            shadowOpacity: 0.14,
            shadowRadius: 12,
            elevation: 10,
          }}
        >
          <View className="flex-row items-end justify-between gap-3 mb-1">
            <View className="flex-1">
              <Text className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">
                Balance
              </Text>
              <Text className="text-[20px] font-extrabold text-gray-900 mt-0.5">
                {formatBalance(balance)}
                <Text className="text-[12px] font-semibold text-gray-400">
                  {" "}
                  / {formatBalance(target)}
                </Text>
              </Text>
              {showUsdcPeek ? (
                <Text className="text-[11px] text-gray-400 mt-0.5">
                  ≈ {formatUsdc(balance)} / {formatUsdc(target)}
                </Text>
              ) : null}
              {yieldOn ? (
                <Text className="text-[12px] font-semibold text-downy-600 mt-0.5">
                  Yield +{formatBalance(yieldEarned)}
                  {showUsdcPeek ? (
                    <Text className="text-gray-400 font-medium">
                      {" "}
                      (≈ {formatUsdc(yieldEarned)})
                    </Text>
                  ) : null}
                  {supplyApy != null
                    ? ` · ${supplyApy.toFixed(2)}% APY`
                    : ""}
                </Text>
              ) : null}
            </View>
            <Text
              className={`text-[18px] font-extrabold ${
                isGreen ? "text-emerald-600" : "text-amber-600"
              }`}
            >
              {progress.toFixed(0)}%
            </Text>
          </View>

          {goal.endDate ? (
            <Text className="text-[11px] text-gray-500 mb-2.5">
              Deadline{" "}
              <Text className="font-semibold text-gray-700">
                {new Date(goal.endDate).toLocaleDateString("en-GB", {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                })}
              </Text>
            </Text>
          ) : (
            <Text className="text-[11px] text-gray-400 mb-2.5">No deadline</Text>
          )}

          <View className="h-3.5 rounded-full bg-gray-100 overflow-hidden flex-row border border-gray-100">
            {memberSlices.map((m, idx) => {
              const w = (m.amount / barDenom) * 100;
              if (w <= 0) return null;
              return (
                <Pressable
                  key={m.key}
                  onPress={() =>
                    setSelectedSlice((k) => (k === m.key ? null : m.key))
                  }
                  style={{
                    width: `${Math.max(w, 1.2)}%`,
                    backgroundColor: m.color,
                    minWidth: 4,
                    borderTopLeftRadius: idx === 0 ? 999 : 0,
                    borderBottomLeftRadius: idx === 0 ? 999 : 0,
                  }}
                  className="h-full"
                />
              );
            })}
          </View>

          {activeSlice ? (
            <View className="mt-2 flex-row items-center gap-2 rounded-xl bg-gray-900 px-3 py-2">
              <View
                className="h-2.5 w-2.5 rounded-full border border-white/30"
                style={{ backgroundColor: activeSlice.color }}
              />
              <Text
                className="text-[12px] font-bold text-white flex-1"
                numberOfLines={1}
              >
                {activeSlice.name}
              </Text>
              <View className="items-end shrink-0">
                <Text className="text-[12px] font-bold text-white">
                  {formatBalance(activeSlice.amount)}
                </Text>
                {showUsdcPeek ? (
                  <Text className="text-[10px] text-white/55">
                    ≈ {formatUsdc(activeSlice.amount)}
                  </Text>
                ) : null}
              </View>
              <TouchableOpacity onPress={() => setSelectedSlice(null)}>
                <X size={14} color="rgba(255,255,255,0.6)" />
              </TouchableOpacity>
            </View>
          ) : hasContributions ? (
            <Text className="text-[10px] text-gray-400 mt-1.5 text-center">
              Tap a color to see who contributed
            </Text>
          ) : (
            <Text className="text-[10px] text-gray-400 mt-1.5 text-center">
              No contributions yet — deposit or share the pay link
            </Text>
          )}
        </View>

        <View className="flex-row gap-2 mb-1">
          <TouchableOpacity
            onPress={() => setDepositOpen(true)}
            className="flex-1 flex-row items-center justify-center gap-1.5 bg-white border border-downy-600 py-3 rounded-xl"
          >
            <ArrowUpCircle size={16} color="#0f766e" />
            <Text className="text-downy-700 text-[13px] font-bold">Deposit</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setWithdrawOpen(true)}
            disabled={!isCreator || balance <= 0}
            className={`flex-1 flex-row items-center justify-center gap-1.5 bg-white border border-gray-200 py-3 rounded-xl ${
              !isCreator || balance <= 0 ? "opacity-40" : ""
            }`}
          >
            <ArrowDownCircle size={16} color="#1f2937" />
            <Text className="text-gray-800 text-[13px] font-bold">Withdraw</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          onPress={() => void copyLink()}
          className="flex-row items-center justify-center gap-2 py-2 mb-2.5"
        >
          <Link2 size={14} color="#0f766e" />
          <Text className="text-[12px] font-semibold text-downy-700">
            Copy pay link
            <Text className="font-normal text-gray-400">
              {" "}
              · anyone can contribute
            </Text>
          </Text>
        </TouchableOpacity>

        {/* Put your savings to work */}
        <View className="bg-white rounded-2xl border border-downy-100 px-4 py-3 mb-2.5 shadow-sm">
          <View className="flex-row items-center justify-between gap-3">
            <View className="flex-row items-start gap-2.5 flex-1 min-w-0">
              <View
                className={`mt-0.5 h-8 w-8 rounded-xl items-center justify-center ${
                  yieldOn ? "bg-emerald-50" : "bg-gray-50"
                }`}
              >
                <Zap size={15} color={yieldOn ? "#059669" : "#9ca3af"} />
              </View>
              <View className="flex-1 min-w-0">
                <Text className="text-[13px] font-bold text-gray-900">
                  Put your savings to work
                </Text>
                <Text className="text-[11px] text-gray-500 mt-0.5">
                  {yieldOn ? "Earning on Moonwell" : "Earn yield while you save"}
                  {supplyApy != null ? (
                    <Text className="text-downy-600 font-bold">
                      {" "}
                      · {supplyApy.toFixed(2)}% APY
                    </Text>
                  ) : null}
                </Text>
              </View>
            </View>
            <TouchableOpacity
              onPress={onYieldSwitch}
              disabled={!isCreator || yieldBusy}
              className={`relative h-7 w-12 rounded-full ${
                yieldOn ? "bg-emerald-500" : "bg-gray-200"
              } ${!isCreator ? "opacity-50" : ""}`}
            >
              <View
                className={`absolute top-0.5 h-6 w-6 rounded-full bg-white shadow ${
                  yieldOn ? "right-0.5" : "left-0.5"
                }`}
              />
            </TouchableOpacity>
          </View>

          {yieldOn ? (
            <View className="mt-2.5 flex-row gap-2">
              <View className="flex-1 rounded-lg bg-emerald-50 px-2.5 py-2 border border-emerald-100">
                <Text className="text-[9px] font-semibold text-gray-400 uppercase">
                  In Moonwell
                </Text>
                <Text className="text-[13px] font-extrabold text-gray-900 mt-0.5">
                  {formatBalance(inMw)}
                </Text>
                {showUsdcPeek ? (
                  <Text className="text-[10px] text-gray-400 mt-0.5">
                    ≈ {formatUsdc(inMw)}
                  </Text>
                ) : null}
              </View>
              <View className="flex-1 rounded-lg bg-emerald-50 px-2.5 py-2 border border-emerald-100">
                <Text className="text-[9px] font-semibold text-gray-400 uppercase">
                  Yield earned
                </Text>
                <Text className="text-[13px] font-extrabold text-emerald-600 mt-0.5">
                  +{formatBalance(yieldEarned)}
                </Text>
                {showUsdcPeek ? (
                  <Text className="text-[10px] text-gray-400 mt-0.5">
                    ≈ {formatUsdc(yieldEarned)}
                  </Text>
                ) : null}
              </View>
            </View>
          ) : null}
        </View>
      </View>

      {/* Tabs */}
      <View className="px-4 pt-1 pb-1">
        <View className="flex-row rounded-xl bg-white border border-gray-100 p-0.5 shadow-sm">
          {(
            [
              { id: "members" as const, label: "Members" },
              { id: "history" as const, label: "History" },
            ] as const
          ).map((t) => (
            <TouchableOpacity
              key={t.id}
              onPress={() => setTab(t.id)}
              className={`flex-1 py-2 rounded-[10px] items-center ${
                tab === t.id ? "bg-downy-600" : ""
              }`}
            >
              <Text
                className={`text-[12px] font-bold ${
                  tab === t.id ? "text-white" : "text-gray-500"
                }`}
              >
                {t.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Scrollable tab body */}
      <ScrollView
        className="flex-1 px-4"
        contentContainerStyle={{ paddingBottom: insets.bottom + 24, paddingTop: 8 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              void load({ silent: true });
            }}
            tintColor="#059669"
          />
        }
      >
        {tab === "members" ? (
          <View className="bg-white rounded-2xl border border-downy-100 px-4 py-3.5 shadow-sm">
            <View className="flex-row items-center justify-between mb-1">
              <View>
                <Text className="text-[13px] font-bold text-gray-900">
                  Contributors
                </Text>
                <Text className="text-[11px] text-gray-500">
                  Colors match the balance bar
                </Text>
              </View>
              {isCreator && canInviteMembers ? (
                <TouchableOpacity
                  onPress={() => void shareInvite()}
                  className="h-8 px-2.5 rounded-lg bg-downy-50 flex-row items-center gap-1"
                >
                  <UserPlus size={13} color="#0f766e" />
                  <Text className="text-[11px] font-bold text-downy-700">
                    Invite
                  </Text>
                </TouchableOpacity>
              ) : null}
            </View>

            {memberSlices.map((m) => {
              const pct = barDenom > 0 ? (m.amount / barDenom) * 100 : 0;
              const roleLabel =
                m.role === "guest"
                  ? "Guest"
                  : m.role === "contributor"
                    ? "Contributor"
                    : "Member";
              return (
                <View
                  key={m.key}
                  className="flex-row items-center gap-3 py-3 border-b border-gray-50"
                >
                  <View
                    className="h-2.5 w-2.5 rounded-full"
                    style={{ backgroundColor: m.color }}
                  />
                  <ContributorAvatar name={m.name} imageUrl={m.avatar} />
                  <View className="flex-1 min-w-0">
                    <Text
                      className="text-[13px] font-bold text-gray-900"
                      numberOfLines={1}
                    >
                      {m.name}
                    </Text>
                    <Text className="text-[10px] text-gray-400">{roleLabel}</Text>
                  </View>
                  <View className="items-end">
                    <Text className="text-[13px] font-extrabold text-gray-900">
                      {formatBalance(m.amount)}
                    </Text>
                    {showUsdcPeek ? (
                      <Text className="text-[10px] text-gray-400">
                        ≈ {formatUsdc(m.amount)}
                      </Text>
                    ) : null}
                    <Text className="text-[10px] text-gray-400">
                      {pct.toFixed(0)}%
                    </Text>
                  </View>
                </View>
              );
            })}
          </View>
        ) : (
          <View className="bg-white rounded-2xl border border-downy-100 px-4 py-3.5 shadow-sm">
            <Text className="text-[13px] font-bold text-gray-900 mb-2">
              History
            </Text>
            {history.length === 0 ? (
              <Text className="text-[12px] text-gray-500 py-4 text-center">
                No activity yet. Deposit or share the pay link to get started.
              </Text>
            ) : (
              history.map((item) => (
                <View
                  key={item.id}
                  className="flex-row items-center gap-3 py-3 border-b border-gray-50"
                >
                  <View
                    className={`h-9 w-9 rounded-full items-center justify-center ${
                      item.kind === "in" ? "bg-emerald-50" : "bg-amber-50"
                    }`}
                  >
                    {item.kind === "in" ? (
                      <ArrowUpCircle size={16} color="#059669" />
                    ) : (
                      <ArrowDownCircle size={16} color="#d97706" />
                    )}
                  </View>
                  <View className="flex-1 min-w-0">
                    <Text
                      className="text-[13px] font-bold text-gray-900"
                      numberOfLines={1}
                    >
                      {item.label}
                    </Text>
                    <Text className="text-[10px] text-gray-400">
                      {relativeDay(item.date)} ·{" "}
                      {item.date.toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </Text>
                  </View>
                  <View className="items-end">
                    <Text
                      className={`text-[13px] font-extrabold ${
                        item.kind === "in"
                          ? "text-emerald-600"
                          : "text-amber-600"
                      }`}
                    >
                      {item.kind === "in" ? "+" : "−"}
                      {formatBalance(item.amount)}
                    </Text>
                    {showUsdcPeek ? (
                      <Text className="text-[10px] text-gray-400">
                        ≈ {formatUsdc(item.amount)}
                      </Text>
                    ) : null}
                    {item.txHash ? (
                      <TouchableOpacity
                        onPress={() =>
                          Linking.openURL(
                            `https://basescan.org/tx/${item.txHash}`
                          )
                        }
                        className="flex-row items-center gap-0.5 mt-0.5"
                      >
                        <Text className="text-[10px] text-gray-400 font-medium">
                          Tx
                        </Text>
                        <ExternalLink size={9} color="#9ca3af" />
                      </TouchableOpacity>
                    ) : null}
                  </View>
                </View>
              ))
            )}
          </View>
        )}

        {goal.createdAt || goal.creator ? (
          <Text className="text-center text-[11px] text-gray-400 pb-2 pt-3">
            Created by{" "}
            {user?.id != null && Number(goal.creatorId) === Number(user.id)
              ? "You"
              : goal.creator?.userName
                ? `@${goal.creator.userName}`
                : "someone"}
            {goal.createdAt
              ? ` · ${formatGoalCreatedAt(goal.createdAt)}`
              : ""}
          </Text>
        ) : null}
      </ScrollView>

      {/* Yield confirm modal — matches web */}
      <Modal
        visible={yieldInfoOpen}
        transparent
        animationType="slide"
        onRequestClose={() => !yieldBusy && setYieldInfoOpen(false)}
      >
        <View className="flex-1 justify-end bg-black/55">
          <Pressable
            className="absolute inset-0"
            onPress={() => !yieldBusy && setYieldInfoOpen(false)}
          />
          <View
            className="bg-white rounded-t-3xl max-h-[90%]"
            style={{ paddingBottom: Math.max(insets.bottom, 16) }}
          >
            <View className="px-5 pt-4">
              <View className="w-10 h-1 rounded-full bg-gray-200 self-center mb-4" />
              <View className="flex-row items-center gap-3 mb-2">
                <View className="h-10 w-10 rounded-xl bg-emerald-100 items-center justify-center">
                  <Zap size={18} color="#059669" />
                </View>
                <Text className="text-[18px] font-extrabold text-gray-900 flex-1">
                  Put your savings to work
                </Text>
                <TouchableOpacity
                  disabled={yieldBusy}
                  onPress={() => setYieldInfoOpen(false)}
                  className="h-8 w-8 rounded-full bg-gray-100 items-center justify-center"
                >
                  <X size={16} color="#6b7280" />
                </TouchableOpacity>
              </View>
              <Text className="text-[13px] text-gray-500 mb-3 leading-relaxed">
                Here’s what happens when you turn this on for your goal.
              </Text>
            </View>

            <ScrollView
              className="px-5"
              style={{ maxHeight: 280 }}
              showsVerticalScrollIndicator={false}
            >
              <View className="mb-3 rounded-2xl border border-gray-200 bg-gray-50 px-3.5 py-3 flex-row items-start gap-3">
                <View className="h-8 w-8 rounded-lg bg-white items-center justify-center mt-0.5">
                  <Users size={15} color="#0f766e" />
                </View>
                <View className="flex-1">
                  <Text className="text-[13px] font-bold text-gray-900 mb-0.5">
                    Supplied to Moonwell
                  </Text>
                  <Text className="text-[12px] text-gray-500 leading-relaxed">
                    Your goal funds are supplied to a Moonwell pool (a third-party
                    DeFi pool) to provide liquidity. ChamaPay does not hold this
                    yield pool itself.
                  </Text>
                </View>
              </View>

              <View className="mb-3 rounded-2xl border border-gray-200 bg-gray-50 px-3.5 py-3 flex-row items-start gap-3">
                <View className="h-8 w-8 rounded-lg bg-white items-center justify-center mt-0.5">
                  <TrendingUp size={15} color="#0f766e" />
                </View>
                <View className="flex-1">
                  <Text className="text-[13px] font-bold text-gray-900 mb-0.5">
                    APY is relative
                    {supplyApy != null ? (
                      <Text className="text-downy-600 font-extrabold">
                        {" "}
                        · {supplyApy.toFixed(2)}% now
                      </Text>
                    ) : null}
                  </Text>
                  <Text className="text-[12px] text-gray-500 leading-relaxed">
                    The APY you see can go up or down over time — it depends on
                    borrowing demand in the pool and is not guaranteed.
                  </Text>
                </View>
              </View>

              <View className="mb-2 rounded-2xl border border-amber-200 bg-amber-50 px-3.5 py-3 flex-row items-start gap-3">
                <View className="h-8 w-8 rounded-lg bg-white items-center justify-center mt-0.5">
                  <AlertTriangle size={15} color="#d97706" />
                </View>
                <View className="flex-1">
                  <Text className="text-[13px] font-bold text-amber-900 mb-0.5">
                    Withdrawal risk
                  </Text>
                  <Text className="text-[12px] text-amber-800/80 leading-relaxed">
                    You can withdraw only when the money is not borrowed yet. If
                    the pool’s cash is currently borrowed, your balance is still
                    yours and keeps earning — try again when free cash returns.
                  </Text>
                </View>
              </View>
            </ScrollView>

            <View className="px-5 pt-3 border-t border-gray-100">
              <TouchableOpacity
                disabled={yieldBusy}
                onPress={() => void applyYieldToggle(true)}
                className="w-full py-3.5 rounded-2xl bg-downy-600 items-center"
              >
                {yieldBusy ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <Text className="text-white text-[15px] font-bold">
                    Turn on
                  </Text>
                )}
              </TouchableOpacity>
              <TouchableOpacity
                disabled={yieldBusy}
                onPress={() => setYieldInfoOpen(false)}
                className="w-full py-3 items-center"
              >
                <Text className="text-[13px] font-medium text-gray-500">
                  Not now
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <GoalDepositModal
        visible={depositOpen}
        onClose={() => setDepositOpen(false)}
        onSuccess={() => void load({ silent: true })}
        goalId={goal.id}
        goalName={goal.name}
      />

      {token ? (
        <GoalWithdrawModal
          visible={withdrawOpen}
          onClose={() => setWithdrawOpen(false)}
          onSuccess={() => void load({ silent: true })}
          goalId={goal.id}
          goalName={goal.name}
          balance={balance}
          maxWithdrawable={maxWithdrawable}
          token={token}
        />
      ) : null}
    </View>
  );
}
