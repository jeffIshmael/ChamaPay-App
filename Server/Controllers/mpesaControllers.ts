// mpesaControllers.ts - Complete implementation with Prisma
import { Request, Response } from "express";
import { PrismaClient } from "@prisma/client";
import { tillPushStk, checkPushStatus } from "../Lib/MpesaFunctions";

const prisma = new PrismaClient();

// Initiate M-Pesa payment
export const mpesaTransaction = async (req: Request, res: Response) => {
  const { amount, phoneNo, chamaId, accountReference } = req.body;
  const userId = req.user?.userId;

  console.log("Initiating M-Pesa payment:", { amount, phoneNo, userId });

  try {
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: "Authentication required",
      });
    }

    // Validate inputs
    if (!amount || !phoneNo) {
      return res.status(400).json({
        success: false,
        error: "Amount and phone number are required",
      });
    }

    // Validate amount
    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      return res.status(400).json({
        success: false,
        error: "Invalid amount",
      });
    }

    // Initiate STK push
    const result = await tillPushStk(
      amount,
      phoneNo,
      accountReference || `USER-${userId}`
    );

    if (!result) {
      return res.status(500).json({
        success: false,
        error: "Unable to initiate payment. Please try again.",
      });
    }

    console.log("STK Push Result:", result);

    // Check if STK push was initiated successfully
    if (result.ResponseCode !== "0") {
      return res.status(400).json({
        success: false,
        error: result.ResponseDescription || result.CustomerMessage,
      });
    }

    // Save transaction to database
    const transaction = await prisma.mpesaTransaction.create({
      data: {
        userId,
        merchantRequestID: result.MerchantRequestID,
        checkoutRequestID: result.CheckoutRequestID,
        phoneNumber: phoneNo.toString(),
        amount: parsedAmount,
        status: "pending",
        accountReference: accountReference || `USER-${userId}`,
        transactionDesc: `Payment of KES ${amount}`,
        chamaId: chamaId ? parseInt(chamaId) : null,
      },
    });

    console.log(`Transaction saved to database: ${transaction.checkoutRequestID}`);

    // Return success immediately - user should check their phone
    return res.status(200).json({
      success: true,
      message: result.CustomerMessage,
      checkoutRequestID: result.CheckoutRequestID,
      merchantRequestID: result.MerchantRequestID,
    });
  } catch (error) {
    console.error("Error in mpesaTransaction:", error);
    return res.status(500).json({
      success: false,
      error: "Failed to process payment request",
    });
  }
};

// Check payment status (for polling from frontend)
export const checkPaymentStatus = async (req: Request, res: Response) => {
  const { checkoutRequestID } = req.params;
  const userId = req.user?.userId;

  console.log(`Checking payment status: ${checkoutRequestID}`);

  try {
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: "Authentication required",
      });
    }

    // STEP 1: Check database first (fastest)
    const transaction = await prisma.mpesaTransaction.findUnique({
      where: {
        checkoutRequestID,
      },
    });

    if (!transaction) {
      return res.status(404).json({
        success: false,
        error: "Transaction not found",
      });
    }

    // Verify the transaction belongs to this user
    if (transaction.userId !== userId) {
      return res.status(403).json({
        success: false,
        error: "Unauthorized access to transaction",
      });
    }

    // STEP 2: If already completed/failed, return cached status
    // (Callback has already updated the database)
    if (transaction.status !== "pending") {
      console.log(`Returning cached status: ${transaction.status}`);
      return res.status(200).json({
        success: true,
        status: transaction.status,
        resultCode: transaction.resultCode,
        resultDesc: transaction.resultDesc,
        mpesaReceiptNumber: transaction.mpesaReceiptNumber,
        transactionDate: transaction.transactionDate,
        amount: transaction.amount.toString(),
      });
    }

    // STEP 3: Still pending - query M-Pesa API as fallback
    // (Only if callback hasn't arrived yet)
    console.log("Status still pending, querying M-Pesa API...");
    const statusResult = await checkPushStatus(checkoutRequestID);

    if (!statusResult) {
      return res.status(200).json({
        success: true,
        status: "pending",
        message: "Payment still processing. Please wait...",
      });
    }

    // Parse result code
    const resultCode = parseInt(statusResult.ResultCode);
    let status = "pending";

    // Map result codes to status
    if (resultCode === 0) {
      status = "completed";
    } else if (resultCode === 1032) {
      status = "cancelled";
    } else if (resultCode === 1037) {
      status = "timeout";
    } else if (statusResult.ResultDesc && !statusResult.ResultDesc.includes("processing")) {
      // Only mark as failed if we got a definitive failure
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
      console.log(`Transaction status updated via API query: ${status}`);
    }

    return res.status(200).json({
      success: true,
      status,
      resultCode,
      resultDesc: statusResult.ResultDesc,
    });
  } catch (error) {
    console.error("Error checking payment status:", error);
    return res.status(500).json({
      success: false,
      error: "Failed to check payment status",
    });
  }
};

