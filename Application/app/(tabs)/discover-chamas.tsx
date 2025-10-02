import { mockPublicChamas, PublicChama } from "@/constants/mockData";
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

  const filteredChamas = mockPublicChamas.filter((chama) => {
    const matchesSearch =
      chama.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      chama.description.toLowerCase().includes(searchTerm.toLowerCase())
     

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

  const renderChamaCard = ({ item: chama }: { item: PublicChama }) => (
    <TouchableOpacity
      key={chama.id}
      className="bg-white rounded-xl border border-gray-200 p-4 mb-4"
      activeOpacity={0.7}
      onPress={() =>
        router.push({
          pathname: "/chama-details/[id]",
          params: { id: chama.id },
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
              {renderStars(chama.rating)}
            </View>
            <Text className="text-sm font-medium text-emerald-600">
              {chama.rating}
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
              {chama.members}/{chama.maxMembers} members
            </Text>
          </View>
          <View className="flex-row items-center gap-2 flex-1">
            <Wallet size={14} className="text-gray-400" />
            <Text className="text-sm text-gray-600">
              {chama.currency} {chama.contribution.toLocaleString()}
            </Text>
          </View>
        </View>
        <View className="flex-row justify-between">
          <View className="flex-row items-center gap-2 flex-1">
            <CalendarClock size={14} className="text-gray-400" />
            <Text className="text-sm text-gray-600">{chama.frequency}</Text>
          </View>
          <View className="flex-row items-center gap-2 flex-1">
            <Calendar size={14} className="text-gray-400" />
            <Text className="text-sm text-gray-600">
              Next payout {formatDate(chama.nextPayout)}
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
        {filteredChamas.length > 0 ? (
          <FlatList
            data={filteredChamas}
            renderItem={renderChamaCard}
            keyExtractor={(item) => item.id}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 20, paddingTop: 12 }}
          />
        ) : (
          <View className="bg-white rounded-xl border border-gray-200 p-8 items-center">
            <Search size={48} className="text-gray-400 mb-4" />
            <Text className="text-lg font-medium text-gray-900 mb-2">
              No Chamas Found
            </Text>
            <Text className="text-sm text-gray-600 text-center">
              Try adjusting your search or filters
            </Text>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}
