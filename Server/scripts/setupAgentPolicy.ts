import { CdpClient } from "@coinbase/cdp-sdk";
import dotenv from "dotenv";
import path from "path";
import { contractAddress, USDCAddress, moonwellUSDCAddress } from "../Blockchain/Constants";

dotenv.config({ path: path.resolve(__dirname, "../.env") });

const cdpApiKeyId = process.env.CDP_API_KEY_ID;
const cdpApiKeySecret = process.env.CDP_API_KEY_SECRET;
const cdpWalletSecret = process.env.WALLET_SECRET;

if (!cdpApiKeyId || !cdpApiKeySecret || !cdpWalletSecret) {
    throw new Error("Missing CDP API credentials or WALLET_SECRET in .env");
}

const cdp = new CdpClient({
    apiKeyId: cdpApiKeyId,
    apiKeySecret: cdpApiKeySecret,
    walletSecret: cdpWalletSecret,
});

async function main() {
    console.log("Fetching Agent Wallet...");
    const agentAccount = await cdp.evm.getOrCreateAccount({ name: "AgentWallet" });

    // Check if an account-level policy already exists
    // (There is no direct list endpoint for a single account, so we try to create it)
    console.log(`Setting up strict allowlist policy for Agent Wallet ${agentAccount.address}...`);

    try {
        const newPolicy = await cdp.policies.createPolicy({
            policy: {
                scope: "account",
                description: "Allowlist only Chama, USDC, and Moonwell contracts",
                rules: [
                    {
                        action: "accept",
                        operation: "signEvmTransaction",
                        criteria: [
                            {
                                type: "evmAddress",
                                addresses: [contractAddress, USDCAddress, moonwellUSDCAddress],
                                operator: "in",
                            },
                        ],
                    }
                ],
            }
        });
        console.log(`Successfully created Account-Level policy: ${newPolicy.id}`);
        
        await cdp.evm.updateAccount({
            address: agentAccount.address,
            update: {
                accountPolicy: newPolicy.id
            }
        });
        console.log("Agent Wallet is now locked down to only interact with allowed smart contracts.");
    } catch (error: any) {
        if (error.message && error.message.includes("already exists")) {
            console.log("An account-level policy already exists for this wallet.");
        } else {
            console.error("Error setting up policy:", error);
        }
    }
}

main().catch((error) => {
    console.error("Unhandled error:", error);
});
