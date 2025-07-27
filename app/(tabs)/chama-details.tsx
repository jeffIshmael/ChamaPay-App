import { useLocalSearchParams } from "expo-router";
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle,
  Clock,
  Info,
  MapPin,
  Shield,
  Star,
  Users,
  Wallet
} from "lucide-react-native";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  SafeAreaView,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

interface ChamaDetailsProps {
  chama: {
    id: string;
    name: string;
    description: string;
    category: string;
    location: string;
    rating: number;
    members: number;
    maxMembers: number;
    currency: string;
    contribution: number;
    frequency: string;
    collateralRequired: number;
    duration: string;
  };
  onNavigate: (screen: string, data?: any) => void;
  onBack: () => void;
}

interface PayoutScheduleItem {
  position: number;
  member: string;
  status: "completed" | "upcoming" | "available";
  date: string;
}

const payoutSchedule: PayoutScheduleItem[] = [
  {
    position: 1,
    member: "Alice Wanjiku",
    status: "completed",
    date: "2024-12-10",
  },
  {
    position: 2,
    member: "John Kamau",
    status: "completed",
    date: "2025-01-10",
  },
  {
    position: 3,
    member: "Grace Njeri",
    status: "upcoming",
    date: "2025-02-10",
  },
  { position: 4, member: "Available", status: "available", date: "2025-03-10" },
  { position: 5, member: "Available", status: "available", date: "2025-04-10" },
];

