import { PrismaClient } from "@prisma/client";
import { Request, Response } from "express";
import { getPlatformStats } from "../Lib/statsService";

const prisma = new PrismaClient();

export const getStats = async (_req: Request, res: Response) => {
    try {
        const stats = await getPlatformStats();
        res.setHeader("Cache-Control", "public, max-age=60");
        return res.status(200).json(stats);
    } catch (error) {
        console.error("Failed to fetch platform stats:", error);
        return res.status(500).json({ error: "Stats temporarily unavailable" });
    }
};

export const getOnchainStats = async (req: Request, res: Response): Promise<void> => {
  try {
    // 1. ACTION BREAKDOWN

    // Contributions: Payment where chamaId is not null
    const contribStats = await prisma.$queryRaw<any[]>`
      SELECT COUNT(id) as count, COALESCE(SUM(CAST(amount AS NUMERIC)), 0) as volume
      FROM "Payment"
      WHERE "chamaId" IS NOT NULL
    `;
    const contributionCount = Number(contribStats[0].count);
    const contributionVolume = Number(contribStats[0].volume);

    // Peer Transfers: Payment where chamaId is null
    const peerStats = await prisma.$queryRaw<any[]>`
      SELECT COUNT(id) as count, COALESCE(SUM(CAST(amount AS NUMERIC)), 0) as volume
      FROM "Payment"
      WHERE "chamaId" IS NULL
    `;
    const peerCount = Number(peerStats[0].count);
    const peerVolume = Number(peerStats[0].volume);

    // Payouts: PayOut model
    const payoutStats = await prisma.$queryRaw<any[]>`
      SELECT COUNT(id) as count, COALESCE(SUM(CAST(amount AS NUMERIC)), 0) as volume
      FROM "PayOut"
    `;
    const payoutCount = Number(payoutStats[0].count);
    const payoutVolume = Number(payoutStats[0].volume);

    // Chama Creations: Chama model
    const chamaCount = await prisma.chama.count();

    // Member Additions: ChamaMember model
    const memberCount = await prisma.chamaMember.count();

    const actionBreakdown = [
      { actionType: "contribution", transactionCountAllTime: contributionCount, usdcVolumeAllTime: contributionVolume },
      { actionType: "payout", transactionCountAllTime: payoutCount, usdcVolumeAllTime: payoutVolume },
      { actionType: "peer_transfer", transactionCountAllTime: peerCount, usdcVolumeAllTime: peerVolume },
      { actionType: "chama_creation", transactionCountAllTime: chamaCount, usdcVolumeAllTime: 0 },
      { actionType: "member_addition", transactionCountAllTime: memberCount, usdcVolumeAllTime: 0 },
    ];

    // 2. RECENT TRANSACTIONS
    // Unifying 5 tables to get the top 20 globally
    const recentTransactionsRaw = await prisma.$queryRaw<any[]>`
      SELECT 
        'payment-' || id AS id, "doneAt" as "timestamp", 
        CASE WHEN "chamaId" IS NULL THEN 'peer_transfer' ELSE 'contribution' END as "actionType",
        CAST(amount AS NUMERIC) as "amountUsdc", "txHash"
      FROM "Payment"

      UNION ALL

      SELECT 
        'payout-' || id AS id, "doneAt" as "timestamp", 'payout' as "actionType",
        CAST(amount AS NUMERIC) as "amountUsdc", "txHash"
      FROM "PayOut"

      UNION ALL

      SELECT 
        'chama-' || id AS id, "createdAt" as "timestamp", 'chama_creation' as "actionType",
        0 as "amountUsdc", "txHash"
      FROM "Chama"

      UNION ALL

      SELECT 
        'member-' || id AS id, "payDate" as "timestamp", 'member_addition' as "actionType",
        0 as "amountUsdc", "txHash"
      FROM "ChamaMember"

      ORDER BY "timestamp" DESC
      LIMIT 20
    `;

    const recentTransactions = recentTransactionsRaw.map((tx) => ({
      id: tx.id,
      timestamp: new Date(tx.timestamp).toISOString(),
      actionType: tx.actionType,
      amountUsdc: Number(tx.amountUsdc),
      txHash: tx.txHash,
    }));

    // 3. TREND OVER TIME (Last 30 days)
    // We group by date across the 4 queries
    const trendRaw = await prisma.$queryRaw<any[]>`
      WITH daily_counts AS (
        SELECT DATE_TRUNC('day', "doneAt") as day, COUNT(*) as cnt
        FROM "Payment"
        WHERE "doneAt" >= CURRENT_DATE - INTERVAL '30 days'
        GROUP BY day
        
        UNION ALL
        
        SELECT DATE_TRUNC('day', "doneAt") as day, COUNT(*) as cnt
        FROM "PayOut"
        WHERE "doneAt" >= CURRENT_DATE - INTERVAL '30 days'
        GROUP BY day

        UNION ALL
        
        SELECT DATE_TRUNC('day', "createdAt") as day, COUNT(*) as cnt
        FROM "Chama"
        WHERE "createdAt" >= CURRENT_DATE - INTERVAL '30 days'
        GROUP BY day

        UNION ALL
        
        SELECT DATE_TRUNC('day', "payDate") as day, COUNT(*) as cnt
        FROM "ChamaMember"
        WHERE "payDate" >= CURRENT_DATE - INTERVAL '30 days'
        GROUP BY day
      )
      SELECT day, SUM(cnt) as "transactionCount"
      FROM daily_counts
      GROUP BY day
      ORDER BY day ASC
    `;

    // Map to last 30 days array with 0s for empty days
    const trendOverTime = [];
    for (let i = 29; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateString = d.toISOString().split("T")[0];
      
      const found = trendRaw.find((t) => new Date(t.day).toISOString().split("T")[0] === dateString);
      trendOverTime.push({
        date: dateString,
        transactionCount: found ? Number(found.transactionCount) : 0,
      });
    }

    res.status(200).json({
      actionBreakdown,
      trendOverTime,
      recentTransactions,
      updatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Failed to get onchain stats:", error);
    res.status(500).json({ error: "Failed to get onchain stats" });
  }
};
