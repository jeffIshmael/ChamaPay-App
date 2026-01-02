// this file contains the pretium functions to , get quote, onramp, offramp
import axios from "axios";
import { configDotenv } from "dotenv";

configDotenv();

interface Quote {
  buying_rate: number;
  selling_rate: number;
}
interface ValidatedNumber {
  status: string; // COMPLETE
  shortcode: string;
  public_name: string;
  mobile_network: string;
}
interface OnrampResult {
  status: string;
  transaction_code: string;
  message: string;
}

interface OfframpResult {
  status: string;
  transaction_code: string;
  message: string;
}

const pretiumApiKey = process.env.PRETIUM_API_KEY;
const settlementAddress = process.env.SETTLEMENT_ADDRESS;
const serverUrl = process.env.CHAMAPAY_SERVER_URL;

if (!pretiumApiKey || !settlementAddress || !serverUrl) {
  throw new Error("Pretium api key or settlement address not set.");
}

// function to get the quote
export async function getQuote(currencyCode: string): Promise<Quote | null> {
  try {
    const response = await axios.post(
      "https://api.xwift.africa/v1/exchange-rate",
      {
        currency_code: currencyCode,
      },
      {
        headers: {
          "x-api-key": pretiumApiKey,
          "Content-Type": "application/json",
        },
      }
    );
    if (response.statusText !== "OK") {
      throw new Error("The request to get quote did not succeed.");
    }
    return response.data.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      console.error("API Error:", error.response?.data);
      console.error("Status:", error.response?.status);
      return null;
    } else {
      console.error("Error:", error);
      return null;
    }
  }
}

// function to onramp i.e sending from fiat to USDC
export async function pretiumOnramp(
  phoneNumber: string,
  amount: number,
  userAddress: string,
  additionalFee?: number
): Promise<OnrampResult | null> {
  try {
    if (additionalFee) {
      // payment has a 0.5% fee
      const response = await axios.post(
        "https://api.xwift.africa/v1/onramp/KES",
        {
          shortcode: phoneNumber,
          amount: amount,
          mobile_network: "Safaricom",
          chain: "CELO",
          fee: additionalFee,
          asset: "USDC",
          address: userAddress,
          callback_url: `${serverUrl}/pretium/callback`,
        },
        {
          headers: {
            "x-api-key": pretiumApiKey,
            "Content-Type": "application/json",
          },
        }
      );
      if (response.statusText !== "OK") {
        throw new Error("The request to onramp did not succeed.");
      }
      return response.data.data;
    } else {
      const response = await axios.post(
        "https://api.xwift.africa/v1/onramp/KES",
        {
          shortcode: phoneNumber,
          amount: amount,
          mobile_network: "Safaricom",
          chain: "CELO",
          asset: "USDC",
          address: userAddress,
          callback_url: `${serverUrl}/pretium/callback`,
        },
        {
          headers: {
            "x-api-key": pretiumApiKey,
            "Content-Type": "application/json",
          },
        }
      );
      if (response.statusText !== "OK") {
        throw new Error("The request to onramp did not succeed.");
      }
      return response.data.data;
    }
  } catch (error) {
    if (axios.isAxiosError(error)) {
      console.error("API Error:", error.response?.data);
      console.error("Status:", error.response?.status);
      return null;
    } else {
      console.error("Error:", error);
      return null;
    }
  }
}

// function to offramp i.e from USDC to fiat
export async function pretiumOfframp(
  phoneNumber: string,
  amount: number,
  kesFee: number,
  transactionHash: string
): Promise<OfframpResult | null> {
  try {
    const response = await axios.post(
      "https://api.xwift.africa/v1/pay/KES",
      {
        type: "MOBILE",
        shortcode: phoneNumber,
        amount: amount,
        fee: kesFee,
        mobile_network: "Safaricom",
        chain: "CELO",
        transaction_hash: transactionHash,
        callback_url: `${serverUrl}/pretium/callback`,
      },
      {
        headers: {
          "x-api-key": pretiumApiKey,
          "Content-Type": "application/json",
        },
      }
    );
    if (response.statusText !== "OK") {
      throw new Error("The request to offramp did not succeed.");
    }
    return response.data.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      console.error("API Error:", error.response?.data);
      console.error("Status:", error.response?.status);
      return null;
    } else {
      console.error("Error:", error);
      return null;
    }
  }
}

// function to verify phone number
export async function verifyPhoneNo(
  phonenumber: string
): Promise<ValidatedNumber | null> {
  try {
    const response = await axios.post(
      "https://api.xwift.africa/v1/validation/KES",
      {
        type: "MOBILE",
        shortcode: phonenumber,
        mobile_network: "Safaricom",
      },
      {
        headers: {
          "x-api-key": pretiumApiKey,
          "Content-Type": "application/json",
        },
      }
    );
    if (response.statusText !== "OK") {
      throw new Error("The request to validate number did not succeed.");
    }
    return response.data.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      console.error("API Error:", error.response?.data);
      console.error("Status:", error.response?.status);
      return null;
    } else {
      console.error("Error:", error);
      return null;
    }
  }
}

// function to check status of a transaction
export async function checkPretiumTxStatus(transactionCode: string) {
  try {
    const response = await axios.post(
      "https://api.xwift.africa/v1/status/KES",
      {
        transaction_code: transactionCode,
      },
      {
        headers: {
          "x-api-key": pretiumApiKey,
          "Content-Type": "application/json",
        },
      }
    );
    if (response.statusText !== "OK" || response.data.code !== 200) {
      throw new Error("The request to check tx status did not succeed.");
    }
    return response.data.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      console.error("API Error:", error.response?.data);
      console.error("Status:", error.response?.status);
      return null;
    } else {
      console.error("Error:", error);
      return null;
    }
  }
}
