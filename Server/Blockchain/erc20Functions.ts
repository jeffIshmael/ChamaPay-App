import {
  erc20Abi,
  parseUnits,
  createPublicClient,
  http,
  encodeFunctionData,
} from "viem";
import { USDCAddress, builderCodeDataSuffix } from "./Constants";
import { createEIP7702SmartAccount } from "./EIP7702Client";
import { base } from "viem/chains";
import dotenv from "dotenv";
dotenv.config();

const publicClient = createPublicClient({
  chain: base,
  transport: http(),
});

const treasuryWallet = process.env.TREASURY_WALLET as `0x${string}`;

if (!treasuryWallet) {
  throw new Error("treasury wallet not set.");
}

export const approveTx = async (
  cdpWalletId: string,
  amount: string,
  spender: `0x${string}`,
) => {
  try {
    const amountInWei = parseUnits(amount, 6);
    const { smartAccountClient, authorization } =
      await createEIP7702SmartAccount(cdpWalletId);

    const hash = await smartAccountClient.writeContract({
      address: USDCAddress,
      abi: erc20Abi,
      functionName: "approve",
      args: [spender, amountInWei],
      dataSuffix: builderCodeDataSuffix,
      ...(authorization ? { authorization } : {}),
    });

    const transaction = await publicClient.waitForTransactionReceipt({ hash });
    if (!transaction) throw new Error("Unable to approve spending.");
    return transaction.transactionHash;
  } catch (error) {
    console.error("Error in approve tx:", error);
    throw error;
  }
};

export const transferTx = async (
  cdpWalletId: string,
  amount: string,
  recipient: `0x${string}`,
) => {
  try {
    const amountInWei = parseUnits(amount, 6);
    const { smartAccountClient, authorization } =
      await createEIP7702SmartAccount(cdpWalletId);

    const hash = await smartAccountClient.writeContract({
      address: USDCAddress,
      abi: erc20Abi,
      functionName: "transfer",
      args: [recipient, amountInWei],
      dataSuffix: builderCodeDataSuffix,
      ...(authorization ? { authorization } : {}),
    });

    const transaction = await publicClient.waitForTransactionReceipt({ hash });
    if (!transaction) throw new Error("Unable to transfer.");
    return transaction.transactionHash;
  } catch (error) {
    console.error("Error in transfer tx:", error);
    throw error;
  }
};

// function to transfer with fee
export const transferWithFeeTx = async (
  cdpWalletId: string,
  amount: string,
  recipient: `0x${string}`,
  fee: string,
) => {
  try {
    const amountInWei = parseUnits(amount, 6);
    const feeInWei = parseUnits(fee, 6);
    if (amountInWei <= 0n) throw new Error("Invalid amount");
    if (feeInWei < 0n) throw new Error("Invalid fee");

    const balance = await publicClient.readContract({
      address: USDCAddress,
      abi: erc20Abi,
      functionName: "balanceOf",
      args: [cdpWalletId as `0x${string}`],
    });
    if (balance < amountInWei + feeInWei) throw new Error("INSUFFICIENT_BALANCE");
    const { smartAccountClient, authorization } =
      await createEIP7702SmartAccount(cdpWalletId);

    const usdc = USDCAddress as `0x${string}`;
    const calls: { to: `0x${string}`; data: `0x${string}` }[] = [
      {
        to: usdc,
        data: encodeFunctionData({
          abi: erc20Abi,
          functionName: "transfer",
          args: [recipient, amountInWei],
        }),
      },
    ];
    // A break-even withdrawal has a zero fee: send nothing to the treasury instead of a
    // pointless 0-USDC transfer (extra gas, and one more call that can fail).
    if (feeInWei > 0n) {
      calls.push({
        to: usdc,
        data: encodeFunctionData({
          abi: erc20Abi,
          functionName: "transfer",
          args: [treasuryWallet, feeInWei],
        }),
      });
    }

    const hash = await smartAccountClient.sendTransaction({
      calls,
      ...(authorization ? { authorization } : {}),
    });

    const transaction = await publicClient.waitForTransactionReceipt({ hash });
    if (!transaction) throw new Error("Unable to transfer with fee.");
    return transaction.transactionHash;
  } catch (error) {
    console.error("Error in transfer with fee tx:", error);
    throw error;
  }
};