const { ethers } = require("hardhat");

async function main() {
  const [deployer] = await ethers.getSigners();
  const NewChamapay = await ethers.getContractFactory("ChamaPay");
  console.log("Deploying new implementation...");
  const impl = await NewChamapay.deploy();
  await impl.waitForDeployment();
  const implAddr = await impl.getAddress();
  console.log("Deployed implementation to:", implAddr);

  const proxyAddr = "0xf89c1312D9A92D84f2bFBF870089C29a09bC638A";
  const proxy = await ethers.getContractAt("ChamaPay", proxyAddr);
  
  console.log("Upgrading proxy...");
  const tx = await proxy.upgradeToAndCall(implAddr, "0x");
  console.log("Tx hash:", tx.hash);
  await tx.wait();
  console.log("Upgraded successfully");
}
main();
