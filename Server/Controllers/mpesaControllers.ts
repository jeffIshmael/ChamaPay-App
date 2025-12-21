// mpesaControllers.ts - Unified controller for payments and onramp
import { Request, Response } from "express";
import { PrismaClient } from "@prisma/client";
import { tillPushStk, checkPushStatus } from "../Lib/MpesaFunctions";
import { onrampcUSD } from "../Lib/Thirdweb";

const prisma = new PrismaClient();

/**
 * Initiate onramp transaction for both onramp and payments (buy cUSD)
 */
export const initiateOnramp = async (req: Request, res: Response) => {
  const { amount, phoneNo, description, isPayment, exchangeRate } = req.body;
  const userId = req.user?.userId;

  console.log("Initiating onramp:", { amount, phoneNo, userId });

  try {
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: "Authentication required",
      });
    }

    // Get user's wallet address
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { smartAddress: true },
    });

    if (!user || !user.smartAddress) {
      return res.status(400).json({
        success: false,
        error: "User wallet address not found",
      });
    }

    if (!amount || !phoneNo) {
      return res.status(400).json({
        success: false,
        error: "Amount and phone number are required",
      });
    }

    const kesAmount = parseFloat(amount);
    const rateNumber = parseFloat(exchangeRate);
    if (isNaN(kesAmount) || kesAmount <= 0) {
      return res.status(400).json({
        success: false,
        error: "Invalid amount",
      });
    }

    // Calculate cUSD amount
    const cusdAmount = kesAmount / rateNumber;

    // Initiate STK push
    const result = await tillPushStk(
      amount,
      phoneNo,
      description
    );

    if (!result || result.ResponseCode !== "0") {
      return res.status(400).json({
        success: false,
        error: result?.ResponseDescription || "Failed to initiate payment",
      });
    }

    // Save onramp transaction to database
    await prisma.mpesaTransaction.create({
      data: {
        userId,
        merchantRequestID: result.MerchantRequestID,
        checkoutRequestID: result.CheckoutRequestID,
        phoneNumber: phoneNo.toString(),
        amount: kesAmount,
        type: isPayment ? "payment" : "onramp",
        status: "pending",
        accountReference: description,
        transactionDesc: `${isPayment ? "Pay" : "Buy"} ${cusdAmount.toFixed(6)} cUSD`,
        cusdAmount,
        exchangeRate: exchangeRate,
        walletAddress: user.smartAddress,
      },
    });

    return res.status(200).json({
      success: true,
      message: result.CustomerMessage,
      checkoutRequestID: result.CheckoutRequestID,
      kesAmount,
      cusdAmount: cusdAmount.toFixed(6),
      exchangeRate: exchangeRate,
    });
  } catch (error) {
    console.error("Error initiating onramp:", error);
    return res.status(500).json({
      success: false,
      error: "Failed to initiate onramp",
    });
  }
};

/**
 * Check transaction status (works for both payments and onramp)
 */
export const checkPaymentStatus = async (req: Request, res: Response) => {
  const { checkoutRequestID } = req.params;
  const userId = req.user?.userId;

  try {
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: "Authentication required",
      });
    }

    // Check database first
    const transaction = await prisma.mpesaTransaction.findUnique({
      where: { checkoutRequestID },
    });

    if (!transaction) {
      return res.status(404).json({
        success: false,
        error: "Transaction not found",
      });
    }

    if (transaction.userId !== userId) {
      return res.status(403).json({
        success: false,
        error: "Unauthorized access",
      });
    }

    // If already completed/failed, return cached status
    if (transaction.status !== "pending") {
      const response: any = {
        success: true,
        status: transaction.status,
        resultCode: transaction.resultCode,
        resultDesc: transaction.resultDesc,
        mpesaReceiptNumber: transaction.mpesaReceiptNumber,
        transactionDate: transaction.transactionDate,
        amount: transaction.amount.toString(),
        type: transaction.type,
      };

      // Add onramp-specific fields
      if (transaction.type === "onramp") {
        response.cusdAmount = transaction.cusdAmount?.toString();
        response.blockchainTxHash = transaction.blockchainTxHash;
        response.exchangeRate = transaction.exchangeRate?.toString();
      }

      return res.status(200).json(response);
    }

    // Still pending - query M-Pesa API
    const statusResult = await checkPushStatus(checkoutRequestID);

    if (!statusResult) {
      return res.status(200).json({
        success: true,
        status: "pending",
        message:
          transaction.type === "onramp"
            ? "Waiting for payment confirmation..."
            : "Payment still processing...",
        type: transaction.type,
        cusdAmount: transaction.cusdAmount?.toString(),
      });
    }

    const resultCode = parseInt(statusResult.ResultCode);
    let status = "pending";

    if (resultCode === 0) {
      status = "completed";
    } else if (resultCode === 1032) {
      status = "cancelled";
    } else if (resultCode === 1037) {
      status = "timeout";
    } else if (!statusResult.ResultDesc?.includes("processing")) {
      status = "failed";
    }

    // Update database if status changed
    if (status !== "pending") {
      await prisma.mpesaTransaction.update({
        where: { checkoutRequestID },
        data: {
          status,
          resultCode,
          resultDesc: statusResult.ResultDesc,
        },
      });
    }

    return res.status(200).json({
      success: true,
      status,
      resultCode,
      resultDesc: statusResult.ResultDesc,
      type: transaction.type,
      cusdAmount: transaction.cusdAmount?.toString(),
    });
  } catch (error) {
    console.error("Error checking payment status:", error);
    return res.status(500).json({
      success: false,
      error: "Failed to check payment status",
    });
  }
};

/**
 * Unified M-Pesa callback handler (handles both payments and onramp)
 */
