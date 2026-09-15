// SPDX-License-Identifier: MIT
pragma solidity ^0.8.22;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/**
 * @dev Minimal Moonwell / Compound-style mToken for local Hardhat tests.
 * Uses standard exchange-rate math:
 *   mintTokens = mintAmount * 1e18 / exchangeRate
 *   underlying = redeemTokens * exchangeRate / 1e18
 * Call setExchangeRate to simulate accrued yield.
 */
contract MockMErc20 is ERC20 {
    using SafeERC20 for IERC20;

    IERC20 public immutable underlyingToken;
    uint256 public exchangeRateStored = 1e18;

    constructor(address underlying_) ERC20("Mock mUSDC", "mUSDC") {
        underlyingToken = IERC20(underlying_);
    }

    function underlying() external view returns (address) {
        return address(underlyingToken);
    }

    function decimals() public pure override returns (uint8) {
        return 8;
    }

    function setExchangeRate(uint256 rate) external {
        require(rate > 0, "rate");
        exchangeRateStored = rate;
        // Top up cash so unpaid “interest” is withdrawable unless cashCap limits it
        uint256 owed = (totalSupply() * rate) / 1e18;
        uint256 cash = underlyingToken.balanceOf(address(this));
        if (owed > cash) {
            MockUSDCMinter(address(underlyingToken)).mint(address(this), owed - cash);
        }
    }

    function getCash() public view returns (uint256) {
        uint256 bal = underlyingToken.balanceOf(address(this));
        if (cashCapEnabled && bal > cashCap) {
            return cashCap;
        }
        return bal;
    }

    /// @dev When enabled, getCash/redeem are limited to `cashCap` (simulates borrowed liquidity).
    bool public cashCapEnabled;
    uint256 public cashCap;

    function setCashCap(bool enabled, uint256 cap) external {
        cashCapEnabled = enabled;
        cashCap = cap;
    }

    function mint(uint256 mintAmount) external returns (uint256) {
        underlyingToken.safeTransferFrom(msg.sender, address(this), mintAmount);
        uint256 mintTokens = (mintAmount * 1e18) / exchangeRateStored;
        require(mintTokens > 0, "zero mint");
        _mint(msg.sender, mintTokens);
        return 0;
    }

    function redeem(uint256 redeemTokens) external returns (uint256) {
        uint256 underlyingAmount = (redeemTokens * exchangeRateStored) / 1e18;
        _burn(msg.sender, redeemTokens);
        _payoutUnderlying(msg.sender, underlyingAmount);
        return 0;
    }

    function redeemUnderlying(uint256 redeemAmount) external returns (uint256) {
        require(getCash() >= redeemAmount, "insufficient cash");
        uint256 redeemTokens = (redeemAmount * 1e18) / exchangeRateStored;
        _burn(msg.sender, redeemTokens);
        _payoutUnderlying(msg.sender, redeemAmount);
        return 0;
    }

    /// @dev Simulate accrued interest by minting any shortfall onto this market,
    /// unless a cash cap is enforcing liquidity limits.
    function _payoutUnderlying(address to, uint256 amount) internal {
        uint256 cash = underlyingToken.balanceOf(address(this));
        if (amount > cash) {
            if (cashCapEnabled) {
                revert("insufficient cash");
            }
            MockUSDCMinter(address(underlyingToken)).mint(address(this), amount - cash);
        }
        if (cashCapEnabled) {
            require(getCash() >= amount, "insufficient cash");
        }
        underlyingToken.safeTransfer(to, amount);
    }
}

interface MockUSDCMinter {
    function mint(address to, uint256 amount) external;
}
