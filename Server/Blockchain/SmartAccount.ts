// This file contains functio to get a smart account from private key
import dotenv from "dotenv";
// Use runtime requires and 'any' types to avoid compiling third-party TS sources
// which were causing build-time type conflicts.
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { createSmartAccountClient } = require("permissionless") as any;
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { toSafeSmartAccount } = require("permissionless/accounts") as any;
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { createPimlicoClient } = require("permissionless/clients/pimlico") as any;
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { createPublicClient, http } = require("viem") as any;
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { entryPoint07Address } = require("viem/account-abstraction") as any;
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { privateKeyToAccount } = require("viem/accounts") as any;
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { celo } = require("viem/chains") as any;

dotenv.config()

const apiKey = process.env.PIMLICO_API_KEY;
if (!apiKey) {
    throw new Error("PIMLICO_API_KEY is not set");
}

// create a public client
const publicClient = createPublicClient({
    chain: celo,
    transport: http()
})

const pimlicoUrl = `https://api.pimlico.io/v2/42220/rpc?apikey=${apiKey}`;

const pimlicoClient = createPimlicoClient({
	transport: http(pimlicoUrl),
	entryPoint: {
		address: entryPoint07Address,
		version: "0.7",
	},
})


// create a smart account from private key
export const createSmartAccount = async (privateKey: string) => {
    try{
    // create an owner from the private key
    const owner = privateKeyToAccount(privateKey);
    // create a safe smart account
    const safeSmartAccount = await toSafeSmartAccount({
        client: publicClient,
        owners: [owner],
        entryPoint: {
            address: entryPoint07Address,
            version: "0.7"
        }, // global entrypoint
        version: "1.4.1",
    })

    // create a smart account client
    const smartAccountClient = createSmartAccountClient({
        account: safeSmartAccount,
        chain: celo,
        bundlerTransport: http(pimlicoUrl),
        paymaster: pimlicoClient,
        userOperation: {
            estimateFeesPerGas: async () => {
                return (await pimlicoClient.getUserOperationGasPrice()).fast
            },
        },
    })

    // return the smart account client & smart account address
    return { smartAccountClient, safeSmartAccount }
    } catch (error) {
        console.error("Error creating smart account:", error);
        throw error;
    }
}