export const mpesaCallback = async (req: Request, res: Response) => {
  console.log("=== M-Pesa Callback Received ===");
  console.log(JSON.stringify(req.body, null, 2));

  // Acknowledge immediately
  res.status(200).json({
    ResultCode: 0,
    ResultDesc: "Accepted",
  });

  try {
    const { Body } = req.body;
    const { stkCallback } = Body || {};

    if (!stkCallback) {
      console.error("Invalid callback data");
      return;
    }

    const { CheckoutRequestID, ResultCode, ResultDesc, CallbackMetadata } =
      stkCallback;

    // Find transaction
    const transaction = await prisma.mpesaTransaction.findUnique({
      where: { checkoutRequestID: CheckoutRequestID },
    });

    if (!transaction) {
      console.error("Transaction not found:", CheckoutRequestID);
      return;
    }

    // Handle failed/cancelled payments
    if (ResultCode !== 0) {
      let status = "failed";
      if (ResultCode === 1032) status = "cancelled";
      else if (ResultCode === 1037) status = "timeout";

      await prisma.mpesaTransaction.update({
        where: { checkoutRequestID: CheckoutRequestID },
        data: {
          status,
          resultCode: ResultCode,
          resultDesc: ResultDesc,
        },
      });

      console.log(`❌ ${transaction.type} ${status}:`, ResultDesc);
      return;
    }

    // Payment successful - extract metadata
    const metadata = CallbackMetadata?.Item || [];
    const mpesaReceiptNumber = metadata.find(
      (item: any) => item.Name === "MpesaReceiptNumber"
    )?.Value;
    const transactionDate = metadata.find(
      (item: any) => item.Name === "TransactionDate"
    )?.Value;

    console.log(
      `✅ ${transaction.type} successful - Receipt: ${mpesaReceiptNumber}`
    );

    // Handle based on transaction type
    if (transaction.type === "onramp") {
      await handleOnrampCallback(
        transaction,
        mpesaReceiptNumber,
        transactionDate
      );
    } else {
      await handlePaymentCallback(
        transaction,
        mpesaReceiptNumber,
        transactionDate
      );
    }
  } catch (error) {
    console.error("Error processing callback:", error);
  }
};

/**
 * Handle onramp callback - send cUSD to user
 */
async function handleOnrampCallback(
  transaction: any,
  mpesaReceiptNumber: string,
  transactionDate: string
) {
  try {
    console.log(
      `🚀 Sending ${transaction.cusdAmount} cUSD to ${transaction.walletAddress}`
    );

    // Send cUSD to user's wallet
    const txHash = await onrampcUSD(
      transaction.smartAddress as `0x${string}`,
      transaction.cusdAmount
    );
    if (!txHash) {
      console.error("Failed to send cUSD:");

      // Update as failed
      await prisma.mpesaTransaction.update({
        where: { checkoutRequestID: transaction.checkoutRequestID },
        data: {
          status: "failed",
          resultCode: 0,
          resultDesc: `M-Pesa OK but cUSD transfer failed`,
          mpesaReceiptNumber,
          transactionDate: transactionDate?.toString(),
        },
      });
      return;
    }

    console.log(`✅ cUSD sent successfully - TxHash: ${txHash}`);

    // Update as completed with blockchain details
    await prisma.mpesaTransaction.update({
      where: { checkoutRequestID: transaction.checkoutRequestID },
      data: {
        status: "completed",
        resultCode: 0,
        resultDesc: "Transaction successful",
        mpesaReceiptNumber,
        transactionDate: transactionDate?.toString(),
        blockchainTxHash: txHash,
      },
    });

    console.log(`✅ Onramp completed for user ${transaction.userId}`);
  } catch (error) {
    console.error("Error handling onramp callback:", error);
  }
}

/**
 * Handle regular payment callback
 */
async function handlePaymentCallback(
  transaction: any,
  mpesaReceiptNumber: string,
  transactionDate: string
) {
  try {
    // Update transaction as completed
    await prisma.mpesaTransaction.update({
      where: { checkoutRequestID: transaction.checkoutRequestID },
      data: {
        status: "completed",
        resultCode: 0,
        resultDesc: "Transaction successful",
        mpesaReceiptNumber,
        transactionDate: transactionDate?.toString(),
      },
    });

    // If for a chama, create Payment record
    if (transaction.chamaId) {
      await prisma.payment.create({
        data: {
          amount: transaction.amount.toString(),
          description: `M-Pesa payment - ${mpesaReceiptNumber}`,
          txHash: mpesaReceiptNumber || transaction.checkoutRequestID,
          userId: transaction.userId,
          chamaId: transaction.chamaId,
        },
      });
      console.log("✅ Payment record created for chama");
    }

    console.log(`✅ Payment completed for user ${transaction.userId}`);
  } catch (error) {
    console.error("Error handling payment callback:", error);
  }
}

/**
 * Get user's transaction history
 */
export const getUserTransactions = async (req: Request, res: Response) => {
  const userId = req.user?.userId;
  const { type, status, limit = 20, offset = 0 } = req.query;

  try {
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: "Authentication required",
      });
    }

    const whereClause: any = { userId };
    if (type) whereClause.type = type;
    if (status) whereClause.status = status;

    const transactions = await prisma.mpesaTransaction.findMany({
      where: whereClause,
      orderBy: { createdAt: "desc" },
      take: parseInt(limit as string),
      skip: parseInt(offset as string),
    });

    const total = await prisma.mpesaTransaction.count({
      where: whereClause,
    });

    return res.status(200).json({
      success: true,
      transactions,
      total,
    });
  } catch (error) {
    console.error("Error fetching transactions:", error);
    return res.status(500).json({
      success: false,
      error: "Failed to fetch transactions",
    });
  }
};
