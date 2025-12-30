import { Transaction } from "@/constants/mockData";
import {
  DollarSign,
  ExternalLink,
  LogOut,
  Receipt,
  TrendingUp,
  Plus,
  CircleArrowDown,
  CircleArrowOutUpRight,
} from "lucide-react-native";
import React, { FC, useState } from "react";
import { Modal, ScrollView, Text, TouchableOpacity, View } from "react-native";
import { Badge } from "./ui/Badge";
import { Card } from "./ui/Card";
import { ProgressBar } from "./ui/ProgressBar";
import { formatTimeRemaining } from "@/Utils/helperFunctions";

type Props = {
  myContributions: number;
  contribution: number;
  remainingAmount: number;
  paymentAmount: string | undefined;
  setPaymentAmount: (val: string) => void;
  makePayment: () => void;
  contributionDueDate: Date;
  currentTurnMember: string;
  recentTransactions: Transaction[];
  nextPayoutAmount: number;
  nextPayoutDate: string;
  leaveChama: () => void;
  userAddress: `0x${string}`;
  chamaStatus: "active" | "not started";
  chamaStartDate?: Date;
  currency: string;
};

const ChamaOverviewTab: FC<Props> = ({
  myContributions,
  contribution,
  remainingAmount,
  paymentAmount,
  setPaymentAmount,
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
}) => {
  const [selectedTransaction, setSelectedTransaction] =
    useState<Transaction | null>(null);
  const [showTransactionModal, setShowTransactionModal] = useState(false);

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
      {/* Contribution Progress */}
      <Card className="p-6 mb-6">
        <View className="flex-row items-center justify-between mb-4">
          <Text className="text-xl font-semibold text-gray-900">
            Cycle Contribution
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

        <View className="gap-4">
          {/* Contribution Stats */}
          <View className="bg-gray-50 rounded-xl p-4">
            <View className="flex-row justify-between items-center mb-2">
              <Text className="text-sm font-medium text-gray-600">
                Required
              </Text>
              <Text className="text-lg font-semibold text-gray-900">
                {contribution.toLocaleString()} {currency}
              </Text>
            </View>
            <View className="flex-row justify-between items-center mb-3">
              <Text className="text-sm font-medium text-gray-600">
                Contributed
              </Text>
              <Text className="text-lg font-semibold text-emerald-600">
                {myContributions.toLocaleString()} {currency}
              </Text>
            </View>
            <ProgressBar
              value={
                contribution > 0
                  ? Math.min((myContributions / contribution) * 100, 100)
                  : 0
              }
            />
          </View>

          {/* Status Message */}
          {myContributions >= contribution ? (
            <View className="bg-green-50 border border-green-200 rounded-xl p-4">
              <View className="flex-row items-center gap-2 mb-2">
                <View className="w-5 h-5 bg-green-100 rounded-full items-center justify-center">
                  <Text className="text-green-600 text-xs font-bold">✓</Text>
                </View>
                <Text className="text-green-800 font-medium">
                  Contribution Complete!
                </Text>
              </View>
              <Text className="text-sm text-green-700">
                Thank you for your contribution this cycle. You can still make
                additional payments for next cycle.
              </Text>
            </View>
          ) : (
            <View className="bg-orange-50 border border-orange-200 rounded-xl p-4">
              <View className="flex-row items-center gap-2 mb-2">
                <View className="w-5 h-5 bg-orange-100 rounded-full items-center justify-center">
                  <Text className="text-orange-600 text-xs font-bold">!</Text>
                </View>
                <Text className="text-orange-800 font-medium">
                  Payment Required
                </Text>
              </View>
              <Text className="text-sm text-orange-700 mb-3">
                {remainingAmount} {currency} remaining • Due:{" "}
               { new Date(contributionDueDate).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
              </Text>
            </View>
          )}

          {/* Make Payment Button - Always Visible */}
          <TouchableOpacity
            onPress={makePayment}
            className="bg-emerald-600 py-4 rounded-xl shadow-sm"
            activeOpacity={0.8}
          >
            <View className="flex-row items-center justify-center gap-2">
              <DollarSign size={18} color="white" />
              <Text className="text-white text-base font-semibold">
                {myContributions >= contribution
                  ? "Make Additional Payment"
                  : "Make Payment"}
              </Text>
            </View>
          </TouchableOpacity>
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
                  {nextPayoutAmount.toLocaleString()} {currency}
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
                  className={`flex-row items-center justify-between py-3 px-4 rounded-xl ${
                    isMyTransaction
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
                      {(transaction.amount || 0).toString()} {currency}
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
                  <View className="w-16 h-16 bg-emerald-100 rounded-full items-center justify-center mb-4">
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
                    <Text className="text-2xl font-bold text-gray-900">
                      {parseFloat(
                        selectedTransaction.amount?.toString() || "0"
                      ).toLocaleString()}{" "}
                      {currency}
                    </Text>
                  </View>

                  <View className="bg-gray-50 rounded-xl p-4">
                    <Text className="text-sm text-gray-600 mb-1">From</Text>
                    <Text className="text-base font-semibold text-gray-900">
                      {selectedTransaction.user.address === userAddress ? (
                        <Text className="font-bold text-gray-800">You</Text>
                      ) : (
                        <Text className="font-bold text-gray-900">
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
                          weekday: "long",
                          year: "numeric",
                          month: "long",
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

                  <View className="bg-gray-50 rounded-xl p-4">
                    <Text className="text-sm text-gray-600 mb-1">Status</Text>
                    <View className="flex-row items-center gap-2 mt-1">
                      <View className="w-2 h-2 bg-emerald-500 rounded-full" />
                      <Text className="text-base font-semibold text-emerald-700 capitalize">
                        {selectedTransaction.status}
                      </Text>
                    </View>
                  </View>
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
