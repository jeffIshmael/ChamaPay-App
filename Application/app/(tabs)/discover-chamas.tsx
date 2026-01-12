import { useAuth } from "@/Contexts/AuthContext";
import { BackendChama, getPublicChamas } from "@/lib/chamaService";
import { useRouter } from "expo-router";
import { Calendar, Search, Star, TrendingUp, Users, Zap, Sparkles } from "lucide-react-native";
import React, { useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Image
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
        fill="#fbbf24"
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
        className="bg-white rounded-2xl p-5 mb-4 active:scale-[0.98] shadow-md border border-gray-100"
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
            <View className="flex-row items-center gap-2 mb-1.5">
              <Text className="text-lg font-bold text-gray-900">
                {chama.name}
              </Text>
              <View className={`px-2.5 py-1 rounded-full flex-row items-center gap-1 ${
                chama.type === "Public" ? "bg-emerald-50 border border-emerald-200" : "bg-gray-100 border border-gray-200"
              }`}>
                <Text className="text-xs">
                  {chama.type === "Public" ? "🌍" : "🔒"}
                </Text>
                <Text className={`text-xs font-semibold ${
                  chama.type === "Public" ? "text-emerald-700" : "text-gray-700"
                }`}>
                  {chama.type}
                </Text>
              </View>
            </View>
            <Text className="text-sm text-gray-600 leading-5" numberOfLines={2}>
              {chama.description}
            </Text>
            {/* Rating Section */}
            <View className="flex-row items-center gap-2 mt-2">
              <View className="flex-row items-center gap-1">
                {renderStars((chama.rating ?? 0))}
              </View>
              <Text className="text-sm font-semibold text-gray-900">
                {chama.rating ?? 0}
              </Text>
              <Text className="text-xs text-gray-500">
                ({chama.raterCount ?? 0})
              </Text>
            </View>
          </View>
          
          {isFilling && (
            <View className="bg-amber-50 px-3 py-1.5 rounded-full flex-row items-center gap-1.5 border border-amber-200">
              <Zap size={14} color="#f59e0b" fill="#f59e0b" />
              <Text className="text-xs font-bold text-amber-700">Filling Fast</Text>
            </View>
          )}
        </View>

        {/* Amount Highlight */}
        <View className="bg-emerald-50 rounded-xl p-4 mb-3 border border-emerald-200">
          <Text className="text-xs text-emerald-700 font-semibold mb-1 uppercase tracking-wide">
            Contribution Amount
          </Text>
          <Text className="text-3xl font-bold text-emerald-800">
            {parseFloat(chama.amount).toLocaleString()} <Text className="text-lg font-semibold text-emerald-600">cUSD</Text>
          </Text>
        </View>

        {/* Stats Grid */}
        <View className="flex-row gap-2.5">
          <View className="flex-1 bg-blue-50 rounded-xl p-3 border border-blue-100">
            <View className="flex-row items-center gap-1.5 mb-1">
              <Users size={16} color="#3b82f6" />
              <Text className="text-xs text-blue-700 font-semibold">Members</Text>
            </View>
            <Text className="text-lg font-bold text-blue-900">
              {chama.members?.length ?? 0}/{chama.maxNo}
            </Text>
          </View>

          <View className="flex-1 bg-purple-50 rounded-xl p-3 border border-purple-100">
            <View className="flex-row items-center gap-1.5 mb-1">
              <Calendar size={16} color="#a855f7" />
              <Text className="text-xs text-purple-700 font-semibold">Starts</Text>
            </View>
            <Text className="text-lg font-bold text-purple-900">
              {formatDate(chama.payDate as unknown as string)}
            </Text>
          </View>

          <View className="flex-1 bg-orange-50 rounded-xl p-3 border border-orange-100">
            <View className="flex-row items-center gap-1.5 mb-1">
              <TrendingUp size={16} color="#f97316" />
              <Text className="text-xs text-orange-700 font-semibold">Cycle</Text>
            </View>
            <Text className="text-lg font-bold text-orange-900">
              {chama.cycleTime}d
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View className="flex-1 bg-gray-50">
      {/* Enhanced Header */}
      <View 
        className="bg-downy-800 px-6 pb-6 rounded-b-3xl shadow-lg" 
        style={{ paddingTop: insets.top + 16 }}
      >
        <View className="flex-row items-center justify-between mb-4">
          <View>
            <Text className="text-3xl font-bold text-white mb-1">
              Discover Chamas
            </Text>
            <Text className="text-sm text-white/80">
              Join global communities and start saving together
            </Text>
          </View>
        </View>

        {/* Search Bar */}
        <View className="relative">
          <View className="absolute left-4 top-1/2 -translate-y-1/2 z-10">
            <Search size={20} color="#6b7280" />
          </View>
          <TextInput
            placeholder="Search chamas by name..."
            value={searchTerm}
            onChangeText={setSearchTerm}
            className="bg-white rounded-2xl pl-12 pr-4 py-4 text-gray-900 text-base shadow-sm"
            placeholderTextColor="#9ca3af"
          />
        </View>
      </View>

      {/* Content */}
      <View className="flex-1 px-6 mb-20">
        {loading ? (
          <View className="flex-1 items-center justify-center">
            <View className=" p-8 items-center">
              <View className=" mb-4">
                <ActivityIndicator size="large" color="#10b981" />
              </View>
              <Text className="text-lg font-bold text-gray-900 mb-2">
                Loading Chamas
              </Text>
              <Text className="text-sm text-gray-600 text-center">
                Discovering amazing communities for you...
              </Text>
            </View>
          </View>
        ) : error ? (
          <View className="flex-1 items-center justify-center px-6">
            <View className="bg-white rounded-3xl p-8 shadow-lg items-center max-w-sm w-full">
              <View className="w-20 h-20 bg-red-100 rounded-full items-center justify-center mb-4 border-4 border-red-50">
                <Text className="text-4xl">⚠️</Text>
              </View>
              <Text className="text-xl font-bold text-gray-900 mb-2">
                Oops! Something went wrong
              </Text>
              <Text className="text-sm text-gray-600 text-center mb-4">
                {error}
              </Text>
              <TouchableOpacity 
                className="bg-emerald-600 px-6 py-3 rounded-full"
                onPress={() => {
                  setLoading(true);
                }}
              >
                <Text className="text-white font-semibold">Try Again</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : filteredChamas.length > 0 ? (
          <FlatList
            data={filteredChamas}
            renderItem={renderChamaCard}
            keyExtractor={(item) => item.slug}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingTop: 20, paddingBottom: 24 }}
          />
        ) : (
          <View className="flex-1 items-center justify-center px-6">
            <View className="rounded-3xl p-8 items-center max-w-sm w-full">
              <View className="w-24 h-24  items-center justify-center mb-5 ">
                {searchTerm ? (
                  <Search size={40} color="#9ca3af" />
                ) : (
                  <Image source={require("@/assets/images/empty.png")} className="w-20 h-20" />
                )}
              </View>
              <Text className="text-xl font-bold text-gray-900 mb-2 text-center">
                {searchTerm ? "No Matches Found" : "No Chamas Available"}
              </Text>
              <Text className="text-sm text-gray-600 text-center mb-6 leading-5">
                {searchTerm 
                  ? "We couldn't find any chamas matching your search. Try different keywords." 
                  : "There are no public chamas at the moment. Check back soon or create your own!"}
              </Text>
              {searchTerm && (
                <TouchableOpacity 
                  className="bg-emerald-600 px-6 py-3 rounded-full flex-row items-center gap-2"
                  onPress={() => setSearchTerm("")}
                >
                  <Text className="text-white font-semibold">Clear Search</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        )}
      </View>
    </View>
  );
}