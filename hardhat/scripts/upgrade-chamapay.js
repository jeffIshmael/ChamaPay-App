
const { ethers, upgrades } = require("hardhat");

async function main() {
  const NewChamapay = await ethers.getContractFactory("ChamaPay");
  const chamapay = await upgrades.upgradeProxy("0xF3a5E77DD4b4277c07591aB5dD6Fd15f98F6D3Fa", NewChamapay);
  console.log("Chamapay upgraded");
}

main();


// npx hardhat run scripts/upgrade-chamapay.js --network celo
// Uno => proxy - 0xF3a5E77DD4b4277c07591aB5dD6Fd15f98F6D3Fa , implementation - 0xEf71f9b683818f8fCEc53D00348D19cb084216f4