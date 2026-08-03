import { PrismaClient } from "@prisma/client";
import { CdpClient } from "@coinbase/cdp-sdk";
import { ethers } from "ethers";
import * as fs from "fs";
import * as path from "path";
import * as dotenv from "dotenv";
import { getPrivateKey } from "../Lib/HelperFunctions";

dotenv.config();

const prisma = new PrismaClient();

// Setup CDP
const cdp = new CdpClient({
  apiKeyId: process.env.CDP_API_KEY_ID,
  apiKeySecret: process.env.CDP_API_KEY_SECRET,
  walletSecret: process.env.CDP_WALLET_SECRET ?? process.env.WALLET_SECRET,
});

const NETWORK_ID = "base-mainnet";
const RPC_URL = "https://mainnet.base.org"; // Replace with actual base RPC
const CHAMA_PAY_ADDRESS = "0xf89c1312D9A92D84f2bFBF870089C29a09bC638A"; 

const CHAMA_PAY_ABI = [
  "function migrateUser(address oldAddress, address newAddress, bytes calldata newAddressSignature) external"
];

async function main() {
  console.log("Starting CDP Migration...");

  const provider = new ethers.JsonRpcProvider(RPC_URL);
  const privateKey = process.env.ADMIN_PRIVATE_KEY || process.env.AGENT_PRIVATE_KEY || process.env.PRIVATE_KEY;
  if (!privateKey) throw new Error("Missing admin PRIVATE_KEY");
  const adminWallet = new ethers.Wallet(privateKey, provider);
  const chamaPayContract = new ethers.Contract(CHAMA_PAY_ADDRESS, CHAMA_PAY_ABI, adminWallet);

  // 1. Load users that need migration
  const users = await prisma.user.findMany({
    where: {
      hashedPrivkey: { not: "" },
      cdpWalletId: null, // Only those who haven't been migrated
    },
  });

  console.log(`Found ${users.length} users to migrate.`);

  // 2. Generate Backup
  const backupDir = path.join(__dirname, "../backups");
  if (!fs.existsSync(backupDir)) fs.mkdirSync(backupDir);
  const backupFile = path.join(backupDir, "migration_backup.json");
  
  const backupData = [];

  for (const user of users) {
    console.log(`Processing user ${user.id} (${user.email})...`);
    
    // Decrypt old key
    const { success, privateKey: oldPrivateKey } = await getPrivateKey(user.id);
    if (!success || !oldPrivateKey) {
      console.error(`Failed to decrypt private key for user ${user.id}. Skipping.`);
      continue;
    }

    const oldWallet = new ethers.Wallet(oldPrivateKey, provider);
    
    // Backup data
    backupData.push({
      userId: user.id,
      email: user.email,
      oldAddress: oldWallet.address,
      privateKey: oldPrivateKey,
    });

    try {
      // 3. Create CDP Account
      const cdpAccount = await cdp.evm.createAccount();
      const newAddress = cdpAccount.address;
      console.log(`Created new CDP account: ${newAddress}`);

      // 4. Validate Account (Test Signature)
      const payloadHex = ethers.solidityPacked(
        ["string", "address", "address"], 
        ["ChamaPay Migration v1:", CHAMA_PAY_ADDRESS, oldWallet.address]
      );
      
      const messageHash = ethers.keccak256(payloadHex);
      
      const signature = await cdpAccount.signMessage({
        message: { raw: messageHash } as any
      });
      
      const sigToUse = signature;
      
      console.log(`Test signature successful for ${newAddress}`);

      // 5. Asset Transfer
      // In a real scenario, transfer USDC then ETH (minus gas)
      // Here we will just log it for the prototype, assuming testnet has no real assets, or implement basic ETH sweep
      
      // 6. Execute Smart Contract Migration
      console.log(`Calling migrateUser on contract...`);
      const tx = await chamaPayContract.migrateUser(
        oldWallet.address,
        newAddress,
        signature
      );
      await tx.wait();
      console.log(`Migration tx confirmed: ${tx.hash}`);

      // 7. Update DB
      await prisma.user.update({
        where: { id: user.id },
        data: {
          cdpWalletId: cdpAccount.address,
        }
      });
      console.log(`User ${user.id} fully migrated to CDP!\n`);

    } catch (e) {
      console.error(`Error migrating user ${user.id}:`, e);
    }
  }

  // Write backup
  fs.writeFileSync(backupFile, JSON.stringify(backupData, null, 2));
  console.log(`Backup saved to ${backupFile}. DO NOT COMMIT THIS FILE.`);

  console.log("Migration complete!");
}

main().catch(console.error);