export default function ChamaDetails({ chama, onNavigate, onBack }: ChamaDetailsProps) {
  const params = useLocalSearchParams();
  
  const [isJoining, setIsJoining] = useState(false);
  const [activeTab, setActiveTab] = useState<"overview" | "schedule" | "terms">(
    "overview"
  );

  const progressPercentage = (chama.members / chama.maxMembers) * 100;

  const handleJoinChama = async () => {
    Alert.alert(
      "Join Chama",
      `You'll need to lock ${chama.currency} ${chama.collateralRequired.toLocaleString()} as collateral. Continue?`,
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
                { text: "OK", onPress: () => onNavigate("dashboard") },
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
    <View className="space-y-4">
      <View className="bg-white rounded-xl border border-gray-200 p-4">
        <Text className="text-lg font-semibold text-gray-900 mb-3">
          How it Works
        </Text>
        <View className="space-y-3">
          {[
            {
              step: "1",
              title: "Join & Lock Collateral",
              description: `Lock ${chama.currency} ${chama.collateralRequired.toLocaleString()} as collateral to secure your position`,
            },
            {
              step: "2",
              title: "Monthly Contributions",
              description: `Contribute ${chama.currency} ${chama.contribution.toLocaleString()} every month on schedule`,
            },
            {
              step: "3",
              title: "Receive Payout",
              description:
                "Get the total pool when it's your turn in the rotation",
            },
          ].map((item, index) => (
            <View key={index} className="flex-row items-start space-x-3">
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
      </View>

      <View className="bg-white rounded-xl border border-gray-200 p-4">
        <Text className="text-lg font-semibold text-gray-900 mb-3">
          Financial Summary
        </Text>
        <View className="space-y-3">
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
      </View>
    </View>
  );

  const renderSchedule = () => (
    <View className="bg-white rounded-xl border border-gray-200 p-4">
      <Text className="text-lg font-semibold text-gray-900 mb-3">
        Payout Schedule
      </Text>
      <View className="space-y-3">
        {payoutSchedule.map((payout) => (
          <View
            key={payout.position}
            className="flex-row items-center justify-between p-3 bg-gray-50 rounded-lg"
          >
            <View className="flex-row items-center space-x-3">
              <View
                className={`w-8 h-8 rounded-full items-center justify-center ${
                  payout.status === "completed"
                    ? "bg-emerald-100"
                    : payout.status === "upcoming"
                      ? "bg-blue-100"
                      : "bg-gray-200"
                }`}
              >
                <Text
                  className={`text-sm font-medium ${
                    payout.status === "completed"
                      ? "text-emerald-700"
                      : payout.status === "upcoming"
                        ? "text-blue-700"
                        : "text-gray-600"
                  }`}
                >
                  {payout.position}
                </Text>
              </View>
              <View>
                <Text className="font-medium text-gray-900">
                  {payout.member}
                </Text>
                <Text className="text-sm text-gray-600">{payout.date}</Text>
              </View>
            </View>
            <View className="flex-row items-center space-x-2">
              {payout.status === "completed" && (
                <CheckCircle size={16} className="text-emerald-600" />
              )}
              {payout.status === "upcoming" && (
                <Clock size={16} className="text-blue-600" />
              )}
              {payout.status === "available" && (
                <Users size={16} className="text-gray-400" />
              )}
            </View>
          </View>
        ))}
      </View>
    </View>
  );

  const renderTerms = () => (
    <View className="bg-white rounded-xl border border-gray-200 p-4">
      <Text className="text-lg font-semibold text-gray-900 mb-3">
        Terms & Conditions
      </Text>
      <View className="space-y-4">
        <View className="bg-blue-50 border border-blue-200 rounded-lg p-3 flex-row items-start space-x-2">
          <Info size={16} className="text-blue-600 mt-0.5" />
          <Text className="text-sm text-blue-800 flex-1">
            This is a public chama requiring collateral equal to your
            contribution amount.
          </Text>
        </View>

        <View className="space-y-3">
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
                "Can exit before chama starts (full refund)",
                "Early exit after start may forfeit collateral",
                "Group must vote on replacement members",
              ],
            },
          ].map((section, index) => (
            <View key={index}>
              <Text className="font-medium text-gray-900 mb-2">
                {section.title}
              </Text>
              <View className="space-y-1">
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
    </View>
  );

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      {/* Header */}
      <View className="bg-white border-b border-gray-200 p-4">
        <View className="flex-row items-center space-x-4">
          <TouchableOpacity
            onPress={onBack}
            className="p-2 rounded-lg active:bg-gray-100"
          >
            <ArrowLeft size={20} className="text-gray-700" />
          </TouchableOpacity>
          <Text className="text-xl font-semibold text-gray-900 flex-1">
            Chama Details
          </Text>
        </View>
      </View>

      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        {/* Chama Header */}
        <View className="bg-white p-4 border-b border-gray-200">
          <View className="flex-row items-center space-x-2 mb-2">
            <Text className="text-xl font-semibold text-gray-900 flex-1">
              {chama.name}
            </Text>
            <View className="bg-emerald-100 px-3 py-1 rounded-full">
              <Text className="text-emerald-700 text-sm font-medium">
                {chama.category}
              </Text>
            </View>
          </View>

          <Text className="text-gray-600 mb-4">{chama.description}</Text>

          <View className="flex-row items-center space-x-4 mb-4">
            <View className="flex-row items-center space-x-1">
              <Star size={14} className="text-yellow-500" />
              <Text className="text-sm text-gray-500">
                {chama.rating} rating
              </Text>
            </View>
            <View className="flex-row items-center space-x-1">
              <MapPin size={14} className="text-gray-400" />
              <Text className="text-sm text-gray-500">{chama.location}</Text>
            </View>
            <View className="flex-row items-center space-x-1">
              <Clock size={14} className="text-gray-400" />
              <Text className="text-sm text-gray-500">{chama.frequency}</Text>
            </View>
          </View>

          {/* Progress */}
          <View className="mb-4">
            <View className="flex-row items-center justify-between mb-2">
              <Text className="text-sm text-gray-600">Members</Text>
              <Text className="text-sm font-medium text-gray-900">
                {chama.members}/{chama.maxMembers}
              </Text>
            </View>
            <ProgressBar value={progressPercentage} />
          </View>

          {/* Key Stats */}
          <View className="flex-row space-x-4">
            <View className="flex-1 bg-gray-50 border border-gray-200 rounded-lg p-3">
              <View className="flex-row items-center space-x-2 mb-1">
                <Wallet size={16} className="text-emerald-600" />
                <Text className="text-sm text-gray-600">Contribution</Text>
              </View>
              <Text className="font-medium text-gray-900">
                {chama.currency} {chama.contribution.toLocaleString()}
              </Text>
            </View>
            <View className="flex-1 bg-gray-50 border border-gray-200 rounded-lg p-3">
              <View className="flex-row items-center space-x-2 mb-1">
                <Shield size={16} className="text-blue-600" />
                <Text className="text-sm text-gray-600">Collateral</Text>
              </View>
              <Text className="font-medium text-gray-900">
                {chama.currency} {chama.collateralRequired.toLocaleString()}
              </Text>
            </View>
          </View>
        </View>

        {/* Tabs */}
        <View className="p-4">
          <View className="flex-row space-x-2 mb-4 bg-gray-100 rounded-lg p-1">
            <TabButton
              id="overview"
              title="Overview"
              active={activeTab === "overview"}
            />
            <TabButton
              id="schedule"
              title="Schedule"
              active={activeTab === "schedule"}
            />
            <TabButton
              id="terms"
              title="Terms"
              active={activeTab === "terms"}
            />
          </View>

          {activeTab === "overview" && renderOverview()}
          {activeTab === "schedule" && renderSchedule()}
          {activeTab === "terms" && renderTerms()}
        </View>
      </ScrollView>

      {/* Join Button */}
      <View className="bg-white border-t border-gray-200 p-4">
        <View className="bg-orange-50 border border-orange-200 rounded-lg p-3 mb-4 flex-row items-start space-x-2">
          <AlertCircle size={16} className="text-orange-600 mt-0.5" />
          <Text className="text-sm text-orange-800 flex-1">
            You&apos;ll need to lock {chama.currency}{" "}
            {chama.collateralRequired.toLocaleString()} as collateral to join
            this public chama.
          </Text>
        </View>

        <TouchableOpacity
          onPress={handleJoinChama}
          disabled={isJoining}
          className={`w-full py-4 rounded-lg items-center justify-center flex-row space-x-2 ${
            isJoining ? "bg-gray-300" : "bg-emerald-600 active:bg-emerald-700"
          }`}
        >
          {isJoining && <ActivityIndicator size="small" color="white" />}
          <Text className="text-white font-medium text-center">
            {isJoining
              ? "Joining Chama..."
              : `Join Chama (${chama.currency} ${chama.collateralRequired.toLocaleString()} Collateral)`}
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}
