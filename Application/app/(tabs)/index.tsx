import { mockJoinedChamas } from "@/constants/mockData";
import { useAuth } from "@/contexts/AuthContext";
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
import { Image, ScrollView, Text, TouchableOpacity, View } from "react-native";

export default function HomeScreen() {
  const router = useRouter();
  const { user, logout } = useAuth();

  const handleLogout = async () => {
    try {
      await logout();
      router.replace("/auth-screen");
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  // Default avatar URLs based on user's initials
  const getDefaultAvatar = () => {
    const initials = (user?.name || user?.email || 'U')
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
    
    return `https://api.dicebear.com/7.x/initials/svg?seed=${initials}&backgroundColor=ffffff&textColor=10b981`;
  };

  const getUserProfileImage = () => {
    return user?.profileImageUrl || getDefaultAvatar();
  };

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
      <View className="flex-row items-center justify-between  bg-emerald-600 px-3 pb-4 pt-8">
        <View className="flex-row items-center">
          <TouchableOpacity
            onPress={() => router.push("/profile-settings")}
            className="mr-3"
            activeOpacity={0.8}
          >
            <Image
              source={{ uri: getUserProfileImage() }}
              className="w-10 h-10 rounded-full"
              style={{ 
                backgroundColor: '#f3f4f6',
                borderWidth: 2,
                borderColor: 'rgba(255, 255, 255, 0.3)'
              }}
            />
          </TouchableOpacity>
          <View>
            <Text className="text-lg text-white font-medium">Welcome back</Text>
            <Text className="text-emerald-100 text-sm">
              {user?.name || user?.email || "User"}
            </Text>
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
            onLongPress={handleLogout}
            className="p-2"
            activeOpacity={0.7}
          >
            <User color="white" size={20} />
          </TouchableOpacity>
        </View>
      </View>

      {/* My Chamas */}
      <ScrollView
        className="flex-1 px-6"
        style={{ paddingTop: 24 }}
        showsVerticalScrollIndicator={false}
      >
        <View className="flex-row items-center justify-between mb-4">
          <Text className="text-lg text-gray-900 font-semibold">My Chamas</Text>
          <Badge variant="secondary">{mockJoinedChamas.length}</Badge>
        </View>

        <View className="pb-6">
          {mockJoinedChamas.map((chama) => (
            <Card
              key={chama.id}
              onPress={() =>
                router.push({
                  pathname: "/[joined-chama-details]/[id]",
                  params: {
                    "joined-chama-details": chama.id,
                    id: chama.id,
                  },
                })
              }
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
                        {chama.totalMembers}/{chama.maxMembers}
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

          {mockJoinedChamas.length === 0 && (
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
                onPress={() => router.push("/discover-chamas")}
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
