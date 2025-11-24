// this file contains functions that help us display the history in the wallet section
// we get the cUSD and USDC transfer tx from then combine them with the payout and payments txs
import { serverUrl } from "@/constants/serverUrl";

interface Transaction {
  id: number;
  type: string;
  token: string;
  amount: string;
  recipient?: string;
  sender?: string;
  hash: string;
  date: string;
  status: string;
}

const transformData = async (
  payoutsArray: [],
  paymentsArray: []
): Promise<Transaction[]> => {
  let allArray = [];
  // transform the paymentsArray
  for (const payment of paymentsArray) {
    const transformed = {
      id: payment.id,
      type: "send",
      token: "cUSD",
      amount: payment?.amount,
      recipient: payment.chama.name,
      sender: "you",
      hash: payment.txHash,
      date: payment.doneAt,
      status: "completed",
    };

    allArray.push(transformed);
  }
  // transform the payoutsArray
  for (const payOut of payoutsArray) {
    const transformedPayout = {
        id: payOut.id,
      type: "receive",
      token: "cUSD",
      amount: payOut?.amount,
      recipient: "You",
      sender: payOut.chama.name,
      hash: payOut.txHash,
      date: payOut.doneAt,
      status: "completed",
    };
    allArray.push(transformedPayout);
  }
  return allArray;
};

export const getTheUserTx = async (
  authToken: string
): Promise<Transaction[] | null> => {
  try {
    const response = await fetch(`${serverUrl}/user`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${authToken}`,
        "Content-Type": "application/json",
      },
    });
    if (!response.ok){
        throw new Error("An error happened.");       
    }

    const data = await response.json();
    console.log(data);
    const payoutsArray = data.user.payOuts;
    const paymentsArray = data.user.payments;
    console.log("this is which", payoutsArray);
    // transform the payments data
    const transformedPayments = await transformData(
      payoutsArray,
      paymentsArray
    );

    return transformedPayments;
  } catch (error) {
    console.log(error);
    return null;
  }
};
