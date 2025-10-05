// this file contains all the for the mento-sdk via the backend api

import { serverUrl } from "@/constants/serverUrl";

interface ExecuteSwap{
    fromTokenAddr: string,
    toTokenAddr: string,
    amountWei: string,
    quoteWei: string,
    tradablePair: any,
    config: any
  }

// swapIn is a boolean of (from cUSD to USDC)
export async function getSwapQuote(amount: string, swapIn: boolean, token: string) {
  try {
    const response = await fetch(`${serverUrl}/mento/getTheQuote`, {
      method: "POST",
      headers: { 'Authorization': `Bearer ${token}`, "Content-Type": "application/json"},
      body: JSON.stringify({ amount, swapIn }),
    });
    const data = await response.json();
    return data;
  } catch (error) {
    console.log("the error in getting quote", error);
  }
}

// user to approve the swapping
export async function approveSwap(fromTokenAddr: string, amountInWei: string, config: any, token:string) {
    try {
      const response = await fetch(`${serverUrl}/mento/approveSwap`, {
        method: "POST",
        headers: { 'Authorization': `Bearer ${token}`, "Content-Type": "application/json"},
        body: JSON.stringify({ fromTokenAddr, amountInWei, config }),
      });
      const data = await response.json();
      return data;
    } catch (error) {
      console.log("the error in approving swap", error);
    }
  }

// triggers the swapping 
  export async function executeSwap(executingArgs: ExecuteSwap, token:string) {
    try {
      const response = await fetch(`${serverUrl}/mento/executeSwap`, {
        method: "POST",
        headers: { 'Authorization': `Bearer ${token}`, "Content-Type": "application/json"},
        body: JSON.stringify(executingArgs),
      });
      const data = await response.json();
      return data;
    } catch (error) {
      console.log("the error while swapping.", error);
    }
  }
