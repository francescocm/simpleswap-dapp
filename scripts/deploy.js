// scripts/deploy.js (FINAL ROBUST VERSION)

const hre = require("hardhat");
const ethers = hre.ethers;

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying contracts with the account:", deployer.address);

  // --- 1. DEPLOY MOCK ERC20 TOKENS ---
  console.log("Deploying Mock Tokens...");
  const MockERC20 = await ethers.getContractFactory("MockERC20");
  
  const tokenA = await MockERC20.deploy("Token A", "TKA");
  await tokenA.waitForDeployment();
  console.log(`Mock Token A (TKA) deployed to: ${tokenA.target}`);

  const tokenB = await MockERC20.deploy("Token B", "TKB");
  await tokenB.waitForDeployment();
  console.log(`Mock Token B (TKB) deployed to: ${tokenB.target}`);

  // --- 2. DEPLOY SIMPLESWAP CONTRACT ---
  console.log("Deploying SimpleSwap...");
  const SimpleSwap = await ethers.getContractFactory("SimpleSwap");
  const simpleSwap = await SimpleSwap.deploy();
  await simpleSwap.waitForDeployment();
  console.log(`SimpleSwap deployed to: ${simpleSwap.target}`);

  // --- 3. MINT INITIAL TOKENS FOR THE DEPLOYER ---
  console.log("Minting initial tokens...");
  const initialMintAmount = ethers.parseUnits("1000", 18);
  const mintTxA = await tokenA.mint(deployer.address, initialMintAmount);
  console.log(`Minting Token A... Tx hash: ${mintTxA.hash}`);
  await mintTxA.wait(); // Wait for the mint transaction to be confirmed
  
  const mintTxB = await tokenB.mint(deployer.address, initialMintAmount);
  console.log(`Minting Token B... Tx hash: ${mintTxB.hash}`);
  await mintTxB.wait(); // Wait for the mint transaction to be confirmed
  console.log(`Minted ${ethers.formatUnits(initialMintAmount, 18)} TKA and TKB to deployer`);

  // --- 4. APPROVE THE SIMPLESWAP CONTRACT TO SPEND TOKENS ---
  console.log("Approving SimpleSwap contract to spend tokens...");
  const maxApproval = ethers.MaxUint256;
  
  const approveTxA = await tokenA.connect(deployer).approve(simpleSwap.target, maxApproval);
  console.log(`Approving Token A... Tx hash: ${approveTxA.hash}`);
  await approveTxA.wait(); // **THIS IS THE FIX**: Wait for the approval transaction
  
  const approveTxB = await tokenB.connect(deployer).approve(simpleSwap.target, maxApproval);
  console.log(`Approving Token B... Tx hash: ${approveTxB.hash}`);
  await approveTxB.wait(); // **THIS IS THE FIX**: Wait for the approval transaction
  console.log("Tokens approved successfully.");
  
  // --- 5. VERIFICATION STEP ---
  console.log("Verifying allowance...");
  const allowanceA = await tokenA.allowance(deployer.address, simpleSwap.target);
  const allowanceB = await tokenB.allowance(deployer.address, simpleSwap.target);

  console.log(`Allowance for Token A: ${allowanceA.toString()}`);
  console.log(`Allowance for Token B: ${allowanceB.toString()}`);

  if (allowanceA === 0n || allowanceB === 0n) { // Use BigInt for comparison
    throw new Error("Verification Failed: Allowance is zero after approval attempt!");
  }
  console.log("Verification successful! Allowance is set correctly.");

  // --- 6. ADD INITIAL LIQUIDITY ---
  console.log("Adding initial liquidity...");
  const liquidityAmountA = ethers.parseUnits("100", 18);
  const liquidityAmountB = ethers.parseUnits("200", 18);
  const deadline = Math.floor(Date.now() / 1000) + 60 * 10;

  const liquidityTx = await simpleSwap.addLiquidity(
    tokenA.target,
    tokenB.target,
    liquidityAmountA,
    liquidityAmountB,
    0, 0,
    deployer.address,
    deadline
  );
  console.log(`Adding liquidity... Tx hash: ${liquidityTx.hash}`);
  await liquidityTx.wait(); // Wait for the liquidity transaction
  console.log("Added initial liquidity to the TKA-TKB pool");
  console.log("--- DEPLOYMENT SCRIPT FINISHED SUCCESSFULLY ---");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});