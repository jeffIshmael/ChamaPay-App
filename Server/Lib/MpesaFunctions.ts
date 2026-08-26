import moment from "moment";

// this file contains the functions for the mpesa integration for our local FX
// the functions needed are:
// create a new stk push (for an onramp functionality)
// check the status of a stk push
// check the status of a b2c transaction ✅
// check the status of a transaction
// A B2C transaction (from business to phone number) - this is for an offramp functionality ✅
// A check number transaction ✅ (this verifys the phone number to show to the user the name of the person to whom they are withdrawing to) - we will use existing pretium's verify number functionality ✅
// A check balance transaction (this checks the balance of the business account) ✅

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

interface StkPushApiError {
  requestId?: string;
  errorCode?: string;
  errorMessage?: string;
}

interface PushStatusResponse {
  ResponseCode: string;
  ResponseDescription: string;
  MerchantRequestID: string;
  CheckoutRequestID: string;
  ResultCode: string;
  ResultDesc: string;
}

export interface StkCallbackMetadataItem {
  Name: string;
  Value: string | number;
}

export interface StkPushCallbackBody {
  Body?: {
    stkCallback?: {
      MerchantRequestID: string;
      CheckoutRequestID: string;
      ResultCode: number | string;
      ResultDesc: string;
      CallbackMetadata?: {
        Item?: StkCallbackMetadataItem | StkCallbackMetadataItem[];
      };
    };
  };
}

export interface ParsedStkPushResult {
  success: boolean;
  merchantRequestId?: string;
  checkoutRequestId?: string;
  code?: string;
  description?: string;
  amount?: number;
  mpesaReceiptNumber?: string;
  transactionDate?: string;
  phoneNumber?: string;
}

/** Immediate response from POST /mpesa/transactionstatus/v1/query */
export interface TransactionStatusQueryResponse {
  OriginatorConversationID: string;
  ConversationID: string;
  ResponseCode: string;
  ResponseDescription: string;
}

export interface TransactionStatusQueryOptions {
  /** M-Pesa receipt number, e.g. LXXXXXX1234 */
  transactionId?: string;
  /** OriginatorConversationID from the original transaction */
  originalConversationId?: string;
  remarks?: string;
  occasion?: string;
}

export interface TransactionStatusCallbackResult {
  success: boolean;
  conversationId?: string;
  originatorConversationId?: string;
  transactionId?: string;
  code?: string;
  description?: string;
  debitPartyName?: string;
}

export interface TransactionStatusCallbackBody {
  Result?: {
    ResultType?: string | number;
    ResultCode: string | number;
    ResultDesc: string;
    OriginatorConversationID?: string;
    ConversationID?: string;
    TransactionID?: string;
    ResultParameters?: {
      ResultParameter?: DarajaResultParameter | DarajaResultParameter[];
    };
  };
}

export type MpesaStkTransactionType =
  | "CustomerBuyGoodsOnline"
  | "CustomerPayBillOnline";

export interface TillPushStkOptions {
  amount: string | number;
  phoneNumber: string | number;
  accountReference: string;
  transactionDesc?: string;
  transactionType?: MpesaStkTransactionType;
}

/** Immediate response from POST /mpesa/accountbalance/v1/query */
interface AccountBalanceQueryResponse {
  OriginatorConversationID: string;
  ConversationID: string;
  ResponseCode: string;
  ResponseDescription: string;
}

interface DarajaResultParameter {
  Key: string;
  Value: string;
}

export interface ParsedAccountBalance {
  accountType: string;
  currency: string;
  currentBalance: number;
  availableBalance: number;
  reservedBalance: number;
  unclearedBalance: number;
}

export interface AccountBalanceCallbackResult {
  success: boolean;
  conversationId?: string;
  transactionId?: string;
  completedTime?: string;
  balances?: ParsedAccountBalance[];
  code?: string;
  description?: string;
}

export interface AccountBalanceCallbackBody {
  Result?: {
    ResultType?: string;
    ResultCode: string;
    ResultDesc: string;
    OriginatorConversationID?: string;
    ConversationID?: string;
    TransactionID?: string;
    ResultParameters?: {
      ResultParameter?: DarajaResultParameter | DarajaResultParameter[];
    };
  };
}

