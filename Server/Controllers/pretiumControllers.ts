// this has the functions for pretium apis
import { PrismaClient } from "@prisma/client";
import { Request, Response } from "express";

import { parseUnits } from "viem";
import { transferTx } from "../Blockchain/erc20Functions";
import { bcMoonwellDeposit, bcDepositFundsToChama, bcDepositFundsForMember } from "../Blockchain/WriteFunction";
import emailService from "../Lib/EmailService";
import {
  getQuote,
  pretiumOfframp,
  pretiumOnramp,
  settlementAddress,
  transferToBank,
  verifyMobileNetworkDetails,
  verifyNgnBankDetails,
  verifyPhoneNo
} from "../Lib/PretiumFunctions";
import { getCached, setCache } from "../Lib/cache";
import { pimlicoDepositForUser, pimlicoTransferToUser, treasuryTransferToUser } from "../Lib/pimlicoAgent";
import { checkOnrampKesAllowed, KYC_REQUIRED_CODE } from "../Lib/kycService";

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
    isMoonwellDeposit,
    chamaId,
    memberForId,
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

    const requestedKes = Number(amount);
    const limitCheck = await checkOnrampKesAllowed(userId, requestedKes);
    if (!limitCheck.ok) {
      const status = limitCheck.code === KYC_REQUIRED_CODE ? 403 : 400;
      return res.status(status).json({
        success: false,
        error: limitCheck.message,
        code: limitCheck.code,
        mtdKes: limitCheck.mtdKes,
        limitKes: limitCheck.limitKes,
        remainingKes: limitCheck.remainingKes,
        kycTier: limitCheck.kycTier,
        requestedKes: limitCheck.requestedKes,
      });
    }

    // Calculate exact required USDC based on platform rate (FX Reserve logic)
    const platformRate = parseFloat(process.env.CHAMAPAY_RATE || "132");
    const exactUsdcAmount = parseFloat(amount) / platformRate;

    // For both deposits and payments, route through the treasury (FX Reserve) to absorb rate differences
    const treasuryAddress = process.env.TREASURY_WALLET;
    if (!treasuryAddress) throw new Error("TREASURY_WALLET is not set in environment.");
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
        type: isMoonwellDeposit ? "moonwell" : (isDeposit ? "deposit" : "payment"),
        status: result.status,
        isRealesed: false,
        cusdAmount: exactUsdcAmount, // Store the exact amount we owe the user based on platform rate
        exchangeRate: exchangeRate,
        walletAddress: user.smartAddress,
        chamaId: chamaId ? Number(chamaId) : null,
        memberForId: memberForId ? Number(memberForId) : null,
      } as any,
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
      // Avoid duplicate processing if already released
      if (transaction.isRealesed) {
        console.log(`⚠️ Transaction already released: ${body.transaction_code}`);
        return;
      }

      // Update tx to indicate Pretium has released funds
      await prisma.pretiumTransaction.update({
        where: { transactionCode: body.transaction_code },
        data: {
          blockchainTxHash: body.transaction_hash,
          isRealesed: true,
        },
      });

      console.log(`Pretium released USDC for ${transaction.type}. Initiating onchain transfer...`);

      // Determine target address
      let targetUserId = transaction.userId;
      let targetAddress = transaction.user.smartAddress;
      let description = transaction.type === "payment" ? "deposited" : "Wallet deposit";

      // @ts-ignore - Bypass IDE cache
      const memberForId = transaction.memberForId;

      if (memberForId) {
        const targetUser = await prisma.user.findUnique({
          where: { id: memberForId },
          select: { smartAddress: true, userName: true, email: true, emailNotify: true, location: true }
        });
        if (targetUser && targetUser.smartAddress) {
          targetUserId = memberForId;
          targetAddress = targetUser.smartAddress;
          description = `Deposited by @${transaction.user.userName || "Unknown"} on behalf of @${targetUser.userName}`;
        }
      }

      // Calculate EXACT USDC required to fulfill the KES amount using our Platform Rate, 
      // absorbing any rounding difference in the Treasury to ensure a perfect 1,000 KES UI balance
      const platformRate = parseFloat(process.env.CHAMAPAY_RATE || "132");
      const exactUsdcRequired = (Number(transaction.amount) / platformRate).toFixed(6);
      const usdcAmountToCredit = exactUsdcRequired;
      if (usdcAmountToCredit && targetAddress) {
        const bigintAmount = parseUnits(usdcAmountToCredit.toString(), 6);
        let txResult;

        try {
          if (transaction.type === "payment") {
            const bigintBlockchainId = transaction.chamaId ? Number(transaction.chamaId) : 0;
            let actualBlockchainId = bigintBlockchainId;
            let chamaName = "Chama";
            if (transaction.chamaId) {
              const chama = await prisma.chama.findUnique({ where: { id: transaction.chamaId } });
              if (chama) {
                actualBlockchainId = Number(chama.blockchainId);
                chamaName = chama.name;
              }
            }
            // First transfer to the user who initiated the payment from Treasury
            await treasuryTransferToUser(transaction.user.smartAddress as `0x${string}`, bigintAmount);

            // Wait a few seconds for public RPCs and CDP nodes to sync the new balance
            await new Promise((resolve) => setTimeout(resolve, 5000));

            // Execute deposit from user's wallet
            if (transaction.user.cdpWalletId) {
              if (memberForId && targetAddress) {
                txResult = await bcDepositFundsForMember(transaction.user.cdpWalletId, BigInt(actualBlockchainId), targetAddress, usdcAmountToCredit.toString());
              } else {
                txResult = await bcDepositFundsToChama(transaction.user.cdpWalletId, BigInt(actualBlockchainId), usdcAmountToCredit.toString());
              }
            } else {
              throw new Error("No CDP Wallet found for user to deposit to Chama");
            }
          } else if (transaction.type === "moonwell") {
            // First transfer to user from Treasury
            await treasuryTransferToUser(targetAddress as `0x${string}`, bigintAmount);
            
            // Wait a few seconds for public RPCs and CDP nodes to sync the new balance
            await new Promise((resolve) => setTimeout(resolve, 5000));

            // Then automatically deposit to Moonwell using user's CDP Wallet
            if (transaction.user.cdpWalletId) {
              txResult = await bcMoonwellDeposit(transaction.user.cdpWalletId, usdcAmountToCredit.toString());
              description = "Moonwell Deposit via M-Pesa";
            } else {
              throw new Error("No CDP Wallet found for user to deposit to Moonwell");
            }
          } else {
            txResult = await treasuryTransferToUser(targetAddress as `0x${string}`, bigintAmount);
          }

          if (txResult) {
            // Update the payment
            await prisma.payment.create({
              data: {
                amount: transaction.cusdAmount ? transaction.cusdAmount.toString() : transaction.amount.toString(),
                description: description,
                chamaId: transaction.chamaId || null,
                txHash: txResult,
                userId: targetUserId,
                receiver: transaction.type === "moonwell" ? "Moonwell" : undefined,
              },
            });

            // Mark the PretiumTransaction as COMPLETELY done now!
            await prisma.pretiumTransaction.update({
              where: { transactionCode: body.transaction_code },
              data: {
                status: "COMPLETE",
              },
            });

            console.log(`✅ Onchain transfer successful: ${txResult}`);

            if (memberForId) {
              const targetUser = await prisma.user.findUnique({
                where: { id: memberForId },
                select: { email: true, emailNotify: true, location: true }
              });
              if (targetUser && targetUser.emailNotify) {
                const amountUSDC = transaction.cusdAmount ? transaction.cusdAmount.toString() : transaction.amount.toString();
                const amountKES = targetUser.location === "KE" ? transaction.amount.toString() : null;
                // Wait, if transaction.type === "payment" and we are inside memberForId, chamaName should be defined from above.
                let chamaName = "Chama";
                if (transaction.chamaId) {
                  const chama = await prisma.chama.findUnique({ where: { id: transaction.chamaId } });
                  if (chama) chamaName = chama.name;
                }

                await emailService.sendPaidForSomeoneEmail(
                  targetUser.email,
                  transaction.user.userName || "Someone",
                  amountUSDC,
                  amountKES,
                  chamaName
                );
              }
            }
          }
        } catch (err) {
          console.error("Onchain transfer failed:", err);
          // If it fails, we keep it as processing/pending so we can retry or alert
        }
      }
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

    // Payment successful from M-Pesa but not yet released onchain
    if (body.status === "COMPLETE") {
      await prisma.pretiumTransaction.update({
        where: { transactionCode: body.transaction_code },
        data: {
          // DO NOT UPDATE STATUS TO COMPLETE YET! Wait for is_released.
          status: "processing",
          receiptNumber: body.receipt_number,
          message: body.message,
        },
      });

      console.log(
        `⏳ ${transaction.type} M-Pesa successful - Receipt: ${body.receipt_number}. Waiting for USDC release...`
      );

      // Send M-Pesa Deposit Email (We can send it now or wait for final. Let's send it now since M-Pesa is deducted)
      if (transaction.user.emailNotify && transaction.type === "deposit") {
        const timeStr = new Date().toLocaleString("en-US", {
          timeZone: "Africa/Nairobi",
          dateStyle: "medium",
          timeStyle: "short",
        });
        const displayAmountUSDC = transaction.cusdAmount ? transaction.cusdAmount.toString() : transaction.amount.toString();
        const displayAmountKES = transaction.user.location === "KE" ? transaction.amount.toString() : null;
        await emailService.sendMpesaDepositEmail(
          transaction.user.email,
          displayAmountUSDC,
          displayAmountKES,
          body.receipt_number,
          transaction.shortcode || "M-Pesa",
          timeStr
        );
      }
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
    if (
      body.status === "COMPLETE" ||
      body.status === "SUCCESS" ||
      body.status === "SUCCESSFUL" ||
      body.status === "COMPLETED"
    ) {
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
        const displayAmountUSDC = transaction.cusdAmount ? transaction.cusdAmount.toString() : transaction.amount.toString();
        const displayAmountKES = transaction.user.location === "KE" ? transaction.amount.toString() : null;
        await emailService.sendMpesaWithdrawEmail(
          transaction.user.email,
          displayAmountUSDC,
          displayAmountKES,
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
