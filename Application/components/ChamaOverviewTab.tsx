import { Transaction } from "@/constants/mockData";
import {
  formatTimeRemaining,
  getRelativeTime,
  isDueWithinDays,
} from "@/Utils/helperFunctions";
import { useRouter } from "expo-router";
import {
  CalendarCog,
  Copy,
  CornerUpRight,
  DollarSign,
  ExternalLink,
  LogOut,
  Minus,
  Plus,
  Receipt,
  ReceiptIcon,
} from "lucide-react-native";
import React, { FC, useState } from "react";
import {
  Alert,
  Dimensions,
  Linking,
  Modal,
  Platform,
  ScrollView,
  Text,
  ToastAndroid,
  TouchableOpacity,
  View,
} from "react-native";
import * as Clipboard from "expo-clipboard";
import { useAuth } from "../Contexts/AuthContext";
import { formatDate } from "../Utils/helperFunctions";
import { AddLockedFundsModal, WithdrawModal } from "./ChamaBalanceModals";
import { ResolvedAddress } from "./ResolvedAddress";
import { Card } from "./ui/Card";
import { useFormattedBalance } from "@/hooks/useFormattedBalance";
import LottieLoader from "@/components/LottieLoader";

type Props = {
  myContributions: number;
  contribution: number;
  remainingAmount: number;
  currentCycle: number;
  currentRound: number;
  makePayment: () => void;
  contributionDueDate: Date;
  currentTurnMember: string;
  recentTransactions: Transaction[];
  /** True while recent transactions are still loading */
  transactionsLoading?: boolean;
  nextPayoutAmount: number;
  nextPayoutDate: string;
  leaveChama: () => void;
  userAddress: `0x${string}`;
  chamaStatus: string;
  currency: string;
  isPublic: boolean;
  myCollateral: number;
  chamaPayDate: string;
  collateralAmount: number;
  chamaName: string;
  chamaId: number;
  payoutSchedule: any[];
  onRefresh?: () => void;
  isAdmin: boolean;
  isMidPayout: boolean;
};