/** Immediate response from POST /mpesa/b2c/v3/paymentrequest */
export interface B2CPaymentResponse {
  OriginatorConversationID: string;
  ConversationID: string;
  ResponseCode: string;
  ResponseDescription: string;
}

export interface B2CApiError {
  requestId?: string;
  errorCode?: string;
  errorMessage?: string;
}

export type B2CCommandID =
  | "BusinessPayment"
  | "SalaryPayment"
  | "PromotionPayment";

export interface B2CPaymentOptions {
  amount: string | number;
  phoneNumber: string | number;
  remarks?: string;
  occasion?: string;
  commandId?: B2CCommandID;
  originatorConversationId?: string;
}

export interface ParsedB2CResult {
  transactionAmount?: number;
  transactionReceipt?: string;
  receiverName?: string;
  receiverPhone?: string;
  completedAt?: string;
  utilityAccountBalance?: number;
  workingAccountBalance?: number;
  recipientIsRegistered?: boolean;
  chargesPaidAccountBalance?: number;
}

export interface B2CCallbackResult {
  success: boolean;
  conversationId?: string;
  originatorConversationId?: string;
  transactionId?: string;
  code?: string;
  description?: string;
  details?: ParsedB2CResult;
}

export interface B2CCallbackBody {
  Result?: {
    ResultType?: string | number;
    ResultCode: string | number;
    ResultDesc: string;
    OriginatorConversationID?: string;
    ConversationID?: string;
    TransactionID?: string;
    ResultParameters?: {
      ResultParameter?: DarajaResultParameter | DarajaResultParameter[];
    };
  };
}

/** Common Daraja B2C result codes from the API docs */
export const B2C_RESULT_CODES: Record<string, string> = {
  "0": "The service request is processed successfully.",
  "1": "The balance is insufficient for the transaction.",
  "2": "Declined due to limit rule (below minimum).",
  "3": "Declined due to limit rule (above maximum).",
  "4": "Declined: would exceed daily transfer limit.",
  "8": "Declined: would exceed maximum customer balance.",
  "11": "The DebitParty is in an invalid state.",
  "21": "The initiator is not allowed to initiate this request.",
  "2001": "The initiator information is invalid.",
  "2006": "Account status does not allow this transaction.",
  "2028": "Shortcode has no permission to perform B2C payments.",
  "2040": "Credit party customer type is not supported.",
};

const consumerKey = process.env.MPESA_CUSTOMER_KEY;
const consumerSecret = process.env.MPESA_CONSUMER_SECRET;
const chamapayTillNumber = process.env.CHAMAPAY_TILL;
const mpesaInitiator = process.env.MPESA_INITIATOR;
const passkey =
  process.env.MPESA_PASSKEY ||
  "bfb279f9aa9bdbcf158e97dd71a467cd2e0c893059b10f78e6b72ada1ed2c919";
const callbackUrl = process.env.MPESA_CALLBACK_URL;
const SecurityCredential = process.env.SECURITY_CREDENTIAL;
const baseUrl = process.env.SANDBOX_URL;
const mpesaTransactionType =
  (process.env.MPESA_TRANSACTION_TYPE as MpesaStkTransactionType | undefined) ??
  "CustomerBuyGoodsOnline";

if (!consumerKey || !consumerSecret || !chamapayTillNumber || !SecurityCredential || !baseUrl) {
  throw new Error("M-Pesa environment variables are not set.");
}

if (!callbackUrl) {
  throw new Error("MPESA_CALLBACK_URL is not set in environment variables");
}

const normalizeDarajaResultParameters = (
  rawParams?: DarajaResultParameter | DarajaResultParameter[]
): DarajaResultParameter[] => {
  if (!rawParams) return [];
  return Array.isArray(rawParams) ? rawParams : [rawParams];
};

const getDarajaResultParam = (
  params: DarajaResultParameter[],
  key: string
): string | undefined => {
  const match = params.find((param) => param.Key === key);
  if (!match) return undefined;
  return String(match.Value);
};

