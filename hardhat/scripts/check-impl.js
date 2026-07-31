const { ethers } = require("hardhat");

async function main() {
  const slot = "0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc";
  const proxyAddr = "0xf89c1312D9A92D84f2bFBF870089C29a09bC638A";
  const implStorage = await ethers.provider.getStorage(proxyAddr, slot);
  // strip 0s
  const impl = ethers.getAddress("0x" + implStorage.slice(-40));
  console.log("Implementation address from storage slot:", impl);
}
main();
