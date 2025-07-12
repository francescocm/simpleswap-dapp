// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

// We import both ERC20 and Ownable from OpenZeppelin
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title MockERC20
 * @dev A simple ERC20 token for testing purposes that is also Ownable.
 * The `mint` function is restricted to the owner.
 */
// The contract now inherits from both ERC20 and Ownable
contract MockERC20 is ERC20, Ownable {
    // The constructor now passes the initial owner to the Ownable contract
    constructor(string memory name, string memory symbol) ERC20(name, symbol) Ownable(msg.sender) {}

    /**
     * @notice Creates `amount` tokens and assigns them to `to`.
     * @dev Can only be called by the contract owner (the deployer).
     * The `onlyOwner` modifier ensures this.
     */
    function mint(address to, uint256 amount) public onlyOwner {
        _mint(to, amount);
    }
}