import { serverUrl } from "@/constants/serverUrl";

/**
 * Transaction interface with all required fields
 */
export interface Transaction {
  id: number;
  type: "send" | "receive";
  token: "cUSD" | "USDC";
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
}

/**
 * User details response from API
 */
interface UserDetailsResponse {
  user: {
    payOuts: PayoutData[];
    payments: PaymentData[];
  };
}

/**
 * Validates transaction data and fills missing fields with defaults
 */
const validateTransaction = (tx: Partial<Transaction>): Transaction => {
  return {
    id: tx.id ?? 0,
    type: tx.type ?? "send",
    token: tx.token ?? "cUSD",
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
    type: "send",
    token: "cUSD",
    amount: payment.amount,
    recipient: payment.chama.name,
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
    type: "receive",
    token: "cUSD",
    amount: payout.amount,
    recipient: "You",
    sender: payout.chama.name,
    hash: payout.txHash,
    date: payout.doneAt,
    status: "completed",
  });
};

/**
 * Combines and sorts payouts and payments into a unified transaction array
 * Newest transactions appear first
 */
const mergeAndSortTransactions = (
  payouts: PayoutData[],
  payments: PaymentData[]
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
      !Array.isArray(data.user.payments)
    ) {
      console.error("Invalid response structure from server");
      return null;
    }

    const { payOuts, payments } = data.user;
    const transactions = mergeAndSortTransactions(payOuts, payments);

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
  type: "send" | "receive"
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