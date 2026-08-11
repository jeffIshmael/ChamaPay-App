import { CdpClient } from "@coinbase/cdp-sdk";
import dotenv from "dotenv";
import path from "path";

// Load the Server-Signer credentials from .env
dotenv.config({ path: path.resolve(__dirname, "../.env") });

const cdpApiKeyId = process.env.CDP_API_KEY_ID;
const cdpApiKeySecret = process.env.CDP_API_KEY_SECRET;
const cdpWalletSecret = process.env.CDP_WALLET_SECRET ?? process.env.WALLET_SECRET;

if (!cdpApiKeyId || !cdpApiKeySecret || !cdpWalletSecret) {
    console.error("Missing CDP credentials in .env");
    process.exit(1);
}

const cdp = new CdpClient({
    apiKeyId: cdpApiKeyId,
    apiKeySecret: cdpApiKeySecret,
    walletSecret: cdpWalletSecret,
});

async function main() {
    try {
        console.log("Fetching existing policies...");
        const existingPolicies = await cdp.policies.listPolicies({ scope: "project" });
        
        let projectPolicyId;
        
        // Check if a project-level policy already exists
        if (existingPolicies.policies && existingPolicies.policies.length > 0) {
            projectPolicyId = existingPolicies.policies[0].id;
            console.log(`Found existing project policy: ${projectPolicyId}. Updating it...`);
            
            // Update the existing policy to block the sweeper
            await cdp.policies.updatePolicy({
                id: projectPolicyId,
                policy: {
                    description: "Global Policy Block known sweeper addresses",
                    rules: [
                        {
                            action: "reject",
                            operation: "signEvmTransaction",
                            criteria: [
                                {
                                    type: "evmAddress",
                                    addresses: ["0x6511204Da888F103156fe67980D27bc8307981e8"],
                                    operator: "in",
                                },
                            ],
                        }
                    ],
                }
            });
            console.log("Successfully updated the Project-Level policy to block the sweeper.");
            
        } else {
            console.log("No project policy found. Creating a new one...");
            const newPolicy = await cdp.policies.createPolicy({
                policy: {
                    scope: "project",
                    description: "Global Policy Block known sweeper addresses",
                    rules: [
                        {
                            action: "reject",
                            operation: "signEvmTransaction",
                            criteria: [
                                {
                                    type: "evmAddress",
                                    addresses: ["0x6511204Da888F103156fe67980D27bc8307981e8"],
                                    operator: "in",
                                },
                            ],
                        }
                    ],
                }
            });
            console.log(`Successfully created Project-Level policy: ${newPolicy.id}`);
        }

        console.log("\nSuccess! The sweeper address 0x6511204Da888F103156fe67980D27bc8307981e8 is now globally blocked for all wallets in this CDP project.");

    } catch (error) {
        console.error("Error setting up policies:", error);
    }
}

main();
