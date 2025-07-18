// =============================================================================
//  SimpleSwap DApp Frontend Logic - FINAL, CUSTOM-BUILT VERSION
//  This code is written specifically for the SimpleSwap.sol contract you provided.
//  It uses the correct function names, ABIs, and parameters. This is the definitive solution.
// =============================================================================

document.addEventListener('DOMContentLoaded', () => {
    // =============================================================================
    //  CONFIGURATION (Correct, confirmed addresses)
    // =============================================================================
    const contractAddress = ethers.utils.getAddress("0x2438fAED6Aac675E64625E900B25B25956403163");
    const tokenAAddress = ethers.utils.getAddress("0x07Ae78493B8B375c5cD73e7244c9538Af5F26d42");
    const tokenBAddress = ethers.utils.getAddress("0xB57aA4d3cE23f629B3E7dBaf6d41cFd938dce8C3");

    // =============================================================================
    //  ABIs (Generated from YOUR SimpleSwap.sol)
    // =============================================================================
    const contractABI = [
        "function reserves(address, address) view returns (uint)",
        "function addLiquidity(address tokenA, address tokenB, uint amountADesired, uint amountBDesired, uint amountAMin, uint amountBMin, address to, uint deadline) external returns (uint amountA, uint amountB, uint liquidityMinted)",
        "function swapExactTokensForTokens(uint amountIn, uint amountOutMin, address[] calldata path, address to, uint deadline) external returns (uint[] memory amounts)",
        "function getAmountOut(uint amountIn, uint reserveIn, uint reserveOut) public pure returns (uint amountOut)"
    ];
    const tokenABI = ["function approve(address spender, uint256 amount) external returns (bool)", "function balanceOf(address account) external view returns (uint256)", "function symbol() external view returns (string)"];

    // =============================================================================
    //  STATE AND DOM SELECTORS
    // =============================================================================
    let provider, signer, userAddress, contract, tokenA, tokenB;
    let tokenASymbol = 'TKA', tokenBSymbol = 'TKB';
    let isSwapInverted = false;
    let reserves = { reserveA: ethers.BigNumber.from(0), reserveB: ethers.BigNumber.from(0) };

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
    const poolInfoText = document.getElementById('poolInfoText');
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
        labelAmountIn.textContent = `Send (${isSwapInverted ? tokenBSymbol : tokenASymbol})`;
        labelAmountOut.textContent = `Receive (${isSwapInverted ? tokenASymbol : tokenBSymbol})`;
        amountInInput.value = ''; amountOutInput.value = '';
        priceText.textContent = 'Calculating price...';
        swapBtn.disabled = true;
    };

    const updateAllData = async () => {
        if (!contract) return;
        try {
            // Correctly fetch reserves using the public mapping getter
            const [rA, rB] = await Promise.all([
                contract.reserves(tokenAAddress, tokenBAddress),
                contract.reserves(tokenBAddress, tokenAAddress)
            ]);
            reserves = { reserveA: rA, reserveB: rB };

            // Update Swap Output Estimate
            const amountInValue = amountInInput.value;
            if (amountInValue && parseFloat(amountInValue) > 0) {
                const amountInWei = ethers.utils.parseUnits(amountInValue, 18);
                const reserveIn = isSwapInverted ? reserves.reserveB : reserves.reserveA;
                const reserveOut = isSwapInverted ? reserves.reserveA : reserves.reserveB;
                const amountOutWei = await contract.getAmountOut(amountInWei, reserveIn, reserveOut);
                amountOutInput.value = ethers.utils.formatUnits(amountOutWei, 18);
                swapBtn.disabled = false;
            } else {
                amountOutInput.value = '';
                swapBtn.disabled = true;
            }
        } catch (error) {
            console.error("Error fetching data:", error);
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
            await updateAllData();
        } catch (error) {
            console.error('Failed to connect wallet:', error);
            showNotification(`Error: ${error.reason || error.message}`, true);
        }
    };

    const addLiquidity = async () => {
        const amountAStr = amountAAddInput.value;
        const amountBStr = amountBAddInput.value;
        if (!amountAStr || !amountBStr || parseFloat(amountAStr) <= 0 || parseFloat(amountBStr) <= 0) {
            showNotification("Please enter valid amounts.", true);
            return;
        }
        setLoading(true, addLiquidityBtn);
        try {
            const amountAWei = ethers.utils.parseUnits(amountAStr, 18);
            const amountBWei = ethers.utils.parseUnits(amountBStr, 18);

            // Approve tokens first
            showNotification(`1/3: Approving ${tokenASymbol}...`);
            let tx = await tokenA.approve(contractAddress, amountAWei);
            await tx.wait();
            showNotification(`2/3: Approving ${tokenBSymbol}...`);
            tx = await tokenB.approve(contractAddress, amountBWei);
            await tx.wait();
            
            // Correctly call the complex addLiquidity function
            showNotification('3/3: Adding liquidity...');
            const deadline = Math.floor(Date.now() / 1000) + 60 * 10; // 10 minutes from now
            tx = await contract.addLiquidity(
                tokenAAddress, tokenBAddress, amountAWei, amountBWei,
                0, 0, // amountAMin, amountBMin (0 for simplicity in this demo)
                userAddress, deadline
            );
            const receipt = await tx.wait();
            
            showNotification(`Liquidity added successfully! <br> Tx: ${receipt.transactionHash.substring(0, 12)}...`, false);
            amountAAddInput.value = '';
            amountBAddInput.value = '';
            await updateAllData();
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

            // Approve token first
            showNotification(`1/2: Approving ${tokenInSymbol}...`);
            let tx = await tokenIn.approve(contractAddress, amountInWei);
            await tx.wait();

            // Correctly call swapExactTokensForTokens
            showNotification('2/2: Executing swap...');
            const path = isSwapInverted ? [tokenBAddress, tokenAAddress] : [tokenAAddress, tokenBAddress];
            const deadline = Math.floor(Date.now() / 1000) + 60 * 10; // 10 minutes
            tx = await contract.swapExactTokensForTokens(
                amountInWei, 0, // amountOutMin (0 for simplicity)
                path, userAddress, deadline
            );
            const receipt = await tx.wait();
            
            showNotification(`Swap successful! <br> Tx: ${receipt.transactionHash.substring(0, 12)}...`, false);
            updateSwapUI();
            await updateAllData();
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
        swapInterface.style.display = 'block'; poolInterface.style.display = 'none';
        tabSwap.classList.add('active'); tabPool.classList.remove('active');
    });
    tabPool.addEventListener('click', () => {
        swapInterface.style.display = 'none'; poolInterface.style.display = 'block';
        tabSwap.classList.remove('active'); tabPool.classList.add('active');
    });
    invertBtn.addEventListener('click', () => {
        isSwapInverted = !isSwapInverted;
        updateSwapUI();
        updateAllData();
    });
    amountInInput.addEventListener('input', updateAllData);
    addLiquidityBtn.addEventListener('click', addLiquidity);
    swapBtn.addEventListener('click', swap);

    notifications.textContent = 'Welcome. Please connect your wallet to begin.';
});