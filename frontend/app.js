// =============================================================================
//  SimpleSwap DApp Frontend Logic - Final Version (Checksum Corrected)
//  Author: Your AI Mentor
//  Description: A complete, self-contained script with official EIP-55
//               checksummed addresses to resolve the "bad address checksum" error.
// =============================================================================

import { ethers } from "https://cdnjs.cloudflare.com/ajax/libs/ethers/5.7.2/ethers.esm.min.js";

// =============================================================================
//  CONFIGURATION (CONTRACT ADDRESSES & ABIs) - CHECKSUM CORRECTED
// =============================================================================

const simpleSwapAddress = "0x89Bb5eE8eA7581a21dBA5C2aD7F82826Ff7414e3";
const tokenAAddress = "0x6268AC4737c60a6D4dC1E56d658Fd7a2924a7aad"; // CORRECTED CHECKSUM
const tokenBAddress = "0x3D4Acb6B5E4AEEf34988A4cd49DFbA39827929d3";

const simpleSwapABI = [
    "function addLiquidity(uint256 amountADesired, uint256 amountBDesired) external returns (uint256 amountA, uint256 amountB)",
    "function getReserves() public view returns (uint256, uint256)",
    "function swap(address tokenIn, uint256 amountIn) external returns (uint256 amountOut)",
    "function tokenA() public view returns (address)",
    "function tokenB() public view returns (address)"
];

const erc20ABI = [
    "function approve(address spender, uint256 amount) external returns (bool)",
    "function balanceOf(address account) external view returns (uint256)",
    "function symbol() external view returns (string)"
];

// =============================================================================
//  APPLICATION STATE
// =============================================================================
let state = {
    provider: null,
    signer: null,
    userAddress: null,
    simpleSwapContract: null,
    tokenAContract: null,
    tokenBContract: null,
    tokenASymbol: 'TKA',
    tokenBSymbol: 'TKB',
    isSwapInverted: false // false: A->B, true: B->A
};

// =============================================================================
//  DOM ELEMENT SELECTORS (Matching your provided HTML)
// =============================================================================
const connectWalletBtn = document.getElementById('connectWalletBtn');
const walletStatus = document.getElementById('walletStatus');
const walletAddress = document.getElementById('walletAddress');

const tabSwap = document.getElementById('tabSwap');
const tabPool = document.getElementById('tabPool');
const swapInterface = document.getElementById('swapInterface');
const poolInterface = document.getElementById('poolInterface');

// --- Swap Interface Elements ---
const amountInInput = document.getElementById('amountIn');
const amountOutInput = document.getElementById('amountOut');
const labelAmountIn = document.getElementById('labelAmountIn');
const labelAmountOut = document.getElementById('labelAmountOut');
const invertBtn = document.getElementById('invertBtn');
const swapBtn = document.getElementById('swapBtn');
const priceText = document.getElementById('priceText');

// --- Pool Interface Elements ---
const amountAAddInput = document.getElementById('amountA_add');
const amountBAddInput = document.getElementById('amountB_add');
const addLiquidityBtn = document.getElementById('addLiquidityBtn');

const notifications = document.getElementById('notifications');

// =============================================================================
//  HELPER & UI FUNCTIONS
// =============================================================================

function showNotification(message, isError = false) {
    notifications.innerHTML = message;
    notifications.style.color = isError ? '#e74c3c' : '#2ecc71';
    console.log(message.replace(/<br>/g, '\n'));
}

function setLoading(isLoading) {
    const buttons = [swapBtn, addLiquidityBtn, invertBtn];
    buttons.forEach(btn => {
        if(btn) btn.disabled = isLoading;
    });
    if (isLoading) {
        swapBtn.textContent = 'Processing...';
        addLiquidityBtn.textContent = 'Processing...';
    } else {
        swapBtn.textContent = 'Intercambiar';
        addLiquidityBtn.textContent = 'Añadir Liquidez';
    }
}

/**
 * @notice Updates swap UI labels and placeholders based on swap direction.
 */
