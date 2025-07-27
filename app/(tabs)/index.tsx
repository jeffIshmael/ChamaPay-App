import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import {
  ArrowRight,
  Bell,
  Calendar,
  User,
  Users,
  Wallet,
} from "lucide-react-native";
import React from "react";
import { ScrollView, Text, TouchableOpacity, View } from "react-native";

// Mock data for chamas (you'll want to move this to a separate constants file)
const mockChamas = [
  {
    id: "1",
    name: "Teachers Savings Group",
    members: 8,
    totalMembers: 10,
    contribution: 5000,
    currency: "KSH",
    status: "active",
    nextTurnMember: "Mary Wanjiku",
    myTurn: false,
    unreadMessages: 3,
  },
  {
    id: "2",
    name: "Weekend Warriors",
    members: 12,
    totalMembers: 12,
    contribution: 2000,
    currency: "KSH",
    status: "active",
    nextTurnMember: "You",
    myTurn: true,
    unreadMessages: 0,
  },
  {
    id: "3",
    name: "Small Business Network",
    members: 6,
    totalMembers: 8,
    contribution: 10000,
    currency: "KSH",
    status: "pending",
    nextTurnMember: "John Kimani",
    myTurn: false,
    unreadMessages: 1,
  },
];

export default function HomeScreen() {
  const router = useRouter();
  const Badge = ({
    children,
    variant = "default",
    style,
  }: {
    children: React.ReactNode;
    variant?: "default" | "secondary" | "destructive";
    style?: any;
  }) => {
    const getVariantStyle = () => {
      switch (variant) {
        case "secondary":
          return { backgroundColor: "#d1fae5", color: "#059669" };
        case "destructive":
          return { backgroundColor: "#fee2e2", color: "#dc2626" };
        default:
          return { backgroundColor: "#059669", color: "white" };
      }
    };

    return (
      <View
        className="px-2 py-1 rounded-full"
        style={[getVariantStyle(), style]}
      >
        <Text
          className="text-xs font-medium"
          style={{ color: getVariantStyle().color }}
        >
          {children}
        </Text>
      </View>
    );
  };

  const Card = ({
    children,
    onPress,
    style,
  }: {
    children: React.ReactNode;
    onPress?: () => void;
    style?: any;
  }) => (
    <TouchableOpacity
      onPress={onPress}
      className="bg-white rounded-xl p-4 mb-4"
      style={[
        {
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.1,
          shadowRadius: 4,
          elevation: 3,
        },
        style,
      ]}
      activeOpacity={onPress ? 0.7 : 1}
    >
      {children}
    </TouchableOpacity>
  );

  return (
    <View className="flex-1 bg-gray-50">
      {/* Header */}
      <LinearGradient
        colors={["#059669", "#047857"]}
        className="px-6 pb-4"
        style={{ paddingTop: 20 }}
      >
        <View className="flex-row items-center justify-between  mt-3 ">
          <View className="flex-row items-center">
            <View
              className="w-10 h-10 rounded-full items-center justify-center mr-3"
              style={{ backgroundColor: "rgba(255, 255, 255, 0.2)" }}
            >
              <User color="white" size={20} />
            </View>
            <View>
              <Text className="text-lg text-white font-medium">
                Welcome back
              </Text>
              <Text className="text-emerald-100 text-sm">Sarah</Text>
            </View>
          </View>
          <View className="flex-row">
            <TouchableOpacity
              onPress={() => router.push("/notifications")}
              className="p-2 mr-2"
              activeOpacity={0.7}
            >
              <Bell color="white" size={20} />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => router.push("/profile-settings")}
              className="p-2"
              activeOpacity={0.7}
            >
              <User color="white" size={20} />
            </TouchableOpacity>
          </View>
        </View>
      </LinearGradient>

      {/* My Chamas */}
      <ScrollView
        className="flex-1 px-6"
        style={{ paddingTop: 24 }}
        showsVerticalScrollIndicator={false}
      >
        <View className="flex-row items-center justify-between mb-4">
          <Text className="text-lg text-gray-900 font-semibold">My Chamas</Text>
          <Badge variant="secondary">{mockChamas.length}</Badge>
        </View>

        <View className="pb-6">
          {mockChamas.map((chama) => (
            <Card
              key={chama.id}
              onPress={() => router.push("/joined-chama-details")}
            >
              <View className="flex-row items-start justify-between mb-3">
                <View className="flex-1">
                  <View className="flex-row items-center mb-1">
                    <Text className="text-gray-900 font-medium mr-2">
                      {chama.name}
                    </Text>
                    {chama.unreadMessages > 0 && (
                      <Badge variant="destructive">
                        {chama.unreadMessages}
                      </Badge>
                    )}
                  </View>
                  <View className="flex-row items-center">
                    <View className="flex-row items-center mr-4">
                      <Users color="#6b7280" size={14} />
                      <Text className="text-sm text-gray-600 ml-1">
                        {chama.members}/{chama.totalMembers}
                      </Text>
                    </View>
                    <View className="flex-row items-center">
                      <Wallet color="#6b7280" size={14} />
                      <Text className="text-sm text-gray-600 ml-1">
                        {chama.currency} {chama.contribution.toLocaleString()}
                      </Text>
                    </View>
                  </View>
                </View>
                <Badge
                  variant={chama.status === "active" ? "secondary" : "default"}
                >
                  {chama.status}
                </Badge>
              </View>

              <View className="flex-row items-center justify-between">
                <View className="flex-row items-center flex-1">
                  <Calendar color="#6b7280" size={14} />
                  <Text className="text-sm text-gray-600 ml-1 mr-2">
                    Next: {chama.nextTurnMember}
                  </Text>
                  {chama.myTurn && (
                    <Badge style={{ backgroundColor: "#059669" }}>
                      Your turn!
                    </Badge>
                  )}
                </View>
                <View className="flex-row">
                  <ArrowRight color="#6b7280" size={16} />
                </View>
              </View>
            </Card>
          ))}

          {mockChamas.length === 0 && (
            <Card style={{ alignItems: "center", paddingVertical: 32 }}>
              <Users color="#9ca3af" size={48} />
              <Text className="text-gray-900 font-medium text-lg mt-4 mb-2">
                No Chamas Yet
              </Text>
              <Text className="text-gray-600 text-sm text-center mb-6">
                Join or create your first chama to start saving with your
                community
              </Text>
              <TouchableOpacity
                onPress={() => router.push("/chama-discovery")}
                className="px-6 py-3 rounded-xl"
                style={{ backgroundColor: "#059669" }}
                activeOpacity={0.8}
              >
                <Text className="text-white font-medium">Explore Chamas</Text>
              </TouchableOpacity>
            </Card>
          )}
        </View>
      </ScrollView>
    </View>
  );
}
