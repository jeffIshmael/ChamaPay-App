/**
 * EIP-7702 Client for Celo
 * 
 * This client enables EIP-7702 account abstraction on Celo, allowing EOAs to
 * upgrade to smart accounts while maintaining the same address.
 * 
 * Key Features:
 * - Authorization signing for code delegation
 * - Transaction building with authorization lists
 * - Gas estimation
 * - Transaction submission
 * 
 * Security Notes:
 * - Authorization delegates full control of EOA to implementation contract
 * - Only use trusted, audited implementation contracts
 * - Private keys are never logged or exposed
 * - Nonce management prevents replay attacks
 */

import {
    type Address,
    type Chain,
    type Hash,
    type Hex,
    type LocalAccount,
    type PublicClient,
    type TransactionReceipt,
    type WalletClient,
    createPublicClient,
    createWalletClient,
    encodeFunctionData,
    http,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { celo } from "viem/chains";

/**
 * Configuration for EIP7702Client
 */
export interface EIP7702ClientConfig {
    /** Private key of the EOA to upgrade */
    privateKey: `0x${string}`;
    /** Address of the implementation contract to delegate to */
    implementationAddress: Address;
    /** RPC URL for Celo (defaults to public RPC) */
    rpcUrl?: string;
    /** Chain configuration (defaults to Celo mainnet) */
    chain?: Chain;
}

/**
 * EIP-7702 Authorization object
 */
export interface Authorization {
    chainId: bigint;
    address: Address;
    nonce: bigint;
    r: Hex;
    s: Hex;
    yParity: number;
}

/**
 * Transaction parameters for EIP-7702 transactions
 */
export interface EIP7702TransactionParams {
    /** Target contract address */
    to: Address;
    /** Encoded call data */
    data: Hex;
    /** Value to send (in wei) */
    value?: bigint;
    /** Gas limit (optional, will be estimated if not provided) */
    gas?: bigint;
    /** Max fee per gas (optional, will use current gas price if not provided) */
    maxFeePerGas?: bigint;
    /** Max priority fee per gas (optional) */
    maxPriorityFeePerGas?: bigint;
}

/**
 * EIP-7702 Client
 * 
 * Handles all EIP-7702 operations including authorization signing,
 * transaction building, and submission.
 */
export class EIP7702Client {
    private account: LocalAccount;
    private implementationAddress: Address;
    private publicClient: PublicClient;
    private walletClient: WalletClient;
    private chain: Chain;
    private currentAuthorization: Authorization | null = null;
    private isAuthorized: boolean = false;

    constructor(config: EIP7702ClientConfig) {
        this.chain = config.chain || celo;
        this.account = privateKeyToAccount(config.privateKey);
        this.implementationAddress = config.implementationAddress;

        const rpcUrl = config.rpcUrl || "https://celo.drpc.org";

        // Create public client for reading blockchain state
        this.publicClient = createPublicClient({
            chain: this.chain,
            transport: http(rpcUrl),
        });

        // Create wallet client for signing and sending transactions
        this.walletClient = createWalletClient({
            account: this.account,
            chain: this.chain,
            transport: http(rpcUrl),
        });
    }

    /**
     * Get the EOA address
     */
    getAddress(): Address {
        return this.account.address;
    }

    /**
     * Get the implementation address
     */
    getImplementationAddress(): Address {
        return this.implementationAddress;
    }

    /**
     * Check if the EOA is currently authorized (has delegated code)
     */
    async checkIsAuthorized(): Promise<boolean> {
        try {
            const code = await this.publicClient.getBytecode({
                address: this.account.address,
            });

            // If code exists and is not just "0x", the EOA has delegated code
            this.isAuthorized = !!code && code !== "0x";
            return this.isAuthorized;
        } catch (error) {
            console.error("Error checking authorization status:", error);
            return false;
        }
    }

    /**
     * Sign an EIP-7702 authorization
     * 
     * This creates a signature that authorizes the EOA to delegate its code
     * to the implementation contract.
     * 
     * @returns Authorization object with signature
     */
    async signAuthorization(): Promise<Authorization> {
        try {
            // Get current nonce for the EOA
            const nonce = await this.publicClient.getTransactionCount({
                address: this.account.address,
            });

            console.log("Signing EIP-7702 authorization...");
            console.log("  EOA:", this.account.address);
            console.log("  Implementation:", this.implementationAddress);
            console.log("  Nonce:", nonce);
            console.log("  Chain ID:", this.chain.id);

            // Sign the authorization using viem's signAuthorization
            const authorization = await this.account.signAuthorization!({
                contractAddress: this.implementationAddress,
                chainId: this.chain.id,
                nonce: Number(nonce),
            });

            // Store the authorization
            this.currentAuthorization = {
                chainId: BigInt(this.chain.id),
                address: this.implementationAddress,
                nonce: BigInt(nonce),
                r: authorization.r,
                s: authorization.s,
                yParity: authorization.yParity === 0 ? 0 : 1,
            };

            console.log("✅ Authorization signed successfully");

            return this.currentAuthorization;
        } catch (error) {
            console.error("❌ Error signing authorization:", error);
            throw new Error(`Failed to sign EIP-7702 authorization: ${error}`);
        }
    }

    /**
     * Send an EIP-7702 transaction
     * 
     * This sends a transaction with an authorization list, enabling the EOA
     * to execute code from the delegated implementation.
     * 
     * @param params Transaction parameters
     * @returns Transaction hash
     */
    async sendTransaction(params: EIP7702TransactionParams): Promise<Hash> {
        try {
            // Check if we need to create a new authorization
            const isAuthorized = await this.checkIsAuthorized();

            let authorization: Authorization | undefined;

            if (!isAuthorized) {
                console.log("🔐 First transaction - creating authorization...");
                authorization = await this.signAuthorization();
            } else {
                console.log("✅ Already authorized - no authorization needed");
            }

            // Estimate gas if not provided
            const gas = params.gas || await this.estimateGas(params, authorization);

            // Get current gas prices if not provided
            const gasPrice = await this.publicClient.getGasPrice();
            const maxFeePerGas = params.maxFeePerGas || gasPrice;
            const maxPriorityFeePerGas = params.maxPriorityFeePerGas || (gasPrice / 10n);

            console.log("📤 Sending EIP-7702 transaction...");
            console.log("  To:", params.to);
            console.log("  Gas:", gas);
            console.log("  Max Fee:", maxFeePerGas);

            // Build transaction with authorization list
            const txParams: any = {
                to: params.to,
                data: params.data,
                value: params.value || 0n,
                gas,
                maxFeePerGas,
                maxPriorityFeePerGas,
                chain: this.chain,
                account: this.account,
            };

            // Add authorization list if this is the first transaction
            if (authorization) {
                txParams.authorizationList = [authorization];
            }

            // Send the transaction
            const hash = await this.walletClient.sendTransaction(txParams);

            console.log("✅ Transaction sent:", hash);

            return hash;
        } catch (error) {
            console.error("❌ Error sending transaction:", error);
            throw new Error(`Failed to send EIP-7702 transaction: ${error}`);
        }
    }

    /**
     * Estimate gas for an EIP-7702 transaction
     * 
     * @param params Transaction parameters
     * @param authorization Optional authorization (for first transaction)
     * @returns Estimated gas limit
     */
    private async estimateGas(
        params: EIP7702TransactionParams,
        authorization?: Authorization
    ): Promise<bigint> {
        try {
            const estimateParams: any = {
                account: this.account,
                to: params.to,
                data: params.data,
                value: params.value || 0n,
            };

            if (authorization) {
                estimateParams.authorizationList = [authorization];
            }

            const gasEstimate = await this.publicClient.estimateGas(estimateParams);

            // Add 20% buffer for safety
            const gasWithBuffer = (gasEstimate * 120n) / 100n;

            console.log("⛽ Gas estimated:", gasWithBuffer);

            return gasWithBuffer;
        } catch (error) {
            console.error("⚠️  Gas estimation failed, using default:", error);
            // Return a reasonable default if estimation fails
            return 500000n;
        }
    }

    /**
     * Wait for a transaction to be mined
     * 
     * @param hash Transaction hash
     * @returns Transaction receipt
     */
    async waitForTransaction(hash: Hash): Promise<TransactionReceipt> {
        console.log("⏳ Waiting for transaction to be mined...");

        const receipt = await this.publicClient.waitForTransactionReceipt({
            hash,
        });

        console.log("✅ Transaction mined in block:", receipt.blockNumber);

        return receipt;
    }

    /**
     * Revoke authorization (reset EOA to normal)
     * 
     * This sends a transaction that clears the delegated code,
     * returning the EOA to its normal state.
     * 
     * Note: Implementation depends on how the delegation contract handles revocation.
     * This is a placeholder that would need to be customized based on the
     * specific implementation contract being used.
     */
    async revokeAuthorization(): Promise<Hash> {
        console.log("🔓 Revoking EIP-7702 authorization...");

        // To revoke, we need to send a transaction with an empty authorization list
        // or a special revocation transaction depending on the implementation

        // This is a simplified version - actual implementation may vary
        throw new Error("Authorization revocation not yet implemented. This depends on the specific implementation contract.");
    }

    /**
     * Helper: Build contract call data
     * 
     * @param contractAbi Contract ABI (can be readonly)
     * @param functionName Function to call
     * @param args Function arguments
     * @returns Encoded call data
     */
    static encodeCallData(
        contractAbi: readonly any[] | any[],
        functionName: string,
        args: any[]
    ): Hex {
        return encodeFunctionData({
            abi: contractAbi as any,
            functionName,
            args,
        });
    }
}

/**
 * Example Usage:
 * 
 * ```typescript
 * // 1. Create client
 * const client = new EIP7702Client({
 *   privateKey: "0x...",
 *   implementationAddress: "0x29fcB43b46531BcA003ddC8FCB67FFE91900C762", // Safe 1.4.1
 * });
 * 
 * // 2. Prepare transaction
 * const callData = EIP7702Client.encodeCallData(
 *   contractABI,
 *   "registerChama",
 *   [amount, duration, startDate, maxMembers, isPublic]
 * );
 * 
 * // 3. Send transaction (authorization handled automatically)
 * const hash = await client.sendTransaction({
 *   to: contractAddress,
 *   data: callData,
 * });
 * 
 * // 4. Wait for confirmation
 * const receipt = await client.waitForTransaction(hash);
 * ```
 */
