// this file contains all the blockchain read functions
import { createPublicClient, http } from 'viem'
import { celo } from 'viem/chains'
import { cUSDAddress, contractABI, USDCAddress, contractAddress } from './Constants'
import { erc20Abi } from 'viem'
 
const publicClient = createPublicClient({
  chain: celo,
  transport: http()
})

// getting cUSD and USDC balance
export const getTokenBalance = async (address: string) => {
    const [cUSDBalance, USDCBalance] = await Promise.all([
        publicClient.readContract({
            address: cUSDAddress,
            abi: erc20Abi,
            functionName: 'balanceOf',
            args: [address as `0x${string}`]
        }),
        publicClient.readContract({
            address: USDCAddress,
            abi: erc20Abi,
            functionName: 'balanceOf',
            args: [address as `0x${string}`]
        }),
    ]);
    return { cUSDBalance, USDCBalance };
}

// function to get a user's balance
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
