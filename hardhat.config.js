require("@nomicfoundation/hardhat-toolbox");

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: {
    version: "0.8.20", // He actualizado la versión a una más reciente, es buena práctica.
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
      viaIR: true, // <<< ¡Aquí está la magia!
    },
  },
};