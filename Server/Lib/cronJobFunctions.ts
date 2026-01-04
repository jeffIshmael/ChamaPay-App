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

const prisma = new PrismaClient();

interface PayoutOrder {
  userAddress: string;
  payDate: Date;
  paid: boolean;
}

// set as started
export const checkStartDate = async () => {
  try {
    const nonStartedChamas = await getNonStartedChamas();

    if (nonStartedChamas.length < 0) {
      return;
    }
    for (const chama of nonStartedChamas) {
      const members = chama.members;

      // extract blockchain addresses
      const addresses = members.map(
        (m) => m.user.smartAddress // or m.user.address
      );

      // shuffle them
      const shuffledPayoutOrder = shuffleArray(addresses);

      // send to contract
      const txHash = await pimlicoSetPayoutOrder(
        Number(chama.blockchainId),
        shuffledPayoutOrder
      );
      if (!txHash) throw new Error("Failed to set payout order");

      // compute payout dates
      const payoutOrder: PayoutOrder[] = shuffledPayoutOrder.map(
        (address, index) => ({
          userAddress: address,
          payDate: new Date(
            chama.payDate.getTime() +
              chama.cycleTime * 24 * 60 * 60 * 1000 * index
          ),
          paid: false,
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
    }
  } catch (error) {
    console.log(error);
    return;
  }
};

// check whether the paydate has reached and process the payout
export const checkPaydate = async () => {
  try {
    const chamasThatHaveReachedPaydate =
      await getChamasThatHaveReachedPaydate();
    if (chamasThatHaveReachedPaydate.length <= 0) {
      return;
    }
    for (const chama of chamasThatHaveReachedPaydate) {
      // trigger the payout on the blockchain
      // the pimlico requires it as an array
      const arrayBlockchainId = [Number(chama.blockchainId)];
      const receipt = await pimlicoProcessPayout(arrayBlockchainId);
      if (!receipt) {
        throw new Error("Failed to trigger payout");
      }

      // Check whether what happened was a disburse or refund
      const payoutResult = await checkPayoutResult(
        Number(chama.blockchainId),
        receipt
      );

      if (payoutResult.type === "disburse") {
        // Handle disburse - update database, send notifications, etc.
        console.log(
          `Chama ${chama.id}: Disbursed ${payoutResult.amount} to ${payoutResult.recipient}`
        );

        // format the amount
        const displayableAmount = formatUnits(payoutResult.amount, 6);

        // get the user
        const user = await prisma.user.findUnique({
          where: {
            smartAddress: payoutResult.recipient,
          },
        });
        if (!user) {
          throw new Error("User not found");
        }

        const userMessage = `You’ve received ${displayableAmount} USDC as the payout for round ${chama.round} of the ${chama.name} chama.`;
        const othersMessage = `${chama.name} chama – round ${chama.round} payout is complete! 🎉 ${user.userName} received ${displayableAmount} USDC.`;

        // update a payout record in the database
        await prisma.payOut.create({
          data: {
            chamaId: chama.id,
            receiver: payoutResult.recipient,
            amount: displayableAmount,
            userId: user.id,
          },
        });

        // update the payout order in the chama
        const payoutOrder: PayoutOrder[] = JSON.parse(
          chama.payOutOrder as string
        );
        const updatedPayoutOrder = payoutOrder.map((order: PayoutOrder) => {
          if (order.userAddress === payoutResult.recipient) {
            return {
              ...order,
              paid: true,
              amount: displayableAmount,
            };
          }
          return order;
        });
        await prisma.chama.update({
          where: { id: chama.id },
          data: {
            payOutOrder: JSON.stringify(updatedPayoutOrder),
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
        // send the recipient the text
        await notifyUser(user.id, userMessage, "payout_received");
        // Send notification to other members
        await notifyAllChamaMembers(
          chama.id,
          othersMessage,
          "payout_received",
          user.id
        );
      } else if (payoutResult.type === "refund") {
        // Handle refund - notify members
        console.log(`Chama ${chama.id}: Refund processed`);

        // update the payout order in the chama
        const payoutOrder: PayoutOrder[] = JSON.parse(
          chama.payOutOrder as string
        );
        const updatedPayoutOrder = payoutOrder.map((order: PayoutOrder) => {
          // Extend paydate for unpaid members by cycleTime
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

        // Update chama with extended paydate
        await prisma.chama.update({
          where: { id: chama.id },
          data: {
            payOutOrder: JSON.stringify(updatedPayoutOrder),
            payDate: new Date(
              chama.payDate.getTime() + chama.cycleTime * 24 * 60 * 60 * 1000
            ),
          },
        });
        // Send notification to all members about refund
        await notifyAllChamaMembers(
          chama.id,
          `Round ${chama.round} of the ${chama.name} chama couldn’t proceed because not all members contributed. Your contribution has been refunded to your wallet.`
        );
      } else {
        console.warn(`Chama ${chama.id}: Unknown payout result`);
      }
    }
  } catch (error) {
    console.log(error);
    return;
  }
};
