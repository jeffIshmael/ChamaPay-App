import { Card } from "@/components/ui/Card";
import { Member, PayoutScheduleItem } from "@/constants/mockData";
import { useAuth } from "@/Contexts/AuthContext";
import { useCurrencyStore } from "@/store/useCurrencyStore";
import { useExchangeRateStore } from "@/store/useExchangeRateStore";
import { setPayoutOrderApi } from "@/lib/chamaService";
import { CheckCircle, Clock, User } from "lucide-react-native";
import React, { FC, useMemo, useState } from "react";
import {
  Image,
  ScrollView,
  Text,
  View,
  Modal,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  ToastAndroid,
  Pressable,
  StyleSheet,
} from "react-native";

type Props = {
  chamaId?: number;
  payoutSchedule: PayoutScheduleItem[];
  currentUserAddress?: string;
  chamaStatus: string;
  members: Member[];
  contributionAmount: number;
  totalPayout: number;
  currentCycle?: number;
  currentRound?: number;
  onRefresh?: () => void;
};

type PayoutStatus = "completed" | "next" | "upcoming" | "pending";

const TEAL = "#1c8584";
const TEAL_LIGHT = "#f0faf9";
const TEAL_BORDER = "rgba(28,133,132,0.25)";

const getStatusColor = (status: PayoutStatus) => {
  switch (status) {
    case "completed": return "bg-green-100 text-green-700";
    case "next":      return "bg-amber-100 text-amber-700";
    case "upcoming":  return "bg-blue-100 text-blue-700";
    default:          return "bg-gray-100 text-gray-700";
  }
};
const getStatusBadgeColor = (status: PayoutStatus) => {
  switch (status) {
    case "completed": return "bg-green-200";
    case "next":      return "bg-amber-200";
    case "upcoming":  return "bg-blue-200";
    default:          return "bg-gray-200";
  }
};
const getStatusLabel = (status: PayoutStatus) => {
  switch (status) {
    case "completed": return "Paid";
    case "next":      return "Next";
    case "upcoming":  return "Upcoming";
    default:          return "Pending";
  }
};

