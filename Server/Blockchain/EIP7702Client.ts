import dotenv from "dotenv";
const { createSmartAccountClient } = require("permissionless") as any;
const { createPimlicoClient } = require("permissionless/clients/pimlico") as any;
const { createPublicClient, http } = require("viem") as any;
const { entryPoint07Address } = require("viem/account-abstraction") as any;
const { privateKeyToAccount } = require("viem/accounts") as any;
const { base } = require("viem/chains") as any;
const { EIP7702_IMPLEMENTATION_ADDRESS, builderCodeDataSuffix } = require("./Constants");
const { to7702SimpleSmartAccount } = require("permissionless/accounts") as any;

dotenv.config();

const apiKey = process.env.PIMLICO_API_KEY;
if (!apiKey) throw new Error("PIMLICO_API_KEY is not set");

const publicClient = createPublicClient({
    chain: base,
    transport: http(),
});

const pimlicoUrl = `https://api.pimlico.io/v2/8453/rpc?apikey=${apiKey}`;

const pimlicoClient = createPimlicoClient({
    transport: http(pimlicoUrl),
    entryPoint: {
        address: entryPoint07Address,
        version: "0.7",
    },
});

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
            bundlerTransport: http(pimlicoUrl),
            paymaster: pimlicoClient,
            dataSuffix: builderCodeDataSuffix,
            userOperation: {
                estimateFeesPerGas: async () => {
                    return (await pimlicoClient.getUserOperationGasPrice()).fast;
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