const { ethers, upgrades } = require("hardhat");
require("dotenv").config({ path: '../Server/.env' });

async function main() {
  const [deployer] = await ethers.getSigners();
  const balance = await ethers.provider.getBalance(deployer.address);
  
  console.log("Deploying ChamaPayEscrow with account:", deployer.address);
  console.log("Deployer balance:", ethers.formatEther(balance), "ETH");

  // Hardcoded as requested
  const agentWallet = process.env.AGENT_WALLET;
  
  // Pulled from Server/.env or hardcoded fallback
  const treasuryWallet = process.env.CHAMAPAY_TREASURY_WALLET; 
  
  // The deployer starts as the owner to allow future upgrades/pausing
  const initialOwner = deployer.address; 

  console.log("--- Roles ---");
  console.log("Owner (Admin):", initialOwner);
  console.log("Agent (CDP):", agentWallet);
  console.log("Treasury (EOA):", treasuryWallet);
  console.log("-------------");

  const ChamaPayEscrow = await ethers.getContractFactory("ChamapayEscrow");
  
  // Deploy the UUPS proxy
  const escrow = await upgrades.deployProxy(ChamaPayEscrow, [initialOwner, agentWallet, treasuryWallet], {
    kind: "uups",
  });

  await escrow.waitForDeployment();
  const proxyAddress = await escrow.getAddress();
  
  console.log("🚀 ChamaPayEscrow Proxy deployed to:", proxyAddress);
  console.log("Run this command to verify:");
  console.log(`npx hardhat verify --network base ${proxyAddress}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

// Run with:
// npx hardhat run scripts/deploy-escrow.js --network base