const ScheduleTab: FC<Props> = ({
  chamaId,
  payoutSchedule,
  currentUserAddress,
  chamaStatus,
  members,
  contributionAmount,
  totalPayout,
  currentCycle,
  currentRound,
  onRefresh,
}) => {
  const { user, token } = useAuth();
  const { currency } = useCurrencyStore();
  const { rates } = useExchangeRateStore();
  const kesRate = rates["KES"]?.rate || 0;

  const [orderedMembers, setOrderedMembers] = useState<string[]>([]);
  const [isSavingOrder, setIsSavingOrder] = useState(false);
  const [showOrderModal, setShowOrderModal] = useState(false);

  const isAdmin = useMemo(() => {
    if (!user || !members) return false;
    return members.find((m) => m.id === user.id)?.role === "Admin";
  }, [user, members]);

  const getMemberByAddress = (address: string): Member | undefined =>
    members.find((m) => m.smartAddress?.toLowerCase() === address.toLowerCase());

  const truncateAddress = (address: string) => {
    if (!address) return "";
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const getPayoutStatus = (payout: PayoutScheduleItem, index: number): PayoutStatus => {
    if (payout.paid) return "completed";
    const now = new Date();
    const payoutDate = new Date(payout.payDate);
    const firstUnpaidIndex = payoutSchedule.findIndex((p) => !p.paid);
    if (firstUnpaidIndex === index) return "next";
    if (payoutDate > now) return "upcoming";
    return "pending";
  };

  const estimatedPayoutAmount = useMemo(() => {
    if (contributionAmount && members.length > 0) return contributionAmount * members.length;
    return totalPayout || 0;
  }, [contributionAmount, members.length, totalPayout]);

  const isCurrentUserPayout = (address: string) => {
    if (!currentUserAddress) return false;
    return address.toLowerCase() === currentUserAddress.toLowerCase();
  };

  // FIX: guard undefined address before any array operation
  const handleToggleMember = (address: string | undefined) => {
    if (!address) return;
    setOrderedMembers((prev) =>
      prev.includes(address) ? prev.filter((a) => a !== address) : [...prev, address]
    );
  };

  const handleCloseModal = () => {
    setShowOrderModal(false);
    setOrderedMembers([]);
  };

  const handleSavePayoutOrder = async () => {
    if (!chamaId || !token) {
      Alert.alert("Error", "Missing required session parameters.");
      return;
    }
    if (orderedMembers.length !== members.length) {
      Alert.alert("Incomplete", "Please assign a position to every member first.");
      return;
    }
    setIsSavingOrder(true);
    try {
      const response = await setPayoutOrderApi(chamaId, orderedMembers, token);
      if (response.success) {
        ToastAndroid.show("Payout order saved!", ToastAndroid.LONG);
        setOrderedMembers([]);
        setShowOrderModal(false);
        onRefresh?.();
      } else {
        Alert.alert("Failed", response.error || "Could not set payout order.");
      }
    } catch (err) {
      console.error(err);
      Alert.alert("Error", "An unexpected error occurred.");
    } finally {
      setIsSavingOrder(false);
    }
  };

  const progressRatio = members.length > 0 ? orderedMembers.length / members.length : 0;
  const allSelected = orderedMembers.length === members.length;

  // ─── Empty / not started ──────────────────────────────────────────────────

  if (chamaStatus === "not started" || !payoutSchedule || payoutSchedule.length === 0) {
    if (isAdmin) {
      return (
        <ScrollView style={s.flex1} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          <View style={s.emptyState}>
            <Image
              source={require("../assets/images/no-schedule.png")}
              style={s.emptyImage}
              resizeMode="contain"
            />
            <Text style={s.emptyTitle}>Payout Schedule Not Set</Text>
            <Text style={s.emptySubtitle}>
              As the Admin, define the turn sequence — who gets paid first, second, and so on.
            </Text>

            <TouchableOpacity
              onPress={() => setShowOrderModal(true)}
              style={s.primaryButton}
              activeOpacity={0.85}
            >
              <Text style={s.primaryButtonText}>Set Payout Order</Text>
            </TouchableOpacity>
          </View>

          {/* ── Modal ───────────────────────────────────────────────────── */}
          <Modal
            visible={showOrderModal}
            transparent
            animationType="slide"
            onRequestClose={handleCloseModal}
          >
            <TouchableOpacity
              style={s.backdrop}
              activeOpacity={1}
              onPress={handleCloseModal}
            >
              {/* Inner sheet — TouchableOpacity won't bubble up */}
              <TouchableOpacity activeOpacity={1} style={s.sheet}>

                {/* Handle + header */}
                <View style={s.sheetHeader}>
                  <View style={s.sheetHandle} />
                  <Text style={s.sheetTitle}>Set Payout Order</Text>
                  <Text style={s.sheetSubtitle}>
                    Tap members in the order they should receive payouts.
                    First tap = first payout.
                  </Text>
                </View>

                {/* Member list */}
                <ScrollView
                  showsVerticalScrollIndicator={false}
                  keyboardShouldPersistTaps="handled"
                  style={{ marginBottom: 14 }}
                >
                  {members.map((member) => {
                    const hasAddress = !!member.smartAddress;
                    const selectIndex = hasAddress ? orderedMembers.indexOf(member.smartAddress!) : -1;
                    const isSelected = selectIndex !== -1;

                    return (
                      <TouchableOpacity
                        key={member.id}
                        onPress={() => handleToggleMember(member.smartAddress)}
                        disabled={!hasAddress}
                        activeOpacity={0.75}
                        style={[s.memberRow, isSelected && s.memberRowSelected, !hasAddress && s.memberRowDisabled]}
                      >
                        {/* Left: avatar + name */}
                        <View style={s.memberLeft}>
                          <View style={[s.avatarWrap, isSelected && s.avatarWrapSelected]}>
                            {member.profilePicture ? (
                              <Image source={{ uri: member.profilePicture }} style={s.avatarImg} />
                            ) : (
                              <User size={20} color={isSelected ? TEAL : "#9ca3af"} />
                            )}
                          </View>
                          <View style={s.memberInfo}>
                            <Text style={s.memberName}>
                              {member.name}
                              {member.role === "Admin" && (
                                <Text style={s.adminLabel}> · Admin</Text>
                              )}
                            </Text>
                            <Text style={s.memberAddress}>
                              {hasAddress ? truncateAddress(member.smartAddress!) : "No address"}
                            </Text>
                          </View>
                        </View>

                        {/* Right: order badge */}
                        {isSelected ? (
                          <View style={s.badgeSelected}>
                            <Text style={s.badgeText}>{selectIndex + 1}</Text>
                          </View>
                        ) : (
                          <View style={s.badgeEmpty} />
                        )}
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>

                {/* Progress bar */}
                <View style={s.progressWrap}>
                  <Text style={s.progressLabel}>ORDER PROGRESS</Text>
                  <View style={s.progressRight}>
                    <View style={s.progressTrack}>
                      <View style={[s.progressFill, { width: `${progressRatio * 100}%` as any }]} />
                    </View>
                    <Text style={s.progressCount}>
                      {orderedMembers.length}/{members.length}
                    </Text>
                  </View>
                </View>

                {/* Buttons */}
                <View style={s.buttonRow}>
                  {/* Reset — ghost/outline */}
                  <TouchableOpacity
                    onPress={() => setOrderedMembers([])}
                    disabled={orderedMembers.length === 0 || isSavingOrder}
                    activeOpacity={0.7}
                    style={[
                      s.btnReset,
                      (orderedMembers.length === 0 || isSavingOrder) && s.btnDisabled,
                    ]}
                  >
                    <Text style={[
                      s.btnResetText,
                      (orderedMembers.length === 0 || isSavingOrder) && s.btnTextDisabled,
                    ]}>
                      Reset
                    </Text>
                  </TouchableOpacity>

                  {/* Confirm — filled teal */}
                  <TouchableOpacity
                    onPress={handleSavePayoutOrder}
                    disabled={!allSelected || isSavingOrder}
                    activeOpacity={0.85}
                    style={[s.btnConfirm, (!allSelected || isSavingOrder) && s.btnConfirmDisabled]}
                  >
                    {isSavingOrder && (
                      <ActivityIndicator size="small" color="white" style={{ marginRight: 8 }} />
                    )}
                    <Text style={[s.btnConfirmText, (!allSelected || isSavingOrder) && s.btnConfirmTextDisabled]}>
                      {isSavingOrder ? "Saving…" : "Confirm Order"}
                    </Text>
                  </TouchableOpacity>
                </View>

              </TouchableOpacity>
            </TouchableOpacity>
          </Modal>
        </ScrollView>
      );
    }

    // Member empty state
    return (
      <ScrollView style={s.flex1} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <View style={s.emptyState}>
          <Image
            source={require("../assets/images/no-schedule.png")}
            style={s.emptyImage}
            resizeMode="contain"
          />
          <Text style={s.emptyTitle}>No Payout Schedule</Text>
          <Text style={s.emptySubtitle}>
            This chama hasn't defined its rotation order yet. Once configured, payouts will follow the schedule.
          </Text>
          <View style={s.infoBox}>
            <Text style={s.infoText}>
              You'll be notified as soon as the Admin schedules the payout sequence.
            </Text>
          </View>
        </View>
        <View style={{ height: 80 }} />
      </ScrollView>
    );
  }

  // ─── Active schedule list ─────────────────────────────────────────────────

  return (
    <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
      <View className="gap-3">
        {(currentCycle !== undefined || currentRound !== undefined) && (
          <Card className="w-fit mx-auto">
            <View className="border border-downy-500 w-fit px-4 py-2 rounded-lg">
              <Text className="text-downy-500 font-bold">
                Cycle {currentCycle || 1} • Round {currentRound || 1}
              </Text>
            </View>
          </Card>
        )}

        {payoutSchedule.map((payout, index) => {
          const status = getPayoutStatus(payout, index);
          const member = getMemberByAddress(payout.userAddress);
          const isUserTurn = isCurrentUserPayout(payout.userAddress);

          return (
            <Card
              key={`${payout.userAddress}-${index}`}
              className={`p-4 border ${payout.paid ? "bg-downy-200/10 border-downy-500" : ""}`}
            >
              <View className="flex-row items-center justify-between">
                <View className="flex-row items-center gap-3 flex-1">
                  <View className={`w-8 h-8 rounded-full items-center justify-center ${getStatusColor(status)}`}>
                    {status === "completed" ? (
                      <CheckCircle size={16} color="#059669" />
                    ) : status === "next" ? (
                      <Clock size={16} color="#F59E0B" />
                    ) : (
                      <Text className={`text-sm font-medium ${status === "pending" ? "text-emerald-600" : "text-gray-600"}`}>
                        {index + 1}
                      </Text>
                    )}
                  </View>
                  <View className="flex-1">
                    <Text className={`text-sm font-medium ${member?.name === user?.userName && payout.paid ? "text-downy-600" : "text-gray-900"}`}>
                      {member?.name === user?.userName
                        ? "# You"
                        : member?.name || truncateAddress(payout.userAddress)}
                    </Text>
                    <Text className="text-gray-600 text-xs">
                      {new Date(payout.payDate).toLocaleString("en-US", {
                        month: "short", day: "numeric", year: "numeric",
                      })}
                    </Text>
                  </View>
                </View>

                <View className="items-end">
                  <Text className={`text-sm font-medium ${payout.paid ? "text-emerald-700" : "text-gray-900"}`}>
                    {estimatedPayoutAmount > 0
                      ? currency === "KES" && kesRate > 0
                        ? `${(estimatedPayoutAmount * kesRate).toFixed(2)} KES`
                        : `${estimatedPayoutAmount.toFixed(3)} USDC`
                      : "—"}
                  </Text>
                  <View className={`px-2 py-1 rounded-full mt-1 ${getStatusBadgeColor(status)}`}>
                    <Text className="text-xs font-medium capitalize">{getStatusLabel(status)}</Text>
                  </View>
                </View>
              </View>

              {isUserTurn && status !== "completed" && (
                <View className="mt-3 p-2 bg-amber-50 rounded-lg">
                  <Text className="text-xs text-amber-700">
                    {status === "next" ? "Your payout is up next." : "Your payout is coming up."}
                  </Text>
                </View>
              )}
            </Card>
          );
        })}
      </View>
      <View className="h-20" />
    </ScrollView>
  );
};

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  flex1: { flex: 1 },

  // Empty states
  emptyState: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 24, paddingVertical: 64 },
  emptyImage: { width: 128, height: 128, marginBottom: 24 },
  emptyTitle: { fontSize: 22, fontWeight: "900", color: "#111827", marginBottom: 8, textAlign: "center", letterSpacing: -0.5 },
  emptySubtitle: { fontSize: 14, color: "#6b7280", textAlign: "center", lineHeight: 22, marginBottom: 24, paddingHorizontal: 8 },
  infoBox: { backgroundColor: "#f3f4f6", paddingHorizontal: 20, paddingVertical: 16, borderRadius: 16, borderWidth: 1, borderColor: "#e5e7eb" },
  infoText: { fontSize: 12, color: "#4b5563", textAlign: "center", fontWeight: "500", lineHeight: 20 },

  // CTA button (admin empty state)
  primaryButton: {
    backgroundColor: TEAL,
    paddingHorizontal: 28,
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
    maxWidth: 280,
    shadowColor: TEAL,
    shadowOpacity: 0.35,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 5,
  },
  primaryButtonText: { color: "white", fontWeight: "800", fontSize: 15 },

  // Modal
  backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.55)", justifyContent: "flex-end" },
  sheet: {
    backgroundColor: "#ffffff",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 36,
    maxHeight: "88%",
  },

  // Sheet header
  sheetHeader: { alignItems: "center", marginBottom: 20 },
  sheetHandle: { width: 36, height: 4, backgroundColor: "#e5e7eb", borderRadius: 2, marginBottom: 16 },
  sheetTitle: { fontSize: 20, fontWeight: "800", color: "#111827", letterSpacing: -0.4 },
  sheetSubtitle: { fontSize: 13, color: "#6b7280", marginTop: 8, textAlign: "center", lineHeight: 20, paddingHorizontal: 8 },

  // Member row — NOTE: must be a plain object, NOT a function, so flexDirection applies reliably
  memberRow: {
    flexDirection: "row",          // ← key fix: static, not in a Pressable function style
    alignItems: "center",
    justifyContent: "space-between",
    padding: 14,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: "#e5e7eb",
    backgroundColor: "#fafafa",
    marginBottom: 10,
  },
  memberRowSelected: {
    borderColor: TEAL,
    backgroundColor: TEAL_LIGHT,
  },
  memberRowDisabled: { opacity: 0.45 },

  // Avatar
  memberLeft: { flexDirection: "row", alignItems: "center", flex: 1 },
  avatarWrap: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: "#f3f4f6",
    alignItems: "center", justifyContent: "center",
    borderWidth: 1, borderColor: "#e5e7eb",
    marginRight: 12,
    overflow: "hidden",
  },
  avatarWrapSelected: { backgroundColor: "#d1f6f1", borderColor: TEAL_BORDER },
  avatarImg: { width: 44, height: 44, borderRadius: 22 },

  // Member text
  memberInfo: { flex: 1 },
  memberName: { fontSize: 14, fontWeight: "700", color: "#111827" },
  adminLabel: { fontSize: 13, fontWeight: "500", color: TEAL },
  memberAddress: { fontSize: 11, color: "#9ca3af", fontFamily: "monospace", marginTop: 2 },

  // Order badge
  badgeSelected: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: TEAL,
    alignItems: "center", justifyContent: "center",
    shadowColor: TEAL, shadowOpacity: 0.4, shadowRadius: 6, shadowOffset: { width: 0, height: 2 },
    elevation: 4,
  },
  badgeText: { color: "white", fontSize: 14, fontWeight: "800" },
  badgeEmpty: {
    width: 36, height: 36, borderRadius: 18,
    borderWidth: 2, borderColor: "#d1d5db",
    backgroundColor: "white",
  },

  // Progress
  progressWrap: {
    backgroundColor: "#f9fafb",
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    marginBottom: 16,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  progressLabel: { fontSize: 10, fontWeight: "700", color: "#9ca3af", letterSpacing: 1.1, textTransform: "uppercase" },
  progressRight: { flexDirection: "row", alignItems: "center", gap: 10 },
  progressTrack: { width: 72, height: 5, backgroundColor: "#e5e7eb", borderRadius: 3, overflow: "hidden" },
  progressFill: { height: "100%", backgroundColor: TEAL, borderRadius: 3 },
  progressCount: { fontSize: 13, fontWeight: "800", color: TEAL },

  // Bottom buttons
  buttonRow: { flexDirection: "row", gap: 10 },

  // Reset (outlined secondary)
  btnReset: {
    flex: 1,
    paddingVertical: 15,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: "#d1d5db",
    backgroundColor: "white",
    alignItems: "center",
    justifyContent: "center",
  },
  btnResetText: { fontWeight: "700", fontSize: 14, color: "#374151" },

  // Confirm (filled teal)
  btnConfirm: {
    flex: 2,
    paddingVertical: 15,
    borderRadius: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: TEAL,
    shadowColor: TEAL,
    shadowOpacity: 0.35,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 5,
  },
  btnConfirmDisabled: {
    backgroundColor: "#e5e7eb",
    shadowOpacity: 0,
    elevation: 0,
  },
  btnConfirmText: { fontWeight: "800", fontSize: 15, color: "white" },
  btnConfirmTextDisabled: { color: "#9ca3af" },

  // Shared disabled state
  btnDisabled: { borderColor: "#f3f4f6", backgroundColor: "#fafafa" },
  btnTextDisabled: { color: "#9ca3af" },
});

export default ScheduleTab;