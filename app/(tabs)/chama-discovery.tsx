import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  TextInput,
  FlatList,
} from "react-native";
import {
  ArrowLeft,
  Search,
  Filter,
  Users,
  Wallet,
  Calendar,
  Star,
  Shield,
  MapPin,
} from "lucide-react-native";
import { useRouter } from "expo-router";

interface ChamaDiscoveryProps {
  onNavigate: (screen: string, data?: any) => void;
  onBack: () => void;
}

interface Chama {
  id: string;
  name: string;
  description: string;
  category: string;
  location: string;
  rating: number;
  tags: string[];
  members: number;
  maxMembers: number;
  currency: string;
  contribution: number;
  frequency: string;
  collateralRequired: number;
  nextPayout: string;
}

// Mock data - in a real app, this would come from an API or props
const mockPublicChamas: Chama[] = [
  {
    id: "1",
    name: "Tech Innovators Circle",
    description:
      "A group for tech professionals looking to invest in innovation and personal development.",
    category: "Professional",
    location: "Nairobi",
    rating: 4.8,
    tags: ["Technology", "Innovation", "Networking"],
    members: 45,
    maxMembers: 50,
    currency: "KES",
    contribution: 15000,
    frequency: "Monthly",
    collateralRequired: 50000,
    nextPayout: "Feb 15, 2025",
  },
  {
    id: "2",
    name: "Women Entrepreneurs Fund",
    description:
      "Supporting women-led businesses through collective savings and investment.",
    category: "Business",
    location: "Global",
    rating: 4.9,
    tags: ["Women", "Entrepreneurship", "Business"],
    members: 23,
    maxMembers: 30,
    currency: "KES",
    contribution: 12000,
    frequency: "Monthly",
    collateralRequired: 40000,
    nextPayout: "Mar 1, 2025",
  },
  {
    id: "3",
    name: "Young Professionals Network",
    description:
      "Building financial literacy and wealth among young professionals.",
    category: "Career",
    location: "Mombasa",
    rating: 4.6,
    tags: ["Career", "Young Professionals", "Wealth Building"],
    members: 18,
    maxMembers: 25,
    currency: "KES",
    contribution: 8000,
    frequency: "Monthly",
    collateralRequired: 25000,
    nextPayout: "Feb 28, 2025",
  },
];

const categories = [
  { label: "All Categories", value: "all" },
  { label: "Professional", value: "professional" },
  { label: "Business", value: "business" },
  { label: "Career", value: "career" },
  { label: "Health", value: "health" },
];

const locations = [
  { label: "All Locations", value: "all" },
  { label: "Global", value: "global" },
  { label: "Nairobi", value: "nairobi" },
  { label: "Mombasa", value: "mombasa" },
];

