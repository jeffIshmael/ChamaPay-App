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

        console.log("decoded is", decoded);
        next();
      }
    );
  });

  io.on("connection",async (socket:Socket)=>{
    console.log("The user is successfully connected");

    // implement the register events
    testSocket(io,socket);

    // the disconnect
    socket.on("disconnect",()=>{
        console.log("User is disconnected");
    })

  })
  return io;
}
