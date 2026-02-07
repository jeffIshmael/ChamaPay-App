import { Card } from "@/components/ui/Card";
import { Member, PayoutScheduleItem } from "@/constants/mockData";
import { useAuth } from "@/Contexts/AuthContext";
import { useCurrencyStore } from "@/store/useCurrencyStore";
import { useExchangeRateStore } from "@/store/useExchangeRateStore";
import { CheckCircle, Clock } from "lucide-react-native";
import React, { FC, useMemo } from "react";
import { Image, ScrollView, Text, View } from "react-native";

type Props = {
  payoutSchedule: PayoutScheduleItem[];
  currentUserAddress?: string; // Changed to address for better matching
  chamaStatus: "active" | "not started";
  members: Member[];
  contributionAmount: number; // Amount each member contributes
  totalPayout: number; // Total payout per round
  currentCycle?: number;
  currentRound?: number;
};

type PayoutStatus = "completed" | "next" | "upcoming" | "pending";

const getStatusColor = (status: PayoutStatus) => {
  switch (status) {
    case "completed":
      return "bg-green-100 text-green-700";
    case "next":
      return "bg-amber-100 text-amber-700";
    case "upcoming":
      return "bg-blue-100 text-blue-700";
    default:
      return "bg-gray-100 text-gray-700";
  }
};

const getStatusBadgeColor = (status: PayoutStatus) => {
  switch (status) {
    case "completed":
      return "bg-green-200";
    case "next":
      return "bg-amber-200";
    case "upcoming":
      return "bg-blue-200";
    default:
      return "bg-gray-200";
  }
};

const getStatusLabel = (status: PayoutStatus) => {
  switch (status) {
    case "completed":
      return "Paid";
    case "next":
      return "Next";
    case "upcoming":
      return "Upcoming";
    default:
      return "Pending";
  }
};

