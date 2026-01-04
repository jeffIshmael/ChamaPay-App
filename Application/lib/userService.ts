import { serverUrl } from "@/constants/serverUrl";
interface PaymentData {
    id: number;
    amount: string;
    txHash: string;
    doneAt: string;
    receiver: string;
  }

interface RegisterPaymentResponse {
  success: boolean;
  payment: PaymentData | null;
}
interface joinRequestResponse {
  success: boolean;
  request: {};
}

// function to register a payment to the database
export async function registerPayment(
  receiver: string,
  amount: string,
  description: string,
  txHash: string,
  token: string
): Promise<RegisterPaymentResponse> {
  try {
    const response = await fetch(`${serverUrl}/user/registerPayment`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ receiver, amount, description, txHash }),
    });
    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Error registering payment:", error);
    return { success: false, payment: null };
  }
}

// function to request to join
export async function requestToJoin(
  chamaId: number,
  token: string
): Promise<RegisterPaymentResponse> {
  try {
    const response = await fetch(`${serverUrl}/user/joinRequest?chamaId=${chamaId}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    });
    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Error registering payment:", error);
    return { success: false, payment: null };
  }
}