/** Formats a Kenyan phone number to 254XXXXXXXXX for Daraja PartyB */
export function formatMpesaPhoneNumber(phone: string | number): string {
  const digits = String(phone).replace(/\D/g, "");

  if (digits.startsWith("254") && digits.length === 12) {
    return digits;
  }
  if (digits.startsWith("0") && digits.length === 10) {
    return `254${digits.slice(1)}`;
  }
  if (digits.length === 9) {
    return `254${digits}`;
  }

  throw new Error(`Invalid Kenyan phone number: ${phone}`);
}

/** Unique ID per B2C request — prevents duplicate disbursement (Daraja error 500.002.1001) */
export function generateOriginatorConversationID(
  shortCode: string = chamapayTillNumber ?? "ChamaPay"
): string {
  const suffix = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
  return `${shortCode}_ChamaPay_${suffix}`;
}

const sanitizeRemarks = (remarks: string): string => {
  const trimmed = remarks.trim();
  if (trimmed.length < 2) {
    return "ChamaPay withdrawal";
  }
  return trimmed.slice(0, 100);
};

const buildStkCredentials = () => {
  const timestamp = moment().format("YYYYMMDDHHmmss");
  const password = Buffer.from(
    `${chamapayTillNumber}${passkey}${timestamp}`
  ).toString("base64");

  return { timestamp, password };
};

const normalizeCallbackMetadataItems = (
  items?: StkCallbackMetadataItem | StkCallbackMetadataItem[]
): StkCallbackMetadataItem[] => {
  if (!items) return [];
  return Array.isArray(items) ? items : [items];
};

const getCallbackMetadataValue = (
  items: StkCallbackMetadataItem[],
  name: string
): string | number | undefined => {
  const match = items.find((item) => item.Name === name);
  return match?.Value;
};

/**
 * Parses the STK Push callback payload POSTed to CallBackURL.
 */
export function parseStkPushCallback(
  body: StkPushCallbackBody
): ParsedStkPushResult {
  const callback = body.Body?.stkCallback;
  if (!callback) {
    return { success: false, description: "Missing stkCallback in callback body" };
  }

  const resultCode = String(callback.ResultCode);
  const metadata = normalizeCallbackMetadataItems(callback.CallbackMetadata?.Item);

  if (resultCode !== "0") {
    return {
      success: false,
      code: resultCode,
      description: callback.ResultDesc,
      merchantRequestId: callback.MerchantRequestID,
      checkoutRequestId: callback.CheckoutRequestID,
    };
  }

  const amountValue = getCallbackMetadataValue(metadata, "Amount");
  return {
    success: true,
    code: resultCode,
    description: callback.ResultDesc,
    merchantRequestId: callback.MerchantRequestID,
    checkoutRequestId: callback.CheckoutRequestID,
    amount:
      amountValue !== undefined ? Number(amountValue) : undefined,
    mpesaReceiptNumber: String(
      getCallbackMetadataValue(metadata, "MpesaReceiptNumber") ?? ""
    ) || undefined,
    transactionDate: String(
      getCallbackMetadataValue(metadata, "TransactionDate") ?? ""
    ) || undefined,
    phoneNumber: String(
      getCallbackMetadataValue(metadata, "PhoneNumber") ?? ""
    ) || undefined,
  };
}

/**
 * Parses the async ResultURL callback for a Transaction Status query.
 */
export function parseTransactionStatusCallback(
  body: TransactionStatusCallbackBody
): TransactionStatusCallbackResult {
  const result = body.Result;
  if (!result) {
    return { success: false, description: "Missing Result in callback body" };
  }

  const resultCode = String(result.ResultCode);
  const params = normalizeDarajaResultParameters(
    result.ResultParameters?.ResultParameter
  );

  if (resultCode !== "0") {
    return {
      success: false,
      code: resultCode,
      description: result.ResultDesc,
      conversationId: result.ConversationID,
      originatorConversationId: result.OriginatorConversationID,
      transactionId: result.TransactionID,
    };
  }

  return {
    success: true,
    code: resultCode,
    description: result.ResultDesc,
    conversationId: result.ConversationID,
    originatorConversationId: result.OriginatorConversationID,
    transactionId: result.TransactionID,
    debitPartyName: getDarajaResultParam(params, "DebitPartyName"),
  };
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
      `${baseUrl}/oauth/v1/generate?grant_type=client_credentials`,
      { headers }
    );
    const result = await response.json();
    return result as unknown as TokenResponse;
  } catch (error) {
    console.error("Error getting M-Pesa token:", error);
    return null;
  }
}

