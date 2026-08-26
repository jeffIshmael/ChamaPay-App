/**
 * Base Sepolia ChamapayEscrow helpers for the FX test harness.
 * Uses plain EOA signers (viem) — does not touch the mainnet CDP client.
 */
import {
  createPublicClient,
  createWalletClient,
  http,
  parseUnits,
  formatUnits,
  type Address,
  type Hash,
  type Hex,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { baseSepolia } from "viem/chains";

export const OrderType = {
  ONRAMP: 0,
  OFFRAMP: 1,
} as const;

export type EscrowOrderType = (typeof OrderType)[keyof typeof OrderType];

export const OrderStatus = {
  PENDING: 0,
  ESCROWED: 1,
  SETTLED: 2,
  REFUNDED: 3,
  CANCELLED: 4,
} as const;

export const ORDER_STATUS_LABELS = [
  "PENDING",
  "ESCROWED",
  "SETTLED",
  "REFUNDED",
  "CANCELLED",
] as const;

const ERC20_ABI = [
  {
    type: "function",
    name: "approve",
    stateMutability: "nonpayable",
    inputs: [
      { name: "spender", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [{ name: "", type: "bool" }],
  },
  {
    type: "function",
    name: "allowance",
    stateMutability: "view",
    inputs: [
      { name: "owner", type: "address" },
      { name: "spender", type: "address" },
    ],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "function",
    name: "balanceOf",
    stateMutability: "view",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "function",
    name: "decimals",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint8" }],
  },
] as const;

const ESCROW_ABI = [
  {
    type: "function",
    name: "createOrder",
    stateMutability: "nonpayable",
    inputs: [
      { name: "_orderId", type: "bytes32" },
      { name: "_user", type: "address" },
      { name: "_token", type: "address" },
      { name: "_amount", type: "uint256" },
      { name: "_orderType", type: "uint8" },
      { name: "_messageHash", type: "string" },
    ],
    outputs: [],
  },
  {
    type: "function",
    name: "escrowFunds",
    stateMutability: "nonpayable",
    inputs: [{ name: "_orderId", type: "bytes32" }],
    outputs: [],
  },
  {
    type: "function",
    name: "settleOrder",
    stateMutability: "nonpayable",
    inputs: [{ name: "_orderId", type: "bytes32" }],
    outputs: [],
  },
  {
    type: "function",
    name: "refundOrder",
    stateMutability: "nonpayable",
    inputs: [{ name: "_orderId", type: "bytes32" }],
    outputs: [],
  },
  {
    type: "function",
    name: "getOrder",
    stateMutability: "view",
    inputs: [{ name: "_orderId", type: "bytes32" }],
    outputs: [
      {
        name: "",
        type: "tuple",
        components: [
          { name: "orderId", type: "bytes32" },
          { name: "user", type: "address" },
          { name: "token", type: "address" },
          { name: "amount", type: "uint256" },
          { name: "orderType", type: "uint8" },
          { name: "status", type: "uint8" },
          { name: "messageHash", type: "string" },
        ],
      },
    ],
  },
  {
    type: "function",
    name: "getContractBalance",
    stateMutability: "view",
    inputs: [{ name: "_token", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "function",
    name: "getTreasuryBalance",
    stateMutability: "view",
    inputs: [{ name: "_token", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "function",
    name: "getTreasuryAllowance",
    stateMutability: "view",
    inputs: [{ name: "_token", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "function",
    name: "agent",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "address" }],
  },
  {
    type: "function",
    name: "treasury",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "address" }],
  },
] as const;

export type EscrowOrder = {
  orderId: Hex;
  user: Address;
  token: Address;
  amount: bigint;
  orderType: number;
  status: number;
  messageHash: string;
};

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`[EscrowFunctions] Missing env var: ${name}`);
  }
  return value;
}

function normalizePrivateKey(key: string): Hex {
  const trimmed = key.trim();
  return (trimmed.startsWith("0x") ? trimmed : `0x${trimmed}`) as Hex;
}

export function getEscrowAddress(): Address {
  return requireEnv("ESCROW_ADDRESS") as Address;
}

export function getUsdcAddress(): Address {
  return (
    process.env.BASE_SEPOLIA_USDC ||
    "0x036CbD53842c5426634e7929541eC2318f3dCF7e"
  ) as Address;
}

export function getRpcUrl(): string {
  return process.env.BASE_SEPOLIA_RPC || "https://sepolia.base.org";
}

export function getPublicClient() {
  return createPublicClient({
    chain: baseSepolia,
    transport: http(getRpcUrl()),
  });
}

function walletFromKey(envName: string) {
  const account = privateKeyToAccount(normalizePrivateKey(requireEnv(envName)));
  const client = createWalletClient({
    account,
    chain: baseSepolia,
    transport: http(getRpcUrl()),
  });
  return { account, client };
}

export function getAgentWallet() {
  return walletFromKey("AGENT_PRIVATE_KEY");
}

export function getTreasuryWallet() {
  return walletFromKey("TREASURY_PRIVATE_KEY");
}

export function getTestUserWallet() {
  return walletFromKey("TEST_USER_PRIVATE_KEY");
}

async function waitForTx(hash: Hash): Promise<Hash> {
  console.log(`[Escrow] waiting for tx ${hash}`);
  await getPublicClient().waitForTransactionReceipt({ hash });
  return hash;
}

export async function getTokenDecimals(
  token: Address = getUsdcAddress()
): Promise<number> {
  return getPublicClient().readContract({
    address: token,
    abi: ERC20_ABI,
    functionName: "decimals",
  });
}

export function parseUsdc(amount: string | number, decimals = 6): bigint {
  return parseUnits(String(amount), decimals);
}

export function formatUsdc(amount: bigint, decimals = 6): string {
  return formatUnits(amount, decimals);
}

export async function getErc20Balance(
  owner: Address,
  token: Address = getUsdcAddress()
): Promise<bigint> {
  return getPublicClient().readContract({
    address: token,
    abi: ERC20_ABI,
    functionName: "balanceOf",
    args: [owner],
  });
}

export async function getErc20Allowance(
  owner: Address,
  spender: Address,
  token: Address = getUsdcAddress()
): Promise<bigint> {
  return getPublicClient().readContract({
    address: token,
    abi: ERC20_ABI,
    functionName: "allowance",
    args: [owner, spender],
  });
}

export async function approveToken(params: {
  privateKeyEnv:
    | "TREASURY_PRIVATE_KEY"
    | "TEST_USER_PRIVATE_KEY"
    | "AGENT_PRIVATE_KEY";
  spender: Address;
  amount: bigint;
  token?: Address;
}): Promise<Hash> {
  const token = params.token ?? getUsdcAddress();
  const { account, client } = walletFromKey(params.privateKeyEnv);
  console.log(
    `[Escrow] approve ${formatUsdc(params.amount)} from ${account.address} → ${params.spender}`
  );
  const hash = await client.writeContract({
    address: token,
    abi: ERC20_ABI,
    functionName: "approve",
    args: [params.spender, params.amount],
    account,
    chain: baseSepolia,
  });
  return waitForTx(hash);
}

export async function ensureAllowance(params: {
  privateKeyEnv: "TREASURY_PRIVATE_KEY" | "TEST_USER_PRIVATE_KEY";
  owner: Address;
  spender: Address;
  amount: bigint;
  token?: Address;
}): Promise<Hash | null> {
  const token = params.token ?? getUsdcAddress();
  const current = await getErc20Allowance(params.owner, params.spender, token);
  if (current >= params.amount) {
    console.log(
      `[Escrow] allowance OK (${formatUsdc(current)} >= ${formatUsdc(params.amount)})`
    );
    return null;
  }
  return approveToken({
    privateKeyEnv: params.privateKeyEnv,
    spender: params.spender,
    amount: params.amount,
    token,
  });
}

export async function createOrder(params: {
  orderId: Hex;
  user: Address;
  amount: bigint;
  orderType: EscrowOrderType;
  messageHash: string;
  token?: Address;
}): Promise<Hash> {
  const escrow = getEscrowAddress();
  const token = params.token ?? getUsdcAddress();
  const { account, client } = getAgentWallet();
  console.log("[Escrow] createOrder", {
    orderId: params.orderId,
    user: params.user,
    amount: formatUsdc(params.amount),
    orderType: params.orderType === OrderType.ONRAMP ? "ONRAMP" : "OFFRAMP",
    agent: account.address,
  });
  const hash = await client.writeContract({
    address: escrow,
    abi: ESCROW_ABI,
    functionName: "createOrder",
    args: [
      params.orderId,
      params.user,
      token,
      params.amount,
      params.orderType,
      params.messageHash,
    ],
    account,
    chain: baseSepolia,
  });
  return waitForTx(hash);
}

export async function escrowFunds(params: {
  orderId: Hex;
  /** Who calls escrowFunds after approving (treasury for ONRAMP, user for OFFRAMP) */
  callerPrivateKeyEnv: "TREASURY_PRIVATE_KEY" | "TEST_USER_PRIVATE_KEY";
}): Promise<Hash> {
  const escrow = getEscrowAddress();
  const { account, client } = walletFromKey(params.callerPrivateKeyEnv);
  console.log("[Escrow] escrowFunds", {
    orderId: params.orderId,
    caller: account.address,
  });
  const hash = await client.writeContract({
    address: escrow,
    abi: ESCROW_ABI,
    functionName: "escrowFunds",
    args: [params.orderId],
    account,
    chain: baseSepolia,
  });
  return waitForTx(hash);
}

export async function settleOrder(orderId: Hex): Promise<Hash> {
  const escrow = getEscrowAddress();
  const { account, client } = getAgentWallet();
  console.log("[Escrow] settleOrder", { orderId, agent: account.address });
  const hash = await client.writeContract({
    address: escrow,
    abi: ESCROW_ABI,
    functionName: "settleOrder",
    args: [orderId],
    account,
    chain: baseSepolia,
  });
  return waitForTx(hash);
}

export async function refundOrder(orderId: Hex): Promise<Hash> {
  const escrow = getEscrowAddress();
  const { account, client } = getAgentWallet();
  console.log("[Escrow] refundOrder", { orderId, agent: account.address });
  const hash = await client.writeContract({
    address: escrow,
    abi: ESCROW_ABI,
    functionName: "refundOrder",
    args: [orderId],
    account,
    chain: baseSepolia,
  });
  return waitForTx(hash);
}

export async function getOrder(orderId: Hex): Promise<EscrowOrder> {
  const result = await getPublicClient().readContract({
    address: getEscrowAddress(),
    abi: ESCROW_ABI,
    functionName: "getOrder",
    args: [orderId],
  });
  return result as EscrowOrder;
}

export async function getEscrowBalance(
  token: Address = getUsdcAddress()
): Promise<bigint> {
  return getPublicClient().readContract({
    address: getEscrowAddress(),
    abi: ESCROW_ABI,
    functionName: "getContractBalance",
    args: [token],
  });
}

export async function getTreasuryBalanceOnChain(
  token: Address = getUsdcAddress()
): Promise<bigint> {
  return getPublicClient().readContract({
    address: getEscrowAddress(),
    abi: ESCROW_ABI,
    functionName: "getTreasuryBalance",
    args: [token],
  });
}

export async function getTreasuryAllowanceOnChain(
  token: Address = getUsdcAddress()
): Promise<bigint> {
  return getPublicClient().readContract({
    address: getEscrowAddress(),
    abi: ESCROW_ABI,
    functionName: "getTreasuryAllowance",
    args: [token],
  });
}

export async function getEscrowRoles(): Promise<{
  agent: Address;
  treasury: Address;
}> {
  const client = getPublicClient();
  const escrow = getEscrowAddress();
  const [agent, treasury] = await Promise.all([
    client.readContract({
      address: escrow,
      abi: ESCROW_ABI,
      functionName: "agent",
    }),
    client.readContract({
      address: escrow,
      abi: ESCROW_ABI,
      functionName: "treasury",
    }),
  ]);
  return { agent: agent as Address, treasury: treasury as Address };
}

export async function dumpFxBalances(user?: Address): Promise<{
  treasuryUsdc: string;
  treasuryAllowance: string;
  escrowUsdc: string;
  userUsdc?: string;
  agent: Address;
  treasury: Address;
  usdcLowWatermark: number;
  belowUsdcWatermark: boolean;
}> {
  const token = getUsdcAddress();
  const roles = await getEscrowRoles();
  const [treasuryBal, allowance, escrowBal, userBal] = await Promise.all([
    getTreasuryBalanceOnChain(token),
    getTreasuryAllowanceOnChain(token),
    getEscrowBalance(token),
    user ? getErc20Balance(user, token) : Promise.resolve(null),
  ]);

  const treasuryUsdc = formatUsdc(treasuryBal);
  const usdcLowWatermark = Number(process.env.FX_USDC_LOW_WATERMARK || "200");
  const belowUsdcWatermark = Number(treasuryUsdc) < usdcLowWatermark;

  const snapshot = {
    treasuryUsdc,
    treasuryAllowance: formatUsdc(allowance),
    escrowUsdc: formatUsdc(escrowBal),
    ...(userBal !== null ? { userUsdc: formatUsdc(userBal) } : {}),
    agent: roles.agent,
    treasury: roles.treasury,
    usdcLowWatermark,
    belowUsdcWatermark,
  };

  console.log("[FX balances]", snapshot);
  if (belowUsdcWatermark) {
    console.warn(
      `⚠️ WARNING: USDC Treasury is below $${usdcLowWatermark} (current: $${treasuryUsdc})`
    );
  }

  return snapshot;
}
