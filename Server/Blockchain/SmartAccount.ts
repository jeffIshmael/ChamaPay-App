// This file contains functions to get a eip7702 smart account from private key
import dotenv from "dotenv";
// Use runtime requires and 'any' types to avoid compiling third-party TS sources
// which were causing build-time type conflicts.
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { createSmartAccountClient } = require("permissionless") as any;
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { createPimlicoClient } = require("permissionless/clients/pimlico") as any;
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { createPublicClient, http } = require("viem") as any;
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { privateKeyToAccount } = require("viem/accounts") as any;
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { to7702SimpleSmartAccount } = require("permissionless/accounts") as any;
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
    transport: http("https://celo.drpc.org")
})

const pimlicoUrl = `https://api.pimlico.io/v2/42220/rpc?apikey=${apiKey}`;

const pimlicoClient = createPimlicoClient({
    chain: celo,
    transport: http(pimlicoUrl),
})


// create a smart account from private key
export const createSmartAccount = async (privateKey: string) => {
    try {
        // create an owner from the private key
        const eoa7702 = privateKeyToAccount(privateKey);

        // create a 7702 simple smart account
        const simple7702Account = await to7702SimpleSmartAccount({
            client: publicClient,
            owner: eoa7702,
        });

        // create a smart account client
        const smartAccountClient = createSmartAccountClient({
            client: publicClient,
            chain: celo,
            account: simple7702Account,
            paymaster: pimlicoClient,
            bundlerTransport: http(
                `https://api.pimlico.io/v2/42220/rpc?apikey=${apiKey}`,
            ),
            userOperation: {
                estimateFeesPerGas: async () => {
                    return (await pimlicoClient.getUserOperationGasPrice()).fast;
                },
            },
        });

        // checking if its deployed
        const isSmartAccountDeployed = await smartAccountClient.account.isDeployed();

        // return the smart account client & smart account address
        return { smartAccountClient, simple7702Account, eoa7702, isSmartAccountDeployed, publicClient }
    } catch (error) {
        console.error("Error creating smart account:", error);
        throw error;
    }
}