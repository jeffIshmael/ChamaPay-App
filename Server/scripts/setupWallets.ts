import { CdpClient } from "@coinbase/cdp-sdk";
import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.resolve(__dirname, "../.env") });

const cdpApiKeyId = process.env.CDP_API_KEY_ID;
const cdpApiKeySecret = process.env.CDP_API_KEY_SECRET;
const cdpWalletSecret = process.env.WALLET_SECRET; // from .env

if (!cdpApiKeyId || !cdpApiKeySecret || !cdpWalletSecret) {
    throw new Error("Missing CDP API credentials or WALLET_SECRET in .env");
}

const cdp = new CdpClient({
    apiKeyId: cdpApiKeyId,
    apiKeySecret: cdpApiKeySecret,
    walletSecret: cdpWalletSecret,
});

async function main() {
    console.log("Fetching or creating Treasury Wallet...");
    // getOrCreateAccount uses the CDP_WALLET_SECRET under the hood
    const treasuryAccount = await cdp.evm.getOrCreateAccount({ name: "TreasuryWallet" });
    const treasuryAddress = treasuryAccount.address;
    console.log(`✅ Treasury Wallet Address: ${treasuryAddress}`);

    console.log("Fetching or creating Agent Wallet...");
    const agentAccount = await cdp.evm.getOrCreateAccount({ name: "AgentWallet" });
    const agentAddress = agentAccount.address;
    console.log(`✅ Agent Wallet Address: ${agentAddress}`);

    console.log("\n=======================================");
    console.log("🎉 SUCCESS: Wallets created/fetched.");
    console.log("Please update your Server/.env with the following:");
    console.log("---------------------------------------");
    console.log(`TREASURY_WALLET=${treasuryAddress}`);
    console.log(`AGENT_WALLET=${agentAddress}`);
    console.log("---------------------------------------");
    console.log("You can safely delete PREV_PRIVATE_KEY and AGENT_PRIVATE_KEY from .env.");
    console.log("=======================================\n");
}

main().catch((error) => {
    console.error("Error setting up wallets:", error);
});
