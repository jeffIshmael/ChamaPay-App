const { ethers } = require("hardhat");

async function main() {

  // Deploying contract with constructor arguments
  const chamaPay = await ethers.deployContract("ChamaPay");

  await chamaPay.waitForDeployment();

  console.log("ChamaPay contract address - " + (await chamaPay.getAddress()));
}

// Error handling
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});


//0x284240b2B7A9Fa5dCA3a5a2fDcf5b4257B8583db - testnet
// prev - 0xF0DE432cf2B18b02c6C2099c22412e916B0021f1
//0xF4ad70Fc47dB9dAbb2d58556Bb231c154C643580
//0x59212d9D6B3846b135791E5031eA88270fffAcC3
//0xdE7beFec6b7507761A7cBE85Ada85609575605CD