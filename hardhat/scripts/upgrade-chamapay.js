const { ethers, upgrades, run } = require("hardhat");

const PROXY_ADDRESS = "0xf89c1312D9A92D84f2bFBF870089C29a09bC638A";

async function main() {
  const [deployer] = await ethers.getSigners();
  const balance = await ethers.provider.getBalance(deployer.address);
  console.log("Deployer address:", deployer.address);
  console.log("Deployer balance:", ethers.formatEther(balance), "ETH");

  const NewChamapay = await ethers.getContractFactory("ChamaPay");
  console.log("Upgrading proxy", PROXY_ADDRESS, "...");
  const chamapay = await upgrades.upgradeProxy(PROXY_ADDRESS, NewChamapay);
  await chamapay.waitForDeployment();

  const implAddress = await upgrades.erc1967.getImplementationAddress(PROXY_ADDRESS);
  console.log("Chamapay upgraded");
  console.log("Proxy:", PROXY_ADDRESS);
  console.log("New implementation:", implAddress);

  // Give explorers a moment to index the new implementation
  console.log("Waiting 20s before verify...");
  await new Promise((r) => setTimeout(r, 20000));

  try {
    await run("verify:verify", {
      address: implAddress,
      constructorArguments: [],
    });
    console.log("Implementation verified");
  } catch (err) {
    console.error("Verify failed (you can retry manually):", err.message || err);
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

// npx hardhat run scripts/upgrade-chamapay.js --network base
