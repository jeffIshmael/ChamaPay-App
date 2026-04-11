import contractABI_data from "./chamaPay.json";
import { Attribution } from "ox/erc8021"
import dotenv from "dotenv"

dotenv.config()

export const explorerUrl = "https://basescan.org/tx/";
export const contractAddress = "0xf89c1312D9A92D84f2bFBF870089C29a09bC638A"; // base
export const cUSDAddress = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913"; // base USDC
export const USDCAddress = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913"; // base
export const contractABI = contractABI_data;

export const EIP7702_IMPLEMENTATION_ADDRESS = "0xe6Cae83BdE06E4c305530e199D7217f42808555B";

const builderCode = process.env.BUILDER_CODE || "bc_b7k3p9da";
export const builderCodeDataSuffix = Attribution.toDataSuffix({
    codes: [builderCode],
})