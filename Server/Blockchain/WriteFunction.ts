// This file contains all the blockchain write functions

import { Hex, parseEther, parseUnits, createPublicClient, http } from "viem";
import { contractABI, contractAddress } from "./Constants";
import { createSmartAccount } from "./SmartAccount";
import { getAgentSmartWallet } from "./AgentWallet";
import { celo } from "viem/chains";

// create a public client
const publicClient = createPublicClient({
    chain: celo,
    transport: http()
})

// users functions
// function to create a chama
export const bcCreateChama = async (privateKey: `0x${string}`, chamaAmount: string, duration: number, startDate: number, maxMembers: number, isPublic: boolean) => {
    try {
        //change amount to wei
        const amountInWei = parseUnits(chamaAmount, 6);
        // create a smart account client
        const { smartAccountClient, eoa7702, isSmartAccountDeployed } = await createSmartAccount(privateKey);
        // We only have to add the authorization field if the EOA does not have the authorization code set
        const txHash = await smartAccountClient.writeContract({
            address: contractAddress,
            abi: contractABI,
            functionName: 'registerChama',
            args: [amountInWei, duration, startDate, maxMembers, isPublic],
            authorization: !isSmartAccountDeployed ? await eoa7702.signAuthorization({
                contractAddress: "0xe6Cae83BdE06E4c305530e199D7217f42808555B",
                chainId: celo.id,
            }) : undefined,
        });
        // we need to make sure that the tx has been added to the bockchain
        const transaction = await publicClient.waitForTransactionReceipt({
            hash: txHash,
        });
        if (!transaction) {
            throw new Error("unable to get the set payout order transaction");
        }
        return transaction.transactionHash;
    } catch (error) {
        console.error("Error creating chama:", error);
        throw error;
    }
}

// function to join a public chama
export const bcJoinPublicChama = async (privateKey: `0x${string}`, chamaBlockchainId: number, chamaAmount: string) => {
    try {
        // change amount to wei
        const amountInWei = parseUnits(chamaAmount, 6);
        const { smartAccountClient, eoa7702, isSmartAccountDeployed } = await createSmartAccount(privateKey);
        const hash = await smartAccountClient.writeContract({
            address: contractAddress,
            abi: contractABI,
            functionName: 'joinPublicChama',
            args: [chamaBlockchainId, amountInWei],
            authorization: !isSmartAccountDeployed ? await eoa7702.signAuthorization({
                contractAddress: "0xe6Cae83BdE06E4c305530e199D7217f42808555B",
                chainId: celo.id,
            }) : undefined,
        })
        const transaction = await publicClient.waitForTransactionReceipt({
            hash: hash,
        });
        if (!transaction) {
            throw new Error("unable to get the set payout order transaction");
        }
        return transaction.transactionHash;
    } catch (error) {
        console.error("Error joining chama:", error);
        throw error;
    }
}

// function to add member to private chama
export const bcAddMemberToPrivateChama = async (privateKey: `0x${string}`, chamaBlockchainId: number, memberAddress: string) => {
    try {
        const { smartAccountClient, eoa7702, isSmartAccountDeployed } = await createSmartAccount(privateKey);
        const hash = await smartAccountClient.writeContract({
            address: contractAddress,
            abi: contractABI,
            functionName: 'addMember',
            args: [memberAddress as `0x${string}`, chamaBlockchainId],
            authorization: !isSmartAccountDeployed ? await eoa7702.signAuthorization({
                contractAddress: "0xe6Cae83BdE06E4c305530e199D7217f42808555B",
                chainId: celo.id,
            }) : undefined,
        })
        const transaction = await publicClient.waitForTransactionReceipt({
            hash: hash,
        });
        if (!transaction) {
            throw new Error("unable to get the set payout order transaction");
        }
        return transaction.transactionHash;
    } catch (error) {
        console.error("Error adding member to private chama:", error);
        throw error;
    }
}

// function to deposit funds to a chama
export const bcDepositFundsToChama = async (privateKey: `0x${string}`, chamaBlockchainId: number, amount: string) => {
    try {
        // change amount to wei
        const amountInWei = parseUnits(amount, 6);
        const { smartAccountClient, eoa7702, isSmartAccountDeployed } = await createSmartAccount(privateKey);
        const hash = await smartAccountClient.writeContract({
            address: contractAddress,
            abi: contractABI,
            functionName: 'deposit',
            args: [chamaBlockchainId, amountInWei],
            authorization: !isSmartAccountDeployed ? await eoa7702.signAuthorization({
                contractAddress: "0xe6Cae83BdE06E4c305530e199D7217f42808555B",
                chainId: celo.id,
            }) : undefined,
        })
        const transaction = await publicClient.waitForTransactionReceipt({
            hash: hash,
        });
        if (!transaction) {
            throw new Error("unable to get the set payout order transaction");
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
        const { smartAccountClient, eoa7702, isSmartAccountDeployed } = await createSmartAccount(privateKey);
        const hash = await smartAccountClient.writeContract({
            address: contractAddress,
            abi: contractABI,
            functionName: 'deleteMember',
            args: [chamaBlockchainId, memberAddress as `0x${string}`],
            authorization: !isSmartAccountDeployed ? await eoa7702.signAuthorization({
                contractAddress: "0xe6Cae83BdE06E4c305530e199D7217f42808555B",
                chainId: celo.id,
            }) : undefined,
        })
        const transaction = await publicClient.waitForTransactionReceipt({
            hash: hash,
        });
        if (!transaction) {
            throw new Error("unable to get the set payout order transaction");
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
        const { smartAccountClient, eoa7702, isSmartAccountDeployed } = await createSmartAccount(privateKey);
        const hash = await smartAccountClient.writeContract({
            address: contractAddress,
            abi: contractABI,
            functionName: 'deleteChama',
            args: [chamaBlockchainId],
            authorization: !isSmartAccountDeployed ? await eoa7702.signAuthorization({
                contractAddress: "0xe6Cae83BdE06E4c305530e199D7217f42808555B",
                chainId: celo.id,
            }) : undefined,
        })
        const transaction = await publicClient.waitForTransactionReceipt({
            hash: hash,
        });
        if (!transaction) {
            throw new Error("unable to get the set payout order transaction");
        }
        return transaction.transactionHash;
    } catch (error) {
        console.error("Error deleting chama:", error);
        throw error;
    }
}

