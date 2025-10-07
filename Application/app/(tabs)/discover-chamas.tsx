import { useAuth } from "@/Contexts/AuthContext";
import { BackendChama, getPublicChamas } from "@/lib/chamaService";
import { useRouter } from "expo-router";
import { Calendar, CalendarClock, Search, Star, Users, Wallet } from "lucide-react-native";
import React, { useState } from "react";
import {
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
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedLocation, setSelectedLocation] = useState("all");
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
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric' 
    });
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

  const renderChamaCard = ({ item: chama }: { item: BackendChama }) => (
    <TouchableOpacity
      key={chama.slug}
      className="bg-white rounded-xl border border-gray-200 p-4 mb-4"
      activeOpacity={0.7}
      onPress={() =>
        router.push({
          pathname: "/chama-details/[id]",
          params: { id: chama.slug },
        })
      }
    >
      <View className="flex-row items-start justify-between mb-3">
        <View className="flex-1">
          <Text className="text-lg font-semibold text-gray-900 mb-2">
            {chama.name}
          </Text>
          <Text className="text-sm text-gray-600 mb-2">{chama.description}</Text>
          
          {/* Rating Section */}
          <View className="flex-row items-center gap-2 mb-3">
            <View className="flex-row items-center gap-1">
              {renderStars((chama.rating ?? 0))}
            </View>
            <Text className="text-sm font-medium text-emerald-600">
              {chama.rating ?? 0}
            </Text>
            <Text className="text-sm text-gray-500">
              ({Math.floor(Math.random() * 50) + 10} ratings)
            </Text>
          </View>
        </View>
      </View>

      <View className="gap-2 mb-3">
        <View className="flex-row justify-between">
          <View className="flex-row items-center gap-2 flex-1">
            <Users size={14} className="text-gray-400" />
            <Text className="text-sm text-gray-600">
              {/* Members count is not included; could be derived via include _count in API */}
              Max {chama.maxNo} members
            </Text>
          </View>
          <View className="flex-row items-center gap-2 flex-1">
            <Wallet size={14} className="text-gray-400" />
            <Text className="text-sm text-gray-600">
              KES {parseFloat(chama.amount).toLocaleString()}
            </Text>
          </View>
        </View>
        <View className="flex-row justify-between">
          <View className="flex-row items-center gap-2 flex-1">
            <CalendarClock size={14} className="text-gray-400" />
            <Text className="text-sm text-gray-600">Every {chama.cycleTime} days</Text>
          </View>
          <View className="flex-row items-center gap-2 flex-1">
            <Calendar size={14} className="text-gray-400" />
            <Text className="text-sm text-gray-600">
              Next payout {formatDate(chama.payDate as unknown as string)}
            </Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView
      className="flex-1 bg-gray-50"
      style={{ paddingTop: insets.top }}
    >
      {/* Header */}
      <View className="bg-white border-b border-gray-200 px-4 pt-2">
        <View className="flex-row items-center gap-4 mb-2">
          <Text className="text-xl font-semibold text-gray-900 flex-1">
            Discover Chamas
          </Text>
        </View>

        {/* Search */}
        <View className="relative mb-4">
          <View className="absolute left-3 top-1/2 -translate-y-1/2 z-10">
            <Search size={20} color="#9ca3af" />
          </View>
          <TextInput
            placeholder="Search chamas by name..."
            value={searchTerm}
            onChangeText={setSearchTerm}
            className="bg-gray-50 border-0 rounded-lg pl-10 pr-4 py-3 text-gray-900"
            placeholderTextColor="#9ca3af"
          />
        </View>
      </View>

      {/* Results */}
      <View className="flex-1 px-4">
        {loading ? (
          <View className="bg-white rounded-xl border border-gray-200 p-8 items-center">
            <Text className="text-gray-600">Loading chamas...</Text>
          </View>
        ) : filteredChamas.length > 0 ? (
          <FlatList
            data={filteredChamas}
            renderItem={renderChamaCard}
            keyExtractor={(item) => item.slug}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 20, paddingTop: 12 }}
          />
        ) : (
          <View className="bg-white rounded-xl border border-gray-200 p-8 items-center">
            <Search size={48} className="text-gray-400 mb-4" />
            {error ? (
              <>
                <Text className="text-lg font-medium text-gray-900 mb-2">Error</Text>
                <Text className="text-sm text-gray-600 text-center">{error}</Text>
              </>
            ) : (
              <>
                <Text className="text-lg font-medium text-gray-900 mb-2">No Chamas Found</Text>
                <Text className="text-sm text-gray-600 text-center">Try adjusting your search or filters</Text>
              </>
            )}
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}
