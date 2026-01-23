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
  userAddress: string
): Promise<OnrampResult | null> {
  try {

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

// function to verify ngn bank details
export async function verifyNgnBankDetails(
  accountNumber: string,
  bankCode: number
) {
  try {
    const response = await axios.post(
      "https://api.xwift.africa/v1/validation/NGN",
      {
        account_number: accountNumber,
        bank_code: bankCode,
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

// function to verify mobile network details
export async function verifyMobileNetworkDetails(
  currencyCode: string,
  shortcode: string,
  mobile_network: string,
  type?: string,
  accountNumber?: string
) {
  try {
    let finalResponse: any;
    if (currencyCode === "KES") {
      const response = await axios.post(
        `https://api.xwift.africa/v1/validation/${currencyCode}`,
        {
          type: type ? type : "MOBILE",
          shortcode: shortcode,
          mobile_network: mobile_network,
          accountNumber,
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
      finalResponse = response.data.data;
    } else {
      const response = await axios.post(
        `https://api.xwift.africa/v1/validation/${currencyCode}`,
        {
          type: "MOBILE",
          shortcode: shortcode,
          mobile_network: mobile_network,
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
      finalResponse = response.data.data;
    }

    return finalResponse;
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

// function to transfer to bank
export async function transferToBank(
  currencyCode: string,
  txHash: string,
  amount: string,
  fee: string,
  accountNumber: string,
  bankCode: number,
  accountName?: string,
  bankName?: string
) {
  try {
    let finalResponse: any;
    if (currencyCode === "NGN" || "MWK") {
      // ngn or mwk
      const response = await axios.post(
        `https://api.xwift.africa/v1/pay/${currencyCode}`,
        {
          type: "BANK_TRANSFER",
          account_name: accountName,
          account_number: accountNumber,
          bank_name: bankName,
          bank_code: bankCode,
          amount: amount,
          fee: fee,
          chain: "CELO",
          transaction_hash: txHash,
          callback_url: `${serverUrl}/pretium/callback`,
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
      finalResponse = response.data.data;
    } else if (currencyCode === "KES") {
      // KE
      const response = await axios.post(
        `https://api.xwift.africa/v1/pay/${currencyCode}`,
        {
          type: "BANK_TRANSFER",
          account_number: accountNumber,
          bank_code: bankCode,
          amount: amount,
          fee: fee,
          chain: "CELO",
          transaction_hash: txHash,
          callback_url: `${serverUrl}/pretium/callback`,
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
      finalResponse = response.data.data;
    }

    return finalResponse;
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

// function to transfer to mobile network
export async function transferToMobileNetwork(
  currencyCode: string,
  shortCode: string,
  txHash: string,
  amount: string,
  fee: string,
  mobileNetwork: string,
  accountName?: string,
) {
  try {
    let finalResponse: any;
    if (currencyCode === "GHS") {
      // ngn or mwk
      const response = await axios.post(
        `https://api.xwift.africa/v1/pay/${currencyCode}`,
        {
          shortcode: shortCode,
          account_name: accountName,
          amount: amount,
          fee: fee,
          mobile_network: mobileNetwork,
          chain: "CELO",
          transaction_hash: txHash,
          callback_url: `${serverUrl}/pretium/callback`,
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
      finalResponse = response.data.data;
    } else if (currencyCode === "KES") {
      // KE
      const response = await axios.post(
        `https://api.xwift.africa/v1/pay/${currencyCode}`,
        {
          type: "MOBILE",
          shortcode: shortCode,
          amount: amount,
          fee: fee,
          mobile_network: mobileNetwork,
          chain: "CELO",
          transaction_hash: txHash,
          callback_url: `${serverUrl}/pretium/callback`,
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
      finalResponse = response.data.data;
    } else {
      // the rest
      const response = await axios.post(
        `https://api.xwift.africa/v1/pay/${currencyCode}`,
        {
          shortcode: shortCode,
          amount: amount,
          fee: fee,
          mobile_network: mobileNetwork,
          chain: "CELO",
          transaction_hash: txHash,
          callback_url: `${serverUrl}/pretium/callback`,
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
      finalResponse = response.data.data;
    }

    return finalResponse;
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
