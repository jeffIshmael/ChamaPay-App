import { Message } from "@/constants/mockData";
import { Send } from "lucide-react-native";
import React, { FC, useEffect, useRef, useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, Text, TextInput, TouchableOpacity, View } from "react-native";
import { Card } from "./ui/Card";

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
    if (localMessages.length > 0) {
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 200);
    }
  }, [localMessages]);

  const handleSendMessage = () => {
    if (newMessage.trim()) {
      const newMsg: Message = {
        id: Date.now(),
        sender: "You (Sarah)",
        message: newMessage.trim(),
        time: "Just now",
      };
      
      setLocalMessages(prev => [...prev, newMsg]);
      setNewMessage("");
      sendMessage();
      
      // Force scroll to bottom after adding message
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  };

  return (
    <KeyboardAvoidingView 
      className="flex-1" 
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
    >
      <ScrollView className="flex-1 px-6" showsVerticalScrollIndicator={false}>
        {/* Chat Messages Card */}
        <Card className="pb-6 mb-6 pt-2 px-2">
          <View className="flex-row items-center border-b border-gray-200 rounded-lg p-2 bg-gray-50 justify-between mb-4">
            <View>
              <Text className="text-lg font-semibold text-gray-900">Group Chat</Text>
              <Text className="text-sm text-gray-600 mt-0.5">
                {localMessages.length} message{localMessages.length !== 1 ? 's' : ''}
              </Text>
            </View>
          </View>

           {/* Messages Area */}
           <View className="min-h-[400px] max-h-[500px]">
             <ScrollView 
               ref={scrollViewRef}
               showsVerticalScrollIndicator={false}
               contentContainerStyle={{ paddingBottom: 8, flexGrow: 1 }}
               onContentSizeChange={() => {
                 setTimeout(() => {
                   scrollViewRef.current?.scrollToEnd({ animated: true });
                 }, 100);
               }}
             >
              {localMessages.length === 0 ? (
                <View className="items-center justify-center py-16">
                  <View className="w-16 h-16 bg-emerald-50 rounded-full items-center justify-center mb-4">
                    <Send size={24} color="#10b981" />
                  </View>
                  <Text className="text-gray-900 font-semibold text-base mb-1">No messages yet</Text>
                  <Text className="text-gray-500 text-sm text-center">
                    Start the conversation with your chama members
                  </Text>
                </View>
              ) : (
                <View className="gap-3">
                  {localMessages.map((message, index) => {
                    const isMyMessage = isUserMessage(message.sender);
                    const prevMessage = index > 0 ? localMessages[index - 1] : null;
                    const showAvatar = !prevMessage || prevMessage.sender !== message.sender;
                    
                    return (
                      <View
                        key={message.id}
                        className={`${isMyMessage ? "items-end" : "items-start"} ${
                          showAvatar ? "mt-1" : ""
                        }`}
                      >
                        <View className={`flex-row items-end gap-2 ${isMyMessage ? "justify-end" : "justify-start"}`}>
                          {/* Avatar */}
                          {!isMyMessage && (
                            <View className={`w-8 h-8 rounded-full items-center justify-center ${
                              message.isAdmin ? "bg-emerald-500" : "bg-gray-400"
                            } ${showAvatar ? "" : "opacity-0"}`}>
                              <Text className="text-xs font-semibold text-white">
                                {message.sender.charAt(0).toUpperCase()}
                              </Text>
                            </View>
                          )}
                          
                          {/* Message Content */}
                          <View style={{ maxWidth: '75%' }}>
                            {!isMyMessage && showAvatar && (
                              <Text className={`text-xs font-medium mb-1 px-1 ${
                                message.isAdmin ? "text-emerald-700" : "text-gray-700"
                              }`}>
                                {message.sender}
                              </Text>
                            )}
                            
                            <View
                              className={`px-4 py-2.5 rounded-2xl ${
                                isMyMessage
                                  ? "bg-emerald-600 rounded-br-sm"
                                  : message.isAdmin
                                  ? "bg-emerald-50 border border-emerald-100 rounded-bl-sm"
                                  : "bg-gray-100 rounded-bl-sm"
                              }`}
                            >
                              <Text
                                className={`text-sm leading-5 ${
                                  isMyMessage
                                    ? "text-white"
                                    : message.isAdmin
                                    ? "text-emerald-900"
                                    : "text-gray-900"
                                }`}
                              >
                                {message.message}
                              </Text>
                              
                              {/* Time inside the bubble */}
                              <Text className={`text-xs mt-1 ${
                                isMyMessage
                                  ? "text-emerald-100"
                                  : message.isAdmin
                                  ? "text-emerald-600"
                                  : "text-gray-500"
                              }`}>
                                {message.time}
                              </Text>
                            </View>
                            
                            {/* Sender name outside the bubble */}
                            <View className={`mt-1 ${isMyMessage ? "items-end" : "items-start"}`}>
                              <Text className={`text-xs font-medium ${
                                message.isAdmin ? "text-emerald-700" : "text-gray-600"
                              }`}>
                                {message.sender}
                              </Text>
                            </View>
                          </View>
                        </View>
                      </View>
                    );
                  })}
                </View>
              )}
            </ScrollView>
          </View>
        </Card>

        {/* Message Input Card */}
        <Card className="p-6 mb-6">
          <View className="flex-row items-center gap-3">
            <View className="flex-1 bg-gray-50 rounded-full px-5 py-3 border border-gray-200">
              <TextInput
                value={newMessage}
                onChangeText={setNewMessage}
                placeholder="Type a message..."
                className="text-sm text-gray-900"
                multiline={false}
                placeholderTextColor="#9ca3af"
                returnKeyType="send"
                onSubmitEditing={handleSendMessage}
              />
            </View>
            
            <TouchableOpacity
              onPress={handleSendMessage}
              disabled={!newMessage.trim()}
              className={`w-12 h-12 rounded-full items-center justify-center shadow-sm ${
                newMessage.trim() 
                  ? "bg-emerald-600" 
                  : "bg-gray-300"
              }`}
              activeOpacity={0.7}
            >
              <Send size={20} color="#ffffff" />
            </TouchableOpacity>
          </View>
        </Card>

        <View className="h-20" />
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

export default ChatTab;