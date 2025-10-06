import { createThirdwebClient, getContract } from "thirdweb";
import { base, baseSepolia, celo } from "thirdweb/chains";
import { getWalletBalance } from "thirdweb/wallets";
import { cUSDAddress, usdcAddress, chamapayContractAddress } from "./contractAddress";

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

//  EXPORT a single config object 
export const config = {
  client,
  chain,
};
