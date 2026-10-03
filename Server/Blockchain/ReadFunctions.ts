// this file contains all the blockchain read functions
import { getBasePublicClient } from './baseRpc' // ADJUST THIS PATH to wherever baseRpc.ts lives
import { contractABI, USDCAddress, contractAddress, goalContractAddress, goalContractABI } from './Constants'
import { erc20Abi } from 'viem'

// shared client: same RPC endpoints, fallback and batching as the rest of the backend
const publicClient = getBasePublicClient()

// function to get a user's chama balance
export const getUserChamaBalance = async (memberAddress: string, chamaBlockchainId: bigint) => {
    const balance = await publicClient.readContract({
        address: contractAddress,
        abi: contractABI,
        functionName: 'getBalance',
        args: [chamaBlockchainId, memberAddress as `0x${string}`]
    });
    return balance;
}

// function to get the balance of all the members in a chama
export const getEachMemberBalance = async (chamaBlockchainId: bigint) => {
    const membersBalance = await publicClient.readContract({
        address: contractAddress,
        abi: contractABI,
        functionName: 'getEachMemberBalance',
        args: [chamaBlockchainId]
    });
    return membersBalance;
}

// function to get a chama payout order
export const bcGetChamaPayoutOrder = async (chamaBlockchainId: number) => {
    const payoutOrder = await publicClient.readContract({
        address: contractAddress,
        abi: contractABI,
        functionName: 'getChamaPayoutOrder',
        args: [chamaBlockchainId]
    });
    return payoutOrder;
}

// function to check if all members have contributed
export const bcCheckIfAllMembersHaveContributed = async (chamaBlockchainId: number) => {
    const allMembersHaveContributed = await publicClient.readContract({
        address: contractAddress,
        abi: contractABI,
        functionName: 'checkAllMembersContributed',
        args: [chamaBlockchainId]
    });
    return allMembersHaveContributed;
}

// function to get the total chamas
export const bcGetTotalChamas = async () => {
    const totalChamas = await publicClient.readContract({
        address: contractAddress,
        abi: contractABI,
        functionName: 'totalChamas',
        args: []
    }) as bigint;
    return totalChamas.toString();
}

export const bcGetTotalGoals = async () => {
    const totalGoals = await publicClient.readContract({
        address: goalContractAddress as `0x${string}`,
        abi: goalContractABI,
        functionName: "totalGoals",
        args: [],
    }) as bigint;
    return totalGoals.toString();
};

export const bcGetGoalFinance = async (goalId: bigint) => {
    const finance = await publicClient.readContract({
        address: goalContractAddress as `0x${string}`,
        abi: goalContractABI,
        functionName: "getGoalFinance",
        args: [goalId],
    });
    return finance;
};

// function to get user balance
export const getUserBalance = async (memberAddress: string) => {
    const balance = await publicClient.readContract({
        address: USDCAddress,
        abi: erc20Abi,
        functionName: 'balanceOf',
        args: [memberAddress as `0x${string}`]
    });
    return balance;
}