// Initiate STK Push (M-Pesa Express / Lipa Na M-PESA Online)
export async function tillPushStk(
  amount: string,
  userPhoneNo: number,
  accountReference: string
): Promise<PushResponse | StkPushApiError | null> {
  return initiateStkPush({
    amount,
    phoneNumber: userPhoneNo,
    accountReference,
  });
}

/**
 * POST {baseUrl}/mpesa/stkpush/v1/processrequest
 * Use CustomerBuyGoodsOnline for Till, CustomerPayBillOnline for Paybill.
 */
export async function initiateStkPush(
  options: TillPushStkOptions
): Promise<PushResponse | StkPushApiError | null> {
  const businessShortCode = Number(chamapayTillNumber);
  const { timestamp, password } = buildStkCredentials();
  const phoneNumber = formatMpesaPhoneNumber(options.phoneNumber);
  const amount = String(options.amount);
  const transactionType =
    options.transactionType ?? mpesaTransactionType;

  try {
    const tokenResponse = await getAccessToken();
    if (!tokenResponse) {
      console.error("Failed to get access token");
      return null;
    }

    const headers = new Headers();
    headers.append("Authorization", `Bearer ${tokenResponse.access_token}`);
    headers.append("Content-Type", "application/json");

    const requestBody = {
      BusinessShortCode: businessShortCode,
      Password: password,
      Timestamp: timestamp,
      TransactionType: transactionType,
      Amount: amount,
      PartyA: phoneNumber,
      PartyB: chamapayTillNumber,
      PhoneNumber: phoneNumber,
      CallBackURL: `${callbackUrl}/mpesa/stk/callback`,
      AccountReference: options.accountReference.substring(0, 12),
      TransactionDesc: (options.transactionDesc ?? `ChamaPay ${amount}`)
        .substring(0, 13),
    };

    const response = await fetch(`${baseUrl}/mpesa/stkpush/v1/processrequest`, {
      method: "POST",
      headers,
      body: JSON.stringify(requestBody),
    });

    const result = (await response.json()) as PushResponse | StkPushApiError;

    if (!response.ok || "errorCode" in result) {
      console.error("STK Push rejected:", result);
      return result as StkPushApiError;
    }

    const accepted = result as PushResponse;
    if (accepted.ResponseCode !== "0") {
      console.error("STK Push not accepted:", accepted);
      return accepted;
    }

    console.log("STK Push accepted:", {
      MerchantRequestID: accepted.MerchantRequestID,
      CheckoutRequestID: accepted.CheckoutRequestID,
      ResponseDescription: accepted.ResponseDescription,
    });

    return accepted;
  } catch (error) {
    console.error("STK Push Error:", error);
    return null;
  }
}

// Query STK Push status (stkpushquery — use CheckoutRequestID from tillPushStk)
export async function checkPushStatus(
  checkoutRequestId: string
): Promise<PushStatusResponse | null> {
  const { timestamp, password } = buildStkCredentials();

  try {
    const tokenResponse = await getAccessToken();
    if (!tokenResponse) {
      console.error("Failed to get access token");
      return null;
    }

    const headers = new Headers();
    headers.append("Authorization", `Bearer ${tokenResponse.access_token}`);
    headers.append("Content-Type", "application/json");

    const response = await fetch(`${baseUrl}/mpesa/stkpushquery/v1/query`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        BusinessShortCode: Number(chamapayTillNumber),
        Password: password,
        Timestamp: timestamp,
        CheckoutRequestID: checkoutRequestId,
      }),
    });

    const result = (await response.json()) as PushStatusResponse;

    if (!response.ok) {
      console.error("STK status query HTTP error:", response.status, result);
      return null;
    }

    console.log("STK status query:", {
      CheckoutRequestID: checkoutRequestId,
      ResultCode: result.ResultCode,
      ResultDesc: result.ResultDesc,
    });

    return result;
  } catch (error) {
    console.error("Error querying STK push status:", error);
    return null;
  }
}

