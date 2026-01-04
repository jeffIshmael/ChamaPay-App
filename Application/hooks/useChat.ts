import { Message } from "@/constants/mockData";
import { saveMessageToDb } from "@/lib/chamaService";
import { getSocket } from "@/socket/socket";
import { useEffect, useRef, useState } from "react";

export interface MessageObj {
  chamaId: number;
  senderName: string;
  senderId: number;
  text: string;
  timestamp: number;
}

interface SocketMessage {
  chamaId: number;
  senderName: string;
  senderId: number;
  text: string;
  timestamp: number;
}

export function useChat(chamaId: number) {
  const [socketMessages, setSocketMessages] = useState<Message[]>([]);
  const socket = getSocket();
  const hasJoinedRef = useRef(false);

  useEffect(() => {
    if (!socket || !chamaId) return;

    // Join the chatroom
    if (!hasJoinedRef.current) {
      socket.emit("joinChatroom", chamaId);
      hasJoinedRef.current = true;
    }

    // Listen for new messages
    const handleNewMessage = (msg: SocketMessage) => {
      // Ensure sender is always a string, never an object
      let senderName: string;
      if (typeof msg.senderName === 'string') {
        senderName = msg.senderName;
      } else if (msg.senderName && typeof msg.senderName === 'object') {
        // If senderName is an object, extract the userName property
        senderName = (msg.senderName as any)?.userName || (msg.senderName as any)?.name || "Unknown";
      } else {
        senderName = msg.senderId?.toString() || "Unknown";
      }

      // Transform socket message to Message format
      const transformedMessage: Message = {
        id: msg.timestamp || Date.now(),
        sender: senderName,
        text: typeof msg.text === 'string' ? msg.text : String(msg.text || ""),
        timestamp: formatMessageTime(msg.timestamp),
        isAdmin: false, // You can add logic to determine if sender is admin
      };

      setSocketMessages((prev) => {
        // Avoid duplicates by checking if message already exists
        const exists = prev.some((m) => m.id === transformedMessage.id);
        if (exists) return prev;
        return [...prev, transformedMessage];
      });
    };

    socket.on("newMessage", handleNewMessage);

    // Cleanup: Remove event listener but don't disconnect socket
    return () => {
      socket.off("newMessage", handleNewMessage);
      hasJoinedRef.current = false;
    };
  }, [chamaId, socket]);

  // Format timestamp to readable time
  const formatMessageTime = (timestamp: number): string => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return date.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
    });
  };

  // Send message
  const sendMessage = async (messageObj: MessageObj, token: string) => {
    if (!token) {
      throw new Error("Please, log in again.");
    }

    if (!socket) {
      throw new Error("Socket not connected. Please refresh the page.");
    }

    try {
      // Emit message to socket
      socket.emit("sendMessage", messageObj);

      // Save to database
      const response = await saveMessageToDb(
        token,
        messageObj.senderId,
        messageObj.text,
        messageObj.chamaId
      );

      if (!response.success) {
        throw new Error("Unable to write message to database.");
      }
    } catch (error) {
      console.error("Error sending message:", error);
      throw error;
    }
  };

  return { socketMessages, sendMessage };
}
