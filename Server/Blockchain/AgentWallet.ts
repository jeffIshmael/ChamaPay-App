// this file contains a functiomn that return the agent account and agent smart account
import dotenv from "dotenv";
import { privateKeyToAccount } from "viem/accounts";
import { createSmartAccount } from "./SmartAccount";

dotenv.config();

const agentPrivateKey = process.env.AGENT_PRIVATE_KEY;
if (!agentPrivateKey) {
    throw new Error("AGENT_PRIVATE_KEY is not set");
}

export const getAgentSmartWallet = async () => {
    try{
        const { smartAccountClient, safeSmartAccount } = await createSmartAccount(agentPrivateKey as `0x${string}`);
        console.log("the account address is", safeSmartAccount, safeSmartAccount.address)
        return smartAccountClient;
    } catch (error) {
        console.error("Error getting agent wallet:", error);
        throw error;
    }
}

// normal agent account
export const normalAgentAccount = async () => {
    try{
        const normalAccount = await privateKeyToAccount(agentPrivateKey as `0x${string}`);
        return normalAccount;
    } catch (error) {
        console.error("Error getting normal account:", error);
        throw error;
    }
}