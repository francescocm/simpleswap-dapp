import { ethers } from 'https://cdn.jsdelivr.net/npm/ethers@5.7/dist/ethers.esm.min.js';
// NEW: Import addresses from the config file
import { simpleSwapAddress, tokenA_Address, tokenB_Address } from './contract-config.js';

// --- ABIs ---
// This will be loaded from the JSON file
let simpleSwapABI; 
const erc20ABI = [
    "function approve(address spender, uint256 amount) external returns (bool)",
    "function allowance(address owner, address spender) external view returns (uint256)"
];

// --- GLOBAL STATE ---
let provider, signer, simpleSwapContract, tokenAContract, tokenBContract;
let swapDirectionIsAtoB = true; 

// --- DOM ELEMENTS ---
// (No changes here)
const connectWalletBtn = document.getElementById('connectWalletBtn');
const walletStatus = document.getElementById('walletStatus');
const walletAddress = document.getElementById('walletAddress');
const amountInEl = document.getElementById('amountIn');
const amountOutEl = document.getElementById('amountOut');
const swapBtn = document.getElementById('swapBtn');
const notifications = document.getElementById('notifications');
const invertBtn = document.getElementById('invertBtn');
const labelAmountIn = document.getElementById('labelAmountIn');
const labelAmountOut = document.getElementById('labelAmountOut');
const priceTextEl = document.getElementById('priceText');

// --- INITIALIZATION ---
document.addEventListener('DOMContentLoaded', init);

async function init() {
    // NEW: Fetch the ABI from the JSON file first
    try {
        const response = await fetch('./SimpleSwap.json');
        const contractJson = await response.json();
        simpleSwapABI = contractJson.abi; // Store the ABI in our global variable
    } catch (error) {
        console.error("Could not fetch ABI:", error);
        updateNotification("Error crítico: no se pudo cargar la configuración del contrato.");
        return; // Stop initialization if ABI fails to load
    }

    setupEventListeners();
    if (typeof window.ethereum !== 'undefined') {
        provider = new ethers.providers.Web3Provider(window.ethereum);
        const accounts = await provider.listAccounts();
        if (accounts.length > 0) {
            await connectWallet();
        }
    } else {
        updateNotification("Por favor, instala MetaMask para usar esta DApp.");
        connectWalletBtn.disabled = true;
    }
}

async function connectWallet() {
    // This function remains the same, but now uses the loaded ABI
    // and imported addresses.
    try {
        await provider.send("eth_requestAccounts", []);
        signer = provider.getSigner();
        const address = await signer.getAddress();
        
        simpleSwapContract = new ethers.Contract(simpleSwapAddress, simpleSwapABI, signer);
        tokenAContract = new ethers.Contract(tokenA_Address, erc20ABI, signer);
        tokenBContract = new ethers.Contract(tokenB_Address, erc20ABI, signer);

        updateUIForConnection(address);
        updatePriceDisplay();
    } catch (error) {
        console.error("Error connecting wallet:", error);
        updateNotification("Error al conectar la billetera. Inténtalo de nuevo.");
    }
}

// --- ALL OTHER FUNCTIONS (setupEventListeners, handleInvertSwap, etc.) REMAIN EXACTLY THE SAME ---
// Just copy them from the previous version, no changes needed in them.

function setupEventListeners() {
    connectWalletBtn.addEventListener('click', connectWallet);
    invertBtn.addEventListener('click', handleInvertSwap);
    amountInEl.addEventListener('input', handleAmountInChange);
    swapBtn.addEventListener('click', handleSwap);
}

function handleInvertSwap() {
    swapDirectionIsAtoB = !swapDirectionIsAtoB;
    if (swapDirectionIsAtoB) {
        labelAmountIn.textContent = "Enviar (Token A)";
        labelAmountOut.textContent = "Recibir (Token B)";
    } else {
        labelAmountIn.textContent = "Enviar (Token B)";
        labelAmountOut.textContent = "Recibir (Token A)";
    }
    const temp = amountInEl.value;
    amountInEl.value = amountOutEl.value;
    amountOutEl.value = temp;
    handleAmountInChange(); 
    updatePriceDisplay();
}

