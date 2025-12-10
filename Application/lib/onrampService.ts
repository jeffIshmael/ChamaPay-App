// lib/onrampService.ts - Updated to use unified endpoint
import { serverUrl } from "@/constants/serverUrl";

export const initiateOnramp = async (
  phoneNo: number,
  amount: string,
  token: string
) => {
  try {
    const response = await fetch(`${serverUrl}/mpesa/onramp`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ amount, phoneNo }),
    });
    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Error initiating onramp:", error);
    return { success: false, error: "Failed to initiate onramp" };
  }
};

export const checkOnrampStatus = async (
  checkoutRequestID: string,
  token: string
) => {
  try {
    const response = await fetch(
      `${serverUrl}/mpesa/status/${checkoutRequestID}`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      }
    );
    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Error checking onramp status:", error);
    return { success: false, error: "Failed to check status" };
  }
};

export const pollOnrampStatus = async (
  checkoutRequestID: string,
  token: string,
  onStatusUpdate: (status: string, result?: any) => void,
  maxAttempts: number = 30,
  interval: number = 2000
): Promise<any> => {
  let attempts = 0;

  return new Promise((resolve, reject) => {
    const pollInterval = setInterval(async () => {
      attempts++;

      try {
        const result = await checkOnrampStatus(checkoutRequestID, token);

        if (!result.success) {
          clearInterval(pollInterval);
          reject(result);
          return;
        }

        // Update caller with current status
        onStatusUpdate(result.status, result);

        // Check if onramp is complete
        if (result.status === "completed") {
          clearInterval(pollInterval);
          resolve(result);
          return;
        }

        // Check if failed/cancelled
        if (["failed", "cancelled", "timeout"].includes(result.status)) {
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
            error: "Onramp verification timed out",
          });
        }
      } catch (error) {
        clearInterval(pollInterval);
        reject(error);
      }
    }, interval);
  });
};

export const getOnrampHistory = async (
  token: string,
  limit: number = 20,
  offset: number = 0
) => {
  try {
    const response = await fetch(
      `${serverUrl}/mpesa/transactions?type=onramp&limit=${limit}&offset=${offset}`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      }
    );
    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Error fetching onramp history:", error);
    return { success: false, error: "Failed to fetch history" };
  }
};