const { ethers } = require("hardhat");

async function main() {
  const [deployer] = await ethers.getSigners();
  const balance = await ethers.provider.getBalance(deployer.address);
  const network = await ethers.provider.getNetwork();
  console.log("Signer:", deployer.address);
  console.log("ChainId:", network.chainId.toString());
  console.log("Balance ETH:", ethers.formatEther(balance));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
