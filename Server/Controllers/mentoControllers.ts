// contains all the mento sdk functions
// process to swap
// 1. get the pairs
// 2. get the quote
// 3. approve the sending/ swapping
// 4. swap
// I'll do this according to the app.mento.org
import { Mento, TradablePair } from "@mento-protocol/mento-sdk";
import { ethers, providers } from "ethers";
import { parseUnits } from "ethers/lib/utils";
import { Request, Response } from "express";
import { cUSDAddress, USDCAddress } from "../Blockchain/Constants";
import {
    calcExchangeRate,
    invertExchangeRate,
    parseInputExchangeAmount,
} from "../Lib/SwapUtils";
import { fromWei } from "../Lib/amount";

interface ExecuteSwapRequestBody {
  fromTokenAddr: string;
  toTokenAddr: string;
  amountWei: string;
  quoteWei: string;
  tradablePair: TradablePair;
}

const provider = new providers.JsonRpcProvider("https://forno.celo.org");

// function tio get the trading pairs
export async function theTradingPairs() {
  try {
    const mento = await Mento.create(provider);
    const thePairs = await mento.getTradablePairs();
    return thePairs;
  } catch (error) {
    console.log("the errors", error);
    return null;
  }
}

// function to get quote according to app.mento.org (cUSD to USDC)
export async function getTheQuote(
  req: Request<{}, {}, { amount: string; swapIn: Boolean }>,
  res: Response
) {
  const { amount, swapIn } = req.body;

  try {
    const mento = await Mento.create(provider);
    const fromTokenAddr = swapIn ? cUSDAddress : USDCAddress;
    const toTokenAddr = swapIn ? USDCAddress : cUSDAddress;
    const amountWei = swapIn
      ? parseInputExchangeAmount(amount, 18)
      : parseUnits(amount || "0", 6).toString();

    if (!amountWei || isNaN(Number(amountWei))) {
      throw new Error("Invalid amount input");
    }

    const amountWeiBN = ethers.BigNumber.from(amountWei);
    const amountDecimals = swapIn ? 18 : 6;
    const quoteDecimals = swapIn ? 6 : 18;

    console.log("amount", amount);
    console.log("amountWei", amountWei);
    console.log("amountWeiBN", amountWeiBN.toString());

    const tradablePair = await mento.findPairForTokens(
      fromTokenAddr,
      toTokenAddr
    );

    if (!tradablePair) {
      return res
        .status(404)
        .json({ success: false, error: "Tradable pair not found" });
    }

    // swapping from cUSD to USDC
    const quoteWei = (
      await mento.getAmountOut(
        fromTokenAddr,
        toTokenAddr,
        amountWeiBN,
        tradablePair
      )
    ).toString();

    if (!quoteWei) {
      return res
        .status(404)
        .json({ success: false, error: "Failed to get quote amount" });
    }
    const quote = fromWei(quoteWei, quoteDecimals);
    const rateIn = calcExchangeRate(
      amountWei,
      amountDecimals,
      quoteWei,
      quoteDecimals
    );
    const rate = swapIn ? rateIn : invertExchangeRate(rateIn);

    console.log({
      amountWei,
      quoteWei,
      quote,
      rate,
      tradablePair,
    });

    return res.status(200).json({
      success: true,
      quote: {
        amountWei,
        quoteWei,
        quote,
        rate,
        tradablePair,
      },
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: error });
  }
}

// function to approve a swap
export async function approveSwap(req: Request<{}, {}, {fromTokenAddr: string; amountInWei: string}>,
  res: Response) {
  const { fromTokenAddr, amountInWei } = req.body;

  console.log(req.body);
  
  try {
    const mento = await Mento.create(provider);

    const amountWei = BigInt(Number(amountInWei));
    console.log("the amount in wei", amountInWei);

    // Prepare the approval transaction
    const allowanceTxObj = await mento.increaseTradingAllowance(
      fromTokenAddr,
      amountWei
    );

    // Return it to frontend
    return res.status(200).json({
      success: true,
      txRequest: allowanceTxObj,
    });
  } catch (error) {
    console.log("the approve error", error);
    return res.status(500).json({ success: false, error });
  }
}


// function to trigger the swap
export async function executeSwap(
  req: Request<{}, {}, ExecuteSwapRequestBody>,
  res: Response
) {
  const {
    fromTokenAddr,
    toTokenAddr,
    amountWei,
    quoteWei,
    tradablePair,
  } = req.body;
  try {
    const mento = await Mento.create(provider);

    // Prepare the swap transaction (no signing)
    const txRequest = await mento.swapIn(
      fromTokenAddr,
      toTokenAddr,
      amountWei,
      quoteWei,
      tradablePair
    );

    // Return transaction data to frontend
    return res.status(200).json({
      success: true,
      txRequest,
    });
  } catch (error) {
    console.error("❌ Error in executeSwap:", error);
    return res.status(500).json({ success: false, error });
  }
}
