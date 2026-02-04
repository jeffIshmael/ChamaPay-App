import { Message } from "@/constants/mockData";
import { useAuth } from "@/Contexts/AuthContext";
import { useChat } from "@/hooks/useChat";
import { Send } from "lucide-react-native";
import React, { FC, useEffect, useRef, useState } from "react";
import {
  Keyboard,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from "react-native";

type Props = {
  prevMessages: Message[];
  chamaId: number;
};

const ChatTab: FC<Props> = ({ prevMessages, chamaId }) => {
  const [localMessages, setLocalMessages] = useState<Message[]>(prevMessages || []);
  const scrollViewRef = useRef<ScrollView>(null);
  const [newMessage, setNewMessage] = useState("");
  const [isSending, setIsSending] = useState(false);

  const { socketMessages, sendMessage } = useChat(chamaId);
  const { user, token } = useAuth();

  // Auto-scroll when keyboard appears
  useEffect(() => {
    const keyboardDidShowListener = Keyboard.addListener(
      'keyboardDidShow',
      () => {
        setTimeout(() => {
          scrollViewRef.current?.scrollToEnd({ animated: true });
        }, 100);
      }
    );

    return () => {
      keyboardDidShowListener.remove();
    };
  }, []);

  // Check if sender matches current user to identify user messages
  const isUserMessage = (sender: string | undefined) => {
    if (!sender || typeof sender !== 'string') return false;
    return sender === user?.userName;
  };

  // Parse ISO timestamp string to Date object
  const parseTimestamp = (timestamp: string | number | Date): Date => {
    if (timestamp instanceof Date) return timestamp;
    if (typeof timestamp === 'number') return new Date(timestamp);
    if (typeof timestamp === 'string') {
      // Handle ISO string
      if (timestamp.includes('T') || timestamp.includes('Z')) {
        return new Date(timestamp);
      }
      // Handle "Just now" or other text
      return new Date();
    }
    return new Date();
  };

  // Format time (e.g., "2:30 PM" or "14:30")
  const formatTime = (timestamp: string | number | Date): string => {
    const date = parseTimestamp(timestamp);
    return date.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  };

  // Get day label (Today, Yesterday, or date)
  const getDayLabel = (timestamp: string | number | Date): string => {
    const date = parseTimestamp(timestamp);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    // Reset time to compare dates only
    const dateOnly = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const todayOnly = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const yesterdayOnly = new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate());

    if (dateOnly.getTime() === todayOnly.getTime()) {
      return "Today";
    } else if (dateOnly.getTime() === yesterdayOnly.getTime()) {
      return "Yesterday";
    } else {
      return date.toLocaleDateString("en-US", {
        weekday: "long",
        month: "long",
        day: "numeric",
        year: date.getFullYear() !== today.getFullYear() ? "numeric" : undefined,
      });
    }
  };

  // Check if two messages are from the same day
  const isSameDay = (timestamp1: string | number | Date, timestamp2: string | number | Date): boolean => {
    const date1 = parseTimestamp(timestamp1);
    const date2 = parseTimestamp(timestamp2);
    return (
      date1.getFullYear() === date2.getFullYear() &&
      date1.getMonth() === date2.getMonth() &&
      date1.getDate() === date2.getDate()
    );
  };

  // Check if messages should be grouped (same sender, within 5 minutes, same day)
  const shouldGroupMessages = (
    msg1: Message,
    msg2: Message,
    sender1: string,
    sender2: string
  ): boolean => {
    if (sender1 !== sender2) return false;

    // Check if same day
    if (!isSameDay(msg1.timestamp, msg2.timestamp)) return false;

    const time1 = parseTimestamp(msg1.timestamp);
    const time2 = parseTimestamp(msg2.timestamp);
    const diffMs = Math.abs(time2.getTime() - time1.getTime());
    const diffMins = diffMs / (1000 * 60);

    // Group if within 2 minutes (WhatsApp-style)
    return diffMins < 2;
  };

  // Merge prevMessages and socketMessages, removing duplicates
  useEffect(() => {
    const allMessages = [...(prevMessages || [])];

    // Add socket messages that aren't already in prevMessages
    socketMessages.forEach((socketMsg) => {
      const exists = allMessages.some(
        (msg) =>
          msg.id === socketMsg.id ||
          (msg.text === socketMsg.text &&
            msg.sender === socketMsg.sender &&
            Math.abs(Number(msg.id) - Number(socketMsg.id)) < 1000)
      );
      if (!exists) {
        allMessages.push(socketMsg);
      }
    });

    // Sort by timestamp to maintain chronological order
    allMessages.sort((a, b) => {
      const timeA = parseTimestamp(a.timestamp).getTime();
      const timeB = parseTimestamp(b.timestamp).getTime();
      return timeA - timeB;
    });

    setLocalMessages(allMessages);
  }, [prevMessages, socketMessages, user?.userName]);

  // Scroll to bottom when new messages are added
  useEffect(() => {
    if (localMessages.length > 0) {
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 200);
    }
  }, [localMessages]);

  const handleSend = async () => {
    if (!newMessage.trim() || isSending) return;

    if (!token || !user) {
      console.error("User or token not available");
      return;
    }

    setIsSending(true);
    const messageText = newMessage.trim();
    setNewMessage(""); // Clear input immediately for better UX

    // Optimistically add message to UI
    const optimisticMsg: Message = {
      id: Date.now(),
      sender: user.userName!,
      text: messageText,
      timestamp: new Date().toISOString(),
    };

    setLocalMessages((prev) => [...prev, optimisticMsg]);

    // Scroll to bottom
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 100);

    try {
      const messageObj = {
        chamaId,
        senderName: user.userName!,
        senderId: user.id!,
        text: messageText,
        timestamp: Date.now(),
      };

      await sendMessage(messageObj, token);
    } catch (error) {
      console.error("Error sending message:", error);
      // Remove optimistic message on error
      setLocalMessages((prev) =>
        prev.filter((msg) => msg.id !== optimisticMsg.id)
      );
      // Restore message text
      setNewMessage(messageText);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <View className="flex-1 bg-gray-50">
      <View className="flex-1">
        {/* Messages Area */}
        <ScrollView
          ref={scrollViewRef}
          className="flex-1"
          showsVerticalScrollIndicator={false}
          keyboardDismissMode="on-drag"
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{
            paddingHorizontal: 16,
            paddingTop: 16,
            paddingBottom: 16
          }}
          onContentSizeChange={() => {
            setTimeout(() => {
              scrollViewRef.current?.scrollToEnd({ animated: true });
            }, 100);
          }}
        >
          {localMessages.length === 0 ? (
            <View className="items-center justify-center flex-1">
              <View className="w-20 h-20 bg-emerald-100 rounded-full items-center justify-center mb-4">
                <Send size={32} color="#10b981" />
              </View>
              <Text className="text-gray-900 font-semibold text-lg mb-2">
                No messages yet
              </Text>
              <Text className="text-gray-500 text-sm text-center px-8">
                Start the conversation with your chama members
              </Text>
            </View>
          ) : (
            <View>
              {localMessages.map((message, index) => {
                // Ensure sender is a string, not an object
                const sender = typeof message.sender === 'string'
                  ? message.sender
                  : (message.sender as any)?.userName || (message.sender as any)?.name || 'Unknown';

                const isMyMessage = isUserMessage(sender);
                const prevMessage = index > 0 ? localMessages[index - 1] : null;
                const nextMessage = index < localMessages.length - 1 ? localMessages[index + 1] : null;

                const prevSender = prevMessage
                  ? (typeof prevMessage.sender === 'string'
                    ? prevMessage.sender
                    : (prevMessage.sender as any)?.userName || (prevMessage.sender as any)?.name || 'Unknown')
                  : null;

                const nextSender = nextMessage
                  ? (typeof nextMessage.sender === 'string'
                    ? nextMessage.sender
                    : (nextMessage.sender as any)?.userName || (nextMessage.sender as any)?.name || 'Unknown')
                  : null;

                // Check if we need to show a date separator
                const showDateSeparator = !prevMessage || !isSameDay(prevMessage.timestamp, message.timestamp);

                // Check if this is the first message in a group (show sender name)
                const isFirstInGroup = !prevMessage || !shouldGroupMessages(prevMessage, message, prevSender!, sender);

                // Check if this is the last message in a group (show timestamp)
                const isLastInGroup = !nextMessage || !shouldGroupMessages(message, nextMessage, sender, nextSender!);

                return (
                  <View key={message.id}>
                    {/* Date Separator */}
                    {showDateSeparator && (
                      <View className="items-center my-5">
                        <View className="bg-gray-300 px-4 py-1.5 rounded-full shadow-sm">
                          <Text className="text-xs font-semibold text-gray-700">
                            {getDayLabel(message.timestamp)}
                          </Text>
                        </View>
                      </View>
                    )}

                    {/* Message Bubble */}
                    <View
                      className={`${isMyMessage ? "items-end" : "items-start"} ${isFirstInGroup ? "mt-3" : "mt-1"
                        }`}
                    >
                      <View
                        className={`${isMyMessage ? "items-end" : "items-start"}`}
                        style={{ maxWidth: "80%" }}
                      >
                        {/* Sender name for first message in group (not for own messages) */}
                        {!isMyMessage && isFirstInGroup && (
                          <Text
                            className={`text-xs font-bold mb-1.5 px-1 ${message.isAdmin
                              ? "text-emerald-700"
                              : "text-gray-700"
                              }`}
                          >
                            {sender}
                          </Text>
                        )}

                        {/* Message Bubble */}
                        <View
                          className={`px-4 py-2.5 shadow-sm ${isMyMessage
                            ? "bg-emerald-600"
                            : message.isAdmin
                              ? "bg-emerald-100 border border-emerald-200"
                              : "bg-white border border-gray-200"
                            } ${
                            // Rounded corners based on position in group
                            isMyMessage
                              ? isFirstInGroup && isLastInGroup
                                ? "rounded-2xl"
                                : isFirstInGroup
                                  ? "rounded-2xl rounded-br-sm"
                                  : isLastInGroup
                                    ? "rounded-2xl rounded-tr-sm"
                                    : "rounded-l-2xl rounded-tr-sm rounded-br-sm"
                              : isFirstInGroup && isLastInGroup
                                ? "rounded-2xl"
                                : isFirstInGroup
                                  ? "rounded-2xl rounded-bl-sm"
                                  : isLastInGroup
                                    ? "rounded-2xl rounded-tl-sm"
                                    : "rounded-r-2xl rounded-tl-sm rounded-bl-sm"
                            }`}
                        >
                          <Text
                            className={`text-[15px] leading-5 ${isMyMessage
                              ? "text-white"
                              : message.isAdmin
                                ? "text-emerald-900"
                                : "text-gray-900"
                              }`}
                          >
                            {message.text}
                          </Text>
                        </View>

                        {/* Timestamp - only show for last message in group */}
                        {isLastInGroup && (
                          <Text
                            className={`text-[11px] mt-1 px-1 font-medium ${isMyMessage
                              ? "text-gray-500"
                              : "text-gray-500"
                              }`}
                          >
                            {formatTime(message.timestamp)}
                          </Text>
                        )}
                      </View>
                    </View>
                  </View>
                );
              })}
            </View>
          )}
        </ScrollView>

        {/* Message Input - Fixed at bottom */}
        <View className="bg-white border-t border-gray-200 px-4 py-3 pb-6">
          <View className="flex-row items-center gap-2">
            <View className="flex-1 bg-gray-50 rounded-full px-5 py-3.5 border border-gray-300">
              <TextInput
                value={newMessage}
                onChangeText={setNewMessage}
                placeholder="Type a message..."
                className="text-[15px] text-gray-900"
                multiline={false}
                placeholderTextColor="#9ca3af"
                returnKeyType="send"
                onSubmitEditing={handleSend}
                maxLength={500}
              />
            </View>

            <TouchableOpacity
              onPress={handleSend}
              disabled={!newMessage.trim() || isSending}
              className={`w-12 h-12 rounded-full items-center justify-center shadow-lg ${newMessage.trim() && !isSending
                ? "bg-emerald-600"
                : "bg-gray-300"
                }`}
              activeOpacity={0.7}
            >
              <Send size={20} color="#ffffff" />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </View>
  );
};

export default ChatTab;