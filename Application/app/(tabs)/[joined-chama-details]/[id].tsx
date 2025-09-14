import ChamaOverviewTab from "@/components/ChamaOverviewTab";
import ChatTab from "@/components/ChatTab";
import MembersTab from "@/components/MembersTab";
import PaymentModal from "@/components/PaymentModal";
import ScheduleTab from "@/components/ScheduleTab";
import { TabButton } from "@/components/ui/TabButton";
import { JoinedChama } from "@/constants/mockData";
import { useAuth } from "@/contexts/AuthContext";
import { getChamaBySlug, transformChamaData } from "@/lib/chamaService";
import { formatToK } from "@/lib/formatNumbers";
import { useLocalSearchParams, useRouter } from "expo-router";
import { ArrowLeft } from "lucide-react-native";
import React, { useEffect, useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

export default function JoinedChamaDetails() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const { user, token } = useAuth();
  const [activeTab, setActiveTab] = useState("overview");
  const [newMessage, setNewMessage] = useState("");
  const [paymentAmount, setPaymentAmount] = useState<string>();
  const [isLoading, setIsLoading] = useState(true);
  const [chama, setChama] = useState<JoinedChama | null>(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);

  useEffect(() => {
    const fetchChama = async () => {
    if (!token) {   
      Alert.alert("Error", "Please login to continue");
      return;
    }
    setIsLoading(true);
    console.log(" the id", id);
    const response = await getChamaBySlug(id as string, token);
    if (response.success && response.chama) {
      const transformedChama = transformChamaData(response.chama);
      console.log(transformedChama);
      setChama(transformedChama);
      
      // Set payment amount for the payment modal
      const remainingAmount = Math.max(
        0,
        transformedChama.contribution - transformedChama.myContributions
      );
      setPaymentAmount(remainingAmount.toString());
    } else {
      setChama(null);
      if (response.error) {
        Alert.alert("Error", response.error);
      }
    }
    setIsLoading(false);
  };
  fetchChama();
  }, [id, token]);

  const sendMessage = () => {
    if (newMessage.trim()) {
      Alert.alert("Success", "Message sent");
      setNewMessage("");
    }
  };

  const makePayment = () => {
    if (!paymentAmount || parseFloat(paymentAmount) <= 0) {
      Alert.alert("Error", "Please enter a valid amount");
      return;
    }

    // Show the payment modal instead of Alert
    setShowPaymentModal(true);
  };

  const handlePaymentSuccess = () => {
    // Handle successful payment
    if (chama && paymentAmount) {
      const updatedChama = {
        ...chama,
        myContributions: chama.myContributions + parseFloat(paymentAmount),
      };
      setChama(updatedChama);
      setPaymentAmount("");
    }
    setShowPaymentModal(false);
    Alert.alert("Success", "Payment processed successfully!");
  };

  const handlePaymentClose = () => {
    setShowPaymentModal(false);
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
    <View className="flex-1 bg-gray-50">
      {/* Header */}
      <SafeAreaView className=" bg-emerald-600">
        <View className="p-6 pb-4">
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
              {formatToK(chama.totalContributions)} {chama.currency} 
            </Text>
          </View>
        </View>
        </View>
      </SafeAreaView>

      {/* Tabs */}
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        className="flex-1"
        keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 0}
      >
        <View className={`flex-1 pt-4 ${activeTab === "chat" ? "" : "px-6"}`}>
          {/* Tab Navigation */}
          <View className={`flex-row bg-gray-100 rounded-lg p-1 mb-4 ${activeTab === "chat" ? "mx-6" : ""}`}>
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
      </KeyboardAvoidingView>

      {/* Payment Modal */}
      {showPaymentModal && (
        <PaymentModal
          visible={showPaymentModal}
          onClose={handlePaymentClose}
          onSuccess={handlePaymentSuccess}
          chamaId={parseInt(id as string)}
          chamaBlockchainId={1} // Default blockchain ID since it's not in the interface
          chamaName={chama.name}
        />
      )}
    </View>
  );
}
