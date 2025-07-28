import { Transaction } from "@/constants/mockData";
import { DollarSign, LogOut, TrendingUp } from "lucide-react-native";
import React, { FC } from "react";
import {
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { AlertCard } from "./ui/AlertCard";
import { Badge } from "./ui/Badge";
import { Card } from "./ui/Card";
import { ProgressBar } from "./ui/ProgressBar";

type Props = {
  myContributions: number;
  contribution: number;
  remainingAmount: number;
  paymentAmount: string | undefined;
  setPaymentAmount: (val: string) => void;
  makePayment: () => void;
  contributionDueDate: string;
  currentTurnMember: string;
  recentTransactions: Transaction[];
  nextPayoutAmount: number;
  leaveChama: () => void;
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
  leaveChama,
}) => {
  return (
    <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
      {/* Contribution Progress */}
      <Card className="p-4 mb-4">
        <View className="flex-row items-center justify-between mb-3">
          <Text className="text-gray-900 font-medium">
            This Month&apos;s Contribution
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
        <View className="gap-3">
          <View className="flex-row justify-between">
            <Text className="text-sm text-gray-600">
              Contributed KES {myContributions.toLocaleString()}
            </Text>
          </View>
          <ProgressBar
            value={
              contribution > 0 ? (myContributions / contribution) * 100 : 0
            }
          />
          {myContributions >= contribution ? (
            <Text className="text-xs text-green-600">
              ✓ Thank you for your contribution this month!
            </Text>
          ) : (
            <View className="gap-2">
              <Text className="text-xs text-gray-600">
                KES {remainingAmount.toLocaleString()} remaining • Due:{" "}
                {contributionDueDate}
              </Text>
              <View className="flex-row gap-2">
                <TextInput
                  value={paymentAmount}
                  onChangeText={setPaymentAmount}
                  keyboardType="numeric"
                  className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm"
                  placeholder="Amount"
                />
                <TouchableOpacity
                  onPress={makePayment}
                  className="bg-emerald-600 px-4 py-2 rounded-lg"
                >
                  <Text className="text-white text-sm font-medium">Pay</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>
      </Card>

      {/* Next Payout Info */}
      <Card className="p-4 mb-4">
        <View className="flex-row items-center gap-3 mb-3">
          <View className="w-8 h-8 rounded-full bg-emerald-100 items-center justify-center">
            <TrendingUp size={16} color="#059669" />
          </View>
          <View>
            <Text className="text-gray-900 font-medium">Next Payout</Text>
            <Text className="text-sm text-gray-600">August 15, 2024</Text>
          </View>
        </View>
        <View className="gap-2">
          <View className="flex-row justify-between">
            <Text className="text-gray-600 text-sm">Recipient:</Text>
            <Text className="text-gray-900 text-sm">
              {currentTurnMember}
            </Text>
          </View>
          <View className="flex-row justify-between">
            <Text className="text-gray-600 text-sm">Amount:</Text>
            <Text className="text-gray-900 text-sm">
              KES {nextPayoutAmount.toLocaleString()}
            </Text>
          </View>
        </View>
      </Card>

      {/* Recent Transactions */}
      <Card className="p-4 mb-4">
        <View className="flex-row items-center justify-between mb-3">
          <Text className="text-gray-900 font-medium">Recent Transactions</Text>
        </View>
        <View className="gap-2">
          {recentTransactions.slice(0, 3).map((transaction) => (
            <View
              key={transaction.id}
              className="flex-row items-center justify-between py-2"
            >
              <View className="flex-row items-center gap-3">
                <View
                  className={`w-6 h-6 rounded-full items-center justify-center ${
                    transaction.type === "contribution"
                      ? "bg-emerald-100"
                      : "bg-orange-100"
                  }`}
                >
                  <DollarSign
                    size={12}
                    color={
                      transaction.type === "contribution"
                        ? "#059669"
                        : "#ea580c"
                    }
                  />
                </View>
                <View>
                  <Text className="text-sm text-gray-900 capitalize">
                    {transaction.type}
                  </Text>
                  <Text className="text-xs text-gray-600">
                    {transaction.date}
                  </Text>
                </View>
              </View>
              <Text className="text-sm text-gray-900">
                KES {(transaction.amount || 0).toLocaleString()}
              </Text>
            </View>
          ))}
        </View>
      </Card>

      {/* Leave Chama */}
      <AlertCard type="error">
        <View className="flex-row items-center justify-between">
          <View className="flex-1">
            <Text className="text-sm text-red-700 font-medium">
              Leave chama
            </Text>
          </View>
          <TouchableOpacity onPress={leaveChama} className="p-2">
            <LogOut size={16} color="#dc2626" />
          </TouchableOpacity>
        </View>
      </AlertCard>

      <View className="h-20" />
    </ScrollView>
  );
};

export default ChamaOverviewTab;
