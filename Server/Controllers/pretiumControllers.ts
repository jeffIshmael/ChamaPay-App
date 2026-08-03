// this has the functions for pretium apis
import { Request, Response } from "express";
import { PrismaClient } from "@prisma/client";

import {
  checkPretiumTxStatus,
  getQuote,
  pretiumOfframp,
  pretiumOnramp,
  transferToBank,
  transferToMobileNetwork,
  verifyMobileNetworkDetails,
  verifyNgnBankDetails,
  verifyPhoneNo,
} from "../Lib/PretiumFunctions";
import { pimlicoDepositForUser, pimlicoTransferToUser } from "../Lib/pimlicoAgent";
import { parseUnits } from "viem";
import * as cronJobFunctions from "../Lib/cronJobFunctions";
import emailService from "../Lib/EmailService";
import { settlementAddress } from "../Lib/PretiumFunctions";
import { transferTx } from "../Blockchain/erc20Functions";
import { generateUniqueSlug } from "../Lib/HelperFunctions";
import { getCached, setCache } from "../Lib/cache";

const prisma = new PrismaClient();

const EXCHANGE_RATE_TTL_MS = 60_000;

export async function getExchangeRate(req: Request, res: Response) {
  try {
    const { currencyCode } = req.params;
    const cacheKey = `exchange-rate:${currencyCode}`;
    const cached = getCached<{
      success: boolean;
      currencyCode: string;
      exchangeRate: unknown;
    }>(cacheKey);

    if (cached) {
      return res.status(200).json(cached);
    }

    const exchangeRate = await getQuote(currencyCode);
    const response = {
      success: true,
      currencyCode: currencyCode,
      exchangeRate: exchangeRate,
    };
    setCache(cacheKey, response, EXCHANGE_RATE_TTL_MS);
    return res.status(200).json(response);
  } catch (error) {
    console.log("error in the exchange rate controller", error);
    return res.status(500).json({
      success: false,
      error: error,
    });
  }
}

