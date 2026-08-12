// this file contains a function that returns the agent smart account
import dotenv from "dotenv";
import { createEIP7702SmartAccount } from "./EIP7702Client";

dotenv.config();

const agentWalletAddress = process.env.AGENT_WALLET;
if (!agentWalletAddress) {
    throw new Error("AGENT_WALLET is not set");
}

const treasuryWalletAddress = process.env.TREASURY_WALLET;
if (!treasuryWalletAddress) {
    throw new Error("TREASURY_WALLET is not set");
}

export const getAgentSmartWallet = async () => {
    try {
        const { smartAccountClient, safeSmartAccount, authorization } = await createEIP7702SmartAccount(agentWalletAddress);
        return { smartAccountClient, agentSmartWallet: safeSmartAccount, authorization };
    } catch (error) {
        console.error("Error getting agent wallet:", error);
        throw error;
    }
}

export const getTreasurySmartWallet = async () => {
    try {
        const { smartAccountClient, safeSmartAccount, authorization } = await createEIP7702SmartAccount(treasuryWalletAddress);
        return { smartAccountClient, treasurySmartWallet: safeSmartAccount, authorization };
    } catch (error) {
        console.error("Error getting treasury wallet:", error);
        throw error;
    }
}