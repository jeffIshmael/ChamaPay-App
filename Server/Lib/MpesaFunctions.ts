import moment from "moment";
import { generateOriginatorConversationID } from "./HelperFunctions";

interface TokenResponse {
  access_token: string;
  expires_in: number;
}

interface PushResponse {
  MerchantRequestID: string;
  CheckoutRequestID: string;
  ResponseCode: string;
  ResponseDescription: string;
  CustomerMessage: string;
}

interface PushStatusResponse {
  ResponseCode: string;
  ResponseDescription: string;
  MerchantRequestID: string;
  CheckoutRequestID: string;
  ResultCode: string;
  ResultDesc: string;
}

const consumerKey = process.env.MPESA_CUSTOMER_KEY;
const consumerSecret = process.env.MPESA_CONSUMER_SECRET;
const chamapayTillNumber = process.env.CHAMAPAY_TILL;
const passkey =
  process.env.MPESA_PASSKEY ||
  "bfb279f9aa9bdbcf158e97dd71a467cd2e0c893059b10f78e6b72ada1ed2c919";
const callbackUrl = process.env.MPESA_CALLBACK_URL;
const SecurityCredential = process.env.SECURITY_CREDENTIAL;

if (!consumerKey || !consumerSecret || !chamapayTillNumber || !SecurityCredential) {
  throw new Error("M-Pesa environment variables are not set.");
}

if (!callbackUrl) {
  throw new Error("MPESA_CALLBACK_URL is not set in environment variables");
}

// Get access token
async function getAccessToken(): Promise<TokenResponse | null> {
  const credentials = Buffer.from(`${consumerKey}:${consumerSecret}`).toString(
    "base64"
  );

  const headers = new Headers();
  headers.append("Authorization", `Basic ${credentials}`);

  try {
    const response = await fetch(
      "https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials",
      { headers }
    );
    const result = await response.json();
    return result as unknown as TokenResponse;
  } catch (error) {
    console.error("Error getting M-Pesa token:", error);
    return null;
  }
}

// Initiate STK Push
export async function tillPushStk(
  amount: string,
  userPhoneNo: number,
  accountReference: string
): Promise<PushResponse | null> {
  const businessShortCode = Number(chamapayTillNumber);
  const timestamp = moment().format("YYYYMMDDHHmmss");
  const password = Buffer.from(
    chamapayTillNumber + passkey + timestamp
  ).toString("base64");

  try {
    const tokenResponse = await getAccessToken();
    if (!tokenResponse) {
      console.error("Failed to get access token");
      return null;
    }

    const accessToken = tokenResponse.access_token;
    const headers = new Headers();
    headers.append("Authorization", `Bearer ${accessToken}`);
    headers.append("Content-Type", "application/json");

    const requestBody = {
      BusinessShortCode: businessShortCode,
      Password: password,
      Timestamp: timestamp,
      TransactionType: "CustomerPayBillOnline",
      Amount: amount,
      PartyA: userPhoneNo,
      PartyB: chamapayTillNumber,
      PhoneNumber: userPhoneNo,
      CallBackURL: `https://chamapay-app.onrender.com/mpesa/callback`,
      AccountReference: accountReference.substring(0, 12), // Max 12 characters
      TransactionDesc: `Payment of KES ${amount}`.substring(0, 13), // Max 13 characters
    };

    console.log("STK Push Request:", {
      ...requestBody,
      Password: "***HIDDEN***",
    });

    const response = await fetch(
      "https://sandbox.safaricom.co.ke/mpesa/stkpush/v1/processrequest",
      {
        method: "POST",
        headers,
        body: JSON.stringify(requestBody),
      }
    );

    const result = await response.json();
    console.log("STK Push Response:", result);
    return result as unknown as PushResponse;
  } catch (error) {
    console.error("STK Push Error:", error);
    return null;
  }
}

