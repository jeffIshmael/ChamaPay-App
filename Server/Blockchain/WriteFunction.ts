import { parseUnits, createPublicClient, http, encodeFunctionData, erc20Abi } from "viem";
import { contractABI, contractAddress, builderCodeDataSuffix, USDCAddress, moonwellUSDCAddress, ERC20_APPROVE_ABI, MOONWELL_MINT_ABI } from "./Constants";
import { createEIP7702SmartAccount } from "./EIP7702Client";
import { base } from "viem/chains";

const publicClient = createPublicClient({
    chain: base,
    transport: http(undefined, { timeout: 10_000 }),
});

export const bcCreateChama = async (cdpWalletId: string, chamaAmount: string, duration: bigint, startDate: bigint, maxMembers: bigint, isPublic: boolean) => {
    try {
        const amountInWei = parseUnits(chamaAmount, 6);
        const { smartAccountClient, authorization } = await createEIP7702SmartAccount(cdpWalletId);
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

export const bcAddMemberToPrivateChama = async (cdpWalletId: string, chamaBlockchainId: bigint, memberAddress: string) => {
    try {
        const { smartAccountClient, authorization } = await createEIP7702SmartAccount(cdpWalletId);
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

export const bcDepositFundsToChama = async (cdpWalletId: string, chamaBlockchainId: bigint, amount: string) => {
    try {
        const amountInWei = parseUnits(amount, 6);
        const { smartAccountClient, authorization } = await createEIP7702SmartAccount(cdpWalletId);
        const hash = await smartAccountClient.sendTransaction({
            calls: [
                {
                    to: USDCAddress as `0x${string}`,
                    data: encodeFunctionData({
                        abi: erc20Abi,
                        functionName: 'approve',
                        args: [contractAddress as `0x${string}`, amountInWei]
                    })
                },
                {
                    to: contractAddress as `0x${string}`,
                    data: encodeFunctionData({
                        abi: contractABI,
                        functionName: 'depositCash',
                        args: [chamaBlockchainId, amountInWei]
                    })
                }
            ],
            dataSuffix: builderCodeDataSuffix
        });
        const transaction = await publicClient.waitForTransactionReceipt({ hash });
        if (!transaction) throw new Error("Unable to deposit funds to chama onchain.");
        return transaction.transactionHash;
    } catch (error) {
        console.error("Error depositing funds to chama:", error);
        throw error;
    }
};

export const bcDepositFundsForMember = async (cdpWalletId: string, chamaBlockchainId: bigint, memberAddress: string, amount: string) => {
    try {
        const amountInWei = parseUnits(amount, 6);
        const { smartAccountClient, authorization } = await createEIP7702SmartAccount(cdpWalletId);
        const hash = await smartAccountClient.sendTransaction({
            calls: [
                {
                    to: USDCAddress as `0x${string}`,
                    data: encodeFunctionData({
                        abi: erc20Abi,
                        functionName: 'approve',
                        args: [contractAddress as `0x${string}`, amountInWei]
                    })
                },
                {
                    to: contractAddress as `0x${string}`,
                    data: encodeFunctionData({
                        abi: contractABI,
                        functionName: 'depositForMember',
                        args: [memberAddress as `0x${string}`, chamaBlockchainId, amountInWei]
                    })
                }
            ],
            dataSuffix: builderCodeDataSuffix
        });
        const transaction = await publicClient.waitForTransactionReceipt({ hash });
        if (!transaction) throw new Error("Unable to deposit funds for member onchain.");
        return transaction.transactionHash;
    } catch (error) {
        console.error("Error depositing funds for member:", error);
        throw error;
    }
};

export const bcLeaveChama = async (cdpWalletId: string, memberAddress: string, chamaBlockchainId: number) => {
    try {
        const { smartAccountClient, authorization } = await createEIP7702SmartAccount(cdpWalletId);
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

export const bcDeleteChama = async (cdpWalletId: string, chamaBlockchainId: number) => {
    try {
        const { smartAccountClient, authorization } = await createEIP7702SmartAccount(cdpWalletId);
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

export const bcWithdrawFundsFromChama = async (cdpWalletId: string, chamaBlockchainId: number, amount: string) => {
    try {
        const amountInWei = parseUnits(amount, 6);
        const { smartAccountClient, authorization } = await createEIP7702SmartAccount(cdpWalletId);
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

export const bcMoonwellDeposit = async (cdpWalletId: string, amount: string) => {
    try {
        const amountInWei = parseUnits(amount, 6);
        const { smartAccountClient, authorization } = await createEIP7702SmartAccount(cdpWalletId);
        
        // 1. Approve USDC for Moonwell Market
        const currentAllowance = await publicClient.readContract({
            address: USDCAddress as `0x${string}`,
            abi: ERC20_APPROVE_ABI.map(abi => abi.name === 'approve' ? {
                inputs: [
                    { internalType: "address", name: "owner", type: "address" },
                    { internalType: "address", name: "spender", type: "address" }
                ],
                name: "allowance",
                outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
                stateMutability: "view",
                type: "function"
            } : abi), // Mock the ABI since we only have approve in the const, we should just define allowance ABI inline
            functionName: 'allowance',
            args: [cdpWalletId as `0x${string}`, moonwellUSDCAddress as `0x${string}`],
        }).catch(() => BigInt(0)) as bigint; // Ignore error and assume 0 if it fails

        // Only approve if current allowance is less than the amount we want to deposit
        if (currentAllowance < amountInWei) {
            const approveHash = await smartAccountClient.writeContract({
                address: USDCAddress as `0x${string}`,
                abi: ERC20_APPROVE_ABI,
                functionName: 'approve',
                args: [moonwellUSDCAddress as `0x${string}`, amountInWei],
                dataSuffix: builderCodeDataSuffix,
            });
            const approveTx = await publicClient.waitForTransactionReceipt({ hash: approveHash });
            if (!approveTx || approveTx.status !== 'success') throw new Error("Unable to approve USDC for Moonwell.");
            
            // Poll for allowance to update to avoid RPC sync issues during gas estimation of mint
            let newAllowance = currentAllowance;
            let attempts = 0;
            while (newAllowance < amountInWei && attempts < 10) {
                await new Promise(r => setTimeout(r, 1000));
                newAllowance = await publicClient.readContract({
                    address: USDCAddress as `0x${string}`,
                    abi: [{
                        inputs: [
                            { internalType: "address", name: "owner", type: "address" },
                            { internalType: "address", name: "spender", type: "address" }
                        ],
                        name: "allowance",
                        outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
                        stateMutability: "view",
                        type: "function"
                    }],
                    functionName: 'allowance',
                    args: [cdpWalletId as `0x${string}`, moonwellUSDCAddress as `0x${string}`],
                }) as bigint;
                attempts++;
            }
        }

        // 2. Mint mUSDC (Supply to Moonwell)
        const mintHash = await smartAccountClient.writeContract({
            address: moonwellUSDCAddress as `0x${string}`,
            abi: MOONWELL_MINT_ABI,
            functionName: 'mint',
            args: [amountInWei],
            dataSuffix: builderCodeDataSuffix,
        });
        const mintTx = await publicClient.waitForTransactionReceipt({ hash: mintHash });
        if (!mintTx || mintTx.status !== 'success') throw new Error("Unable to mint mUSDC on Moonwell.");

        return mintTx.transactionHash;
    } catch (error) {
        console.error("Error depositing to Moonwell:", error);
        throw error;
    }
};

export const bcMoonwellWithdraw = async (cdpWalletId: string, amount: string, isMax: boolean = false) => {
    try {
        const amountInWei = parseUnits(amount, 6);
        const { smartAccountClient, authorization } = await createEIP7702SmartAccount(cdpWalletId);
        
        let withdrawHash;

        if (isMax) {
            // Read mUSDC balance
            const mUSDC_BALANCE_ABI = [{
                inputs: [{ internalType: "address", name: "owner", type: "address" }],
                name: "balanceOf",
                outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
                stateMutability: "view",
                type: "function"
            }] as const;

            const mUsdcBalance = await publicClient.readContract({
                address: moonwellUSDCAddress as `0x${string}`,
                abi: mUSDC_BALANCE_ABI,
                functionName: 'balanceOf',
                args: [cdpWalletId as `0x${string}`],
            }) as bigint;

            const MOONWELL_REDEEM_ABI = [{
                inputs: [{ internalType: "uint256", name: "redeemTokens", type: "uint256" }],
                name: "redeem",
                outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
                stateMutability: "nonpayable",
                type: "function"
            }] as const;

            withdrawHash = await smartAccountClient.writeContract({
                address: moonwellUSDCAddress as `0x${string}`,
                abi: MOONWELL_REDEEM_ABI,
                functionName: 'redeem',
                args: [mUsdcBalance],
                dataSuffix: builderCodeDataSuffix,
                ...(authorization ? { authorization } : {}),
            });
        } else {
            const MOONWELL_REDEEM_UNDERLYING_ABI = [{
                inputs: [{ internalType: "uint256", name: "redeemAmount", type: "uint256" }],
                name: "redeemUnderlying",
                outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
                stateMutability: "nonpayable",
                type: "function"
            }] as const;

            withdrawHash = await smartAccountClient.writeContract({
                address: moonwellUSDCAddress as `0x${string}`,
                abi: MOONWELL_REDEEM_UNDERLYING_ABI,
                functionName: 'redeemUnderlying',
                args: [amountInWei],
                dataSuffix: builderCodeDataSuffix,
                ...(authorization ? { authorization } : {}),
            });
        }

        const withdrawTx = await publicClient.waitForTransactionReceipt({ hash: withdrawHash });
        if (!withdrawTx || withdrawTx.status !== 'success') throw new Error("Unable to withdraw from Moonwell.");

        return withdrawTx.transactionHash;
    } catch (error) {
        console.error("Error withdrawing from Moonwell:", error);
        throw error;
    }
};

export const bcUpdateChamaDetails = async (cdpWalletId: string, chamaBlockchainId: bigint, newAmount: string, newCycle: number, newRound: number, newPayDate: number, newDuration: number) => {
    try {
        const amountInWei = parseUnits(newAmount, 6);
        const { smartAccountClient, authorization } = await createEIP7702SmartAccount(cdpWalletId);
        const hash = await smartAccountClient.writeContract({
            address: contractAddress,
            abi: contractABI,
            functionName: 'updateChamaDetails',
            args: [chamaBlockchainId, amountInWei, BigInt(newCycle), BigInt(newRound), BigInt(newPayDate), BigInt(newDuration)],
            dataSuffix: builderCodeDataSuffix,
            ...(authorization ? { authorization } : {}),
        });
        const transaction = await publicClient.waitForTransactionReceipt({ hash });
        if (!transaction) throw new Error("Unable to update chama details onchain.");
        return transaction.transactionHash;
    } catch (error) {
        console.error("Error updating chama details:", error);
        throw error;
    }
};

// for Casis's version only or maybe not
export const  bcAdminSetPayoutOrder = async (cdpWalletId: string, chamaBlockchainId: number, payoutOrder: `0x${string}`[]) => {
    try {
        const { smartAccountClient, authorization } = await createEIP7702SmartAccount(cdpWalletId);
        const hash = await smartAccountClient.writeContract({
            address: contractAddress,
            abi: contractABI,
            functionName: 'setPayoutOrder',
            args: [chamaBlockchainId, payoutOrder],
            dataSuffix: builderCodeDataSuffix,
            ...(authorization ? { authorization } : {}),
        });
        const transaction = await publicClient.waitForTransactionReceipt({ hash });
        if (!transaction) throw new Error("Unable to set payout order onchain.");
        return transaction.transactionHash;
    } catch (error) {
        console.error("Error setting payout order:", error);
        throw error;
    }
};