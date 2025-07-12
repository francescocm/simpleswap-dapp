// scripts/deploy.js

const hre = require("hardhat");
const ethers = hre.ethers;

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying contracts with the account:", deployer.address);

  // --- 1. DEPLOY MOCK ERC20 TOKENS ---
  const MockERC20 = await ethers.getContractFactory("MockERC20");
  const tokenA = await MockERC20.deploy("Token A", "TKA");
  await tokenA.waitForDeployment();
  console.log(`Mock Token A (TKA) deployed to: ${tokenA.target}`);

  const tokenB = await MockERC20.deploy("Token B", "TKB");
  await tokenB.waitForDeployment();
  console.log(`Mock Token B (TKB) deployed to: ${tokenB.target}`);

  // --- 2. DEPLOY SIMPLESWAP CONTRACT ---
  const SimpleSwap = await ethers.getContractFactory("SimpleSwap");
  const simpleSwap = await SimpleSwap.deploy();
  await simpleSwap.waitForDeployment();
  console.log(`SimpleSwap deployed to: ${simpleSwap.target}`);

  // --- 3. MINT INITIAL TOKENS FOR THE DEPLOYER ---
  const initialMintAmount = ethers.parseUnits("1000", 18);
  await tokenA.mint(deployer.address, initialMintAmount);
  await tokenB.mint(deployer.address, initialMintAmount);
  console.log(`Minted ${ethers.formatUnits(initialMintAmount, 18)} TKA and TKB to deployer`);

  // --- 4. APPROVE THE SIMPLESWAP CONTRACT TO SPEND TOKENS ---
  console.log("Attempting to approve SimpleSwap contract...");
  const maxApproval = ethers.MaxUint256;
  await tokenA.connect(deployer).approve(simpleSwap.target, maxApproval);
  await tokenB.connect(deployer).approve(simpleSwap.target, maxApproval);
  console.log("Approval transaction sent. Waiting for confirmation...");
  
  // --- 5. NEW: VERIFICATION STEP ---
  // We will now read the allowance back from the blockchain to make sure it was set.
  console.log("Verifying allowance...");
  const allowanceA = await tokenA.allowance(deployer.address, simpleSwap.target);
  const allowanceB = await tokenB.allowance(deployer.address, simpleSwap.target);

  console.log(`Allowance for Token A: ${allowanceA.toString()}`);
  console.log(`Allowance for Token B: ${allowanceB.toString()}`);

  if (allowanceA.toString() === '0' || allowanceB.toString() === '0') {
    throw new Error("Verification Failed: Allowance is zero after approval attempt!");
  }
  console.log("Verification successful! Allowance is set correctly.");
  // --- END OF VERIFICATION STEP ---


  // --- 6. ADD INITIAL LIQUIDITY ---
  const liquidityAmountA = ethers.parseUnits("100", 18);
  const liquidityAmountB = ethers.parseUnits("200", 18);
  const deadline = Math.floor(Date.now() / 1000) + 60 * 10;

  console.log("Adding initial liquidity...");
  await simpleSwap.addLiquidity(
    tokenA.target,
    tokenB.target,
    liquidityAmountA,
    liquidityAmountB,
    0, 0,
    deployer.address,
    deadline
  );
  console.log("Added initial liquidity to the TKA-TKB pool");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});