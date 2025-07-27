import { mockTransactions } from "@/constants/mockData";
import {
  ArrowDownRight,
  ArrowLeft,
  ArrowUpRight,
  Calendar,
  Download,
  Search as SearchIcon,
} from "lucide-react-native";
import React, { useState } from "react";
import { Pressable, ScrollView, Text, TextInput, View } from "react-native";

interface TransactionHistoryProps {
  onBack: () => void;
}

export default function TransactionHistory({ onBack }: TransactionHistoryProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState("all");

  const filteredTransactions = mockTransactions.filter((transaction) => {
    const matchesSearch =
      transaction.chama.toLowerCase().includes(searchTerm.toLowerCase()) ||
      transaction.hash.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter =
      filterType === "all" || transaction.type === filterType;
    return matchesSearch && matchesFilter;
  });

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
    <View className="flex-1 bg-gray-50">
      {/* Header */}
      <View className="bg-white border-b border-gray-200 px-4 pt-8 pb-4">
        <View className="flex-row items-center mb-4">
          <Pressable
            onPress={onBack}
            className="p-2 mr-2 rounded-full bg-gray-100"
            hitSlop={10}
          >
            <ArrowLeft size={20} color="#111827" />
          </Pressable>
          <Text className="text-xl text-gray-900 flex-1 font-semibold">
            Transaction History
          </Text>
          <Pressable className="p-2 ml-2 rounded-full bg-gray-100">
            <Download size={20} color="#111827" />
          </Pressable>
        </View>

        {/* Search and Filter */}
        <View className="gap-3">
          <View className="relative">
            <View className="absolute left-3 top-1/2 -translate-y-1/2">
              <SearchIcon size={20} color="#9ca3af" />
            </View>
            <TextInput
              placeholder="Search transactions..."
              value={searchTerm}
              onChangeText={setSearchTerm}
              className="pl-10 pr-3 py-2 bg-gray-50 rounded border border-gray-200 text-base text-gray-900"
              placeholderTextColor="#9ca3af"
            />
          </View>

          <View className="flex-row gap-2">
            {[
              { type: "all", label: "All" },
              { type: "contribution", label: "Contributions" },
              { type: "payout", label: "Payouts" },
              { type: "collateral", label: "Collateral" },
            ].map((filter) => (
              <Pressable
                key={filter.type}
                onPress={() => setFilterType(filter.type)}
                className={`px-3 py-1.5 rounded ${
                  filterType === filter.type
                    ? "bg-emerald-600"
                    : "bg-white border border-gray-200"
                }`}
              >
                <Text
                  className={`text-sm font-medium ${
                    filterType === filter.type ? "text-white" : "text-gray-700"
                  }`}
                >
                  {filter.label}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>
      </View>

      {/* Transactions */}
      <ScrollView
        className="flex-1 px-4 py-4"
        contentContainerStyle={{ paddingBottom: 32 }}
      >
        {filteredTransactions.map((transaction) => (
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

        {filteredTransactions.length === 0 && (
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
    </View>
  );
}
