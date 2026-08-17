const { ethers, upgrades } = require("hardhat");

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Upgrading ChamaPayEscrow with account:", deployer.address);

  const PROXY_ADDRESS = "0xEAcCd3cA80C2a9552B57b62e22035aF18bca2746";

  const NewChamapayEscrow = await ethers.getContractFactory("ChamapayEscrow");
  console.log("Upgrading proxy at:", PROXY_ADDRESS);
  
  const upgraded = await upgrades.upgradeProxy(PROXY_ADDRESS, NewChamapayEscrow);
  
  console.log("✅ ChamapayEscrow successfully upgraded!");
  console.log("Proxy Address remains:", await upgraded.getAddress());
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

// Run with:
// npx hardhat run scripts/upgrade-escrow.js --network base
