const { buildModule } = require("@nomicfoundation/hardhat-ignition/modules");

module.exports = buildModule("MediVaultModule", (m) => {
  const mediVault = m.contract("MediVault");

  return { mediVault };
});