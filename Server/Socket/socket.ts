import dotenv from "dotenv";
import { Server as socketIOServer, Socket } from "socket.io";
import jwt from "jsonwebtoken";
import { testSocket } from "./registerEvents";

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

  io.on("connection", async (socket: Socket) => {
    console.log("The user is successfully connected");

    // implement the register events
    testSocket(io, socket);

    // Join a Chama room
    socket.on("joinChatroom", (chamaId) => {
      socket.join(`chama_${chamaId}`);
      console.log(`User joined room chama_${chamaId}`);
    });

    // Receive and broadcast messages
    socket.on("sendMessage", async (data) => {
      const roomName = `chama_${data.chamaId}`;

      // Broadcast to everyone in the room
      io.to(roomName).emit("newMessage", data);

      // Save to database (example)
      // await Message.create(data);
    });

    // the disconnect
    socket.on("disconnect", () => {
      console.log("User is disconnected");
    });
  });
  return io;
}
