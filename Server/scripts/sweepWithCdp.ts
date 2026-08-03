import * as fs from "fs";
import * as path from "path";
import dotenv from "dotenv";
import { createPublicClient, http, parseAbi } from "viem";
import { base } from "viem/chains";
import { createCDPSmartAccount } from "../Blockchain/CDPEIP7702Client";
import { USDCAddress } from "../Blockchain/Constants";

dotenv.config();

async function main() {
    console.log("Starting Gasless Sweep using CDP EIP-7702...");

    const publicClient = createPublicClient({
        chain: base,
        transport: http(process.env.RPC_URL || "https://mainnet.base.org", { timeout: 10_000 }),
    });

    const usdcAbi = parseAbi([
        "function balanceOf(address owner) view returns (uint256)",
        "function transfer(address to, uint256 amount) returns (bool)"
    ]);

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
            // 1. Create EIP-7702 Smart Account client (this handles the delegation and gets the smart account)
            console.log(`  Initializing EIP-7702 Smart Account...`);
            const { smartAccountClient, safeSmartAccount } = await createCDPSmartAccount(item.privateKey);
            const address = await safeSmartAccount.getAddress();
            console.log(`  Delegated Account: ${address}`);
            
            // 2. Get USDC Balance
            const usdcBalance = await publicClient.readContract({
                address: USDCAddress as `0x${string}`,
                abi: usdcAbi,
                functionName: "balanceOf",
                args: [address as `0x${string}`]
            });
            
            if (usdcBalance === 0n) {
                console.log(`  No USDC Balance. Skipping.`);
                continue;
            }

            console.log(`  Found ${usdcBalance} USDC. Sweeping using CDP Paymaster...`);

            // 3. Transfer using sendTransaction (which internally uses sendUserOperation via Paymaster)
            const txHash = await smartAccountClient.writeContract({
                address: USDCAddress as `0x${string}`,
                abi: usdcAbi,
                functionName: 'transfer',
                args: [item.newAddress as `0x${string}`, usdcBalance]
            });
            
            console.log(`  Sweep TX Hash: ${txHash}`);
            console.log(`  Successfully swept via CDP EIP-7702!`);

        } catch (e: any) {
            console.error(`  Error sweeping user ${item.userId}:`, e?.message || e);
        }
    }

    console.log("\nAll Done!");
}

main().catch(console.error);
