import dotenv from "dotenv";
const { createSmartAccountClient } = require("permissionless") as any;
const { toSimpleSmartAccount } = require("permissionless/accounts") as any;
const { createPimlicoClient } = require("permissionless/clients/pimlico") as any;
const { createPublicClient, http } = require("viem") as any;
const { entryPoint07Address, entryPoint08Address } = require("viem/account-abstraction") as any;
const { privateKeyToAccount } = require("viem/accounts") as any;
const { base } = require("viem/chains") as any;
const { EIP7702_IMPLEMENTATION_ADDRESS } = require("./Constants");

dotenv.config()

const apiKey = process.env.PIMLICO_API_KEY;
if (!apiKey) {
    throw new Error("PIMLICO_API_KEY is not set");
}

const publicClient = createPublicClient({
    chain: base,
    transport: http()
})

const pimlicoUrl = `https://api.pimlico.io/v2/8453/rpc?apikey=${apiKey}`;

const pimlicoClient = createPimlicoClient({
	transport: http(pimlicoUrl),
	entryPoint: {
		address: entryPoint07Address,
		version: "0.7",
	},
})

// create a smart account from private key using EIP-7702
export const createEIP7702SmartAccount = async (privateKey: string) => {
    try {
        const owner = privateKeyToAccount(privateKey);
        
        // create an EIP-7702 wrapper over the EOA
        const eip7702SmartAccount = await toSimpleSmartAccount({
            client: publicClient,
            owner: owner,
            address: owner.address, // EIP-7702 assigns functionality to the EOA
            entryPoint: {
                address: entryPoint07Address,
                version: "0.7"
            },
            eip7702: true,
            accountLogicAddress: EIP7702_IMPLEMENTATION_ADDRESS
        })

        // Check if the account already has the delegation set
        const isSmartAccountDeployed = await eip7702SmartAccount.isDeployed();
        let authorization = null;

        if (!isSmartAccountDeployed) {
            // Sign the authorization list for EIP-7702 only if not deployed
            authorization = await owner.signAuthorization({
                contractAddress: EIP7702_IMPLEMENTATION_ADDRESS,
                chainId: 8453, // Base
                nonce: await publicClient.getTransactionCount({
                    address: owner.address,
                }),
            })
        }

        const smartAccountClient = createSmartAccountClient({
            account: eip7702SmartAccount,
            chain: base,
            bundlerTransport: http(pimlicoUrl),
            paymaster: pimlicoClient,
            userOperation: {
                estimateFeesPerGas: async () => {
                    return (await pimlicoClient.getUserOperationGasPrice()).fast
                },
            },
        })

        return { smartAccountClient, safeSmartAccount: eip7702SmartAccount, authorization }
    } catch (error) {
        console.error("Error creating EIP-7702 smart account:", error);
        throw error;
    }
}
