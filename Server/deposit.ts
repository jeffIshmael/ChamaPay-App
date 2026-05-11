import { createSmartAccount } from "./Blockchain/SmartAccount";
import {contractAddress, contractABI, USDCAddress} from "./Blockchain/Constants";
import {base} from "viem/chains";
import {createPublicClient,erc20Abi, parseUnits, http} from "viem";

import dotenv from "dotenv";
dotenv.config();

const privateKey = process.env.AGENT_PRIVATE_KEY!;

// create a public client
const publicClient = createPublicClient({
    chain: base,
    transport: http()
})

// deposit
const depositToChama = async () => {
    const { smartAccountClient, safeSmartAccount } = await createSmartAccount(privateKey);
    const amount = parseUnits("0.77", 6);
    // call approve function
    const approveTxHash = await smartAccountClient.writeContract({
        address: USDCAddress,
        abi: erc20Abi,
        functionName: "approve",
        args: [contractAddress, amount],
    });
    const approveReceipt = await publicClient.waitForTransactionReceipt({ hash: approveTxHash });
    console.log("Approve transaction receipt:", approveReceipt);

    if(!approveReceipt){
        console.log("Approve transaction failed");
        return;
    }

    const memberAddress = "0x4c8C5C4d4954dcCC81733b5b4f4C4Fe7B4733200" as `0x${string}`;
    const chamaId = BigInt(5);
    
    // lets now deposit
    const depositResult = await smartAccountClient.writeContract({
        address: contractAddress,
        abi: contractABI,
        functionName: "depositForMember",
        args: [memberAddress, chamaId, amount],
    })
    const depositReceipt = await publicClient.waitForTransactionReceipt({ hash: depositResult });
    console.log("Deposit transaction receipt:", depositReceipt);
}

depositToChama();