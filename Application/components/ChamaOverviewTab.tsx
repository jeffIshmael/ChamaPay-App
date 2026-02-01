import { Transaction } from "@/constants/mockData";
import { formatTimeRemaining } from "@/Utils/helperFunctions";
import {
  CircleArrowDown,
  CircleArrowOutUpRight,
  DollarSign,
  ExternalLink,
  LogOut,
  Receipt,
  TrendingUp
} from "lucide-react-native";
import React, { FC, useState } from "react";
import { Modal, ScrollView, Text, TouchableOpacity, View, Dimensions } from "react-native";
import { Badge } from "./ui/Badge";
import { Card } from "./ui/Card";
import { ProgressBar } from "./ui/ProgressBar";

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
  chamaStartDate?: Date;
  collateralAmount?: number;
  kesRate?: number;
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
  isPublic = true,
  collateralAmount = 100,
  kesRate = 0,
}) => {
  const [selectedTransaction, setSelectedTransaction] =
    useState<Transaction | null>(null);
  const [showTransactionModal, setShowTransactionModal] = useState(false);
  const [activeCardIndex, setActiveCardIndex] = useState(0);

  const handleTransactionPress = (transaction: Transaction) => {
    setSelectedTransaction(transaction);
    setShowTransactionModal(true);
  };

  const handleViewOnChain = () => {
    if (selectedTransaction?.txHash) {
      // Open blockchain explorer
      console.log("View transaction on chain:", selectedTransaction.txHash);
      // You can implement opening a blockchain explorer URL here
    }
  };

  return (
    <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
      {/* Contribution Progress with Balance Cards */}

      {/* Contribution Progress with Balance Cards */}
      <Card className="px-6 py-4 mb-4">
        {/* Section Header */}
        <View className="flex-row items-center justify-between mb-3">
          <Text className="text-xl font-semibold text-gray-900">
            Cycle Overview
          </Text>
          <Badge
            variant={myContributions >= contribution ? "default" : "secondary"}
          >
            <Text
              className={
                myContributions >= contribution
                  ? "text-white"
                  : "text-orange-700"
              }
            >
              {myContributions >= contribution ? "Complete" : "Pending"}
            </Text>
          </Badge>
        </View>

        {/* Compact Cycle Details */}
        {/* <View className="bg-gray-50 rounded-lg px-3 py-2 mb-4">
          <Text className="text-xs text-gray-600 leading-5">
            <Text className="font-semibold text-gray-800">Cycle:</Text> {currentCycle || 1}
            <Text className="text-gray-400"> • </Text>
            <Text className="font-semibold text-gray-800">Round:</Text> {currentRound || 1}
            <Text className="text-gray-400"> • </Text>
            <Text className="font-semibold text-gray-800">Required:</Text>{" "}
            {kesRate > 0
              ? `${(contribution * kesRate).toLocaleString(undefined, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })} KES`
              : `${contribution.toFixed(3)} ${currency}`}
            <Text className="text-gray-400"> • </Text>
            <Text className="font-semibold text-gray-800">Due:</Text>{" "}
            {new Date(contributionDueDate).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
            })}
          </Text>
        </View> */}

        {/* Swipeable Balance Cards */}
        <View className="gap-4 mb-2">
          {isPublic ? (
            <ScrollView
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              onScroll={(e) => {
                const contentOffsetX = e.nativeEvent.contentOffset.x;
                const index = Math.round(contentOffsetX / (Dimensions.get('window').width - 48));
                setActiveCardIndex(index);
              }}
              scrollEventThrottle={16}
            >
              {/* Chama Balance Card */}
              <View style={{ width: Dimensions.get('window').width - 48 }}>
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
                          ? `${(myContributions * kesRate).toLocaleString(undefined, {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })} KES`
                          : `${myContributions.toFixed(3)} ${currency}`}
                      </Text>
                      {kesRate > 0 && (
                        <Text className="text-xs text-gray-500 mt-1">
                          ≈ {myContributions.toFixed(3)} {currency}
                        </Text>
                      )}
                    </View>

                    {/* Payment Warning */}
                    {remainingAmount > 0 && (
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
                                ? `${(remainingAmount * kesRate).toLocaleString()} KES`
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
                <View style={{ width: Dimensions.get('window').width - 48 }}>
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
                              Locked Balance
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
                          {kesRate > 0
                            ? `${(collateralAmount * kesRate).toLocaleString(undefined, {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            })} KES`
                            : `${collateralAmount.toFixed(3)} ${currency}`}
                        </Text>
                        {kesRate > 0 && (
                          <Text className="text-xs text-gray-500 mt-1">
                            ≈ {collateralAmount.toFixed(3)} {currency}
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
                              {kesRate > 0
                                ? `${((contribution * 10) * kesRate).toLocaleString()} KES`
                                : `${(contribution * 10).toFixed(3)} ${currency}`}
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
                        className={`py-3 rounded-lg ${collateralAmount >= (contribution * 10)
                            ? "bg-gray-200"
                            : "bg-purple-600"
                          }`}
                        activeOpacity={0.8}
                        disabled={collateralAmount >= (contribution * 10)}
                      >
                        <Text
                          className={`text-sm font-bold text-center ${collateralAmount >= (contribution * 10)
                              ? "text-gray-400"
                              : "text-white"
                            }`}
                        >
                          {collateralAmount >= (contribution * 10)
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
                      ? `${(myContributions * kesRate).toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })} KES`
                      : `${myContributions.toFixed(3)} ${currency}`}
                  </Text>
                  {kesRate > 0 && (
                    <Text className="text-xs text-gray-500 mt-1">
                      ≈ {myContributions.toFixed(3)} {currency}
                    </Text>
                  )}
                </View>

                {remainingAmount > 0 && (
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
                            ? `${(remainingAmount * kesRate).toLocaleString()} KES`
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
        <View className="flex-row items-center gap-4 mb-4">
          <View className="w-12 h-12 rounded-full bg-emerald-100 items-center justify-center">
            <TrendingUp size={20} color="#059669" />
          </View>
          <View className="flex-1">
            <Text className="text-lg font-semibold text-gray-900">
              {chamaStatus === "not started" ? "Payout Schedule" : "Next Payout"}
            </Text>
            <Text className="text-sm text-gray-600">
              {chamaStatus === "not started"
                ? `Starts in ${formatTimeRemaining(chamaStartDate!)}`
                : chamaStatus === "active"
                  ? `${new Date(nextPayoutDate).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}`
                  : "Cycle complete"}
            </Text>
          </View>
        </View>

        {chamaStatus === "not started" ? (
          <View className="bg-gradient-to-r from-amber-50 to-orange-50 rounded-xl p-4 border border-amber-200">
            <View className="items-center">
              <View className="w-16 h-16 bg-amber-100 rounded-full items-center justify-center mb-4">
                <Text className="text-2xl">🎲</Text>
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
                    ? `${(nextPayoutAmount * kesRate).toLocaleString()} KES`
                    : `${nextPayoutAmount.toLocaleString()} ${currency}`}
                  {kesRate > 0 && <Text className="text-sm font-medium text-emerald-400"> ({nextPayoutAmount.toLocaleString()} {currency})</Text>}
                </Text>
              </View>
            </View>
          </View>
        )}
      </Card>

      {/* Recent Transactions */}
      <Card className="p-6 mb-6">
        <View className="flex-row items-center justify-between mb-4">
          <Text className="text-lg font-semibold text-gray-900">
            Recent Transactions
          </Text>
          <TouchableOpacity className="bg-gray-100 px-3 py-1 rounded-full">
            <Text className="text-xs text-gray-600 font-medium">View All</Text>
          </TouchableOpacity>
        </View>

        <View className="gap-3">
          {recentTransactions.length > 0 ? (
            recentTransactions.slice(0, 3).map((transaction) => {
              const isMyTransaction = transaction.user.address === userAddress;
              return (
                <TouchableOpacity
                  key={transaction.id}
                  onPress={() => handleTransactionPress(transaction)}
                  className={`flex-row items-center justify-between py-3 px-4 rounded-xl ${isMyTransaction
                    ? "bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200"
                    : "bg-gray-50"
                    }`}
                  activeOpacity={0.7}
                >
                  <View className="flex-row items-center gap-2">
                    <View className={`w-10 h-10  items-center justify-center`}>
                      {transaction.type === "contribution" ? (
                        <CircleArrowDown
                          size={24}
                          color={"#059669"}
                          className="w-10 h-10"
                        />
                      ) : (
                        <CircleArrowOutUpRight
                          size={24}
                          color={"#ea580c"}
                          className="w-10 h-10"
                        />
                      )}
                    </View>
                    <View>
                      <View className="flex-row items-center gap-2">
                        <Text className="text-base font-medium text-gray-900 capitalize">
                          {isMyTransaction ? (
                            <Text className="font-bold text-blue-700">
                              You
                            </Text>
                          ) : (
                            transaction.user.name
                          )}{" "}
                          {transaction.description}
                        </Text>
                      </View>
                      <Text className="text-sm text-gray-600">
                        {new Date(transaction.date).toLocaleDateString(
                          "en-US",
                          {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          }
                        )}
                      </Text>
                    </View>
                  </View>
                  <View className="items-end">
                    <Text className="text-sm  font-semibold text-emerald-700">
                      {kesRate > 0
                        ? `${(Number(transaction.amount) * kesRate).toLocaleString()} KES`
                        : `${(transaction.amount || 0).toString()} ${currency}`}
                      {kesRate > 0 && <Text className="text-xs font-medium text-emerald-600"> ({Number(transaction.amount).toLocaleString()} {currency})</Text>}
                    </Text>
                    {/* <View
                      className={`px-2 py-1 rounded-full ${
                        transaction.type === "contribution"
                          ? "bg-emerald-100"
                          : "bg-orange-100"
                      }`}
                    > */}
                    {/* <Text
                        className={`text-xs font-medium ${
                          transaction.type === "contribution"
                            ? "text-emerald-700"
                            : "text-orange-700"
                        }`}
                      >
                        {transaction.type === "contribution" ? "In" : "Out"}
                      </Text> */}
                    {/* </View> */}
                  </View>
                </TouchableOpacity>
              );
            })
          ) : (
            <View className="py-8 items-center">
              <View className="w-16 h-16 bg-gray-100 rounded-full items-center justify-center mb-3">
                <DollarSign size={24} color="#9ca3af" />
              </View>
              <Text className="text-gray-500 font-medium">
                No transactions yet
              </Text>
              <Text className="text-gray-400 text-sm text-center mt-1">
                Your recent transactions will appear here
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
                        <Text className="font-semibold text-gray-900">
                          {selectedTransaction.user.address}
                        </Text>
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
    </ScrollView>
  );
};

export default ChamaOverviewTab;
