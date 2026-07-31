const { ethers } = require("hardhat");

async function main() {
  const proxyAddr = "0xf89c1312D9A92D84f2bFBF870089C29a09bC638A";
  const proxy = await ethers.getContractAt("ChamaPay", proxyAddr);
  const [deployer] = await ethers.getSigners();
  
  // We don't have the user's smart account private key, but we can impersonate it.
  // Actually, we can use eth_call to simulate.
  const adminAddress = "0x4c8C5C4d4954dcCC81733b5b4f4C4Fe7B4733200";
  
  await hre.network.provider.request({
    method: "hardhat_impersonateAccount",
    params: [adminAddress],
  });
  // Give some ETH
  await hre.network.provider.send("hardhat_setBalance", [
    adminAddress,
    "0x1000000000000000000",
  ]);

  const adminSigner = await ethers.getSigner(adminAddress);
  const proxyWithAdmin = proxy.connect(adminSigner);

  const chamaBlockchainId = 5;
  const amountInWei = 7580000;
  const newCycle = 2;
  const newRound = 1;
  const newPayDate = 1786690800000;
  const newDuration = 30;

  try {
    await proxyWithAdmin.updateChamaDetails.staticCall(
      chamaBlockchainId, amountInWei, newCycle, newRound, newPayDate, newDuration
    );
    console.log("staticCall succeeded");
  } catch (e) {
    console.error("staticCall failed:", e);
  }
}
main();