/**
 * Parses the pipe-delimited AccountBalance value from Daraja result callback.
 * Format: AccountType|Currency|CurrentBalance|AvailableBalance|ReservedBalance|UnclearedBalance
 * Multiple accounts may be concatenated with "&".
 */
export function parseAccountBalanceValue(value: string): ParsedAccountBalance[] {
  const segments = value.includes("&") ? value.split("&") : [value];

  return segments.map((segment) => {
    const [accountType, currency, current, available, reserved, uncleared] =
      segment.split("|");

    return {
      accountType: accountType?.trim() ?? "",
      currency: currency?.trim() ?? "KES",
      currentBalance: parseFloat(current ?? "0") || 0,
      availableBalance: parseFloat(available ?? "0") || 0,
      reservedBalance: parseFloat(reserved ?? "0") || 0,
      unclearedBalance: parseFloat(uncleared ?? "0") || 0,
    };
  });
}

/**
 * Parses the async ResultURL callback payload for an AccountBalance query.
 */
export function parseAccountBalanceCallback(
  body: AccountBalanceCallbackBody
): AccountBalanceCallbackResult {
  const result = body.Result;
  if (!result) {
    return { success: false, description: "Missing Result in callback body" };
  }

  if (result.ResultCode !== "0") {
    return {
      success: false,
      code: result.ResultCode,
      description: result.ResultDesc,
      conversationId: result.ConversationID,
      transactionId: result.TransactionID,
    };
  }

  const rawParams = result.ResultParameters?.ResultParameter;
  const params = normalizeDarajaResultParameters(rawParams);

  const balanceParam = params.find((param) => param.Key === "AccountBalance");
  const completedTimeParam = params.find(
    (param) => param.Key === "BOCompletedTime"
  );

  if (!balanceParam?.Value) {
    return {
      success: false,
      code: result.ResultCode,
      description: "AccountBalance not found in result parameters",
      conversationId: result.ConversationID,
    };
  }

  return {
    success: true,
    conversationId: result.ConversationID,
    transactionId: result.TransactionID,
    completedTime: completedTimeParam?.Value,
    balances: parseAccountBalanceValue(balanceParam.Value),
    code: result.ResultCode,
    description: result.ResultDesc,
  };
}

// check the balance of the business account (async — balance arrives at ResultURL)
export async function checkBalance(): Promise<AccountBalanceQueryResponse | null> {
  if (!mpesaInitiator) {
    console.error("MPESA_INITIATOR is not set");
    return null;
  }

  try {
    const tokenResponse = await getAccessToken();
    if (!tokenResponse) {
      console.error("Failed to get access token");
      return null;
    }

    const headers = new Headers();
    headers.append("Authorization", `Bearer ${tokenResponse.access_token}`);
    headers.append("Content-Type", "application/json");

    const requestBody = {
      Initiator: mpesaInitiator,
      SecurityCredential: SecurityCredential,
      CommandID: "AccountBalance",
      PartyA: chamapayTillNumber,
      IdentifierType: "4",
      Remarks: "Balance check",
      QueueTimeoutURL: `${callbackUrl}/mpesa/timeout`,
      ResultURL: `${callbackUrl}/mpesa/result`,
    };

    const response = await fetch(
      `${baseUrl}/mpesa/accountbalance/v1/query`,
      {
        method: "POST",
        headers,
        body: JSON.stringify(requestBody),
      }
    );

    const result = (await response.json()) as AccountBalanceQueryResponse;

    if (!response.ok) {
      console.error("Balance check HTTP error:", response.status, result);
      return null;
    }

    if (result.ResponseCode !== "0") {
      console.error("Balance check rejected:", result);
      return null;
    }

    console.log("Balance check accepted:", {
      ConversationID: result.ConversationID,
      OriginatorConversationID: result.OriginatorConversationID,
      ResponseDescription: result.ResponseDescription,
    });

    return result;
  } catch (error) {
    console.error("Error checking balance:", error);
    return null;
  }
}

