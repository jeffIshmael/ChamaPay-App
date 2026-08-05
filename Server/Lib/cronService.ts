import cron from "node-cron";
import axios from "axios";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const MOONWELL_API_BASE = "https://api.moonwell.fi/v1";

export const initCronJobs = () => {
  // Run every day at 3:00 AM EAT (which is 00:00 UTC)
  cron.schedule("0 0 * * *", async () => {
    console.log("Running Daily Moonwell Yield check at", new Date().toISOString());

    try {
      // 1. Fetch all users who have a CDP wallet
      const users = await prisma.user.findMany({
        where: {
          cdpWalletId: { not: null },
        },
      });

      for (const user of users) {
        if (!user.smartAddress) continue;

        try {
          // 2. Fetch live Moonwell position
          const response = await axios.get(
            `${MOONWELL_API_BASE}/positions/${user.smartAddress}?chain=base`
          );

          let liveBalanceStr = "0";

          if (
            response.data &&
            response.data.data &&
            Array.isArray(response.data.data)
          ) {
            const usdcMarket = response.data.data.find(
              (pos: any) =>
                pos.marketAddress &&
                pos.marketAddress.toLowerCase() ===
                  "0xedc817a28e8b93b03976fbd4a3ddbc9f7d176c22"
            );
            if (usdcMarket && usdcMarket.suppliedUsd) {
              liveBalanceStr = String(usdcMarket.suppliedUsd);
            }
          }

          const liveBalance = parseFloat(liveBalanceStr);
          if (liveBalance <= 0) continue; // Skip if user has no balance

          // 3. Find the last known yield record to compare against
          const lastYieldRecord = await prisma.moonwellYield.findFirst({
            where: { userId: user.id },
            orderBy: { createdAt: "desc" },
          });

          // Fetch any manual deposits/withdrawals since the last yield check
          const lastCheckDate = lastYieldRecord ? lastYieldRecord.createdAt : new Date(0);
          
          const recentPayments = await prisma.payment.findMany({
            where: {
              userId: user.id,
              doneAt: { gt: lastCheckDate },
              OR: [
                { description: "Moonwell Deposit" },
                { description: "Moonwell Withdrawal" }
              ]
            }
          });

          let netTransfers = 0;
          for (const tx of recentPayments) {
            const amount = parseFloat(tx.amount) || 0;
            if (tx.description === "Moonwell Deposit") netTransfers += amount;
            if (tx.description === "Moonwell Withdrawal") netTransfers -= amount;
          }

          const previousBalance = lastYieldRecord ? parseFloat(lastYieldRecord.balance) : 0;
          
          // Yield = Live Balance - (Previous Balance + Net Transfers)
          let earned = liveBalance - (previousBalance + netTransfers);

          // Only log if earned is positive (to avoid logging negative yield due to price fluctuations or rounding)
          if (earned > 0.000001) {
            await prisma.moonwellYield.create({
              data: {
                userId: user.id,
                earned: earned.toFixed(6),
                balance: liveBalance.toFixed(6),
              },
            });
            console.log(`Logged ${earned.toFixed(6)} yield for user ${user.id}`);
          } else {
             // Still log the balance update so the baseline is fresh, but earned is 0
             await prisma.moonwellYield.create({
              data: {
                userId: user.id,
                earned: "0.000000",
                balance: liveBalance.toFixed(6),
              },
            });
          }
        } catch (err) {
          console.error(`Error processing yield for user ${user.id}:`, err);
        }
      }
    } catch (error) {
      console.error("Cron Job Error:", error);
    }
  });

  console.log("Daily Moonwell Yield cron job initialized.");
};
