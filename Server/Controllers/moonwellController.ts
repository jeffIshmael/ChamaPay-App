import { PrismaClient } from "@prisma/client";
import { Request, Response } from "express";
import { bcMoonwellDeposit, bcMoonwellWithdraw } from "../Blockchain/WriteFunction";
import { getMoonwellLiveSnapshot } from "../Lib/moonwellLive";

const prisma = new PrismaClient();

// Deposit funds to Moonwell
export const depositToMoonwell = async (req: Request, res: Response): Promise<any> => {
  try {
    const { amount } = req.body;
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: "Authentication required",
      });
    }

    if (!amount) {
      return res.status(400).json({
        success: false,
        error: "Amount is required.",
      });
    }

    // Get the cdpWalletId of user
    const user = await prisma.user.findUnique({ where: { id: userId }});
    if (!user || !user.cdpWalletId) {
      return res.status(401).json({ success: false, error: "Unable to get user CDP wallet." });
    }

    console.log(`Executing Moonwell deposit for user ${userId}, amount ${amount}`);

    // Execute the Moonwell deposit on-chain
    const depositTxHash = await bcMoonwellDeposit(user.cdpWalletId, amount.toString());
    
    if (!depositTxHash) {
      return res.status(401).json({ success: false, error: "Failed to deposit to Moonwell." });
    }

    // Register the payment
    const payment = await prisma.payment.create({
      data: {
        amount: amount.toString(),
        description: "Moonwell Deposit",
        txHash: depositTxHash,
        userId: userId,
        chamaId: null, // ChamaId is null since this isn't attached to a Chama
        sender: "Wallet",
        receiver: "Moonwell",
      },
    });

    return res.status(200).json({
      success: true,
      message: "Moonwell deposit successful",
      txHash: depositTxHash,
      payment: payment,
    });
  } catch (error) {
    console.error("Moonwell deposit error:", error);
    return res.status(500).json({
      success: false,
      error: "Failed to process Moonwell deposit",
    });
  }
};

// Withdraw funds from Moonwell
export const withdrawFromMoonwell = async (req: Request, res: Response): Promise<any> => {
  try {
    const { amount, isMax } = req.body;
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: "Authentication required",
      });
    }

    if (!amount) {
      return res.status(400).json({
        success: false,
        error: "Amount is required.",
      });
    }

    // Get the cdpWalletId of user
    const user = await prisma.user.findUnique({ where: { id: userId }});
    if (!user || !user.cdpWalletId) {
      return res.status(401).json({ success: false, error: "Unable to get user CDP wallet." });
    }

    // Persist at most 6 USDC decimals (matches on-chain parsing)
    const amountStr = (() => {
      const raw = String(amount).trim();
      const [whole, frac = ""] = raw.split(".");
      return frac ? `${whole}.${frac.slice(0, 6)}` : whole;
    })();

    console.log(
      `Executing Moonwell withdrawal for user ${userId}, amount ${amountStr}, isMax: ${isMax}`
    );

    // Execute the Moonwell withdrawal on-chain (throws if balances don't move)
    const withdrawTxHash = await bcMoonwellWithdraw(
      user.cdpWalletId,
      amountStr,
      Boolean(isMax)
    );

    if (!withdrawTxHash) {
      return res
        .status(500)
        .json({ success: false, error: "Failed to withdraw from Moonwell." });
    }

    // Register the payment only after on-chain balances confirm the redeem
    const payment = await prisma.payment.create({
      data: {
        amount: amountStr,
        description: "Moonwell Withdrawal",
        txHash: withdrawTxHash,
        userId: userId,
        chamaId: null,
        sender: "Moonwell",
        receiver: "Wallet",
      },
    });

    return res.status(200).json({
      success: true,
      message: "Moonwell withdrawal successful",
      txHash: withdrawTxHash,
      payment: payment,
    });
  } catch (error) {
    console.error("Moonwell withdrawal error:", error);
    const raw =
      error instanceof Error ? error.message : "Failed to process Moonwell withdrawal";
    const lower = raw.toLowerCase();
    const message =
      lower.includes("over rate limit") || lower.includes("rate limit")
        ? "Network is busy (RPC rate limit). Please wait a few seconds and try again."
        : raw.length > 180
          ? "Failed to withdraw from Moonwell. Please try again."
          : raw;
    return res.status(500).json({
      success: false,
      error: message,
    });
  }
};

// Get Moonwell Yields
export const getMoonwellYields = async (req: Request, res: Response): Promise<any> => {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: "Authentication required",
      });
    }

    const yields = await prisma.moonwellYield.findMany({
      where: { userId: userId },
      orderBy: { createdAt: "desc" },
      take: 100, // Limit to last 100 days to prevent huge payload
    });

    return res.status(200).json({
      success: true,
      yields: yields,
    });
  } catch (error) {
    console.error("Moonwell yields error:", error);
    return res.status(500).json({
      success: false,
      error: "Failed to fetch Moonwell yields",
    });
  }
};

/**
 * Live Moonwell USDC position + market meta for the authenticated user.
 * Proxies Moonwell HTTP API (and falls back to on-chain) so the mobile app
 * does not call api.moonwell.fi directly (often blocked / Network Error on device).
 */
export const getMoonwellLiveSnapshotHandler = async (
  req: Request,
  res: Response
): Promise<any> => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: "Authentication required",
      });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { smartAddress: true },
    });
    if (!user?.smartAddress) {
      return res.status(400).json({
        success: false,
        error: "User wallet address not found",
      });
    }

    const principalUsdc = Math.max(
      0,
      parseFloat(String(req.query.principal ?? "0")) || 0
    );

    const live = await getMoonwellLiveSnapshot(user.smartAddress);
    const totalBalanceUsdc = live.totalBalanceUsdc;

    let principalForDisplay: number;
    let earnedUsdc: number;
    if (principalUsdc > 0) {
      earnedUsdc = Math.max(0, totalBalanceUsdc - principalUsdc);
      principalForDisplay = Math.min(principalUsdc, totalBalanceUsdc);
    } else {
      principalForDisplay = totalBalanceUsdc;
      earnedUsdc = 0;
    }

    return res.status(200).json({
      success: true,
      source: live.source,
      snapshot: {
        totalBalanceUsdc,
        principalUsdc: principalForDisplay,
        earnedUsdc,
        supplyApy: live.supplyApy,
        marketTotalSupplyUsd: live.marketTotalSupplyUsd,
      },
    });
  } catch (error) {
    console.error("Moonwell live snapshot error:", error);
    return res.status(500).json({
      success: false,
      error: "Failed to fetch Moonwell live snapshot",
    });
  }
};