export async function initiatePretiumOnramp(req: Request, res: Response) {
  const {
    amount,
    phoneNo,
    exchangeRate,
    isDeposit,
    chamaId,
  } = req.body;
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
    
    // Calculate exact required USDC based on platform rate (FX Reserve logic)
    const platformRate = parseFloat(process.env.CHAMAPAY_RATE || "132");
    const exactUsdcAmount = parseFloat(amount) / platformRate;

    // For both deposits and payments, route through the treasury (FX Reserve) to absorb rate differences
    const treasuryAddress = "0x1C059486B99d6A2D9372827b70084fbfD014E978";
    const receivingAddress = treasuryAddress;
    
    const result = await pretiumOnramp(
      phoneNo,
      amount,
      receivingAddress
    );
    if (!result) {
      return res.status(400).json({
        success: false,
        error: result || "Failed to initiate pretium onramp.",
      });
    }

    // Save onramp transaction to database
    await prisma.pretiumTransaction.create({
      data: {
        userId,
        transactionCode: result.transaction_code,
        isOnramp: true,
        shortcode: phoneNo.toString(),
        amount: amount,
        type: isDeposit ? "deposit" : "payment",
        status: result.status,
        isRealesed: false,
        cusdAmount: exactUsdcAmount, // Store the exact amount we owe the user based on platform rate
        exchangeRate: exchangeRate,
        walletAddress: user.smartAddress,
        chamaId: chamaId ? Number(chamaId) : null,
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
  const { amount, phoneNo, kesFee, usdcAmount, exchangeRate } =
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
      select: { smartAddress: true, hashedPrivkey: true, cdpWalletId: true },
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
    // get the users cdp wallet
    if (!user.cdpWalletId) {
      return res.status(400).json({
        success: false,
        error: "Unable to get user CDP wallet",
      });
    }
    const txHash = await transferTx(user.cdpWalletId, usdcAmount.toString(), settlementAddress as `0x${string}`);
    if (!txHash) {
      return res.status(400).json({
        success: false,
        error: "Failed to send USDC to pretium settlement address",
      });
    }
    // for the offramp, the fee will be charged from the crypto
    const result = await pretiumOfframp(phoneNo, amount, kesFee, txHash);
    console.log("the offramp pretium result", result);
    if (!result) {
      return res.status(400).json({
        success: false,
        error: result || "Failed to initiate pretium onramp.",
      });
    }
    // Save onramp transaction to database
    await prisma.pretiumTransaction.create({
      data: {
        userId,
        transactionCode: result.transaction_code,
        isOnramp: false,
        shortcode: phoneNo.toString(),
        amount: amount,
        status: result.status,
        isRealesed: false,
        cusdAmount: usdcAmount,
        exchangeRate: exchangeRate,
        walletAddress: user.smartAddress,
      },
    });
    return res.status(200).json({
      success: true,
      message: result.message,
      status: result.status,
      transactionCode: result.transaction_code,
      result,
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
    const body = req.body;
    console.log("The normal body", body);

    // Find transaction
    const transaction = await prisma.pretiumTransaction.findUnique({
      where: { transactionCode: body.transaction_code },
      include: { user: true }
    });

    if (!transaction) {
      console.error("Transaction not found:", body.transaction_code);
      return;
    }

    if (body.is_released) {
      await prisma.pretiumTransaction.update({
        where: { transactionCode: body.transaction_code },
        data: {
          blockchainTxHash: body.transaction_hash,
          isRealesed: body.is_released,
        },
      });

      console.log(`❌ ${transaction.type} ${body.status}:`, body.message);
      return;
    }

    // Handle failed/cancelled payments
    if (body.status === "FAILED") {
      await prisma.pretiumTransaction.update({
        where: { transactionCode: body.transaction_code },
        data: {
          status: body.status,
          message: body.message,
        },
      });

      console.log(`❌ ${transaction.type} ${body.status}:`, body.message);
      return;
    }

    // Payment successful - update the tx in  the db
    await prisma.pretiumTransaction.update({
      where: { transactionCode: body.transaction_code },
      data: {
        status: body.status,
        receiptNumber: body.receipt_number,
        message: body.message,
      },
    });

    console.log(
      `✅ ${transaction.type} successful - Receipt: ${body.receipt_number}`
    );

    // Send M-Pesa Deposit Email
    if (transaction.user.emailNotify && transaction.type === "payment") {
      const timeStr = new Date().toLocaleString("en-US", {
        timeZone: "Africa/Nairobi",
        dateStyle: "medium",
        timeStyle: "short",
      });
      // Use cusdAmount if available, otherwise amount
      const displayAmount = transaction.cusdAmount ? transaction.cusdAmount.toString() : transaction.amount.toString();
      await emailService.sendMpesaDepositEmail(
        transaction.user.email,
        displayAmount,
        body.receipt_number,
        transaction.account_number || "M-Pesa",
        timeStr
      );
    }
  } catch (error) {
    console.error("Error processing callback:", error);
  }
}

// offramp callback
export async function pretiumOfframpCallback(
  req: Request,
  res: Response
) {
  console.log("=== Pretium Offramp Callback Received ===");
  console.log(JSON.stringify(req.body, null, 2));

  // Acknowledge immediately
  res.status(200).json({
    ResultCode: 0,
    ResultDesc: "Accepted",
  });

  try {
    const body = req.body;

    console.log("The normal body", body);

    // Find transaction
    const transaction = await prisma.pretiumTransaction.findUnique({
      where: {
        transactionCode: body.transaction_code,
      },
      include: { user: true }
    });

    if (!transaction) {
      console.error(
        "Offramp transaction not found:",
        body.transaction_code
      );
      return;
    }

    // Prevent duplicate processing
    if (transaction.status === "COMPLETE") {
      console.log(
        `⚠️ Offramp transaction already processed: ${body.transaction_code}`
      );
      return;
    }

    // Handle failed transaction
    if (
      body.status === "FAILED" ||
      body.status === "CANCELLED"
    ) {
      await prisma.pretiumTransaction.update({
        where: {
          transactionCode: body.transaction_code,
        },
        data: {
          status: body.status,
          message: body.message,
        },
      });

      console.log(
        `❌ Offramp ${body.status}:`,
        body.message
      );

      return;
    }

    // Handle successful offramp
    if (body.status === "COMPLETE") {
      await prisma.pretiumTransaction.update({
        where: {
          transactionCode: body.transaction_code,
        },
        data: {
          status: body.status,
          receiptNumber: body.receipt_number,
          message: body.message,
          isRealesed: true,
        },
      });

      console.log(
        `✅ Offramp successful - Receipt: ${body.receipt_number}`
      );

      // Send M-Pesa Withdraw Email
      if (transaction.user.emailNotify) {
        const timeStr = new Date().toLocaleString("en-US", {
          timeZone: "Africa/Nairobi",
          dateStyle: "medium",
          timeStyle: "short",
        });
        const displayAmount = transaction.cusdAmount ? transaction.cusdAmount.toString() : transaction.amount.toString();
        await emailService.sendMpesaWithdrawEmail(
          transaction.user.email,
          displayAmount,
          body.receipt_number,
          transaction.account_number || "M-Pesa",
          timeStr
        );
      }
    }
  } catch (error) {
    console.error(
      "Error processing offramp callback:",
      error
    );
  }
}

// checks the status of a tx from the database (no live Pretium API call)
export async function getPretiumDbStatus(req: Request, res: Response) {
  const { code } = req.params;
  const userId = req.user?.userId;
  try {
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: "Authentication required",
      });
    }

    const transaction = await prisma.pretiumTransaction.findUnique({
      where: { transactionCode: code },
    });

    if (!transaction || transaction.userId !== userId) {
      return res.status(404).json({
        success: false,
        error: "Transaction not found",
      });
    }

    return res.status(200).json({
      success: true,
      details: {
        status: transaction.status.toLowerCase(),
        is_released: transaction.isRealesed,
        receipt_number: transaction.receiptNumber,
        message: transaction.message,
        transaction_code: transaction.transactionCode,
        blockchain_tx_hash: transaction.blockchainTxHash,
      },
    });
  } catch (error) {
    console.log("error in getting pretium db status", error);
    return res.status(500).json({
      success: false,
      error: error,
    });
  }
}

// checks the status of a tx
export async function pretiumCheckTransaction(req: Request, res: Response) {
  const { transactionCode } = req.body;
  const userId = req.user?.userId;
  try {
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: "Authentication required",
      });
    }

    const transaction = await prisma.pretiumTransaction.findUnique({
      where: { transactionCode },
    });

    if (!transaction || transaction.userId !== userId) {
      return res.status(404).json({
        success: false,
        error: "Transaction not found",
      });
    }

    return res.status(200).json({
      success: true,
      details: {
        status: transaction.status.toLowerCase(),
        is_released: transaction.isRealesed,
        receipt_number: transaction.receiptNumber,
        message: transaction.message,
        transaction_code: transaction.transactionCode,
        blockchain_tx_hash: transaction.blockchainTxHash,
      },
    });
  } catch (error) {
    console.log("error in checking transaction status", error);
    return res.status(500).json({
      success: false,
      error: error,
    });
  }
}

