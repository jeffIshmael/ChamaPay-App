
const { ethers, upgrades } = require("hardhat");

async function main() {
  const ChamapayV2 = await ethers.getContractFactory("ChamapayV2");
  const chamapay = await upgrades.upgradeProxy(CHAMAPAY_ADDRESS, ChamapayV2);
  console.log("Chamapay upgraded");
}

main();

// Uno => proxy - 0xF3a5E77DD4b4277c07591aB5dD6Fd15f98F6D3Fa , implementation - 0xEf71f9b683818f8fCEc53D00348D19cb084216f4