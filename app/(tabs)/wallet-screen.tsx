import { mockTransactions } from "@/constants/mockData";
import {
  ArrowDownRight,
  ArrowUpRight,
  Calendar,
  Search as SearchIcon,
} from "lucide-react-native";
import React from "react";
import { ScrollView, Text, View } from "react-native";
import {
  SafeAreaView
} from "react-native-safe-area-context";

export default function TransactionHistory() {
  const getTransactionIcon = (type: string) => {
    switch (type) {
      case "payout":
        return <ArrowDownRight size={20} color="#059669" />;
      case "contribution":
        return <ArrowUpRight size={20} color="#2563eb" />;
      case "collateral":
        return <Calendar size={20} color="#eab308" />;
      default:
        return <ArrowUpRight size={20} color="#6b7280" />;
    }
  };

  const getTransactionColor = (type: string) => {
    switch (type) {
      case "payout":
        return "text-emerald-600";
      case "contribution":
        return "text-blue-600";
      case "collateral":
        return "text-yellow-600";
      default:
        return "text-gray-600";
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  };

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      {/* Header */}
      <View className="bg-white border-b border-gray-200 px-4  pb-2">
        <View className="flex-row items-center gap-4 h-12 ">
          <Text className="text-xl font-semibold text-gray-900 flex-1">
            Wallet
          </Text>
        </View>
      </View>

      {/* Transactions */}
      <ScrollView
        className="flex-1 px-4 py-4"
        contentContainerStyle={{ paddingBottom: 32 }}
      >
        {mockTransactions.map((transaction) => (
          <View
            key={transaction.id}
            className="bg-white rounded-lg shadow-sm mb-3 p-4"
          >
            <View className="flex-row items-center justify-between mb-3">
              <View className="flex-row items-center gap-3">
                {getTransactionIcon(transaction.type)}
                <View>
                  <Text className="font-medium text-gray-900 capitalize">
                    {transaction.type === "payout"
                      ? "Received Payout"
                      : transaction.type === "contribution"
                        ? "Made Contribution"
                        : "Locked Collateral"}
                  </Text>
                  <Text className="text-sm text-gray-600">
                    {transaction.chama}
                  </Text>
                </View>
              </View>
              <View className="items-end">
                <Text
                  className={`font-medium ${getTransactionColor(
                    transaction.type
                  )}`}
                >
                  {transaction.type === "payout" ? "+" : "-"}KES{" "}
                  {transaction.amount.toLocaleString()}
                </Text>
                <View
                  className={`px-2 py-0.5 rounded-full mt-1 ${
                    transaction.status === "completed"
                      ? "bg-emerald-100"
                      : "bg-gray-100"
                  }`}
                >
                  <Text
                    className={`text-xs font-semibold ${
                      transaction.status === "completed"
                        ? "text-emerald-700"
                        : "text-gray-600"
                    }`}
                  >
                    {transaction.status}
                  </Text>
                </View>
              </View>
            </View>

            <View className="flex-row items-center justify-between text-xs text-gray-500">
              <View className="flex-row items-center gap-4">
                <Text className="text-xs text-gray-500">
                  {formatDate(transaction.date)}
                </Text>
                <Text className="text-xs text-gray-500">
                  {formatTime(transaction.date)}
                </Text>
              </View>
              <View className="flex-row items-center gap-2">
                <Text className="text-xs text-gray-500">Hash:</Text>
                <Text
                  className="bg-gray-100 px-2 py-1 rounded text-xs font-mono"
                  selectable
                >
                  {transaction.hash}
                </Text>
              </View>
            </View>
          </View>
        ))}

        {mockTransactions.length === 0 && (
          <View className="bg-white rounded-lg shadow-sm p-8 items-center justify-center mt-8">
            <SearchIcon size={48} color="#9ca3af" className="mb-4" />
            <Text className="text-gray-900 text-lg font-semibold mb-2">
              No Transactions Found
            </Text>
            <Text className="text-gray-600 text-sm text-center">
              Try adjusting your search or filter criteria
            </Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
