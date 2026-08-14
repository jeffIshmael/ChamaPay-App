// the blockchain functions of interest are :- setting payout order, triggering payout function
import { erc20Abi, createPublicClient, http, TransactionReceipt, parseEventLogs } from "viem";
import { getAgentSmartWallet, getTreasurySmartWallet } from "../Blockchain/AgentWallet";
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
      ...(authorization ? { authorization } : {}),
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
      ...(authorization ? { authorization } : {}),
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
    console.log(`Starting payout process for chama blockchain IDs: ${chamaBlockchainIds.join(", ")}`);
    const { smartAccountClient, authorization } = await getAgentSmartWallet();
    console.log(`Agent smart wallet initialized. Client address: ${smartAccountClient.account?.address}`);

    // map the numbers to change them to bigint
    const blockchainIds = chamaBlockchainIds.map((num) => BigInt(num));
    console.log(`Mapped blockchain IDs to BigInt:`, blockchainIds);

    const checkPayDateHash = await smartAccountClient.writeContract({
      address: contractAddress,
      abi: contractABI,
      functionName: "checkPayDate",
      args: [blockchainIds],
      dataSuffix: builderCodeDataSuffix,
      ...(authorization ? { authorization } : {}),
    });

    console.log(`Transaction submitted successfully. Hash: ${checkPayDateHash}`);
    console.log(`Waiting for transaction receipt...`);

    const checkPayDateTransaction = await publicClient.waitForTransactionReceipt({
      hash: checkPayDateHash
    })

    console.log(`Transaction receipt received. Status: ${checkPayDateTransaction.status}`);

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
    const { smartAccountClient, agentSmartWallet, authorization } = await getAgentSmartWallet();

    console.log("the smartAccountClient", smartAccountClient);
    console.log("the agentAddress", agentSmartWallet.address);

    // I need to first send approve function
    const approveHash = await smartAccountClient.writeContract({
      address: USDCAddress,
      abi: erc20Abi,
      functionName: "approve",
      args: [contractAddress as `0x${string}`, amount],
      dataSuffix: builderCodeDataSuffix,
      ...(authorization ? { authorization } : {}),
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
      args: [memberAddress, BigInt(chamaBlockchainId), amount],
      dataSuffix: builderCodeDataSuffix,
      ...(authorization ? { authorization } : {}),
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

// function to trigger direct wallet transfer (deposit) for user
export const pimlicoTransferToUser = async (
  memberAddress: `0x${string}`,
  amount: bigint
) => {
  try {
    const { smartAccountClient, authorization } = await getAgentSmartWallet();

    const transferHash = await smartAccountClient.writeContract({
      address: USDCAddress,
      abi: erc20Abi,
      functionName: "transfer",
      args: [memberAddress, amount],
      dataSuffix: builderCodeDataSuffix,
      ...(authorization ? { authorization } : {}),
    });

    const transferTransaction = await publicClient.waitForTransactionReceipt({
      hash: transferHash
    });

    if (!transferTransaction) {
      throw new Error("unable to get the transfer transaction");
    }

    return transferTransaction.transactionHash;
  } catch (error) {
    console.error("Error processing agent transfer to user tx:", error);
    throw error;
  }
};

export const treasuryTransferToUser = async (
  memberAddress: `0x${string}`,
  amount: bigint
) => {
  try {
    const { smartAccountClient, authorization } = await getTreasurySmartWallet();

    const transferHash = await smartAccountClient.writeContract({
      address: USDCAddress,
      abi: erc20Abi,
      functionName: "transfer",
      args: [memberAddress, amount],
      dataSuffix: builderCodeDataSuffix,
      ...(authorization ? { authorization } : {}),
    });

    const transferTransaction = await publicClient.waitForTransactionReceipt({
      hash: transferHash
    });

    if (!transferTransaction) {
      throw new Error("unable to get the treasury transfer transaction");
    }

    return transferTransaction.transactionHash;
  } catch (error) {
    console.error("Error processing treasury transfer to user tx:", error);
    throw error;
  }
};

// Check if payout was a disburse or refund by querying events
export const checkPayoutResult = async (
  chamaBlockchainId: number,
  receipt: TransactionReceipt
) => {
  try {
    console.log(`Checking payout result for chamaBlockchainId: ${chamaBlockchainId}, TxHash: ${receipt.transactionHash}`);
    
    const logs = parseEventLogs({
      abi: contractABI,
      logs: receipt.logs,
    }) as any[];
    
    console.log(`Parsed ${logs.length} events from transaction logs.`);

    const chamaIdBigInt = BigInt(chamaBlockchainId);
    const timestamp = Date.now();

    const disbursedEvent = logs.find(
      (log) =>
        log.eventName === "FundsDisbursed" &&
        (log.args as any).chamaId === chamaIdBigInt
    );

    if (disbursedEvent) {
      console.log(`Found FundsDisbursed event for chamaId ${chamaBlockchainId}`);
      const args = disbursedEvent.args as any;
      return {
        type: "disburse" as const,
        recipient: args.recipient as string,
        amount: args.amount as bigint,
        timestamp: timestamp,
        transactionHash: receipt.transactionHash,
      };
    }

    const refundIssuedEvent = logs.find(
      (log) =>
        log.eventName === "RefundIssued" &&
        (log.args as any).chamaId === chamaIdBigInt
    );

    const refundUpdatedEvent = logs.find(
      (log) =>
        log.eventName === "RefundUpdated" &&
        ((log.args as any)._chamaId === chamaIdBigInt ||
          (log.args as any).chamaId === chamaIdBigInt)
    );

    if (refundIssuedEvent || refundUpdatedEvent) {
      console.log(`Found refund event for chamaId ${chamaBlockchainId}`);
      const refundArgs = refundIssuedEvent?.args as any;
      return {
        type: "refund" as const,
        timestamp: timestamp,
        transactionHash: receipt.transactionHash,
        member: refundArgs?.member as string | undefined,
        amount: refundArgs?.amount as bigint | undefined,
      };
    }

    const payDateCheckedEvent = logs.find(
      (log) =>
        log.eventName === "PayDateChecked" &&
        ((log.args as any)._chamaId === chamaIdBigInt ||
          (log.args as any).chamaId === chamaIdBigInt)
    );

    if (payDateCheckedEvent) {
      console.log(`Found PayDateChecked event for chamaId ${chamaBlockchainId} (Not ready for payout)`);
      return {
        type: "not_ready" as const,
        timestamp: timestamp,
        transactionHash: receipt.transactionHash,
      };
    }

    console.log(`No matched payout event found for chamaId ${chamaBlockchainId}, returning unknown type.`);
    return {
      type: "unknown" as const,
      timestamp: timestamp,
      transactionHash: receipt.transactionHash,
    };
  } catch (error) {
    console.error(`Error checking payout result for chamaId ${chamaBlockchainId}:`, error);
    console.error("Error checking payout result:", error);
    throw error;
  }
};

