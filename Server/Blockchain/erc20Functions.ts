// this file contains erc20 functions to use
import { erc20Abi, parseUnits } from "viem";
import { USDCAddress } from "./Constants";
import { EIP7702Client } from "./EIP7702Client";
import { createSmartAccount } from "./SmartAccount";

// function for erc20 approve spending
export const approveTx = async (privateKey: `0x${string}`, amount: string, spender: `0x${string}`) => {
    try {
        //change amount to wei
        const amountInWei = parseUnits(amount, 6);

        // create EIP-7702 smart account client
        const { smartAccountClient } = await createSmartAccount(privateKey);

        // Encode the approve call
        const callData = EIP7702Client.encodeCallData(
            erc20Abi,
            'approve',
            [spender, amountInWei]
        );

        // Send transaction (authorization handled automatically)
        const txHash = await smartAccountClient.sendTransaction({
            to: USDCAddress,
            data: callData,
        });

        // Wait for transaction to be mined
        const transaction = await smartAccountClient.waitForTransaction(txHash);

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

        // create EIP-7702 smart account client
        const { smartAccountClient } = await createSmartAccount(privateKey);

        // Encode the transfer call
        const callData = EIP7702Client.encodeCallData(
            erc20Abi,
            'transfer',
            [recipient, amountInWei]
        );

        // Send transaction (authorization handled automatically)
        const txHash = await smartAccountClient.sendTransaction({
            to: USDCAddress,
            data: callData,
        });

        // Wait for transaction to be mined
        const transaction = await smartAccountClient.waitForTransaction(txHash);

        if (!transaction) {
            throw new Error("unable to transfer.");
        }

        return transaction.transactionHash;
    } catch (error) {
        console.error("Error in transfer tx:", error);
        throw error;
    }
}