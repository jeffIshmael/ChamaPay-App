import { createThirdwebClient, getContract, Insight } from "thirdweb";
import { base, baseSepolia, celo } from "thirdweb/chains";
import { Abi, decodeFunctionData } from "thirdweb/utils";
import { getWalletBalance } from "thirdweb/wallets";
import { chamapayContractAddress, cUSDAddress, usdcAddress } from "./contractAddress";

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
  cUSD: {
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
const clientId = process.env.EXPO_PUBLIC_THIRDWEB_CLIENT_ID!;
const secretKey = process.env.EXPO_PUBLIC_THIRDWEB_SECRET_KEY!;

if (!clientId || !secretKey) {
  throw new Error(
    "❌ Missing EXPO_PUBLIC_THIRDWEB_CLIENT_ID or EXPO_PUBLIC_THIRDWEB_SECRET_KEY in .env"
  );
}

// Initialize the Thirdweb client
export const client = createThirdwebClient({
  clientId,
  secretKey,
});

// Set your primary chain (Celo)
export const chain = celo;

// Example contracts
export const contract = getContract({
  client,
  address: "0x82e50a6BF13A70366eDFC871f8FB8a428C43Dc03",
  chain: baseSepolia,
});

export const usdcContract = getContract({
  address: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
  chain: base,
  client,
});

export const chamapayContract = getContract({
  address: chamapayContractAddress,
  chain: celo,
  client,
});

//  Function to get wallet balances
export async function getAllBalances(address: string): Promise<AllBalances> {
  const [cUSDBalance, USDCBalance] = await Promise.all([
    getWalletBalance({
      address,
      client,
      chain,
      tokenAddress: cUSDAddress,
    }),
    getWalletBalance({
      address,
      client,
      chain,
      tokenAddress: usdcAddress,
    }),
  ]);

  return {
    cUSD: cUSDBalance,
    USDC: USDCBalance,
  };
}

// --- Token constants ---
const TOKENS = {
  cUSD: {
    name: "cUSD",
    address: cUSDAddress ,
  },
  // USDC: {
  //   name: "USDC",
  //   address: usdcAddress ,
  // },
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
      chains: [celo],
    });

    const results = [];
    let id = 1;

    for (const tx of transactions) {
      if (tx.function_selector !== "0xa9059cbb") continue;

      const token = Object.values(TOKENS).find(
        (t) => t.address.toLowerCase() === tx.to_address.toLowerCase()
      );
      if(tx.hash === "0x0d87b0faae6f72658155096eca5f55cefbef0d31edf6245babea934aeb01aba7"){
        console.log("you looking for this",tx);
      }
      if (!token) continue;

      // ✅ Create contract instance
      const contract = getContract({
        client,
        chain: celo,
        address: token.address as `0x${string}`,
        abi: ERC20_ABI,
      });

      try {
        // ✅ Decode function data correctly
        const decoded: any = await decodeFunctionData({
          contract,
          data: tx.data as `0x${string}`,
        });

        console.log("deoed", decoded);
        console.log(tx.hash);

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
      } catch (err) {
        console.warn("Decode failed for tx:", tx.hash, err);
      }
    }
    console.log("the transfers results", results);

    return results;
  } catch (error) {
    console.error("Error fetching transfers:", error);
    return [];
  }
}

