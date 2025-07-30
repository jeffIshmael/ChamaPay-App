import { Card } from "@/components/ui/Card";
import { PayoutScheduleItem, PayoutStatus } from "@/constants/mockData";
import { CheckCircle, Info } from "lucide-react-native";
import React, { FC } from "react";
import { ScrollView, Text, View } from "react-native";


type Props = {
  payoutSchedule: PayoutScheduleItem[];
  currentUserName?: string; // Optional: for highlighting current user
};

const getStatusColor = (status: PayoutStatus) => {
  switch (status) {
      case "completed":
        return "bg-green-100 text-green-700";
      case "next":
        return "bg-emerald-100 text-emerald-700";
      case "upcoming":
        return "bg-gray-100 text-gray-700";
      default:
        return "bg-gray-100 text-gray-700";
    }
};

const getStatusBadgeColor = (status: PayoutStatus) => {
  switch (status) {
    case "completed":
      return "bg-green-200";
    case "next":
      return "bg-emerald-200";
    default:
      return "bg-gray-200";
  }
};

const ScheduleTab: FC<Props> = ({ payoutSchedule, currentUserName }) => {
  return (
    <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
      <View className="gap-3">
        {payoutSchedule.map((payout) => (
          <Card key={payout.position} className="p-4">
            <View className="flex-row items-center justify-between">
              <View className="flex-row items-center gap-3">
                <View
                  className={`w-8 h-8 rounded-full items-center justify-center ${getStatusColor(payout.status)}`}
                >
                  {payout.status === "completed" ? (
                    <CheckCircle size={16} color="#059669" />
                  ) : (
                    <Text
                      className={`text-sm font-medium ${
                        payout.status === "next"
                          ? "text-emerald-600"
                          : "text-gray-600"
                      }`}
                    >
                      {payout.position}
                    </Text>
                  )}
                </View>
                <View>
                  <Text className="text-gray-900 text-sm font-medium">
                    {payout.member}
                  </Text>
                  <Text className="text-gray-600 text-xs">{payout.date}</Text>
                </View>
              </View>
              <View className="items-end">
                <Text className="text-gray-900 text-sm font-medium">
                  KES {(payout.amount || 0).toLocaleString()}
                </Text>
                <View
                  className={`px-2 py-1 rounded-full mt-1 ${getStatusBadgeColor(payout.status)}`}
                >
                  <Text className="text-xs font-medium capitalize">
                    {payout.status}
                  </Text>
                </View>
              </View>
            </View>
            {(currentUserName
              ? payout.member === currentUserName
              : payout.member === "You (Sarah)") && (
              <View className="mt-3 p-2 bg-emerald-50 rounded-lg">
                <View className="flex-row items-center gap-2">
                  <Info size={14} color="#059669" />
                  <Text className="text-xs text-emerald-700">
                    This is your payout turn
                  </Text>
                </View>
              </View>
            )}
          </Card>
        ))}
      </View>
      <View className="h-20" />
    </ScrollView>
  );
};

export default ScheduleTab;
