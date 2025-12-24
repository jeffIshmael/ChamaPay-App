// this has the functions for pretium apis
import { Request, Response } from "express";
import { PrismaClient } from "@prisma/client";

import {
  checkPretiumTxStatus,
  getQuote,
  pretiumOfframp,
  pretiumOnramp,
  verifyPhoneNo,
} from "../Lib/PretiumFunctions";

const prisma = new PrismaClient();

export async function getExchangeRate(req: Request, res: Response) {
  try {
    const { currencyCode } = req.params;
    const exchangeRate = await getQuote(currencyCode);
    return res.status(200).json({
      success: true,
      currencyCode: currencyCode,
      exchangeRate: exchangeRate,
    });
  } catch (error) {
    console.log("error in the exchange rate controller", error);
    return res.status(500).json({
      success: false,
      error: error,
    });
  }
}

export async function initiatePretiumOnramp(req: Request, res: Response) {
  const { amount, phoneNo, exchangeRate, cusdAmount } = req.body;
  const userId = req.user?.userId;
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

    // Note: the phone number should be '07....'
    if (!amount || !phoneNo) {
      return res.status(400).json({
        success: false,
        error: "Amount and phone number are required",
      });
    }
    // No additional fee while depositing
    const result = await pretiumOnramp(phoneNo, amount, user.smartAddress);
    console.log("the onramping pretium result", result);
    if (!result) {
      return res.status(400).json({
        success: false,
        error: result || "Failed to initiate pretium onramp.",
      });
    }

    // Save onramp transaction to database
    await prisma.mpesaTransaction.create({
      data: {
        userId,
        merchantRequestID: result.transaction_code,
        checkoutRequestID: result.transaction_code,
        phoneNumber: phoneNo.toString(),
        amount: amount,
        type: "Pretium",
        status: result.status,
        accountReference: "A pretium onramp tx",
        transactionDesc: `get ${cusdAmount.toFixed(6)} cUSD`,
        cusdAmount,
        exchangeRate: exchangeRate,
        walletAddress: user.smartAddress,
      },
    });

    return res.status(200).json({
      success: true,
      message: result.message,
      status: result.status,
      transactionCode: result.transaction_code,
      transactionMessage: result.message,
    });
  } catch (error) {
    console.log("error in the onramping pretium", error);
    return res.status(500).json({
      success: false,
      error: error,
    });
  }
}

export async function initiatePretiumOfframp(req: Request, res: Response) {
  const { amount, phoneNo, kesFee, cusdAmount, exchangeRate, txHash } =
    req.body;
  const userId = req.user?.userId;
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

    // Note: the phone number should be '07....'
    if (!amount || !phoneNo) {
      return res.status(400).json({
        success: false,
        error: "Amount and phone number are required",
      });
    }
    // for the offramp, the fee will be charged from the crypto
    const result = await pretiumOfframp(phoneNo, amount,kesFee, txHash);
    console.log("the offramp pretium result", result);
    if (!result) {
      return res.status(400).json({
        success: false,
        error: result || "Failed to initiate pretium onramp.",
      });
    }
    // Save onramp transaction to database
    await prisma.mpesaTransaction.create({
      data: {
        userId,
        merchantRequestID: result.transaction_code,
        checkoutRequestID: result.transaction_code,
        phoneNumber: phoneNo.toString(),
        amount: amount,
        type: "Pretium",
        status: result.status,
        accountReference: `A pretium offramp tx ${txHash}`,
        transactionDesc: `get ${amount} KES`,
        cusdAmount,
        exchangeRate: exchangeRate,
        walletAddress: user.smartAddress,
      },
    });
    return res.status(200).json({
      success: true,
      result: result,
    });
  } catch (error) {
    console.log("error in the offramping pretium", error);
    return res.status(500).json({
      success: false,
      error: error,
    });
  }
}

export async function pretiumVerifyNumber(req: Request, res: Response) {
  const { phoneNo } = req.query;
  console.log("the phone number", phoneNo);
  try {
    // Note: the phone number should be '07....'
    if (!phoneNo) {
      return res.status(400).json({
        success: false,
        error: "phone number is required",
      });
    }

    const numberDetails = await verifyPhoneNo(phoneNo as string);
    return res.status(200).json({
      success: true,
      details: numberDetails,
    });
  } catch (error) {
    console.log("error in checking phone number", error);
    return res.status(500).json({
      success: false,
      error: error,
    });
  }
}
// route to handle the pretium callback
export async function pretiumCallback(req: Request, res: Response) {
  console.log("=== Pretium Callback Received ===");
  console.log(JSON.stringify(req.body, null, 2));

  // Acknowledge immediately
  res.status(200).json({
    ResultCode: 0,
    ResultDesc: "Accepted",
  });

  try {
    const { Body } = req.body;
    const { stkCallback } = Body || {};

    console.log("The pretium callback result is", Body);
    console.log("the stkCallback", stkCallback);
    if (!stkCallback) {
      console.error("Invalid callback data");
      return;
    }

    const { status, transaction_code, receipt_number, public_name, message } =
      stkCallback;

    // Find transaction
    const transaction = await prisma.mpesaTransaction.findUnique({
      where: { checkoutRequestID: transaction_code },
    });

    if (!transaction) {
      console.error("Transaction not found:", transaction_code);
      return;
    }

    // Handle failed/cancelled payments
    if (status === "FAILED") {
      await prisma.mpesaTransaction.update({
        where: { checkoutRequestID: transaction_code },
        data: {
          status,
          resultCode: 500,
          resultDesc: message,
        },
      });

      console.log(`❌ ${transaction.type} ${status}:`, message);
      return;
    }

    // Payment successful - update the tx in  the db
    await prisma.mpesaTransaction.update({
      where: { checkoutRequestID: transaction_code },
      data: {
        status,
        resultCode: 200,
        resultDesc: message,
      },
    });

    console.log(
      `✅ ${transaction.type} successful - Receipt: ${receipt_number}`
    );
  } catch (error) {
    console.error("Error processing callback:", error);
  }
}

// checks the status of a tx
export async function pretiumCheckTransaction(req: Request, res: Response) {
  const { transactionCode } = req.body;
  console.log("the transaction code", transactionCode);
  const userId = req.user?.userId;
  try {
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: "Authentication required",
      });
    }

    const statusResult = await checkPretiumTxStatus(transactionCode);
    if (!statusResult) {
      return res.status(400).json({
        success: false,
        details: `Cannot get the status of ${transactionCode}`,
      });
    }
    console.log("The transaction status", statusResult);
    return res.status(200).json({
      success: true,
      details: statusResult,
    });
  } catch (error) {
    console.log("error in checking transaction status", error);
    return res.status(500).json({
      success: false,
      error: error,
    });
  }
}
