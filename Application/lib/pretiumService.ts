import { serverUrl } from "@/constants/serverUrl";

export type CurrencyCode = "KES" | "UGX" | "CDF" | "MWK" | "ETB" | "GHS";

// function to onramp through pretium
export async function pretiumOnramp(
  phoneNo: string,
  amount: number,
  exchangeRate: number,
  usdcAmount: number,
  isDeposit: boolean,
  token: string,
  additionalFee?: number
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
        additionalFee,
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
    console.log("Error getting exchange rate:", error);
    return { success: false, error: "Failed to get the exchange rate" };
  }
}