/**
 * Parses the async ResultURL callback for a B2C payment.
 */
export function parseB2CCallback(body: B2CCallbackBody): B2CCallbackResult {
  const result = body.Result;
  if (!result) {
    return { success: false, description: "Missing Result in callback body" };
  }

  const resultCode = String(result.ResultCode);

  if (resultCode !== "0") {
    return {
      success: false,
      code: resultCode,
      description:
        result.ResultDesc ||
        B2C_RESULT_CODES[resultCode] ||
        "B2C payment failed",
      conversationId: result.ConversationID,
      originatorConversationId: result.OriginatorConversationID,
      transactionId: result.TransactionID,
    };
  }

  const params = normalizeDarajaResultParameters(
    result.ResultParameters?.ResultParameter
  );

  const receiverPublicName = getDarajaResultParam(
    params,
    "ReceiverPartyPublicName"
  );
  const [receiverPhone, ...nameParts] = receiverPublicName
    ? receiverPublicName.split(" - ")
    : [];

  return {
    success: true,
    code: resultCode,
    description: result.ResultDesc,
    conversationId: result.ConversationID,
    originatorConversationId: result.OriginatorConversationID,
    transactionId: result.TransactionID,
    details: {
      transactionAmount:
        parseFloat(getDarajaResultParam(params, "TransactionAmount") ?? "0") ||
        undefined,
      transactionReceipt:
        getDarajaResultParam(params, "TransactionReceipt") ??
        result.TransactionID,
      receiverPhone: receiverPhone?.trim(),
      receiverName: nameParts.join(" - ").trim() || undefined,
      completedAt: getDarajaResultParam(
        params,
        "TransactionCompletedDateTime"
      ),
      utilityAccountBalance:
        parseFloat(
          getDarajaResultParam(params, "B2CUtilityAccountAvailableFunds") ?? ""
        ) || undefined,
      workingAccountBalance:
        parseFloat(
          getDarajaResultParam(params, "B2CWorkingAccountAvailableFunds") ?? ""
        ) || undefined,
      recipientIsRegistered:
        getDarajaResultParam(params, "B2CRecipientIsRegisteredCustomer") === "Y",
      chargesPaidAccountBalance:
        parseFloat(
          getDarajaResultParam(
            params,
            "B2CChargesPaidAccountAvailableFunds"
          ) ?? ""
        ) || undefined,
    },
  };
}

/**
 * Send KES from the business paybill/shortcode to a customer's M-Pesa number (B2C).
 * Returns when Daraja accepts the request; final status arrives at ResultURL.
 */
export async function sendB2CPayment(
  options: B2CPaymentOptions
): Promise<B2CPaymentResponse | B2CApiError | null> {
  if (!mpesaInitiator) {
    console.error("MPESA_INITIATOR is not set");
    return null;
  }

  try {
    const tokenResponse = await getAccessToken();
    if (!tokenResponse) {
      console.error("Failed to get access token");
      return null;
    }

    const partyB = formatMpesaPhoneNumber(options.phoneNumber);
    const amount = String(options.amount);
    const originatorConversationId =
      options.originatorConversationId ??
      generateOriginatorConversationID(chamapayTillNumber);

    const requestBody = {
      OriginatorConversationID: originatorConversationId,
      InitiatorName: mpesaInitiator,
      SecurityCredential: SecurityCredential,
      CommandID: options.commandId ?? "BusinessPayment",
      Amount: amount,
      PartyA: chamapayTillNumber,
      PartyB: partyB,
      Remarks: sanitizeRemarks(options.remarks ?? "ChamaPay withdrawal"),
      QueueTimeOutURL: `${callbackUrl}/mpesa/b2c/timeout`,
      ResultURL: `${callbackUrl}/mpesa/b2c/result`,
      Occassion: (options.occasion ?? "ChamaPay withdrawal").slice(0, 100),
    };

    const headers = new Headers();
    headers.append("Authorization", `Bearer ${tokenResponse.access_token}`);
    headers.append("Content-Type", "application/json");

    const response = await fetch(`${baseUrl}/mpesa/b2c/v3/paymentrequest`, {
      method: "POST",
      headers,
      body: JSON.stringify(requestBody),
    });

    const result = (await response.json()) as
      | B2CPaymentResponse
      | B2CApiError;

    if (!response.ok || "errorCode" in result) {
      console.error("B2C payment rejected:", result);
      return result as B2CApiError;
    }

    const accepted = result as B2CPaymentResponse;
    if (accepted.ResponseCode !== "0") {
      console.error("B2C payment not accepted:", accepted);
      return accepted;
    }

    console.log("B2C payment accepted:", {
      ConversationID: accepted.ConversationID,
      OriginatorConversationID: accepted.OriginatorConversationID,
      ResponseDescription: accepted.ResponseDescription,
      PartyB: partyB,
      Amount: amount,
    });

    return accepted;
  } catch (error) {
    console.error("B2C payment error:", error);
    return null;
  }
}

