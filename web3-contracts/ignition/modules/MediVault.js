const { buildModule } = require("@nomicfoundation/hardhat-ignition/modules");

module.exports = buildModule("MediVaultModule", (m) => {
  // We deploy the MediVault contract
  const mediVault = m.contract("MediVault");

  return { mediVault };
});