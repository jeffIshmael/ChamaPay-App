import { Card } from "@/components/ui/Card";
import { PayoutScheduleItem, PayoutStatus } from "@/constants/mockData";
import { CheckCircle, Info } from "lucide-react-native";
import React, { FC } from "react";
import { ScrollView, Text, View } from "react-native";


type Props = {
  payoutSchedule: PayoutScheduleItem[];
  currentUserName?: string;
  chamaStatus?: "active" | "pending" | "completed";
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

const ScheduleTab: FC<Props> = ({ payoutSchedule = [], currentUserName, chamaStatus = "active" }) => {
  return (
    <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
      <View className="gap-3">
        {chamaStatus === "pending" ? (
          <>
            {/* Header Card for Pending Status */}
            <Card className="p-6 mb-4">
              <View className="items-center">
                <View className="w-16 h-16 bg-amber-100 rounded-full items-center justify-center mb-4">
                  <Text className="text-2xl">🎲</Text>
                </View>
                <Text className="text-lg font-semibold text-amber-800 mb-2">
                  Schedule Pending
                </Text>
                <Text className="text-sm text-amber-700 text-center leading-5">
                  The payout schedule will be randomly generated and displayed once the chama starts. 
                  All members will be notified when the schedule is ready.
                </Text>
              </View>
            </Card>

            {/* Position Slots */}
            {payoutSchedule && payoutSchedule.length > 0 ? payoutSchedule.map((payout) => (
              <Card key={payout.position} className="p-4">
                <View className="flex-row items-center justify-between">
                  <View className="flex-row items-center gap-3">
                    <View className="w-8 h-8 rounded-full items-center justify-center bg-gray-100">
                      <Text className="text-sm font-medium text-gray-600">
                        {payout.position}
                      </Text>
                    </View>
                    <View>
                      <Text className="text-gray-500 text-sm font-medium">
                        Position {payout.position}
                      </Text>
                      <Text className="text-gray-400 text-xs">
                        Member to be assigned
                      </Text>
                    </View>
                  </View>
                  <View className="items-end">
                    <Text className="text-gray-500 text-sm font-medium">
                      KES {(payout.amount || 0).toLocaleString()}
                    </Text>
                    <View className="px-2 py-1 rounded-full mt-1 bg-gray-200">
                      <Text className="text-xs font-medium text-gray-600">
                        Pending
                      </Text>
                    </View>
                  </View>
                </View>
              </Card>
            )) : (
              <Card className="p-6">
                <View className="items-center">
                  <Text className="text-gray-500 text-sm text-center">
                    No payout schedule available yet
                  </Text>
                </View>
              </Card>
            )}
          </>
        ) : (
          /* Active/Completed Schedule */
          payoutSchedule && payoutSchedule.length > 0 ? payoutSchedule.map((payout) => (
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
          )) : (
            <Card className="p-6">
              <View className="items-center">
                <Text className="text-gray-500 text-sm text-center">
                  No payout schedule available
                </Text>
              </View>
            </Card>
          )
        )}
      </View>
      <View className="h-20" />
    </ScrollView>
  );
};

export default ScheduleTab;
