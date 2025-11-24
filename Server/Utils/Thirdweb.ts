// this file has the agent functions i.e set payout order, trigger check paydate fnctn

import { configDotenv } from "dotenv";
import {
  createThirdwebClient,
  getContract,
  getContractEvents,
  prepareContractCall,
  prepareEvent,
  sendTransaction,
  waitForReceipt,
} from "thirdweb";
import { celo } from "thirdweb/chains";
import { Abi } from "thirdweb/utils";
import { privateKeyToAccount, smartWallet } from "thirdweb/wallets";
import { contractABI, contractAddress } from "../Blockchain/Constants";

configDotenv();

const thirdwebClientId = process.env.THIRDWEB_CLIENT_ID;
const thirdwebSecretKey = process.env.THIRDWEB_SECRET_KEY;
const agentPrivateKey = process.env.AGENT_PRIVATE_KEY;
if (!thirdwebClientId || !thirdwebSecretKey || !agentPrivateKey) {
  throw new Error(
    "THIRDWEB_CLIENT_ID or THIRDWEB_SECRET_KEY or AGENT_PRIVATE_KEY is not set"
  );
}

const client = createThirdwebClient({ secretKey: thirdwebSecretKey });

const contract = getContract({
  client,
  chain: celo,
  address: contractAddress,
  abi: contractABI as Abi,
});

const smartWalletClient = smartWallet({
  chain: celo,
  sponsorGas: true, // enable sponsored transactions
});

const wallet = privateKeyToAccount({
  client,
  privateKey: agentPrivateKey as `0x${string}`,
});

const getAgentSmartWallet = async () => {
  const smartAccount = await smartWalletClient.connect({
    client,
    personalAccount: wallet, // pass the admin account
  });
  return smartAccount;
};

export const setPayoutOrder = async (
  chamaBlockchainId: number,
  memberAddresses: string[]
) => {
  try {
    const params = [
      BigInt(chamaBlockchainId),
      memberAddresses as unknown as `0x${string}`,
    ];
    const transaction = prepareContractCall({
      contract,
      method:
        "function setPayoutOrder(uint _chamaId, address[] memory _payoutOrder)",
      params: params as [bigint, `0x${string}`[]],
    });
    const activeAccount = await getAgentSmartWallet();
    const { transactionHash } = await sendTransaction({
      account: activeAccount,
      transaction: transaction,
    });
    const receipt = await waitForReceipt({
      client,
      chain: celo,
      transactionHash: transactionHash,
    });
    if (!receipt) {
      throw new Error("Failed to set payout order. No receipt found");
    }
    return receipt.transactionHash;
  } catch (error) {
    console.error("Error setting payout order:", error);
    throw error;
  }
};

export const triggerPayout = async (chamaBlockchainId: number) => {
  try {
    const params = [BigInt(chamaBlockchainId)];
    const transaction = prepareContractCall({
      contract,
      method: "function checkPayDate(uint[] memory chamaIds)",
      params: [params],
    });
    const activeAccount = await getAgentSmartWallet();
    const { transactionHash } = await sendTransaction({
      account: activeAccount,
      transaction: transaction,
    });
    const receipt = await waitForReceipt({
      client,
      chain: celo,
      transactionHash: transactionHash,
    });
    if (!receipt) {
      throw new Error("Failed to trigger payout. No receipt found");
    }
    return receipt;
  } catch (error) {
    console.error("Error triggering payout:", error);
    throw error;
  }
};

// Check if payout was a disburse or refund by querying events
export const checkPayoutResult = async (
  chamaBlockchainId: number,
  receipt: Awaited<ReturnType<typeof waitForReceipt>>
) => {
  try {
    const blockNumber = receipt.blockNumber;
    
    // Prepare events to query - using event signature strings
    const fundsDisbursedEvent = prepareEvent({
      signature: "event FundsDisbursed(uint indexed chamaId, address indexed recipient, uint amount)",
    });
    
    const refundIssuedEvent = prepareEvent({
      signature: "event RefundIssued(uint indexed chamaId, address indexed member, uint amount)",
    });
    
    const refundUpdatedEvent = prepareEvent({
      signature: "event RefundUpdated(uint indexed chamaId)",
    });

    // Query events from the transaction block
    const [disbursedEvents, refundIssuedEvents, refundUpdatedEvents] = await Promise.all([
      getContractEvents({
        contract,
        fromBlock: blockNumber,
        toBlock: blockNumber,
        events: [fundsDisbursedEvent],
      }),
      getContractEvents({
        contract,
        fromBlock: blockNumber,
        toBlock: blockNumber,
        events: [refundIssuedEvent],
      }),
      getContractEvents({
        contract,
        fromBlock: blockNumber,
        toBlock: blockNumber,
        events: [refundUpdatedEvent],
      }),
    ]);

    // Filter events for this specific chama
    const chamaIdBigInt = BigInt(chamaBlockchainId);
    
    const disbursedEvent = disbursedEvents.find(
      (event: any) => {
        const args = event.args as Record<string, unknown>;
        return args && (args.chamaId as bigint) === chamaIdBigInt;
      }
    );
    
    const refundIssued = refundIssuedEvents.find(
      (event: any) => {
        const args = event.args as Record<string, unknown>;
        return args && (args.chamaId as bigint) === chamaIdBigInt;
      }
    );
    
    const refundUpdated = refundUpdatedEvents.find(
      (event: any) => {
        const args = event.args as Record<string, unknown>;
        // RefundUpdated uses _chamaId with underscore
        return args && ((args._chamaId as bigint) === chamaIdBigInt || (args.chamaId as bigint) === chamaIdBigInt);
      }
    );

    // Get timestamp from block (we'll need to fetch block or use current time)
    const timestamp = Date.now(); // You can fetch block timestamp if needed

    // Check if it was a disburse
    if (disbursedEvent) {
      const args = disbursedEvent.args as Record<string, unknown>;
      return {
        type: "disburse" as const,
        recipient: args.recipient as string,
        amount: args.amount as bigint,
        timestamp: timestamp,
        transactionHash: receipt.transactionHash,
      };
    }

    // Check if it was a refund
    if (refundIssued || refundUpdated) {
      const refundArgs = refundIssued?.args as Record<string, unknown> | undefined;
      return {
        type: "refund" as const,
        timestamp: timestamp,
        transactionHash: receipt.transactionHash,
        // If refundIssued exists, we can get member and amount
        member: refundArgs?.member as string | undefined,
        amount: refundArgs?.amount as bigint | undefined,
      };
    }

    // If no events found, return unknown
    return {
      type: "unknown" as const,
      timestamp: timestamp,
      transactionHash: receipt.transactionHash,
    };
  } catch (error) {
    console.error("Error checking payout result:", error);
    throw error;
  }
};