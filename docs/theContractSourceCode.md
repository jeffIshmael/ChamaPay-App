# Contract Address = 0xC535E8838730CfE097A0d3b7C6eF565B45DC74e3
# Implementation Address = 0x6eFD13b4Daeec541F820282baD19A3716D65B59f

## Source code
// SPDX-License-Identifier: MIT
// OpenZeppelin Contracts (last updated v5.0.0) (access/Ownable.sol)

pragma solidity ^0.8.20;

import {ContextUpgradeable} from "../utils/ContextUpgradeable.sol";
import {Initializable} from "../proxy/utils/Initializable.sol";

/**
 * @dev Contract module which provides a basic access control mechanism, where
 * there is an account (an owner) that can be granted exclusive access to
 * specific functions.
 *
 * The initial owner is set to the address provided by the deployer. This can
 * later be changed with {transferOwnership}.
 *
 * This module is used through inheritance. It will make available the modifier
 * `onlyOwner`, which can be applied to your functions to restrict their use to
 * the owner.
 */
abstract contract OwnableUpgradeable is Initializable, ContextUpgradeable {
    /// @custom:storage-location erc7201:openzeppelin.storage.Ownable
    struct OwnableStorage {
        address _owner;
    }

    // keccak256(abi.encode(uint256(keccak256("openzeppelin.storage.Ownable")) - 1)) & ~bytes32(uint256(0xff))
    bytes32 private constant OwnableStorageLocation = 0x9016d09d72d40fdae2fd8ceac6b6234c7706214fd39c1cd1e609a0528c199300;

    function _getOwnableStorage() private pure returns (OwnableStorage storage $) {
        assembly {
            $.slot := OwnableStorageLocation
        }
    }

    /**
     * @dev The caller account is not authorized to perform an operation.
     */
    error OwnableUnauthorizedAccount(address account);

    /**
     * @dev The owner is not a valid owner account. (eg. `address(0)`)
     */
    error OwnableInvalidOwner(address owner);

    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);

    /**
     * @dev Initializes the contract setting the address provided by the deployer as the initial owner.
     */
    function __Ownable_init(address initialOwner) internal onlyInitializing {
        __Ownable_init_unchained(initialOwner);
    }

    function __Ownable_init_unchained(address initialOwner) internal onlyInitializing {
        if (initialOwner == address(0)) {
            revert OwnableInvalidOwner(address(0));
        }
        _transferOwnership(initialOwner);
    }

    /**
     * @dev Throws if called by any account other than the owner.
     */
    modifier onlyOwner() {
        _checkOwner();
        _;
    }

    /**
     * @dev Returns the address of the current owner.
     */
    function owner() public view virtual returns (address) {
        OwnableStorage storage $ = _getOwnableStorage();
        return $._owner;
    }

    /**
     * @dev Throws if the sender is not the owner.
     */
    function _checkOwner() internal view virtual {
        if (owner() != _msgSender()) {
            revert OwnableUnauthorizedAccount(_msgSender());
        }
    }

    /**
     * @dev Leaves the contract without owner. It will not be possible to call
     * `onlyOwner` functions. Can only be called by the current owner.
     *
     * NOTE: Renouncing ownership will leave the contract without an owner,
     * thereby disabling any functionality that is only available to the owner.
     */
    function renounceOwnership() public virtual onlyOwner {
        _transferOwnership(address(0));
    }

    /**
     * @dev Transfers ownership of the contract to a new account (`newOwner`).
     * Can only be called by the current owner.
     */
    function transferOwnership(address newOwner) public virtual onlyOwner {
        if (newOwner == address(0)) {
            revert OwnableInvalidOwner(address(0));
        }
        _transferOwnership(newOwner);
    }

    /**
     * @dev Transfers ownership of the contract to a new account (`newOwner`).
     * Internal function without access restriction.
     */
    function _transferOwnership(address newOwner) internal virtual {
        OwnableStorage storage $ = _getOwnableStorage();
        address oldOwner = $._owner;
        $._owner = newOwner;
        emit OwnershipTransferred(oldOwner, newOwner);
    }
}

