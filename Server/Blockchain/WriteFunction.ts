// This file contains all the blockchain write functions

import { parseEther, parseUnits, createPublicClient, http } from "viem";
import { contractABI, contractAddress } from "./Constants";
import { createSmartAccount } from "./SmartAccount";
import { getAgentSmartWallet } from "./AgentWallet";
import { celo } from "viem/chains";

const publicClient = createPublicClient({
    chain: celo,
    transport: http()
})

// users functions
// function to create a chama
export const bcCreateChama = async (privateKey: `0x${string}`, chamaAmount: string, duration: bigint, startDate: bigint, maxMembers: bigint, isPublic: boolean) => {
    try {
        //change amount to wei
        const amountInWei = parseUnits(chamaAmount, 6);
        // create a smart account client
        const { smartAccountClient, safeSmartAccount } = await createSmartAccount(privateKey);
        const hash = await smartAccountClient.writeContract({
            address: contractAddress,
            abi: contractABI,
            functionName: 'registerChama',
            args: [amountInWei, duration, startDate, maxMembers, isPublic],
        });
        const transaction = await publicClient.waitForTransactionReceipt({
            hash: hash
        });
        if (!transaction) {
            throw new Error("Unable to create chama onchain.");
        }
        return transaction.transactionHash;
    } catch (error) {
        console.error("Error creating chama:", error);
        throw error;
    }
}

// function to join a public chama
export const bcJoinPublicChama = async (privateKey: `0x${string}`, chamaBlockchainId: bigint, chamaAmount: string) => {
    try {
        // change amount to wei
        const amountInWei = parseUnits(chamaAmount, 6);
        const { smartAccountClient, safeSmartAccount } = await createSmartAccount(privateKey);
        const hash = await smartAccountClient.writeContract({
            address: contractAddress,
            abi: contractABI,
            functionName: 'addPublicMember',
            args: [chamaBlockchainId, amountInWei],
        })
        const transaction = await publicClient.waitForTransactionReceipt({
            hash: hash
        });
        if (!transaction) {
            throw new Error("Unable to join public chama onchain.");
        }
        return transaction.transactionHash;
    } catch (error) {
        console.error("Error joining public chama:", error);
        throw error;
    }
}

// function to add member to private chama
export const bcAddMemberToPrivateChama = async (privateKey: `0x${string}`, chamaBlockchainId: bigint, memberAddress: string) => {
    try {
        const { smartAccountClient, safeSmartAccount } = await createSmartAccount(privateKey);
        const hash = await smartAccountClient.writeContract({
            address: contractAddress,
            abi: contractABI,
            functionName: 'addMember',
            args: [memberAddress as `0x${string}`, chamaBlockchainId],
        })
        const transaction = await publicClient.waitForTransactionReceipt({
            hash: hash
        });
        if (!transaction) {
            throw new Error("Unable to add member to private chama onchain.");
        }
        return transaction.transactionHash;
    } catch (error) {
        console.error("Error adding member to private chama:", error);
        throw error;
    }
}

// function to deposit funds to a chama
export const bcDepositFundsToChama = async (privateKey: `0x${string}`, chamaBlockchainId: bigint, amount: string) => {
    try {
        // change amount to wei
        const amountInWei = parseUnits(amount, 6);
        const { smartAccountClient, safeSmartAccount } = await createSmartAccount(privateKey);
        const hash = await smartAccountClient.writeContract({
            address: contractAddress,
            abi: contractABI,
            functionName: 'depositCash',
            args: [chamaBlockchainId, amountInWei],
        })
        const transaction = await publicClient.waitForTransactionReceipt({
            hash: hash
        });
        if (!transaction) {
            throw new Error("Unable to deposit funds to chama onchain.");
        }
        return transaction.transactionHash;
    } catch (error) {
        console.error("Error depositing funds to chama:", error);
        throw error;
    }
}

// function to left a chama
export const bcLeaveChama = async (privateKey: `0x${string}`, memberAddress: string, chamaBlockchainId: number) => {
    try {
        const { smartAccountClient, safeSmartAccount } = await createSmartAccount(privateKey);
        const hash = await smartAccountClient.writeContract({
            address: contractAddress,
            abi: contractABI,
            functionName: 'deleteMember',
            args: [chamaBlockchainId, memberAddress as `0x${string}`],
        })
        const transaction = await publicClient.waitForTransactionReceipt({
            hash: hash
        });
        if (!transaction) {
            throw new Error("Unable to leave chama onchain.");
        }
        return transaction.transactionHash;
    } catch (error) {
        console.error("Error leaving chama:", error);
        throw error;
    }
}

// function to delete a chama
export const bcDeleteChama = async (privateKey: `0x${string}`, chamaBlockchainId: number) => {
    try {
        const { smartAccountClient, safeSmartAccount } = await createSmartAccount(privateKey);
        const hash = await smartAccountClient.writeContract({
            address: contractAddress,
            abi: contractABI,
            functionName: 'deleteChama',
            args: [chamaBlockchainId],
        })
        const transaction = await publicClient.waitForTransactionReceipt({
            hash: hash
        });
        if (!transaction) {
            throw new Error("Unable to delete chama onchain.");
        }
        return transaction.transactionHash;
    } catch (error) {
        console.error("Error deleting chama:", error);
        throw error;
    }
}

// function to withdraw funds from a chama
export const bcWithdrawFundsFromChama = async (privateKey: `0x${string}`, chamaBlockchainId: number, amount: string) => {
    try {
        // change amount to wei
        const amountInWei = parseUnits(amount, 6);
        const bigIntChamaBlockchainId = BigInt(chamaBlockchainId);
        const { smartAccountClient, safeSmartAccount } = await createSmartAccount(privateKey);
        const hash = await smartAccountClient.writeContract({
            address: contractAddress,
            abi: contractABI,
            functionName: 'withdrawBalance',
            args: [bigIntChamaBlockchainId, amountInWei],
        })
        const transaction = await publicClient.waitForTransactionReceipt({
            hash: hash
        });
        if (!transaction) {
            throw new Error("Unable to withdraw funds from chama onchain.");
        }
        return transaction.transactionHash;
    } catch (error) {
        console.error("Error withdrawing funds from chama:", error);
        throw error;
    }
}

// function to add locked funds to a chama
export const bcAddLockedFundsToChama = async (privateKey: `0x${string}`,memberAddress: `0x${string}`, chamaBlockchainId: number, amount: string) => {
    try {
        // change amount to wei
        const amountInWei = parseUnits(amount, 6);
        const { smartAccountClient, safeSmartAccount } = await createSmartAccount(privateKey);
        const hash = await smartAccountClient.writeContract({
            address: contractAddress,
            abi: contractABI,
            functionName: 'updateLockedAmount',
            args: [memberAddress,chamaBlockchainId, amountInWei],
        })
        const transaction = await publicClient.waitForTransactionReceipt({
            hash: hash
        });
        if (!transaction) {
            throw new Error("Unable to add locked funds to chama onchain.");
        }
        return transaction.transactionHash;
    } catch (error) {
        console.error("Error adding locked funds to chama:", error);
        throw error;
    }
}