/** @deprecated Use sendB2CPayment instead */
export async function B2CMpesaTx(
  amount: string,
  userPhoneNo: number,
  remarks: string
): Promise<B2CPaymentResponse | B2CApiError | null> {
  return sendB2CPayment({
    amount,
    phoneNumber: userPhoneNo,
    remarks,
  });
}

/**
 * Query transaction status on Daraja (async — result arrives at ResultURL).
 * Provide either transactionId (M-Pesa receipt) or originalConversationId.
 *
 * POST {baseUrl}/mpesa/transactionstatus/v1/query
 */
export async function checkTransactionStatus(
  options: TransactionStatusQueryOptions
): Promise<TransactionStatusQueryResponse | null> {
  if (!mpesaInitiator) {
    console.error("MPESA_INITIATOR is not set");
    return null;
  }

  if (!options.transactionId && !options.originalConversationId) {
    throw new Error(
      "Either transactionId or originalConversationId is required"
    );
  }

  try {
    const tokenResponse = await getAccessToken();
    if (!tokenResponse) {
      console.error("Failed to get access token");
      return null;
    }

    const headers = new Headers();
    headers.append("Authorization", `Bearer ${tokenResponse.access_token}`);
    headers.append("Content-Type", "application/json");

    const requestBody = {
      Initiator: mpesaInitiator,
      SecurityCredential: SecurityCredential!,
      CommandID: "TransactionStatusQuery",
      PartyA: chamapayTillNumber!,
      IdentifierType: 4,
      Remarks: sanitizeRemarks(options.remarks ?? "Transaction status query"),
      QueueTimeoutURL: `${callbackUrl}/mpesa/transaction-status/timeout`,
      ResultURL: `${callbackUrl}/mpesa/transaction-status/result`,
      Occasion: (options.occasion ?? "ChamaPay status check").slice(0, 100),
      ...(options.transactionId
        ? { TransactionID: options.transactionId }
        : {}),
      ...(options.originalConversationId
        ? { OriginalConversationID: options.originalConversationId }
        : {}),
    };

    const response = await fetch(
      `${baseUrl}/mpesa/transactionstatus/v1/query`,
      {
        method: "POST",
        headers,
        body: JSON.stringify(requestBody),
      }
    );

    const result = (await response.json()) as TransactionStatusQueryResponse;

    if (!response.ok) {
      console.error("Transaction status HTTP error:", response.status, result);
      return null;
    }

    if (result.ResponseCode !== "0") {
      console.error("Transaction status not accepted:", result);
      return result;
    }

    console.log("Transaction status query accepted:", {
      ConversationID: result.ConversationID,
      OriginatorConversationID: result.OriginatorConversationID,
      ResponseDescription: result.ResponseDescription,
    });

    return result;
  } catch (error) {
    console.error("Error checking transaction status:", error);
    return null;
  }
}

/** @deprecated Use checkTransactionStatus instead */
export async function checkMpesaTxStatus(
  transactionId: string,
  conversationId: string
): Promise<TransactionStatusQueryResponse | null> {
  return checkTransactionStatus({
    transactionId,
    originalConversationId: conversationId,
  });
}
