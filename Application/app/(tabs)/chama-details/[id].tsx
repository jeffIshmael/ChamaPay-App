import { mockPublicChamas, PublicChama } from "@/constants/mockData";
import { useLocalSearchParams, useRouter } from "expo-router";
import {
  ArrowLeft,
  Calendar,
  Clock,
  Shield,
  Star,
  Wallet,
} from "lucide-react-native";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  SafeAreaView,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function ChamaDetails() {
  const { id } = useLocalSearchParams();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [chama, setChama] = useState<PublicChama | undefined>();
  const [isLoading, setIsLoading] = useState(true);
  const [isJoining, setIsJoining] = useState(false);
  const [activeTab, setActiveTab] = useState<"overview" | "schedule" | "terms">(
    "overview"
  );
  const [progressPercentage, setProgressPercentage] = useState<number>();

  useEffect(() => {
    setIsLoading(true);
    const selectedChama = mockPublicChamas.find((c) => c.id === id);
    if (selectedChama) {
      setChama(selectedChama);
      setProgressPercentage(
        (selectedChama.members / selectedChama.maxMembers) * 100
      );
    }
    setIsLoading(false);
  }, [id]);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
    });
  };

  const handleJoinChama = async () => {
    Alert.alert(
      "Join Chama",
      "You'll need to lock the required amount as collateral",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Join",
          onPress: async () => {
            setIsJoining(true);
            // Simulate joining process
            setTimeout(() => {
              setIsJoining(false);
              Alert.alert("Success", "Successfully joined the chama!", [
                { text: "OK", onPress: () => router.push("/(tabs)") }, // TODO: Push to the joined chama
              ]);
            }, 2000);
          },
        },
      ]
    );
  };

  const ProgressBar = ({ value }: { value: number }) => (
    <View className="w-full bg-gray-200 rounded-full h-2">
      <View
        className="bg-emerald-600 h-2 rounded-full"
        style={{ width: `${Math.min(value, 100)}%` }}
      />
    </View>
  );

  const TabButton = ({
    id,
    title,
    active,
  }: {
    id: "overview" | "schedule" | "terms";
    title: string;
    active: boolean;
  }) => (
    <TouchableOpacity
      className={`flex-1 py-3 px-4 items-center justify-center rounded-lg ${
        active ? "bg-emerald-100" : "bg-gray-100"
      }`}
      onPress={() => setActiveTab(id)}
    >
      <Text
        className={`text-sm font-medium ${
          active ? "text-emerald-700" : "text-gray-600"
        }`}
      >
        {title}
      </Text>
    </TouchableOpacity>
  );

  const renderOverview = () => (
    <View className="gap-4">
      <View className="bg-white rounded-xl border border-gray-200 p-4">
        <Text className="text-lg font-semibold text-gray-900 mb-3">
          How it Works
        </Text>
        {chama && (
          <View className="gap-3">
            {[
              {
                step: "1",
                title: "Join & Lock Collateral",
                description: `Lock ${chama.currency} ${chama.collateralRequired.toLocaleString()} as collateral to secure your position`,
              },
              {
                step: "2",
                title: "Monthly Contributions",
                description: `Contribute ${chama.currency} ${chama!.contribution.toLocaleString()} every month on schedule`,
              },
              {
                step: "3",
                title: "Receive Payout",
                description:
                  "Get the total pool when it's your turn in the rotation",
              },
            ].map((item, index) => (
              <View key={index} className="flex-row items-start gap-3">
                <View className="w-6 h-6 rounded-full bg-emerald-100 items-center justify-center flex-shrink-0 mt-1">
                  <Text className="text-emerald-600 text-xs font-medium">
                    {item.step}
                  </Text>
                </View>
                <View className="flex-1">
                  <Text className="font-medium text-gray-900 mb-1">
                    {item.title}
                  </Text>
                  <Text className="text-sm text-gray-600">
                    {item.description}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        )}
      </View>

      {/* Admin Terms Section */}
      {chama && chama.adminTerms && (
        <View className="bg-white rounded-xl border border-gray-200 p-4">
          <Text className="text-lg font-semibold text-gray-900 mb-3">
            Admin Requirements
          </Text>
          <View className="gap-2">
            {chama.adminTerms.map((term, index) => (
              <View key={index} className="flex-row items-start gap-3">
                <View
                  className="w-2 h-2 rounded-full bg-emerald-600 flex-shrink-0"
                  style={{ marginTop: 6 }}
                />
                <Text className="text-sm text-gray-600 flex-1">{term}</Text>
              </View>
            ))}
          </View>
        </View>
      )}

      <View className="bg-white rounded-xl border border-gray-200 p-4">
        <Text className="text-lg font-semibold text-gray-900 mb-3">
          Financial Summary
        </Text>
        {chama && (
          <View className="gap-3">
            {[
              [
                "Monthly Contribution:",
                `${chama.currency} ${chama.contribution.toLocaleString()}`,
              ],
              [
                "Total Pool (when full):",
                `${chama.currency} ${(chama.contribution * chama.maxMembers).toLocaleString()}`,
              ],
              ["Duration:", chama.duration],
              [
                "Collateral Required:",
                `${chama.currency} ${chama.collateralRequired.toLocaleString()}`,
              ],
            ].map(([label, value], index) => (
              <View key={index} className="flex-row justify-between">
                <Text className="text-gray-600">{label}</Text>
                <Text className="font-medium text-gray-900">{value}</Text>
              </View>
            ))}
          </View>
        )}
      </View>
    </View>
  );

  const renderTerms = () => (
    <View className="bg-white rounded-xl border border-gray-200 p-4">
      <Text className="text-lg font-semibold text-gray-900 mb-3">
        Terms & Conditions
      </Text>
      <View className="gap-3">
        {[
          {
            title: "Participation Rules:",
            items: [
              "Must contribute on time every month",
              "Collateral will be locked until chama completion",
              "Late payments may result in penalties",
              "Must participate in group communications",
            ],
          },
          {
            title: "Default Protection:",
            items: [
              "Smart contracts ensure automatic execution",
              "Collateral covers missed contributions",
              "Automatic refunds if members default",
              "Transparent blockchain record of all transactions",
            ],
          },
          {
            title: "Exit Policy:",
            items: [
              "Can exit before chama starts (full collateral refund)",
              "Early exit after start may forfeit collateral",
            ],
          },
        ].map((section, index) => (
          <View key={index}>
            <Text className="font-medium text-gray-900 mb-2">
              {section.title}
            </Text>
            <View className="gap-1">
              {section.items.map((item, itemIndex) => (
                <Text key={itemIndex} className="text-sm text-gray-600 pl-4">
                  • {item}
                </Text>
              ))}
            </View>
          </View>
        ))}
      </View>
    </View>
  );

  return (
    <SafeAreaView
      className="flex-1 bg-white"
      style={{ paddingTop: insets.top }}
    >
      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <Text className="text-gray-600">Fetching chama details...</Text>
        </View>
      ) : (
        <View>
          {!chama ? (
            <View className="flex-1 items-center justify-center">
              <Text className="text-gray-600">Chama not found</Text>
            </View>
          ) : (
            <View className="h-full">
              <ScrollView showsVerticalScrollIndicator={false}>
                {/* Chama Header */}
                <View className="bg-white p-4 border-b border-gray-200">
                  <View className="flex-row items-center gap-4 mb-2">
                    <TouchableOpacity
                      onPress={() => router.back()}
                      className="p-2"
                    >
                      <ArrowLeft size={20} className="text-gray-700" />
                    </TouchableOpacity>
                    <View className="flex-row items-center gap-2 flex-1">
                      <Text className="text-xl font-semibold text-gray-900 flex-1">
                        {chama.name}
                      </Text>
                    </View>
                  </View>

                  <Text className="text-gray-600 mb-4">
                    {chama.description}
                  </Text>

                  {/* Start Date and Frequency */}
                  <View className="flex-row items-center gap-6 mb-3">
                    <View className="flex-row items-center gap-2">
                      <Clock size={16} className="text-gray-400" />
                      <Text className="text-sm text-gray-600">
                        {chama.frequency}
                      </Text>
                    </View>
                    <View className="flex-row items-center gap-2">
                      <Calendar size={16} className="text-gray-400" />
                      <Text className="text-sm text-gray-600">
                        Started {formatDate(chama.startDate)}
                      </Text>
                    </View>
                  </View>

                  {/* Rating Section */}
                  <View className="flex-row items-center gap-2 mb-3">
                    <Star size={16} color="#fbbf24" fill="transparent" />
                    <Text className="text-sm font-medium text-gray-700">
                      {chama.rating}
                    </Text>
                    <Text className="text-sm text-gray-500">
                      ({Math.floor(Math.random() * 50) + 10} ratings)
                    </Text>
                  </View>

                  {/* Progress */}
                  <View className="mb-4">
                    <View className="flex-row items-center justify-between mb-2">
                      <Text className="text-sm text-gray-600">Members</Text>
                      <Text className="text-sm font-medium text-gray-900">
                        {chama.members}/{chama.maxMembers}
                      </Text>
                    </View>
                    {progressPercentage && (
                      <ProgressBar value={progressPercentage} />
                    )}
                  </View>

                  {/* Key Stats */}
                  <View className="flex-row gap-4">
                    <View className="flex-1 bg-gray-50 border border-gray-200 rounded-lg p-3">
                      <View className="flex-row items-center gap-2 mb-1">
                        <Wallet size={16} className="text-emerald-600" />
                        <Text className="text-sm text-gray-600">
                          Contribution
                        </Text>
                      </View>
                      <Text className="font-medium text-gray-900">
                        {chama.currency} {chama.contribution.toLocaleString()}
                      </Text>
                    </View>
                    <View className="flex-1 bg-gray-50 border border-gray-200 rounded-lg p-3">
                      <View className="flex-row items-center gap-2 mb-1">
                        <Shield size={16} className="text-blue-600" />
                        <Text className="text-sm text-gray-600">
                          Collateral
                        </Text>
                      </View>
                      <Text className="font-medium text-gray-900">
                        {chama.currency}{" "}
                        {chama.collateralRequired.toLocaleString()}
                      </Text>
                    </View>
                  </View>
                </View>

                {/* Tabs */}
                <View className="p-4">
                  <View className="flex-row gap-2 mb-4 bg-gray-100 rounded-lg p-1">
                    <TabButton
                      id="overview"
                      title="Overview"
                      active={activeTab === "overview"}
                    />
                    <TabButton
                      id="terms"
                      title="Terms"
                      active={activeTab === "terms"}
                    />
                  </View>

                  {activeTab === "overview" && renderOverview()}
                  {activeTab === "terms" && renderTerms()}
                </View>
              </ScrollView>

              {/* Join Button */}
              <View className="bg-white border-t border-gray-200 p-4">
                <TouchableOpacity
                  onPress={handleJoinChama}
                  disabled={isJoining}
                  className={`w-full py-4 rounded-lg items-center justify-center flex-row gap-2 ${
                    isJoining
                      ? "bg-gray-300"
                      : "bg-emerald-600 active:bg-emerald-700"
                  }`}
                >
                  {isJoining && (
                    <ActivityIndicator size="small" color="white" />
                  )}
                  <Text className="text-white font-medium text-center">
                    {isJoining ? "Joining Chama..." : "Join Chama"}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>
      )}
    </SafeAreaView>
  );
}
