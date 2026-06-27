// this file will contain the functions for the cron jobs
// which are :- checking if its startdate has started and set it to started
// checking if its paydate has reached and process the payout

import { Chama, ChamaMember, PrismaClient } from "@prisma/client";
import {
  getChamasThatHaveReachedPaydate,
  getChamasForThreeDayReminder,
  getFirstPayoutChamas,
  shuffleArray,
} from "./HelperFunctions";
import { checkPayoutResult } from "./Thirdweb";
import {
  pimlicoProcessPayout,
  pimlicoSetPayoutOrder,
} from "./pimlicoAgent";
import { notifyAllChamaMembers, notifyUser } from "./prismaFunctions";
import { formatUnits } from "viem";
import { sendExpoNotificationToAllChamaMembers, sendExpoNotificationToAUser } from "./ExpoNotificationFunctions";

const prisma = new PrismaClient();

const PAYOUT_CONCURRENCY = 5;

export interface PayoutOrder {
  userAddress: string;
  payDate: Date;
  amount: string;
  paid: boolean;
}

type ChamaWithMembers = Chama & { members: ChamaMember[] };

// set as started
export const checkStartDate = async () => {
  try {
    const firstPayoutChamas = await getFirstPayoutChamas();

    if (firstPayoutChamas.length === 0) {
      return;
    }

    const results = await Promise.allSettled(
      firstPayoutChamas.map(async (chama) => {
        const members = chama.members;
        const addresses = members.map((m) => m.user.smartAddress);
        let payoutOrderData = chama.payOutOrder;

        if (!payoutOrderData) {
          const shuffledPayoutOrder = shuffleArray(addresses);
          console.log("shuffledPayoutOrder", shuffledPayoutOrder);

          const txHash = await pimlicoSetPayoutOrder(
            Number(chama.blockchainId),
            shuffledPayoutOrder
          );

          if (!txHash) {
            throw new Error("Failed to set payout order");
          }

          const payoutOrder: PayoutOrder[] = shuffledPayoutOrder.map(
            (address, index) => ({
              userAddress: address,
              payDate: new Date(
                chama.payDate.getTime() +
                chama.cycleTime * 24 * 60 * 60 * 1000 * index
              ),
              paid: false,
              amount: "0",
            })
          );

          payoutOrderData = JSON.stringify(payoutOrder);

          await prisma.chama.update({
            where: { id: chama.id },
            data: { payOutOrder: payoutOrderData },
          });

          const firstAddress = payoutOrder[0];
          const firstMember = chama.members.find((m: any) => m.user.smartAddress === firstAddress);
          const firstName = firstMember ? firstMember.user.userName : "Someone";

          await notifyAllChamaMembers(
            chama.id,
            `Great news! The payout order for ${chama.name} is officially set. ${firstName} is up first! 🚀`
          );

          await sendExpoNotificationToAllChamaMembers(
            `Payout Order Ready! 🎉`,
            `${firstName} will receive the first payout in ${chama.name} chama. Tap to view the full order!`,
            chama.id,
            firstMember?.user.id
          );

          await sendExpoNotificationToAUser(
            firstMember?.user.id!,
            `Payout Order Ready! 🎉`,
            `You are the first in the payout order for ${chama.name} chama. Tap to view the full order!`,
          )
        }

        return { chamaId: chama.id, status: 'success' };
      })
    );

    const successful = results.filter((r) => r.status === 'fulfilled');
    const failed = results.filter((r) => r.status === 'rejected');

    console.log(`✅ Successful: ${successful.length}`);
    console.log(`❌ Failed: ${failed.length}`);

    failed.forEach((f, idx) => {
      if (f.status === 'rejected') {
        console.error(`Chama ${firstPayoutChamas[idx]?.id} failed:`, f.reason);
      }
    });

    // Send one-time 3-day payout reminders
    const reminderChamas = await getChamasForThreeDayReminder();
    for (const chama of reminderChamas) {
      const reminderType = `payout_reminder_3days_c${chama.cycle}_r${chama.round}`;
      const alreadySent = await prisma.notification.findFirst({
        where: { chamaId: chama.id, type: reminderType },
      });

      if (alreadySent) continue;

      await notifyAllChamaMembers(
        chama.id,
        `Reminder: The payout for ${chama.name} is in 3 days. Make sure you have contributed!`,
        reminderType
      );

      await sendExpoNotificationToAllChamaMembers(
        `Payout Approaching ⌛`,
        `Payout for ${chama.name} chama is in 3 days. Make sure you have contributed!`,
        chama.id
      );
    }

    return { successful: successful.length, failed: failed.length };

  } catch (error) {
    console.error('Critical error in checkStartDate:', error);
    return;
  }
};

