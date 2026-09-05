import { parseUnits, encodeFunctionData, erc20Abi } from "viem";
import { contractABI, contractAddress, builderCodeDataSuffix, USDCAddress, moonwellUSDCAddress, ERC20_APPROVE_ABI, MOONWELL_MINT_ABI } from "./Constants";
import { createEIP7702SmartAccount } from "./EIP7702Client";
import {
    getBasePublicClient,
    withRpcRetry,
    isRpcRateLimitError,
} from "./baseRpc";

const publicClient = getBasePublicClient();

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

const ERC20_BALANCE_ABI = [{
    inputs: [{ internalType: "address", name: "owner", type: "address" }],
    name: "balanceOf",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function"
}] as const;

const MOONWELL_REDEEM_ABI = [{
    inputs: [{ internalType: "uint256", name: "redeemTokens", type: "uint256" }],
    name: "redeem",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "nonpayable",
    type: "function"
}] as const;

const MOONWELL_REDEEM_UNDERLYING_ABI = [{
    inputs: [{ internalType: "uint256", name: "redeemAmount", type: "uint256" }],
    name: "redeemUnderlying",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "nonpayable",
    type: "function"
}] as const;

/** Truncate to USDC's 6 decimals so parseUnits never rejects float noise. */
export const parseUsdcAmount = (amount: string | number): bigint => {
    const raw = String(amount).trim();
    if (!raw || raw === ".") throw new Error(`Invalid USDC amount: ${amount}`);
    const negative = raw.startsWith("-");
    const unsigned = negative ? raw.slice(1) : raw;
    const [whole, frac = ""] = unsigned.split(".");
    const truncated = `${whole || "0"}.${frac.slice(0, 6)}`;
    const value = parseUnits(truncated, 6);
    return negative ? -value : value;
};

const readTokenBalance = async (token: `0x${string}`, owner: `0x${string}`) => {
    return withRpcRetry(`balanceOf ${token.slice(0, 10)}…`, () =>
        publicClient.readContract({
            address: token,
            abi: ERC20_BALANCE_ABI,
            functionName: "balanceOf",
            args: [owner],
        }) as Promise<bigint>
    );
};

/**
 * Moonwell mTokens (Compound-style) often return a non-zero error code WITHOUT
 * reverting. A mined tx with status=success is not enough — verify balances moved.
 */
export const bcMoonwellWithdraw = async (cdpWalletId: string, amount: string, isMax: boolean = false) => {
    try {
        const wallet = cdpWalletId as `0x${string}`;
        const amountInWei = parseUsdcAmount(amount);
        const { smartAccountClient, authorization } = await createEIP7702SmartAccount(cdpWalletId);

        const mUsdcBefore = await readTokenBalance(moonwellUSDCAddress as `0x${string}`, wallet);
        const usdcBefore = await readTokenBalance(USDCAddress as `0x${string}`, wallet);

        console.log("[Moonwell withdraw] balances before", {
            wallet,
            isMax,
            amount,
            amountInWei: amountInWei.toString(),
            mUsdcBefore: mUsdcBefore.toString(),
            usdcBefore: usdcBefore.toString(),
        });

        if (mUsdcBefore === 0n) {
            throw new Error("No Moonwell mUSDC balance to withdraw");
        }

        let withdrawHash;

        if (isMax) {
            withdrawHash = await smartAccountClient.writeContract({
                address: moonwellUSDCAddress as `0x${string}`,
                abi: MOONWELL_REDEEM_ABI,
                functionName: "redeem",
                args: [mUsdcBefore],
                dataSuffix: builderCodeDataSuffix,
                ...(authorization ? { authorization } : {}),
            });
        } else {
            if (amountInWei <= 0n) {
                throw new Error("Withdraw amount must be greater than zero");
            }
            withdrawHash = await smartAccountClient.writeContract({
                address: moonwellUSDCAddress as `0x${string}`,
                abi: MOONWELL_REDEEM_UNDERLYING_ABI,
                functionName: "redeemUnderlying",
                args: [amountInWei],
                dataSuffix: builderCodeDataSuffix,
                ...(authorization ? { authorization } : {}),
            });
        }

        const withdrawTx = await withRpcRetry("waitForTransactionReceipt", () =>
            publicClient.waitForTransactionReceipt({ hash: withdrawHash })
        );
        if (!withdrawTx || withdrawTx.status !== "success") {
            throw new Error("Unable to withdraw from Moonwell.");
        }

        // Moonwell redeem can "succeed" on-chain while returning a non-zero error code.
        // Confirm mUSDC left Moonwell AND underlying USDC landed in the wallet.
        let mUsdcAfter = mUsdcBefore;
        let usdcAfter = usdcBefore;
        for (let attempt = 0; attempt < 6; attempt++) {
            if (attempt > 0) await new Promise((r) => setTimeout(r, 1200));
            try {
                mUsdcAfter = await readTokenBalance(
                    moonwellUSDCAddress as `0x${string}`,
                    wallet
                );
                usdcAfter = await readTokenBalance(
                    USDCAddress as `0x${string}`,
                    wallet
                );
            } catch (error) {
                if (isRpcRateLimitError(error) && attempt < 5) {
                    console.warn(
                        "[Moonwell withdraw] post-check rate limited, backing off"
                    );
                    continue;
                }
                throw error;
            }
            if (mUsdcAfter < mUsdcBefore && usdcAfter > usdcBefore) break;
        }

        console.log("[Moonwell withdraw] balances after", {
            wallet,
            txHash: withdrawTx.transactionHash,
            mUsdcAfter: mUsdcAfter.toString(),
            usdcAfter: usdcAfter.toString(),
            mUsdcDelta: (mUsdcBefore - mUsdcAfter).toString(),
            usdcDelta: (usdcAfter - usdcBefore).toString(),
        });

        if (mUsdcAfter >= mUsdcBefore) {
            throw new Error(
                "Moonwell redeem did not move mUSDC (likely silent error code). Funds were not withdrawn."
            );
        }

        if (usdcAfter <= usdcBefore) {
            throw new Error(
                "Moonwell redeem burned mUSDC but USDC did not arrive in the wallet. Check Basescan and try again."
            );
        }

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