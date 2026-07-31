
export const chamapayContractAddress = "0xF3a5E77DD4b4277c07591aB5dD6Fd15f98F6D3Fa";
export const usdcAddress = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913"; // USDC on base
export const pretiumSettlementAddress = "0x8005ee53E57aB11E11eAA4EFe07Ee3835Dc02F98" as `0x${string}`; 

export const moonwellUSDCAddress = "0xEdc817A28E8B93B03976FBd4a3dDBc9f7D176c22"; // Moonwell mUSDC on Base
export const ERC20_APPROVE_ABI = {
  inputs: [
    { internalType: "address", name: "spender", type: "address" },
    { internalType: "uint256", name: "amount", type: "uint256" }
  ],
  name: "approve",
  outputs: [{ internalType: "bool", name: "", type: "bool" }],
  stateMutability: "nonpayable",
  type: "function"
} as const;

export const MOONWELL_MINT_ABI = {
  inputs: [{ internalType: "uint256", name: "mintAmount", type: "uint256" }],
  name: "mint",
  outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
  stateMutability: "nonpayable",
  type: "function"
} as const;

export const MOONWELL_REDEEM_UNDERLYING_ABI = {
  inputs: [{ internalType: "uint256", name: "redeemAmount", type: "uint256" }],
  name: "redeemUnderlying",
  outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
  stateMutability: "nonpayable",
  type: "function"
} as const;
