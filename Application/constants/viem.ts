import { createPublicClient, http, erc20Abi } from "viem";
import { base } from "viem/chains";
import { usdcAddress } from "./contractAddress";

export const publicClient = createPublicClient({
  chain: base,
  transport: http(),
});

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

export async function getAllBalances(
  address: `0x${string}`
): Promise<AllBalances> {
  try {
    const value = await publicClient.readContract({
      address: usdcAddress as `0x${string}`,
      abi: erc20Abi,
      functionName: "balanceOf",
      args: [address],
    });

    const decimals = 6; // USDC has 6 decimals on Base

    const displayValue = (Number(value) / 10 ** decimals).toString();

    return {
      USDC: {
        chainId: base.id,
        decimals,
        displayValue,
        name: "USDC",
        symbol: "USDC",
        tokenAddress: usdcAddress,
        value,
      },
    };
  } catch (error) {
    console.error("Error fetching balance:", error);
    return {
      USDC: {
        chainId: base.id,
        decimals: 6,
        displayValue: "0",
        name: "USDC",
        symbol: "USDC",
        tokenAddress: usdcAddress,
        value: 0n,
      },
    };
  }
}
