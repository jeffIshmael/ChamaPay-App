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
  fiatAmount?: number;
  description?: string;
  rawReceiver?: string;
  rawSender?: string;
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
  fiatAmount?: number;
}

interface TransactionsResponse {
  success: boolean;
  transactions: ApiTransaction[];
  nextCursor: string | null;
  hasMore: boolean;
}

const descOf = (tx: { description?: string }) => tx.description ?? "";

/** Moonwell / Save & Earn activity (wallet deposit, M-Pesa deposit, or withdraw). */
export const isMoonwellTx = (tx: {
  description?: string;
  rawReceiver?: string;
  rawSender?: string;
}): boolean => {
  const d = descOf(tx);
  return (
    d.includes("Moonwell") ||
    tx.rawReceiver === "Moonwell" ||
    tx.rawSender === "Moonwell"
  );
};

export const isMoonwellWithdrawal = (tx: {
  description?: string;
  rawSender?: string;
  type?: string;
}): boolean => {
  const d = descOf(tx).toLowerCase();
  if (d.includes("withdraw")) return true;
  if (tx.rawSender === "Moonwell") return true;
  return tx.type === "withdrew" && isMoonwellTx(tx as Transaction);
};

export const getMoonwellActivityTitle = (tx: {
  description?: string;
  rawReceiver?: string;
  rawSender?: string;
  type?: string;
}): string =>
  isMoonwellWithdrawal(tx) ? "Save & Earn withdraw" : "Save & Earn deposit";

export const getMoonwellActivitySubtitle = (tx: {
  description?: string;
  isPretiumTx?: boolean;
  rawReceiver?: string;
  rawSender?: string;
  type?: string;
}): string => {
  if (isMoonwellWithdrawal(tx)) return "From Moonwell to wallet";
  if (tx.isPretiumTx || descOf(tx).includes("M-Pesa")) {
    return "From M-Pesa to Moonwell";
  }
  return "From wallet to Moonwell";
};

const transformApiTransaction = (tx: ApiTransaction): Transaction => {
  const description = tx.description ?? "";
  const isMwDeposit =
    description === "Moonwell Deposit" ||
    description.startsWith("Moonwell Deposit");
  const isMwWithdraw =
    description === "Moonwell Withdrawal" ||
    (description.includes("Moonwell") &&
      description.toLowerCase().includes("withdraw"));

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
      description: tx.description,
      rawReceiver: tx.receiver,
      rawSender: tx.sender,
    };
  }

  if (tx.source === "pretium") {
    const moonwellOnramp = isMwDeposit || description.includes("Moonwell");
    return {
      id: tx.id,
      type: tx.isOnramp ? "deposited" : "withdrew",
      token: "USDC",
      amount: tx.amount,
      recipient: moonwellOnramp && tx.isOnramp
        ? "Moonwell"
        : tx.isOnramp
          ? "you"
          : tx.shortcode,
      sender: moonwellOnramp && tx.isOnramp
        ? tx.shortcode || "M-Pesa"
        : tx.isOnramp
          ? tx.shortcode
          : "You",
      hash: tx.txHash || "N/A",
      date: tx.doneAt,
      status: "completed",
      isPretiumTx: true,
      receiptNumber: tx.receiptNumber || undefined,
      fiatAmount: tx.fiatAmount,
      description: tx.description,
      rawReceiver: tx.receiver ?? (moonwellOnramp ? "Moonwell" : undefined),
      rawSender: tx.sender,
    };
  }

  // Wallet → Moonwell supply
  if (isMwDeposit) {
    return {
      id: tx.id,
      type: "deposited",
      token: "USDC",
      amount: tx.amount,
      recipient: "Moonwell",
      sender: "You",
      hash: tx.txHash,
      date: tx.doneAt,
      status: "completed",
      isPretiumTx: false,
      description: tx.description,
      rawReceiver: tx.receiver ?? "Moonwell",
      rawSender: tx.sender,
    };
  }

  // Moonwell → wallet withdraw
  if (isMwWithdraw) {
    return {
      id: tx.id,
      type: "withdrew",
      token: "USDC",
      amount: tx.amount,
      recipient: "You",
      sender: "Moonwell",
      hash: tx.txHash,
      date: tx.doneAt,
      status: "completed",
      isPretiumTx: false,
      description: tx.description,
      rawReceiver: tx.receiver,
      rawSender: tx.sender ?? "Moonwell",
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
    description: tx.description,
    rawReceiver: tx.receiver,
    rawSender: tx.sender,
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
return null;
    }

    const data: TransactionsResponse = await response.json();

    if (!data?.success || !Array.isArray(data.transactions)) {
return null;
    }

    return {
      transactions: data.transactions.map(transformApiTransaction),
      nextCursor: data.nextCursor,
      hasMore: data.hasMore,
    };
  } catch (error) {
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
