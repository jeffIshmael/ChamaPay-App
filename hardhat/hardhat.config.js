require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config();


const PRIVATE_KEY = process.env.PRIVATE_KEY;
const celoScanApiKey = process.env.CELOSCAN_API_KEY;

const config = {
  solidity: "0.8.20",
  networks: {
    alfajores: {
      url: "https://alfajores-forno.celo-testnet.org",
      accounts: [PRIVATE_KEY],
    },
    celo: {
      url: "https://forno.celo.org",
      chainId: 42220,
      accounts: [PRIVATE_KEY],
    },
  },
  etherscan: {
    apiKey: {
      alfajores: celoScanApiKey,
      celo: celoScanApiKey,
    },
    customChains: [
      {
        network: "alfajores",
        chainId: 44787,
        urls: {
          apiURL: "https://api-alfajores.celoscan.io/api",
          browserURL: "https://alfajores.celoscan.io",
        },
      },
      {
        network: "celo",
        chainId: 42220,
        urls: {
          apiURL: "https://api.celoscan.io/api",
          browserURL: "https://celoscan.io/",
        },
      },
    ],
  },
};

module.exports = config;
