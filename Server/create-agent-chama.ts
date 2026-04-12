
import dotenv from "dotenv";
import { bcCreateChama } from "./Blockchain/WriteFunction";

dotenv.config();

async function createAgentChamaPrivate() {
    const agentPrivateKey = process.env.AGENT_PRIVATE_KEY as `0x${string}`;
    if (!agentPrivateKey) {
        throw new Error("AGENT_PRIVATE_KEY is not set");
    }

    console.log("Creating PRIVATE chama with Agent...");
    
    // Test parameters
    const chamaAmount = "0.01"; // Metadata only for private chama
    const duration = 86400n; // 1 day
    const startDate = BigInt(Math.floor(Date.now() / 1000) + 3600); // 1 hour from now
    const maxMembers = 10n;
    const isPublic = false; // PRIVATE CHAMA

    try {
        const txHash = await bcCreateChama(
            agentPrivateKey,
            chamaAmount,
            duration,
            startDate,
            maxMembers,
            isPublic
        );

        console.log("SUCCESS! Private Chama created by agent.");
        console.log("Transaction Hash:", txHash);
        console.log("Explorer URL:", `https://basescan.org/tx/${txHash}`);
    } catch (error) {
        console.error("FAILED to create private chama:", error);
    }
}

createAgentChamaPrivate().catch(console.error);
