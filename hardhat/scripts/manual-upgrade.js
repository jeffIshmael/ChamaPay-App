const { ethers } = require("hardhat");

async function main() {
  const proxyAddr = "0xf89c1312D9A92D84f2bFBF870089C29a09bC638A";
  const newImplAddr = "0x32Dd30a57A909290CF7127A77438dABE373a95a7";
  
  const [deployer] = await ethers.getSigners();
  console.log("Upgrading proxy...");
  
  const proxy = await ethers.getContractAt("ChamaPay", proxyAddr, deployer);
  
  try {
    const tx = await proxy.upgradeToAndCall(newImplAddr, "0x");
    console.log("Tx hash:", tx.hash);
    await tx.wait();
    console.log("Upgraded successfully");
  } catch (err) {
    console.error("Upgrade failed:", err);
  }
}
main();
