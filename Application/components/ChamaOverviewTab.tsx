import { Transaction } from "@/constants/mockData";
import { formatTimeRemaining, getRelativeTime } from "@/Utils/helperFunctions";
import { useRouter } from "expo-router";
import {
  CalendarCog,
  CornerUpRight,
  DollarSign,
  ExternalLink,
  LogOut,
  Minus,
  Plus,
  Receipt,
  ReceiptIcon,
  TrendingUp
} from "lucide-react-native";
import React, { FC, useState } from "react";
import { Dimensions, Linking, Modal, ScrollView, Text, TouchableOpacity, View } from "react-native";
import { useAuth } from "../Contexts/AuthContext";
import { formatDate } from "../Utils/helperFunctions";
import { ResolvedAddress } from "./ResolvedAddress";
import { Card } from "./ui/Card";

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
  nextPayoutAmount: number;
  nextPayoutDate: string;
  leaveChama: () => void;
  userAddress: `0x${string}`;
  chamaStatus: "active" | "not started";
  currency: string;
  isPublic: boolean;
  kesRate: number;
  myCollateral: number;
  chamaStartDate: Date;
  collateralAmount: number;
  chamaName: string;
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
  nextPayoutAmount,
  nextPayoutDate,
  leaveChama,
  userAddress,
  chamaStatus,
  chamaStartDate,
  currency,
  isPublic,
  kesRate,
  collateralAmount,
  myCollateral,
  chamaName,
}) => {
  const router = useRouter();
  const [selectedTransaction, setSelectedTransaction] =
    useState<Transaction | null>(null);
  const [showTransactionModal, setShowTransactionModal] = useState(false);
  const [activeCardIndex, setActiveCardIndex] = useState(0);
  const { user } = useAuth();

  const handleTransactionPress = (transaction: Transaction) => {
    setSelectedTransaction(transaction);
    setShowTransactionModal(true);
  };

  const handleViewOnChain = () => {
    if (selectedTransaction?.txHash) {
      // Open blockchain explorer
      const url = `https://celoscan.io/tx/${selectedTransaction.txHash}`;
      Linking.openURL(url);
      console.log("View transaction on chain:", selectedTransaction.txHash);
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
                    <View className="mb-4">
                      <Text className="text-3xl font-bold text-gray-900">
                        {kesRate > 0
                          ? `${(myContributions * kesRate).toFixed(2)} KES`
                          : `${myContributions > 0 ? myContributions.toFixed(3) : 0} ${currency}`}
                      </Text>
                      {kesRate > 0 && (
                        <Text className="text-xs text-gray-500 mt-1">
                          ≈ {myContributions > 0 ? myContributions.toFixed(3) : 0} {currency}
                        </Text>
                      )}
                    </View>

                    {/* Payment Warning */}
                    {remainingAmount > 0 ? (
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
                              {kesRate > 0
                                ? `${(remainingAmount * kesRate).toFixed(2)} KES`
                                : `${remainingAmount.toFixed(3)} ${currency}`}
                              {" • Due: "}
                              {formatDate(contributionDueDate as unknown as string)}
                            </Text>
                          </View>
                        </View>
                      </View>
                    ) : (
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
                    )}

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
                            className="flex-1 bg-gray-200 py-3 rounded-lg"
                            activeOpacity={0.8}
                            disabled
                          >
                            <Text className="text-gray-400 text-sm font-bold text-center">
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
                            className="flex-1 bg-downy-600 py-3 rounded-lg"
                            activeOpacity={0.8}
                          >
                            <Text className="text-white text-sm font-bold text-center">
                              Withdraw
                            </Text>
                          </TouchableOpacity>
                        </>
                      )}
                    </View>
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
                          {kesRate > 0 && user?.location === "KE"
                            ? `${(myCollateral * kesRate).toFixed(2)} KES`
                            : `${myCollateral > 0 ? myCollateral.toFixed(3) : 0} ${currency}`}
                        </Text>
                        {kesRate > 0 && user?.location === "KE" && (
                          <Text className="text-xs text-gray-500 mt-1">
                            ≈ {myCollateral > 0 ? myCollateral.toFixed(3) : 0} {currency}
                          </Text>
                        )}
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
                              {kesRate > 0 && user?.location === "KE"
                                ? `${(collateralAmount * kesRate).toFixed(2)} KES`
                                : `${collateralAmount > 0 ? collateralAmount.toFixed(3) : 0} ${currency}`}
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

                  {remainingAmount > 0 && (
                    <View className="bg-orange-100 px-2 py-1 rounded-full">
                      <Text className="text-orange-700 text-xs font-bold">
                        Due
                      </Text>
                    </View>
                  )}
                </View>
              </View>

              <View className="px-4 py-4">
                <View className="mb-4">
                  <Text className="text-3xl font-bold text-gray-900">
                    {kesRate > 0
                      ? `${(myContributions * kesRate).toFixed(2)} KES`
                      : `${myContributions.toFixed(3)} ${currency}`}
                  </Text>
                  {kesRate > 0 && (
                    <Text className="text-xs text-gray-500 mt-1">
                      ≈ {myContributions.toFixed(3)} {currency}
                    </Text>
                  )}
                </View>

                {remainingAmount > 0 ? (
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
                          {kesRate > 0
                            ? `${(remainingAmount * kesRate).toFixed(2)} KES`
                            : `${remainingAmount.toFixed(3)} ${currency}`}
                          {" • Due: "}
                          {new Date(contributionDueDate).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                          })}
                        </Text>
                      </View>
                    </View>
                  </View>
                ) : (
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
                )}

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
                        className="flex-1 bg-gray-200 py-3 rounded-lg"
                        activeOpacity={0.8}
                        disabled
                      >
                        <Text className="text-gray-400 text-sm font-bold text-center">
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
                        className="flex-1 bg-downy-600 py-3 rounded-lg"
                        activeOpacity={0.8}
                      >
                        <Text className="text-white text-sm font-bold text-center">
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
              {chamaStatus === "not started" ? "Payout Schedule" : "Next Payout"}
            </Text>
            <Text className="text-sm text-gray-600">
              {chamaStatus === "not started"
                ? `Starts in ${formatTimeRemaining(chamaStartDate!)}`
                : chamaStatus === "active"
                  ? `Cycle ${currentCycle} . Round ${currentRound}`
                  : "Cycle complete"}
            </Text>
          </View>
        </View>

        <View className="h-px bg-gray-200 mb-2" />

        {chamaStatus === "not started" ? (
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
                once the chama starts. All members will be notified when the
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
                  {kesRate > 0
                    ? `${(nextPayoutAmount * kesRate).toFixed(2)} KES`
                    : `${nextPayoutAmount.toFixed(3)} ${currency}`}
                  {/* {kesRate > 0 && <Text className="text-sm font-medium text-emerald-400"> ({nextPayoutAmount.toFixed(3)} {currency})</Text>} */}
                </Text>
              </View>
              <View className="flex-row justify-between items-center">
                <Text className="text-sm font-medium text-gray-600">
                  Payout In
                </Text>
                <Text className="text-base font-semibold text-gray-900">
                  {formatTimeRemaining(nextPayoutDate as unknown as string)}
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
          {
            recentTransactions.length > 3 && (
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
                <Text className="text-xs text-gray-600 font-medium">View All</Text>
              </TouchableOpacity>
            )
          }
        </View>

        <View className="h-px bg-gray-200 mb-4" />

        <View className="gap-3">
          {recentTransactions.length > 0 ? (
            recentTransactions.slice(0, 3).map((transaction) => {
              const isMyTransaction = transaction.user.address === userAddress;
              return (
                <TouchableOpacity
                  key={transaction.id}
                  onPress={() => handleTransactionPress(transaction)}
                  className={`flex-row justify-between py-3 px-4 rounded-xl ${isMyTransaction
                    ? "bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200"
                    : "bg-gray-50"
                    }`}
                  activeOpacity={0.7}
                >
                  <View className="flex-1 justify-center mr-4">
                    <Text className={`text-base font-semibold capitalize mb-1 ${transaction.type === "payout" ? "text-indigo-600" : "text-gray-900"}`} numberOfLines={1}>
                      {transaction.type === "payout" ? "Cycle & Round Payout" : transaction.description}
                    </Text>

                    {transaction.type === "payout" ? (
                      <Text className="text-xs text-gray-500" numberOfLines={1}>
                        Received by <Text className="font-medium text-gray-700">
                          {transaction.user.address === userAddress ? "You" : transaction.user.name || "Member"}
                        </Text>
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
                    <Text
                      className={`text-sm font-bold flex-row items-center mb-1 ${transaction.type === "contribution"
                        ? "text-emerald-700"
                        : transaction.type === "payout"
                          ? "text-purple-700"
                          : "text-orange-700"
                        }`}
                    >
                      {transaction.type === "contribution" ? (
                        <Plus
                          size={12}
                          color={"#059669"}
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

                      {kesRate > 0
                        ? `  ${(Number(transaction.amount) * kesRate).toFixed(2)} KES`
                        : `  ${(transaction.amount || 0).toString()} ${currency}`}
                    </Text>
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
            className="bg-red-50 border border-red-200 p-3 rounded-xl"
            activeOpacity={0.8}
          >
            <LogOut size={20} color="#dc2626" />
          </TouchableOpacity>
        </View>
      </Card>

      <View className="h-20" />

      {/* Transaction Details Modal */}
      <Modal
        visible={showTransactionModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowTransactionModal(false)}
      >
        <View className="flex-1 justify-end bg-black/50">
          <View className="bg-white rounded-t-3xl p-6 max-h-[80%]">
            <View className="w-10 h-1 bg-gray-300 rounded self-center mb-6" />

            {selectedTransaction && (
              <>
                <View className="items-center mb-6">
                  <View className="w-16 h-16  items-center justify-center ">
                    <Receipt size={24} color="#059669" />
                  </View>
                  <Text className="text-xl font-bold text-gray-900 mb-2">
                    Transaction Details
                  </Text>
                  <Text className="text-sm text-gray-600">
                    {selectedTransaction.description}
                  </Text>
                </View>

                <View className="space-y-4 mb-6">
                  <View className="bg-gray-50 rounded-xl p-4">
                    <Text className="text-sm text-gray-600 mb-1">Amount</Text>
                    <Text className="text-xl font-bold text-gray-900">
                      {kesRate > 0
                        ? `${(parseFloat(selectedTransaction.amount?.toString() || "0") * kesRate).toLocaleString()} KES`
                        : `${parseFloat(selectedTransaction.amount?.toString() || "0").toLocaleString()} ${currency}`}
                      {kesRate > 0 && (
                        <Text className="text-sm font-medium text-gray-500">
                          {" "}
                          ({parseFloat(selectedTransaction.amount?.toString() || "0").toLocaleString()} {currency})
                        </Text>
                      )}
                    </Text>
                  </View>

                  <View className="bg-gray-50 rounded-xl p-4">
                    <Text className="text-sm text-gray-600 mb-1">From</Text>
                    <Text className="text-base font-semibold text-gray-900">
                      {selectedTransaction.user.address === userAddress ? (
                        <Text className="font-semibold text-gray-800">You</Text>
                      ) : (
                        <ResolvedAddress
                          address={selectedTransaction.user.address}
                          showPrefix={false}
                          textClassName="font-semibold text-gray-900"
                          fallback={selectedTransaction.user.name}
                        />
                      )}
                    </Text>
                  </View>

                  <View className="bg-gray-50 rounded-xl p-4">
                    <Text className="text-sm text-gray-600 mb-1">
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

                  <View className="bg-gray-50 rounded-xl p-4">
                    <Text className="text-sm text-gray-600 mb-1">
                      Transaction Hash
                    </Text>
                    <Text
                      className="text-xs text-gray-700 font-mono"
                      numberOfLines={2}
                    >
                      {selectedTransaction.txHash}
                    </Text>
                  </View>

                  {/* <View className="bg-gray-50 rounded-xl p-4">
                    <Text className="text-sm text-gray-600 mb-1">Status</Text>
                    <View className="flex-row items-center gap-2 mt-1">
                      <View className="w-2 h-2 bg-emerald-500 rounded-full" />
                      <Text className="text-base font-semibold text-emerald-700 capitalize">
                        {selectedTransaction.status}
                      </Text>
                    </View>
                  </View> */}
                </View>

                <View className="gap-3">
                  <TouchableOpacity
                    onPress={handleViewOnChain}
                    className="bg-emerald-600 py-4 rounded-xl flex-row items-center justify-center gap-2"
                    activeOpacity={0.8}
                  >
                    <ExternalLink size={18} color="white" />
                    <Text className="text-white font-semibold text-base">
                      View on Chain
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={() => setShowTransactionModal(false)}
                    className="bg-gray-100 py-4 rounded-xl"
                    activeOpacity={0.8}
                  >
                    <Text className="text-gray-700 font-semibold text-base text-center">
                      Close
                    </Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>
    </ScrollView >
  );
};

export default ChamaOverviewTab;