export default function ChamaDiscovery({ onNavigate, onBack }: ChamaDiscoveryProps) {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedLocation, setSelectedLocation] = useState("all");
  const [showFilters, setShowFilters] = useState(false);

  const filteredChamas = mockPublicChamas.filter((chama) => {
    const matchesSearch =
      chama.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      chama.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      chama.tags.some((tag) =>
        tag.toLowerCase().includes(searchTerm.toLowerCase())
      );

    const matchesCategory =
      selectedCategory === "all" ||
      chama.category.toLowerCase() === selectedCategory.toLowerCase();

    const matchesLocation =
      selectedLocation === "all" ||
      chama.location.toLowerCase() === selectedLocation.toLowerCase();

    return matchesSearch && matchesCategory && matchesLocation;
  });

  const renderChamaCard = ({ item: chama }: { item: Chama }) => (
    <TouchableOpacity
      key={chama.id}
      className="bg-white rounded-xl border border-gray-200 p-4 mb-4"
      onPress={() => onNavigate("chama-details", chama)}
      activeOpacity={0.7}
    >
      <View className="flex-row items-start justify-between mb-3">
        <View className="flex-1">
          <View className="flex-row items-center space-x-2 mb-1">
            <Text className="text-lg font-semibold text-gray-900 flex-1">
              {chama.name}
            </Text>
            <View className="bg-blue-100 px-2 py-1 rounded-full">
              <Text className="text-xs font-medium text-blue-700">
                {chama.category}
              </Text>
            </View>
          </View>
          <Text className="text-sm text-gray-600 mb-2">
            {chama.description}
          </Text>

          <View className="flex-row items-center space-x-4 mb-2">
            <View className="flex-row items-center space-x-1">
              <Star size={12} className="text-yellow-500" />
              <Text className="text-xs text-gray-500">{chama.rating}</Text>
            </View>
            <View className="flex-row items-center space-x-1">
              <MapPin size={12} className="text-gray-400" />
              <Text className="text-xs text-gray-500">{chama.location}</Text>
            </View>
          </View>

          <View className="flex-row flex-wrap gap-1 mb-3">
            {chama.tags.map((tag, index) => (
              <View
                key={index}
                className="border border-gray-300 px-2 py-1 rounded-full"
              >
                <Text className="text-xs text-gray-600">{tag}</Text>
              </View>
            ))}
          </View>
        </View>
      </View>

      <View className="space-y-2 mb-3">
        <View className="flex-row justify-between">
          <View className="flex-row items-center space-x-2 flex-1">
            <Users size={14} className="text-gray-400" />
            <Text className="text-sm text-gray-600">
              {chama.members}/{chama.maxMembers} members
            </Text>
          </View>
          <View className="flex-row items-center space-x-2 flex-1">
            <Wallet size={14} className="text-gray-400" />
            <Text className="text-sm text-gray-600">
              {chama.currency} {chama.contribution.toLocaleString()}
            </Text>
          </View>
        </View>
        <View className="flex-row justify-between">
          <View className="flex-row items-center space-x-2 flex-1">
            <Calendar size={14} className="text-gray-400" />
            <Text className="text-sm text-gray-600">{chama.frequency}</Text>
          </View>
          <View className="flex-row items-center space-x-2 flex-1">
            <Shield size={14} className="text-gray-400" />
            <Text className="text-sm text-gray-600">
              {chama.currency} {chama.collateralRequired.toLocaleString()}{" "}
              collateral
            </Text>
          </View>
        </View>
      </View>

      <View className="flex-row items-center justify-between">
        <Text className="text-xs text-gray-500">
          Next payout: {chama.nextPayout}
        </Text>
        <TouchableOpacity
          className="bg-emerald-600 px-4 py-2 rounded-lg active:bg-emerald-700"
          onPress={(e) => {
            e.stopPropagation();
            onNavigate("chama-details", chama);
          }}
        >
          <Text className="text-white font-medium text-sm">View Details</Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );

  const FilterDropdown = ({
    title,
    options,
    selected,
    onSelect,
  }: {
    title: string;
    options: { label: string; value: string }[];
    selected: string;
    onSelect: (value: string) => void;
  }) => (
    <View className="flex-1">
      <Text className="text-sm font-medium text-gray-700 mb-2">{title}</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        className="flex-row space-x-2"
      >
        {options.map((option) => (
          <TouchableOpacity
            key={option.value}
            className={`px-3 py-2 rounded-full border ${
              selected === option.value
                ? "bg-emerald-100 border-emerald-300"
                : "bg-gray-50 border-gray-300"
            }`}
            onPress={() => onSelect(option.value)}
          >
            <Text
              className={`text-sm ${
                selected === option.value ? "text-emerald-700" : "text-gray-600"
              }`}
            >
              {option.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      {/* Header */}
      <View className="bg-white border-b border-gray-200 p-4">
        <View className="flex-row items-center space-x-4 mb-4">
          <TouchableOpacity
            onPress={onBack}
            className="p-2 rounded-lg active:bg-gray-100"
          >
            <ArrowLeft size={20} className="text-gray-700" />
          </TouchableOpacity>
          <Text className="text-xl font-semibold text-gray-900 flex-1">
            Discover Chamas
          </Text>
          <TouchableOpacity
            onPress={() => setShowFilters(!showFilters)}
            className={`p-2 rounded-lg ${showFilters ? "bg-emerald-100" : "active:bg-gray-100"}`}
          >
            <Filter
              size={20}
              className={showFilters ? "text-emerald-600" : "text-gray-700"}
            />
          </TouchableOpacity>
        </View>

        {/* Search */}
        <View className="relative mb-4">
          <View className="absolute left-3 top-1/2 -translate-y-1/2 z-10">
            <Search size={20} className="text-gray-400" />
          </View>
          <TextInput
            placeholder="Search chamas, categories, or tags..."
            value={searchTerm}
            onChangeText={setSearchTerm}
            className="bg-gray-50 border-0 rounded-lg pl-10 pr-4 py-3 text-gray-900"
            placeholderTextColor="#9ca3af"
          />
        </View>

        {/* Filters */}
        {showFilters && (
          <View className="space-y-4">
            <FilterDropdown
              title="Category"
              options={categories}
              selected={selectedCategory}
              onSelect={setSelectedCategory}
            />
            <FilterDropdown
              title="Location"
              options={locations}
              selected={selectedLocation}
              onSelect={setSelectedLocation}
            />
          </View>
        )}
      </View>

      {/* Results */}
      <View className="flex-1 p-4">
        <View className="flex-row items-center justify-between mb-4">
          <Text className="text-sm text-gray-600">
            {filteredChamas.length} chamas available
          </Text>
          <View className="bg-emerald-100 px-3 py-1 rounded-full">
            <Text className="text-emerald-700 text-sm font-medium">
              Public Chamas
            </Text>
          </View>
        </View>

        {filteredChamas.length > 0 ? (
          <FlatList
            data={filteredChamas}
            renderItem={renderChamaCard}
            keyExtractor={(item) => item.id}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 20 }}
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
