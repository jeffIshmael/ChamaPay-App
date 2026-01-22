// This file contains all the blockchain write functions

import { parseUnits, createPublicClient, http, encodeFunctionData } from "viem";
import { contractABI, contractAddress } from "./Constants";
import { createSmartAccount } from "./SmartAccount";
import { celo } from "viem/chains";

// create a public client
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
        console.log("the amount in wei", amountInWei);
        console.log("the duration", duration);
        console.log("the start date", startDate);
        console.log("the max members", maxMembers);
        console.log("the is public", isPublic);

        // create a smart account client
        const { smartAccountClient, eoa7702, isSmartAccountDeployed, publicClient } = await createSmartAccount(privateKey);

        // Encode the function call
        const callData = encodeFunctionData({
            abi: contractABI,
            functionName: 'registerChama',
            args: [amountInWei, duration, startDate, maxMembers, isPublic],
        });

        let txHash: `0x${string}`;

        // If not deployed, we need to include the authorization in the first transaction
        if (!isSmartAccountDeployed) {
            console.log("First transaction - signing authorization...");
            console.log("the eoa7702", eoa7702.address);

            // Get the current transaction count (nonce) for the EOA
            const nonce = await publicClient.getTransactionCount({
                address: eoa7702.address,
            });

            console.log("EOA nonce:", nonce);

            // Sign the authorization
            const authorization = await eoa7702.signAuthorization({
                contractAddress: "0xe6Cae83BdE06E4c305530e199D7217f42808555B",
                chainId: celo.id,
                nonce,
            });

            console.log("Authorization signed:", authorization);

            // Send transaction WITH authorization
            txHash = await smartAccountClient.sendTransaction({
                to: contractAddress as `0x${string}`,
                data: callData,
                value: BigInt(0),
                authorization, // Include the signed authorization
            });
        } else {
            console.log("Subsequent transaction - no authorization needed");

            // Send transaction WITHOUT authorization (already deployed)
            txHash = await smartAccountClient.sendTransaction({
                to: contractAddress as `0x${string}`,
                data: callData,
                value: BigInt(0),
            });
        }

        console.log("Transaction Hash:", txHash);

        // we need to make sure that the tx has been added to the blockchain
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
export const bcDepositFundsToChama = async (privateKey: `0x${string}`, chamaBlockchainId: bigint, amount: string) => {
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

