import contractABI_data from "./chamaPay.json";
import goalContractABI_data from "./chamaPayGoal.json";
import { Attribution } from "ox/erc8021"
import dotenv from "dotenv"

dotenv.config()

export const explorerUrl = "https://basescan.org/tx/";
export const contractAddress = "0xf89c1312D9A92D84f2bFBF870089C29a09bC638A"; // base
export const USDCAddress = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913"; // base
export const contractABI = contractABI_data;

/** ChamaPayGoal UUPS proxy on Base */
export const goalContractAddress = "0xA0a22436221e60461b41279883067f4D8a6326dC";
export const goalContractImplementation = "0x20EcAf1ceD84206Eb4747C17e3A3d28DB7979f06";
export const goalContractABI = goalContractABI_data.abi;

export const EIP7702_IMPLEMENTATION_ADDRESS = "0xe6Cae83BdE06E4c305530e199D7217f42808555B";

const builderCode = process.env.BUILDER_CODE || "bc_b7k3p9da";
export const builderCodeDataSuffix = Attribution.toDataSuffix({
    codes: [builderCode],
})

export const moonwellUSDCAddress = "0xEdc817A28E8B93B03976FBd4a3dDBc9f7D176c22"; // Moonwell mUSDC on Base

export const ERC20_APPROVE_ABI = [{
  inputs: [
    { internalType: "address", name: "spender", type: "address" },
    { internalType: "uint256", name: "amount", type: "uint256" }
  ],
  name: "approve",
  outputs: [{ internalType: "bool", name: "", type: "bool" }],
  stateMutability: "nonpayable",
  type: "function"
}] as const;

export const MOONWELL_MINT_ABI = [{
  inputs: [{ internalType: "uint256", name: "mintAmount", type: "uint256" }],
  name: "mint",
  outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
  stateMutability: "nonpayable",
  type: "function"
}] as const;

/** Matches ChamaPayGoal.GoalType */
export const GoalType = {
  Personal: 0,
  Invite: 1,
  Public: 2,
} as const;

/** Matches ChamaPayGoal.WithdrawMode */
export const GoalWithdrawMode = {
  All: 0,
  YieldOnly: 1,
  PrincipalOnly: 2,
  Amount: 3,
} as const;