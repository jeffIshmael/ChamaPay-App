import { JoinedChama } from "@/constants/mockData";
import { useAuth } from "@/Contexts/AuthContext";
import { getUserChamas, transformChamaData } from "@/lib/chamaService";
import { useFocusEffect, useRouter } from "expo-router";
import {
  ArrowRight,
  Bell,
  Calendar,
  Settings,
  Users,
  Wallet,
} from "lucide-react-native";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Image,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function HomeScreen() {
  const router = useRouter();
  const { user, token } = useAuth();
  const insets = useSafeAreaInsets();
  const [chamas, setChamas] = useState<JoinedChama[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch user's chamas function
  const fetchChamas = useCallback(async () => {
    if (!token) {
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      const response = await getUserChamas(token);
      if (response.success && response.chamas) {
        const transformed = response.chamas.map((member: any) =>
          transformChamaData(member.chama)
        );
        setChamas(transformed);
        setError(null);
      } else {
        setChamas([]);
        setError(response.error || "No chamas found");
      }
    } catch (err) {
      console.error(err);
      setError("Failed to fetch chamas");
      setChamas([]);
    } finally {
      setLoading(false);
    }
  }, [token]);

  // Fetch chamas on component mount
  useEffect(() => {
    fetchChamas();
  }, [fetchChamas]);

  // Refresh chamas when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      fetchChamas();
    }, [fetchChamas])
  );

  const Badge = ({
    children,
    color = "#10b981",
    bg = "#d1fae5",
  }: {
    children: React.ReactNode;
    color?: string;
    bg?: string;
  }) => (
    <View
      className="px-2 py-1 rounded-full"
      style={{ backgroundColor: bg, alignSelf: "flex-start" }}
    >
      <Text className="text-xs font-semibold" style={{ color }}>
        {children}
      </Text>
    </View>
  );

  const Card = ({
    children,
    onPress,
  }: {
    children: React.ReactNode;
    onPress?: () => void;
  }) => (
    <TouchableOpacity
      onPress={onPress}
      className="bg-white rounded-2xl p-4 mb-4 shadow-sm"
      style={{
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 6,
        elevation: 3,
      }}
      activeOpacity={onPress ? 0.8 : 1}
    >
      {children}
    </TouchableOpacity>
  );

  return (
    <View className="flex-1 bg-gray-50">
      {/* Header */}
      <View
        className="bg-emerald-600 rounded-b-3xl px-5 pb-5 flex-row items-center justify-between"
        style={{ paddingTop: insets.top + 10 }}
      >
        <View className="flex-row items-center">
          <TouchableOpacity
            onPress={() => router.push("/profile-settings")}
            className="mr-3"
            activeOpacity={0.8}
          >
            {user?.profileImageUrl ? (
              <Image
                source={{ uri: user.profileImageUrl }}
                className="w-12 h-12 rounded-full border-2 border-white/40"
              />
            ) : (
              <View className="w-12 h-12 rounded-full bg-emerald-500 items-center justify-center border border-white/30">
                <Text className="text-white text-lg font-bold">
                  {user?.userName?.charAt(0)?.toUpperCase() || "U"}
                </Text>
              </View>
            )}
          </TouchableOpacity>
          <View>
            <Text className="text-white/90 text-sm font-medium">
              Welcome back 👋
            </Text>
            <Text className="text-white text-lg font-semibold">
              {user?.userName || "User"}
            </Text>
          </View>
        </View>

        <View className="flex-row">
          <TouchableOpacity
            onPress={() => router.push("/notifications")}
            className="p-2 mr-2"
            activeOpacity={0.7}
          >
            <Bell color="white" size={22} />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => router.push("/profile-settings")}
            className="p-2"
            activeOpacity={0.7}
          >
            <Settings color="white" size={22} />
          </TouchableOpacity>
        </View>
      </View>

      {/* My Chamas */}
      <ScrollView
        className="flex-1 px-5"
        style={{ paddingTop: 20 }}
        showsVerticalScrollIndicator={false}
      >
        <View className="flex-row items-center justify-between mb-4">
          <Text className="text-xl font-bold text-gray-900">My Chamas</Text>
          <Badge>{chamas.length}</Badge>
        </View>

        {loading ? (
          <View className="items-center py-16">
            <ActivityIndicator size="large" color="#10b981" />
            <Text className="text-gray-500 mt-3">Fetching your chamas...</Text>
          </View>
        ) : error ? (
          <View className="items-center py-16">
            <Text className="text-red-500 font-medium mb-2">⚠️ {error}</Text>
          </View>
        ) : chamas.length > 0 ? (
          chamas.map((chama, index) => (
            <Card
              key={chama.id || index}
              onPress={() =>
                router.push({
                  pathname: "/[joined-chama-details]/[id]",
                  params: {
                    "joined-chama-details": chama.slug || `chama-${index}`,
                    id: chama.slug,
                  },
                })
              }
            >
              <View className="flex-row items-center justify-between mb-3">
                <View className="flex-1">
                  <Text className="text-lg font-semibold text-gray-900">
                    {chama.name}
                  </Text>
                  <View className="flex-row items-center mt-1">
                    <Users color="#6b7280" size={14} />
                    <Text className="text-sm text-gray-600 ml-1 mr-3">
                      {chama.totalMembers}/{chama.maxMembers}
                    </Text>
                    <Wallet color="#6b7280" size={14} />
                    <Text className="text-sm text-gray-600 ml-1">
                      {chama.currency}{" "}
                      {chama.contribution?.toLocaleString() || "0"}
                    </Text>
                  </View>
                </View>
                <Badge
                  color={chama.status === "active" ? "#047857" : "#9ca3af"}
                  bg={
                    chama.status === "active" ? "#d1fae5" : "rgba(156,163,175,0.2)"
                  }
                >
                  {chama.status}
                </Badge>
              </View>

              <View className="flex-row items-center justify-between mt-2">
                <View className="flex-row items-center flex-1">
                  <Calendar color="#6b7280" size={14} />
                  <Text className="text-sm text-gray-600 ml-1">
                    Next: {chama.nextTurnMember}
                  </Text>
                </View>
                {chama.myTurn && (
                  <Badge bg="#059669" color="white">
                    🎉 Your Turn
                  </Badge>
                )}
                <ArrowRight color="#9ca3af" size={16} />
              </View>
            </Card>
          ))
        ) : (
          <View className="items-center py-20">
            <Users color="#9ca3af" size={60} />
            <Text className="text-gray-900 font-semibold text-lg mt-4 mb-1">
              No Chamas Yet
            </Text>
            <Text className="text-gray-600 text-sm text-center mb-6 px-6">
              Join or create your first chama to start saving with your
              community 💚
            </Text>
            <TouchableOpacity
              onPress={() => router.push("/discover-chamas")}
              className="px-6 py-3 rounded-xl bg-emerald-600 shadow-md"
              activeOpacity={0.9}
            >
              <Text className="text-white font-semibold text-base">
                🌍 Explore Chamas
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </View>
  );
}
