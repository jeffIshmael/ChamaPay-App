import { JoinedChama } from "@/constants/mockData";
import { useAuth } from "@/Contexts/AuthContext";
import {
  getChamaBySlug,
  getUserChamas,
  transformChamaData,
} from "@/lib/chamaService";
import { decryptChamaSlug, parseChamaShareUrl } from "@/lib/encryption";
import { useExchangeRateStore } from "@/store/useExchangeRateStore";
import { formatDays, formatTimeRemaining } from "@/Utils/helperFunctions";
import * as Clipboard from "expo-clipboard";
import { useFocusEffect, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import {
  ArrowRight,
  Bell,
  Calendar,
  HandCoins,
  Link,
  MessageCircleMore,
  Settings,
  Siren,
  Users,
} from "lucide-react-native";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  ScrollView,
  Text,
  TextInput,
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
  const [showPasteModal, setShowPasteModal] = useState(false);
  const [pasteLink, setPasteLink] = useState("");
  const [isProcessingLink, setIsProcessingLink] = useState(false);
  const { fetchRate: globalFetchRate, rates } = useExchangeRateStore();
  const kesRate = rates["KES"]?.rate || 0;

  // Fetch user's chamas function
  const fetchChamas = useCallback(async () => {
    if (!token || !user) {
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      const response = await getUserChamas(token);
      if (response.success && response.chamas) {
        const transformed = response.chamas.map((member: any) =>
          transformChamaData(member.chama, user.smartAddress)
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
  }, [token, user]);

  // Fetch chamas and update rates on component mount
  useEffect(() => {
    fetchChamas();
    globalFetchRate("KES");
  }, [fetchChamas]);

  // Refresh chamas when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      fetchChamas();
    }, [fetchChamas])
  );

  // Handle paste link functionality
  const handlePasteLink = async () => {
    try {
      const clipboardText = await Clipboard.getStringAsync();
      if (clipboardText) {
        setPasteLink(clipboardText);
        setShowPasteModal(true);
      } else {
        setShowPasteModal(true);
      }
    } catch (error) {
      console.error("Error reading clipboard:", error);
      setShowPasteModal(true);
    }
  };

  // Process the chama link
  const handleProcessLink = async (link: string) => {
    try {
      setIsProcessingLink(true);

      const encryptedSlug = parseChamaShareUrl(link);
      if (!encryptedSlug) {
        Alert.alert(
          "Invalid Link",
          "This doesn't appear to be a valid ChamaPay link."
        );
        setShowPasteModal(false);
        return;
      }

      const originalSlug = decryptChamaSlug(encryptedSlug);
      if (!originalSlug) {
        Alert.alert("Invalid Link", "Unable to decode this chama link.");
        setShowPasteModal(false);
        return;
      }

      // Check if chama exists
      const response = await getChamaBySlug(originalSlug, token!);
      if (response.success && response.chama) {
        const chama = response.chama;

        // Check if user is already a member
        const isMember = chama.members?.some(
          (member) =>
            member.user?.id === user?.id ||
            member.user?.email === user?.email ||
            member.user?.userName === user?.userName
        );

        if (isMember) {
          router.push(`/(tabs)/[joined-chama-details]/${originalSlug}`);
        } else {
          router.push({
            pathname: "/chama-details/[slug]",
            params: { slug: originalSlug },
          });
        }

        setPasteLink("");
        setShowPasteModal(false);
      } else {
        Alert.alert(
          "Chama Not Found",
          "This chama no longer exists or is not available."
        );
        setShowPasteModal(false);
      }
    } catch (error) {
      console.error("Error handling chama link:", error);
      Alert.alert(
        "Error",
        "Failed to process the chama link. Please try again."
      );
      setShowPasteModal(false);
    } finally {
      setIsProcessingLink(false);
    }
  };

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
      className="bg-white rounded-3xl p-5 mb-4 border border-gray-100"
      style={{
        shadowColor: "#10b981",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 4,
      }}
      activeOpacity={onPress ? 0.8 : 1}
    >
      {children}
    </TouchableOpacity>
  );

  return (
    <View className="flex-1 bg-gray-50">
      <StatusBar style="light" backgroundColor="#195556" />
      {/* Header */}
      <View
        className="bg-downy-800 rounded-b-3xl px-5 pb-5 flex-row items-center justify-between"
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
        contentContainerStyle={{
          paddingTop: 20,
          paddingBottom: insets.bottom + 100, // Accounts for safe area
        }}
        showsVerticalScrollIndicator={false}
      >
        <View className="flex-row items-center justify-between mb-5">
          <View className="flex-1">
            <View className="flex-row items-center gap-3 mb-1">
              <Text className="text-2xl font-bold text-gray-900">
                My Chamas
              </Text>
              <Badge color="#10b981" bg="#d1fae5">
                {chamas.length}
              </Badge>
            </View>
            <Text className="text-sm text-gray-500">
              Your active savings groups
            </Text>
          </View>
          <TouchableOpacity
            onPress={handlePasteLink}
            className="p-2 bg-emerald-100 rounded-full"
            activeOpacity={0.7}
          >
            <Link color="#10b981" size={20} />
          </TouchableOpacity>
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
              <View className="flex-row items-start justify-between mb-4">
                <View className="flex-1 pr-3">
                  <View className="flex-row items-center gap-2 mb-2">
                    <Text className="text-xl font-bold text-gray-900">
                      {chama.name}
                    </Text>
                    <View
                      className={`px-2 py-1 rounded-full flex-row items-center gap-1 ${chama.isPublic ? "bg-emerald-100" : "bg-gray-100"
                        }`}
                    >
                      <Text className="text-xs">
                        {chama.isPublic ? "🌍" : "🔒"}
                      </Text>
                      <Text
                        className={`text-xs font-semibold ${chama.isPublic ? "text-emerald-700" : "text-gray-700"
                          }`}
                      >
                        {chama.isPublic ? "Public" : "Private"}
                      </Text>
                    </View>
                  </View>
                  <View className="flex-row items-center gap-4 mb-3">
                    <View className="flex-row items-center bg-emerald-50 px-3 py-1.5 rounded-lg">
                      <Users color="#10b981" size={16} />
                      <Text className="text-sm font-semibold text-emerald-700 ml-1.5">
                        {chama.totalMembers}/{chama.maxMembers}
                      </Text>
                    </View>
                    <View className="flex-row items-center bg-blue-50 px-3 py-1.5 rounded-lg">
                      <HandCoins color="#3b82f6" size={16} />
                      <Text className="text-sm font-semibold text-blue-700 ml-1.5" numberOfLines={1}>
                        {kesRate > 0
                          ? `${(Number(chama.contribution) * kesRate).toLocaleString()} KES (${chama.contribution?.toLocaleString()} ${chama.currency})`
                          : `${chama.contribution?.toLocaleString()} ${chama.currency}`}
                        / {formatDays(Number(chama.duration))}
                      </Text>
                    </View>
                  </View>
                </View>

                {/* Message Icon with Unread Indicator */}
                <TouchableOpacity
                  onPress={() =>
                    router.push({
                      pathname: "/[joined-chama-details]/[id]",
                      params: {
                        "joined-chama-details": chama.slug || `chama-${index}`,
                        id: chama.slug,
                        tab: "chat",
                      },
                    })
                  }
                  className="relative mr-4"
                  activeOpacity={0.7}
                >
                  <MessageCircleMore
                    size={20}
                    color={chama.unreadMessages > 0 ? "#10b981" : "#9ca3af"}
                  />
                  {chama.unreadMessages > 0 && (
                    <View className="absolute -top-1 -right-1 bg-red-500 rounded-full min-w-[16px] h-4 items-center justify-center px-1">
                      <Text className="text-[10px] font-bold text-white">
                        {chama.unreadMessages > 99
                          ? "99+"
                          : chama.unreadMessages}
                      </Text>
                    </View>
                  )}
                </TouchableOpacity>

                <Badge
                  color={chama.status === "active" ? "#047857" : "#9ca3af"}
                  bg={
                    chama.status === "active"
                      ? "#d1fae5"
                      : "rgba(156,163,175,0.2)"
                  }
                >
                  {chama.status}
                </Badge>
              </View>

              {/* Payment Due Alert */}
              {chama.hasOutstandingPayment && (
                <View className=" border border-amber-200 rounded-lg px-3 py-2.5 mb-3 flex-row items-center gap-2">
                  <View className="bg-amber-500 rounded-full p-1">
                    <Siren color="white" size={14} />
                  </View>
                  <View className="flex-1">
                    <Text className="text-sm font-semibold text-amber-900">
                      Payment Alert
                    </Text>
                    <Text className="text-xs text-amber-700">
                      Make your payment before (
                      {new Date(chama.contributionDueDate).toLocaleDateString(
                        "en-US",
                        {
                          month: "short",
                          day: "numeric",
                          // year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        }
                      )}
                      )
                    </Text>
                  </View>
                  <View className="bg-amber-500 rounded-full w-2 h-2" />
                </View>
              )}

              <View className="flex-row items-center justify-between pt-3 border-t border-gray-100">
                <View className="flex-row items-center flex-1">
                  <Calendar color="#6b7280" size={16} />
                  <Text className="text-sm font-medium text-gray-700 ml-2">
                    {chama.status === "active"
                      ? `Next: ${chama.currentTurnMember} ${chama.myTurn ? "{You}" : ""} (${chama.nextPayoutDate})`
                      : `Starts in: ${formatTimeRemaining(chama.startDate)}`}
                  </Text>
                </View>

                {chama.myTurn && (
                  <Badge bg="#059669" color="white">
                    Your Turn
                  </Badge>
                )}
                <ArrowRight color="#10b981" size={18} />
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

      {/* Paste Link Modal */}
      <Modal
        visible={showPasteModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowPasteModal(false)}
      >
        <View className="flex-1 items-center justify-center bg-black/50 px-6">
          <View className="bg-white w-full max-w-sm rounded-3xl p-6 shadow-2xl">
            <Text className="text-2xl font-bold text-gray-900 mb-2">
              Paste Invite Link
            </Text>
            <Text className="text-gray-600 text-sm mb-4">
              Paste the chama invite link below to join
            </Text>

            <TextInput
              value={pasteLink}
              onChangeText={setPasteLink}
              placeholder="Paste link here..."
              className="bg-gray-100 rounded-xl px-4 py-3 text-gray-900 mb-4"
              placeholderTextColor="#9ca3af"
              multiline
            />

            <View className="flex-row gap-3">
              <TouchableOpacity
                onPress={() => {
                  setShowPasteModal(false);
                  setPasteLink("");
                }}
                className="flex-1 bg-gray-200 py-3 rounded-xl"
                activeOpacity={0.7}
              >
                <Text className="text-gray-700 font-semibold text-center">
                  Cancel
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => handleProcessLink(pasteLink)}
                disabled={!pasteLink.trim() || isProcessingLink}
                className={`flex-1 py-3 rounded-xl ${!pasteLink.trim() || isProcessingLink
                  ? "bg-gray-300"
                  : "bg-emerald-600"
                  }`}
                activeOpacity={0.7}
              >
                {isProcessingLink ? (
                  <ActivityIndicator size="small" color="white" />
                ) : (
                  <Text className="text-white font-semibold text-center">
                    Open
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}
