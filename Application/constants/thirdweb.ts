import { createThirdwebClient, getContract, Insight } from "thirdweb";
import { base } from "thirdweb/chains";
import { Abi, decodeFunctionData } from "thirdweb/utils";
import { getWalletBalance } from "thirdweb/wallets";
import { chamapayContractAddress, usdcAddress } from "./contractAddress";

// Define a type for your balances
export type AllBalances = {
  USDC: {
    chainId: number;
    decimals: number;
    displayValue: string;
    name: string;
    symbol: string;
    tokenAddress: string;
    value: bigint;
  };
};

// Environment variables
const clientId = process.env.EXPO_PUBLIC_THIRDWEB_CLIENT_ID || "";
const secretKey = process.env.EXPO_PUBLIC_THIRDWEB_SECRET_KEY || "";

// Initialize the Thirdweb client
export const client = createThirdwebClient({
  clientId,
  secretKey,
});

// Set your primary chain (Celo)
export const chain = base;

export const usdcContract = getContract({
  address: usdcAddress,
  chain: base,
  client,
});

export const chamapayContract = getContract({
  address: chamapayContractAddress,
  chain: base,
  client,
});

//  Function to get wallet balances
export async function getAllBalances(
  address: `0x${string}`
): Promise<AllBalances> {
  const USDCBalance = await getWalletBalance({
    address,
    client,
    chain,
    tokenAddress: usdcAddress,
  });

  return {
    USDC: USDCBalance,
  };
}

// --- Token constants ---
const TOKENS = {
  USDC: {
    name: "USDC",
    address: usdcAddress,
  },
};

// --- ERC20 ABI ---
const ERC20_ABI: Abi = [
  {
    name: "transfer",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "to", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [{ name: "", type: "bool" }],
  },
];

export async function getAllTransferFunctions(userWallet: string) {
  try {
    const transactions = await Insight.getTransactions({
      client,
      walletAddress: userWallet,
      chains: [base],
    });

    const results = [];
    let id = 1;

    for (const tx of transactions) {
      if (tx.function_selector !== "0xa9059cbb") continue;

      const token = Object.values(TOKENS).find(
        (t) => t.address.toLowerCase() === tx.to_address.toLowerCase()
      );
      if (!token) continue;

      const contract = getContract({
        client,
        chain: base,
        address: token.address as `0x${string}`,
        abi: ERC20_ABI,
      });

      try {
        const decoded: any = await decodeFunctionData({
          contract,
          data: tx.data as `0x${string}`,
        });

        const [to, amount] = decoded.args as [string, bigint];
        const amountFormatted = Number(amount) / 1e18;

        const isSender =
          tx.from_address.toLowerCase() === userWallet.toLowerCase();
        const isReceiver = to.toLowerCase() === userWallet.toLowerCase();

        if (!isSender && !isReceiver) continue;

        const direction = isSender ? "send" : "receive";

        results.push({
          id: id++,
          type: direction,
          token: token.name,
          amount: amountFormatted,
          usdValue: amountFormatted,
          recipient: isSender ? to : undefined,
          sender: isReceiver ? tx.from_address : undefined,
          hash: tx.hash,
          date: tx.block_timestamp
            ? new Date(tx.block_timestamp * 1000).toISOString()
            : new Date().toISOString(),
          status: tx.block_timestamp ? "completed" : "pending",
        });
      } catch {
        continue;
      }
    }
    return results;
  } catch {
    return [];
  }
}
