import { getSocket } from "@/socket/socket";
import { useEffect, useState } from "react";
import { saveMessageToDb } from "@/lib/chamaService";
import { useAuth } from "@/Contexts/AuthContext";

interface MessageObj{
    chamaId: number;
    senderName: string;
    senderId: number;
    text: string;
    timestamp:number;
  };

export function useChat(chamaId: number) {
  const [messages, setMessages] = useState<any[]>([]);

  const socket = getSocket();

  useEffect(() => {
    socket?.emit("joinChama", chamaId);

    socket?.on("newMessage", (msg) => {
      setMessages((prev) => [...prev, msg]);
    });

    return () => {
      socket?.disconnect();
    };
  }, []);

  // send message
  const sendMessage = async (messageObj:MessageObj, token: string) => {

    if(!token){
        throw new Error("Please, log in again.");
    }

    socket?.emit("sendMessage", messageObj);

    // send to db
    const response = await saveMessageToDb(token, messageObj.senderId, messageObj.text, messageObj.chamaId);

    if (!response.success){
        throw new Error("Unable to write message to database.")
    }


  };

  return { messages, sendMessage };
}
