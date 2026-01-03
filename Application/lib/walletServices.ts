import { serverUrl } from "@/constants/serverUrl";

/**
 * Transaction interface with all required fields
 */
export interface Transaction {
  id: number;
  type: "sent" | "received" | "withdrew" | "deposited";
  token: "USDC";
  amount: string;
  recipient?: string;
  sender?: string;
  hash: string;
  date: string;
  status: "completed" | "pending" | "failed";
}

/**
 * Raw payout data from API
 */
interface PayoutData {
  id: number;
  amount: string;
  txHash: string;
  doneAt: string;
  chama: {
    name: string;
  };
}

/**
 * Raw payment data from API
 */
interface PaymentData {
  id: number;
  amount: string;
  txHash: string;
  doneAt: string;
  chama: {
    name: string;
  };
  receiver: string;
}

/**
 * Raw pretium data from API
 */
interface PretiumTxData {
  account_number: null | number;
  amount: string;
  blockchainTxHash: null | string;
  chamaId: null | number;
  createdAt: string;
  cusdAmount: string;
  exchangeRate: string;
  id: number;
  isOnramp: boolean;
  isRealesed: boolean;
  message: string;
  pretiumType: null | string;
  receiptNumber: null | string;
  shortcode: string;
  status: "FAILED" | "CANCELLED" | "COMPLETED";
  transactionCode: string;
  transactionDate: null | string;
  type: string;
  updatedAt: string;
  user: {};
  userId: number;
  walletAddress: string;
}

/**
 * User details response from API
 */
interface UserDetailsResponse {
  user: {
    payOuts: PayoutData[];
    payments: PaymentData[];
    pretiumTransactions: PretiumTxData[];
  };
}

/**
 * Validates transaction data and fills missing fields with defaults
 */
const validateTransaction = (tx: Partial<Transaction>): Transaction => {
  return {
    id: tx.id ?? 0,
    type: tx.type ?? "sent",
    token: tx.token ?? "USDC",
    amount: tx.amount ?? "0",
    recipient: tx.recipient,
    sender: tx.sender,
    hash: tx.hash ?? "0x",
    date: tx.date ?? new Date().toISOString(),
    status: tx.status ?? "completed",
  };
};

/**
 * Transforms payment data from API to Transaction format
 */
const transformPayment = (payment: PaymentData): Transaction => {
  return validateTransaction({
    id: payment.id,
    type: "sent",
    token: "USDC",
    amount: payment.amount,
    recipient: payment.receiver
      ? payment.receiver
      : payment.chama.name + " " + "chama",
    sender: "you",
    hash: payment.txHash,
    date: payment.doneAt,
    status: "completed",
  });
};

/**
 * Transforms payout data from API to Transaction format
 */
const transformPayout = (payout: PayoutData): Transaction => {
  return validateTransaction({
    id: payout.id,
    type: "received",
    token: "USDC",
    amount: payout.amount,
    recipient: "You",
    sender: payout.chama.name + " " + "chama",
    hash: payout.txHash,
    date: payout.doneAt,
    status: "completed",
  });
};

/**
 * Transforms pretiumTx data from API to Transaction format
 */
const transformPretiumTx = (pretiumTx: PretiumTxData): Transaction => {
  return validateTransaction({
    id: pretiumTx.id,
    type: pretiumTx.isOnramp ? "deposited": "withdrew",
    token: "USDC",
    amount: pretiumTx.amount,
    recipient: pretiumTx.isOnramp ? "you" : pretiumTx.shortcode,
    sender: pretiumTx.isOnramp ? pretiumTx.shortcode : "You",
    hash: pretiumTx.receiptNumber!,
    date: pretiumTx.updatedAt,
    status: "completed",
  });
};

/**
 * Combines and sorts payouts and payments into a unified transaction array
 * Newest transactions appear first
 */
const mergeAndSortTransactions = (
  payouts: PayoutData[],
  payments: PaymentData[],
  pretiumTransactions: PretiumTxData[]
): Transaction[] => {
  const transformed: Transaction[] = [];

  // Transform payments (sends)
  if (Array.isArray(payments) && payments.length > 0) {
    transformed.push(...payments.map(transformPayment));
  }

  // Transform payouts (receives)
  if (Array.isArray(payouts) && payouts.length > 0) {
    transformed.push(...payouts.map(transformPayout));
  }

  // Transform pretiumTxs (onramps& offramps)
  if (Array.isArray(pretiumTransactions) && pretiumTransactions.length > 0) {
    transformed.push(...pretiumTransactions.map(transformPretiumTx));
  }

  // Sort by date (newest first)
  return transformed.sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );
};

/**
 * Fetches user transaction history from the server
 * @param authToken - Bearer token for authentication
 * @returns Array of transactions sorted by date (newest first), or null on error
 */
export const getTheUserTx = async (
  authToken: string
): Promise<Transaction[] | null> => {
  // Validate input
  if (!authToken || typeof authToken !== "string") {
    console.error("Invalid auth token provided");
    return null;
  }

  try {
    const response = await fetch(`${serverUrl}/user/details`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${authToken}`,
        "Content-Type": "application/json",
      },
    });

    // Check response status
    if (!response.ok) {
      console.error(`Failed to fetch transactions: ${response.status}`);
      return null;
    }

    const data: UserDetailsResponse = await response.json();

    // Validate response structure
    if (
      !data ||
      !data.user ||
      !Array.isArray(data.user.payOuts) ||
      !Array.isArray(data.user.payments) ||
      !Array.isArray(data.user.pretiumTransactions)
    ) {
      console.error("Invalid response structure from server");
      return null;
    }


    const { payOuts, payments, pretiumTransactions } = data.user;
    const transactions = mergeAndSortTransactions(payOuts, payments, pretiumTransactions);

    return transactions;
  } catch (error) {
    console.error("Error fetching transactions:", error);
    return null;
  }
};

/**
 * Filters transactions by type
 */
export const filterTransactionsByType = (
  transactions: Transaction[],
  type: "sent" | "received"
): Transaction[] => {
  return transactions.filter((tx) => tx.type === type);
};

/**
 * Calculates total transaction amount
 */
export const getTotalTransactionAmount = (
  transactions: Transaction[]
): number => {
  return transactions.reduce((total, tx) => {
    const amount = parseFloat(tx.amount) || 0;
    return total + amount;
  }, 0);
};

/**
 * Gets transactions within a date range
 */
export const getTransactionsByDateRange = (
  transactions: Transaction[],
  startDate: Date,
  endDate: Date
): Transaction[] => {
  return transactions.filter((tx) => {
    const txDate = new Date(tx.date);
    return txDate >= startDate && txDate <= endDate;
  });
};
