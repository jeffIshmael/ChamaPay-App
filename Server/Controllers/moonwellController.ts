import { PrismaClient } from "@prisma/client";
import { Request, Response } from "express";
import { bcMoonwellDeposit } from "../Blockchain/WriteFunction";

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
