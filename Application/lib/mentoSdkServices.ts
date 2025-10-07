// this file contains all the for the mento-sdk via the backend api

import { serverUrl } from "@/constants/serverUrl";
import { client } from "@/constants/thirdweb";
import { prepareTransaction, sendTransaction } from "thirdweb";
import { celo } from "thirdweb/chains";

export interface TradablePair {
  assets: [];
  id: string;
  path: [];
  spreadData: {};
}

export interface QuoteResponse {
  success: boolean;
  quote: {
    amountWei: string;
    quote: string;
    quoteWei: string;
    rate: string;
    tradablePair: {};
  };
}

export interface SuccessfulTx {
  success: boolean;
  hash: string;
}

export interface ExecuteSwap {
  fromTokenAddr: string;
  toTokenAddr: string;
  amountWei: string;
  quoteWei: string;
  tradablePair: any;
}

interface TxRequest {
  to: `0x${string}`;
  data: `0x${string}`;
  value?: string | bigint | null;
}

export async function executePreparedTx(txRequest: TxRequest, account: any) {
  try {
    const preparedTx = prepareTransaction({
      client,
      chain: celo,
      to: txRequest.to,
      data: txRequest.data,
      value: txRequest.value ? BigInt(txRequest.value.toString()) : 0n,
    });

    const hash = await sendTransaction({
      transaction: preparedTx,
      account: account,
    });

    console.log("✅ Transaction sent:", hash);
    return { success: true, hash };
  } catch (err) {
    console.error("❌ Error sending transaction:", err);
    return { success: false, error: err };
  }
}

// swapIn is a boolean of (from cUSD to USDC)
export const getSwapQuote = async (
  amount: string,
  swapIn: boolean,
  token: string
): Promise<QuoteResponse> => {
  try {
    const response = await fetch(`${serverUrl}/mento/get-quote`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ amount, swapIn }),
    });
    const data = await response.json();
    return data;
  } catch (error) {
    console.log("the error in getting quote", error);
    return {
      success: false,
      quote: {
        amountWei: "",
        quote: "",
        quoteWei: "",
        rate: "",
        tradablePair: {},
      },
    };
  }
};

// user to approve the swapping
export async function approveSwap(
  fromTokenAddr: string,
  amountInWei: string,
  token: string,
  account: any
): Promise<SuccessfulTx> {
  try {
    console.log("the amount in Wei", amountInWei);
    const response = await fetch(`${serverUrl}/mento/approve-swap`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ fromTokenAddr, amountInWei }),
    });
    const data = await response.json();
    console.log("received the prepared tx,", data);

    const result = await executePreparedTx(data.txRequest, account);
    return { success: true, hash: result.hash?.transactionHash! };
  } catch (error) {
    console.log("the error in approving swap", error);
    return { success: false, hash: "" };
  }
}

// triggers the swapping
export async function executeSwap(
  executingArgs: ExecuteSwap,
  token: string,
  account: any
): Promise<SuccessfulTx> {
  try {
    const response = await fetch(`${serverUrl}/mento/execute-swap`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(executingArgs),
    });
    const data = await response.json();

    const result = await executePreparedTx(data.txRequest, account);
    return { success: true, hash: result.hash?.transactionHash! };
  } catch (error) {
    console.log("the error while swapping.", error);
    return { success: false, hash: "" };
  }
}
