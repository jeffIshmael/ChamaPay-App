import "dotenv/config";
import { createPublicClient, http, erc20Abi, formatUnits, parseUnits } from "viem";
import { base } from "viem/chains";
import { treasuryTransferToUser } from "../Lib/pimlicoAgent";
import { USDCAddress } from "../Blockchain/Constants";

const TO = "0x38da082aA15F974b3D09E61d928775247aE086D4" as `0x${string}`;
const AMOUNT = "1";

async function main() {
  const treasury = process.env.TREASURY_WALLET as `0x${string}`;
  if (!treasury) throw new Error("TREASURY_WALLET missing");

  const publicClient = createPublicClient({ chain: base, transport: http() });
  const bal = await publicClient.readContract({
    address: USDCAddress as `0x${string}`,
    abi: erc20Abi,
    functionName: "balanceOf",
    args: [treasury],
  });

  console.log(JSON.stringify({
    from: treasury,
    to: TO,
    amount: AMOUNT,
    balanceUsdc: formatUnits(bal, 6),
  }, null, 2));

  const amountWei = parseUnits(AMOUNT, 6);
  if (bal < amountWei) {
    throw new Error(`Insufficient USDC: have ${formatUnits(bal, 6)}, need ${AMOUNT}`);
  }

  const hash = await treasuryTransferToUser(TO, amountWei);
  console.log(JSON.stringify({ ok: true, txHash: hash, explorer: `https://basescan.org/tx/${hash}` }, null, 2));
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : String(e));
  if (e && typeof e === "object" && "cause" in e) console.error(String((e as any).cause));
  process.exit(1);
});


// npx tsx scripts/transfer.ts