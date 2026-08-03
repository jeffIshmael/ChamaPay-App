/**
 * Server/scripts/migrateToCdp.ts
 * ------------------------------------------------------------
 * Migrates existing ChamaPay users from backend-held EOA private
 * keys to CDP Server Wallets (v2 SDK), and updates on-chain state
 * via ChamaPay.sol's migrateUser() function.
 *
 * DESIGN NOTES
 * - Uses CDP SDK v2 (`cdp.evm.createAccount`) — NOT the deprecated
 *   v1 `Wallet.create()`, which Coinbase is sunsetting Feb 2026.
 * - Idempotent & resumable: each user has a `migrationStatus` field
 *   in the DB. Re-running this script after a crash picks up where
 *   it left off, per user, instead of re-doing completed steps.
 * - Per-user atomic: each user progresses through
 *   PENDING -> WALLET_CREATED -> ASSETS_TRANSFERRED ->
 *   CONTRACT_MIGRATED -> COMPLETED, persisting after every step.
 * - Does NOT batch-transfer-then-batch-migrate. One user is fully
 *   finished before moving to the next, so a mid-run failure never
 *   leaves the whole user base in a mixed state.
 * - Assumes deposits/withdrawals are FROZEN app-wide (or at minimum
 *   for the active chama) for the duration of this run. Add that
 *   flag flip before invoking this script — not handled here.
 *
 * PRE-REQUISITE: add to schema.prisma
 *   enum MigrationStatus {
 *     PENDING
 *     WALLET_CREATED
 *     ASSETS_TRANSFERRED
 *     CONTRACT_MIGRATED
 *     COMPLETED
 *   }
 *   model User {
 *     ...
 *     migrationStatus     MigrationStatus @default(PENDING)
 *     cdpWalletId         String?
 *     cdpAddress          String?
 *     // only remove these two AFTER migration is fully verified:
 *     encryptedPrivkey    String?
 *     encryptedPassphrase String?
 *   }
 * ------------------------------------------------------------
 */

import { CdpClient } from "@coinbase/cdp-sdk";
import { PrismaClient } from "@prisma/client";
import {
  createPublicClient,
  createWalletClient,
  http,
  parseUnits,
  formatUnits,
  keccak256,
  encodePacked,
  erc20Abi,
} from "viem";
import { base } from "viem/chains"; // swap to baseSepolia for the testnet dry run
import { privateKeyToAccount } from "viem/accounts";
import { decrypt } from "../Lib/crypto"; // your existing reversible-encryption helper
                                          // CONFIRM this is genuinely reversible encryption,
                                          // not a one-way hash, before running.
import chamaPayAbi from "../abi/ChamaPay.json";

const prisma = new PrismaClient();
const cdp = new CdpClient();

const RPC_URL = process.env.RPC_URL!;
const CHAMAPAY_ADDRESS = process.env.CHAMAPAY_CONTRACT_ADDRESS as `0x${string}`;
const USDC_ADDRESS = process.env.USDC_ADDRESS as `0x${string}`;
const OWNER_PRIVATE_KEY = process.env.MIGRATION_OWNER_PRIVATE_KEY as `0x${string}`;
// ^ Ideally this is a multisig-controlled signer, not a raw single key.
// If you're using a Safe, swap this out for your Safe SDK signer instead.

const publicClient = createPublicClient({ chain: base, transport: http(RPC_URL) });
const ownerAccount = privateKeyToAccount(OWNER_PRIVATE_KEY);
const ownerWallet = createWalletClient({ account: ownerAccount, chain: base, transport: http(RPC_URL) });

const GAS_BUFFER_WEI = parseUnits("0.0003", 18); // leave dust in old wallet to cover the transfer tx itself

