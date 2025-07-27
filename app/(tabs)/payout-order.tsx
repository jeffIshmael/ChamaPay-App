import {
  ArrowLeft,
  ArrowRight,
  Calendar,
  CheckCircle,
  Clock,
  TrendingUp,
  Users,
  Wallet,
} from "lucide-react-native";
import React from "react";
import {
  Image,
  SafeAreaView,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

interface PayoutOrderProps {
  chama: {
    id: string;
    name: string;
    contribution: number;
    totalMembers: number;
  };
  onBack: () => void;
}

interface PayoutScheduleItem {
  position: number;
  member: {
    id: string;
    name: string;
    avatar: string;
  };
  date: string;
  amount: number;
  status: "completed" | "current" | "upcoming";
}

// Mock data - you would import this from your actual data file
const mockPayoutSchedule: PayoutScheduleItem[] = [
  {
    position: 1,
    member: {
      id: "1",
      name: "Sarah Njeri",
      avatar:
        "https://images.unsplash.com/photo-1494790108755-2616b612b786?w=40&h=40&fit=crop&crop=face",
    },
    date: "2024-01-15",
    amount: 50000,
    status: "completed",
  },
  {
    position: 2,
    member: {
      id: "2",
      name: "Grace Wanjiku",
      avatar:
        "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=40&h=40&fit=crop&crop=face",
    },
    date: "2024-02-15",
    amount: 50000,
    status: "completed",
  },
  {
    position: 3,
    member: {
      id: "3",
      name: "John Kamau",
      avatar:
        "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=40&h=40&fit=crop&crop=face",
    },
    date: "2024-03-15",
    amount: 50000,
    status: "current",
  },
  {
    position: 4,
    member: {
      id: "4",
      name: "Mary Akinyi (You)",
      avatar:
        "https://images.unsplash.com/photo-1494790108755-2616b612b786?w=40&h=40&fit=crop&crop=face",
    },
    date: "2024-04-15",
    amount: 50000,
    status: "upcoming",
  },
  {
    position: 5,
    member: {
      id: "5",
      name: "Peter Mwangi",
      avatar:
        "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=40&h=40&fit=crop&crop=face",
    },
    date: "2024-05-15",
    amount: 50000,
    status: "upcoming",
  },
];

export default function PayoutOrder({ chama, onBack }: PayoutOrderProps) {
  const currentDate = new Date();
  const completedPayouts = mockPayoutSchedule.filter(
    (p) => p.status === "completed"
  ).length;
  const totalPayouts = mockPayoutSchedule.length;
  const progressPercentage = (completedPayouts / totalPayouts) * 100;

  const Badge = ({
    children,
    variant = "default",
    className = "",
  }: {
    children: React.ReactNode;
    variant?: "default" | "secondary" | "outline";
    className?: string;
  }) => {
    const baseClasses = "px-2 py-1 rounded-full";
    const variantClasses = {
      default: "bg-gray-900 text-white",
      secondary: "bg-gray-100 text-gray-700",
      outline: "border border-gray-300 bg-white text-gray-700",
    };

    return (
      <View
        className={`${baseClasses} ${variantClasses[variant]} ${className}`}
      >
        <Text
          className={`text-xs font-medium ${variant === "default" ? "text-white" : "text-gray-700"}`}
        >
          {children}
        </Text>
      </View>
    );
  };

  const Card = ({
    children,
    className = "",
    style,
  }: {
    children: React.ReactNode;
    className?: string;
    style?: object;
  }) => (
    <View
      className={`bg-white rounded-lg border border-gray-200 ${className}`}
      style={style}
    >
      {children}
    </View>
  );

  const ProgressBar = ({ value }: { value: number }) => (
    <View className="w-full h-3 bg-gray-200 rounded-full">
      <View
        className="h-full bg-emerald-500 rounded-full"
        style={{ width: `${value}%` }}
      />
    </View>
  );

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed":
        return <CheckCircle size={20} color="#059669" />;
      case "current":
        return <Clock size={20} color="#2563eb" />;
      default:
        return <Calendar size={20} color="#9ca3af" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "bg-emerald-50 border-emerald-200";
      case "current":
        return "bg-blue-50 border-blue-200";
      default:
        return "bg-gray-50 border-gray-200";
    }
  };

  const getDaysUntil = (dateString: string) => {
    const payoutDate = new Date(dateString);
    const diffTime = payoutDate.getTime() - currentDate.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) return "Completed";
    if (diffDays === 0) return "Today";
    if (diffDays === 1) return "Tomorrow";
    return `${diffDays} days`;
  };

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      {/* Header */}
      <View className="bg-white border-b border-gray-200 p-4">
        <View className="flex-row items-center gap-4 mb-4">
          <TouchableOpacity onPress={onBack} className="p-2">
            <ArrowLeft size={20} color="#374151" />
          </TouchableOpacity>
          <View className="flex-1">
            <Text className="text-xl text-gray-900 font-semibold">
              Payout Order
            </Text>
            <Text className="text-sm text-gray-600">{chama.name}</Text>
          </View>
        </View>

        {/* Progress Overview */}
        <Card className="p-4" style={{ backgroundColor: "#f0fdf4" }}>
          <View className="flex-row items-center justify-between mb-3">
            <View className="flex-row items-center gap-2">
              <TrendingUp size={20} color="#059669" />
              <Text className="text-emerald-700 font-medium">
                Cycle Progress
              </Text>
            </View>
            <Badge variant="secondary" className="bg-emerald-100">
              <Text className="text-emerald-700">
                {completedPayouts}/{totalPayouts} Complete
              </Text>
            </Badge>
          </View>
          <View className="mb-3">
            <ProgressBar value={progressPercentage} />
          </View>
          <View className="flex-row gap-4">
            <View className="flex-1">
              <Text className="text-gray-600 text-sm">Total Pool</Text>
              <Text className="font-medium text-gray-900">
                KES {(chama.contribution * chama.totalMembers).toLocaleString()}
              </Text>
            </View>
            <View className="flex-1">
              <Text className="text-gray-600 text-sm">
                Monthly Contribution
              </Text>
              <Text className="font-medium text-gray-900">
                KES {chama.contribution.toLocaleString()}
              </Text>
            </View>
          </View>
        </Card>
      </View>

      {/* Payout Schedule */}
      <ScrollView className="flex-1 p-4" showsVerticalScrollIndicator={false}>
        <View className="flex-row items-center justify-between mb-4">
          <Text className="text-lg text-gray-900 font-semibold">
            Rotation Schedule
          </Text>
          <Badge variant="outline">Monthly Payouts</Badge>
        </View>

        <View className="gap-3">
          {mockPayoutSchedule.map((payout, index) => (
            <Card
              key={payout.position}
              className={`p-4 ${getStatusColor(payout.status)} ${index < mockPayoutSchedule.length - 1 ? "mb-3" : ""}`}
            >
              <View className="flex-row items-center gap-4">
                {/* Position Number */}
                <View
                  className={`w-12 h-12 rounded-full flex items-center justify-center ${
                    payout.status === "completed"
                      ? "bg-emerald-600"
                      : payout.status === "current"
                        ? "bg-blue-600"
                        : "bg-gray-200"
                  }`}
                >
                  <Text
                    className={`font-medium ${
                      payout.status === "completed" ||
                      payout.status === "current"
                        ? "text-white"
                        : "text-gray-600"
                    }`}
                  >
                    {payout.position}
                  </Text>
                </View>

                {/* Member Info */}
                <View className="flex-1">
                  <View className="flex-row items-center gap-2 mb-1">
                    <View className="w-8 h-8 rounded-full bg-gray-300 overflow-hidden">
                      <Image
                        source={{ uri: payout.member.avatar }}
                        className="w-full h-full"
                        style={{ resizeMode: "cover" }}
                      />
                    </View>
                    <Text className="font-medium text-gray-900">
                      {payout.member.name}
                    </Text>
                    {payout.member.name.includes("You") && (
                      <Badge variant="secondary" className="bg-blue-100">
                        <Text className="text-blue-700">You</Text>
                      </Badge>
                    )}
                  </View>

                  <View className="flex-row gap-4">
                    <View className="flex-row items-center gap-2">
                      <Calendar size={14} color="#9ca3af" />
                      <Text className="text-gray-600 text-sm">
                        {payout.date}
                      </Text>
                    </View>
                    <View className="flex-row items-center gap-2">
                      <Wallet size={14} color="#9ca3af" />
                      <Text className="text-gray-600 text-sm">
                        KES {payout.amount.toLocaleString()}
                      </Text>
                    </View>
                  </View>
                </View>

                {/* Status & Timer */}
                <View className="items-end gap-1">
                  {getStatusIcon(payout.status)}
                  <Text
                    className={`text-xs ${
                      payout.status === "completed"
                        ? "text-emerald-600"
                        : payout.status === "current"
                          ? "text-blue-600"
                          : "text-gray-500"
                    }`}
                  >
                    {getDaysUntil(payout.date)}
                  </Text>
                </View>
              </View>

              {/* Current Payout Details */}
              {payout.status === "current" && (
                <View className="mt-4 pt-4 border-t border-blue-200">
                  <View className="flex-row items-center justify-between">
                    <Text className="text-blue-700 font-medium text-sm">
                      Next Payout
                    </Text>
                    <View className="flex-row items-center gap-1">
                      <Text className="text-blue-600 text-sm">
                        Payout processing
                      </Text>
                      <ArrowRight size={14} color="#2563eb" />
                    </View>
                  </View>
                </View>
              )}

              {/* Your Turn Highlight */}
              {payout.member.name.includes("You") &&
                payout.status === "upcoming" && (
                  <View className="mt-4 pt-4 border-t border-blue-200">
                    <View className="flex-row items-center justify-center">
                      <Users size={16} color="#2563eb" />
                      <Text className="text-blue-700 font-medium text-sm ml-2">
                        Your turn is coming up!
                      </Text>
                    </View>
                  </View>
                )}
            </Card>
          ))}
        </View>

        {/* Help Text */}
        <Card className="p-4 bg-blue-50 border-blue-200 mt-4">
          <Text className="font-medium text-blue-900 mb-2">
            How Payouts Work
          </Text>
          <View className="gap-1">
            <Text className="text-sm text-blue-800">
              • Members receive payouts in order of joining
            </Text>
            <Text className="text-sm text-blue-800">
              • Each member gets the full monthly pool when it&apos;s their turn
            </Text>
            <Text className="text-sm text-blue-800">
              • Payouts are automatically distributed via smart contracts
            </Text>
            <Text className="text-sm text-blue-800">
              • Continue contributing even after receiving your payout
            </Text>
          </View>
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}
