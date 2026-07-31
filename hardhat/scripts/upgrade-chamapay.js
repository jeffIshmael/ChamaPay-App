
const { ethers, upgrades } = require("hardhat");

async function main() {
  const [deployer] = await ethers.getSigners();
  const balance = await ethers.provider.getBalance(deployer.address);
  console.log("Deployer address:", deployer.address);
  console.log("Deployer balance:", ethers.formatEther(balance), "ETH");

  const NewChamapay = await ethers.getContractFactory("ChamaPay");
  const chamapay = await upgrades.upgradeProxy("0xf89c1312D9A92D84f2bFBF870089C29a09bC638A", NewChamapay);
  console.log("Chamapay upgraded");
}

main();


// npx hardhat run scripts/upgrade-chamapay.js --network base
// Uno => proxy - 0xf89c1312D9A92D84f2bFBF870089C29a09bC638A , implementation - 0xEf71f9b683818f8fCEc53D00348D19cb084216f4