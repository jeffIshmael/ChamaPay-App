const { ethers } = require("hardhat");
async function main() {
  const proxyAddr = "0xf89c1312D9A92D84f2bFBF870089C29a09bC638A";
  const proxy = await ethers.getContractAt("ChamaPay", proxyAddr);
  console.log("Owner is:", await proxy.owner());
}
main();
