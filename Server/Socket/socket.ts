import dotenv from "dotenv";
import { Server as socketIOServer, Socket } from "socket.io";
import jwt from "jsonwebtoken";
import {testSocket} from "./registerEvents";

dotenv.config();

export function initialiseSocket(server: any): socketIOServer {
  const io = new socketIOServer(server, {
    cors: {
      origin: "*",
    },
  });
  io.use((socket: Socket, next) => {
    const token = socket.handshake.auth.token;

    if (!token) {
      return next(new Error("Auth token is not set."));
    }

    jwt.verify(
      token,
      process.env.JWT_SECRET as string,
      (err: any, decoded: any) => {
        if (err) {
          return next(new Error("Auth token is not set."));
        }

        let userData = decoded.user;
        socket.data = userData;
        socket.data.useId = userData.id;
        next();
      }
    );
  });

  io.on("connection",async (socket:Socket)=>{
    const userId = socket.data.userId;
    console.log("The user is successfully connected", userId);

    // implement the register events
    testSocket(io,socket);

    // the disconnect
    socket.on("disconnect",()=>{
        console.log("User is disconnected", userId);
    })

  })
  return io;
}
