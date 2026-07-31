const { ethers } = require("hardhat");

async function main() {
  const proxyAddr = "0xf89c1312D9A92D84f2bFBF870089C29a09bC638A";
  const proxy = await ethers.getContractAt("ChamaPay", proxyAddr);
  
  const adminAddress = "0x4c8C5C4d4954dcCC81733b5b4f4C4Fe7B4733200";
  
  const chamaBlockchainId = 5;
  const amountInWei = 7580000;
  const newCycle = 2;
  const newRound = 1;
  const newPayDate = 1786690800000;
  const newDuration = 30;

  const data = proxy.interface.encodeFunctionData("updateChamaDetails", [
    chamaBlockchainId, amountInWei, newCycle, newRound, newPayDate, newDuration
  ]);

  try {
    const result = await ethers.provider.call({
      to: proxyAddr,
      from: adminAddress,
      data: data
    });
    console.log("Call succeeded. Result:", result);
  } catch (e) {
    console.error("Call failed. Error:", e.message);
    if (e.data) {
        console.log("Decoded error:", proxy.interface.parseError(e.data));
    }
  }
}
main();
