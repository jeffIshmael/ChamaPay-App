// this file contains a function that returns the agent smart account
import dotenv from "dotenv";
import { createEIP7702SmartAccount } from "./EIP7702Client";

dotenv.config();

const agentWalletAddress = process.env.AGENT_WALLET;
if (!agentWalletAddress) {
    throw new Error("AGENT_WALLET is not set");
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