## Contract ABI
[{"inputs":[],"stateMutability":"nonpayable","type":"constructor"},{"inputs":[{"internalType":"address","name":"target","type":"address"}],"name":"AddressEmptyCode","type":"error"},{"inputs":[{"internalType":"address","name":"implementation","type":"address"}],"name":"ERC1967InvalidImplementation","type":"error"},{"inputs":[],"name":"ERC1967NonPayable","type":"error"},{"inputs":[],"name":"EnforcedPause","type":"error"},{"inputs":[],"name":"ExpectedPause","type":"error"},{"inputs":[],"name":"FailedCall","type":"error"},{"inputs":[],"name":"InvalidInitialization","type":"error"},{"inputs":[],"name":"NotInitializing","type":"error"},{"inputs":[{"internalType":"address","name":"owner","type":"address"}],"name":"OwnableInvalidOwner","type":"error"},{"inputs":[{"internalType":"address","name":"account","type":"address"}],"name":"OwnableUnauthorizedAccount","type":"error"},{"inputs":[],"name":"UUPSUnauthorizedCallContext","type":"error"},{"inputs":[{"internalType":"bytes32","name":"slot","type":"bytes32"}],"name":"UUPSUnsupportedProxiableUUID","type":"error"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"bytes32","name":"orderId","type":"bytes32"}],"name":"EscrowReleased","type":"event"},{"anonymous":false,"inputs":[{"indexed":false,"internalType":"uint64","name":"version","type":"uint64"}],"name":"Initialized","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"bytes32","name":"orderId","type":"bytes32"},{"indexed":true,"internalType":"address","name":"token","type":"address"},{"indexed":true,"internalType":"address","name":"requester","type":"address"},{"indexed":false,"internalType":"uint256","name":"amount","type":"uint256"},{"indexed":false,"internalType":"string","name":"messageHash","type":"string"},{"indexed":false,"internalType":"uint256","name":"rate","type":"uint256"},{"indexed":false,"internalType":"enum IOrderManagement.OrderType","name":"orderType","type":"uint8"}],"name":"OrderCreated","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"bytes32","name":"orderId","type":"bytes32"}],"name":"OrderRefunded","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"bytes32","name":"orderId","type":"bytes32"}],"name":"OrderSettled","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"previousOwner","type":"address"},{"indexed":true,"internalType":"address","name":"newOwner","type":"address"}],"name":"OwnershipTransferred","type":"event"},{"anonymous":false,"inputs":[{"indexed":false,"internalType":"address","name":"account","type":"address"}],"name":"Paused","type":"event"},{"anonymous":false,"inputs":[{"indexed":false,"internalType":"address","name":"account","type":"address"}],"name":"Unpaused","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"implementation","type":"address"}],"name":"Upgraded","type":"event"},{"inputs":[],"name":"UPGRADE_INTERFACE_VERSION","outputs":[{"internalType":"string","name":"","type":"string"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"aggregatorAddress","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"_token","type":"address"},{"internalType":"uint256","name":"_amount","type":"uint256"}],"name":"approveTokensForContract","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"address","name":"_token","type":"address"},{"internalType":"address","name":"_owner","type":"address"}],"name":"checkAllowance","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"_userAddress","type":"address"},{"internalType":"uint256","name":"_amount","type":"uint256"},{"internalType":"address","name":"_token","type":"address"},{"internalType":"enum IOrderManagement.OrderType","name":"_orderType","type":"uint8"},{"internalType":"string","name":"messageHash","type":"string"}],"name":"createOrder","outputs":[{"internalType":"bytes32","name":"orderId","type":"bytes32"}],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"bytes32","name":"_orderId","type":"bytes32"},{"internalType":"uint256","name":"_amount","type":"uint256"}],"name":"escrowFunds","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[],"name":"getContractAddress","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"token","type":"address"}],"name":"getContractBalance","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"bytes32","name":"_orderId","type":"bytes32"}],"name":"getOrder","outputs":[{"internalType":"bytes32","name":"orderId","type":"bytes32"},{"internalType":"address","name":"requester","type":"address"},{"internalType":"address","name":"provider","type":"address"},{"internalType":"address","name":"token","type":"address"},{"internalType":"uint256","name":"amount","type":"uint256"},{"internalType":"enum OrderManagement.OrderStatus","name":"status","type":"uint8"},{"internalType":"enum IOrderManagement.OrderType","name":"orderType","type":"uint8"},{"internalType":"string","name":"messageHash","type":"string"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"token","type":"address"}],"name":"getTreasuryBalance","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"getVersion","outputs":[{"internalType":"string","name":"","type":"string"}],"stateMutability":"pure","type":"function"},{"inputs":[{"internalType":"address","name":"aggregator","type":"address"},{"internalType":"address","name":"_treasury","type":"address"},{"internalType":"address","name":"_owner","type":"address"}],"name":"initialize","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"bytes32","name":"","type":"bytes32"}],"name":"orders","outputs":[{"internalType":"bytes32","name":"orderId","type":"bytes32"},{"internalType":"address","name":"requester","type":"address"},{"internalType":"address","name":"provider","type":"address"},{"internalType":"address","name":"token","type":"address"},{"internalType":"uint256","name":"amount","type":"uint256"},{"internalType":"enum OrderManagement.OrderStatus","name":"status","type":"uint8"},{"internalType":"enum IOrderManagement.OrderType","name":"orderType","type":"uint8"},{"internalType":"string","name":"messageHash","type":"string"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"owner","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"pause","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[],"name":"paused","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"proxiableUUID","outputs":[{"internalType":"bytes32","name":"","type":"bytes32"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"bytes32","name":"_orderId","type":"bytes32"}],"name":"refundOrder","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"bytes32","name":"_orderId","type":"bytes32"}],"name":"releaseEscrow","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[],"name":"renounceOwnership","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"bytes32","name":"_orderId","type":"bytes32"}],"name":"settleOrder","outputs":[],"stateMutability":"payable","type":"function"},{"inputs":[{"internalType":"address","name":"newOwner","type":"address"}],"name":"transferOwnership","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[],"name":"treasury","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"unpause","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"address","name":"_aggregator","type":"address"}],"name":"updateAggregatorAddress","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"address","name":"_treasury","type":"address"}],"name":"updateTreasury","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"address","name":"newImplementation","type":"address"},{"internalType":"bytes","name":"data","type":"bytes"}],"name":"upgradeToAndCall","outputs":[],"stateMutability":"payable","type":"function"}]