async function handleAmountInChange() {
    const amountInValue = amountInEl.value;
    if (!amountInValue || parseFloat(amountInValue) <= 0 || !simpleSwapContract) {
        amountOutEl.value = "";
        swapBtn.disabled = true;
        swapBtn.textContent = 'Ingrese un monto';
        return;
    }
    try {
        const amountInWei = ethers.utils.parseUnits(amountInValue, 18);
        const tokenInAddr = swapDirectionIsAtoB ? tokenA_Address : tokenB_Address;
        const tokenOutAddr = swapDirectionIsAtoB ? tokenB_Address : tokenA_Address;
        const reserveIn = await simpleSwapContract.reserves(tokenInAddr, tokenOutAddr);
        const reserveOut = await simpleSwapContract.reserves(tokenOutAddr, tokenInAddr);
        if (reserveIn.isZero() || reserveOut.isZero()) {
            updateNotification("No hay liquidez en el pool para este par.");
            return;
        }
        const amountOutWei = await simpleSwapContract.getAmountOut(amountInWei, reserveIn, reserveOut);
        amountOutEl.value = ethers.utils.formatUnits(amountOutWei, 18);
        swapBtn.disabled = false;
        swapBtn.textContent = 'Intercambiar';
    } catch (error) {
        console.error("Error calculating output:", error);
        amountOutEl.value = "Error";
        swapBtn.disabled = true;
        swapBtn.textContent = 'Error al estimar';
    }
}

async function handleSwap() {
    updateNotification("Procesando intercambio...");
    swapBtn.disabled = true;
    swapBtn.textContent = "Procesando...";
    try {
        const amountInValue = amountInEl.value;
        const amountInWei = ethers.utils.parseUnits(amountInValue, 18);
        const tokenInAddr = swapDirectionIsAtoB ? tokenA_Address : tokenB_Address;
        const tokenOutAddr = swapDirectionIsAtoB ? tokenB_Address : tokenA_Address;
        const tokenInContract = swapDirectionIsAtoB ? tokenAContract : tokenBContract;
        const tokenInSymbol = swapDirectionIsAtoB ? "TKA" : "TKB";
        const amountOutMin = 0;
        const path = [tokenInAddr, tokenOutAddr];
        const to = await signer.getAddress();
        const deadline = Math.floor(Date.now() / 1000) + 60 * 10;
        updateNotification("Verificando permisos (allowance)...");
        const allowance = await tokenInContract.allowance(to, simpleSwapAddress);
        if (allowance.lt(amountInWei)) {
            updateNotification("Permiso insuficiente. Solicitando aprobación...");
            const approveTx = await tokenInContract.approve(simpleSwapAddress, ethers.constants.MaxUint256);
            await approveTx.wait();
            updateNotification("Permiso otorgado. Procediendo con el swap...");
        }
        const tx = await simpleSwapContract.swapExactTokensForTokens(amountInWei, amountOutMin, path, to, deadline);
        updateNotification("Transacción enviada. Esperando confirmación...");
        await tx.wait();
        updateNotification(`¡Swap exitoso! Intercambiaste ${amountInValue} ${tokenInSymbol}.`);
        amountInEl.value = "";
        amountOutEl.value = "";
    } catch (error) {
        console.error("Swap failed:", error);
        const reason = error.reason || "La transacción falló.";
        updateNotification(`Error: ${reason}`);
    } finally {
        swapBtn.disabled = false;
        swapBtn.textContent = "Intercambiar";
        updatePriceDisplay();
    }
}

function updateNotification(message) {
    notifications.innerHTML = `<p>${message}</p>`;
}

function updateUIForConnection(address) {
    walletStatus.textContent = 'Estado: Conectado';
    walletAddress.textContent = `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
    connectWalletBtn.textContent = 'Billetera Conectada';
    connectWalletBtn.disabled = true;
    updateNotification("Billetera conectada. Listo para intercambiar.");
}

async function updatePriceDisplay() {
    if (!simpleSwapContract) {
        priceTextEl.textContent = '';
        return;
    }
    try {
        const token1Addr = swapDirectionIsAtoB ? tokenA_Address : tokenB_Address;
        const token2Addr = swapDirectionIsAtoB ? tokenB_Address : tokenA_Address;
        const token1Symbol = swapDirectionIsAtoB ? "TKA" : "TKB";
        const token2Symbol = swapDirectionIsAtoB ? "TKB" : "TKA";
        const priceWei = await simpleSwapContract.getPrice(token1Addr, token2Addr);
        const priceFormatted = ethers.utils.formatUnits(priceWei, 18);
        const priceShort = parseFloat(priceFormatted).toFixed(4);
        priceTextEl.textContent = `1 ${token1Symbol} ≈ ${priceShort} ${token2Symbol}`;
    } catch (error) {
        console.error("Could not fetch price:", error);
        priceTextEl.textContent = "No hay liquidez para mostrar precio";
    }
}