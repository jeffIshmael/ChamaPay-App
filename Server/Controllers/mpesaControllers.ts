// mpesaControllers.ts - Updated with proper flow
import { Request, Response } from "express";
import { tillPushStk, checkPushStatus } from "../Lib/MpesaFunctions";
// import { MpesaTransaction } from "../models/MpesaTransaction"; // Adjust import based on your DB

// Initiate M-Pesa payment
export const mpesaTransaction = async (req: Request, res: Response) => {
  const { amount, phoneNo } = req.body;
  const userId = req.user?.userId;

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

    // Initiate STK push
    const result = await tillPushStk(amount, phoneNo, `USER-${userId}`);

    if (!result) {
      return res.status(500).json({
        success: false,
        error: "Unable to initiate payment",
      });
    }

    // Check if STK push was initiated successfully
    if (result.ResponseCode !== "0") {
      return res.status(400).json({
        success: false,
        error: result.ResponseDescription || "Failed to initiate payment",
      });
    }

    // Save transaction to database

    // Return success - user should check their phone
    return res.status(200).json({
      success: true,
      message: result.CustomerMessage,
      checkoutRequestID: result.CheckoutRequestID,
      merchantRequestID: result.MerchantRequestID,
    });
  } catch (error) {
    console.error("M-Pesa transaction error:", error);
    return res.status(500).json({
      success: false,
      error: "Failed to process payment",
    });
  }
};

// Check payment status (for polling from frontend)
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
    // const transaction = await MpesaTransaction.findOne({
    //   checkoutRequestID,
    //   userId,
    // });

    // if (!transaction) {
    //   return res.status(404).json({
    //     success: false,
    //     error: "Transaction not found",
    //   });
    // }

    // If already completed/failed, return cached status
    // if (transaction.status !== "pending") {
    //   return res.status(200).json({
    //     success: true,
    //     status: transaction.status,
    //     resultCode: transaction.resultCode,
    //     resultDesc: transaction.resultDesc,
    //     mpesaReceiptNumber: transaction.mpesaReceiptNumber,
    //   });
    // }

    // Query M-Pesa API for latest status
    const statusResult = await checkPushStatus(checkoutRequestID);

    if (!statusResult) {
      return res.status(200).json({
        success: true,
        status: "pending",
        message: "Payment still processing",
      });
    }

    // Update transaction based on result
    const resultCode = parseInt(statusResult.ResultCode);
    let status = "pending";

    if (resultCode === 0) {
      status = "completed";
    } else if (resultCode === 1032) {
      status = "cancelled";
    } else if (resultCode === 1037) {
      status = "timeout";
    } else {
      status = "failed";
    }

    // Update database
    // transaction.status = status;
    // transaction.resultCode = resultCode;
    // transaction.resultDesc = statusResult.ResultDesc;
    // await transaction.save();

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
  console.log("M-Pesa Callback Received:", JSON.stringify(req.body, null, 2));

  // Acknowledge receipt immediately
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

    const {
      MerchantRequestID,
      CheckoutRequestID,
      ResultCode,
      ResultDesc,
      CallbackMetadata,
    } = stkCallback;

    // Find transaction
    // const transaction = await MpesaTransaction.findOne({
    //   checkoutRequestID: CheckoutRequestID,
    // });

    // if (!transaction) {
    //   console.error("Transaction not found:", CheckoutRequestID);
    //   return;
    // }

    // // Update transaction based on result
    // transaction.resultCode = ResultCode;
    // transaction.resultDesc = ResultDesc;

    if (ResultCode === 0) {
      // Payment successful
      // transaction.status = "completed";

      // Extract callback metadata
      const metadata = CallbackMetadata?.Item || [];
      const amount = metadata.find((item: any) => item.Name === "Amount")?.Value;
      const mpesaReceiptNumber = metadata.find(
        (item: any) => item.Name === "MpesaReceiptNumber"
      )?.Value;
      const transactionDate = metadata.find(
        (item: any) => item.Name === "TransactionDate"
      )?.Value;

      // transaction.mpesaReceiptNumber = mpesaReceiptNumber;
      // transaction.transactionDate = transactionDate?.toString();

      console.log("Payment successful:", {
        checkoutRequestID: CheckoutRequestID,
        amount,
        receipt: mpesaReceiptNumber,
      });
    } else if (ResultCode === 1032) {
      // transaction.status = "cancelled";
    } else if (ResultCode === 1037) {
      // transaction.status = "timeout";
    } else {
      // transaction.status = "failed";
    }

    // await transaction.save();

    // console.log("Transaction updated:", {
    //   checkoutRequestID: CheckoutRequestID,
    //   status: transaction.status,
    // });
  } catch (error) {
    console.error("Error processing M-Pesa callback:", error);
  }
};