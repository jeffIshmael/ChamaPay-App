
const { ethers, upgrades } = require("hardhat");

async function main() {
  const NewChamapay = await ethers.getContractFactory("ChamaPay");
  const chamapay = await upgrades.upgradeProxy("0xf89c1312D9A92D84f2bFBF870089C29a09bC638A", NewChamapay);
  console.log("Chamapay upgraded");
}

main();


// npx hardhat run scripts/upgrade-chamapay.js --network base
// Uno => proxy - 0xf89c1312D9A92D84f2bFBF870089C29a09bC638A , implementation - 0x32Dd30a57A909290CF7127A77438dABE373a95a7