// MpesaFunctions.ts - Updated with proper callback URL
import moment from "moment";

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
const callbackUrl = process.env.MPESA_CALLBACK_URL; // Add this to your .env

if (!consumerKey || !consumerSecret || !chamapayTillNumber) {
  throw new Error("The mpesa keys are not set.");
}

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
    console.error("error getting mpesa token", error);
    return null;
  }
}

export async function tillPushStk(
  amount: string,
  userPhoneNo: number,
  accountReference: string = "CompanyXLTD"
): Promise<PushResponse | null> {
  const businessShortCode = Number(chamapayTillNumber);
  const timestamp = moment().format("YYYYMMDDHHmmss");
  const password = Buffer.from(
    chamapayTillNumber +
      "bfb279f9aa9bdbcf158e97dd71a467cd2e0c893059b10f78e6b72ada1ed2c919" +
      timestamp
  ).toString("base64");
  
  try {
    const tokenResponse = await getAccessToken();
    const accessToken = tokenResponse?.access_token;
    const headers = new Headers();
    headers.append("Authorization", `Bearer ${accessToken}`);
    headers.append("Content-Type", "application/json");

    const response = await fetch(
      "https://sandbox.safaricom.co.ke/mpesa/stkpush/v1/processrequest",
      {
        method: "POST",
        headers,
        body: JSON.stringify({
          BusinessShortCode: businessShortCode,
          Password: password,
          Timestamp: timestamp,
          TransactionType: "CustomerPayBillOnline",
          Amount: amount,
          PartyA: userPhoneNo,
          PartyB: chamapayTillNumber,
          PhoneNumber: userPhoneNo,
          CallBackURL: `https://chamapay-app.onrender.com/mpesa/callback`, 
          AccountReference: accountReference,
          TransactionDesc: `Payment of ${amount}`,
        }),
      }
    );
    const result = await response.json();
    console.log("STK Push Result:", result);
    return result as unknown as PushResponse;
  } catch (error) {
    console.log("STK Push Error:", error);
    return null;
  }
}

export async function checkPushStatus(
  checkoutRequestId: string
): Promise<PushStatusResponse | null> {
  const timestamp = moment().format("YYYYMMDDHHmmss");
  const password = Buffer.from(
    chamapayTillNumber +
      "bfb279f9aa9bdbcf158e97dd71a467cd2e0c893059b10f78e6b72ada1ed2c919" +
      timestamp
  ).toString("base64");
  
  try {
    const tokenResponse = await getAccessToken();
    const accessToken = tokenResponse?.access_token;
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
    return result as unknown as PushStatusResponse;
  } catch (error) {
    console.error("Error querying push status:", error);
    return null;
  }
}