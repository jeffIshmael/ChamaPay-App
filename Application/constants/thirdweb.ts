import { createThirdwebClient, getContract } from "thirdweb";
import { base, baseSepolia, celo } from "thirdweb/chains";
import { getWalletBalance } from "thirdweb/wallets";
import { cUSDAddress, usdcAddress, chamapayContractAddress } from "./contractAddress";


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

const clientId = process.env.EXPO_PUBLIC_THIRDWEB_CLIENT_ID!;
const secretKey = process.env.EXPO_PUBLIC_THIRDWEB_SECRET_KEY!;

if (!clientId || !secretKey) {
  throw new Error(
    "Missing EXPO_PUBLIC_THIRDWEB_CLIENT_ID - make sure to set it in your .env file"
  );
}

export const client = createThirdwebClient({
  clientId,
  secretKey,
});

export const chain = celo;

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

// function to return the balances
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

// chamapay smart contract
export const chamapayContract = getContract({
    address: chamapayContractAddress,
    chain: celo,
    client,
  });
