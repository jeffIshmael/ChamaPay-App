// the blockchain functions of interest are :- setting payout order, triggering payout function
import { erc20Abi, createPublicClient, http } from "viem";
import { getAgentSmartWallet } from "../Blockchain/AgentWallet";
import { contractABI, contractAddress, USDCAddress, builderCodeDataSuffix } from "../Blockchain/Constants";
import { base } from "viem/chains";

const publicClient = createPublicClient({
  chain: base,
  transport: http()
})

// function to set payout order
export const pimlicoSetPayoutOrder = async (
  chamaBlockchainId: number,
  memberAddresses: string[]
) => {
  try {
    const { smartAccountClient, agentSmartWallet, authorization } = await getAgentSmartWallet();
    console.log("agentSmartWallet", agentSmartWallet.address);

    // we need to map the string array to make it 0x..
    const bcAddresses = memberAddresses.map((addr) => addr as `0x${string}`);
    console.log("bcAddresses", bcAddresses);

    const setPayoutOrderHash = await smartAccountClient.writeContract({
      address: contractAddress,
      abi: contractABI,
      functionName: "setPayoutOrder",
      args: [BigInt(chamaBlockchainId), bcAddresses],
      dataSuffix: builderCodeDataSuffix,
      ...(authorization ? { authorizationList: [authorization] } : {}),
    });

    // we need to make sure that the tx has been added to the blockchain
    const transaction = await publicClient.waitForTransactionReceipt({
      hash: setPayoutOrderHash
    });

    if (!transaction) {
      throw new Error("unable to get the set payout order transaction");
    }

    return transaction;
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
    const { smartAccountClient, authorization } = await getAgentSmartWallet();



     const addMemberToPayoutOrderHash = await smartAccountClient.writeContract({
      address: contractAddress,
      abi: contractABI,
      functionName: "addMemberToPayoutOrder",
      args: [BigInt(chamaBlockchainId), memberAddress],
      dataSuffix: builderCodeDataSuffix,
      ...(authorization ? { authorizationList: [authorization] } : {}),
    });

    const addMemberToPayoutOrderTransaction = await publicClient.waitForTransactionReceipt({
      hash: addMemberToPayoutOrderHash
    })

    if (!addMemberToPayoutOrderTransaction) {
      throw new Error(
        "unable to get the add member to payout order transaction"
      );
    }

    return addMemberToPayoutOrderTransaction.transactionHash;
  } catch (error) {
    console.error("Error adding member to payout order:", error);
    throw error;
  }
};

// function to process payout
export const pimlicoProcessPayout = async (chamaBlockchainIds: number[]) => {
  try {
    const { smartAccountClient, authorization } = await getAgentSmartWallet();

    // map the numbers to change them to bigint
    const blockchainIds = chamaBlockchainIds.map((num) => BigInt(num));



 const checkPayDateHash = await smartAccountClient.writeContract({
      address: contractAddress,
      abi: contractABI,
      functionName: "checkPayDate",
      args: [blockchainIds],
      dataSuffix: builderCodeDataSuffix,
      ...(authorization ? { authorizationList: [authorization] } : {}),
    });

    const checkPayDateTransaction = await publicClient.waitForTransactionReceipt({
      hash: checkPayDateHash
    })

    if (!checkPayDateTransaction) {
      throw new Error("unable to get the check paydate transaction");
    }

    return checkPayDateTransaction;
  } catch (error) {
    console.error("Error checking paydate:", error);
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
    const { smartAccountClient, authorization } = await getAgentSmartWallet();

    // I need to first send approve function
    const approveHash = await smartAccountClient.writeContract({
      address: USDCAddress,
      abi: erc20Abi,
      functionName: "approve",
      args: [contractAddress as `0x${string}`, amount],
      dataSuffix: builderCodeDataSuffix,
      ...(authorization ? { authorizationList: [authorization] } : {}),
    });

    const approveTransaction = await publicClient.waitForTransactionReceipt({
      hash: approveHash
    })

    if (!approveTransaction) {
      throw new Error("unable to get the process approve agent transaction");
    }

    // Now deposit for member
    const depositForMemberHash = await smartAccountClient.writeContract({
      address: contractAddress,
      abi: contractABI,
      functionName: "depositForMember",
      args: [chamaBlockchainId, memberAddress, amount],
      dataSuffix: builderCodeDataSuffix,
      ...(authorization ? { authorizationList: [authorization] } : {}),
    });

    const depositForMemberTransaction = await publicClient.waitForTransactionReceipt({
      hash: depositForMemberHash
    })

    if (!depositForMemberTransaction) {
      throw new Error("unable to get the process deposit for user agent transaction");
    }

    return depositForMemberTransaction.transactionHash;
  } catch (error) {
    console.error("Error processing agent deposit user tx:", error);
    throw error;
  }
};

// function to add locked funds to a chama
export const pimlicoAddLockedFundsToChama = async (
  memberAddress: `0x${string}`,
  chamaBlockchainId: number,
  amount: bigint
) => {
  try {
    const { smartAccountClient, authorization } = await getAgentSmartWallet();

    const addLockedFundsToChamaHash = await smartAccountClient.writeContract({
      address: contractAddress,
      abi: contractABI,
      functionName: "updateLockedAmount",
      args: [memberAddress,chamaBlockchainId, amount],
      dataSuffix: builderCodeDataSuffix,
      ...(authorization ? { authorizationList: [authorization] } : {}),
    });

    const addLockedFundsToChamaTransaction = await publicClient.waitForTransactionReceipt({
      hash: addLockedFundsToChamaHash
    })

    if (!addLockedFundsToChamaTransaction) {
      throw new Error("unable to get the process add locked funds to chama agent transaction");
    }

    return addLockedFundsToChamaTransaction.transactionHash;
  } catch (error) {
    console.error("Error processing agent add locked funds to chama tx:", error);
    throw error;
  }
};
