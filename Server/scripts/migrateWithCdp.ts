import * as fs from "fs";
import * as path from "path";
import dotenv from "dotenv";
import { CdpClient } from "@coinbase/cdp-sdk";
import { createPublicClient, http, parseAbi } from "viem";
import { base } from "viem/chains";

dotenv.config();

const USDC_ADDRESS = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913";

async function main() {
    console.log("Starting CDP SDK Migration for EOAs...");
    
    if (!process.env.CDP_API_KEY_ID || !process.env.CDP_API_KEY_SECRET) {
        throw new Error("Missing CDP API Keys");
    }

    const cdp = new CdpClient({
        apiKeyId: process.env.CDP_API_KEY_ID,
        apiKeySecret: (process.env.CDP_API_KEY_SECRET as string).replace(/\\n/g, '\n'),
        walletSecret: process.env.WALLET_SECRET,
    });

    const publicClient = createPublicClient({
        chain: base,
        transport: http(process.env.RPC_URL || "https://mainnet.base.org"),
    });

    const usdcAbi = parseAbi(["function balanceOf(address owner) view returns (uint256)"]);

    const backupPath = path.join(__dirname, "../backups/migration_backup.json");
    if (!fs.existsSync(backupPath)) {
        console.log("No backup file found at", backupPath);
        return;
    }
    const backupData = JSON.parse(fs.readFileSync(backupPath, "utf-8"));

    const { PrismaClient } = require("@prisma/client");
    const prisma = new PrismaClient();
    
    // Map new CDP addresses
    for (const item of backupData) {
        const user = await prisma.user.findUnique({ where: { id: item.userId } });
        if (user && user.cdpWalletId) {
            item.newAddress = user.cdpWalletId;
        }
    }
    await prisma.$disconnect();

    for (const item of backupData) {
        if (!item.newAddress || !item.privateKey) continue;

        console.log(`\nProcessing User ${item.userId} (${item.email})`);
        
        try {
            // 1. Try to fetch existing account, or import the legacy EOA to CDP Server-Signer
            let account: any;
            try {
                account = await cdp.evm.getAccount({
                    address: item.oldAddress,
                });
                console.log(`  Fetched existing CDP account: ${account.address}`);
            } catch (e) {
                account = await cdp.evm.importAccount({ privateKey: item.privateKey });
                console.log(`  Imported to CDP: ${account.address}`);
            }
            
            // Get USDC Balance
            const usdcBalance = await publicClient.readContract({
                address: USDC_ADDRESS,
                abi: usdcAbi,
                functionName: "balanceOf",
                args: [account.address as `0x${string}`]
            });
            
            if (usdcBalance === 0n) {
                console.log(`  No USDC Balance. Skipping.`);
                continue;
            }

            console.log(`  Found ${usdcBalance} USDC. Sweeping using CDP Paymaster...`);

            // 2. Transfer using CDP Gas Sponsorship (Server-Signer Sponsorship)
            const transferTx = await (account as any).transfer({
                to: item.newAddress,
                amount: usdcBalance,
                token: USDC_ADDRESS,
                network: "base" as any
            });
            
            console.log(`  Sweep TX Hash: ${transferTx.transactionHash}`);
            console.log(`  Successfully swept via CDP!`);

        } catch (e: any) {
            console.error(`  Error sweeping user ${item.userId}:`, e?.message || e);
        }
    }

    console.log("\nAll Done!");
}

main().catch(console.error);
