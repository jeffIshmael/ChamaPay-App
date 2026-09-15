const { ethers, upgrades } = require("hardhat");

/**
 * Deploy ChamaPayGoal (UUPS) to Base / Base Sepolia.
 *
 * Env:
 *   PRIVATE_KEY
 *   USDC_ADDRESS    — optional override (defaults Base mainnet USDC)
 *   MUSDC_ADDRESS   — optional override (defaults Base Moonwell mUSDC)
 *
 * Treasury is off-chain (e.g. CHAMAPAY_TREASURY_WALLET) — not set on the contract.
 */
async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deployer:", deployer.address);

  const network = await ethers.provider.getNetwork();
  const chainId = Number(network.chainId);

  const usdc = process.env.USDC_ADDRESS || "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913";
  const mUsdc = process.env.MUSDC_ADDRESS || "0xEdc817A28E8B93B03976FBd4a3dDBc9f7D176c22";

  if (chainId === 84532) {
    console.warn(
      "Base Sepolia: set USDC_ADDRESS and MUSDC_ADDRESS if Moonwell mUSDC is unavailable on testnet."
    );
  }

  console.log({ chainId, usdc, mUsdc, owner: deployer.address });

  const ChamaPayGoal = await ethers.getContractFactory("ChamaPayGoal");
  const proxy = await upgrades.deployProxy(
    ChamaPayGoal,
    [deployer.address, usdc, mUsdc],
    { kind: "uups" }
  );
  await proxy.waitForDeployment();

  const address = await proxy.getAddress();
  console.log("ChamaPayGoal proxy:", address);
  try {
    console.log("Implementation:", await upgrades.erc1967.getImplementationAddress(address));
  } catch (e) {
    console.warn("Could not read implementation via upgrades helper (RPC lag). Proxy is deployed.");
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
