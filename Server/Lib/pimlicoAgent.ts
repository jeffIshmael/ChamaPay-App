// the blockchain functions of interest are :- setting payout order, triggering payout function
import { getAgentSmartWallet } from "../Blockchain/AgentWallet";
import { contractAddress, contractABI, USDCAddress } from "../Blockchain/Constants";
import { getAddress, createPublicClient, http, erc20Abi } from "viem";
import { celo } from "viem/chains";

const publicClient = createPublicClient({
  chain: celo,
  transport: http(),
});

// function to set payout order
export const pimlicoSetPayoutOrder = async (
  chamaBlockchainId: number,
  memberAddresses: string[]
) => {
  try {
    const agentSmartAccountClient = await getAgentSmartWallet();
    // we need to map the string array to make it 0x..
    const bcAddresses = memberAddresses.map((addr) => addr as `0x${string}`);
    const hash = await agentSmartAccountClient.writeContract({
      address: contractAddress,
      abi: contractABI,
      functionName: "setPayoutOrder",
      args: [BigInt(chamaBlockchainId), bcAddresses],
    });
    // we need to make sure that the tx has been added to the bockchain
    const transaction = await publicClient.waitForTransactionReceipt({
      hash: hash,
    });
    if (!transaction) {
      throw new Error("unable to get the set payout order transaction");
    }
    return transaction.transactionHash;
  } catch (error) {
    console.error("Error setting payout order:", error);
    throw error;
  }
};

// function to add member to payout order
export const pimlicoAddMemberToPayoutOrder = async (
  chamaBlockchainId: number,
  memberAddress: string
) => {
  try {
    const agentSmartAccountClient = await getAgentSmartWallet();

    const hash = await agentSmartAccountClient.writeContract({
      address: contractAddress,
      abi: contractABI,
      functionName: "addMemberToPayoutOrder",
      args: [chamaBlockchainId, memberAddress as `0x${string}`],
    });
    // we need to make sure that the tx has been added to the bockchain
    const transaction = await publicClient.waitForTransactionReceipt({
      hash: hash,
    });

    if (!transaction) {
      throw new Error(
        "unable to get the add member to payout order transaction"
      );
    }

    return transaction.transactionHash;
  } catch (error) {
    console.error("Error adding member to payout order:", error);
    throw error;
  }
};

// function to process payout
export const pimlicoProcessPayout = async (chamaBlockchainIds: number[]) => {
  try {
    const agentSmartAccountClient = await getAgentSmartWallet();
    // map the numbers to change them to bigint
    const blockchainIds = chamaBlockchainIds.map((num) => BigInt(num));
    const hash = await agentSmartAccountClient.writeContract({
      address: contractAddress,
      abi: contractABI,
      functionName: "checkPayDate",
      args: [blockchainIds],
    });
    // we need to make sure that the tx has been added to the bockchain
    const transaction = await publicClient.waitForTransactionReceipt({
      hash: hash,
    });

    if (!transaction) {
      throw new Error("unable to get the process payout transaction");
    }

    return transaction;
  } catch (error) {
    console.error("Error processing payout:", error);
    throw error;
  }
};

// function to trigger deposit for user
export const pimlicoDepositForUser = async (
  chamaBlockchainId: number,
  memberAddress: `0x${string}`,
  amount: bigint
) => {
  try {
    const agentSmartAccountClient = await getAgentSmartWallet();
    // I need to first send approve fnctn
    const approveHash = await agentSmartAccountClient.writeContract({
      address: USDCAddress,
      abi: erc20Abi,
      functionName: "approve",
      args: [contractAddress, amount],
    });
    // we need to make sure that the tx has been added to the blockchain
    const approveTransaction = await publicClient.waitForTransactionReceipt({
      hash: approveHash,
    });
    if (!approveTransaction) {
      throw new Error("unable to get the process approve agent transaction");
    }
    const hash = await agentSmartAccountClient.writeContract({
      address: contractAddress,
      abi: contractABI,
      functionName: "depositForMember",
      args: [memberAddress, BigInt(chamaBlockchainId), amount],
    });
    // we need to make sure that the tx has been added to the blockchain
    const transaction = await publicClient.waitForTransactionReceipt({
      hash: hash,
    });

    if (!transaction) {
      throw new Error("unable to get the process deposit for user agent transaction");
    }
    return transaction;
  } catch (error) {
    console.error("Error processing agent deposit user tx:", error);
    throw error;
  }
};
