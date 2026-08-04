import { createEIP7702SmartAccount } from "./Blockchain/CDPEIP7702Client";
import { parseUnits, encodeFunctionData, erc20Abi } from "viem";
import dotenv from "dotenv";
dotenv.config();

// USDC Contract Address on Base Mainnet
const USDCAddress = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913";

async function main() {
    const cdpWalletId = "0x1C059486B99d6A2D9372827b70084fbfD014E978"; // Treasury EOA

    console.log("Setting up EIP-7702 smart account via CDP...");
    const { smartAccountClient, safeSmartAccount } = await createEIP7702SmartAccount(cdpWalletId);
    console.log("Treasury Smart Account Address:", await safeSmartAccount.getAddress());

    const targetAddress = "0x38da082aA15F974b3D09E61d928775247aE086D4"; // mint's wallet
    const amountToTransfer = "1.52";
    const amountInWei = parseUnits(amountToTransfer, 6);

    console.log(`Transferring ${amountToTransfer} USDC to ${targetAddress}...`);

    try {
        const txHash = await smartAccountClient.sendTransaction({
            calls: [
                {
                    to: USDCAddress,
                    data: encodeFunctionData({
                        abi: erc20Abi,
                        functionName: "transfer",
                        args: [targetAddress, amountInWei],
                    }),
                }
            ]
        });

        console.log("Transaction Hash:", txHash);
        console.log("Transfer sent successfully!");
    } catch (e: any) {
        console.error("Transfer failed:", e);
    }
}

main().catch(console.error);
