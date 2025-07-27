import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle,
  DollarSign,
  ExternalLink,
  History,
  Info,
  LogOut,
  Mail,
  MessageCircle,
  Phone,
  Send,
  TrendingUp,
} from "lucide-react-native";
import React, { useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

interface JoinedChamaDetailsProps {
  chama: any;
  onNavigate: (screen: string, data?: any) => void;
  onBack: () => void;
}

interface Member {
  id: number;
  name: string;
  phone: string;
  email: string;
  role: string;
  contributions: number;
  status: string;
}

interface Message {
  id: number;
  sender: string;
  message: string;
  time: string;
  isAdmin?: boolean;
}

interface PayoutScheduleItem {
  position: number;
  member: string;
  date: string;
  status: string;
  amount: number;
}

interface Transaction {
  id: number;
  type: string;
  amount: number;
  date: string;
  status: string;
}

export default function JoinedChamaDetails({
  chama,
  onNavigate,
  onBack,
}: JoinedChamaDetailsProps) {
  const [activeTab, setActiveTab] = useState("overview");
  const [newMessage, setNewMessage] = useState("");
  const [paymentAmount, setPaymentAmount] = useState<string>(
    (chama?.contribution || 5000).toString()
  );

  // Ensure chama has default values to prevent undefined errors
  const defaultChama = {
    id: "",
    name: "Chama",
    contribution: 5000,
    currency: "KES",
    members: 5,
    totalMembers: 5,
    status: "active",
    unreadMessages: 0,
    nextTurnMember: "John Doe",
    myTurn: false,
    ...chama,
  };

  // Mock data for joined chama with enhanced information
  const chamaData = {
    ...defaultChama,
    myPosition: 3,
    totalContributions: 15000,
    myContributions: 3000,
    nextPayoutDate: "2024-08-15",
    nextPayoutAmount: 45000,
    currentTurnMember: "John Kamau",
    myTurnDate: "2024-09-15",
    contributionDueDate: "2024-07-30",
    penaltyAmount: 500,
    hasOutstandingPayment: true,
    messages: [
      {
        id: 1,
        sender: "Admin",
        message:
          "Welcome to Savings Champions! Please make sure to contribute by the 30th of each month.",
        time: "2 hours ago",
        isAdmin: true,
      },
      {
        id: 2,
        sender: "Mary Wanjiru",
        message:
          "Has everyone made their contribution this month? The deadline is approaching.",
        time: "1 hour ago",
      },
      {
        id: 3,
        sender: "John Kamau",
        message: "Yes, just sent mine. Thanks for the reminder! 💪",
        time: "45 min ago",
      },
      {
        id: 4,
        sender: "Admin",
        message:
          "All contributions received except 2 members. Next payout is scheduled for Aug 15.",
        time: "30 min ago",
        isAdmin: true,
      },
    ] as Message[],
    payoutSchedule: [
      {
        position: 1,
        member: "Mary Wanjiru",
        date: "2024-07-15",
        status: "completed",
        amount: 45000,
      },
      {
        position: 2,
        member: "John Kamau",
        date: "2024-08-15",
        status: "current",
        amount: 45000,
      },
      {
        position: 3,
        member: "You (Sarah)",
        date: "2024-09-15",
        status: "upcoming",
        amount: 45000,
      },
      {
        position: 4,
        member: "Peter Maina",
        date: "2024-10-15",
        status: "upcoming",
        amount: 45000,
      },
      {
        position: 5,
        member: "Grace Njeri",
        date: "2024-11-15",
        status: "upcoming",
        amount: 45000,
      },
    ] as PayoutScheduleItem[],
    members: [
      {
        id: 1,
        name: "Mary Wanjiru",
        phone: "+254 712 345 678",
        email: "mary@email.com",
        role: "Admin",
        contributions: 5000,
        status: "active",
      },
      {
        id: 2,
        name: "John Kamau",
        phone: "+254 701 234 567",
        email: "john@email.com",
        role: "Member",
        contributions: 5000,
        status: "active",
      },
      {
        id: 3,
        name: "You (Sarah)",
        phone: "+254 722 345 678",
        email: "sarah@email.com",
        role: "Member",
        contributions: 3000,
        status: "pending",
      },
      {
        id: 4,
        name: "Peter Maina",
        phone: "+254 733 456 789",
        email: "peter@email.com",
        role: "Member",
        contributions: 2000,
        status: "pending",
      },
      {
        id: 5,
        name: "Grace Njeri",
        phone: "+254 744 567 890",
        email: "grace@email.com",
        role: "Member",
        contributions: 5000,
        status: "active",
      },
    ] as Member[],
    recentTransactions: [
      {
        id: 1,
        type: "contribution",
        amount: 3000,
        date: "2024-07-20",
        status: "completed",
      },
      {
        id: 2,
        type: "penalty",
        amount: 500,
        date: "2024-06-30",
        status: "completed",
      },
      {
        id: 3,
        type: "contribution",
        amount: 5000,
        date: "2024-06-15",
        status: "completed",
      },
    ] as Transaction[],
  };

  const Badge = ({
    children,
    variant = "default",
    className = "",
  }: {
    children: React.ReactNode;
    variant?: "default" | "secondary" | "destructive";
    className?: string;
  }) => {
    const baseClasses = "px-2 py-1 rounded-full";
    const variantClasses = {
      default: "bg-gray-900 text-white",
      secondary: "bg-gray-100 text-gray-700",
      destructive: "bg-red-500 text-white",
    };

    return (
      <View
        className={`${baseClasses} ${variantClasses[variant]} ${className}`}
      >
        <Text
          className={`text-xs font-medium ${variant === "default" ? "text-white" : variant === "destructive" ? "text-white" : "text-gray-700"}`}
        >
          {children}
        </Text>
      </View>
    );
  };

  const Card = ({
    children,
    className = "",
  }: {
    children: React.ReactNode;
    className?: string;
  }) => (
    <View className={`bg-white rounded-lg border border-gray-200 ${className}`}>
      {children}
    </View>
  );

  const ProgressBar = ({ value }: { value: number }) => (
    <View className="w-full h-2 bg-gray-200 rounded-full">
      <View
        className="h-full bg-emerald-500 rounded-full"
        style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
      />
    </View>
  );

  const AlertCard = ({
    children,
    type = "warning",
  }: {
    children: React.ReactNode;
    type?: "warning" | "error";
  }) => (
    <View
      className={`rounded-lg border p-4 ${
        type === "warning"
          ? "border-orange-200 bg-orange-50"
          : "border-red-200 bg-red-50"
      }`}
    >
      {children}
    </View>
  );

  const TabButton = ({
    label,
    value,
    isActive,
    onPress,
    badge,
  }: {
    label: string;
    value: string;
    isActive: boolean;
    onPress: () => void;
    badge?: number;
  }) => (
    <TouchableOpacity
      onPress={onPress}
      className={`flex-1 py-2 px-1 rounded-lg ${
        isActive ? "bg-emerald-100" : "bg-gray-100"
      }`}
    >
      <View className="items-center">
        <Text
          className={`text-xs font-medium ${
            isActive ? "text-emerald-700" : "text-gray-600"
          }`}
        >
          {label}
        </Text>
        {badge && badge > 0 && (
          <View className="absolute -top-1 -right-1">
            <Badge variant="destructive">{badge}</Badge>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );

  const sendMessage = () => {
    if (newMessage.trim()) {
      Alert.alert("Success", "Message sent");
      setNewMessage("");
    }
  };

  const makePayment = () => {
    onNavigate("payment", {
      chama: chamaData,
      amount: parseInt(paymentAmount) || 0,
      type: "monthly-contribution",
      dueDate: chamaData.contributionDueDate,
    });
  };

  const makeFullPayment = () => {
    const contribution = chamaData.contribution || 0;
    const myContributions = chamaData.myContributions || 0;
    const penaltyAmount = chamaData.penaltyAmount || 0;
    const totalDue =
      contribution -
      myContributions +
      (chamaData.hasOutstandingPayment ? penaltyAmount : 0);

    onNavigate("payment", {
      chama: chamaData,
      amount: totalDue,
      type: "full-payment",
      includesPenalty: chamaData.hasOutstandingPayment,
    });
  };

  const leaveChama = () => {
    Alert.alert(
      "Leave Chama",
      "Are you sure you want to leave this chama? You may forfeit contributions made so far.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Leave",
          style: "destructive",
          onPress: () => {
            Alert.alert("Success", "Left chama successfully");
            onBack();
          },
        },
      ]
    );
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "bg-green-100 text-green-700";
      case "current":
        return "bg-emerald-100 text-emerald-700";
      case "upcoming":
        return "bg-gray-100 text-gray-700";
      default:
        return "bg-gray-100 text-gray-700";
    }
  };

  const getMemberStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-green-100 text-green-700";
      case "pending":
        return "bg-orange-100 text-orange-700";
      case "new":
        return "bg-blue-100 text-blue-700";
      default:
        return "bg-gray-100 text-gray-700";
    }
  };

  // Safe calculations with default values
  const contribution = chamaData.contribution || 0;
  const myContributions = chamaData.myContributions || 0;
  const penaltyAmount = chamaData.penaltyAmount || 0;
  const remainingAmount = Math.max(0, contribution - myContributions);
  const totalDue =
    remainingAmount + (chamaData.hasOutstandingPayment ? penaltyAmount : 0);
  const nextPayoutAmount = chamaData.nextPayoutAmount || 0;
  const totalContributions = chamaData.totalContributions || 0;
  const unreadMessages = chamaData.unreadMessages || 0;

  const renderOverviewTab = () => (
    <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
      {/* Quick Actions */}
      <View className="flex-row gap-3 mb-4">
        <TouchableOpacity
          onPress={makePayment}
          className="flex-1 bg-emerald-600 p-4 rounded-lg items-center"
        >
          <DollarSign size={20} color="#ffffff" />
          <Text className="text-white text-sm font-medium mt-1">
            Make Payment
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => setActiveTab("chat")}
          className="flex-1 border border-gray-300 p-4 rounded-lg items-center relative"
        >
          <MessageCircle size={20} color="#374151" />
          <Text className="text-gray-700 text-sm font-medium mt-1">
            Open Chat
          </Text>
          {unreadMessages > 0 && (
            <View className="absolute -top-1 -right-1">
              <Badge variant="destructive">{unreadMessages}</Badge>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* Contribution Progress */}
      <Card className="p-4 mb-4">
        <View className="flex-row items-center justify-between mb-3">
          <Text className="text-gray-900 font-medium">
            This Month&apos;s Contribution
          </Text>
          <Badge
            variant={myContributions >= contribution ? "default" : "secondary"}
          >
            <Text
              className={
                myContributions >= contribution
                  ? "text-white"
                  : "text-orange-700"
              }
            >
              {myContributions >= contribution ? "Complete" : "Pending"}
            </Text>
          </Badge>
        </View>
        <View className="space-y-3">
          <View className="flex-row justify-between">
            <Text className="text-sm text-gray-600">
              KES {myContributions.toLocaleString()}
            </Text>
            <Text className="text-sm text-gray-900">
              KES {contribution.toLocaleString()}
            </Text>
          </View>
          <ProgressBar
            value={
              contribution > 0 ? (myContributions / contribution) * 100 : 0
            }
          />
          {myContributions >= contribution ? (
            <Text className="text-xs text-green-600">
              ✓ Thank you for your contribution this month!
            </Text>
          ) : (
            <View className="space-y-2">
              <Text className="text-xs text-gray-600">
                KES {remainingAmount.toLocaleString()} remaining • Due:{" "}
                {chamaData.contributionDueDate}
              </Text>
              <View className="flex-row space-x-2">
                <TextInput
                  value={paymentAmount}
                  onChangeText={setPaymentAmount}
                  keyboardType="numeric"
                  className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm"
                  placeholder="Amount"
                />
                <TouchableOpacity
                  onPress={makePayment}
                  className="bg-emerald-600 px-4 py-2 rounded-lg"
                >
                  <Text className="text-white text-sm font-medium">Pay</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>
      </Card>

      {/* Next Payout Info */}
      <Card className="p-4 mb-4">
        <View className="flex-row items-center space-x-3 mb-3">
          <View className="w-8 h-8 rounded-full bg-emerald-100 items-center justify-center">
            <TrendingUp size={16} color="#059669" />
          </View>
          <View>
            <Text className="text-gray-900 font-medium">Next Payout</Text>
            <Text className="text-sm text-gray-600">August 15, 2024</Text>
          </View>
        </View>
        <View className="space-y-2">
          <View className="flex-row justify-between">
            <Text className="text-gray-600 text-sm">Recipient:</Text>
            <Text className="text-gray-900 text-sm">
              {chamaData.currentTurnMember}
            </Text>
          </View>
          <View className="flex-row justify-between">
            <Text className="text-gray-600 text-sm">Amount:</Text>
            <Text className="text-gray-900 text-sm">
              KES {nextPayoutAmount.toLocaleString()}
            </Text>
          </View>
          <View className="flex-row justify-between">
            <Text className="text-gray-600 text-sm">Your turn:</Text>
            <Text className="text-emerald-600 text-sm font-medium">
              September 15, 2024
            </Text>
          </View>
        </View>
      </Card>

      {/* Chama Statistics */}
      <Card className="p-4 mb-4">
        <Text className="text-gray-900 font-medium mb-3">Chama Statistics</Text>
        <View className="flex-row flex-wrap gap-4">
          <View className="flex-1 min-w-[45%]">
            <Text className="text-gray-600 text-xs">Total Pool</Text>
            <Text className="text-lg text-gray-900 font-semibold">
              KES {totalContributions.toLocaleString()}
            </Text>
          </View>
          <View className="flex-1 min-w-[45%]">
            <Text className="text-gray-600 text-xs">Active Members</Text>
            <Text className="text-lg text-gray-900 font-semibold">
              {
                chamaData.members.filter((m: any) => m.status === "active")
                  .length
              }
              /{chamaData.members.length}
            </Text>
          </View>
          <View className="flex-1 min-w-[45%]">
            <Text className="text-gray-600 text-xs">
              My Total Contributions
            </Text>
            <Text className="text-lg text-gray-900 font-semibold">
              KES{" "}
              {chamaData.recentTransactions
                .filter((t: any) => t.type === "contribution")
                .reduce((sum: any, t: any) => sum + (t.amount || 0), 0)
                .toLocaleString()}
            </Text>
          </View>
          <View className="flex-1 min-w-[45%]">
            <Text className="text-gray-600 text-xs">Completion Rate</Text>
            <Text className="text-lg text-gray-900 font-semibold">60%</Text>
          </View>
        </View>
      </Card>

      {/* Recent Transactions */}
      <Card className="p-4 mb-4">
        <View className="flex-row items-center justify-between mb-3">
          <Text className="text-gray-900 font-medium">Recent Transactions</Text>
          <TouchableOpacity onPress={() => onNavigate("transaction-history")}>
            <ExternalLink size={14} color="#059669" />
          </TouchableOpacity>
        </View>
        <View className="space-y-2">
          {chamaData.recentTransactions.slice(0, 3).map((transaction: any) => (
            <View
              key={transaction.id}
              className="flex-row items-center justify-between py-2"
            >
              <View className="flex-row items-center space-x-3">
                <View
                  className={`w-6 h-6 rounded-full items-center justify-center ${
                    transaction.type === "contribution"
                      ? "bg-emerald-100"
                      : "bg-orange-100"
                  }`}
                >
                  <DollarSign
                    size={12}
                    color={
                      transaction.type === "contribution"
                        ? "#059669"
                        : "#ea580c"
                    }
                  />
                </View>
                <View>
                  <Text className="text-sm text-gray-900 capitalize">
                    {transaction.type}
                  </Text>
                  <Text className="text-xs text-gray-600">
                    {transaction.date}
                  </Text>
                </View>
              </View>
              <Text className="text-sm text-gray-900">
                KES {(transaction.amount || 0).toLocaleString()}
              </Text>
            </View>
          ))}
        </View>
      </Card>

      {/* Leave Chama */}
      <AlertCard type="error">
        <View className="flex-row items-center justify-between">
          <View className="flex-1">
            <Text className="text-sm text-red-700 font-medium">
              Want to leave this chama?
            </Text>
            <Text className="text-xs text-red-600 mt-1">
              Note: You may forfeit contributions made so far.
            </Text>
          </View>
          <TouchableOpacity onPress={leaveChama} className="p-2">
            <LogOut size={16} color="#dc2626" />
          </TouchableOpacity>
        </View>
      </AlertCard>

      <View className="h-20" />
    </ScrollView>
  );

  const renderChatTab = () => (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      className="flex-1"
    >
      <ScrollView className="flex-1 mb-16" showsVerticalScrollIndicator={false}>
        <View className="space-y-3">
          {chamaData.messages.map((message: any) => (
            <View
              key={message.id}
              className={`p-3 rounded-lg ${
                message.isAdmin
                  ? "bg-emerald-50 border border-emerald-200"
                  : "bg-white border border-gray-200"
              }`}
            >
              <View className="flex-row items-center justify-between mb-1">
                <Text
                  className={`text-sm font-medium ${
                    message.isAdmin ? "text-emerald-700" : "text-gray-900"
                  }`}
                >
                  {message.sender}
                </Text>
                <Text className="text-xs text-gray-500">{message.time}</Text>
              </View>
              <Text className="text-sm text-gray-700">{message.message}</Text>
            </View>
          ))}
        </View>
      </ScrollView>

      {/* Message Input - Fixed at bottom */}
      <View className="absolute bottom-0 left-0 right-0 bg-white p-4 border-t border-gray-200">
        <View className="flex-row space-x-2">
          <TextInput
            value={newMessage}
            onChangeText={setNewMessage}
            placeholder="Type a message..."
            className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm"
            multiline
          />
          <TouchableOpacity
            onPress={sendMessage}
            disabled={!newMessage.trim()}
            className={`px-4 py-2 rounded-lg ${
              newMessage.trim() ? "bg-emerald-600" : "bg-gray-300"
            }`}
          >
            <Send size={16} color="#ffffff" />
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );

  const renderScheduleTab = () => (
    <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
      <View className="space-y-3">
        {chamaData.payoutSchedule.map((payout: any) => (
          <Card key={payout.position} className="p-4">
            <View className="flex-row items-center justify-between">
              <View className="flex-row items-center space-x-3">
                <View
                  className={`w-8 h-8 rounded-full items-center justify-center ${
                    payout.status === "completed"
                      ? "bg-green-100"
                      : payout.status === "current"
                        ? "bg-emerald-100"
                        : "bg-gray-100"
                  }`}
                >
                  {payout.status === "completed" ? (
                    <CheckCircle size={16} color="#059669" />
                  ) : (
                    <Text
                      className={`text-sm font-medium ${
                        payout.status === "current"
                          ? "text-emerald-600"
                          : "text-gray-600"
                      }`}
                    >
                      {payout.position}
                    </Text>
                  )}
                </View>
                <View>
                  <Text className="text-gray-900 text-sm font-medium">
                    {payout.member}
                  </Text>
                  <Text className="text-gray-600 text-xs">{payout.date}</Text>
                </View>
              </View>
              <View className="items-end">
                <Text className="text-gray-900 text-sm font-medium">
                  KES {(payout.amount || 0).toLocaleString()}
                </Text>
                <View
                  className={`px-2 py-1 rounded-full mt-1 ${getStatusColor(payout.status)}`}
                >
                  <Text className="text-xs font-medium capitalize">
                    {payout.status}
                  </Text>
                </View>
              </View>
            </View>
            {payout.member === "You (Sarah)" && (
              <View className="mt-3 p-2 bg-emerald-50 rounded-lg">
                <View className="flex-row items-center space-x-2">
                  <Info size={14} color="#059669" />
                  <Text className="text-xs text-emerald-700">
                    This is your payout turn
                  </Text>
                </View>
              </View>
            )}
          </Card>
        ))}
      </View>
      <View className="h-20" />
    </ScrollView>
  );

  const renderMembersTab = () => (
    <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
      <View className="space-y-3">
        {chamaData.members.map((member: any) => (
          <Card key={member.id} className="p-4">
            <View className="flex-row items-center justify-between">
              <View className="flex-row items-center space-x-3">
                <View className="w-10 h-10 rounded-full bg-emerald-100 items-center justify-center">
                  <Text className="text-emerald-600 text-sm font-medium">
                    {member.name
                      .split(" ")
                      .map((n: any) => n[0])
                      .join("")}
                  </Text>
                </View>
                <View>
                  <View className="flex-row items-center space-x-2">
                    <Text className="text-gray-900 text-sm font-medium">
                      {member.name}
                    </Text>
                    {member.role === "Admin" && (
                      <Badge variant="secondary">
                        <Text className="text-emerald-700">Admin</Text>
                      </Badge>
                    )}
                  </View>
                  <View className="flex-row items-center space-x-3 mt-1">
                    <Text className="text-gray-600 text-xs">
                      KES {(member.contributions || 0).toLocaleString()}
                    </Text>
                    <View
                      className={`px-2 py-1 rounded-full ${getMemberStatusColor(member.status)}`}
                    >
                      <Text className="text-xs font-medium capitalize">
                        {member.status}
                      </Text>
                    </View>
                  </View>
                </View>
              </View>
              <View className="flex-row space-x-2">
                <TouchableOpacity className="p-1">
                  <Phone size={16} color="#6b7280" />
                </TouchableOpacity>
                <TouchableOpacity className="p-1">
                  <Mail size={16} color="#6b7280" />
                </TouchableOpacity>
              </View>
            </View>
          </Card>
        ))}
      </View>
      <View className="h-20" />
    </ScrollView>
  );

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
          <TouchableOpacity onPress={onBack} className="p-2">
            <ArrowLeft size={20} color="#ffffff" />
          </TouchableOpacity>
          <Text className="text-lg text-white font-semibold flex-1 text-center px-4">
            {chamaData.name}
          </Text>
          <TouchableOpacity
            onPress={() => onNavigate("transaction-history")}
            className="p-2"
          >
            <History size={20} color="#ffffff" />
          </TouchableOpacity>
        </View>

        <View className="flex-row justify-between">
          <View className="items-center">
            <Text className="text-emerald-100 text-xs">My Position</Text>
            <Text className="text-lg text-white font-semibold">
              #{chamaData.myPosition}
            </Text>
          </View>
          <View className="items-center">
            <Text className="text-emerald-100 text-xs">My Turn</Text>
            <Text className="text-lg text-white font-semibold">Sep 15</Text>
          </View>
          <View className="items-center">
            <Text className="text-emerald-100 text-xs">Next Payout</Text>
            <Text className="text-lg text-white font-semibold">KES 45K</Text>
          </View>
        </View>
      </View>

      {/* Outstanding Payment Alert */}
      {chamaData.hasOutstandingPayment && (
        <View className="mx-6 mt-4">
          <AlertCard type="warning">
            <View className="flex-row items-center justify-between">
              <View className="flex-row items-center space-x-3 flex-1">
                <AlertTriangle size={16} color="#ea580c" />
                <View>
                  <Text className="text-sm text-orange-800 font-medium">
                    Payment overdue by 5 days
                  </Text>
                  <Text className="text-xs text-orange-700">
                    KES {totalDue.toLocaleString()} due (incl. KES{" "}
                    {penaltyAmount.toLocaleString()} penalty)
                  </Text>
                </View>
              </View>
              <TouchableOpacity
                onPress={makeFullPayment}
                className="bg-orange-600 px-3 py-2 rounded-lg"
              >
                <Text className="text-white text-xs font-medium">Pay Now</Text>
              </TouchableOpacity>
            </View>
          </AlertCard>
        </View>
      )}

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
