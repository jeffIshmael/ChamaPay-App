// this file will contain the functions for the cron jobs
// which are :- checking if its startdate has started and set it to started
// checking if its paydate has reached and process the payout

import { PrismaClient } from "@prisma/client";
import { toEther } from "thirdweb";
import {
  getChamasThatHaveReachedPaydate,
  getNonStartedChamas,
  shuffleArray,
} from "./HelperFunctions";
import { checkPayoutResult, setPayoutOrder, triggerPayout } from "./Thirdweb";
import {
  pimlicoAddMemberToPayoutOrder,
  pimlicoProcessPayout,
  pimlicoSetPayoutOrder,
} from "./pimlicoAgent";
import { notifyAllChamaMembers, notifyUser } from "./prismaFunctions";
import { formatUnits } from "viem";
import { sendExpoNotificationToAllChamaMembers, sendExpoNotificationToAUser } from "./ExpoNotificationFunctions";

const prisma = new PrismaClient();

export interface PayoutOrder {
  userAddress: string;
  payDate: Date;
  amount: string;
  paid: boolean;
}

// set as started
export const checkStartDate = async () => {
  try {
    const nonStartedChamas = await getNonStartedChamas();

    if (nonStartedChamas.length === 0) {
      return;
    }

    const results = await Promise.allSettled(
      nonStartedChamas.map(async (chama) => {
        const members = chama.members;
        const addresses = members.map((m) => m.user.smartAddress);
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

        await prisma.chama.update({
          where: { id: chama.id },
          data: { payOutOrder: JSON.stringify(payoutOrder), started: true },
        });

        await notifyAllChamaMembers(
          chama.id,
          `Your ${chama.name} chama has started! Tap to view the payout order and your position.`
        );

        await sendExpoNotificationToAllChamaMembers(
          `${chama.name} Chama Started`,
          `Tap to view the payout order and your position.`,
          chama.id
        );

        return { chamaId: chama.id, status: 'success' };
      })
    );

    const successful = results.filter((r) => r.status === 'fulfilled');
    const failed = results.filter((r) => r.status === 'rejected');

    console.log(`✅ Successful: ${successful.length}`);
    console.log(`❌ Failed: ${failed.length}`);
    
    failed.forEach((f, idx) => {
      if (f.status === 'rejected') {
        console.error(`Chama ${nonStartedChamas[idx]?.id} failed:`, f.reason);
      }
    });

    return { successful: successful.length, failed: failed.length };

  } catch (error) {
    console.error('Critical error in checkStartDate:', error);
    return;
  }
};

// check whether the paydate has reached and process the payout
export const checkPaydate = async () => {
  const chamasThatHaveReachedPaydate = await getChamasThatHaveReachedPaydate();

  if (!chamasThatHaveReachedPaydate.length) return;

  for (const chama of chamasThatHaveReachedPaydate) {
    try {
      const chamaPayoutOrder = chama.payOutOrder
        ? JSON.parse(chama.payOutOrder)
        : [];

      if (chamaPayoutOrder.length !== chama.members.length) {
        throw new Error("Payout order length mismatch");
      }

      // trigger the payout on the blockchain
      const receipt = await pimlicoProcessPayout([Number(chama.blockchainId)]);

      if (!receipt) {
        throw new Error("Failed to trigger payout");
      }

      // determine disburse vs refund
      const payoutResult = await checkPayoutResult(
        Number(chama.blockchainId),
        receipt
      );

      /* ======================
         DISBURSE FLOW
      ======================= */
      if (payoutResult.type === "disburse") {
        const displayableAmount = formatUnits(payoutResult.amount, 6);

        const user = await prisma.user.findUnique({
          where: {
            smartAddress: payoutResult.recipient,
          },
        });

        if (!user) {
          throw new Error("User not found");
        }

        const userTitle = "Payout received 🎉";
        const userMessage = `You’ve received ${displayableAmount} USDC as your payout for round ${chama.round} of '${chama.name}' chama.`;

        const othersTitle = "Payout completed 🎉";
        const othersMessage = `Round ${chama.round} of '${chama.name}' chama is complete. ${user.userName} received ${displayableAmount} USDC.`;

        // record payout
        await prisma.payOut.create({
          data: {
            chamaId: chama.id,
            receiver: payoutResult.recipient,
            amount: displayableAmount,
            userId: user.id,
            txHash: receipt.transactionHash,
          },
        });

        const payoutOrder: PayoutOrder[] = chama.payOutOrder
          ? JSON.parse(chama.payOutOrder)
          : [];

        let finalPayoutOrder: PayoutOrder[] = [];

        // last round → reset cycle
        if (chama.round === payoutOrder.length) {
          finalPayoutOrder = payoutOrder.map(
            (order: PayoutOrder, index: number) => ({
              ...order,
              paid: false,
              amount: "0",
              payDate: new Date(
                chama.payDate.getTime() +
                (index + 1) * chama.cycleTime * 24 * 60 * 60 * 1000
              ),
            })
          );
        } else {
          // mark only current recipient as paid
          finalPayoutOrder = payoutOrder.map((order: PayoutOrder) => {
            if (order.userAddress === payoutResult.recipient) {
              return {
                ...order,
                paid: true,
                amount: displayableAmount,
              };
            }
            return order;
          });
        }

        await prisma.chama.update({
          where: { id: chama.id },
          data: {
            payOutOrder: JSON.stringify(finalPayoutOrder),
            round: chama.round === chama.members.length ? 1 : chama.round + 1,
            cycle:
              chama.round === chama.members.length
                ? chama.cycle + 1
                : chama.cycle,
            payDate: new Date(
              chama.payDate.getTime() + chama.cycleTime * 24 * 60 * 60 * 1000
            ),
          },
        });

        await notifyUser(user.id, userMessage, "payout_received");
        // expo notify the user
        await sendExpoNotificationToAUser(
          user.id,
          userTitle,
          userMessage,
        );

        await notifyAllChamaMembers(
          chama.id,
          othersMessage,
          "payout_received",
          user.id
        );
        // expo notify all members
        await sendExpoNotificationToAllChamaMembers(
          othersTitle,
          othersMessage,
          chama.id,
          user.id
        );
      } else if (payoutResult.type === "refund") {

        /* ======================
           REFUND FLOW
        ======================= */
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
        const message = `Cycle ${chama.cycle} Round ${chama.round} of the ${chama.name} chama didn’t go through because some members didn’t contribute. Your contribution has been refunded to your wallet.`;

        // TO DO: add how we will record the refund 

        await notifyAllChamaMembers(
          chama.id,
          message
        );
        // expo notify all members
        await sendExpoNotificationToAllChamaMembers(
          title,
          message,
          chama.id
        );
      } else {
        throw new Error("Unknown payout result");
      }
    } catch (error) {
      // 🔥 IMPORTANT: isolate failure per chama
      console.error(`checkPaydate failed for chama ${chama.id}`, error);
      // continue processing next chama
      continue;
    }
  }
};
