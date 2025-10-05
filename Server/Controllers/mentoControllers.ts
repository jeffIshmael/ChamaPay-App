// contains all the mento sdk functions
// process to swap
// 1. get the pairs
// 2. get the quote 
// 3. approve the sending/ swapping
// 4. swap
// I'll do this according to the app.mento.org
import { Mento, TradablePair } from "@mento-protocol/mento-sdk";
import { ethers, providers } from "ethers";
import { cUSDAddress, USDCAddress } from "../Blockchain/Constants";
import { parseInputExchangeAmount, calcExchangeRate, invertExchangeRate } from "../Utils/SwapUtils";
import { fromWei } from "../Utils/amount";
import { parseUnits } from "ethers/lib/utils";
import { getWalletClient } from '@wagmi/core';
import { Request, Response } from "express";

interface ExecuteSwapRequestBody {
    fromTokenAddr: string,
    toTokenAddr: string,
    amountWei: string,
    quoteWei: string,
    tradablePair: TradablePair,
    config: any
  }


const provider = new providers.JsonRpcProvider("https://forno.celo.org");

// function tio get the trading pairs
export async function theTradingPairs(){
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
export async function getTheQuote(req: Request<{}, {}, {amount: string, swapIn: Boolean}>, res: Response) {
    const {amount, swapIn} = req.body;
 
  try {
    const mento = await Mento.create(provider);
    const fromTokenAddr = swapIn ? cUSDAddress : USDCAddress;
    const toTokenAddr = swapIn ? USDCAddress : cUSDAddress;
    const amountWei = swapIn ? parseInputExchangeAmount(amount, 18): parseUnits(amount || "0", 6).toString();
    
    if (!amountWei || isNaN(Number(amountWei))) {
      throw new Error("Invalid amount input");
    }

    const amountWeiBN = ethers.BigNumber.from(amountWei);
    const amountDecimals = swapIn ? 18 : 6;
    const quoteDecimals = swapIn ? 6 : 18;

    console.log("amount", amount);
    console.log("amountWei", amountWei);
    console.log("amountWeiBN", amountWeiBN.toString());

    const tradablePair = await mento.findPairForTokens(fromTokenAddr, toTokenAddr);

    if (!tradablePair) {
      return res.status(404).json({ success: false, error: "Tradable pair not found" });
    }

    // swapping from cUSD to USDC
    const quoteWei = (
      await mento.getAmountOut(fromTokenAddr, toTokenAddr, amountWeiBN, tradablePair)
    ).toString();
    

    if (!quoteWei) {
      return res.status(404).json({ success: false, error: "Failed to get quote amount" });
    }
    const quote = fromWei(quoteWei, quoteDecimals);
    const rateIn = calcExchangeRate(amountWei, amountDecimals, quoteWei, quoteDecimals);
    const rate = swapIn ? rateIn : invertExchangeRate(rateIn);

    return res.status(200).json({ success: true, quote: {
      amountWei,
      quoteWei,
      quote,
      rate,
      tradablePair
    } });

  } catch (error) {
    return res.status(500).json({ success: false, error: error });
  }
}

// function to approve a swap
export async function approveSwap(req: Request<{}, {}, {fromTokenAddr: string, amountWei: string, config: any}>, res: Response) {
    const {fromTokenAddr, amountWei, config} = req.body;
  try {
    const mento = await Mento.create(provider);
    const client = await getWalletClient(config);

    const allowanceTxObj = await mento.increaseTradingAllowance(fromTokenAddr, amountWei);
    const hash = "allowanceTxObj.hash";
    // const hash = await client.sendTransaction({
    //   to: allowanceTxObj.to as `0x${string}`,
    //   data: allowanceTxObj.data as `0x${string}`,
    //   value: allowanceTxObj.value ? BigInt(allowanceTxObj.value.toString()) : 0n,
    //   account: client.account,
    // });

    console.log("✅ Approved. Tx hash:", hash);
    return res.status(200).json({success:true, hash: hash});
  } catch (error) {
    return res.status(500).json({ success: false, error: error});
  }
}


// function to trigger the swap
export async function executeSwap(
    req: Request<{}, {}, ExecuteSwapRequestBody>, res: Response
) {
    const {fromTokenAddr, toTokenAddr, amountWei, quoteWei, tradablePair, config} = req.body;
  try {
    const mento = await Mento.create(provider);
    const client = await getWalletClient(config);

    const swapFn =  mento.swapIn.bind(mento);

    const txRequest = await swapFn(fromTokenAddr, toTokenAddr, amountWei, quoteWei, tradablePair);
    // const hash = await client.sendTransaction({
    //   to: txRequest.to as `0x${string}`,
    //   data: txRequest.data as `0x${string}`,
    //   value: txRequest.value ? BigInt(txRequest.value.toString()) : 0n,
    //   account: client.account,
    // });
    const hash = "txRequest.hash";

    console.log("✅ Swapped. Tx hash:", hash);
    return hash;
  } catch (error) {
    console.error("❌ Error in executeSwap:", error);
    throw error;
  }
}