require("@nomicfoundation/hardhat-toolbox");
require("@openzeppelin/hardhat-upgrades");
require("dotenv").config();

const PRIVATE_KEY = process.env.PRIVATE_KEY;
const etherScanApiKey = process.env.ETHERSCAN_API_KEY;

const config = {
  solidity: {
    version: "0.8.22",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
    },
  },
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
      base: {
      url: "https://mainnet.base.org",
      chainId: 8453,
      accounts: [PRIVATE_KEY],
    },
  },
  etherscan: {
    apiKey: etherScanApiKey,
    customChains: [
      // {
      //   network: "sepolia",
      //   chainId: 11142220,
      //   urls: {
      //     apiURL: "https://api-celo-sepolia.blockscout.com/v2/api",
      //     browserURL: "https://celo-sepolia.blockscout.com",
      //   },
      // },
      // {
      //   network: "celo",
      //   chainId: 42220,
      //   urls: {
      //     apiURL: "https://api.celoscan.io/v2/api",
      //     browserURL: "https://celoscan.io",
      //   },
      // },
        {
          network: "base",
          chainId: 8453,
          urls: {
            apiURL: "https://api.basescan.org/v2/api",
            browserURL: "https://basescan.org",
          },
        },
    ],
  },
};

module.exports = config;
