const { ethers, upgrades } = require("hardhat");
async function main() {
  const factory = await ethers.getContractFactory("ChamaPay");
  console.log("Force importing...");
  await upgrades.forceImport("0xf89c1312D9A92D84f2bFBF870089C29a09bC638A", factory);
  console.log("Import successful.");
}
main();
