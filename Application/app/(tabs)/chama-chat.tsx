import {
  ArrowLeft,
  MoreVertical,
  Paperclip,
  Send,
  Smile,
  Users,
} from "lucide-react-native";
import React, { useState } from "react";
import {
  Image,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

interface ChamaChatProps {
  chama: {
    id: string;
    name: string;
    members: number;
  };
  user: {
    id: string;
    name: string;
    avatar: string;
  };
  onBack: () => void;
}

interface Message {
  id: number;
  senderId: string;
  senderName: string;
  senderAvatar: string;
  message: string;
  timestamp: string;
  type: "text" | "system";
}

const mockMessages: Message[] = [
  {
    id: 1,
    senderId: "2",
    senderName: "Grace Wanjiku",
    senderAvatar:
      "https://images.unsplash.com/photo-1494790108755-2616b612b786?w=40&h=40&fit=crop&crop=face",
    message: "Hello everyone! Excited to be part of this chama 🎉",
    timestamp: "2025-01-24T09:00:00Z",
    type: "text",
  },
  {
    id: 2,
    senderId: "3",
    senderName: "John Kamau",
    senderAvatar:
      "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=40&h=40&fit=crop&crop=face",
    message:
      "Welcome Grace! Just a reminder that our next contribution is due on February 1st.",
    timestamp: "2025-01-24T09:15:00Z",
    type: "text",
  },
  {
    id: 3,
    senderId: "system",
    senderName: "ChamaPay",
    senderAvatar: "",
    message: "Grace Wanjiku has joined the chama",
    timestamp: "2025-01-24T08:45:00Z",
    type: "system",
  },
  {
    id: 4,
    senderId: "4",
    senderName: "Mary Akinyi",
    senderAvatar:
      "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=40&h=40&fit=crop&crop=face",
    message:
      "Has everyone received their payout schedule? I want to make sure I have the right dates.",
    timestamp: "2025-01-24T10:30:00Z",
    type: "text",
  },
  {
    id: 5,
    senderId: "1",
    senderName: "Sarah Njeri",
    senderAvatar:
      "https://images.unsplash.com/photo-1494790108755-2616b612b786?w=40&h=40&fit=crop&crop=face",
    message:
      "Yes! I can share the schedule again if needed. Also, great job everyone on being consistent with contributions.",
    timestamp: "2025-01-24T11:00:00Z",
    type: "text",
  },
  {
    id: 6,
    senderId: "2",
    senderName: "Grace Wanjiku",
    senderAvatar:
      "https://images.unsplash.com/photo-1494790108755-2616b612b786?w=40&h=40&fit=crop&crop=face",
    message: "That would be helpful, thank you Sarah! 🙏",
    timestamp: "2025-01-24T11:15:00Z",
    type: "text",
  },
];

export default function ChamaChat({ chama, user, onBack }: ChamaChatProps) {
  const [newMessage, setNewMessage] = useState("");
  const [messages, setMessages] = useState<Message[]>(mockMessages);

  const Badge = ({
    children,
    variant = "default",
  }: {
    children: React.ReactNode;
    variant?: "default" | "secondary";
  }) => (
    <View
      className={`px-2 py-1 rounded-full ${variant === "secondary" ? "bg-emerald-100" : "bg-gray-200"}`}
    >
      <Text
        className={`text-xs font-medium ${variant === "secondary" ? "text-emerald-700" : "text-gray-700"}`}
      >
        {children}
      </Text>
    </View>
  );

  const Card = ({
    children,
    className = "",
  }: {
    children: React.ReactNode;
    className?: string;
  }) => <View className={`rounded-lg ${className}`}>{children}</View>;

  const sendMessage = () => {
    if (newMessage.trim()) {
      const message: Message = {
        id: messages.length + 1,
        senderId: user?.id || "1",
        senderName: user?.name || "Sarah Njeri",
        senderAvatar:
          user?.avatar ||
          "https://images.unsplash.com/photo-1494790108755-2616b612b786?w=40&h=40&fit=crop&crop=face",
        message: newMessage,
        timestamp: new Date().toISOString(),
        type: "text",
      };

      setMessages([...messages, message]);
      setNewMessage("");
    }
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  };

  const formatDate = (timestamp: string) => {
    const date = new Date(timestamp);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return "Today";
    } else if (date.toDateString() === yesterday.toDateString()) {
      return "Yesterday";
    } else {
      return date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      });
    }
  };

  const isCurrentUser = (senderId: string) => senderId === (user?.id || "1");

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        className="flex-1"
      >
        {/* Header */}
        <View className="bg-white border-b border-gray-200 p-4">
          <View className="flex-row items-center gap-4">
            <TouchableOpacity onPress={onBack} className="p-2">
              <ArrowLeft size={20} color="#374151" />
            </TouchableOpacity>
            <View className="flex-1">
              <Text className="text-lg text-gray-900 font-semibold">
                {chama.name}
              </Text>
              <View className="flex-row items-center gap-2">
                <Users size={14} color="#9ca3af" />
                <Text className="text-sm text-gray-600">
                  {chama.members} members
                </Text>
                <Badge variant="secondary">Active</Badge>
              </View>
            </View>
            <TouchableOpacity className="p-2">
              <MoreVertical size={20} color="#374151" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Messages */}
        <ScrollView
          className="flex-1 p-4"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 20 }}
        >
          {messages.map((message, index) => {
            const showDate =
              index === 0 ||
              formatDate(message.timestamp) !==
              formatDate(messages[index - 1].timestamp);

            return (
              <View key={message.id} className="mb-4">
                {showDate && (
                  <View className="items-center mb-4">
                    <Text className="text-xs text-gray-500">
                      {formatDate(message.timestamp)}
                    </Text>
                  </View>
                )}

                {message.type === "system" ? (
                  <View className="items-center">
                    <Badge variant="secondary">{message.message}</Badge>
                  </View>
                ) : (
                  <View
                    className={`flex-row ${isCurrentUser(message.senderId) ? "justify-end" : "justify-start"}`}
                  >
                    <View
                      className={`flex-row max-w-[280px] ${isCurrentUser(message.senderId) ? "flex-row-reverse" : ""}`}
                    >
                      {!isCurrentUser(message.senderId) && (
                        <View className="w-8 h-8 rounded-full bg-gray-300 flex items-center justify-center overflow-hidden mr-2">
                          {message.senderAvatar ? (
                            <Image
                              source={{ uri: message.senderAvatar }}
                              className="w-full h-full"
                              style={{ resizeMode: "cover" }}
                            />
                          ) : (
                            <Text className="text-xs text-gray-600">
                              {message.senderName.charAt(0)}
                            </Text>
                          )}
                        </View>
                      )}

                      <View
                        className={`${isCurrentUser(message.senderId) ? "items-end" : "items-start"} flex-1`}
                      >
                        {!isCurrentUser(message.senderId) && (
                          <Text className="text-xs text-gray-600 mb-1">
                            {message.senderName}
                          </Text>
                        )}
                        <Card
                          className={`p-3 ${isCurrentUser(message.senderId)
                              ? "bg-emerald-600"
                              : "bg-white border border-gray-200"
                            }`}
                        >
                          <Text
                            className={`text-sm ${isCurrentUser(message.senderId)
                                ? "text-white"
                                : "text-gray-900"
                              }`}
                          >
                            {message.message}
                          </Text>
                        </Card>
                        <Text className="text-xs text-gray-500 mt-1">
                          {formatTime(message.timestamp)}
                        </Text>
                      </View>
                    </View>
                  </View>
                )}
              </View>
            );
          })}
        </ScrollView>

        {/* Message Input */}
        <View className="bg-white border-t border-gray-200 p-4">
          <View className="flex-row items-center gap-2">
            <TouchableOpacity className="p-2">
              <Paperclip size={20} color="#9ca3af" />
            </TouchableOpacity>

            <View className="flex-1 relative">
              <TextInput
                placeholder="Type a message..."
                value={newMessage}
                onChangeText={setNewMessage}
                multiline
                className="bg-gray-50 border-0 rounded-lg px-4 py-3 pr-12 text-gray-900 max-h-20"
                style={{
                  fontSize: 16,
                  textAlignVertical: "top",
                }}
              />
              <TouchableOpacity className="absolute right-3 top-3">
                <Smile size={16} color="#9ca3af" />
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              onPress={sendMessage}
              disabled={!newMessage.trim()}
              className={`p-3 rounded-lg ${newMessage.trim() ? "bg-emerald-600" : "bg-gray-300"
                }`}
            >
              <Send
                size={16}
                color={newMessage.trim() ? "#ffffff" : "#9ca3af"}
              />
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
