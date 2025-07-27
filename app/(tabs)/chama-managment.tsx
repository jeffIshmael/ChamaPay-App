import {
  ArrowLeft,
  BarChart3,
  Calendar,
  MessageCircle,
  Settings,
  UserPlus,
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

// Mock data - you would import this from your actual data file
const mockMembers = [
  {
    id: "1",
    name: "John Doe",
    role: "admin",
    joined: "Jan 2024",
    contributions: 15000,
    avatar:
      "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=32&h=32&fit=crop&crop=face",
  },
  {
    id: "2",
    name: "Jane Smith",
    role: "member",
    joined: "Feb 2024",
    contributions: 12000,
    avatar:
      "https://images.unsplash.com/photo-1494790108755-2616b612b786?w=32&h=32&fit=crop&crop=face",
  },
  {
    id: "3",
    name: "Mike Johnson",
    role: "member",
    joined: "Mar 2024",
    contributions: 18000,
    avatar:
      "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=32&h=32&fit=crop&crop=face",
  },
];

interface ChamaManagementProps {
  chama: {
    id: string;
    name: string;
    members: number;
    totalMembers: number;
  };
  onNavigate: (screen: string, data?: any) => void;
  onBack: () => void;
}

export default function ChamaManagement({
  chama,
  onNavigate,
  onBack,
}: ChamaManagementProps) {
  const progressPercentage = (chama.members / chama.totalMembers) * 100;
  const totalContributions = mockMembers.reduce(
    (sum, member) => sum + member.contributions,
    0
  );

  const ProgressBar = ({ value }: { value: number }) => (
    <View className="w-full h-2 bg-gray-200 rounded-full mt-2">
      <View
        className="h-full bg-emerald-500 rounded-full"
        style={{ width: `${value}%` }}
      />
    </View>
  );

  const Badge = ({
    children,
    variant = "default",
  }: {
    children: React.ReactNode;
    variant?: "default" | "secondary";
  }) => (
    <View
      className={`px-2 py-1 rounded-full ${variant === "default" ? "bg-gray-900" : "bg-gray-200"}`}
    >
      <Text
        className={`text-xs font-medium ${variant === "default" ? "text-white" : "text-gray-700"}`}
      >
        {children}
      </Text>
    </View>
  );

  const Card = ({
    children,
    className = "",
  }: {
    children: React.ReactNode;
    className?: string;
  }) => (
    <View className={`bg-white rounded-lg border border-gray-200 ${className}`}>
      {children}
    </View>
  );

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      {/* Header */}
      <View className="bg-white border-b border-gray-200 p-4">
        <View className="flex-row items-center space-x-4 mb-4">
          <TouchableOpacity onPress={onBack} className="p-2">
            <ArrowLeft size={20} color="#374151" />
          </TouchableOpacity>
          <View className="flex-1">
            <Text className="text-xl text-gray-900 font-semibold">
              Manage Chama
            </Text>
            <Text className="text-sm text-gray-600">{chama.name}</Text>
          </View>
          <TouchableOpacity className="p-2">
            <Settings size={20} color="#374151" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView className="flex-1 p-4" showsVerticalScrollIndicator={false}>
        {/* Quick Stats */}
        <View className="flex-row gap-4 mb-6">
          <Card className="flex-1 p-4">
            <View className="flex-row items-center space-x-2 mb-2">
              <Users size={20} color="#059669" />
              <Text className="text-sm text-gray-600">Members</Text>
            </View>
            <Text className="text-2xl font-bold text-gray-900">
              {chama.members}/{chama.totalMembers}
            </Text>
            <ProgressBar value={progressPercentage} />
          </Card>

          <Card className="flex-1 p-4">
            <View className="flex-row items-center space-x-2 mb-2">
              <Wallet size={20} color="#2563eb" />
              <Text className="text-sm text-gray-600">Total Pool</Text>
            </View>
            <Text className="text-2xl font-bold text-gray-900">
              KES {totalContributions.toLocaleString()}
            </Text>
            <Text className="text-xs text-gray-500 mt-1">This month</Text>
          </Card>
        </View>

        {/* Quick Actions */}
        <Card className="p-4 mb-6">
          <Text className="text-lg font-semibold text-gray-900 mb-4">
            Quick Actions
          </Text>
          <View className="flex-row flex-wrap gap-3">
            <TouchableOpacity
              className="flex-1 min-w-[45%] border border-gray-300 rounded-lg p-3 flex-row items-center justify-center space-x-2"
              onPress={() => onNavigate("chama-chat", chama)}
            >
              <MessageCircle size={16} color="#374151" />
              <Text className="text-gray-700 font-medium">Open Chat</Text>
            </TouchableOpacity>

            <TouchableOpacity
              className="flex-1 min-w-[45%] border border-gray-300 rounded-lg p-3 flex-row items-center justify-center space-x-2"
              onPress={() => onNavigate("payout-order", chama)}
            >
              <Calendar size={16} color="#374151" />
              <Text className="text-gray-700 font-medium">Payout Schedule</Text>
            </TouchableOpacity>

            <TouchableOpacity className="flex-1 min-w-[45%] border border-gray-300 rounded-lg p-3 flex-row items-center justify-center space-x-2">
              <UserPlus size={16} color="#374151" />
              <Text className="text-gray-700 font-medium">Invite Members</Text>
            </TouchableOpacity>

            <TouchableOpacity className="flex-1 min-w-[45%] border border-gray-300 rounded-lg p-3 flex-row items-center justify-center space-x-2">
              <BarChart3 size={16} color="#374151" />
              <Text className="text-gray-700 font-medium">View Analytics</Text>
            </TouchableOpacity>
          </View>
        </Card>

        {/* Members List */}
        <Card className="p-4">
          <View className="flex-row items-center justify-between mb-4">
            <Text className="text-lg font-semibold text-gray-900">Members</Text>
            <Badge variant="secondary">{mockMembers.length}</Badge>
          </View>
          <View className="space-y-3">
            {mockMembers.map((member, index) => (
              <View
                key={member.id}
                className={`flex-row items-center justify-between p-3 bg-gray-50 rounded-lg ${index < mockMembers.length - 1 ? "mb-3" : ""}`}
              >
                <View className="flex-row items-center space-x-3">
                  <View className="w-8 h-8 rounded-full bg-gray-300 overflow-hidden">
                    <Image
                      source={{ uri: member.avatar }}
                      className="w-full h-full"
                      style={{ resizeMode: "cover" }}
                    />
                  </View>
                  <View>
                    <Text className="text-gray-900 font-medium">
                      {member.name}
                    </Text>
                    <Text className="text-sm text-gray-600">
                      Joined {member.joined}
                    </Text>
                  </View>
                </View>
                <View className="items-end">
                  <Badge
                    variant={member.role === "admin" ? "default" : "secondary"}
                  >
                    {member.role}
                  </Badge>
                  <Text className="text-sm text-gray-600 mt-1">
                    KES {member.contributions.toLocaleString()}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}
