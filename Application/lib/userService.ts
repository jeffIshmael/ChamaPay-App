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
  request: {} | null;
}
interface hasRequestResponse {
  success: boolean;
  hasRequest: boolean;
}
interface shareLinkResponse {
  success: boolean;
  notification: {};
}
interface balanceResponse {
  success: boolean;
  balance: string;
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
): Promise<joinRequestResponse> {
  try {
    console.log("Requesting to join chama with ID:", chamaId);
    const response = await fetch(
      `${serverUrl}/user/joinRequest?chamaId=${chamaId}`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      }
    );
    const data = await response.json();
    console.log("Join request response:", data);
    return data;
  } catch (error) {
    console.error("Error sending join request:", error);
    return { success: false, request: null };
  }
}

// function to handle join request
export async function handleTheRequestToJoin(
  chamaId: number,
  decision: "approve" | "reject",
  requestId: number,
  userName: string,
  token: string
): Promise<joinRequestResponse> {
  try {
    const response = await fetch(`${serverUrl}/user/confirmRequest`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        chamaId,
        requestId,
        userName,
        decision,
      }),
    });
    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Error registering payment:", error);
    return { success: false, request: null };
  }
}

// function to check user has an existing request
export async function checkHasSentRequest(
  chamaId: number,
  userId: number
): Promise<hasRequestResponse> {
  try {
    const response = await fetch(
      `${serverUrl}/user/${userId}/hasRequest?chamaId=${chamaId}`,
      {
        method: "GET",
      }
    );
    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Error registering payment:", error);
    return { success: false, hasRequest: false };
  }
}

// function to share chama link
export async function shareChamaLink(
  senderName: string,
  receiverId: number,
  chamaSlug: string,
  token: string
): Promise<shareLinkResponse> {
  try {
    const message = `${senderName} has shared a chama to you. Tap to view.`;
    const response = await fetch(`${serverUrl}/user/shareLink`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        receiverId,
        message,
        chamaLink: chamaSlug,
      }),
    });
    const data = await response.json();
    console.log(data);
    return data;
  } catch (error) {
    console.error("Error sending sharing link:", error);
    return { success: false, notification: {} };
  }
}

// function to get User Balance
export async function getUserBalance(
  token: string
): Promise<balanceResponse> {
  try {
    const response = await fetch(`${serverUrl}/user/balance`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    });
    const data = await response.json();
    console.log(data);
    return data;
  } catch (error) {
    console.error("Error getting balance:", error);
    return { success: false, balance: "" };
  }
}
