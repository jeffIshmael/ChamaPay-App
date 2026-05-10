// this file contains erc20 functions to use
import { erc20Abi, parseUnits, createPublicClient, http } from "viem";
import { USDCAddress } from "./Constants";
import { createEIP7702SmartAccount } from "./EIP7702Client";
import { builderCodeDataSuffix } from "./Constants";
import { base } from "viem/chains";

const publicClient = createPublicClient({
    chain: base,
    transport: http()
})

export const approveTx = async (privateKey: `0x${string}`, amount: string, spender: `0x${string}`) => {
    try {
        const amountInWei = parseUnits(amount, 6);
        const { smartAccountClient } = await createEIP7702SmartAccount(privateKey);

        const hash = await smartAccountClient.writeContract({
            address: USDCAddress,
            abi: erc20Abi,
            dataSuffix: builderCodeDataSuffix,
            functionName: 'approve',
            args: [spender, amountInWei],
        });

        const transaction = await publicClient.waitForTransactionReceipt({ hash });
        if (!transaction) throw new Error("unable to approve spending.");

        return transaction.transactionHash;
    } catch (error) {
        console.error("Error in approve tx:", error);
        throw error;
    }
};

export const transferTx = async (privateKey: `0x${string}`, amount: string, recipient: `0x${string}`) => {
    try {
        const amountInWei = parseUnits(amount, 6);
        const { smartAccountClient } = await createEIP7702SmartAccount(privateKey);

        const hash = await smartAccountClient.writeContract({
            address: USDCAddress,
            abi: erc20Abi,
            dataSuffix: builderCodeDataSuffix,
            functionName: 'transfer',
            args: [recipient, amountInWei],
        });

        const transaction = await publicClient.waitForTransactionReceipt({ hash });
        if (!transaction) throw new Error("unable to transfer.");

        return transaction.transactionHash;
    } catch (error) {
        console.error("Error in transfer tx:", error);
        throw error;
    }
};