// confirm state of onramp tx then trigger deposit for user
export async function pretiumCheckTriggerDepositFor(
  req: Request,
  res: Response
) {
  const { transactionCode, chamaBlockchainId, chamaId, amount, memberForId } = req.body;
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
      select: { smartAddress: true, userName: true },
    });
    console.log("the user is", user);
    // get pretium the transaction
    const pretiumTransaction = await prisma.pretiumTransaction.findUnique({
      where: {
        transactionCode: transactionCode,
      }
    })

    if (!pretiumTransaction) {
      return res.status(400).json({
        success: false,
        details: `Cannot get the status of ${transactionCode}`,
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
    if (!statusResult.is_released) {
      return res.status(400).json({
        success: false,
        details: `${transactionCode} transaction has not yet processed.`,
      });
    }

    let targetUserId = userId;
    let description = pretiumTransaction.type === "payment" ? "deposited" : "Wallet deposit";
    let targetAddress = user?.smartAddress;

    if (memberForId) {
      const targetUser = await prisma.user.findUnique({
        where: { id: memberForId },
        select: { smartAddress: true, userName: true }
      });
      if (!targetUser || !targetUser.smartAddress) {
        return res.status(404).json({
          success: false,
          details: "Target user or their smart address not found",
        });
      }
      targetUserId = memberForId;
      targetAddress = targetUser.smartAddress;
      description = `Deposited by @${user?.userName || "Unknown"} on behalf of @${targetUser.userName}`;
    }

    const usdcAmountToCredit = pretiumTransaction.cusdAmount;
    if (!usdcAmountToCredit) {
      return res.status(400).json({ success: false, details: "USDC amount not found" });
    }
    const bigintAmount = parseUnits(usdcAmountToCredit.toString(), 6);
    console.log("the user address is", targetAddress);
    
    let txResult;
    if (pretiumTransaction.type === "payment") {
      const bigintBlockchainId = Number(chamaBlockchainId);
      txResult = await pimlicoDepositForUser(
        bigintBlockchainId,
        targetAddress as `0x${string}`,
        bigintAmount
      );
    } else {
      // type === "deposit"
      txResult = await pimlicoTransferToUser(
        targetAddress as `0x${string}`,
        bigintAmount
      );
    }

    if (!txResult) {
      return res.status(400).json({
        success: false,
        details: `Error in the blockchain transaction.`,
      });
    }

    // update the payment
    await prisma.payment.create({
      data: {
        amount: pretiumTransaction.amount.toString(),
        description: description,
        chamaId: chamaId || null,
        txHash: txResult,
        userId: targetUserId,
      },
    });
    return res.status(200).json({
      success: true,
      details: txResult,
    });
  } catch (error) {
    console.log("error in checking transaction status", error);
    return res.status(500).json({
      success: false,
      error: error,
    });
  }
}

// check ngn bank details
export async function pretiumCheckNgnBankDetails(req: Request, res: Response) {
  const { accountNumber, bankCode } = req.body;
  const userId = req.user?.userId;
  try {
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: "Authentication required",
      });
    }

    if (!accountNumber || !bankCode) {
      return res.status(401).json({
        success: false,
        error: "Unable to get account number or bakcode.",
      });
    }

    const details = await verifyNgnBankDetails(accountNumber, Number(bankCode));
    return res.status(200).json({
      success: true,
      BankDetails: details,
    });
  } catch (error) {
    console.log("error in verifying ngn bank", error);
    return res.status(500).json({
      success: false,
      error: error,
    });
  }
}

