import dotenv from "dotenv";
import { Server as socketIOServer, Socket } from "socket.io";
import jwt from "jsonwebtoken";
import { PrismaClient } from "@prisma/client";
import { testSocket } from "./registerEvents";

dotenv.config();

const prisma = new PrismaClient();

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

        (socket as any).userId = decoded?.userId || decoded?.id;
        next();
      }
    );
  });

  io.on("connection", async (socket: Socket) => {
    console.log("The user is successfully connected");

    // implement the register events
    testSocket(io, socket);

    // Join a Chama room
    socket.on("joinChatroom", async (chamaId) => {
      const userId = (socket as any).userId;
      if (userId && chamaId) {
        try {
          const isMember = await prisma.chamaMember.findFirst({
            where: { chamaId: Number(chamaId), userId: Number(userId) },
          });
          const chama = await prisma.chama.findUnique({
            where: { id: Number(chamaId) },
            select: { adminId: true },
          });
          if (!isMember && chama?.adminId !== Number(userId)) {
            console.warn(`[Socket] Unauthorized room join attempt by user ${userId} for chama ${chamaId}`);
            return;
          }
        } catch (e) {
          console.error("[Socket] joinChatroom auth error:", e);
          return;
        }
      }
      socket.join(`chama_${chamaId}`);
      console.log(`User joined room chama_${chamaId}`);
    });

    // Receive and broadcast messages
    socket.on("sendMessage", async (data) => {
      const userId = (socket as any).userId;
      if (userId && data?.chamaId) {
        try {
          const isMember = await prisma.chamaMember.findFirst({
            where: { chamaId: Number(data.chamaId), userId: Number(userId) },
          });
          const chama = await prisma.chama.findUnique({
            where: { id: Number(data.chamaId) },
            select: { adminId: true },
          });
          if (!isMember && chama?.adminId !== Number(userId)) {
            console.warn(`[Socket] Unauthorized message broadcast attempt by user ${userId} for chama ${data.chamaId}`);
            return;
          }
        } catch (e) {
          console.error("[Socket] sendMessage auth error:", e);
          return;
        }
      }
      const roomName = `chama_${data.chamaId}`;

      // Broadcast to everyone in the room
      io.to(roomName).emit("newMessage", data);
    });

    // the disconnect
    socket.on("disconnect", () => {
      console.log("User is disconnected");
    });
  });
  return io;
}
