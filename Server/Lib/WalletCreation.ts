// This file contains a function to create the user's wallet
import { ethers, Wallet } from "ethers";

// Creates a new wallet for a new user
export const getWallets = (): Wallet => {
  const randomWallet: Wallet = ethers.Wallet.createRandom();
  return randomWallet;
};

// Export as default for backward compatibility
export default { getWallets }; 