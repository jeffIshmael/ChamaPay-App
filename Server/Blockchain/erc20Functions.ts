// this file contains erc20 functions to use
import { parseUnits, createPublicClient, http, erc20Abi } from "viem";
import { USDCAddress } from "./Constants";
import { createSmartAccount } from "./SmartAccount";
import { celo } from "viem/chains";

// create a public client
const publicClient = createPublicClient({
    chain: celo,
    transport: http()
})

// function for erc20 approve spending
export const approveTx = async (privateKey: `0x${string}`, amount: string, spender: `0x${string}`) => {
    try {
        //change amount to wei
        const amountInWei = parseUnits(amount, 6);
        // create a smart account client
        const { smartAccountClient, eoa7702, isSmartAccountDeployed } = await createSmartAccount(privateKey);
        // We only have to add the authorization field if the EOA does not have the authorization code set
        const txHash = await smartAccountClient.writeContract({
            address: USDCAddress,
            abi: erc20Abi,
            functionName: 'approve',
            args: [spender, amountInWei],
            authorization: !isSmartAccountDeployed ? await eoa7702.signAuthorization({
                contractAddress: "0xe6Cae83BdE06E4c305530e199D7217f42808555B",
                chainId: celo.id,
            }) : undefined,
        });
        // we need to make sure that the tx has been added to the bockchain
        const transaction = await publicClient.waitForTransactionReceipt({
            hash: txHash,
        });
        if (!transaction) {
            throw new Error("unable to approve spending.");
        }
        return transaction.transactionHash;
    } catch (error) {
        console.error("Error in approve tx:", error);
        throw error;
    }
}

// function for erc20 transfer
export const transferTx = async (privateKey: `0x${string}`, amount: string, recipient: `0x${string}`) => {
    try {
        //change amount to wei
        const amountInWei = parseUnits(amount, 6);
        // create a smart account client
        const { smartAccountClient, eoa7702, isSmartAccountDeployed } = await createSmartAccount(privateKey);
        // We only have to add the authorization field if the EOA does not have the authorization code set
        const txHash = await smartAccountClient.writeContract({
            address: USDCAddress,
            abi: erc20Abi,
            functionName: 'transfer',
            args: [recipient, amountInWei],
            authorization: !isSmartAccountDeployed ? await eoa7702.signAuthorization({
                contractAddress: "0xe6Cae83BdE06E4c305530e199D7217f42808555B",
                chainId: celo.id,
            }) : undefined,
        });
        // we need to make sure that the tx has been added to the bockchain
        const transaction = await publicClient.waitForTransactionReceipt({
            hash: txHash,
        });
        if (!transaction) {
            throw new Error("unable to transfer.");
        }
        return transaction.transactionHash;
    } catch (error) {
        console.error("Error in transfer tx:", error);
        throw error;
    }
}