const ScheduleTab: FC<Props> = ({
  payoutSchedule,
  currentUserAddress,
  chamaStatus,
  members,
  contributionAmount,
  totalPayout,
  currentCycle,
  currentRound,
}) => {
  const { user } = useAuth();
  const { currency } = useCurrencyStore();
  const { rates } = useExchangeRateStore();
  const kesRate = rates["KES"]?.rate || 0;

  // Helper function to find member by address
  const getMemberByAddress = (address: string): Member | undefined => {
    return members.find(
      (m) => m.smartAddress?.toLowerCase() === address.toLowerCase()
    );
  };

  // Helper function to truncate address
  const truncateAddress = (address: string) => {
    if (!address) return "";
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  // Determine payout status based on date and paid flag
  const getPayoutStatus = (
    payout: PayoutScheduleItem,
    index: number
  ): PayoutStatus => {
    if (payout.paid) return "completed";

    const now = new Date();
    const payoutDate = new Date(payout.payDate);

    // Find the first unpaid payout
    const firstUnpaidIndex = payoutSchedule.findIndex((p) => !p.paid);

    if (firstUnpaidIndex === index) return "next";
    if (payoutDate > now) return "upcoming";

    return "pending";
  };

  // Calculate estimated payout amount per member
  const estimatedPayoutAmount = useMemo(() => {
    if (contributionAmount && members.length > 0) {
      return contributionAmount * members.length;
    }
    return totalPayout || 0;
  }, [contributionAmount, members.length, totalPayout]);

  // Check if current user is in this payout
  const isCurrentUserPayout = (address: string) => {
    if (!currentUserAddress) return false;
    return address.toLowerCase() === currentUserAddress.toLowerCase();
  };

  if (chamaStatus === "not started") {
    return (
      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        <View className="flex-1 items-center justify-center px-6 py-16">
          <Image
            source={require("../assets/images/no-schedule.png")}
            className="w-20 h-20 mb-6"
            resizeMode="contain"
          />

          <Text className="text-xl font-semibold text-gray-900 mb-2 text-center">
            No schedule yet
          </Text>

          <Text className="text-sm text-gray-500 text-center leading-6">
            Once the chama starts, a payout schedule will be{" "}
            <Text className="font-medium text-gray-700">
              randomly generated
            </Text>{" "}
            and shared with all members.
          </Text>

          <View className="mt-4 bg-gray-100 px-4 py-3 rounded-xl">
            <Text className="text-xs text-gray-600 text-center">
              Everyone will be notified as soon as the schedule is ready.
            </Text>
          </View>
        </View>

        <View className="h-20" />
      </ScrollView>
    );
  }

  // Active/Completed Schedule
  return (
    <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
      <View className="gap-3">
        {(currentCycle !== undefined || currentRound !== undefined) && (
          <Card className="w-fit mx-auto">
            <View className="border border-downy-500 w-fit px-4 py-2 rounded-lg">
              <Text className="text-downy-500 font-bold">
                Cycle {currentCycle || 1} • Round {currentRound || 1}
              </Text>
            </View>
          </Card>
        )}
        {payoutSchedule && payoutSchedule.length > 0 ? (
          payoutSchedule.map((payout, index) => {
            const status = getPayoutStatus(payout, index);
            const member = getMemberByAddress(payout.userAddress);
            const isUserTurn = isCurrentUserPayout(payout.userAddress);

            return (
              <Card
                key={`${payout.userAddress}-${index}`}
                className={`p-4 border ${payout.paid ? " bg-downy-200/10  border-downy-500 " : ""}`}
              >
                <View className="flex-row items-center justify-between">
                  <View className="flex-row items-center gap-3 flex-1">
                    <View
                      className={`w-8 h-8 rounded-full items-center justify-center ${getStatusColor(
                        status
                      )}`}
                    >
                      {status === "completed" ? (
                        <CheckCircle size={16} color="#059669" />
                      ) : status === "next" ? (
                        <Clock size={16} color="#F59E0B" />
                      ) : (
                        <Text
                          className={`text-sm font-medium ${status === "pending"
                            ? "text-emerald-600"
                            : "text-gray-600"
                            }`}
                        >
                          {index + 1}
                        </Text>
                      )}
                    </View>
                    <View className="flex-1">
                      <Text
                        className={`text-sm font-medium ${member?.name === user?.userName && payout.paid
                          ? "text-downy-600"
                          : "text-gray-900"
                          }`}
                      >
                        {member?.name === user?.userName
                          ? "# You"
                          : member?.name || truncateAddress(payout.userAddress)}
                      </Text>
                      <Text className="text-gray-600 text-xs">
                        {new Date(payout.payDate).toLocaleString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </Text>
                    </View>
                  </View>
                  <View className="items-end">
                    <Text
                      className={`text-sm font-medium ${payout.paid ? "text-emerald-700" : "text-gray-900"
                        }`}
                    >
                      {estimatedPayoutAmount > 0
                        ? currency === "KES" &&
                          kesRate > 0
                          ? `${(estimatedPayoutAmount * kesRate).toFixed(2)} KES`
                          : `${estimatedPayoutAmount.toFixed(3)} USDC`
                        : "—"}
                    </Text>
                    <View
                      className={`px-2 py-1 rounded-full mt-1 ${getStatusBadgeColor(
                        status
                      )}`}
                    >
                      <Text className="text-xs font-medium capitalize">
                        {getStatusLabel(status)}
                      </Text>
                    </View>
                  </View>
                </View>

                {isUserTurn && status !== "completed" && (
                  <View className="mt-3 p-2 bg-amber-50 rounded-lg">
                    <View className="flex-row items-center gap-2">
                      {/* <Info size={14} color="#F59E0B" /> */}
                      <Text className="text-xs text-amber-700">
                        {status === "next"
                          ? "Current payout turn."
                          : "Current payout turn"}
                      </Text>
                    </View>
                  </View>
                )}
              </Card>
            );
          })
        ) : (
          <View className="items-center justify-center py-12">
            <Image
              source={require("../assets/images/no-schedule.png")}
              className="w-48 h-48 mb-6"
              resizeMode="contain"
            />
            <Text className="text-lg font-semibold text-gray-900 mb-2">
              No Payout Schedule
            </Text>
            <Text className="text-sm text-gray-500 text-center px-4">
              There is no payout schedule available for this chama yet.
            </Text>
          </View>
        )}
      </View>
      <View className="h-20" />
    </ScrollView>
  );
};

export default ScheduleTab;
