// this file implements the socket.io in the client side
import { serverUrl } from "@/constants/serverUrl";
import { io, Socket } from "socket.io-client";

let socket: Socket | null = null;

// connecting the socket
export async function connectSocket(token: string): Promise<Socket> {
  if (!token) {
    throw new Error("The token is not set. Please log in.");
  }

  if (!socket) {
    socket = io(serverUrl, {
      auth: { token },
    });

    // wait for the connection
    await new Promise((resolve, reject) => {
      if (!socket) return reject("Socket initialization failed");

      const onConnect = () => {
        console.log("socket connected", socket?.id);
        cleanupListeners();
        resolve(true);
      };

      const onError = (err: Error) => {
        console.error("socket connection error:", err.message);
        cleanupListeners();
        if (socket) {
          socket.disconnect();
          socket = null;
        }
        reject(err);
      };

      const cleanupListeners = () => {
        socket?.off("connect", onConnect);
        socket?.off("connect_error", onError);
      };

      socket.on("connect", onConnect);
      socket.on("connect_error", onError);
    });

    socket.on("disconnect", () => {
      console.log("socket successfully disconnected.");
    });
  }

  return socket;
}


// function to get socket 
export function getSocket() {
  return socket;
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}