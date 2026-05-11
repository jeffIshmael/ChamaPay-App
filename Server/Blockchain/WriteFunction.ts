import { parseUnits, createPublicClient, http } from "viem";
import { contractABI, contractAddress, builderCodeDataSuffix } from "./Constants";
import { createEIP7702SmartAccount } from "./EIP7702Client";
import { base } from "viem/chains";

const publicClient = createPublicClient({
    chain: base,
    transport: http(),
});

export const bcCreateChama = async (privateKey: `0x${string}`, chamaAmount: string, duration: bigint, startDate: bigint, maxMembers: bigint, isPublic: boolean) => {
    try {
        const amountInWei = parseUnits(chamaAmount, 6);
        const { smartAccountClient, authorization } = await createEIP7702SmartAccount(privateKey);
        const hash = await smartAccountClient.writeContract({
            address: contractAddress,
            abi: contractABI,
            functionName: 'registerChama',
            args: [amountInWei, duration, startDate, maxMembers, isPublic],
            dataSuffix: builderCodeDataSuffix,
            ...(authorization ? { authorization } : {}),
        });
        const transaction = await publicClient.waitForTransactionReceipt({ hash });
        if (!transaction) throw new Error("Unable to create chama onchain.");
        return transaction.transactionHash;
    } catch (error) {
        console.error("Error creating chama:", error);
        throw error;
    }
};

export const bcJoinPublicChama = async (privateKey: `0x${string}`, chamaBlockchainId: bigint, chamaAmount: string) => {
    try {
        const amountInWei = parseUnits(chamaAmount, 6);
        const { smartAccountClient, authorization } = await createEIP7702SmartAccount(privateKey);
        const hash = await smartAccountClient.writeContract({
            address: contractAddress,
            abi: contractABI,
            functionName: 'addPublicMember',
            args: [chamaBlockchainId, amountInWei],
            dataSuffix: builderCodeDataSuffix,
            ...(authorization ? { authorization } : {}),
        });
        const transaction = await publicClient.waitForTransactionReceipt({ hash });
        if (!transaction) throw new Error("Unable to join public chama onchain.");
        return transaction.transactionHash;
    } catch (error) {
        console.error("Error joining public chama:", error);
        throw error;
    }
};

export const bcAddMemberToPrivateChama = async (privateKey: `0x${string}`, chamaBlockchainId: bigint, memberAddress: string) => {
    try {
        const { smartAccountClient, authorization } = await createEIP7702SmartAccount(privateKey);
        const hash = await smartAccountClient.writeContract({
            address: contractAddress,
            abi: contractABI,
            functionName: 'addMember',
            args: [memberAddress as `0x${string}`, chamaBlockchainId],
            dataSuffix: builderCodeDataSuffix,
            ...(authorization ? { authorization } : {}),
        });
        const transaction = await publicClient.waitForTransactionReceipt({ hash });
        if (!transaction) throw new Error("Unable to add member to private chama onchain.");
        return transaction.transactionHash;
    } catch (error) {
        console.error("Error adding member to private chama:", error);
        throw error;
    }
};

export const bcDepositFundsToChama = async (privateKey: `0x${string}`, chamaBlockchainId: bigint, amount: string) => {
    try {
        const amountInWei = parseUnits(amount, 6);
        const { smartAccountClient, authorization } = await createEIP7702SmartAccount(privateKey);
        const hash = await smartAccountClient.writeContract({
            address: contractAddress,
            abi: contractABI,
            functionName: 'depositCash',
            args: [chamaBlockchainId, amountInWei, false],
            dataSuffix: builderCodeDataSuffix,
            ...(authorization ? { authorization } : {}),
        });
        const transaction = await publicClient.waitForTransactionReceipt({ hash });
        if (!transaction) throw new Error("Unable to deposit funds to chama onchain.");
        return transaction.transactionHash;
    } catch (error) {
        console.error("Error depositing funds to chama:", error);
        throw error;
    }
};

export const bcLeaveChama = async (privateKey: `0x${string}`, memberAddress: string, chamaBlockchainId: number) => {
    try {
        const { smartAccountClient, authorization } = await createEIP7702SmartAccount(privateKey);
        const hash = await smartAccountClient.writeContract({
            address: contractAddress,
            abi: contractABI,
            functionName: 'deleteMember',
            args: [chamaBlockchainId, memberAddress as `0x${string}`],
            dataSuffix: builderCodeDataSuffix,
            ...(authorization ? { authorization } : {}),
        });
        const transaction = await publicClient.waitForTransactionReceipt({ hash });
        if (!transaction) throw new Error("Unable to leave chama onchain.");
        return transaction.transactionHash;
    } catch (error) {
        console.error("Error leaving chama:", error);
        throw error;
    }
};

export const bcDeleteChama = async (privateKey: `0x${string}`, chamaBlockchainId: number) => {
    try {
        const { smartAccountClient, authorization } = await createEIP7702SmartAccount(privateKey);
        const hash = await smartAccountClient.writeContract({
            address: contractAddress,
            abi: contractABI,
            functionName: 'deleteChama',
            args: [chamaBlockchainId],
            dataSuffix: builderCodeDataSuffix,
            ...(authorization ? { authorization } : {}),
        });
        const transaction = await publicClient.waitForTransactionReceipt({ hash });
        if (!transaction) throw new Error("Unable to delete chama onchain.");
        return transaction.transactionHash;
    } catch (error) {
        console.error("Error deleting chama:", error);
        throw error;
    }
};

export const bcWithdrawFundsFromChama = async (privateKey: `0x${string}`, chamaBlockchainId: number, amount: string) => {
    try {
        const amountInWei = parseUnits(amount, 6);
        const { smartAccountClient, authorization } = await createEIP7702SmartAccount(privateKey);
        const hash = await smartAccountClient.writeContract({
            address: contractAddress,
            abi: contractABI,
            functionName: 'withdrawBalance',
            args: [BigInt(chamaBlockchainId), amountInWei],
            dataSuffix: builderCodeDataSuffix,
            ...(authorization ? { authorization } : {}),
        });
        const transaction = await publicClient.waitForTransactionReceipt({ hash });
        if (!transaction) throw new Error("Unable to withdraw funds from chama onchain.");
        return transaction.transactionHash;
    } catch (error) {
        console.error("Error withdrawing funds from chama:", error);
        throw error;
    }
};

export const bcAddLockedFundsToChama = async (privateKey: `0x${string}`, memberAddress: `0x${string}`, chamaBlockchainId: number, amount: string) => {
    try {
        const amountInWei = parseUnits(amount, 6);
        const { smartAccountClient, authorization } = await createEIP7702SmartAccount(privateKey);
        const hash = await smartAccountClient.writeContract({
            address: contractAddress,
            abi: contractABI,
            functionName: 'updateLockedAmount',
            args: [memberAddress, chamaBlockchainId, amountInWei],
            dataSuffix: builderCodeDataSuffix,
            ...(authorization ? { authorization } : {}),
        });
        const transaction = await publicClient.waitForTransactionReceipt({ hash });
        if (!transaction) throw new Error("Unable to add locked funds to chama onchain.");
        return transaction.transactionHash;
    } catch (error) {
        console.error("Error adding locked funds to chama:", error);
        throw error;
    }
};