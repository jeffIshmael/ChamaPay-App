import ChamaOverviewTab from "@/components/ChamaOverviewTab";
import ChatTab from "@/components/ChatTab";
import MembersTab from "@/components/MembersTab";
import ScheduleTab from "@/components/ScheduleTab";
import { TabButton } from "@/components/ui/TabButton";
import { JoinedChama, mockJoinedChamas } from "@/constants/mockData";
import { formatToK } from "@/lib/formatNumbers";
import { useLocalSearchParams, useRouter } from "expo-router";
import { ArrowLeft } from "lucide-react-native";
import React, { useEffect, useState } from "react";
import {
  Alert,
  SafeAreaView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

export default function JoinedChamaDetails() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("overview");
  const [newMessage, setNewMessage] = useState("");
  const [paymentAmount, setPaymentAmount] = useState<string>();
  const [isLoading, setIsLoading] = useState(true);
  const [chama, setChama] = useState<JoinedChama>();

  useEffect(() => {
    setIsLoading(true);
    const selectedChama = mockJoinedChamas.find((c) => c.id === id);
    if (selectedChama) {
      setChama(selectedChama);
      const remainingAmount = Math.max(
        0,
        selectedChama.contribution - selectedChama.myContributions
      );

      setPaymentAmount(remainingAmount.toString());
    }
    setIsLoading(false);
  }, [id]);

  const sendMessage = () => {
    if (newMessage.trim()) {
      Alert.alert("Success", "Message sent");
      setNewMessage("");
    }
  };

  const makePayment = () => {
    Alert.alert("Payment", "Payment logic here...");
  };

  const leaveChama = () => {
    Alert.alert("Leave Chama", "Are you sure you want to leave this chama?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Leave",
        style: "destructive",
        onPress: () => {
          Alert.alert("Success", "Left chama successfully");
          router.back();
        },
      },
    ]);
  };

  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center">
        <Text className="text-gray-600">Fetching chama details...</Text>
      </View>
    );
  }
  if (!chama) {
    return (
      <View className="flex-1 items-center justify-center">
        <Text className="text-gray-600">Chama not found</Text>
      </View>
    );
  }

  const contribution = chama.contribution || 0;
  const myContributions = chama.myContributions || 0;
  const remainingAmount = Math.max(0, contribution - myContributions);
  const nextPayoutAmount = chama.nextPayoutAmount || 0;
  const unreadMessages = chama.unreadMessages || 0;

  const renderOverviewTab = () => (
    <ChamaOverviewTab
      myContributions={myContributions}
      contribution={contribution}
      remainingAmount={remainingAmount}
      paymentAmount={paymentAmount}
      setPaymentAmount={setPaymentAmount}
      makePayment={makePayment}
      contributionDueDate={chama.contributionDueDate}
      currentTurnMember={chama.currentTurnMember}
      recentTransactions={chama.recentTransactions}
      nextPayoutAmount={nextPayoutAmount}
      leaveChama={leaveChama}
    />
  );

  const renderChatTab = () => (
    <ChatTab
      messages={chama.messages}
      newMessage={newMessage}
      setNewMessage={setNewMessage}
      sendMessage={sendMessage}
    />
  );

  const renderScheduleTab = () => (
    <ScheduleTab payoutSchedule={chama.payoutSchedule} />
  );

  const renderMembersTab = () => <MembersTab members={chama.members} />;

  const renderTabContent = () => {
    switch (activeTab) {
      case "overview":
        return renderOverviewTab();
      case "chat":
        return renderChatTab();
      case "schedule":
        return renderScheduleTab();
      case "members":
        return renderMembersTab();
      default:
        return renderOverviewTab();
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      {/* Header */}
      <View className="bg-emerald-600 p-6 pb-4">
        <View className="flex-row items-center justify-between mb-4">
          <TouchableOpacity
            onPress={() => router.back()}
            className="p-2 rounded-full"
            activeOpacity={0.7}
          >
            <ArrowLeft size={20} color="white" />
          </TouchableOpacity>
          <Text className="text-lg text-white font-medium">{chama.name}</Text>
          <View className="w-10" />
        </View>

        <View className="flex-row justify-between">
          <View className="items-center">
            <Text className="text-emerald-100 text-xs">My Position</Text>
            <Text className="text-lg text-white font-semibold">
              #{chama.myPosition}
            </Text>
          </View>
          <View className="items-center">
            <Text className="text-emerald-100 text-xs">My Turn</Text>
            <Text className="text-lg text-white font-semibold">Sep 15</Text>
          </View>
          <View className="items-center">
            <Text className="text-emerald-100 text-xs">Next Payout</Text>
            <Text className="text-lg text-white font-semibold">
              KES {formatToK(nextPayoutAmount)}
            </Text>
          </View>
        </View>
      </View>

      {/* Tabs */}
      <View className="flex-1 px-6 pt-4">
        {/* Tab Navigation */}
        <View className="flex-row bg-gray-100 rounded-lg p-1 mb-4">
          <TabButton
            label="Overview"
            value="overview"
            isActive={activeTab === "overview"}
            onPress={() => setActiveTab("overview")}
          />
          <TabButton
            label="Chat"
            value="chat"
            isActive={activeTab === "chat"}
            onPress={() => setActiveTab("chat")}
            badge={unreadMessages}
          />
          <TabButton
            label="Schedule"
            value="schedule"
            isActive={activeTab === "schedule"}
            onPress={() => setActiveTab("schedule")}
          />
          <TabButton
            label="Members"
            value="members"
            isActive={activeTab === "members"}
            onPress={() => setActiveTab("members")}
          />
        </View>

        {/* Tab Content */}
        <View className="flex-1">{renderTabContent()}</View>
      </View>
    </SafeAreaView>
  );
}
