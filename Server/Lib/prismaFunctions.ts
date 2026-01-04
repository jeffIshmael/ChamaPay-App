// This file has prisma related functions
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// send notification to a user
export async function notifyUser(userId: number, message: string, type?:string) {
  try {
    await prisma.notification.create({
      data: {
        userId: userId,
        message: message,
        type: type
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
  type?:string,
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
      await notifyUser(member.userId, message, type);
    }
  } catch (error) {
    console.error("Unable to send the chama members notification.", error);
  }
}

// function to register a normal transfer payment to the database
export async function registerUserPayment(userId: number, receiver: string, amount: string, description: string, txHash: string) {
  try {
   const payment = await prisma.payment.create({
      data: {
        userId: userId,
        receiver: receiver,
        amount: amount,
        description: description,
        txHash: txHash,
      },
    });
    return payment;
  } catch (error) {
    console.error("Unable to register the payment.", error);
    return null;
  }
}