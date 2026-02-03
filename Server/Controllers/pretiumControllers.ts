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
import { pimlicoDepositForUser } from "../Lib/pimlicoAgent";
import { toUnits } from "thirdweb";
import { settlementAddress } from "../Lib/PretiumFunctions";
import { transferTx } from "../Blockchain/erc20Functions";
import { getPrivateKey } from "../Lib/HelperFunctions";

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
  const {
    amount,
    phoneNo,
    exchangeRate,
    usdcAmount,
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
    // deposit has no additional fee while payment has do lets handle them
    // No additional fee while depositing
    const receivingAddress = isDeposit
      ? user.smartAddress
      : "0x9bC7e0C7020242DE044c9211b5887F41E683719E";
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
        cusdAmount: usdcAmount,
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
    // send the usdc to the pretium settlement address
    // get the users private key
    const userPrivateKey = await getPrivateKey(userId);
    if (!userPrivateKey.success || userPrivateKey.privateKey === null) {
      return res.status(400).json({
        success: false,
        error: "Unable to get user signing client",
      });
    }
    const txHash = await transferTx(userPrivateKey.privateKey, amount, settlementAddress as `0x${string}`);
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
    const body = req.body;
    console.log("The normal body", body);

    // Find transaction
    const transaction = await prisma.pretiumTransaction.findUnique({
      where: { transactionCode: body.transaction_code },
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

// confirm state of onramp tx then trigger deposit for user
export async function pretiumCheckTriggerDepositFor(
  req: Request,
  res: Response
) {
  const { transactionCode, chamaBlockchainId, chamaId, amount } = req.body;
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

    if (pretiumTransaction.type !== "payment") {
      return res.status(400).json({
        success: false,
        details: `This is not a payment transaction`,
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
    // we will trigger the agent to deposit for the user
    const bigintAmount = toUnits(amount, 6);
    const bigintBlockchainId = Number(chamaBlockchainId);
    const txResult = await pimlicoDepositForUser(
      bigintBlockchainId,
      user?.smartAddress as `0x${string}`,
      bigintAmount
    );
    if (!txResult) {
      return res.status(400).json({
        success: false,
        details: `Error in the blockchain deposit for function.`,
      });
    }

    // update the payment
    await prisma.payment.create({
      data: {
        amount: amount,
        description: "deposited",
        chamaId: chamaId,
        txHash: txResult,
        userId: userId,
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
      select: { smartAddress: true },
    });

    if (!user || !user.smartAddress) {
      return res.status(400).json({
        success: false,
        error: "User  not found.",
      });
    }
    // send the usdc to the pretium settlement address
    // get the users private key
    const userPrivateKey = await getPrivateKey(userId);
    if (!userPrivateKey.success || userPrivateKey.privateKey === null) {
      return res.status(400).json({
        success: false,
        error: "Unable to get user signing client",
      });
    }
    const txHash = await transferTx(userPrivateKey.privateKey, usdcAmount, settlementAddress as `0x${string}`);
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
      result: result,
    });
  } catch (error) {
    console.log("error transferring to mobile", error);
    return res.status(500).json({
      success: false,
      error: error,
    });
  }
}