// check ngn bank details
export async function pretiumCheckMobileNoDetails(req: Request, res: Response) {
  const { currencyCode, mobileNetwork, type, shortcode, accountNumber } =
    req.body;
  const userId = req.user?.userId;
  try {
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: "Authentication required",
      });
    }

    if (!currencyCode || !mobileNetwork || !type || !shortcode) {
      return res.status(401).json({
        success: false,
        error: "One details is not set.",
      });
    }

    const details = await verifyMobileNetworkDetails(
      currencyCode,
      shortcode,
      mobileNetwork,
      type,
      accountNumber
    );
    return res.status(200).json({
      success: true,
      MobileDetails: details,
    });
  } catch (error) {
    console.log("error in verifying mobile network details", error);
    return res.status(500).json({
      success: false,
      error: error,
    });
  }
}

// handle transfer to bank
export async function pretiumTransferToBank(req: Request, res: Response) {
  const {
    currencyCode,
    accountNumber,
    bankCode,
    amount,
    txHash,
    usdcAmount,
    exchangeRate,
    bankName,
    accountName,
  } = req.body;
  const userId = req.user?.userId;
  try {
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: "Authentication required",
      });
    }

    if (!currencyCode || !bankCode || !amount || !txHash) {
      return res.status(401).json({
        success: false,
        error: "One of the details is not set.",
      });
    }
    // Get user
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { smartAddress: true },
    });

    if (!user || !user.smartAddress) {
      return res.status(400).json({
        success: false,
        error: "User  not found.",
      });
    }

    // the amount coming in has 0.5% fee included in it :- so we get the fee
    const fee = Number(amount) * 0.005;
    const txResult = await transferToBank(
      currencyCode,
      txHash,
      amount,
      fee.toString(),
      accountNumber,
      bankCode,
      accountName,
      bankName
    );
    console.log("the pretium bank transfer result", txResult);
    if (!txResult) {
      return res.status(400).json({
        success: false,
        error: txResult || "Failed to initiate pretium offramp.",
      });
    }
    // Save offramp transaction to database
    await prisma.pretiumTransaction.create({
      data: {
        userId,
        transactionCode: txResult.transaction_code,
        isOnramp: false,
        shortcode: accountNumber,
        amount: amount,
        status: txResult.status,
        isRealesed: false,
        cusdAmount: usdcAmount,
        exchangeRate: exchangeRate,
        walletAddress: user.smartAddress,
      },
    });
    return res.status(200).json({
      success: true,
      message: txResult.message,
      status: txResult.status,
      transactionCode: txResult.transaction_code,
      result: txResult,
    });
  } catch (error) {
    console.log("error transferring to bank", error);
    return res.status(500).json({
      success: false,
      error: error,
    });
  }
}

