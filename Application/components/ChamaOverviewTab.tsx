import { Transaction } from "@/constants/mockData";
import { DollarSign, LogOut, TrendingUp } from "lucide-react-native";
import React, { FC } from "react";
import {
  ScrollView,
  Text,
  TouchableOpacity,
  View
} from "react-native";
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
      <Card className="p-6 mb-6">
        <View className="flex-row items-center justify-between mb-4">
          <Text className="text-xl font-semibold text-gray-900">
            Monthly Contribution
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
              <Text className="text-sm font-medium text-gray-600">Required</Text>
              <Text className="text-lg font-semibold text-gray-900">
                cUSD {contribution.toLocaleString()}
              </Text>
            </View>
            <View className="flex-row justify-between items-center mb-3">
              <Text className="text-sm font-medium text-gray-600">Contributed</Text>
              <Text className="text-lg font-semibold text-emerald-600">
                cUSD {myContributions.toLocaleString()}
              </Text>
            </View>
            <ProgressBar
              value={
                contribution > 0 ? Math.min((myContributions / contribution) * 100, 100) : 0
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
                Thank you for your contribution this month. You can still make additional payments if needed.
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
                cUSD {remainingAmount.toLocaleString()} remaining • Due: {contributionDueDate}
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
                {myContributions >= contribution ? "Make Additional Payment" : "Make Payment"}
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
            <Text className="text-lg font-semibold text-gray-900">Next Payout</Text>
            <Text className="text-sm text-gray-600">August 15, 2024</Text>
          </View>
        </View>
        
        <View className="bg-gradient-to-r from-emerald-50 to-blue-50 rounded-xl p-4">
          <View className="gap-3">
            <View className="flex-row justify-between items-center">
              <Text className="text-sm font-medium text-gray-600">Recipient</Text>
              <Text className="text-base font-semibold text-gray-900">{currentTurnMember}</Text>
            </View>
            <View className="flex-row justify-between items-center">
              <Text className="text-sm font-medium text-gray-600">Amount</Text>
              <Text className="text-lg font-bold text-emerald-600">
                cUSD {nextPayoutAmount.toLocaleString()}
              </Text>
            </View>
          </View>
        </View>
      </Card>

      {/* Recent Transactions */}
      <Card className="p-6 mb-6">
        <View className="flex-row items-center justify-between mb-4">
          <Text className="text-lg font-semibold text-gray-900">Recent Transactions</Text>
          <TouchableOpacity className="bg-gray-100 px-3 py-1 rounded-full">
            <Text className="text-xs text-gray-600 font-medium">View All</Text>
          </TouchableOpacity>
        </View>
        
        <View className="gap-3">
          {recentTransactions.length > 0 ? (
            recentTransactions.slice(0, 3).map((transaction) => (
              <View
                key={transaction.id}
                className="flex-row items-center justify-between py-3 px-4 bg-gray-50 rounded-xl"
              >
                <View className="flex-row items-center gap-4">
                  <View
                    className={`w-10 h-10 rounded-full items-center justify-center ${
                      transaction.type === "contribution"
                        ? "bg-emerald-100"
                        : "bg-orange-100"
                    }`}
                  >
                    <DollarSign
                      size={16}
                      color={
                        transaction.type === "contribution"
                          ? "#059669"
                          : "#ea580c"
                      }
                    />
                  </View>
                  <View>
                    <Text className="text-base font-medium text-gray-900 capitalize">
                      {transaction.type}
                    </Text>
                    <Text className="text-sm text-gray-600">
                      {transaction.date}
                    </Text>
                  </View>
                </View>
                <View className="items-end">
                  <Text className="text-base font-semibold text-gray-900">
                    cUSD {(transaction.amount || 0).toLocaleString()}
                  </Text>
                  <View
                    className={`px-2 py-1 rounded-full ${
                      transaction.type === "contribution"
                        ? "bg-emerald-100"
                        : "bg-orange-100"
                    }`}
                  >
                    <Text
                      className={`text-xs font-medium ${
                        transaction.type === "contribution"
                          ? "text-emerald-700"
                          : "text-orange-700"
                      }`}
                    >
                      {transaction.type === "contribution" ? "In" : "Out"}
                    </Text>
                  </View>
                </View>
              </View>
            ))
          ) : (
            <View className="py-8 items-center">
              <View className="w-16 h-16 bg-gray-100 rounded-full items-center justify-center mb-3">
                <DollarSign size={24} color="#9ca3af" />
              </View>
              <Text className="text-gray-500 font-medium">No transactions yet</Text>
              <Text className="text-gray-400 text-sm text-center mt-1">
                Your recent transactions will appear here
              </Text>
            </View>
          )}
        </View>
      </Card>

      {/* Leave Chama */}
      <Card className="p-6 mb-6">
        <View className="flex-row items-center justify-between">
          <View className="flex-1">
            <Text className="text-lg font-semibold text-gray-900 mb-1">
              Leave Chama
            </Text>
            <Text className="text-sm text-gray-600">
              You can leave this chama at any time. This action cannot be undone.
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
    </ScrollView>
  );
};

export default ChamaOverviewTab;
