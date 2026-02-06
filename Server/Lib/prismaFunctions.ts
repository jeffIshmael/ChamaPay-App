// This file has prisma related functions
import { PrismaClient } from "@prisma/client";
import { PayoutOrder } from "./cronJobFunctions";
import { sendExpoNotificationToAllChamaMembers, sendExpoNotificationToAUser } from "./ExpoNotificationFunctions";

const prisma = new PrismaClient();

// send notification to a user
export async function notifyUser(
  userId: number,
  message: string,
  type?: string
) {
  try {
    await prisma.notification.create({
      data: {
        userId: userId,
        message: message,
        type: type,
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
  type?: string,
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
export async function registerUserPayment(
  userId: number,
  receiver: string,
  amount: string,
  description: string,
  txHash: string
) {
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

// function to add member to payout order :- wee need to ensure the cycle is not half way
export async function addMemberToPayout(chamaId: number, userId: number) {
  try {
    const chama = await prisma.chama.findUnique({
      where: {
        id: chamaId,
      },
    });
    if (!chama) {
      throw new Error("Cannot get chama.");
    }

    const user = await prisma.user.findUnique({
      where: {
        id: userId,
      },
    });
    if (!user) {
      throw new Error("Cannot get user.");
    }
    // the payout order
    const payoutOrder: PayoutOrder[] = chama.payOutOrder
      ? JSON.parse(chama.payOutOrder)
      : [];
    if (payoutOrder.length > 0 && chama.started && chama.round == 1) {
      const newPayOut = {
        userAddress: user.smartAddress!,
        payDate: new Date(
          new Date(payoutOrder[payoutOrder.length - 1].payDate).getTime() +
          chama.cycleTime * 24 * 60 * 60 * 1000
        ),
        amount: "0",
        paid: false,
      };
      payoutOrder.push(newPayOut);

      await prisma.chama.update({
        where: {
          id: chamaId,
        },
        data: {
          payOutOrder: JSON.stringify(payoutOrder),
        },
      });
    }
  } catch (error) {
    console.log(error);
    throw new Error("couldnt add member to payout order");
  }
}

// function to send admin request to join
export async function requestToJoin(userId: number, chamaId: number) {
  try {
    const request = await prisma.chamaRequest.create({
      data: {
        userId: userId,
        chamaId: chamaId,
      },
    });
    if (!request) {
      throw new Error("Unable to create request.");
    }
    return request;
  } catch (error) {
    console.error("send request error", error);
    return null;
  }
}

// approve/ reject  request
export async function handleRequest(
  requestId: number,
  chamaName: string,
  userName: string,
  approve: boolean
) {
  try {
    const request = await prisma.chamaRequest.update({
      where: {
        id: requestId,
      },
      data: {
        status: approve ? "approved" : "rejected",
      },
    });
    if (!request) {
      throw new Error("Unable to update request.");
    }
    if (approve) {
      // add member if approve
      await prisma.chamaMember.create({
        data: {
          chamaId: request.chamaId,
          userId: request.userId,
          payDate: new Date(Date.now()),
        },
      });

      await addMemberToPayout(request.chamaId, request.userId);

      // send members of the new member
      const message = `${userName} has joined the ${chamaName} chama.`;
      await notifyAllChamaMembers(
        request.chamaId,
        message,
        "member_joined",
        request.userId,
      );
      // expo notify all members
      await sendExpoNotificationToAllChamaMembers(
        `New member joined.`,
        message,
        request.chamaId,
        request.userId
      );
    }
    const title = approve
      ? "You’ve been approved 🎉"
      : "Request not approved";

    // notification to the sender
    const message = approve
      ? `Your request to join the ${chamaName} chama has been approved. Welcome aboard!`
      : `Your request to join the ${chamaName} chama was not approved at this time.`;
    await notifyUser(request.userId, message, "new_message");
    // expo notify the sender
    await sendExpoNotificationToAUser(
      request.userId,
      title,
      message
    );
    return request;
  } catch (error) {
    console.error("approve request error", error);
    return null;
  }
}

// functions to get requests that a user has to approve
export async function getSentRequests(userId: number) {
  try {
    return await prisma.chamaRequest.findMany({
      where: {
        chama: {
          adminId: userId,
        },
      },
      include: {
        chama: true,
        user: {
          select: {
            id: true,
            smartAddress: true,
            userName: true,
            profileImageUrl: true,
          },
        },
      },
    });
  } catch (error) {
    console.error("approve request error", error);
    return [];
  }
}

/// function to check whether userhas a chama's join request
export async function checkHasPendingRequest(userId: number, chamaId: number) {
  try {
    const request = await prisma.chamaRequest.findFirst({
      where: {
        chamaId: chamaId,
        userId: userId,
        status: "pending",
      },
    });
    if (request) return true;
    return false;
  } catch (error) {
    console.error("Unable to check if there is request", error);
    return null;
  }
}