// M-Pesa callback handler
export const mpesaCallback = async (req: Request, res: Response) => {
  console.log("=== M-Pesa Callback Received ===");
  console.log(JSON.stringify(req.body, null, 2));

  // CRITICAL: Acknowledge receipt immediately (within 30 seconds!)
  res.status(200).json({
    ResultCode: 0,
    ResultDesc: "Accepted",
  });

  try {
    const { Body } = req.body;
    const { stkCallback } = Body || {};

    if (!stkCallback) {
      console.error("Invalid callback data - missing stkCallback");
      return;
    }

    const {
      MerchantRequestID,
      CheckoutRequestID,
      ResultCode,
      ResultDesc,
      CallbackMetadata,
    } = stkCallback;

    console.log(`Processing callback for: ${CheckoutRequestID}, ResultCode: ${ResultCode}`);

    // Find transaction in database
    const transaction = await prisma.mpesaTransaction.findUnique({
      where: {
        checkoutRequestID: CheckoutRequestID,
      },
    });

    if (!transaction) {
      console.error("Transaction not found in database:", CheckoutRequestID);
      return;
    }

    // Determine status based on result code
    let status = "failed";
    let updateData: any = {
      resultCode: ResultCode,
      resultDesc: ResultDesc,
    };

    if (ResultCode === 0) {
      // Payment successful
      status = "completed";

      // Extract callback metadata
      const metadata = CallbackMetadata?.Item || [];
      console.log("The whole metadata", metadata);
      const amount = metadata.find((item: any) => item.Name === "Amount")?.Value;
      const mpesaReceiptNumber = metadata.find(
        (item: any) => item.Name === "MpesaReceiptNumber"
      )?.Value;
      const transactionDate = metadata.find(
        (item: any) => item.Name === "TransactionDate"
      )?.Value;
      const phoneNumber = metadata.find(
        (item: any) => item.Name === "PhoneNumber"
      )?.Value;

      updateData = {
        ...updateData,
        status,
        mpesaReceiptNumber,
        transactionDate: transactionDate?.toString(),
      };

      console.log("✅ Payment successful:", {
        checkoutRequestID: CheckoutRequestID,
        amount,
        receipt: mpesaReceiptNumber,
        transactionDate,
        phoneNumber,
      });
    } else if (ResultCode === 1032) {
      status = "cancelled";
      updateData.status = status;
      console.log("❌ Payment cancelled by user");
    } else if (ResultCode === 1037) {
      status = "timeout";
      updateData.status = status;
      console.log("⏱️ Payment timed out - user didn't enter PIN");
    } else {
      status = "failed";
      updateData.status = status;
      console.log(`❌ Payment failed with code ${ResultCode}: ${ResultDesc}`);
    }

    // Update transaction in database
    await prisma.mpesaTransaction.update({
      where: { checkoutRequestID: CheckoutRequestID },
      data: updateData,
    });

    console.log(`Transaction updated in database: ${CheckoutRequestID} -> ${status}`);

    // Optional: If this is for a chama, create Payment record
    if (transaction.chamaId && status === "completed") {
      try {
        await prisma.payment.create({
          data: {
            amount: transaction.amount.toString(),
            description: `M-Pesa payment - ${updateData.mpesaReceiptNumber}`,
            txHash: updateData.mpesaReceiptNumber || CheckoutRequestID,
            userId: transaction.userId,
            chamaId: transaction.chamaId,
          },
        });
        console.log("✅ Payment record created for chama");
      } catch (paymentError) {
        console.error("Error creating payment record:", paymentError);
      }
    }
  } catch (error) {
    console.error("Error processing M-Pesa callback:", error);
  }
};

// Get user's transaction history
export const getUserTransactions = async (req: Request, res: Response) => {
  const userId = req.user?.userId;
  const { status, limit = 20, offset = 0 } = req.query;

  try {
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: "Authentication required",
      });
    }

    const whereClause: any = { userId };
    if (status) {
      whereClause.status = status;
    }

    const transactions = await prisma.mpesaTransaction.findMany({
      where: whereClause,
      orderBy: { createdAt: "desc" },
      take: parseInt(limit as string),
      skip: parseInt(offset as string),
      select: {
        id: true,
        checkoutRequestID: true,
        phoneNumber: true,
        amount: true,
        status: true,
        mpesaReceiptNumber: true,
        transactionDate: true,
        resultDesc: true,
        accountReference: true,
        createdAt: true,
      },
    });

    const total = await prisma.mpesaTransaction.count({
      where: whereClause,
    });

    return res.status(200).json({
      success: true,
      transactions,
      total,
      limit: parseInt(limit as string),
      offset: parseInt(offset as string),
    });
  } catch (error) {
    console.error("Error fetching transactions:", error);
    return res.status(500).json({
      success: false,
      error: "Failed to fetch transactions",
    });
  }
};