// hardhat.config.js (FINAL VERSION with viaIR fix)

require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config(); // Import dotenv to load environment variables

const { SEPOLIA_RPC_URL, PRIVATE_KEY } = process.env;

if (!PRIVATE_KEY) {
  console.warn("WARNING: PRIVATE_KEY is not set in the .env file. Running in a limited mode.");
}

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  // MODIFIED SECTION: We are now using an object to specify compiler settings.
  solidity: {
    version: "0.8.24",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200, // Standard optimization value
      },
      viaIR: true, // This is the magic flag that solves "Stack too deep"
    },
  },
  networks: {
    localhost: {
      url: "http://127.0.0.1:8545",
      chainId: 31337,
    },
    sepolia: {
      url: SEPOLIA_RPC_URL || "", 
      accounts: PRIVATE_KEY ? [PRIVATE_KEY] : [],
      chainId: 11155111,
    },
  },
};