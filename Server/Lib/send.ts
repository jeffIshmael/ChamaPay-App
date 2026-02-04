// a function to send USDC  from user's address
import { privateKeyToAccount } from "viem/accounts";
import { getPrivateKey } from "./HelperFunctions";
import { createPublicClient, createWalletClient, erc20Abi, http } from "viem";
import { celo } from "viem/chains";
import { USDCAddress } from "../Blockchain/Constants";
import { parseUnits } from "viem";
// sending USDC
export const sendUsdc = async (userId: number, amount: string, toAddress: string) => {
    try {
        const privateKey = await getPrivateKey(userId);
        if (!privateKey.success && privateKey.privateKey == null) {
            throw new Error("Private key not found");
        }
        const account = privateKeyToAccount(privateKey.privateKey!);
        const publicClient = createPublicClient({
            chain: celo,
            transport: http()
        })
        const walletClient = createWalletClient({
            chain: celo,
            transport: http(),
            account,
        })
        // send USDC
        const amountBigInt = parseUnits(amount, 6);
        const { request } = await publicClient.simulateContract({
            address: USDCAddress,
            abi: erc20Abi,
            functionName: "transfer",
            args: [toAddress, amountBigInt],
            account,
        })
        const hash = await walletClient.writeContract(request)
        console.log("Transaction sent with hash:", hash)
        return hash;
    } catch (error) {
        console.error("Error sending USDC:", error);
        throw error;
    }
}