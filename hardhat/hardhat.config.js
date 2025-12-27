require("@nomicfoundation/hardhat-toolbox");
require("@openzeppelin/hardhat-upgrades");
require("dotenv").config();

const PRIVATE_KEY = process.env.PRIVATE_KEY;
const celoscanApiKey = process.env.CELOSCAN_API_KEY;

const config = {
  solidity: "0.8.22",
  networks: {
    // Celo Sepolia Testnet
    sepolia: {
      url: "https://forno.celo-sepolia.celo-testnet.org",
      chainId: 11142220,
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
    },
    celo: {
      url: "https://forno.celo.org",
      chainId: 42220,
      accounts: [PRIVATE_KEY],
    },
  },
  etherscan: {
    apiKey: celoscanApiKey,
    customChains: [
      {
        network: "sepolia",
        chainId: 11142220,
        urls: {
          apiURL: "https://api-celo-sepolia.blockscout.com/v2/api",
          browserURL: "https://celo-sepolia.blockscout.com",
        },
      },
      {
        network: "celo",
        chainId: 42220,
        urls: {
          apiURL: "https://api.celoscan.io/v2/api",
          browserURL: "https://celoscan.io",
        },
      },
    ],
  },
};

module.exports = config;
