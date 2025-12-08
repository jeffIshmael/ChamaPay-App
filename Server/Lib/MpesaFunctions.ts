// this file has all the mpesa functions
import moment from "moment";
import { NumberT } from "./amount";
interface TokenResponse {
  access_token: string;
  expires_in: number;
}

interface PushResponse {
  MerchantRequestID: string;
  CheckoutRequestID: string;
  ResponseCode: number;
  ResponseDescription: string;
  CustomerMessage: string;
}
interface PushStatusResponse {
  ResponseCode: number;
  ResponseDescription: string;
  MerchantRequestID: string;
  CheckoutRequestID: string;
  ResultCode: string;
  ResultDesc: string;
}

const consumerKey = process.env.MPESA_CUSTOMER_KEY;
const consumerSecret = process.env.MPESA_CONSUMER_SECRET;
const chamapayTillNumber = process.env.CHAMAPAY_TILL;

if (!consumerKey || !consumerSecret || !chamapayTillNumber) {
  throw new Error("The mpesa keys are not set.");
}

// the function to get the access token: and should be called before every api call
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
    console.log(result);
    return result as unknown as TokenResponse;
  } catch (error) {
    console.error("error getting mpesa token", error);
    return null;
  }
}

export async function tillPushStk(
  amount: string,
  userPhoneNo: Number
): Promise<PushResponse | null> {
  // we need to define the require params
  const businessShortCode = Number(chamapayTillNumber);
  const timestamp = moment().format("YYYYMMDDHHmmss");
  const password = Buffer.from(
    chamapayTillNumber +
      "bfb279f9aa9bdbcf158e97dd71a467cd2e0c893059b10f78e6b72ada1ed2c919" +
      timestamp
  ).toString("base64");
  try {
    // Get the access token using the GET function
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
          CallBackURL: "https://mydomain.com/path",
          AccountReference: "CompanyXLTD",
          TransactionDesc: "Payment of X",
        }),
      }
    );
    const result = await response.json();
    console.log(result);
    return result as unknown as PushResponse;
  } catch (error) {
    console.log(error);
    return null;
  }
}
// function to query the status of lipa na mpesa onlie payment(push)
export async function checkPushStatus(checkoutRequestId: string):Promise <PushStatusResponse |null> {
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
    console.log(result);
    return result as unknown as PushStatusResponse;
  } catch (error) {
    console.error("error getting the quesry", error);
    return null;
  }
}

// function to check the transaction status if the callback fails
export async function checkMpesaTxStatus(
  transactionId: string,
  conversationId: string
) {
  try {
    // Get the access token using the GET function
    const tokenResponse = await getAccessToken();
    const credentials = Buffer.from(
      `${consumerKey}:${consumerSecret}`
    ).toString("base64");
    const accessToken = tokenResponse?.access_token;
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
          ResultURL: "http://myservice:8080/transactionstatus/result",
          QueueTimeOutURL: "http://myservice:8080/timeout",
          Remarks: "OK",
          Occasion: "OK",
        }),
      }
    );
    const result = await response.json();
    console.log(result);
    return result;
  } catch (error) {
    console.log(error);
    return null;
  }
}
