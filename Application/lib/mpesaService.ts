// lib/mpesaService.ts
import { serverUrl } from "@/constants/serverUrl";

export const sendMpesaStkPush = async (
  phoneNo: number,
  amount: string,
  token: string
) => {
  try {
    const response = await fetch(`${serverUrl}/mpesa`, {
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
    console.error("Error initiating M-Pesa payment:", error);
    return { success: false, error: "Failed to initiate payment" };
  }
};

export const checkMpesaPaymentStatus = async (
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
    console.error("Error checking payment status:", error);
    return { success: false, error: "Failed to check payment status" };
  }
};

// Poll payment status until completion or timeout
export const pollPaymentStatus = async (
  checkoutRequestID: string,
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
        const result = await checkMpesaPaymentStatus(checkoutRequestID, token);

        if (!result.success) {
          clearInterval(pollInterval);
          reject(result);
          return;
        }

        // Update caller with current status
        onStatusUpdate(result.status, result);

        // Check if payment is complete
        if (result.status === "completed") {
          clearInterval(pollInterval);
          resolve(result);
          return;
        }

        // Check if payment failed/cancelled
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