import { serverUrl } from "@/constants/serverUrl";

export type CurrencyCode =
  | "KES"
  | "UGX"
  | "CDF"
  | "MWK"
  | "ETB"
  | "GHS"
  | "NGN";

// function to onramp through pretium
export async function pretiumOnramp(
  phoneNo: string,
  amount: number,
  exchangeRate: number,
  usdcAmount: number,
  isDeposit: boolean,
  token: string,
  chamaId?: number,
) {
  try {
    const response = await fetch(`${serverUrl}/pretium/onramp`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        amount,
        phoneNo,
        exchangeRate,
        usdcAmount,
        isDeposit,
        chamaId,
      }),
    });
    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Error initiating onramp:", error);
    return { success: false, error: "Failed to initiate onramp" };
  }
}

export async function pretiumOfframp(
  phoneNo: string,
  amount: number, // the kes
  exchangeRate: number,
  usdcAmount: string,
  txHash: string,
  kesFee: number,
  token: string
) {
  try {
    const response = await fetch(`${serverUrl}/pretium/offramp`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        amount,
        phoneNo,
        kesFee,
        usdcAmount,
        exchangeRate,
        txHash,
      }),
    });
    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Error initiating offramp:", error);
    return { success: false, error: "Failed to initiate offramp" };
  }
}

// function to get the quote
export async function getExchangeRate(currencyCode: CurrencyCode) {
  try {
    const response = await fetch(`${serverUrl}/pretium/quote/${currencyCode}`, {
      method: "GET",
    });
    const data = await response.json();
    return data;
  } catch (error) {
    console.log("Error getting exchange rate:", error);
    return { success: false, error: "Failed to get the exchange rate" };
  }
}

export const checkPretiumPaymentStatus = async (
  transactionCode: string,
  token: string
) => {
  try {
    const response = await fetch(`${serverUrl}/pretium/transactionStatus`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        transactionCode,
      }),
    });
    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Error checking payment status:", error);
    return { success: false, error: "Failed to check payment status" };
  }
};

// Poll payment status until completion or timeout
export const pollPretiumPaymentStatus = async (
  transactionCode: string,
  token: string,
  onStatusUpdate: (status: string, result?: any) => void,
  maxAttempts: number = 30, // 30 attempts = ~60 seconds
  interval: number = 2000 // Check every 2 seconds
): Promise<any> => {
  let attempts = 0;

  return new Promise((resolve, reject) => {
    const pollInterval = setInterval(async () => {
      attempts++;

      try {
        const result = await checkPretiumPaymentStatus(transactionCode, token);
        console.log("the checking status pretium result", result);

        // Check if the API call itself failed
        if (!result.success) {
          clearInterval(pollInterval);
          reject(result);
          return;
        }

        // Get the actual transaction status from the details object
        const transactionStatus = result.details?.status?.toLowerCase() || "";
        const isReleased = result.details.is_released;

        // Update caller with current status
        onStatusUpdate(transactionStatus, result);

        // Check if payment is complete
        if (
          transactionStatus === "completed" ||
          transactionStatus === "complete"
        ) {
          clearInterval(pollInterval);
          resolve(result);
          return;
        }

        // Check if payment failed/cancelled
        if (
          ["failed", "cancelled", "timeout", "expired"].includes(
            transactionStatus
          )
        ) {
          clearInterval(pollInterval);
          reject(result);
          return;
        }

        // Continue polling for pending status
        if (transactionStatus === "pending") {
          // Just continue polling, don't reject
          if (attempts >= maxAttempts) {
            clearInterval(pollInterval);
            reject({
              success: false,
              status: "timeout",
              error: "Payment verification timed out",
            });
          }
          return;
        }

        // Timeout after max attempts
        if (attempts >= maxAttempts) {
          clearInterval(pollInterval);
          reject({
            success: false,
            status: "timeout",
            error: "Payment verification timed out",
          });
        }
      } catch (error) {
        clearInterval(pollInterval);
        reject(error);
      }
    }, interval);
  });
};

// function to trigger agent deposit(agent to send USDC to chama on behalf of user)
export async function agentDeposit(
  transactionCode: string,
  chamaBlockchainId: number,
  usdcAmount: string,
  chamaId: number,
  token: string
) {
  try {
    const response = await fetch(`${serverUrl}/pretium/agentDeposit`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        transactionCode,
        chamaBlockchainId,
        chamaId,
        amount: usdcAmount,
      }),
    });
    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Error checking payment status:", error);
    return { success: false, error: "Failed to check payment status" };
  }
}

// function to validate the phone number
export async function verifyPhoneNumber(phoneNumber: string) {
  try {
    const response = await fetch(
      `${serverUrl}/pretium/verify?phoneNo=${phoneNumber}`,
      {
        method: "GET",
      }
    );
    const data = await response.json();
    return data;
  } catch (error) {
    console.log("Error verifying phone no:", error);
    return { success: false, error: "Failed to verify phone no" };
  }
}

// function to validate withdrawals :- NGN
export async function validateWithdrawalDetails(
  accountNumber: string,
  bankCode: number,
  token: string
) {
  try {
    const response = await fetch(`${serverUrl}/pretium/validate/ngnBank`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        accountNumber,
        bankCode,
      }),
    });
    const data = await response.json();
    return data;
  } catch (error) {
    console.log("Error validating ngn bank:", error);
    return { success: false, error: "Failed to validate ngn bank" };
  }
}

// function to validate the mobile network number
export async function validatePhoneNumber(
  currencyCode: CurrencyCode,
  type: string,
  mobileNetwork: string,
  shortcode: string,
  token: string,
  accountNumber?: string
) {
  try {
    const response = await fetch(`${serverUrl}/pretium/verify/mobileNetwork`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        currencyCode,
        mobileNetwork,
        type,
        shortcode,
        accountNumber,
      }),
    });
    const data = await response.json();
    return data;
  } catch (error) {
    console.log("Error verifying mobile network:", error);
    return { success: false, error: "Failed to verify mobile network" };
  }
}

// function to offramp to bank account (both ngn and ke)
export async function bankTransfer(
  currencyCode: CurrencyCode,
  accountName: string,
  accountNumber: string,
  bankName: string,
  bankCode: number,
  txHash: string,
  amount: string, // be plus fees
  usdcAmount: string,
  exchangeRate: string,
  token: string
) {
  try {
    const response = await fetch(`${serverUrl}/pretium/bankOfframp`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        currencyCode,
        accountNumber,
        bankCode,
        amount,
        txHash,
        usdcAmount,
        exchangeRate,
        bankName,
        accountName,
      }),
    });
    const data = await response.json();
    return data;
  } catch (error) {
    console.log("Error transfering to ngn bank:", error);
    return { success: false, error: "Failed to transfer to ngn bank" };
  }
}

// function to offramp to mobile number
export async function disburseToMobileNumber(
  currencyCode: CurrencyCode,
  mobileNetwork: string,
  shortCode: string,
  amount: string, 
  usdcAmount: string,
  exchangeRate: string,
  token: string
) {
  try {
    const response = await fetch(`${serverUrl}/pretium/mobileOfframp`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        currencyCode,
        mobileNetwork,
        shortCode,
        usdcAmount,
        exchangeRate,
        amount,
      }),
    });
    const data = await response.json();
    return data;
  } catch (error) {
    console.log("Error transfering to mobile network:", error);
    return { success: false, error: "Failed to transfer to mobile network" };
  }
}

//  currencyCode,
    // mobileNetwork,
    // shortCode,
    // usdcAmount,
    // exchangeRate,
    // amount,
    // txHash,
    // accountName,