function updateSwapUI() {
    if (state.isSwapInverted) { // Swapping B for A
        labelAmountIn.textContent = `Enviar (${state.tokenBSymbol})`;
        labelAmountOut.textContent = `Recibir (${state.tokenASymbol})`;
    } else { // Swapping A for B
        labelAmountIn.textContent = `Enviar (${state.tokenASymbol})`;
        labelAmountOut.textContent = `Recibir (${state.tokenBSymbol})`;
    }
    amountInInput.value = '';
    amountOutInput.value = '';
    priceText.textContent = 'Cargando precio...';
}

/**
 * @notice Calculates and displays the current swap price and output estimate.
 */
async function updatePriceAndEstimate() {
    if (!state.simpleSwapContract) return;
    try {
        const [reserveA, reserveB] = await state.simpleSwapContract.getReserves();
        if (reserveA.isZero() || reserveB.isZero()) {
            priceText.textContent = 'El pool no tiene liquidez.';
            swapBtn.disabled = true;
            return;
        }

        const reserveIn = state.isSwapInverted ? reserveB : reserveA;
        const reserveOut = state.isSwapInverted ? reserveA : reserveB;

        // Display price (1 Token In = ? Token Out)
        const price = reserveOut.mul(ethers.utils.parseUnits("1", 18)).div(reserveIn);
        const tokenInSymbol = state.isSwapInverted ? state.tokenBSymbol : state.tokenASymbol;
        const tokenOutSymbol = state.isSwapInverted ? state.tokenASymbol : state.tokenBSymbol;
        priceText.textContent = `1 ${tokenInSymbol} ≈ ${ethers.utils.formatUnits(price, 18)} ${tokenOutSymbol}`;

        // Estimate output
        const amountInValue = amountInInput.value;
        if (amountInValue && parseFloat(amountInValue) > 0) {
            const amountInWei = ethers.utils.parseUnits(amountInValue, 18);
            const amountOutWei = amountInWei.mul(reserveOut).div(reserveIn.add(amountInWei)); // (amountIn * reserveOut) / (reserveIn + amountIn)
            amountOutInput.value = ethers.utils.formatUnits(amountOutWei, 18);
            swapBtn.disabled = false;
        } else {
            amountOutInput.value = '';
            swapBtn.disabled = true;
        }
    } catch (error) {
        console.error("Price fetch error:", error);
        priceText.textContent = "Error al obtener el precio.";
    }
}


// =============================================================================
//  WEB3 CORE FUNCTIONS
// =============================================================================

async function connectWallet() {
    if (typeof window.ethereum === 'undefined') {
        showNotification('MetaMask no está instalado.', true);
        return;
    }

    try {
        state.provider = new ethers.providers.Web3Provider(window.ethereum, "any");
        await state.provider.send("eth_requestAccounts", []);
        state.signer = state.provider.getSigner();
        state.userAddress = await state.signer.getAddress();

        state.simpleSwapContract = new ethers.Contract(simpleSwapAddress, simpleSwapABI, state.signer);
        state.tokenAContract = new ethers.Contract(tokenAAddress, erc20ABI, state.signer);
        state.tokenBContract = new ethers.Contract(tokenBAddress, erc20ABI, state.signer);

        state.tokenASymbol = await state.tokenAContract.symbol();
        state.tokenBSymbol = await state.tokenBContract.symbol();
        
        walletStatus.textContent = 'Status: Connected';
        walletStatus.style.color = '#2ecc71';
        walletAddress.textContent = `Address: ${state.userAddress.substring(0, 6)}...${state.userAddress.substring(state.userAddress.length - 4)}`;
        connectWalletBtn.textContent = 'Connected';
        connectWalletBtn.disabled = true;

        showNotification('Wallet conectada!', false);
        updateSwapUI();
        await updatePriceAndEstimate();

    } catch (error) {
        console.error('Failed to connect wallet:', error);
        showNotification(error.message, true);
    }
}

