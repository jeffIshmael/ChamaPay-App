// This file contains all the blockchain write functions

import { parseEther } from "viem";
import { contractABI, contractAddress } from "./Constants";
import { createSmartAccount } from "./SmartAccount";
import { getAgentSmartWallet } from "./AgentWallet";


// users functions
// function to create a chama
export  const bcCreateChama = async (privateKey: `0x${string}`,chamaAmount: string, duration: number, startDate: number, maxMembers: number, isPublic: boolean) => {
    try{
        //change amount to wei
        const amountInWei = parseEther(chamaAmount);
        // create a smart account client
        const { smartAccountClient, safeSmartAccount } = await createSmartAccount(privateKey);
        const hash = await smartAccountClient.writeContract({
            address: contractAddress,
            abi: contractABI,
            functionName: 'registerChama',
            args: [ amountInWei, duration, startDate, maxMembers, isPublic],
        })
        return hash;  
    } catch (error) {
        console.error("Error creating chama:", error);
        throw error;
    }
}

// function to join a public chama
export const bcJoinPublicChama = async (privateKey: `0x${string}`, chamaBlockchainId: number, chamaAmount: string) => {
    try{
        // change amount to wei
        const amountInWei = parseEther(chamaAmount);
        const { smartAccountClient, safeSmartAccount } = await createSmartAccount(privateKey);
        const hash = await smartAccountClient.writeContract({
            address: contractAddress,
            abi: contractABI,
            functionName: 'joinPublicChama',
            args: [chamaBlockchainId, amountInWei],
        })
        return hash;
    } catch (error) {
        console.error("Error joining chama:", error);
        throw error;
    }
}

// function to add member to private chama
export const bcAddMemberToPrivateChama = async (privateKey: `0x${string}`, chamaBlockchainId: number, memberAddress: string) => {
    try{
        const { smartAccountClient, safeSmartAccount } = await createSmartAccount(privateKey);
        const hash = await smartAccountClient.writeContract({
            address: contractAddress,
            abi: contractABI,
            functionName: 'addMember',
            args: [memberAddress as `0x${string}`, chamaBlockchainId],
        })
        return hash;
    } catch (error) {
        console.error("Error adding member to private chama:", error);
        throw error;
    }
}

// function to deposit funds to a chama
export const bcDepositFundsToChama = async (privateKey: `0x${string}`, chamaBlockchainId: number, amount: string) => {
    try{
        // change amount to wei
        const amountInWei = parseEther(amount);
        const { smartAccountClient, safeSmartAccount } = await createSmartAccount(privateKey);
        const hash = await smartAccountClient.writeContract({
            address: contractAddress,
            abi: contractABI,
            functionName: 'deposit',
            args: [chamaBlockchainId, amountInWei],
        })
        return hash;
    } catch (error) {
        console.error("Error depositing funds to chama:", error);
        throw error;
    }
}

// function to left a chama
export const bcLeaveChama = async (privateKey: `0x${string}`, memberAddress: string, chamaBlockchainId: number) => {
    try{
        const { smartAccountClient, safeSmartAccount } = await createSmartAccount(privateKey);
        const hash = await smartAccountClient.writeContract({
            address: contractAddress,
            abi: contractABI,
            functionName: 'deleteMember',
            args: [chamaBlockchainId, memberAddress as `0x${string}`],
        })
        return hash;
    } catch (error) {
        console.error("Error leaving chama:", error);
        throw error;
    }
}

// function to delete a chama
export const bcDeleteChama = async (privateKey: `0x${string}`, chamaBlockchainId: number) => {
    try{
        const { smartAccountClient, safeSmartAccount } = await createSmartAccount(privateKey);
        const hash = await smartAccountClient.writeContract({
            address: contractAddress,
            abi: contractABI,
            functionName: 'deleteChama',
            args: [chamaBlockchainId],
        })
        return hash;
    } catch (error) {
        console.error("Error deleting chama:", error);
        throw error;
    }
}


// agent functions
// function to set payout order
export const bcSetPayoutOrder = async (chamaBlockchainId: number, memberAddresses: string[]) => {
    try{
        const agentSmartAccountClient = await getAgentSmartWallet();
        const hash = await agentSmartAccountClient.writeContract({
            address: contractAddress,
            abi: contractABI,
            functionName: 'setPayoutOrder',
            args: [chamaBlockchainId, memberAddresses as unknown as `0x${string}`],
        })
        return hash;
    } catch (error) {
        console.error("Error setting payout order:", error);
        throw error;
    }
}

// function to add member to payout order
export const bcAddMemberToPayoutOrder = async (chamaBlockchainId: number, memberAddress: string) => {
    try{
        const agentSmartAccountClient = await getAgentSmartWallet();
        const hash = await agentSmartAccountClient.writeContract({
            address: contractAddress,
            abi: contractABI,
            functionName: 'addMemberToPayoutOrder',
            args: [chamaBlockchainId, memberAddress as `0x${string}`],
        })
        return hash;
    } catch (error) {
        console.error("Error adding member to payout order:", error);
        throw error;
    }
}

// function to process payout
export const bcProcessPayout = async (chamaBlockchainIds: number[]) => {
    try{
        const agentSmartAccountClient = await getAgentSmartWallet();
        const hash = await agentSmartAccountClient.writeContract({
            address: contractAddress,
            abi: contractABI,
            functionName: 'checkPayDate',
            args: [chamaBlockchainIds],
        })
        return hash;
    } catch (error) {
        console.error("Error processing payout:", error);
        throw error;
    }
}

