// test/SimpleSwap.test.js

const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("SimpleSwap Contract Tests", function () {
  // Declare variables to be used across tests
  let SimpleSwap, simpleSwap, MockERC20, tokenA, tokenB, deployer, user;
  
  const DEADLINE = Math.floor(Date.now() / 1000) + 60 * 20; // 20 minutes from now

  // This `beforeEach` block runs before each `it` block, ensuring a clean state for every test.
  beforeEach(async function () {
    // Get signers from Hardhat's local environment
    [deployer, user] = await ethers.getSigners();

    // Deploy Mock ERC20 token contracts
    MockERC20 = await ethers.getContractFactory("MockERC20");
    tokenA = await MockERC20.deploy("Token A", "TKA");
    tokenB = await MockERC20.deploy("Token B", "TKB");

    // Deploy the main SimpleSwap contract
    SimpleSwap = await ethers.getContractFactory("SimpleSwap");
    simpleSwap = await SimpleSwap.deploy();

    // Mint initial tokens for the deployer and a generic user
    await tokenA.mint(deployer.address, ethers.parseEther("1000"));
    await tokenB.mint(deployer.address, ethers.parseEther("1000"));
    await tokenA.mint(user.address, ethers.parseEther("500"));
    await tokenB.mint(user.address, ethers.parseEther("500"));

    // Approve the SimpleSwap contract to spend tokens on behalf of the deployer and user.
    // This is a crucial step for `transferFrom` to work.
    await tokenA.connect(deployer).approve(simpleSwap.target, ethers.MaxUint256);
    await tokenB.connect(deployer).approve(simpleSwap.target, ethers.MaxUint256);
    await tokenA.connect(user).approve(simpleSwap.target, ethers.MaxUint256);
    await tokenB.connect(user).approve(simpleSwap.target, ethers.MaxUint256);
  });

  describe("Liquidity Management", function () {
    it("Should add liquidity correctly for the first time and emit LiquidityAdded event", async function () {
      const amountA = ethers.parseEther("100");
      const amountB = ethers.parseEther("200");

      // Check that the addLiquidity transaction emits the correct event with correct values
      await expect(simpleSwap.connect(deployer).addLiquidity(tokenA.target, tokenB.target, amountA, amountB, 0, 0, deployer.address, DEADLINE))
        .to.emit(simpleSwap, "LiquidityAdded")
        .withArgs(deployer.address, tokenA.target, tokenB.target, amountA, amountB, ethers.parseEther("141.42135623730950488")); // sqrt(100*200)
      
      // Verify that the contract's reserves and token balances are updated
      expect(await simpleSwap.reserves(tokenA.target, tokenB.target)).to.equal(amountA);
      expect(await tokenA.balanceOf(simpleSwap.target)).to.equal(amountA);
    });

    it("Should fail to add liquidity if deadline has passed", async function () {
        const expiredDeadline = Math.floor(Date.now() / 1000) - 1; // 1 second in the past
        await expect(simpleSwap.connect(deployer).addLiquidity(tokenA.target, tokenB.target, 1, 1, 0, 0, deployer.address, expiredDeadline))
          .to.be.revertedWith("SS:EXPIRED");
    });
    
    it("Should remove liquidity correctly", async function () {
      // First, add liquidity
      const amountA_add = ethers.parseEther("100");
      const amountB_add = ethers.parseEther("100");
      await simpleSwap.connect(deployer).addLiquidity(tokenA.target, tokenB.target, amountA_add, amountB_add, 0, 0, deployer.address, DEADLINE);

      const liquidity = await simpleSwap.liquidity(tokenA.target, tokenB.target, deployer.address);
      expect(liquidity).to.be.gt(0);

      const initialBalanceA = await tokenA.balanceOf(deployer.address);

      // Now, remove the liquidity
      await expect(simpleSwap.connect(deployer).removeLiquidity(tokenA.target, tokenB.target, liquidity, 0, 0, deployer.address, DEADLINE))
        .to.emit(simpleSwap, "LiquidityRemoved");

      // Check balances after removal
      expect(await simpleSwap.liquidity(tokenA.target, tokenB.target, deployer.address)).to.equal(0);
      expect(await tokenA.balanceOf(deployer.address)).to.be.gt(initialBalanceA);
    });

    it("Should fail to remove more liquidity than the user has", async function () {
        const liquidityAmount = ethers.parseEther("1");
        // Attempting to remove liquidity from a pool that hasn't been created yet
        await expect(simpleSwap.connect(user).removeLiquidity(tokenA.target, tokenB.target, liquidityAmount, 0, 0, user.address, DEADLINE))
            .to.be.revertedWith("SS:INSUF_LIQ");
    });
  });

  describe("Swapping", function () {
    beforeEach(async function() {
        // Pre-fill the pool with liquidity for swap tests
        await simpleSwap.connect(deployer).addLiquidity(
            tokenA.target,
            tokenB.target,
            ethers.parseEther("500"),
            ethers.parseEther("500"),
            0,
            0,
            deployer.address,
            DEADLINE
        );
    });

    it("Should perform a swap of exact tokens for tokens successfully", async function () {
      const amountIn = ethers.parseEther("10");
      const userBalanceBefore = await tokenB.balanceOf(user.address);
      
      await expect(simpleSwap.connect(user).swapExactTokensForTokens(amountIn, 0, [tokenA.target, tokenB.target], user.address, DEADLINE))
        .to.emit(simpleSwap, "Swap");

      const userBalanceAfter = await tokenB.balanceOf(user.address);
      expect(userBalanceAfter).to.be.gt(userBalanceBefore);
    });

    it("Should fail a swap if the output amount is less than the minimum required", async function () {
        const amountIn = ethers.parseEther("10");
        const highAmountOutMin = ethers.parseEther("10"); // An impossibly high minimum output
        await expect(simpleSwap.connect(user).swapExactTokensForTokens(amountIn, highAmountOutMin, [tokenA.target, tokenB.target], user.address, DEADLINE))
            .to.be.revertedWith("SS:INSUF_OUTPUT");
    });

    it("Should fail a swap with an invalid path", async function () {
        const amountIn = ethers.parseEther("1");
        await expect(simpleSwap.connect(user).swapExactTokensForTokens(amountIn, 0, [tokenA.target], user.address, DEADLINE))
            .to.be.revertedWith("SS:INVALID_PATH");
    });
  });

  describe("View and Pure Functions", function () {
    it("getPrice should return a price if liquidity exists", async function () {
        await simpleSwap.connect(deployer).addLiquidity(tokenA.target, tokenB.target, ethers.parseEther("100"), ethers.parseEther("200"), 0, 0, deployer.address, DEADLINE);
        const price = await simpleSwap.getPrice(tokenA.target, tokenB.target);
        // Price of A in terms of B should be 200/100 = 2
        expect(price).to.equal(ethers.parseEther("2"));
    });

    it("getPrice should revert if no liquidity exists", async function () {
        await expect(simpleSwap.getPrice(tokenA.target, tokenB.target))
            .to.be.revertedWith("SS:NO_RESERVES");
    });

    it("getAmountOut should calculate the correct output amount", async function () {
        const amountIn = ethers.parseEther("10");
        const reserveIn = ethers.parseEther("100");
        const reserveOut = ethers.parseEther("100");
        const expectedAmountOut = await simpleSwap.getAmountOut(amountIn, reserveIn, reserveOut);
        
        // Formula: (10 * 100) / (100 + 10) = 1000 / 110 = 9.0909...
        expect(expectedAmountOut).to.equal(ethers.parseEther("9.090909090909090909"));
    });

    it("getAmountOut should revert with zero input", async function () {
        await expect(simpleSwap.getAmountOut(0, 1, 1)).to.be.revertedWith("SS:ZERO_INPUT");
    });
  });
});