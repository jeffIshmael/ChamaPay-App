// the blockchain functions of interest are :- setting payout order, triggering payout function
import { erc20Abi } from "viem";
import { getAgentSmartWallet } from "../Blockchain/AgentWallet";
import { contractABI, contractAddress, USDCAddress } from "../Blockchain/Constants";
import { EIP7702Client } from "../Blockchain/EIP7702Client";

// function to set payout order
export const pimlicoSetPayoutOrder = async (
  chamaBlockchainId: number,
  memberAddresses: string[]
) => {
  try {
    const { client } = await getAgentSmartWallet();

    // we need to map the string array to make it 0x..
    const bcAddresses = memberAddresses.map((addr) => addr as `0x${string}`);

    const callData = EIP7702Client.encodeCallData(
      contractABI,
      "setPayoutOrder",
      [BigInt(chamaBlockchainId), bcAddresses]
    );

    const hash = await client.sendTransaction({
      to: contractAddress as `0x${string}`,
      data: callData,
    });

    // we need to make sure that the tx has been added to the blockchain
    const transaction = await client.waitForTransaction(hash);

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
    const { client } = await getAgentSmartWallet();

    const callData = EIP7702Client.encodeCallData(
      contractABI,
      "addMemberToPayoutOrder",
      [chamaBlockchainId, memberAddress as `0x${string}`]
    );

    const hash = await client.sendTransaction({
      to: contractAddress as `0x${string}`,
      data: callData,
    });

    // we need to make sure that the tx has been added to the blockchain
    const transaction = await client.waitForTransaction(hash);

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
    const { client } = await getAgentSmartWallet();

    // map the numbers to change them to bigint
    const blockchainIds = chamaBlockchainIds.map((num) => BigInt(num));

    const callData = EIP7702Client.encodeCallData(
      contractABI,
      "checkPayDate",
      [blockchainIds]
    );

    const hash = await client.sendTransaction({
      to: contractAddress as `0x${string}`,
      data: callData,
    });

    // we need to make sure that the tx has been added to the blockchain
    const transaction = await client.waitForTransaction(hash);

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
    const { client } = await getAgentSmartWallet();

    // I need to first send approve function
    const approveCallData = EIP7702Client.encodeCallData(
      erc20Abi,
      "approve",
      [contractAddress, amount]
    );

    const approveHash = await client.sendTransaction({
      to: USDCAddress,
      data: approveCallData,
    });

    // we need to make sure that the tx has been added to the blockchain
    const approveTransaction = await client.waitForTransaction(approveHash);

    if (!approveTransaction) {
      throw new Error("unable to get the process approve agent transaction");
    }

    // Now deposit for member
    const depositCallData = EIP7702Client.encodeCallData(
      contractABI,
      "depositForMember",
      [memberAddress, BigInt(chamaBlockchainId), amount]
    );

    const hash = await client.sendTransaction({
      to: contractAddress as `0x${string}`,
      data: depositCallData,
    });

    // we need to make sure that the tx has been added to the blockchain
    const transaction = await client.waitForTransaction(hash);

    if (!transaction) {
      throw new Error("unable to get the process deposit for user agent transaction");
    }

    return transaction;
  } catch (error) {
    console.error("Error processing agent deposit user tx:", error);
    throw error;
  }
};
