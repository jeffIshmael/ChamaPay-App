// this file contains erc20 functions to use
import { erc20Abi, parseUnits, createPublicClient, http } from "viem";
import { USDCAddress } from "./Constants";
import { EIP7702Client } from "./EIP7702Client";
import { createSmartAccount } from "./SmartAccount";
import { celo } from "viem/chains";

const publicClient = createPublicClient({
    chain: celo,
    transport: http()
})

// function for erc20 approve spending
export const approveTx = async (privateKey: `0x${string}`, amount: string, spender: `0x${string}`) => {
    try {
        //change amount to wei
        const amountInWei = parseUnits(amount, 6);
        const { smartAccountClient, safeSmartAccount } = await createSmartAccount(privateKey);
        const hash = await smartAccountClient.writeContract({
            address: USDCAddress,
            abi: erc20Abi,
            functionName: 'approve',
            args: [spender, amountInWei],
        })

        // Wait for transaction to be mined
        const transaction = await publicClient.waitForTransactionReceipt({hash});

        if (!transaction) {
            throw new Error("unable to approve spending.");
        }

        return transaction.transactionHash;
    } catch (error) {
        console.error("Error in approve tx:", error);
        throw error;
    }
}

// function for erc20 transfer
export const transferTx = async (privateKey: `0x${string}`, amount: string, recipient: `0x${string}`) => {
    try {
        //change amount to wei
        const amountInWei = parseUnits(amount, 6);

        const { smartAccountClient, safeSmartAccount } = await createSmartAccount(privateKey);
        const hash = await smartAccountClient.writeContract({
            address: USDCAddress,
            abi: erc20Abi,
            functionName: 'transfer',
            args: [recipient, amountInWei],
        })


        // Wait for transaction to be mined
        const transaction = await publicClient.waitForTransactionReceipt({hash});

        if (!transaction) {
            throw new Error("unable to transfer.");
        }

        return transaction.transactionHash;
    } catch (error) {
        console.error("Error in transfer tx:", error);
        throw error;
    }
}