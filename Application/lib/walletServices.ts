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
  isPretiumTx?: boolean;
  receiptNumber?: string;
}

interface ApiTransaction {
  id: number;
  source: "payment" | "payout" | "pretium";
  amount: string;
  txHash: string;
  doneAt: string;
  description?: string;
  receiver?: string;
  sender?: string;
  chama?: { name: string } | null;
  isOnramp?: boolean;
  shortcode?: string;
  receiptNumber?: string | null;
  isPretiumTx: boolean;
}

interface TransactionsResponse {
  success: boolean;
  transactions: ApiTransaction[];
  nextCursor: string | null;
  hasMore: boolean;
}

const transformApiTransaction = (tx: ApiTransaction): Transaction => {
  if (tx.source === "payout") {
    return {
      id: tx.id,
      type: "received",
      token: "USDC",
      amount: tx.amount,
      recipient: "You",
      sender: tx.chama ? `${tx.chama.name} chama` : "chama",
      hash: tx.txHash,
      date: tx.doneAt,
      status: "completed",
      isPretiumTx: false,
    };
  }

  if (tx.source === "pretium") {
    return {
      id: tx.id,
      type: tx.isOnramp ? "deposited" : "withdrew",
      token: "USDC",
      amount: tx.amount,
      recipient: tx.isOnramp ? "you" : tx.shortcode,
      sender: tx.isOnramp ? tx.shortcode : "You",
      hash: tx.txHash || "N/A",
      date: tx.doneAt,
      status: "completed",
      isPretiumTx: true,
      receiptNumber: tx.receiptNumber || undefined,
    };
  }

  return {
    id: tx.id,
    type: tx.description === "Received" ? "received" : "sent",
    token: "USDC",
    amount: tx.amount,
    recipient: tx.receiver
      ? tx.receiver
      : tx.chama
        ? `${tx.chama.name} chama`
        : "recipient",
    sender:
      tx.description === "Received" && tx.sender ? tx.sender : "you",
    hash: tx.txHash,
    date: tx.doneAt,
    status: "completed",
    isPretiumTx: false,
  };
};

export interface PaginatedTransactions {
  transactions: Transaction[];
  nextCursor: string | null;
  hasMore: boolean;
}

/**
 * Fetches paginated user transaction history from the server.
 */
export const getTheUserTx = async (
  authToken: string,
  options?: { limit?: number; cursor?: string | null }
): Promise<PaginatedTransactions | null> => {
  if (!authToken || typeof authToken !== "string") {
    console.error("Invalid auth token provided");
    return null;
  }

  const limit = options?.limit ?? 20;
  const params = new URLSearchParams({ limit: String(limit) });
  if (options?.cursor) {
    params.set("cursor", options.cursor);
  }

  try {
    const response = await fetch(
      `${serverUrl}/user/transactions?${params.toString()}`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${authToken}`,
          "Content-Type": "application/json",
        },
      }
    );

    if (!response.ok) {
      console.error(`Failed to fetch transactions: ${response.status}`);
      return null;
    }

    const data: TransactionsResponse = await response.json();

    if (!data?.success || !Array.isArray(data.transactions)) {
      console.error("Invalid response structure from server");
      return null;
    }

    return {
      transactions: data.transactions.map(transformApiTransaction),
      nextCursor: data.nextCursor,
      hasMore: data.hasMore,
    };
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
  type: "sent" | "received" | "withdrew" | "deposited"
): Transaction[] => {
  return transactions.filter((tx) => tx.type === type);
};

/**
 * Filters Pretium transactions
 */
export const filterPretiumTransactions = (
  transactions: Transaction[]
): Transaction[] => {
  return transactions.filter((tx) => tx.isPretiumTx === true);
};

/**
 * Filters blockchain transactions (non-Pretium)
 */
export const filterBlockchainTransactions = (
  transactions: Transaction[]
): Transaction[] => {
  return transactions.filter((tx) => tx.isPretiumTx === false);
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
