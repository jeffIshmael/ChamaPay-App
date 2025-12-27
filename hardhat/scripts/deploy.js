const { ethers, upgrades } = require("hardhat");

async function main() {
  const Chamapay = await ethers.getContractFactory("ChamaPay");
  const chamapay = await upgrades.deployProxy(Chamapay);
  await chamapay.waitForDeployment();
  console.log("Chamapay contract deployed to:", await chamapay.getAddress());
}

// Error handling
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
