// This file has prisma related functions
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// send notification to a user
export async function notifyUser(userId: number, message: string) {
  try {
    await prisma.notification.create({
      data: {
        userId: userId,
        message: message,
      },
    });
  } catch (error) {
    console.log("error in creating a notification.", error);
  }
}

// function to notify all members of a chama with exception
export async function notifyAllChamaMembers(
  chamaId: number,
  message: string,
  exceptUserId?: number
) {
  try {
    // get all the members of the chama
    const allMembers = await prisma.chamaMember.findMany({
      where: {
        chamaId: chamaId,
      },
    });
    if (!allMembers) {
      throw new Error("Error getting the members.");
    }
    // send each member a text
    for (const member of allMembers) {
      if (member.userId == exceptUserId) return;
      await notifyUser(member.userId, message);
    }
  } catch (error) {
    console.error("Unable to send the chama members notification.", error);
  }
}
