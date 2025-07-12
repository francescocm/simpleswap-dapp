// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

/**
 * @title IERC20
 * @dev Minimal interface for ERC20 token functions required by the swap contract.
 */
interface IERC20 {
    function transfer(address recipient, uint amount) external returns (bool);
    function transferFrom(address sender, address recipient, uint amount) external returns (bool);
    function approve(address spender, uint256 amount) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
}

/**
 * @title SimpleSwap
 * @author Francesco Centarti Maestu
 * @notice A basic Automated Market Maker (AMM) contract.
 * @dev Final refactored version. Implements NatSpec, gas optimizations, and a corrected liquidity calculation model.
 */
contract SimpleSwap {

    // =================================================================
    // State Variables
    // =================================================================

    /**
     * @notice Stores the reserve amount for a given token pair.
     * @dev mapping(address tokenA => mapping(address tokenB => uint reserve))
     */
    mapping(address => mapping(address => uint)) public reserves;

    /**
     * @notice Stores the amount of liquidity each user has provided for a specific pair.
     * @dev mapping(address tokenA => mapping(address tokenB => mapping(address user => uint liquidity)))
     */
    mapping(address => mapping(address => mapping(address => uint))) public liquidity;
    
    /**
     * @notice The total liquidity shares issued for a pair. Essential for correct calculations.
     * @dev mapping(address tokenA => mapping(address tokenB => uint totalLiquidity))
     */
    mapping(address => mapping(address => uint)) public totalLiquidity;


    // =================================================================
    // Events
    // =================================================================
    event LiquidityAdded(address indexed provider, address indexed tokenA, address indexed tokenB, uint amountA, uint amountB, uint liquidity);
    event LiquidityRemoved(address indexed provider, address indexed tokenA, address indexed tokenB, uint amountA, uint amountB, uint liquidity);
    event Swap(address indexed user, address indexed tokenIn, address indexed tokenOut, uint amountIn, uint amountOut);


    // =================================================================
    // Core Functions
    // =================================================================
    
    /**
     * @notice Adds liquidity to a token pair pool.
     * @param tokenA Address of the first token.
     * @param tokenB Address of the second token.
     * @param amountADesired The desired amount of tokenA to add.
     * @param amountBDesired The desired amount of tokenB to add.
     * @param amountAMin The minimum amount of tokenA to add, for slippage protection.
     * @param amountBMin The minimum amount of tokenB to add, for slippage protection.
     * @param to The address that will receive the liquidity units.
     * @param deadline The timestamp after which the transaction will revert.
     * @return amountA The actual amount of tokenA added.
     * @return amountB The actual amount of tokenB added.
     * @return liquidityMinted The amount of liquidity units minted.
     */
    function addLiquidity(
        address tokenA,
        address tokenB,
        uint amountADesired,
        uint amountBDesired,
        uint amountAMin,
        uint amountBMin,
        address to,
        uint deadline
    ) external returns (uint amountA, uint amountB, uint liquidityMinted) {
        require(block.timestamp <= deadline, "EXPIRED");

        (uint reserveA, uint reserveB) = (reserves[tokenA][tokenB], reserves[tokenB][tokenA]);
        
        if (reserveA == 0 && reserveB == 0) {
            amountA = amountADesired;
            amountB = amountBDesired;
            // For the first provider, liquidity is sqrt(a * b)
            liquidityMinted = _sqrt(amountA * amountB);
        } else {
            uint amountBOptimal = (amountADesired * reserveB) / reserveA;
            if (amountBOptimal <= amountBDesired) {
                require(amountBOptimal >= amountBMin, "LOW_B");
                amountA = amountADesired;
                amountB = amountBOptimal;
            } else {
                uint amountAOptimal = (amountBDesired * reserveA) / reserveB;
                require(amountAOptimal >= amountAMin, "LOW_A");
                amountA = amountAOptimal;
                amountB = amountBDesired;
            }
            // For subsequent providers, liquidity is proportional to the existing ratio.
            uint lpTotal = totalLiquidity[tokenA][tokenB];
            liquidityMinted = (amountA * lpTotal) / reserveA;
        }

        require(liquidityMinted > 0, "ZERO_LIQUIDITY");

        IERC20(tokenA).transferFrom(msg.sender, address(this), amountA);
        IERC20(tokenB).transferFrom(msg.sender, address(this), amountB);

        liquidity[tokenA][tokenB][to] += liquidityMinted;
        totalLiquidity[tokenA][tokenB] += liquidityMinted;
        totalLiquidity[tokenB][tokenA] += liquidityMinted; // Maintain symmetry

        reserves[tokenA][tokenB] = reserveA + amountA;
        reserves[tokenB][tokenA] = reserveB + amountB;

        emit LiquidityAdded(msg.sender, tokenA, tokenB, amountA, amountB, liquidityMinted);
    }
    
    /**
     * @notice Removes liquidity from a token pair pool.
     * @param tokenA Address of the first token.
     * @param tokenB Address of the second token.
     * @param liquidityAmount The amount of liquidity units to burn.
     * @param amountAMin The minimum amount of tokenA to receive.
     * @param amountBMin The minimum amount of tokenB to receive.
     * @param to The address that will receive the withdrawn tokens.
     * @param deadline The timestamp after which the transaction will revert.
     * @return amountA The actual amount of tokenA withdrawn.
     * @return amountB The actual amount of tokenB withdrawn.
     */
    function removeLiquidity(
        address tokenA,
        address tokenB,
        uint liquidityAmount,
        uint amountAMin,
        uint amountBMin,
        address to,
        uint deadline
    ) external returns (uint amountA, uint amountB) {
        require(block.timestamp <= deadline, "EXPIRED");

        uint userLiquidity = liquidity[tokenA][tokenB][msg.sender];
        require(userLiquidity >= liquidityAmount, "INSUFFICIENT_LIQUIDITY");

        uint lpTotal = totalLiquidity[tokenA][tokenB];
        (uint reserveA, uint reserveB) = (reserves[tokenA][tokenB], reserves[tokenB][tokenA]);
        
        amountA = (liquidityAmount * reserveA) / lpTotal;
        amountB = (liquidityAmount * reserveB) / lpTotal;

        require(amountA >= amountAMin, "LOW_A_OUT");
        require(amountB >= amountBMin, "LOW_B_OUT");
        
        liquidity[tokenA][tokenB][msg.sender] = userLiquidity - liquidityAmount;
        totalLiquidity[tokenA][tokenB] = lpTotal - liquidityAmount;
        totalLiquidity[tokenB][tokenA] = lpTotal - liquidityAmount;

        reserves[tokenA][tokenB] = reserveA - amountA;
        reserves[tokenB][tokenA] = reserveB - amountB;

        IERC20(tokenA).transfer(to, amountA);
        IERC20(tokenB).transfer(to, amountB);

        emit LiquidityRemoved(msg.sender, tokenA, tokenB, amountA, amountB, liquidityAmount);
    }
    
    /**
     * @notice Swaps an exact amount of an input token for an output token.
     * @param amountIn The exact amount of the input token.
     * @param amountOutMin The minimum amount of the output token required.
     * @param path An array of token addresses, where path[0] is the input and path[1] is the output.
     * @param to The address that will receive the output tokens.
     * @param deadline The timestamp after which the transaction will revert.
     * @return amounts An array containing the input and output amounts.
     */
    function swapExactTokensForTokens(
        uint amountIn,
        uint amountOutMin,
        address[] calldata path,
        address to,
        uint deadline
    ) external returns (uint[] memory amounts) {
        require(block.timestamp <= deadline, "EXPIRED");
        require(path.length == 2, "INVALID_PATH");

        address tokenIn = path[0];
        address tokenOut = path[1];
        
        (uint reserveIn, uint reserveOut) = (reserves[tokenIn][tokenOut], reserves[tokenOut][tokenIn]);
        
        uint amountOut = getAmountOut(amountIn, reserveIn, reserveOut);
        require(amountOut >= amountOutMin, "INSUFFICIENT_OUTPUT");

        IERC20(tokenIn).transferFrom(msg.sender, address(this), amountIn);
        
        reserves[tokenIn][tokenOut] = reserveIn + amountIn;
        reserves[tokenOut][tokenIn] = reserveOut - amountOut;

        IERC20(tokenOut).transfer(to, amountOut);

        emit Swap(msg.sender, tokenIn, tokenOut, amountIn, amountOut);
        
        amounts = new uint[](2);
        amounts[0] = amountIn;
        amounts[1] = amountOut;
        return amounts;
    }


    // =================================================================
    // View & Pure Functions
    // =================================================================

    /**
     * @notice Calculates the price of tokenA in terms of tokenB.
     * @return price The amount of tokenB equivalent to 1e18 of tokenA.
     */
    function getPrice(address tokenA, address tokenB) external view returns (uint price) {
        (uint reserveA, uint reserveB) = (reserves[tokenA][tokenB], reserves[tokenB][tokenA]);
        require(reserveA > 0 && reserveB > 0, "NO_RESERVES");
        price = (reserveB * 1e18) / reserveA;
    }

    /**
     * @notice Calculates the output amount based on the constant product formula.
     * @return amountOut The calculated amount of the output token.
     */
    function getAmountOut(uint amountIn, uint reserveIn, uint reserveOut) public pure returns (uint amountOut) {
        require(amountIn > 0, "ZERO_INPUT");
        require(reserveIn > 0 && reserveOut > 0, "INSUFFICIENT_LIQUIDITY");
        
        uint numerator = amountIn * reserveOut;
        uint denominator = reserveIn + amountIn;
        amountOut = numerator / denominator;
    }

    /**
     * @dev Calculates the integer square root of a number using the Babylonian method.
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