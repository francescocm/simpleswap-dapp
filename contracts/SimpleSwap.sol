// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

/**
 * @title IERC20
 * @dev Minimal interface for ERC20 tokens.
 */
interface IERC20 {
    function transfer(address recipient, uint amount) external returns (bool);
    function transferFrom(address sender, address recipient, uint amount) external returns (bool);
    function approve(address spender, uint256 amount) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
}

/**
 * @title SimpleSwap
 * @author Francesco CM
 * @notice A simple decentralized exchange contract for swapping between two ERC20 tokens.
 * @dev This contract implements an automated market maker (AMM) with a constant product formula.
 */
contract SimpleSwap {
    /// @notice Stores the reserves for a token pair. mapping(tokenA => mapping(tokenB => reserveOfTokenA))
    mapping(address => mapping(address => uint)) public reserves;
    /// @notice Stores the liquidity provided by each user for a specific token pair.
    mapping(address => mapping(address => mapping(address => uint))) public liquidity;
    /// @notice Stores the total liquidity for a token pair.
    mapping(address => mapping(address => uint)) public totalLiquidity;

    /// @notice Emitted when a user adds liquidity to a pool.
    /// @param provider The address of the liquidity provider.
    /// @param tokenA The address of the first token.
    /// @param tokenB The address of the second token.
    /// @param amountA The amount of tokenA added.
    /// @param amountB The amount of tokenB added.
    /// @param liquidity The amount of liquidity tokens minted.
    event LiquidityAdded(address indexed provider, address indexed tokenA, address indexed tokenB, uint amountA, uint amountB, uint liquidity);
    
    /// @notice Emitted when a user removes liquidity from a pool.
    /// @param provider The address of the liquidity provider.
    /// @param tokenA The address of the first token.
    /// @param tokenB The address of the second token.
    /// @param amountA The amount of tokenA returned.
    /// @param amountB The amount of tokenB returned.
    /// @param liquidity The amount of liquidity tokens burned.
    event LiquidityRemoved(address indexed provider, address indexed tokenA, address indexed tokenB, uint amountA, uint amountB, uint liquidity);
    
    /// @notice Emitted when a user swaps tokens.
    /// @param user The address of the user performing the swap.
    /// @param tokenIn The address of the token being sent to the contract.
    /// @param tokenOut The address of the token being received from the contract.
    /// @param amountIn The amount of tokenIn swapped.
    /// @param amountOut The amount of tokenOut received.
    event Swap(address indexed user, address indexed tokenIn, address indexed tokenOut, uint amountIn, uint amountOut);

    /**
     * @notice Adds liquidity to an ERC20-ERC20 pair.
     * @dev The amounts of tokens added are calculated based on the current reserves ratio.
     * @param tokenA The address of the first token.
     * @param tokenB The address of the second token.
     * @param amountADesired The desired amount of tokenA to add.
     * @param amountBDesired The desired amount of tokenB to add.
     * @param amountAMin The minimum amount of tokenA to add.
     * @param amountBMin The minimum amount of tokenB to add.
     * @param to The address that will receive the liquidity tokens.
     * @param deadline The deadline by which the transaction must be executed.
     * @return amountA The actual amount of tokenA added.
     * @return amountB The actual amount of tokenB added.
     * @return liquidityMinted The amount of LP tokens minted.
     */
    function addLiquidity(
        address tokenA, address tokenB, uint amountADesired, uint amountBDesired,
        uint amountAMin, uint amountBMin, address to, uint deadline
    ) external returns (uint amountA, uint amountB, uint liquidityMinted) {
        require(block.timestamp <= deadline, "SS:EXPIRED");
        
        // --- Gas Optimization: Load state variables into memory ---
        (uint reserveA, uint reserveB) = (reserves[tokenA][tokenB], reserves[tokenB][tokenA]);

        if (reserveA == 0 && reserveB == 0) {
            amountA = amountADesired;
            amountB = amountBDesired;
            liquidityMinted = _sqrt(amountA * amountB);
        } else {
            uint amountBOptimal = (amountADesired * reserveB) / reserveA;
            if (amountBOptimal <= amountBDesired) {
                require(amountBOptimal >= amountBMin, "SS:LOW_B");
                amountA = amountADesired;
                amountB = amountBOptimal;
            } else {
                uint amountAOptimal = (amountBDesired * reserveA) / reserveB;
                require(amountAOptimal >= amountAMin, "SS:LOW_A");
                amountA = amountAOptimal;
                amountB = amountBDesired;
            }
            uint lpTotal = totalLiquidity[tokenA][tokenB];
            liquidityMinted = (amountA * lpTotal) / reserveA;
        }
        require(liquidityMinted > 0, "SS:ZERO_LIQ");
        
        IERC20(tokenA).transferFrom(msg.sender, address(this), amountA);
        IERC20(tokenB).transferFrom(msg.sender, address(this), amountB);
        
        liquidity[tokenA][tokenB][to] += liquidityMinted;

        // --- Gas Optimization: Update state variables from memory ---
        uint newTotalLiquidity = totalLiquidity[tokenA][tokenB] + liquidityMinted;
        totalLiquidity[tokenA][tokenB] = newTotalLiquidity;
        totalLiquidity[tokenB][tokenA] = newTotalLiquidity;
        reserves[tokenA][tokenB] = reserveA + amountA;
        reserves[tokenB][tokenA] = reserveB + amountB;
        
        emit LiquidityAdded(msg.sender, tokenA, tokenB, amountA, amountB, liquidityMinted);
    }

    /**
     * @notice Removes liquidity from a pool.
     * @param tokenA The address of the first token.
     * @param tokenB The address of the second token.
     * @param liquidityAmount The amount of LP tokens to burn.
     * @param amountAMin The minimum amount of tokenA to receive.
     * @param amountBMin The minimum amount of tokenB to receive.
     * @param to The address to send the tokens to.
     * @param deadline The deadline for the transaction.
     * @return amountA The amount of tokenA returned.
     * @return amountB The amount of tokenB returned.
     */
    function removeLiquidity(
        address tokenA, address tokenB, uint liquidityAmount, uint amountAMin,
        uint amountBMin, address to, uint deadline
    ) external returns (uint amountA, uint amountB) {
        require(block.timestamp <= deadline, "SS:EXPIRED");
        require(liquidity[tokenA][tokenB][msg.sender] >= liquidityAmount, "SS:INSUF_LIQ");

        // --- Gas Optimization: Load state variables into memory ---
        uint lpTotal = totalLiquidity[tokenA][tokenB];
        (uint reserveA, uint reserveB) = (reserves[tokenA][tokenB], reserves[tokenB][tokenA]);
        
        amountA = (liquidityAmount * reserveA) / lpTotal;
        amountB = (liquidityAmount * reserveB) / lpTotal;
        require(amountA >= amountAMin, "SS:LOW_A_OUT");
        require(amountB >= amountBMin, "SS:LOW_B_OUT");
        
        liquidity[tokenA][tokenB][msg.sender] -= liquidityAmount;

        // --- Gas Optimization: Update state variables from memory ---
        uint newTotalLiquidity = lpTotal - liquidityAmount;
        totalLiquidity[tokenA][tokenB] = newTotalLiquidity;
        totalLiquidity[tokenB][tokenA] = newTotalLiquidity;
        reserves[tokenA][tokenB] = reserveA - amountA;
        reserves[tokenB][tokenA] = reserveB - amountB;

        IERC20(tokenA).transfer(to, amountA);
        IERC20(tokenB).transfer(to, amountB);
        
        emit LiquidityRemoved(msg.sender, tokenA, tokenB, amountA, amountB, liquidityAmount);
    }
    
    /**
     * @notice Swaps an exact amount of input tokens for as many output tokens as possible.
     * @param amountIn The exact amount of tokens to send.
     * @param amountOutMin The minimum amount of output tokens required.
     * @param path An array of token addresses representing the swap path. Must be length 2.
     * @param to The address to receive the output tokens.
     * @param deadline The deadline for the transaction.
     * @return amounts An array containing the input and output amounts.
     */
    function swapExactTokensForTokens(
        uint amountIn, uint amountOutMin, address[] calldata path, address to, uint deadline
    ) external returns (uint[] memory amounts) {
        require(block.timestamp <= deadline, "SS:EXPIRED");
        require(path.length == 2, "SS:INVALID_PATH");

        address tokenIn = path[0];
        address tokenOut = path[1];
        
        (uint reserveIn, uint reserveOut) = (reserves[tokenIn][tokenOut], reserves[tokenOut][tokenIn]);
        
        uint amountOut = getAmountOut(amountIn, reserveIn, reserveOut);
        require(amountOut >= amountOutMin, "SS:INSUF_OUTPUT");
        
        IERC20(tokenIn).transferFrom(msg.sender, address(this), amountIn);
        
        reserves[tokenIn][tokenOut] = reserveIn + amountIn;
        reserves[tokenOut][tokenIn] = reserveOut - amountOut;
        
        IERC20(tokenOut).transfer(to, amountOut);
        
        emit Swap(msg.sender, tokenIn, tokenOut, amountIn, amountOut);
        
        amounts = new uint[](2);
        amounts[0] = amountIn;
        amounts[1] = amountOut;
    }

    /**
     * @notice Calculates the price of tokenA in terms of tokenB.
     * @param tokenA The address of the base token.
     * @param tokenB The address of the quote token.
     * @return price The amount of tokenB per 1e18 of tokenA.
     */
    function getPrice(address tokenA, address tokenB) external view returns (uint price) {
        (uint reserveA, uint reserveB) = (reserves[tokenA][tokenB], reserves[tokenB][tokenA]);
        require(reserveA > 0 && reserveB > 0, "SS:NO_RESERVES");
        price = (reserveB * 1e18) / reserveA;
    }

    /**
     * @notice Given an input amount of an asset and pair reserves, returns the maximum output amount of the other asset.
     * @param amountIn The amount of input asset.
     * @param reserveIn The reserve of the input asset.
     * @param reserveOut The reserve of the output asset.
     * @return amountOut The calculated amount of output asset.
     */
    function getAmountOut(uint amountIn, uint reserveIn, uint reserveOut) public pure returns (uint amountOut) {
        require(amountIn > 0, "SS:ZERO_INPUT");
        require(reserveIn > 0 && reserveOut > 0, "SS:INSUF_LIQ");
        uint numerator = amountIn * reserveOut;
        uint denominator = reserveIn + amountIn;
        amountOut = numerator / denominator;
    }

    /**
     * @dev Internal function to calculate the square root of a number using the Babylonian method.
     * @param y The number to calculate the square root of.
     * @return z The integer square root.
     */
    function _sqrt(uint y) internal pure returns (uint z) {
        if (y > 3) {
            z = y;
            uint x = y / 2 + 1;
            while (x < z) {
                z = x;
                x = (y / x + x) / 2;
            }
        } else if (y != 0) {
            z = 1;
        }
    }
}