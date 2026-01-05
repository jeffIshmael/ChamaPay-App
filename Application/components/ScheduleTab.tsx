import { Card } from "@/components/ui/Card";
import { Member, PayoutScheduleItem } from "@/constants/mockData";
import { useAuth } from "@/Contexts/AuthContext";
import { CheckCircle, Clock } from "lucide-react-native";
import React, { FC, useMemo } from "react";
import { ScrollView, Text, View } from "react-native";

type Props = {
  payoutSchedule: PayoutScheduleItem[];
  currentUserAddress?: string; // Changed to address for better matching
  chamaStatus: "active" | "not started";
  members: Member[];
  contributionAmount: number; // Amount each member contributes
  totalPayout: number; // Total payout per round
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
}) => {
  const { user } = useAuth();

  // Helper function to find member by address
  const getMemberByAddress = (address: string): Member | undefined => {
    return members.find(
      (m) => m.address?.toLowerCase() === address.toLowerCase()
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
        <View className="gap-3">
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
                The payout schedule will be randomly generated and displayed
                once the chama starts. All members will be notified when the
                schedule is ready.
              </Text>
            </View>
          </Card>

          {/* Position Slots */}
          {/* {members.length > 0 &&
            members.map((member, index) => (
              <Card key={member.id || index} className="p-4">
                <View className="flex-row items-center justify-between">
                  <View className="flex-row items-center gap-3">
                    <View className="w-8 h-8 rounded-full items-center justify-center bg-gray-100">
                      <Text className="text-sm font-medium text-gray-600">
                        {index + 1}
                      </Text>
                    </View>
                    <View>
                      <Text className="text-gray-500 text-sm font-medium">
                        Position {index + 1}
                      </Text>
                      <Text className="text-gray-400 text-xs">
                        {member.address
                          ? truncateAddress(member.address)
                          : "Not assigned"}
                      </Text>
                    </View>
                  </View>
                  <View className="items-end">
                    <Text className="text-gray-500 text-sm font-medium">
                      {estimatedPayoutAmount > 0
                        ? `${estimatedPayoutAmount.toLocaleString()} USDC`
                        : "TBD"}
                    </Text>
                    <View className="px-2 py-1 rounded-full mt-1 bg-gray-200">
                      <Text className="text-xs font-medium text-gray-600">
                        Pending
                      </Text>
                    </View>
                  </View>
                </View>
              </Card>
            ))} */}
        </View>
        <View className="h-20" />
      </ScrollView>
    );
  }

  // Active/Completed Schedule
  return (
    <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
      <View className="gap-3">
        {payoutSchedule && payoutSchedule.length > 0 ? (
          payoutSchedule.map((payout, index) => {
            const status = getPayoutStatus(payout, index);
            const member = getMemberByAddress(payout.userAddress);
            const isUserTurn = isCurrentUserPayout(payout.userAddress);

            return (
              <Card key={`${payout.userAddress}-${index}`} className={`p-4 border ${payout.paid ? " bg-downy-200/10  border-downy-500 " : ""}`}>
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
                          className={`text-sm font-medium ${
                            status === "pending"
                              ? "text-emerald-600"
                              : "text-gray-600"
                          }`}
                        >
                          {index + 1}
                        </Text>
                      )}
                    </View>
                    <View className="flex-1">
                      <Text className={` text-sm font-medium ${member?.name === user?.userName && payout.paid ? "text-downy-600" :"text-gray-900"} `}>
                        {member?.name === user?.userName
                          ? "# You"
                          : (member?.name && member?.name) ||
                            truncateAddress(payout.userAddress)}
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
                    <Text className={`text-sm font-medium ${payout.paid ? "text-emerald-700" : "text-gray-900"}`}>
                      {estimatedPayoutAmount > 0
                        ? `${estimatedPayoutAmount.toLocaleString()} USDC`
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
          <Card className="p-6">
            <View className="items-center">
              <Text className="text-gray-500 text-sm text-center">
                No payout schedule available
              </Text>
            </View>
          </Card>
        )}
      </View>
      <View className="h-20" />
    </ScrollView>
  );
};

export default ScheduleTab;
