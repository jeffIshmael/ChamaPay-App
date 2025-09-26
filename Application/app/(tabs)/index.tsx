import { JoinedChama } from "@/constants/mockData";
import { useAuth } from "@/Contexts/AuthContext";
import { getUserChamas, transformChamaData } from "@/lib/chamaService";
import { useRouter } from "expo-router";
import {
  ArrowRight,
  Bell,
  Calendar,
  Settings,
  Users,
  Wallet
} from "lucide-react-native";
import React, { useEffect, useState } from "react";
import { Image, ScrollView, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";


export default function HomeScreen() {
  const router = useRouter();
  const { user, token } = useAuth();
  const insets = useSafeAreaInsets();
  const [chamas, setChamas] = useState<JoinedChama[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);


  // Fetch user's chamas from backend
  useEffect(() => {
    const fetchChamas = async () => {
      if (!token) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const response = await getUserChamas(token);
        
                  if (response.success && response.chamas) {
            const transformedChamas = response.chamas.map((chamaMember: any) => {
              // Extract the actual chama data from the nested structure
              const chamaData = chamaMember.chama;
              return transformChamaData(chamaData);
            });
            console.log(transformedChamas);
            setChamas(transformedChamas);
          } else {
          setChamas([]);
          if (response.error) {
            setError(response.error);
          }
        }
      } catch (err) {
        console.error('Error fetching chamas:', err);
        setError('Failed to fetch chamas');
        setChamas([]);
      } finally {
        setLoading(false);
      }
    };

    fetchChamas();
  }, [token]);

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
          return { backgroundColor: "#05966x9", color: "white" };
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
  console.log("the user", user);

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
      <View 
        className="flex-row items-center justify-between bg-emerald-600 px-3 pb-4 border-b rounded-b-3xl border-gray-200"
        style={{ paddingTop: insets.top}}
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
                className="w-10 h-10 rounded-full"
                style={{ 
                  backgroundColor: '#f3f4f6',
                  borderWidth: 2,
                  borderColor: 'rgba(255, 255, 255, 0.3)'
                }}
              />
            ) : (
            null
            )}
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
            className="p-2"
            activeOpacity={0.7}
          >
            <Settings color="white" size={20} />
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
          <Badge variant="secondary">{chamas.length}</Badge>
        </View>

        <View className="pb-6">
          {loading ? (
            <View className="items-center py-8">
              <Text className="text-gray-500">Loading chamas...</Text>
            </View>
          ) : error ? (
            <View className="items-center py-8">
              <Text className="text-red-500">{error}</Text>
            </View>
          ) : chamas.length > 0 ? (
            chamas.map((chama: JoinedChama, index: number) => (
              <Card
                key={chama.id || `chama-${index}`}
                onPress={() =>
                  router.push({
                    pathname: "/[joined-chama-details]/[id]",
                    params: {
                      "joined-chama-details": chama.id || `chama-${index}`,
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
                          {chama.currency} {chama.contribution?.toLocaleString() || '0'}
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
          ))
          ) : (
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