async function handleAddLiquidity() {
    const amountA = amountAAddInput.value;
    const amountB = amountBAddInput.value;

    if (!amountA || !amountB || parseFloat(amountA) <= 0 || parseFloat(amountB) <= 0) {
        showNotification("Por favor, introduce montos válidos para ambos tokens.", true);
        return;
    }

    setLoading(true);

    try {
        const amountAWei = ethers.utils.parseUnits(amountA, 18);
        const amountBWei = ethers.utils.parseUnits(amountB, 18);

        showNotification(`1/3: Aprobando ${state.tokenASymbol}...`);
        const approveATx = await state.tokenAContract.approve(simpleSwapAddress, amountAWei);
        await approveATx.wait();
        
        showNotification(`2/3: Aprobando ${state.tokenBSymbol}...`);
        const approveBTx = await state.tokenBContract.approve(simpleSwapAddress, amountBWei);
        await approveBTx.wait();
        
        showNotification('3/3: Añadiendo liquidez...');
        const addTx = await state.simpleSwapContract.addLiquidity(amountAWei, amountBWei);
        const receipt = await addTx.wait();
        
        showNotification(`Liquidez añadida! Tx: ${receipt.transactionHash.substring(0, 12)}...`, false);
        amountAAddInput.value = '';
        amountBAddInput.value = '';
        await updatePriceAndEstimate();

    } catch (error) {
        console.error("Add liquidity failed:", error);
        showNotification(`Error: ${error.reason || error.message}`, true);
    } finally {
        setLoading(false);
    }
}

async function handleSwap() {
    const amountIn = amountInInput.value;
    if (!amountIn || parseFloat(amountIn) <= 0) {
        showNotification("Por favor, introduce un monto válido.", true);
        return;
    }

    setLoading(true);

    try {
        const amountInWei = ethers.utils.parseUnits(amountIn, 18);
        const tokenInAddress = state.isSwapInverted ? tokenBAddress : tokenAAddress;
        const tokenInContract = state.isSwapInverted ? state.tokenBContract : state.tokenAContract;
        const tokenInSymbol = state.isSwapInverted ? state.tokenBSymbol : state.tokenASymbol;

        showNotification(`1/2: Aprobando ${tokenInSymbol} para el swap...`);
        const approveTx = await tokenInContract.approve(simpleSwapAddress, amountInWei);
        await approveTx.wait();

        showNotification('2/2: Ejecutando el swap...');
        const swapTx = await state.simpleSwapContract.swap(tokenInAddress, amountInWei);
        const receipt = await swapTx.wait();

        showNotification(`Swap exitoso! Tx: ${receipt.transactionHash.substring(0, 12)}...`, false);
        await updatePriceAndEstimate();

    } catch (error) {
        console.error("Swap failed:", error);
        showNotification(`Error en el swap: ${error.reason || error.message}`, true);
    } finally {
        setLoading(false);
    }
}

// =============================================================================
//  EVENT LISTENERS
// =============================================================================
function initializeDApp() {
    connectWalletBtn.addEventListener('click', connectWallet);

    tabSwap.addEventListener('click', () => {
        tabSwap.classList.add('active');
        tabPool.classList.remove('active');
        swapInterface.style.display = 'block';
        poolInterface.style.display = 'none';
    });

    tabPool.addEventListener('click', () => {
        tabPool.classList.add('active');
        tabSwap.classList.remove('active');
        poolInterface.style.display = 'block';
        swapInterface.style.display = 'none';
    });
    
    invertBtn.addEventListener('click', () => {
        state.isSwapInverted = !state.isSwapInverted;
        updateSwapUI();
        updatePriceAndEstimate();
    });

    amountInInput.addEventListener('input', updatePriceAndEstimate);
    swapBtn.addEventListener('click', handleSwap);
    addLiquidityBtn.addEventListener('click', handleAddLiquidity);

    if (typeof window.ethereum !== 'undefined') {
        window.ethereum.on('accountsChanged', () => window.location.reload());
        window.ethereum.on('chainChanged', () => window.location.reload());
    }
}

document.addEventListener('DOMContentLoaded', initializeDApp);
