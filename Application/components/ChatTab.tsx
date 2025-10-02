import { Message } from "@/constants/mockData";
import { Send } from "lucide-react-native";
import React, { FC, useEffect, useRef, useState } from "react";
import { ScrollView, Text, TextInput, TouchableOpacity, View } from "react-native";

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
  const [localMessages, setLocalMessages] = useState<Message[]>(messages);
  const scrollViewRef = useRef<ScrollView>(null);
  
  // Check if sender contains "You" to identify user messages
  const isUserMessage = (sender: string) => sender.includes("You");

  // Update local messages when prop messages change
  useEffect(() => {
    setLocalMessages(messages);
  }, [messages]);

  // Scroll to bottom when new messages are added
  useEffect(() => {
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 100);
  }, [localMessages]);

  const handleSendMessage = () => {
    if (newMessage.trim()) {
      const newMsg: Message = {
        id: Date.now(), // Simple ID generation
        sender: "You (Sarah)", // This should come from user context in real app
        message: newMessage.trim(),
        time: "Just now",
      };
      
      setLocalMessages(prev => [...prev, newMsg]);
      setNewMessage("");
      
      // Call the parent's sendMessage function
      sendMessage();
    }
  };

  return (
    <View className="flex-1">
      <ScrollView 
        ref={scrollViewRef}
        className="flex-1" 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 20 }}
      >
        <View className="gap-3 p-4">
          {localMessages.map((message) => {
            const isMyMessage = isUserMessage(message.sender);
            return (
              <View
                key={message.id}
                className={`flex-row ${isMyMessage ? "justify-end" : "justify-start"}`}
              >
                <View
                  className={`max-w-[80%] p-3 rounded-2xl ${
                    isMyMessage
                      ? "bg-emerald-500 rounded-br-md"
                      : message.isAdmin
                      ? "bg-emerald-50 border border-emerald-200 rounded-bl-md"
                      : "bg-gray-200 rounded-bl-md"
                  }`}
                >
                  {!isMyMessage && (
                    <Text
                      className={`text-xs font-medium mb-1 ${
                        message.isAdmin ? "text-emerald-700" : "text-gray-700"
                      }`}
                    >
                      {message.sender}
                    </Text>
                  )}
                  <Text
                    className={`text-sm ${
                      isMyMessage
                        ? "text-white"
                        : message.isAdmin
                        ? "text-emerald-800"
                        : "text-gray-800"
                    }`}
                  >
                    {message.message}
                  </Text>
                  <Text
                    className={`text-xs mt-1 ${
                      isMyMessage
                        ? "text-emerald-100"
                        : message.isAdmin
                        ? "text-emerald-600"
                        : "text-gray-500"
                    }`}
                  >
                    {message.time}
                  </Text>
                </View>
              </View>
            );
          })}
        </View>
      </ScrollView>

      {/* Message Input */}
      <View className="bg-white border-t border-gray-200">
        <View className="flex-row items-end gap-2 p-4">
          <TextInput
            value={newMessage}
            onChangeText={setNewMessage}
            placeholder="Type a message..."
            className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm min-h-[40px] max-h-[100px]"
            multiline
            textAlignVertical="top"
          />
          <TouchableOpacity
            onPress={handleSendMessage}
            disabled={!newMessage.trim()}
            className={`px-4 py-2 rounded-lg min-h-[40px] justify-center items-center ${
              newMessage.trim() ? "bg-emerald-600" : "bg-gray-300"
            }`}
          >
            <Send size={16} color="#ffffff" />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

export default ChatTab;
