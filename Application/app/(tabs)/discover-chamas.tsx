import { useAuth } from "@/Contexts/AuthContext";
import { BackendChama, getPublicChamas } from "@/lib/chamaService";
import { useRouter } from "expo-router";
import { Calendar, Search, Star, TrendingUp, Users, Zap } from "lucide-react-native";
import React, { useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  SafeAreaView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function DiscoverChamas() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [searchTerm, setSearchTerm] = useState("");
  const { token } = useAuth();
  const [backendChamas, setBackendChamas] = useState<BackendChama[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  React.useEffect(() => {
    const fetchPublic = async () => {
      if (!token) {
        setLoading(false);
        return;
      }
      try {
        setLoading(true);
        const resp = await getPublicChamas(token);
        if (resp.success && resp.chamas) {
          setBackendChamas(resp.chamas);
          setError(null);
        } else {
          setBackendChamas([]);
          setError(resp.error || "Failed to fetch chamas");
        }
      } catch (e) {
        setError("Failed to fetch chamas");
        setBackendChamas([]);
      } finally {
        setLoading(false);
      }
    };
    fetchPublic();
  }, [token]);

  const filteredChamas = backendChamas.filter((chama) => {
    const name = (chama.name || "").toLowerCase();
    const description = (chama.description || "").toLowerCase();
    const matchesSearch =
      name.includes(searchTerm.toLowerCase()) ||
      description.includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const dateStr = date.toLocaleDateString('en-US', {
      month: 'short', 
      day: 'numeric',
    });
   
    return dateStr;
  };

  const renderStars = (rating: number) => {
    return (
      <Star
        size={14}
        color="#fbbf24"
        fill="transparent"
      />
    );
  };

  const getProgressPercentage = (chama: BackendChama) => {
    const current = chama.members?.length || 0;
    const max = chama.maxNo;
    return (current / max) * 100;
  };

  const renderChamaCard = ({ item: chama }: { item: BackendChama }) => {
    const progress = getProgressPercentage(chama);
    const isFilling = progress > 70;

    return (
      <TouchableOpacity
        className="bg-white rounded-2xl p-5 mb-3 active:scale-[0.98] shadow-sm"
        activeOpacity={1}
        onPress={() =>
          router.push({
            pathname: "/chama-details/[slug]",
            params: { slug: chama.slug },
          })
        }
      >
        {/* Header */}
        <View className="flex-row items-start justify-between mb-3">
          <View className="flex-1 pr-3">
            <Text className="text-lg font-bold text-gray-900 mb-1">
              {chama.name}
            </Text>
            <Text className="text-sm text-gray-500 leading-5" numberOfLines={2}>
              {chama.description}
            </Text>
             {/* Rating Section */}
          <View className="flex-row items-center gap-2 mt-2">
            <View className="flex-row items-center gap-1">
              {renderStars((chama.rating ?? 0))}
            </View>
            <Text className="text-sm font-medium text-emerald-600">
              {chama.rating ?? 0}
            </Text>
            <Text className="text-sm text-gray-500">
              ({chama.raterCount ?? 0} ratings)
            </Text>
            </View>
          </View>
          
          {isFilling && (
            <View className="bg-amber-50 px-2.5 py-1 rounded-full flex-row items-center gap-1">
              <Zap size={12} color="#f59e0b" fill="#f59e0b" />
              <Text className="text-xs font-semibold text-amber-700">Filling Fast</Text>
            </View>
          )}
        </View>

        {/* Amount Highlight */}
        <View className=" rounded-xl p-3 mb-3">
          <Text className="text-xs text-emerald-600 font-medium mb-1">Monthly Contribution</Text>
          <Text className="text-2xl font-bold text-emerald-700">
            {parseFloat(chama.amount).toLocaleString()} <Text className="text-base">cUSD</Text>
          </Text>
        </View>

        {/* Stats Grid */}
        <View className="flex-row gap-3 mb-3">
          <View className="flex-1 bg-gray-50 rounded-xl p-3">
            <View className="flex-row items-center gap-1.5 mb-1">
              <Users size={14} color="#6b7280" />
              <Text className="text-xs text-gray-500 font-medium">Members</Text>
            </View>
            <Text className="text-base font-bold text-gray-900">
              {chama.members?.length ?? 0}/{chama.maxNo}
            </Text>
          </View>

          <View className="flex-1 bg-gray-50 rounded-xl p-3">
            <View className="flex-row items-center gap-1.5 mb-1">
              <Calendar size={14} color="#6b7280" />
              <Text className="text-xs text-gray-500 font-medium">Starts</Text>
            </View>
            <Text className="text-base font-bold text-gray-900">
              {formatDate(chama.payDate as unknown as string)}
            </Text>
          </View>

          <View className="flex-1 bg-gray-50 rounded-xl p-3">
            <View className="flex-row items-center gap-1.5 mb-1">
              <TrendingUp size={14} color="#6b7280" />
              <Text className="text-xs text-gray-500 font-medium">Cycle</Text>
            </View>
            <Text className="text-base font-bold text-gray-900">
              {chama.cycleTime}d
            </Text>
          </View>
        </View>

      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView
      className="flex-1 bg-gray-50"
      style={{ paddingTop: insets.top }}
    >
      {/* Clean Header */}
      <View className="bg-white px-6 pt-4 pb-5">
        <Text className="text-2xl font-bold text-gray-900 mb-4">
          Discover Chamas
        </Text>

        {/* Search Bar */}
        <View className="relative">
          <View className="absolute left-4 top-1/2 -translate-y-1/2 z-10">
            <Search size={18} color="#9ca3af" />
          </View>
          <TextInput
            placeholder="Search chamas / paste link to join..."
            value={searchTerm}
            onChangeText={setSearchTerm}
            className="bg-gray-100 rounded-full pl-11 pr-4 py-3 text-gray-900 text-sm"
            placeholderTextColor="#9ca3af"
          />
        </View>
      </View>

      {/* Content */}
      <View className="flex-1 px-6">
        {loading ? (
          <View className="flex-1 items-center justify-center">
            <ActivityIndicator size="large" color="#10b981" />
            <Text className="text-gray-500 mt-3">Loading chamas...</Text>
          </View>
        ) : error ? (
          <View className="flex-1 items-center justify-center px-8">
            <View className="w-16 h-16 bg-red-50 rounded-full items-center justify-center mb-4">
              <Text className="text-3xl">⚠️</Text>
            </View>
            <Text className="text-lg font-bold text-gray-900 mb-2">Error Loading</Text>
            <Text className="text-sm text-gray-600 text-center">{error}</Text>
          </View>
        ) : filteredChamas.length > 0 ? (
          <FlatList
            data={filteredChamas}
            renderItem={renderChamaCard}
            keyExtractor={(item) => item.slug}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingTop: 16, paddingBottom: 20 }}
          />
        ) : (
          <View className="flex-1 items-center justify-center px-8">
            <View className="w-16 h-16 bg-gray-100 rounded-full items-center justify-center mb-4">
              <Search size={28} color="#9ca3af" />
            </View>
            <Text className="text-lg font-bold text-gray-900 mb-2">No Chamas Found</Text>
            <Text className="text-sm text-gray-500 text-center">
              {searchTerm 
                ? "Try a different search term" 
                : "No chamas available at the moment"}
            </Text>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}