// Query STK Push status
export async function checkPushStatus(
  checkoutRequestId: string
): Promise<PushStatusResponse | null> {
  const timestamp = moment().format("YYYYMMDDHHmmss");
  const password = Buffer.from(
    chamapayTillNumber + passkey + timestamp
  ).toString("base64");

  try {
    const tokenResponse = await getAccessToken();
    if (!tokenResponse) {
      console.error("Failed to get access token");
      return null;
    }

    const accessToken = tokenResponse.access_token;
    const headers = new Headers();
    headers.append("Authorization", `Bearer ${accessToken}`);
    headers.append("Content-Type", "application/json");

    const response = await fetch(
      "https://sandbox.safaricom.co.ke/mpesa/stkpushquery/v1/query",
      {
        method: "POST",
        headers,
        body: JSON.stringify({
          BusinessShortCode: Number(chamapayTillNumber),
          Password: password,
          Timestamp: timestamp,
          CheckoutRequestID: checkoutRequestId,
        }),
      }
    );

    const result = await response.json();
    console.log("Status Query Response:", result);
    return result as unknown as PushStatusResponse;
  } catch (error) {
    console.error("Error querying push status:", error);
    return null;
  }
}

// initiate a b2c transaction(from business to phone number)
export async function B2CMpesaTx(
  amount: string,
  userPhoneNo: number,
  remarks: string
): Promise<PushResponse | null> {

  try {
    const tokenResponse = await getAccessToken();
    if (!tokenResponse) {
      console.error("Failed to get access token");
      return null;
    }

    const accessToken = tokenResponse.access_token;
    // Generate unique OriginatorConversationID
    const originatorConversationID = generateOriginatorConversationID("600997");
    const headers = new Headers();
    headers.append("Authorization", `Bearer ${accessToken}`);
    headers.append("Content-Type", "application/json");

    const requestBody = {
      OriginatorConversationID:originatorConversationID,
      InitiatorName: "testapi",
      SecurityCredential: SecurityCredential,
      CommandID: "BusinessPayment",
      Amount: amount,
      PartyA: chamapayTillNumber,
      PartyB: userPhoneNo,
      Remarks: remarks,
      QueueTimeOutURL: "https://mydomain.com/path", // incase of a timeout
      ResultURL: "https://mydomain.com/path", // callback
      Occassion: "Withdrawal",
    };

    console.log(" STK B2C Push Request:", {
      ...requestBody,
      Password: "***HIDDEN***",
    });

    const response = await fetch(
      "https://sandbox.safaricom.co.ke/mpesa/b2c/v3/paymentrequest",
      {
        method: "POST",
        headers,
        body: JSON.stringify(requestBody),
      }
    );

    const result = await response.json();
    console.log("STK B2C Push Response:", result);
    return result as unknown as PushResponse;
  } catch (error) {
    console.error("STK Push Error:", error);
    return null;
  }
}

// Check transaction status (for debugging)
export async function checkMpesaTxStatus(
  transactionId: string,
  conversationId: string
) {
  try {
    const tokenResponse = await getAccessToken();
    if (!tokenResponse) {
      console.error("Failed to get access token");
      return null;
    }

    const credentials = Buffer.from(
      `${consumerKey}:${consumerSecret}`
    ).toString("base64");
    const accessToken = tokenResponse.access_token;
    const headers = new Headers();
    headers.append("Authorization", `Bearer ${accessToken}`);
    headers.append("Content-Type", "application/json");

    const response = await fetch(
      "https://sandbox.safaricom.co.ke/mpesa/transactionstatus/v1/query",
      {
        method: "POST",
        headers,
        body: JSON.stringify({
          Initiator: "testapiuser",
          SecurityCredential: credentials,
          CommandID: "TransactionStatusQuery",
          TransactionID: transactionId,
          OriginalConversationID: conversationId,
          PartyA: chamapayTillNumber,
          IdentifierType: 4,
          ResultURL: `${callbackUrl}/mpesa/transaction-status`,
          QueueTimeOutURL: `${callbackUrl}/mpesa/timeout`,
          Remarks: "OK",
          Occasion: "OK",
        }),
      }
    );

    const result = await response.json();
    console.log("Transaction Status Response:", result);
    return result;
  } catch (error) {
    console.error("Error checking transaction status:", error);
    return null;
  }
}
