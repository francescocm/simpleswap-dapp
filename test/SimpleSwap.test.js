const { expect } = require("chai");
const { ethers } = require("hardhat");

// 'describe' es un contenedor para un conjunto de pruebas.
describe("SimpleSwap Contract", function () {
    // Estas variables serán usadas en todas nuestras pruebas.
    let simpleSwap;
    let tokenA;
    let tokenB;
    let owner;
    let user1;
    let user2;

    // 'beforeEach' se ejecuta antes de cada prueba ('it' block).
    // Esto asegura que cada prueba comience desde un estado limpio.
    beforeEach(async function () {
        // 1. Obtener las cuentas de prueba que Hardhat nos proporciona.
        [owner, user1, user2] = await ethers.getSigners();

        // 2. Desplegar nuestro contrato SimpleSwap.
        const SimpleSwapFactory = await ethers.getContractFactory("SimpleSwap");
        simpleSwap = await SimpleSwapFactory.deploy();
        await simpleSwap.waitForDeployment();

        // 3. Desplegar nuestros dos tokens de prueba (Mocks).
        const MockERC20Factory = await ethers.getContractFactory("MockERC20");
        tokenA = await MockERC20Factory.deploy("Token A", "TKA");
        await tokenA.waitForDeployment();
        
        tokenB = await MockERC20Factory.deploy("Token B", "TKB");
        await tokenB.waitForDeployment();

        // 4. Repartir algunos tokens a nuestros usuarios de prueba para que puedan interactuar.
        const initialAmount = ethers.parseUnits("1000", 18); 
        await tokenA.mint(owner.address, initialAmount);
        await tokenB.mint(owner.address, initialAmount);

        await tokenA.mint(user1.address, initialAmount);
        await tokenB.mint(user1.address, initialAmount);

        // 5. Los usuarios deben aprobar que el contrato SimpleSwap gaste sus tokens.
        const maxApproval = ethers.MaxUint256; // Aprobar una cantidad máxima para no tener que hacerlo de nuevo.
        await tokenA.connect(owner).approve(simpleSwap.target, maxApproval);
        await tokenB.connect(owner).approve(simpleSwap.target, maxApproval);

        await tokenA.connect(user1).approve(simpleSwap.target, maxApproval);
        await tokenB.connect(user1).approve(simpleSwap.target, maxApproval);
    });

    // Prueba 1: Verifica el despliegue
    it("Should deploy all contracts correctly", function () {
        expect(simpleSwap.target).to.not.be.null;
        expect(simpleSwap.target).to.not.be.undefined;
        
        expect(tokenA.target).to.not.be.null;
        expect(tokenB.target).to.not.be.null;
    });

    // Prueba 2: Suite de pruebas para la función addLiquidity
    describe("addLiquidity", function () {
        it("Should add liquidity correctly for the first time", async function () {
            const amountA = ethers.parseUnits("100", 18);
            const amountB = ethers.parseUnits("200", 18);

            await expect(simpleSwap.connect(owner).addLiquidity(
                tokenA.target,
                tokenB.target,
                amountA,
                amountB,
                0, 0, owner.address,
                (await ethers.provider.getBlock('latest')).timestamp + 120
            )).to.emit(simpleSwap, "LiquidityAdded");

            expect(await simpleSwap.reserves(tokenA.target, tokenB.target)).to.equal(amountA);
            expect(await simpleSwap.reserves(tokenB.target, tokenA.target)).to.equal(amountB);
            
            expect(await tokenA.balanceOf(simpleSwap.target)).to.equal(amountA);
            expect(await tokenB.balanceOf(simpleSwap.target)).to.equal(amountB);

            const userLiquidity = await simpleSwap.liquidity(tokenA.target, tokenB.target, owner.address);
            expect(userLiquidity).to.be.gt(0);

            const totalLiquidity = await simpleSwap.totalLiquidity(tokenA.target, tokenB.target);
            expect(totalLiquidity).to.equal(userLiquidity);
        });
    });

    // Prueba 3: Suite de pruebas para la función swapExactTokensForTokens
    describe("swapExactTokensForTokens", function () {
        it("Should swap tokens correctly", async function () {
            // --- 1. Configuración: Añadir liquidez inicial ---
            const amountA_liq = ethers.parseUnits("100", 18);
            const amountB_liq = ethers.parseUnits("200", 18);
            await simpleSwap.connect(owner).addLiquidity(
                tokenA.target,
                tokenB.target,
                amountA_liq,
                amountB_liq,
                0, 0, owner.address,
                (await ethers.provider.getBlock('latest')).timestamp + 120
            );

            // --- 2. Preparación del Swap ---
            const amountIn = ethers.parseUnits("10", 18);
            const path = [tokenA.target, tokenB.target];

            const user1_balanceA_before = await tokenA.balanceOf(user1.address);
            const user1_balanceB_before = await tokenB.balanceOf(user1.address);
            const contract_balanceA_before = await tokenA.balanceOf(simpleSwap.target);
            const contract_balanceB_before = await tokenB.balanceOf(simpleSwap.target);

            // --- 3. Ejecución del Swap ---
            await simpleSwap.connect(user1).swapExactTokensForTokens(
                amountIn,
                0, // amountOutMin
                path,
                user1.address,
                (await ethers.provider.getBlock('latest')).timestamp + 120
            );

            // --- 4. Verificación de resultados ---
            const user1_balanceA_after = await tokenA.balanceOf(user1.address);
            const user1_balanceB_after = await tokenB.balanceOf(user1.address);
            const contract_balanceA_after = await tokenA.balanceOf(simpleSwap.target);
            const contract_balanceB_after = await tokenB.balanceOf(simpleSwap.target);
            
            expect(user1_balanceA_after).to.equal(user1_balanceA_before - amountIn);
            expect(user1_balanceB_after).to.be.gt(user1_balanceB_before);
            expect(contract_balanceA_after).to.equal(contract_balanceA_before + amountIn);
            expect(contract_balanceB_after).to.be.lt(contract_balanceB_before);

            const amountOut = contract_balanceB_before - contract_balanceB_after;
            expect(await simpleSwap.reserves(tokenA.target, tokenB.target)).to.equal(contract_balanceA_before + amountIn);
            expect(await simpleSwap.reserves(tokenB.target, tokenA.target)).to.equal(contract_balanceB_before - amountOut);
        });
    });
});