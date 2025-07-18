// =============================================================================
//  SimpleSwap DApp Frontend Logic - FINAL AND WORKING VERSION
//  This version uses the new, correct contract addresses you just deployed.
//  This is the definitive file for your project.
// =============================================================================

document.addEventListener('DOMContentLoaded', () => {
    // =============================================================================
    //  CONFIGURATION (YOUR NEW, CORRECT CONTRACT ADDRESSES)
    //  These addresses are from your successful deployment on Sepolia.
    // =============================================================================
    const contractAddress = ethers.utils.getAddress("0x2438fAED6Aac675E64625E900B25B25956403163");
    const tokenAAddress = ethers.utils.getAddress("0x07Ae78493B8B375c5cD73e7244c9538Af5F26d42");
    const tokenBAddress = ethers.utils.getAddress("0xB57aA4d3cE23f629B3E7dBaf6d41cFd938dce8C3");

    // =============================================================================
    //  ABIs (Application Binary Interfaces)
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
    //  STATE AND DOM SELECTORS
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
    //  UI & HELPER FUNCTIONS
    // =============================================================================
    const showNotification = (message, isError = false) => {
        notifications.innerHTML = message;
        notifications.style.color = isError ? '#e74c3c' : '#2ecc71';
    };

    const setLoading = (isLoading, button) => {
        if (isLoading) {
            button.dataset.originalText = button.textContent;
            button.textContent = 'Processing...';
            button.disabled = true;
        } else {
            button.textContent = button.dataset.originalText;
            button.disabled = false;
        }
    };
    
    const updateSwapUI = () => {
        const inSymbol = isSwapInverted ? tokenBSymbol : tokenASymbol;
        const outSymbol = isSwapInverted ? tokenASymbol : tokenBSymbol;
        labelAmountIn.textContent = `Send (${inSymbol})`;
        labelAmountOut.textContent = `Receive (${outSymbol})`;
        amountInInput.value = '';
        amountOutInput.value = '';
        priceText.textContent = 'Calculating price...';
        swapBtn.disabled = true;
    };

    const updatePriceAndEstimate = async () => {
        if (!contract) return;
        try {
            const [reserveA, reserveB] = await contract.getReserves();
            if (reserveA.isZero() || reserveB.isZero()) {
                priceText.textContent = 'Pool has no liquidity yet.';
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
            console.error("Error fetching price:", error);
            priceText.textContent = "Error fetching price.";
        }
    };

    // =============================================================================
    //  CORE WEB3 LOGIC
    // =============================================================================
    const connectWallet = async () => {
        if (!window.ethereum) {
            showNotification('To use this DApp, please install MetaMask.', true);
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

            walletStatus.textContent = 'Status: Connected';
            walletAddress.textContent = `Wallet: ${userAddress.substring(0, 6)}...${userAddress.substring(userAddress.length - 4)}`;
            connectWalletBtn.textContent = 'Connected';
            connectWalletBtn.disabled = true;
            showNotification('Wallet connected successfully.', false);
            
            updateSwapUI();
            updatePriceAndEstimate();
        } catch (error) {
            console.error('Failed to connect wallet:', error);
            showNotification(`Error: ${error.reason || error.message}`, true);
        }
    };

    const addLiquidity = async () => {
        const amountA = amountAAddInput.value;
        const amountB = amountBAddInput.value;
        if (!amountA || !amountB || parseFloat(amountA) <= 0 || parseFloat(amountB) <= 0) {
            showNotification("Please enter valid amounts for both tokens.", true);
            return;
        }
        setLoading(true, addLiquidityBtn);
        try {
            const amountAWei = ethers.utils.parseUnits(amountA, 18);
            const amountBWei = ethers.utils.parseUnits(amountB, 18);

            showNotification(`1/3: Approving ${tokenASymbol}...`);
            let tx = await tokenA.approve(contractAddress, amountAWei);
            await tx.wait();
            
            showNotification(`2/3: Approving ${tokenBSymbol}...`);
            tx = await tokenB.approve(contractAddress, amountBWei);
            await tx.wait();
            
            showNotification('3/3: Adding liquidity...');
            tx = await contract.addLiquidity(amountAWei, amountBWei);
            const receipt = await tx.wait();
            
            showNotification(`Liquidity added successfully! <br> Tx: ${receipt.transactionHash.substring(0, 12)}...`, false);
            amountAAddInput.value = '';
            amountBAddInput.value = '';
            updatePriceAndEstimate();
        } catch (error) {
            console.error("Failed to add liquidity:", error);
            showNotification(`Error: ${error.reason || error.message}`, true);
        } finally {
            setLoading(false, addLiquidityBtn);
        }
    };

    const swap = async () => {
        const amountIn = amountInInput.value;
        if (!amountIn || parseFloat(amountIn) <= 0) {
            showNotification("Please enter a valid amount.", true);
            return;
        }
        setLoading(true, swapBtn);
        try {
            const amountInWei = ethers.utils.parseUnits(amountIn, 18);
            const tokenIn = isSwapInverted ? tokenB : tokenA;
            const tokenInSymbol = isSwapInverted ? tokenBSymbol : tokenASymbol;

            showNotification(`1/2: Approving ${tokenInSymbol}...`);
            let tx = await tokenIn.approve(contractAddress, amountInWei);
            await tx.wait();

            showNotification('2/2: Executing swap...');
            const tokenInAddress = isSwapInverted ? tokenBAddress : tokenAAddress;
            tx = await contract.swap(tokenInAddress, amountInWei);
            const receipt = await tx.wait();
            
            showNotification(`Swap successful! <br> Tx: ${receipt.transactionHash.substring(0, 12)}...`, false);
            updateSwapUI();
            updatePriceAndEstimate();
        } catch (error) {
            console.error("Failed to swap:", error);
            showNotification(`Error: ${error.reason || error.message}`, true);
        } finally {
            setLoading(false, swapBtn);
        }
    };

    // =============================================================================
    //  EVENT LISTENERS & INITIALIZATION
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

    notifications.textContent = 'Welcome. Please connect your wallet to begin.';
});