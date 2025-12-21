import { serverUrl } from "@/constants/serverUrl";

export type CurrencyCode = "KES" | "UGX" | "CDF" | "MWK" | "ETB" | "GHS";

// function to onramp through pretium
// note: amount should be plus the additional fee
export async function pretiumOnramp(
  phoneNo: string,
  amount: number,
  token: string
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
      }),
    });
    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Error initiating onramp:", error);
    return { success: false, error: "Failed to initiate onramp" };
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
    console.error("Error initiating onramp:", error);
    return { success: false, error: "Failed to initiate onramp" };
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

        if (result.status !== "COMPLETE") {
          clearInterval(pollInterval);
          reject(result);
          return;
        }

        // Update caller with current status
        onStatusUpdate(result.status, result);

        // Check if payment is complete
        if ((result.status).toLowerCase() === "completed") {
          clearInterval(pollInterval);
          resolve(result);
          return;
        }

        // Check if payment failed/cancelled
        if (["failed", "cancelled", "timeout"].includes(result.status.toLowerCase())) {
          clearInterval(pollInterval);
          reject(result);
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
