// =============================================================================
//  SimpleSwap DApp Frontend Logic - VERSIÓN FINAL Y FUNCIONAL
//  Basado en una estructura probada y adaptado a tus contratos.
// =============================================================================

// Al cargar Ethers.js globalmente, no se necesita la línea "import".

document.addEventListener('DOMContentLoaded', () => {
    // =============================================================================
    //  CONFIGURACIÓN (TUS DIRECCIONES DE CONTRATO)
    // =============================================================================
    const contractAddress = "0x89Bb5eE8eA7581a21dBA5C2aD7F82826Ff7414e3";
    const tokenAAddress = "0x6268AC4737c60a6D4dC1E56d658Fd7a2924a7aad";
    const tokenBAddress = "0x3D4Acb6B5E4AEEf34988A4cd49DFbA39827929d3";

    // =============================================================================
    //  ABIs (Interfaces del Contrato)
    // =============================================================================
    const contractABI = [
        "function addLiquidity(uint256 amountADesired, uint256 amountBDesired) external returns (uint256 amountA, uint256 amountB)",
        "function getReserves() public view returns (uint256, uint256)",
        "function swap(address tokenIn, uint256 amountIn) external returns (uint256 amountOut)",
        "function tokenA() public view returns (address)",
        "function tokenB() public view returns (address)"
    ];
    const tokenABI = [
        "function approve(address spender, uint256 amount) external returns (bool)",
        "function balanceOf(address account) external view returns (uint256)",
        "function symbol() external view returns (string)"
    ];

    // =============================================================================
    //  ESTADO Y SELECTORES DEL DOM
    // =============================================================================
    let provider, signer, userAddress, contract, tokenA, tokenB;
    let tokenASymbol = 'TKA', tokenBSymbol = 'TKB';
    let isSwapInverted = false;

    const connectWalletBtn = document.getElementById('connectWalletBtn');
    const walletStatus = document.getElementById('walletStatus');
    const walletAddress = document.getElementById('walletAddress');
    const tabSwap = document.getElementById('tabSwap');
    const tabPool = document.getElementById('tabPool');
    const swapInterface = document.getElementById('swapInterface');
    const poolInterface = document.getElementById('poolInterface');
    const amountInInput = document.getElementById('amountIn');
    const amountOutInput = document.getElementById('amountOut');
    const labelAmountIn = document.getElementById('labelAmountIn');
    const labelAmountOut = document.getElementById('labelAmountOut');
    const invertBtn = document.getElementById('invertBtn');
    const swapBtn = document.getElementById('swapBtn');
    const priceText = document.getElementById('priceText');
    const amountAAddInput = document.getElementById('amountA_add');
    const amountBAddInput = document.getElementById('amountB_add');
    const addLiquidityBtn = document.getElementById('addLiquidityBtn');
    const notifications = document.getElementById('notifications');

    // =============================================================================
    //  FUNCIONES AUXILIARES Y DE UI
    // =============================================================================
    const showNotification = (message, isError = false) => {
        notifications.innerHTML = message;
        notifications.style.color = isError ? '#e74c3c' : '#2ecc71';
    };

    const setLoading = (isLoading, button) => {
        if (isLoading) {
            button.dataset.originalText = button.textContent;
            button.textContent = 'Procesando...';
            button.disabled = true;
        } else {
            button.textContent = button.dataset.originalText;
            button.disabled = false;
        }
    };
    
    const updateSwapUI = () => {
        const inSymbol = isSwapInverted ? tokenBSymbol : tokenASymbol;
        const outSymbol = isSwapInverted ? tokenASymbol : tokenBSymbol;
        labelAmountIn.textContent = `Enviar (${inSymbol})`;
        labelAmountOut.textContent = `Recibir (${outSymbol})`;
        amountInInput.value = '';
        amountOutInput.value = '';
        priceText.textContent = 'Calculando precio...';
        swapBtn.disabled = true;
    };

    const updatePriceAndEstimate = async () => {
        if (!contract) return;
        try {
            const [reserveA, reserveB] = await contract.getReserves();
            if (reserveA.isZero() || reserveB.isZero()) {
                priceText.textContent = 'El pool no tiene liquidez.';
                swapBtn.disabled = true;
                return;
            }
            const reserveIn = isSwapInverted ? reserveB : reserveA;
            const reserveOut = isSwapInverted ? reserveA : reserveB;
            const amountInValue = amountInInput.value;

            if (amountInValue && parseFloat(amountInValue) > 0) {
                const amountInWei = ethers.utils.parseUnits(amountInValue, 18);
                const amountOutWei = amountInWei.mul(reserveOut).div(reserveIn.add(amountInWei));
                amountOutInput.value = parseFloat(ethers.utils.formatUnits(amountOutWei, 18)).toPrecision(6);
                swapBtn.disabled = false;
            } else {
                amountOutInput.value = '';
                swapBtn.disabled = true;
            }
        } catch (error) {
            console.error("Error al obtener precio:", error);
            priceText.textContent = "Error al obtener el precio.";
        }
    };

    // =============================================================================
    //  LÓGICA WEB3 PRINCIPAL
    // =============================================================================
    const connectWallet = async () => {
        if (!window.ethereum) {
            showNotification('Para usar esta DApp, por favor instale MetaMask.', true);
            return;
        }
        try {
            provider = new ethers.providers.Web3Provider(window.ethereum);
            await provider.send("eth_requestAccounts", []);
            signer = provider.getSigner();
            userAddress = await signer.getAddress();
            
            contract = new ethers.Contract(contractAddress, contractABI, signer);
            tokenA = new ethers.Contract(tokenAAddress, tokenABI, signer);
            tokenB = new ethers.Contract(tokenBAddress, tokenABI, signer);

            tokenASymbol = await tokenA.symbol();
            tokenBSymbol = await tokenB.symbol();

            walletStatus.textContent = 'Estado: Conectado';
            walletAddress.textContent = `Billetera: ${userAddress.substring(0, 6)}...${userAddress.substring(userAddress.length - 4)}`;
            connectWalletBtn.textContent = 'Conectado';
            connectWalletBtn.disabled = true;
            showNotification('Billetera conectada con éxito.', false);
            
            updateSwapUI();
            updatePriceAndEstimate();
        } catch (error) {
            console.error('Fallo al conectar la billetera:', error);
            showNotification(`Error: ${error.reason || error.message}`, true);
        }
    };

    const addLiquidity = async () => {
        const amountA = amountAAddInput.value;
        const amountB = amountBAddInput.value;
        if (!amountA || !amountB || parseFloat(amountA) <= 0 || parseFloat(amountB) <= 0) {
            showNotification("Por favor, ingrese montos válidos para ambos tokens.", true);
            return;
        }
        setLoading(true, addLiquidityBtn);
        try {
            const amountAWei = ethers.utils.parseUnits(amountA, 18);
            const amountBWei = ethers.utils.parseUnits(amountB, 18);

            showNotification(`1/3: Aprobando ${tokenASymbol}...`);
            let tx = await tokenA.approve(contractAddress, amountAWei);
            await tx.wait();
            
            showNotification(`2/3: Aprobando ${tokenBSymbol}...`);
            tx = await tokenB.approve(contractAddress, amountBWei);
            await tx.wait();
            
            showNotification('3/3: Añadiendo liquidez...');
            tx = await contract.addLiquidity(amountAWei, amountBWei);
            const receipt = await tx.wait();
            
            showNotification(`¡Liquidez añadida con éxito! <br> Tx: ${receipt.transactionHash.substring(0, 12)}...`, false);
            amountAAddInput.value = '';
            amountBAddInput.value = '';
            updatePriceAndEstimate();
        } catch (error) {
            console.error("Fallo al añadir liquidez:", error);
            showNotification(`Error: ${error.reason || error.message}`, true);
        } finally {
            setLoading(false, addLiquidityBtn);
        }
    };

    const swap = async () => {
        const amountIn = amountInInput.value;
        if (!amountIn || parseFloat(amountIn) <= 0) {
            showNotification("Por favor, ingrese un monto válido.", true);
            return;
        }
        setLoading(true, swapBtn);
        try {
            const amountInWei = ethers.utils.parseUnits(amountIn, 18);
            const tokenIn = isSwapInverted ? tokenB : tokenA;
            const tokenInSymbol = isSwapInverted ? tokenBSymbol : tokenASymbol;

            showNotification(`1/2: Aprobando ${tokenInSymbol}...`);
            let tx = await tokenIn.approve(contractAddress, amountInWei);
            await tx.wait();

            showNotification('2/2: Ejecutando intercambio...');
            const tokenInAddress = isSwapInverted ? tokenBAddress : tokenAAddress;
            tx = await contract.swap(tokenInAddress, amountInWei);
            const receipt = await tx.wait();
            
            showNotification(`¡Intercambio exitoso! <br> Tx: ${receipt.transactionHash.substring(0, 12)}...`, false);
            updateSwapUI();
            updatePriceAndEstimate();
        } catch (error) {
            console.error("Fallo en el intercambio:", error);
            showNotification(`Error: ${error.reason || error.message}`, true);
        } finally {
            setLoading(false, swapBtn);
        }
    };

    // =============================================================================
    //  EVENT LISTENERS
    // =============================================================================
    connectWalletBtn.addEventListener('click', connectWallet);
    tabSwap.addEventListener('click', () => {
        swapInterface.style.display = 'block';
        poolInterface.style.display = 'none';
        tabSwap.classList.add('active');
        tabPool.classList.remove('active');
    });
    tabPool.addEventListener('click', () => {
        swapInterface.style.display = 'none';
        poolInterface.style.display = 'block';
        tabSwap.classList.remove('active');
        tabPool.classList.add('active');
    });
    invertBtn.addEventListener('click', () => {
        isSwapInverted = !isSwapInverted;
        updateSwapUI();
        updatePriceAndEstimate();
    });
    amountInInput.addEventListener('input', updatePriceAndEstimate);
    addLiquidityBtn.addEventListener('click', addLiquidity);
    swapBtn.addEventListener('click', swap);

    notifications.textContent = 'Bienvenido. Conecte su billetera para comenzar.';
});