/**
 * EIP-7702 + CDP Paymaster via @coinbase/cdp-sdk (matches example.md flow).
 * Keeps the user's EOA address; CDP handles delegation and gas sponsorship.
 */
import { CdpClient, toEvmDelegatedAccount } from "@coinbase/cdp-sdk";
import type { EvmSmartAccount } from "@coinbase/cdp-sdk";
import dotenv from "dotenv";
import {
    createPublicClient,
    http,
    type Address,
    type Hash,
    type Hex,
} from "viem";
import { privateKeyToAccount, type PrivateKeyAccount } from "viem/accounts";
import { base } from "viem/chains";
import { builderCodeDataSuffix } from "./Constants";

dotenv.config();

const NETWORK = "base" as const;

const coinbasePaymasterUrl = process.env.COINBASE_PAYMASTER_URL;
if (!coinbasePaymasterUrl) {
    throw new Error("COINBASE_PAYMASTER_URL is not set");
}

const cdpApiKeyId = process.env.CDP_API_KEY_ID;
const cdpApiKeySecret = process.env.CDP_API_KEY_SECRET;
const cdpWalletSecret =
    process.env.CDP_WALLET_SECRET ?? process.env.WALLET_SECRET;

if (!cdpApiKeyId || !cdpApiKeySecret || !cdpWalletSecret) {
    throw new Error(
        "CDP_API_KEY_ID, CDP_API_KEY_SECRET, and CDP_WALLET_SECRET (or WALLET_SECRET) are required for EIP-7702"
    );
}

const publicClient = createPublicClient({
    chain: base,
    transport: http(),
});

let cdpClient: CdpClient | null = null;

const getCdpClient = () => {
    if (!cdpClient) {
        cdpClient = new CdpClient({
            apiKeyId: cdpApiKeyId,
            apiKeySecret: cdpApiKeySecret,
            walletSecret: cdpWalletSecret,
        });
    }
    return cdpClient;
};

const accountNameFor = (address: Address) =>
    `chamapay-${address.toLowerCase()}`;

const isAlreadyDelegated = async (address: Address) => {
    const code = await publicClient.getBytecode({ address });
    return Boolean(code && code !== "0x" && code.length > 2);
};

const getOrImportCdpAccount = async (
    cdp: CdpClient,
    privateKey: Hex,
    address: Address
) => {
    try {
        return await cdp.evm.getAccount({ address });
    } catch {
        // Account not in CDP yet — import below.
    }

    try {
        return await cdp.evm.importAccount({
            privateKey,
            name: accountNameFor(address),
        });
    } catch (error) {
        const message = String(error).toLowerCase();
        if (message.includes("already_exists") || message.includes("already exists")) {
            return await cdp.evm.getAccount({ address });
        }
        throw error;
    }
};

const ensureEip7702Delegation = async (privateKey: Hex) => {
    const owner = privateKeyToAccount(privateKey);
    const cdp = getCdpClient();
    const serverAccount = await getOrImportCdpAccount(cdp, privateKey, owner.address);

    if (!(await isAlreadyDelegated(owner.address))) {
        console.log(`Creating EIP-7702 delegation for ${owner.address}`);
        const { delegationOperationId } = await cdp.evm.createEvmEip7702Delegation({
            address: serverAccount.address,
            network: NETWORK,
            enableSpendPermissions: false,
        });
        await cdp.evm.waitForEvmEip7702DelegationOperationStatus({
            delegationOperationId,
        });
    }

    return toEvmDelegatedAccount(serverAccount);
};

type WriteContractParams = {
    address: Address;
    abi: any;
    functionName: string;
    args?: readonly unknown[];
    dataSuffix?: Hex;
};

type SendTransactionParams = {
    calls: {
        to: Address;
        data?: Hex;
        value?: bigint;
    }[];
    dataSuffix?: Hex;
};

type EncodedCall = {
    to: Address;
    value?: bigint;
    data?: Hex;
};

type ContractCall = {
    to: Address;
    abi: any;
    functionName: string;
    args?: readonly unknown[];
};

const sendDelegatedUserOperation = async (
    delegated: EvmSmartAccount,
    calls: readonly (EncodedCall | ContractCall)[],
    dataSuffix?: Hex
): Promise<Hash> => {
    const suffix = (dataSuffix ?? builderCodeDataSuffix) as Hex;

    const { userOpHash } = await delegated.sendUserOperation({
        network: NETWORK,
        calls: calls as Parameters<EvmSmartAccount["sendUserOperation"]>[0]["calls"],
        paymasterUrl: coinbasePaymasterUrl,
        dataSuffix: suffix,
    });

    const result = await delegated.waitForUserOperation({ userOpHash });

    if (result.status !== "complete") {
        throw new Error(`User operation failed: ${userOpHash}`);
    }

    return result.transactionHash as Hash;
};

const buildSmartAccountClient = (
    delegated: EvmSmartAccount,
    owner: PrivateKeyAccount
) => ({
    account: owner,
    writeContract: async ({
        address,
        abi,
        functionName,
        args,
        dataSuffix,
    }: WriteContractParams) => {
        return sendDelegatedUserOperation(
            delegated,
            [
                {
                    to: address,
                    abi,
                    functionName,
                    args,
                },
            ],
            dataSuffix
        );
    },
    sendTransaction: async ({ calls, dataSuffix }: SendTransactionParams) => {
        const encodedCalls = calls.map((call) => ({
            to: call.to,
            value: call.value ?? 0n,
            data: call.data ?? ("0x" as Hex),
        }));
        return sendDelegatedUserOperation(delegated, encodedCalls, dataSuffix);
    },
});

export const createEIP7702SmartAccount = async (privateKey: string) => {
    try {
        const key = privateKey as Hex;
        const owner = privateKeyToAccount(key);
        const delegated = await ensureEip7702Delegation(key);

        return {
            smartAccountClient: buildSmartAccountClient(delegated, owner),
            safeSmartAccount: {
                address: owner.address,
                getAddress: async () => owner.address,
            },
            authorization: null,
        };
    } catch (error) {
        console.error("Error creating EIP-7702 smart account:", error);
        throw error;
    }
};

export const createCDPSmartAccount = createEIP7702SmartAccount;
