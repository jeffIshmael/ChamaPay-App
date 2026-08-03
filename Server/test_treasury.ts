import { CdpClient } from "@coinbase/cdp-sdk";
import dotenv from "dotenv";
import { privateKeyToAccount } from "viem/accounts";

dotenv.config();

async function main() {
    const agentPrivateKey = process.env.AGENT_PRIVATE_KEY;
    const cdpApiKeyId = process.env.CDP_API_KEY_ID;
    const cdpApiKeySecret = process.env.CDP_API_KEY_SECRET;
    const cdpWalletSecret = process.env.CDP_WALLET_SECRET ?? process.env.WALLET_SECRET;

    const account = privateKeyToAccount(agentPrivateKey as `0x${string}`);
    console.log("Agent Address:", account.address);

    const cdp = new CdpClient({
        apiKeyId: cdpApiKeyId!,
        apiKeySecret: cdpApiKeySecret!,
        walletSecret: cdpWalletSecret!,
    });

    try {
        const cdpAccount = await cdp.evm.getAccount({ address: account.address });
        console.log("Found in CDP:", cdpAccount.address);
    } catch (e) {
        console.log("Not found in CDP. Importing...");
        try {
            const imported = await cdp.evm.importAccount({
                privateKey: agentPrivateKey as `0x${string}`,
                name: `treasury-${account.address.slice(2, 10).toLowerCase()}`
            });
            console.log("Successfully imported:", imported.address);
        } catch (importErr) {
            console.error("Failed to import:", importErr);
        }
    }
}
main();