// handle transfer to bank
export async function pretiumMobileTransfer(req: Request, res: Response) {
  const {
    currencyCode,
    mobileNetwork,
    shortCode,
    usdcAmount,
    exchangeRate,
    amount,
    amountFee
  } = req.body;
  const userId = req.user?.userId;
  try {
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: "Authentication required",
      });
    }

    if (!currencyCode || !mobileNetwork || !amount || !shortCode) {
      return res.status(401).json({
        success: false,
        error: "One of the details is not set.",
      });
    }

    // Get user
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { smartAddress: true, hashedPrivkey: true, cdpWalletId: true },
    });

    if (!user || !user.smartAddress || !user.cdpWalletId) {
      return res.status(400).json({
        success: false,
        error: "User or CDP wallet not found.",
      });
    }
    // send the usdc to the pretium settlement address
    const txHash = await transferTx(user.cdpWalletId, usdcAmount, settlementAddress as `0x${string}`);
    if (!txHash) {
      return res.status(400).json({
        success: false,
        error: "Failed to send USDC to pretium settlement address",
      });
    }
    // for the offramp, the fee will be charged from the crypto
    const result = await pretiumOfframp(shortCode, Number(amount), Number(amountFee), txHash);
    console.log("the offramp pretium result", result);
    if (!result) {
      return res.status(400).json({
        success: false,
        error: result || "Failed to initiate pretium offramp.",
      });
    }
    // Save offramp transaction to database
    await prisma.pretiumTransaction.create({
      data: {
        userId,
        transactionCode: result.transaction_code,
        isOnramp: false,
        shortcode: shortCode,
        amount: amount,
        status: result.status,
        isRealesed: false,
        cusdAmount: usdcAmount,
        exchangeRate: exchangeRate,
        walletAddress: user.smartAddress,
      },
    });
    return res.status(200).json({
      success: true,
      message: result.message,
      status: result.status,
      transactionCode: result.transaction_code,
      result,
    });
  } catch (error) {
    console.log("error transferring to mobile", error);
    return res.status(500).json({
      success: false,
      error: error,
    });
  }
}