async function processDisbursePayout(
  chama: ChamaWithMembers,
  payoutResult: { recipient: string; amount: bigint },
  txHash: string
) {
  const displayableAmount = formatUnits(payoutResult.amount, 6);

  const user = await prisma.user.findUnique({
    where: { smartAddress: payoutResult.recipient },
  });

  if (!user) {
    throw new Error("User not found");
  }

  const userTitle = "Payout received 🎉";
  const userMessage = `You've received ${displayableAmount} USDC as your payout for round ${chama.round} of '${chama.name}' chama.`;
  const othersTitle = "Payout completed 🎉";
  const othersMessage = `Round ${chama.round} of '${chama.name}' chama is complete. ${user.userName} received ${displayableAmount} USDC.`;

  await prisma.payOut.create({
    data: {
      chamaId: chama.id,
      receiver: payoutResult.recipient,
      amount: displayableAmount,
      userId: user.id,
      txHash,
    },
  });

  const payoutOrder: PayoutOrder[] = chama.payOutOrder
    ? JSON.parse(chama.payOutOrder)
    : [];

  let finalPayoutOrder: PayoutOrder[];

  if (chama.round === payoutOrder.length) {
    finalPayoutOrder = payoutOrder.map((order: PayoutOrder, index: number) => ({
      ...order,
      paid: false,
      amount: "0",
      payDate: new Date(
        chama.payDate.getTime() +
        (index + 1) * chama.cycleTime * 24 * 60 * 60 * 1000
      ),
    }));
  } else {
    finalPayoutOrder = payoutOrder.map((order: PayoutOrder) => {
      if (order.userAddress === payoutResult.recipient) {
        return { ...order, paid: true, amount: displayableAmount };
      }
      return order;
    });
  }

  await prisma.chama.update({
    where: { id: chama.id },
    data: {
      payOutOrder: JSON.stringify(finalPayoutOrder),
      round: chama.round === chama.members.length ? 1 : chama.round + 1,
      cycle: chama.round === chama.members.length ? chama.cycle + 1 : chama.cycle,
      payDate: new Date(
        chama.payDate.getTime() + chama.cycleTime * 24 * 60 * 60 * 1000
      ),
    },
  });

  await Promise.allSettled([
    notifyUser(user.id, userMessage, "payout_received"),
    sendExpoNotificationToAUser(user.id, userTitle, userMessage),
    notifyAllChamaMembers(chama.id, othersMessage, "payout_received", user.id),
    sendExpoNotificationToAllChamaMembers(othersTitle, othersMessage, chama.id, user.id),
  ]);
}

async function processRefundPayout(chama: ChamaWithMembers) {
  const payoutOrder: PayoutOrder[] = chama.payOutOrder
    ? JSON.parse(chama.payOutOrder)
    : [];

  const updatedPayoutOrder = payoutOrder.map((order: PayoutOrder) => {
    if (!order.paid) {
      return {
        ...order,
        payDate: new Date(
          new Date(order.payDate).getTime() +
          chama.cycleTime * 24 * 60 * 60 * 1000
        ),
      };
    }
    return order;
  });

  await prisma.chama.update({
    where: { id: chama.id },
    data: {
      payOutOrder: JSON.stringify(updatedPayoutOrder),
      payDate: new Date(
        chama.payDate.getTime() + chama.cycleTime * 24 * 60 * 60 * 1000
      ),
    },
  });

  const title = "Payout skipped — funds refunded";
  const message = `Cycle ${chama.cycle} Round ${chama.round} of the ${chama.name} chama didn't go through because some members didn't contribute. Your contribution has been refunded to your wallet.`;

  await Promise.allSettled([
    notifyAllChamaMembers(chama.id, message),
    sendExpoNotificationToAllChamaMembers(title, message, chama.id),
  ]);
}

async function processChamaPaydate(chama: ChamaWithMembers): Promise<void> {
  const chamaPayoutOrder: PayoutOrder[] = chama.payOutOrder
    ? JSON.parse(chama.payOutOrder)
    : [];

  if (chamaPayoutOrder.length !== chama.members.length) {
    throw new Error("Payout order length mismatch");
  }

  const receipt = await pimlicoProcessPayout([Number(chama.blockchainId)]);

  if (!receipt) {
    throw new Error("Failed to trigger payout");
  }

  const payoutResult = await checkPayoutResult(
    Number(chama.blockchainId),
    receipt
  );

  if (payoutResult.type === "disburse") {
    await processDisbursePayout(
      chama,
      payoutResult,
      receipt.transactionHash
    );
  } else if (payoutResult.type === "refund") {
    await processRefundPayout(chama);
  } else {
    throw new Error("Unknown payout result");
  }
}

async function processPaydateBatch(chamas: ChamaWithMembers[]) {
  const results = await Promise.allSettled(
    chamas.map((chama) => processChamaPaydate(chama))
  );

  results.forEach((result, idx) => {
    if (result.status === "rejected") {
      console.error(
        `checkPaydate failed for chama ${chamas[idx]?.id}:`,
        result.reason
      );
    }
  });

  const successful = results.filter((r) => r.status === "fulfilled").length;
  const failed = results.filter((r) => r.status === "rejected").length;
  console.log(`checkPaydate batch: ✅ ${successful} succeeded, ❌ ${failed} failed`);
}

// check whether the paydate has reached and process the payout
export const checkPaydate = async () => {
  const chamasThatHaveReachedPaydate = await getChamasThatHaveReachedPaydate();

  if (!chamasThatHaveReachedPaydate.length) return;

  console.log(
    `checkPaydate: processing ${chamasThatHaveReachedPaydate.length} chama(s) with concurrency ${PAYOUT_CONCURRENCY}`
  );

  for (let i = 0; i < chamasThatHaveReachedPaydate.length; i += PAYOUT_CONCURRENCY) {
    const batch = chamasThatHaveReachedPaydate.slice(i, i + PAYOUT_CONCURRENCY);
    await processPaydateBatch(batch);
  }
};
