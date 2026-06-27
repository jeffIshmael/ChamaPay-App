import dotenv from "dotenv";
const { createSmartAccountClient } = require("permissionless") as any;
const { createClient, createPublicClient, http } = require("viem") as any;
const { bundlerActions, paymasterActions } = require("viem/account-abstraction") as any;
const { privateKeyToAccount } = require("viem/accounts") as any;
const { base } = require("viem/chains") as any;
const { EIP7702_IMPLEMENTATION_ADDRESS, builderCodeDataSuffix } = require("./Constants");
const { to7702SimpleSmartAccount } = require("permissionless/accounts") as any;

dotenv.config();

const coinbasePaymasterUrl = process.env.COINBASE_PAYMASTER_URL;
if (!coinbasePaymasterUrl) throw new Error("COINBASE_PAYMASTER_URL is not set");

const publicClient = createPublicClient({
    chain: base,
    transport: http(),
});

const cdpClient = createClient({
    chain: base,
    transport: http(coinbasePaymasterUrl),
})
    .extend(bundlerActions)
    .extend(paymasterActions);

export const createEIP7702SmartAccount = async (privateKey: string) => {
    try {
        const owner = privateKeyToAccount(privateKey);

        const eip7702SmartAccount = await to7702SimpleSmartAccount({
            client: publicClient,
            owner: owner,
        });

        const smartAccountClient = createSmartAccountClient({
            account: eip7702SmartAccount,
            chain: base,
            bundlerTransport: http(coinbasePaymasterUrl),
            paymaster: cdpClient,
            dataSuffix: builderCodeDataSuffix,
            userOperation: {
                estimateFeesPerGas: async () => {
                    return await publicClient.estimateFeesPerGas();
                },
            },
        });

        const isDeployed = await eip7702SmartAccount.isDeployed();
        let authorization = null;

        if (!isDeployed) {
            console.log(`Account not deployed. Signing EIP-7702 authorization for: ${owner.address}`);
            authorization = await owner.signAuthorization({
                address: EIP7702_IMPLEMENTATION_ADDRESS,
                chainId: base.id,
                nonce: await publicClient.getTransactionCount({ address: owner.address }),
            });
        }

        return { smartAccountClient, safeSmartAccount: eip7702SmartAccount, authorization };
    } catch (error) {
        console.error("Error creating EIP-7702 smart account:", error);
        throw error;
    }
};