async function migrateSingleUser(user: {
  id: string;
  walletAddress: `0x${string}`;
  encryptedPrivkey: string | null;
  migrationStatus: string;
  cdpWalletId: string | null;
  cdpAddress: `0x${string}` | null;
}) {
  console.log(`\n--- User ${user.id} (${user.walletAddress}) — status: ${user.migrationStatus} ---`);

  // ---------- Step 1: create CDP wallet ----------
  let cdpAddress = user.cdpAddress;
  if (user.migrationStatus === "PENDING") {
    const account = await cdp.evm.createAccount({ name: `chamapay-${user.id}` });
    cdpAddress = account.address as `0x${string}`;

    await prisma.user.update({
      where: { id: user.id },
      data: { cdpWalletId: account.id, cdpAddress, migrationStatus: "WALLET_CREATED" },
    });
    console.log(`  \u2713 CDP wallet created: ${cdpAddress}`);
  }
  if (!cdpAddress) throw new Error(`User ${user.id} has no cdpAddress after wallet-creation step`);

  // ---------- Step 2: transfer USDC + ETH from old EOA to new CDP address ----------
  if (user.migrationStatus === "PENDING" || user.migrationStatus === "WALLET_CREATED") {
    if (!user.encryptedPrivkey) throw new Error(`User ${user.id} missing encryptedPrivkey — cannot transfer assets`);

    const oldAccount = privateKeyToAccount(decrypt(user.encryptedPrivkey) as `0x${string}`);
    const oldWallet = createWalletClient({ account: oldAccount, chain: base, transport: http(RPC_URL) });

    // sanity check: does the derived address match what's on file?
    if (oldAccount.address.toLowerCase() !== user.walletAddress.toLowerCase()) {
      throw new Error(
        `Key mismatch for user ${user.id}: derived ${oldAccount.address} != recorded ${user.walletAddress}. Aborting.`
      );
    }

    const usdcBalance = await publicClient.readContract({
      address: USDC_ADDRESS,
      abi: erc20Abi,
      functionName: "balanceOf",
      args: [oldAccount.address],
    });

    if (usdcBalance > 0n) {
      const hash = await oldWallet.writeContract({
        address: USDC_ADDRESS,
        abi: erc20Abi,
        functionName: "transfer",
        args: [cdpAddress, usdcBalance],
      });
      await publicClient.waitForTransactionReceipt({ hash });
      console.log(`  \u2713 Transferred ${formatUnits(usdcBalance, 6)} USDC`);
    } else {
      console.log(`  \u2013 No USDC balance to transfer`);
    }

    const ethBalance = await publicClient.getBalance({ address: oldAccount.address });
    if (ethBalance > GAS_BUFFER_WEI) {
      const sendAmount = ethBalance - GAS_BUFFER_WEI;
      const hash = await oldWallet.sendTransaction({ to: cdpAddress, value: sendAmount });
      await publicClient.waitForTransactionReceipt({ hash });
      console.log(`  \u2713 Transferred ${formatUnits(sendAmount, 18)} ETH`);
    } else {
      console.log(`  \u2013 Insufficient ETH balance to bother transferring`);
    }

    await prisma.user.update({
      where: { id: user.id },
      data: { migrationStatus: "ASSETS_TRANSFERRED" },
    });
  }

  // ---------- Step 3: on-chain state migration (requires new address's signature) ----------
  if (user.migrationStatus === "ASSETS_TRANSFERRED" || user.migrationStatus === "WALLET_CREATED") {
    const messageHash = keccak256(
      encodePacked(
        ["string", "address", "address", "address"],
        ["ChamaPay Migration:", user.walletAddress, cdpAddress, CHAMAPAY_ADDRESS]
      )
    );

    // The NEW (CDP) address proves it controls that key by signing the migration message.
    const cdpAccount = await cdp.evm.getAccount({ address: cdpAddress });
    const signature = await cdpAccount.signMessage({ message: { raw: messageHash } });

    const migrateHash = await ownerWallet.writeContract({
      address: CHAMAPAY_ADDRESS,
      abi: chamaPayAbi,
      functionName: "migrateUser",
      args: [user.walletAddress, cdpAddress, signature],
    });
    await publicClient.waitForTransactionReceipt({ hash: migrateHash });
    console.log(`  \u2713 On-chain state migrated (tx: ${migrateHash})`);

    await prisma.user.update({
      where: { id: user.id },
      data: { migrationStatus: "CONTRACT_MIGRATED" },
    });
  }

  // ---------- Step 4: verify + cleanup ----------
  if (user.migrationStatus === "CONTRACT_MIGRATED" || user.migrationStatus === "ASSETS_TRANSFERRED") {
    const hasMigrated = await publicClient.readContract({
      address: CHAMAPAY_ADDRESS,
      abi: chamaPayAbi,
      functionName: "hasMigrated",
      args: [user.walletAddress],
    });

    if (!hasMigrated) {
      throw new Error(`Verification failed for user ${user.id}: hasMigrated() returned false on-chain`);
    }

    await prisma.user.update({
      where: { id: user.id },
      data: {
        migrationStatus: "COMPLETED",
        encryptedPrivkey: null,
        encryptedPassphrase: null, // drop this field too if it exists on your schema
      },
    });
    console.log(`  \u2713 Verified on-chain. Old key deleted. User ${user.id} COMPLETE.`);
  }
}

async function main() {
  const users = await prisma.user.findMany({
    where: { migrationStatus: { not: "COMPLETED" } },
  });

  console.log(`Found ${users.length} user(s) to migrate.\n`);

  const failures: string[] = [];

  for (const user of users) {
    try {
      await migrateSingleUser(user as any);
    } catch (err) {
      console.error(`  \u2717 FAILED user ${user.id}:`, err);
      failures.push(user.id);
      // Deliberately don't throw — move on, this user's progress is saved
      // at whatever step it reached, and is safely retryable.
    }
  }

  console.log(`\nMigration pass complete.`);
  if (failures.length) {
    console.log(`${failures.length} user(s) need a retry: ${failures.join(", ")}`);
    console.log(`Re-run this script — completed steps are skipped automatically.`);
  } else {
    console.log(`All users migrated successfully. Next: verify manually, then call finalizeMigration().`);
  }
}

main()
  .catch((err) => {
    console.error("Migration script crashed:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
