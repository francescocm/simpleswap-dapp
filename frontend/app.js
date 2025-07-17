// frontend/app.js (DEBUGGING VERSION)

import { ethers } from 'https://cdn.jsdelivr.net/npm/ethers@5.7/dist/ethers.esm.min.js';
import { simpleSwapAddress, tokenA_Address, tokenB_Address } from './contract-config.js';

// --- GLOBAL STATE ---
let provider, signer, simpleSwapContract, tokenAContract, tokenBContract;
let swapDirectionIsAtoB = true; 
let simpleSwapABI;

// ... (El resto de las declaraciones de variables del DOM) ...
let connectWalletBtn, walletStatus, walletAddress, swapBtn, notifications,
    tabSwap, tabPool, swapInterface, poolInterface;
let amountInEl, amountOutEl, invertBtn, labelAmountIn, labelAmountOut, priceTextEl;
let amountA_add_El, amountB_add_El, addLiquidityBtn;

document.addEventListener('DOMContentLoaded', init);

async function init() {
  // ... (Tu función init existente con la asignación de elementos del DOM) ...
  connectWalletBtn = document.getElementById('connectWalletBtn');
  walletStatus = document.getElementById('walletStatus');
  walletAddress = document.getElementById('walletAddress');
  notifications = document.getElementById('notifications');
  tabSwap = document.getElementById('tabSwap');
  tabPool = document.getElementById('tabPool');
  swapInterface = document.getElementById('swapInterface');
  poolInterface = document.getElementById('poolInterface');
  amountInEl = document.getElementById('amountIn');
  amountOutEl = document.getElementById('amountOut');
  swapBtn = document.getElementById('swapBtn');
  invertBtn = document.getElementById('invertBtn');
  labelAmountIn = document.getElementById('labelAmountIn');
  labelAmountOut = document.getElementById('labelAmountOut');
  priceTextEl = document.getElementById('priceText');
  amountA_add_El = document.getElementById('amountA_add');
  amountB_add_El = document.getElementById('amountB_add');
  addLiquidityBtn = document.getElementById('addLiquidityBtn');

  try {
    const response = await fetch('./SimpleSwap.json');
    const contractJson = await response.json();
    simpleSwapABI = contractJson.abi;
  } catch (error) {
    console.error("Critical error: Could not fetch ABI", error);
    updateNotification("Error crítico: no se pudo cargar la configuración.");
    return;
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

function setupEventListeners() {
    connectWalletBtn.addEventListener('click', connectWallet);
    tabSwap.addEventListener('click', () => switchTab('swap'));
    tabPool.addEventListener('click', () => switchTab('pool'));
    invertBtn.addEventListener('click', handleInvertSwap);
    amountInEl.addEventListener('input', handleAmountInChange);
    swapBtn.addEventListener('click', handleSwap);
    addLiquidityBtn.addEventListener('click', handleAddLiquidity);
}

async function connectWallet() {
  try {
    await provider.send("eth_requestAccounts", []);
    signer = provider.getSigner();
    const address = await signer.getAddress();
    
    const erc20ABI = ["function approve(address,uint256) returns (bool)", "function allowance(address,address) view returns (uint256)"];
    simpleSwapContract = new ethers.Contract(simpleSwapAddress, simpleSwapABI, signer);
    tokenAContract = new ethers.Contract(tokenA_Address, erc20ABI, signer);
    tokenBContract = new ethers.Contract(tokenB_Address, erc20ABI, signer);

    updateUIForConnection(address);
    updatePriceDisplay();
  } catch (error) {
    console.error("Error connecting wallet:", error);
    updateNotification("Error al conectar la billetera.");
  }
}

// --- DEBUGGING VERSION of handleAddLiquidity ---
async function handleAddLiquidity() {
    console.clear(); // Limpia la consola para ver solo este error
    console.log("--- INICIANDO handleAddLiquidity ---");
    
    // Validar que los objetos de contrato existen
    if (!simpleSwapContract || !tokenAContract || !tokenBContract) {
        const errorMsg = "Error Crítico: Los contratos no están inicializados. Conecte la billetera de nuevo.";
        console.error(errorMsg);
        updateNotification(errorMsg);
        return;
    }
    
    const amountA = amountA_add_El.value;
    const amountB = amountB_add_El.value;

    if (!amountA || !amountB || parseFloat(amountA) <= 0 || parseFloat(amountB) <= 0) {
        updateNotification("Por favor, ingrese montos válidos para ambos tokens.");
        return;
    }

    updateNotification("Añadiendo liquidez...");
    addLiquidityBtn.disabled = true;

    try {
        const amountAWei = ethers.utils.parseUnits(amountA, 18);
        const amountBWei = ethers.utils.parseUnits(amountB, 18);
        const to = await signer.getAddress();
        const deadline = Math.floor(Date.now() / 1000) + 60 * 10;

        // Log de cada variable ANTES de la llamada al contrato
        console.log("1. Parámetro tokenA_Address:", tokenA_Address, `(Tipo: ${typeof tokenA_Address})`);
        console.log("2. Parámetro tokenB_Address:", tokenB_Address, `(Tipo: ${typeof tokenB_Address})`);
        console.log("3. Parámetro amountAWei:", amountAWei.toString());
        console.log("4. Parámetro amountBWei:", amountBWei.toString());
        console.log("5. Parámetro to (tu dirección):", to, `(Tipo: ${typeof to})`);
        console.log("6. Parámetro deadline:", deadline);

        // Validar explícitamente las direcciones
        if (!ethers.utils.isAddress(tokenA_Address) || !ethers.utils.isAddress(tokenB_Address) || !ethers.utils.isAddress(to)) {
             const errorMsg = "FATAL: Una de las direcciones (tokenA, tokenB, o 'to') no es una dirección válida de Ethereum.";
             console.error(errorMsg);
             updateNotification(errorMsg);
             addLiquidityBtn.disabled = false;
             return;
        }
        
        console.log("Todas las direcciones parecen válidas. Procediendo a llamar al contrato...");

        // Aquí mantenemos la lógica de aprobación
        updateNotification("Verificando permisos...");
        const approveTxA = await tokenAContract.approve(simpleSwapAddress, ethers.constants.MaxUint256);
        await approveTxA.wait();
        const approveTxB = await tokenBContract.approve(simpleSwapAddress, ethers.constants.MaxUint256);
        await approveTxB.wait();
        updateNotification("Permisos otorgados. Enviando transacción...");

        const tx = await simpleSwapContract.addLiquidity(
            tokenA_Address,
            tokenB_Address,
            amountAWei,
            amountBWei,
            0, 0,
            to,
            deadline
        );

        console.log("Transacción enviada a la red. Hash:", tx.hash);
        updateNotification("Esperando confirmación de la transacción...");
        await tx.wait();

        updateNotification(`¡Liquidez añadida exitosamente!`);
        amountA_add_El.value = '';
        amountB_add_El.value = '';
        updatePriceDisplay();

    } catch (error) {
        // Log detallado del error
        console.error("--- ERROR ATRAPADO EN handleAddLiquidity ---");
        console.error("Mensaje de error:", error.message);
        console.error("Razón (si la hay):", error.reason);
        console.error("Código de error:", error.code);
        console.error("Objeto de error completo:", error);
        
        const reason = error.reason || "La transacción falló. Revisa la consola (F12) para más detalles.";
        updateNotification(`Error: ${reason}`);
    } finally {
        addLiquidityBtn.disabled = false;
        console.log("--- FINALIZANDO handleAddLiquidity ---");
    }
}

// ... El resto de tus funciones (switchTab, handleInvertSwap, etc.) no cambian ...
// Pega el resto de tus funciones aquí
function switchTab(tabName) {
    if (tabName === 'swap') {
        swapInterface.style.display = 'block';
        poolInterface.style.display = 'none';
        tabSwap.classList.add('active');
        tabPool.classList.remove('active');
    } else if (tabName === 'pool') {
        poolInterface.style.display = 'block';
        swapInterface.style.display = 'none';
        tabPool.classList.add('active');
        tabSwap.classList.remove('active');
    }
}
async function handleInvertSwap() {
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
            updateNotification("No hay liquidez en el pool. Añádala en la pestaña 'Pool'.");
            priceTextEl.textContent = "No hay liquidez";
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
    // ... tu función
}
function updateNotification(message) {
    notifications.innerHTML = `<p>${message}</p>`;
}
function updateUIForConnection(address) {
    walletStatus.textContent = 'Estado: Conectado';
    walletAddress.textContent = `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
    connectWalletBtn.textContent = 'Billetera Conectada';
    connectWalletBtn.disabled = true;
    updateNotification("Billetera conectada. Listo para interactuar.");
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
        priceTextEl.textContent = "No hay liquidez en el pool";
    }
}