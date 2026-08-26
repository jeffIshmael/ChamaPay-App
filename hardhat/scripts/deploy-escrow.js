const { ethers, upgrades } = require("hardhat");
require("dotenv").config();

function cleanAddress(value, label) {
  if (!value) throw new Error(`Missing ${label}`);
  const address = value.trim().split(/\s+/)[0];
  if (!ethers.isAddress(address)) {
    throw new Error(`Invalid ${label}: ${value}`);
  }
  return ethers.getAddress(address);
}

async function main() {
  const [deployer] = await ethers.getSigners();
  const balance = await ethers.provider.getBalance(deployer.address);
  const network = await ethers.provider.getNetwork();
  
  console.log("Deploying ChamaPayEscrow with account:", deployer.address);
  console.log("Network:", network.name, "chainId:", network.chainId.toString());
  console.log("Deployer balance:", ethers.formatEther(balance), "ETH");

  const agentWallet = cleanAddress(process.env.AGENT_WALLET, "AGENT_WALLET");
  const treasuryWallet = cleanAddress(
    process.env.CHAMAPAY_TREASURY_WALLET,
    "CHAMAPAY_TREASURY_WALLET"
  );
  
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
  const implementationAddress = await upgrades.erc1967.getImplementationAddress(proxyAddress);
  
  console.log("🚀 ChamaPayEscrow Proxy deployed to:", proxyAddress);
  console.log("Implementation:", implementationAddress);
  console.log("Verify with:");
  console.log(`npx hardhat verify --network baseSepolia ${implementationAddress}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

// Run with:
// npx hardhat run scripts/deploy-escrow.js --network base
