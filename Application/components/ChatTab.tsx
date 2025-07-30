import React, { FC } from "react";
import { View, Text, ScrollView, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform } from "react-native";
import { Send } from "lucide-react-native";
import { Message } from "@/constants/mockData";

type Props = {
  messages: Message[];
  newMessage: string;
  setNewMessage: (val: string) => void;
  sendMessage: () => void;
};

const ChatTab: FC<Props> = ({
  messages,
  newMessage,
  setNewMessage,
  sendMessage,
}) => {
  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      className="flex-1"
    >
      <ScrollView className="flex-1 mb-16" showsVerticalScrollIndicator={false}>
        <View className="gap-3">
          {messages.map((message) => (
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
        <View className="flex-row gap-2">
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
};

export default ChatTab;
