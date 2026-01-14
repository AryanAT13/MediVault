const hre = require("hardhat");

async function main() {
  console.log("Deploying MediVault contract...");

  const MediVault = await hre.ethers.getContractFactory("MediVault");

  const medivault = await MediVault.deploy();

  await medivault.waitForDeployment();

  console.log("MediVault deployed to:", medivault.target);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