const ChamaOverviewTab: FC<Props> = ({
  myContributions,
  contribution,
  remainingAmount,
  currentCycle,
  currentRound,
  makePayment,
  contributionDueDate,
  currentTurnMember,
  recentTransactions,
  transactionsLoading = false,
  nextPayoutAmount,
  nextPayoutDate,
  leaveChama,
  userAddress,
  chamaStatus,
  chamaPayDate,
  currency,
  isPublic,
  collateralAmount,
  myCollateral,
  chamaName,
  chamaId,
  payoutSchedule,
  onRefresh,
  isAdmin,
  isMidPayout,
}) => {
  const router = useRouter();
  const [selectedTransaction, setSelectedTransaction] =
    useState<Transaction | null>(null);
  const [showTransactionModal, setShowTransactionModal] = useState(false);
  const [activeCardIndex, setActiveCardIndex] = useState(0);
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [showAddLockedModal, setShowAddLockedModal] = useState(false);
  const { user } = useAuth();
  const { formatBalance } = useFormattedBalance();

  const handleTransactionPress = (transaction: Transaction) => {
    setSelectedTransaction(transaction);
    setShowTransactionModal(true);
  };

  const handleViewOnChain = () => {
    if (selectedTransaction?.txHash) {
      const url = `https://basescan.org/tx/${selectedTransaction.txHash}`;
      Linking.openURL(url);
    }
  };

  const handleCopyTxHash = async () => {
    if (!selectedTransaction?.txHash) return;
    await Clipboard.setStringAsync(selectedTransaction.txHash);
    if (Platform.OS === "android") {
      ToastAndroid.show("Transaction hash copied", ToastAndroid.SHORT);
    } else {
      Alert.alert("Copied", "Transaction hash copied to clipboard");
    }
  };

  const getTxTypeLabel = (tx: Transaction) => {
    if (tx.type === "payout") return "Cycle & Round Payout";
    if (tx.type === "refund") return "Payout Refunded";
    if (tx.type === "deposit_on_behalf") return tx.description || "Paid on behalf";
    return tx.description || "Transaction";
  };

  const getTxAccent = (type: string) => {
    switch (type) {
      case "payout":
        return { bg: "bg-indigo-100", color: "#4f46e5" };
      case "refund":
        return { bg: "bg-amber-100", color: "#b45309" };
      case "deposit_on_behalf":
        return { bg: "bg-teal-100", color: "#0f766e" };
      case "contribution":
        return { bg: "bg-emerald-100", color: "#059669" };
      default:
        return { bg: "bg-orange-100", color: "#ea580c" };
    }
  };

  return (
    <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
      {/* Contribution Progress with Balance Cards */}

      {/* Contribution Progress with Balance Cards */}
      <Card className="px-6 py-4 mb-4">
        {/* Section Header */}

        {/* Swipeable Balance Cards */}
        <View className="mb-2">
          {isPublic ? (
            <ScrollView
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              onScroll={(e) => {
                const contentOffsetX = e.nativeEvent.contentOffset.x;
                const cardWidth = Dimensions.get("window").width - 96;
                const index = Math.round(contentOffsetX / cardWidth);
                setActiveCardIndex(index);
              }}
              scrollEventThrottle={16}
              snapToInterval={Dimensions.get("window").width - 96}
              decelerationRate="fast"
              snapToAlignment="center"
            >
              {/* Chama Balance Card */}
              <View style={{ width: Dimensions.get("window").width - 96 }}>
                <View className="bg-downy-100/20 rounded-2xl overflow-hidden border border-emerald-100">
                  {/* Card Header */}
                  <View className="px-4 py-3">
                    <View className="flex-row items-center justify-between">
                      <View className="flex-row items-center gap-2">
                        {/* <View className="w-8 h-8 bg-downy-100 rounded-full items-center justify-center">
                          <DollarSign size={16} color="#059669" />
                        </View> */}
                        <View>
                          <Text className="text-sm font-semibold text-gray-800">
                            My Chama Balance
                          </Text>
                          <Text className="text-xs text-gray-600">
                            Available funds
                          </Text>
                        </View>
                      </View>

                      {/* {remainingAmount > 0 && (
                        <View className="bg-orange-100 px-2 py-1 rounded-full">
                          <Text className="text-orange-700 text-xs font-bold">
                            Due
                          </Text>
                        </View>
                      )} */}
                    </View>
                  </View>

                  {/* Balance Amount */}
                  <View className="px-4 py-4">
                      <Text className="text-3xl font-bold text-gray-900">
                        {formatBalance(myContributions || 0)}
                      </Text>
                    </View>

                    {/* Payment Warning — outstanding only within 3 days of due */}
                    {remainingAmount > 0 &&
                    isDueWithinDays(contributionDueDate, 3) ? (
                      <View className="bg-orange-50 border border-orange-200 rounded-lg p-3 mb-3">
                        <View className="flex-row items-start gap-2">
                          <View className="w-4 h-4 bg-orange-100 rounded-full items-center justify-center mt-0.5">
                            <Text className="text-orange-600 text-xs font-bold">!</Text>
                          </View>
                          <View className="flex-1">
                            <Text className="text-orange-800 font-semibold text-xs mb-0.5">
                              Outstanding Payment
                            </Text>
                            <Text className="text-orange-700 text-xs">
                              {formatBalance(remainingAmount || 0)}
                              {" • Due: "}
                              {formatDate(contributionDueDate as unknown as string)}
                            </Text>
                          </View>
                        </View>
                      </View>
                    ) : remainingAmount <= 0 ? (
                      <View className="bg-gray-100 border border-gray-200 rounded-lg p-3 mb-3">
                        <View className="flex-row items-start gap-2">
                          <View className="w-4 h-4 bg-gray-100 items-center justify-center mt-0.5">
                            <Text className="text-emerald-600 text-xs font-bold">✓</Text>
                          </View>
                          <View className="flex-1">
                            <Text className="text-emerald-700 font-semibold text-xs mb-0.5">
                              Up to Date
                            </Text>
                            <Text className="text-emerald-700 text-xs">
                              You have no outstanding payments for this cycle.
                            </Text>
                          </View>
                        </View>
                      </View>
                    ) : null}

                    {/* Action Buttons */}
                    <View className="flex-row gap-2">
                      {remainingAmount > 0 ? (
                        <>
                          <TouchableOpacity
                            onPress={makePayment}
                            className="flex-1 bg-downy-600 py-3 rounded-lg"
                            activeOpacity={0.8}
                          >
                            <Text className="text-white text-sm font-bold text-center">
                              Make Payment
                            </Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            onPress={() => setShowWithdrawModal(true)}
                            className={`flex-1 py-3 rounded-lg border ${myContributions > 0 ? "bg-white border-downy-600 text-downy-600" : "bg-gray-100 border-gray-200 text-gray-400"}`}
                            activeOpacity={0.8}
                            disabled={myContributions <= 0}
                          >
                            <Text className={`text-sm font-bold text-center ${myContributions > 0 ? "text-downy-600" : "text-gray-400"}`}>
                              Withdraw
                            </Text>
                          </TouchableOpacity>
                        </>
                      ) : (
                        <>
                          <TouchableOpacity
                            onPress={makePayment}
                            className="flex-1 bg-emerald-50 border border-emerald-300 py-3 rounded-lg"
                            activeOpacity={0.8}
                          >
                            <Text className="text-emerald-700 text-sm font-bold text-center">
                              Add Funds
                            </Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            onPress={() => setShowWithdrawModal(true)}
                            className={`flex-1 py-3 rounded-lg border ${myContributions > 0 ? "bg-white border-gray-300" : "bg-gray-100 border-gray-200"}`}
                            activeOpacity={0.8}
                            disabled={myContributions <= 0}
                          >
                            <Text className={`text-sm font-bold text-center ${myContributions > 0 ? "text-gray-700" : "text-gray-400"}`}>
                              Withdraw
                            </Text>
                          </TouchableOpacity>
                        </>
                      )}
                    </View>
                </View>
              </View>

              {/* Locked Balance Card - Different Color */}
              {collateralAmount !== undefined && (
                <View style={{ width: Dimensions.get("window").width - 96 }}>
                  <View className="bg-gradient-to-r from-purple-50 to-indigo-50 rounded-2xl overflow-hidden border border-purple-200">
                    {/* Card Header */}
                    <View className="px-4 py-3">
                      <View className="flex-row items-center justify-between">
                        <View className="flex-row items-center gap-2">
                          <View className="w-8 h-8 bg-purple-100 rounded-full items-center justify-center">
                            <View className="w-4 h-4 bg-purple-500 rounded-full" />
                          </View>
                          <View>
                            <Text className="text-sm font-semibold text-gray-900">
                              My Locked Balance
                            </Text>
                            <Text className="text-xs text-gray-600">
                              Secured collateral
                            </Text>
                          </View>
                        </View>

                        <View className="bg-purple-100 px-2 py-1 rounded-full">
                          <Text className="text-purple-700 text-xs font-bold">
                            🔒 Locked
                          </Text>
                        </View>
                      </View>
                    </View>

                    {/* Balance Amount */}
                    <View className="px-4 py-4">
                      <View className="mb-4">
                        <Text className="text-3xl font-bold text-gray-900">
                          {formatBalance(myCollateral || 0)}
                        </Text>
                      </View>

                      {/* Collateral Info */}
                      <View className="bg-purple-100 border border-purple-200 rounded-lg p-3 mb-3">
                        <View className="flex-row items-start gap-2">
                          <Text className="text-purple-600 text-base">💡</Text>
                          <View className="flex-1">
                            <Text className="text-purple-800 font-semibold text-xs mb-0.5">
                              Required Collateral
                            </Text>
                            <Text className="text-purple-700 text-xs">
                              {formatBalance(collateralAmount || 0)}
                              {collateralAmount >= (contribution * 10) && (
                                <Text className="text-emerald-600 font-bold">
                                  {" "}✓ Complete
                                </Text>
                              )}
                            </Text>
                          </View>
                        </View>
                      </View>

                      {/* Action Button */}
                      <TouchableOpacity
                        className={`py-3 rounded-lg ${myCollateral >= collateralAmount
                          ? "bg-gray-200"
                          : "bg-purple-600"
                          }`}
                        onPress={() => setShowAddLockedModal(true)}
                        activeOpacity={0.8}
                        disabled={myCollateral >= collateralAmount}
                      >
                        <Text
                          className={`text-sm font-bold text-center ${myCollateral >= collateralAmount
                            ? "text-gray-400"
                            : "text-white"
                            }`}
                        >
                          {myCollateral >= (collateralAmount)
                            ? "Fully Funded"
                            : "Add Collateral"}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              )}
            </ScrollView>
          ) : (
            // Non-public chama - just show balance card
            <View className="bg-downy-100/20 rounded-2xl overflow-hidden border border-emerald-100">
              {/* Same balance card content as above */}
              <View className="px-4 py-3">
                <View className="flex-row items-center justify-between">
                  <View className="flex-row items-center gap-2">
                    <View className="w-8 h-8 bg-downy-100 rounded-full items-center justify-center">
                      <DollarSign size={16} color="#059669" />
                    </View>
                    <View>
                      <Text className="text-sm font-semibold text-gray-800">
                        My Chama Balance
                      </Text>
                      <Text className="text-xs text-gray-600">
                        Available funds
                      </Text>
                    </View>
                  </View>

                  {/* {remainingAmount > 0 && (
                    <View className="bg-orange-100 px-2 py-1 rounded-full">
                      <Text className="text-orange-700 text-xs font-bold">
                        Due
                      </Text>
                    </View>
                  )} */}
                </View>
              </View>

              <View className="px-4 py-4">
                <View className="mb-4">
                  <Text className="text-3xl font-bold text-gray-900">
                    {formatBalance(myContributions || 0)}
                  </Text>
                </View>

                {remainingAmount > 0 &&
                isDueWithinDays(contributionDueDate, 3) ? (
                  <View className="bg-orange-50 border border-orange-200 rounded-lg p-3 mb-3">
                    <View className="flex-row items-start gap-2">
                      <View className="w-4 h-4 bg-orange-100 rounded-full items-center justify-center mt-0.5">
                        <Text className="text-orange-600 text-xs font-bold">!</Text>
                      </View>
                      <View className="flex-1">
                        <Text className="text-orange-800 font-semibold text-xs mb-0.5">
                          Outstanding Payment
                        </Text>
                        <Text className="text-orange-700 text-xs">
                          {formatBalance(remainingAmount || 0)}
                          {" • Due: "}
                          {new Date(contributionDueDate).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                          })}
                        </Text>
                      </View>
                    </View>
                  </View>
                ) : remainingAmount <= 0 ? (
                  <View className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 mb-3">
                    <View className="flex-row items-start gap-2">
                      <View className="w-4 h-4 bg-emerald-100 rounded-full items-center justify-center mt-0.5">
                        <Text className="text-emerald-600 text-xs font-bold">✓</Text>
                      </View>
                      <View className="flex-1">
                        <Text className="text-emerald-800 font-semibold text-xs mb-0.5">
                          Up to Date
                        </Text>
                        <Text className="text-emerald-700 text-xs">
                          You have no outstanding payments for this cycle.
                        </Text>
                      </View>
                    </View>
                  </View>
                ) : null}

                <View className="flex-row gap-2">
                  {remainingAmount > 0 ? (
                    <>
                      <TouchableOpacity
                        onPress={makePayment}
                        className="flex-1 bg-downy-600 py-3 rounded-lg"
                        activeOpacity={0.8}
                      >
                        <Text className="text-white text-sm font-bold text-center">
                          Make Payment
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={() => setShowWithdrawModal(true)}
                        className={`flex-1 py-3 rounded-lg border ${myContributions > 0 ? "bg-white border-gray-300" : "bg-gray-100 border-gray-200"}`}
                        activeOpacity={0.8}
                        disabled={myContributions <= 0}
                      >
                        <Text className={`text-sm font-bold text-center ${myContributions > 0 ? "text-gray-700" : "text-gray-400"}`}>
                          Withdraw
                        </Text>
                      </TouchableOpacity>
                    </>
                  ) : (
                    <>
                      <TouchableOpacity
                        onPress={makePayment}
                        className="flex-1 bg-emerald-50 border border-emerald-300 py-3 rounded-lg"
                        activeOpacity={0.8}
                      >
                        <Text className="text-emerald-700 text-sm font-bold text-center">
                          Add Funds
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={() => setShowWithdrawModal(true)}
                        className={`flex-1 py-3 rounded-lg border ${myContributions > 0 ? "bg-white border-gray-300" : "bg-gray-100 border-gray-200"}`}
                        activeOpacity={0.8}
                        disabled={myContributions <= 0}
                      >
                        <Text className={`text-sm font-bold text-center ${myContributions > 0 ? "text-gray-700" : "text-gray-400"}`}>
                          Withdraw
                        </Text>
                      </TouchableOpacity>
                    </>
                  )}
                </View>
              </View>
            </View>
          )}

          {/* Pagination Dots - Only for public chamas */}
          {isPublic && collateralAmount !== undefined && (
            <View className="flex-row justify-center items-center gap-2 mt-3">
              <View
                className={`h-2 rounded-full transition-all ${activeCardIndex === 0 ? "w-6 bg-downy-600" : "w-2 bg-gray-300"
                  }`}
              />
              <View
                className={`h-2 rounded-full transition-all ${activeCardIndex === 1 ? "w-6 bg-purple-600" : "w-2 bg-gray-300"
                  }`}
              />
            </View>
          )}
        </View>
      </Card>

      {/* Next Payout Info */}
      <Card className="p-6 mb-6">
        <View className="flex-row items-center gap-2 mb-1 ">
          <View className="w-12 h-12  items-center justify-center">
            <CalendarCog size={20} color="#059669" />
          </View>
          <View className="flex-1">
            <Text className="text-lg font-semibold text-gray-900">
              {payoutSchedule.length > 0 ? "Payout Schedule" : "Schedule in"}
            </Text>
            <Text className="text-sm text-gray-600">
              {payoutSchedule.length > 0
                ? `Cycle ${currentCycle} . Round ${currentRound}`
                : `Schedule in: ${formatTimeRemaining(chamaPayDate!)}`}
            </Text>
          </View>
        </View>

        <View className="h-px bg-gray-200 mb-2" />

        {payoutSchedule.length === 0 ? (
          <View className="bg-gradient-to-r from-amber-50 to-orange-50 rounded-xl p-4 border border-amber-200">
            <View className="items-center">
              <View className="items-center mb-2">
                <View className="w-16 h-12 items-center justify-center">
                  <Text className="text-3xl">🎲</Text>
                </View>
                <View className="w-8 h-1 bg-amber-300/40 rounded-full mt-2" />
              </View>
              <Text className="text-lg font-semibold text-amber-800 mb-2">
                Random Selection
              </Text>
              <Text className="text-sm text-amber-700 text-center leading-5">
                The payout schedule will be randomly generated and displayed
                on {new Date(new Date(chamaPayDate!).getTime() - 3 * 24 * 60 * 60 * 1000).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                  hour12: true,
                })}  . All members will be notified when the
                schedule is ready.
              </Text>
            </View>
          </View>
        ) : (
          <View className="bg-gradient-to-r from-emerald-50 to-blue-50 rounded-xl p-4">

            <View className="gap-3">

              <View className="flex-row justify-between items-center">
                <Text className="text-sm font-medium text-gray-600">
                  Recipient
                </Text>
                <Text className="text-base font-semibold text-gray-900">
                  {currentTurnMember}
                </Text>
              </View>
              <View className="flex-row justify-between items-center">
                <Text className="text-sm font-medium text-gray-600">
                  Amount
                </Text>
                <Text className="text-lg font-bold text-emerald-600">
                  {formatBalance(nextPayoutAmount || 0)}
                </Text>
              </View>
              <View className="flex-row justify-between items-center">
                <Text className="text-sm font-medium text-gray-600">
                  Payout date
                </Text>
                <Text className="text-base font-semibold text-gray-900 text-right flex-1 ml-3">
                  {formatDate(nextPayoutDate as unknown as string)}
                </Text>
              </View>
            </View>

          </View>
        )}
      </Card>

      {/* Recent Transactions */}
      <Card className="p-6 mb-6">
        <View className="flex-row items-center justify-between mb-2">
          <Text className="text-lg font-semibold text-gray-900">
            Recent Transactions
          </Text>
          {recentTransactions.length > 0 && (
              <TouchableOpacity
                className="bg-gray-100 px-3 py-1 rounded-full"
                onPress={() => router.push({
                  pathname: "/chama-transactions",
                  params: {
                    transactions: JSON.stringify(recentTransactions),
                    chamaName: chamaName
                  }
                })}
              >
                <Text className="text-xs text-gray-600 font-medium">All</Text>
              </TouchableOpacity>
            )}
        </View>

        <View className="h-px bg-gray-200 mb-4" />

        <View className="gap-3">
          {transactionsLoading ? (
            <LottieLoader
              source="history"
              label="Loading transactions..."
              size={120}
              className="py-4"
            />
          ) : recentTransactions.length > 0 ? (
            recentTransactions.slice(0, 3).map((transaction) => {
              const isRefund = transaction.type === "refund";
              const isMyTransaction =
                !isRefund && transaction.user?.address === userAddress;
              return (
                <TouchableOpacity
                  key={transaction.id}
                  onPress={() => handleTransactionPress(transaction)}
                  className={`flex-row justify-between py-3 px-4 rounded-xl ${
                    isRefund
                      ? "bg-amber-50 border border-amber-200"
                      : isMyTransaction
                        ? "bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200"
                        : "bg-gray-50"
                  }`}
                  activeOpacity={0.7}
                >
                  <View className="flex-1 justify-center mr-4">
                    <Text
                      className={`text-base font-semibold capitalize mb-1 ${
                        transaction.type === "payout"
                          ? "text-indigo-600"
                          : transaction.type === "deposit_on_behalf"
                            ? "text-teal-600"
                            : transaction.type === "refund"
                              ? "text-amber-700"
                              : transaction.type === "contribution"
                                ? "text-gray-900"
                                : "text-orange-600"
                      }`}
                      numberOfLines={1}
                    >
                      {transaction.type === "payout"
                        ? "Cycle & Round Payout"
                        : transaction.type === "refund"
                          ? "Payout Refunded"
                          : transaction.description}
                    </Text>

                    {transaction.type === "payout" ? (
                      <Text className="text-xs text-gray-500" numberOfLines={1}>
                        Received by{" "}
                        <Text className="font-medium text-gray-700">
                          {transaction.user.address === userAddress
                            ? "You"
                            : transaction.user.name || "Member"}
                        </Text>
                      </Text>
                    ) : transaction.type === "refund" ? (
                      <Text className="text-xs text-amber-700/80" numberOfLines={1}>
                        {transaction.description}
                      </Text>
                    ) : (
                      <View className="flex-row items-center">
                        {isMyTransaction ? (
                          <Text className="text-xs font-semibold text-blue-700">You</Text>
                        ) : (
                          <ResolvedAddress
                            address={transaction.user.address}
                            showPrefix={false}
                            textClassName="text-xs font-medium text-gray-700 capitalize"
                            fallback={transaction.user.name}
                          />
                        )}
                      </View>
                    )}
                  </View>
                  <View className="items-end justify-center">
                    {transaction.type === "refund" ? (
                      <Text className="text-xs font-semibold text-amber-700 mb-1">
                        Refunded
                      </Text>
                    ) : (
                      <Text
                        className={`text-sm font-bold flex-row items-center mb-1 ${
                          transaction.type === "contribution"
                            ? "text-emerald-700"
                            : transaction.type === "deposit_on_behalf"
                              ? "text-teal-700"
                              : transaction.type === "payout"
                                ? "text-purple-700"
                                : "text-orange-700"
                        }`}
                      >
                        {transaction.type === "contribution" ||
                        transaction.type === "deposit_on_behalf" ? (
                          <Plus
                            size={12}
                            color={
                              transaction.type === "deposit_on_behalf"
                                ? "#0f766e"
                                : "#059669"
                            }
                            style={{ marginRight: 2 }}
                          />
                        ) : transaction.type === "payout" ? (
                          <CornerUpRight
                            size={12}
                            color={"#7c3aed"}
                            style={{ marginRight: 2 }}
                          />
                        ) : (
                          <Minus
                            size={12}
                            color={"#ea580c"}
                            style={{ marginRight: 2 }}
                          />
                        )}
                        {formatBalance(transaction.amount || 0)}
                      </Text>
                    )}
                    <Text className="text-xs text-gray-400">
                      {getRelativeTime(transaction.date)}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })
          ) : (
            <View className="py-8 items-center">
              <View className="w-16 h-16 bg-gray-100 rounded-full items-center justify-center mb-3">
                <ReceiptIcon size={24} color="#9ca3af" />
              </View>
              <Text className="text-gray-500 font-medium">
                No transactions yet
              </Text>
              <Text className="text-gray-400 text-sm text-center mt-1">
                All chama transactions will appear here
              </Text>
            </View>
          )}
        </View>
      </Card>

      {/* Leave Chama */}
      {!isAdmin && (
        <Card className="p-6 mb-6 bg-red-50 border border-red-200 rounded-xl">
          <View className="flex-row items-center justify-between">
            <View className="flex-1">
              <Text className="text-lg font-semibold text-gray-900 mb-1">
                Leave Chama
              </Text>
              <Text className="text-sm text-gray-600">
                You can only leave once the current cycle is over. This action
                cannot be undone.
              </Text>
            </View>
            <TouchableOpacity
              onPress={leaveChama}
              disabled={isMidPayout}
              className={`border p-3 rounded-xl ${isMidPayout ? "bg-gray-200 border-gray-300" : "bg-red-50 border-red-200"}`}
              activeOpacity={0.8}
            >
              <LogOut size={20} color={isMidPayout ? "#9ca3af" : "#dc2626"} />
            </TouchableOpacity>
          </View>
          {isMidPayout && (
            <View className="mt-3 p-2 bg-amber-50 rounded-lg">
              <Text className="text-xs text-amber-700">
                ⚠️ You cannot leave because the current cycle is mid-payout.
              </Text>
            </View>
          )}
        </Card>
      )}

      <View className="h-20" />

      {/* Action Modals */}
      <WithdrawModal
        visible={showWithdrawModal}
        onClose={() => setShowWithdrawModal(false)}
        onSuccess={() => {
          setShowWithdrawModal(false);
          onRefresh?.();
        }}
        chamaId={chamaId}
        chamaName={chamaName}
        balance={myContributions}
        currency={currency}
      />

      <AddLockedFundsModal
        visible={showAddLockedModal}
        onClose={() => setShowAddLockedModal(false)}
        onSuccess={() => {
          setShowAddLockedModal(false);
          onRefresh?.();
        }}
        chamaId={chamaId}
        chamaName={chamaName}
        currency={currency}
      />

      {/* Transaction Details Modal */}
      <Modal
        visible={showTransactionModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowTransactionModal(false)}
      >
        <View className="flex-1 justify-end bg-black/55">
          <View className="bg-white rounded-t-3xl overflow-hidden max-h-[85%]">
            <View className="items-center pt-3 pb-1 bg-emerald-50">
              <View className="w-10 h-1 rounded-full bg-emerald-200" />
            </View>

            {selectedTransaction && (
              <>
                <View
                  className="bg-emerald-50 px-5 pb-5 border-b border-emerald-100"
                  style={{ paddingTop: 12 }}
                >
                  <View className="items-center">
                    <View
                      className={`w-14 h-14 rounded-full items-center justify-center mb-3 ${
                        getTxAccent(selectedTransaction.type).bg
                      }`}
                    >
                      <Receipt
                        size={26}
                        color={getTxAccent(selectedTransaction.type).color}
                      />
                    </View>
                    <Text className="text-lg font-bold text-gray-900 text-center">
                      {getTxTypeLabel(selectedTransaction)}
                    </Text>
                    {selectedTransaction.type !== "refund" ? (
                      <Text className="text-2xl font-extrabold text-downy-700 mt-1">
                        {formatBalance(selectedTransaction.amount || 0)}
                      </Text>
                    ) : (
                      <View className="mt-2 px-3 py-1 rounded-full bg-amber-100">
                        <Text className="text-xs font-semibold text-amber-800">
                          Refunded
                        </Text>
                      </View>
                    )}
                    <View className="mt-2 px-2.5 py-1 rounded-full bg-white border border-emerald-100">
                      <Text className="text-[11px] font-semibold text-emerald-700 capitalize">
                        {selectedTransaction.status || "completed"}
                      </Text>
                    </View>
                  </View>
                </View>

                <ScrollView
                  className="px-5 pt-4"
                  showsVerticalScrollIndicator={false}
                  bounces={false}
                >
                  <View className="gap-3 mb-4">
                    <View className="bg-gray-50 border border-gray-100 rounded-2xl px-4 py-3.5">
                      <Text className="text-xs font-semibold text-gray-500 mb-1">
                        {selectedTransaction.type === "refund" ? "Scope" : "From"}
                      </Text>
                      {selectedTransaction.type === "refund" ? (
                        <Text className="text-base font-semibold text-amber-800">
                          Returned to all contributing members
                        </Text>
                      ) : selectedTransaction.user.address === userAddress ? (
                        <Text className="text-base font-semibold text-downy-700">
                          You
                        </Text>
                      ) : (
                        <ResolvedAddress
                          address={selectedTransaction.user.address}
                          showPrefix={false}
                          textClassName="text-base font-semibold text-gray-900"
                          fallback={selectedTransaction.user.name}
                        />
                      )}
                    </View>

                    <View className="bg-gray-50 border border-gray-100 rounded-2xl px-4 py-3.5">
                      <Text className="text-xs font-semibold text-gray-500 mb-1">
                        Date & Time
                      </Text>
                      <Text className="text-base font-semibold text-gray-900">
                        {new Date(selectedTransaction.date).toLocaleDateString(
                          "en-US",
                          {
                            weekday: "short",
                            year: "numeric",
                            month: "short",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          }
                        )}
                      </Text>
                    </View>

                    {selectedTransaction.txHash ? (
                      <View className="bg-gray-50 border border-gray-100 rounded-2xl px-4 py-3.5">
                        <Text className="text-xs font-semibold text-gray-500 mb-2">
                          Transaction Hash
                        </Text>
                        <View className="flex-row items-center">
                          <Text
                            className="flex-1 text-xs text-gray-700 font-mono mr-2"
                            numberOfLines={1}
                            ellipsizeMode="middle"
                          >
                            {selectedTransaction.txHash}
                          </Text>
                          <TouchableOpacity
                            onPress={handleCopyTxHash}
                            className="w-9 h-9 rounded-xl bg-emerald-100 items-center justify-center"
                            activeOpacity={0.7}
                          >
                            <Copy size={16} color="#059669" />
                          </TouchableOpacity>
                        </View>
                      </View>
                    ) : null}
                  </View>

                  <View className="gap-3 pb-8">
                    {selectedTransaction.txHash ? (
                      <TouchableOpacity
                        onPress={handleViewOnChain}
                        className="bg-downy-600 py-3.5 rounded-2xl flex-row items-center justify-center gap-2"
                        activeOpacity={0.8}
                      >
                        <ExternalLink size={18} color="white" />
                        <Text className="text-white font-semibold text-base">
                          View on Basescan
                        </Text>
                      </TouchableOpacity>
                    ) : null}

                    <TouchableOpacity
                      onPress={() => setShowTransactionModal(false)}
                      className="bg-gray-100 py-3.5 rounded-2xl border border-gray-200"
                      activeOpacity={0.8}
                    >
                      <Text className="text-gray-700 font-semibold text-base text-center">
                        Close
                      </Text>
                    </TouchableOpacity>
                  </View>
                </ScrollView>
              </>
            )}
          </View>
        </View>
      </Modal>
    </ScrollView >
  );
};

export default ChamaOverviewTab;
