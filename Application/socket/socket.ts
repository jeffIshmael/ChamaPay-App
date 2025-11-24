// this file implements the socket.io in the client side
import { io, Socket } from "socket.io-client";
import { serverUrl } from "@/constants/serverUrl";

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
    await new Promise((resolve) => {
      socket?.on("connect", () => {
        console.log("socket connected", socket?.id);
        resolve(true);
      });
    });

    socket.on("disconnect", () => {
      console.log("socket successfully disconnected.");
    });
  }

  return socket;
}


// function to get socket 
export function getSocket(){
    return socket;
}

export function disconnectSocket(){
    if(socket){
        socket.disconnect();
        socket=null;
    }
}