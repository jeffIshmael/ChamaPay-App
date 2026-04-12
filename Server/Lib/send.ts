// a function to send USDC  from user's address
import { privateKeyToAccount } from "viem/accounts";
import { getPrivateKey } from "./HelperFunctions";
import { createPublicClient, erc20Abi, http, parseUnits } from "viem";
import { base } from "viem/chains";
import { USDCAddress, builderCodeDataSuffix } from "../Blockchain/Constants";
import { createEIP7702SmartAccount } from "../Blockchain/EIP7702Client";
// sending USDC
export const sendUsdc = async (userId: number, amount: string, toAddress: string) => {
    try {
        const privateKey = await getPrivateKey(userId);
        if (!privateKey.success && privateKey.privateKey == null) {
            throw new Error("Private key not found");
        }
        
        const { smartAccountClient, authorization } = await createEIP7702SmartAccount(privateKey.privateKey!);
        const publicClient = createPublicClient({
            chain: base,
            transport: http()
        })
        // send USDC
        const amountBigInt = parseUnits(amount, 6);
        const { request } = await publicClient.simulateContract({
            address: USDCAddress,
            abi: erc20Abi,
            functionName: "transfer",
            args: [toAddress as `0x${string}`, amountBigInt],
            account: smartAccountClient.account,
        })
        const hash = await smartAccountClient.writeContract({
            ...request,
            dataSuffix: builderCodeDataSuffix,
            ...(authorization ? { authorizationList: [authorization] } : {}),
        })
        console.log("Transaction sent with hash:", hash)
        return hash;
    } catch (error) {
        console.error("Error sending USDC:", error);
        throw error;
    }
}