// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/PausableUpgradeable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/**
 * @title ChamapayEscrow
 * @dev A secure, upgradeable (UUPS) escrow contract for On-Ramping (Fiat -> Crypto) 
 * and Off-Ramping (Crypto -> Fiat) operations.
 */
contract ChamapayEscrow is Initializable, OwnableUpgradeable, UUPSUpgradeable, PausableUpgradeable {
    using SafeERC20 for IERC20;

    address public agent;
    address public treasury;

    enum OrderType {
        ONRAMP,  // Fiat to Crypto (Treasury escrows crypto, pays User)
        OFFRAMP  // Crypto to Fiat (User escrows crypto, pays Treasury)
    }

    enum OrderStatus {
        PENDING,
        ESCROWED,
        SETTLED,
        REFUNDED,
        CANCELLED
    }

    struct Order {
        bytes32 orderId;
        address user;
        address token;
        uint256 amount;
        OrderType orderType;
        OrderStatus status;
        string messageHash; // Off-chain reference (e.g., Transaction ID)
    }

    mapping(bytes32 => Order) public orders;

    event OrderCreated(bytes32 indexed orderId, address indexed user, address token, uint256 amount, OrderType orderType);
    event FundsEscrowed(bytes32 indexed orderId, uint256 amount, address source);
    event OrderSettled(bytes32 indexed orderId, address destination);
    event OrderRefunded(bytes32 indexed orderId, address destination);
    event AgentUpdated(address indexed oldAgent, address indexed newAgent);
    event TreasuryUpdated(address indexed oldTreasury, address indexed newTreasury);

    modifier onlyAgent() {
        require(msg.sender == agent, "Caller is not the agent");
        _;
    }

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    function initialize(address initialOwner, address initialAgent, address initialTreasury) initializer public {
        __Ownable_init(initialOwner);
        __UUPSUpgradeable_init();
        __Pausable_init();
        
        require(initialAgent != address(0), "Invalid agent address");
        require(initialTreasury != address(0), "Invalid treasury address");

        agent = initialAgent;
        treasury = initialTreasury;
    }

    function _authorizeUpgrade(address newImplementation) internal override onlyOwner {}

    // --- Admin Functions --- //

    function updateAgent(address newAgent) external onlyOwner {
        require(newAgent != address(0), "Invalid agent address");
        emit AgentUpdated(agent, newAgent);
        agent = newAgent;
    }

    function updateTreasury(address newTreasury) external onlyOwner {
        require(newTreasury != address(0), "Invalid treasury address");
        emit TreasuryUpdated(treasury, newTreasury);
        treasury = newTreasury;
    }

    function pause() external onlyOwner {
        _pause();
    }

    function unpause() external onlyOwner {
        _unpause();
    }

    // --- Core Escrow Logic --- //

    /**
     * @dev Step 1: Create the order. Only the agent (backend) can create orders to prevent spam.
     */
    function createOrder(
        bytes32 _orderId,
        address _user,
        address _token,
        uint256 _amount,
        OrderType _orderType,
        string memory _messageHash
    ) external onlyAgent whenNotPaused {
        require(orders[_orderId].user == address(0), "Order already exists");
        require(_user != address(0), "Invalid user address");
        require(_amount > 0, "Amount must be greater than 0");

        orders[_orderId] = Order({
            orderId: _orderId,
            user: _user,
            token: _token,
            amount: _amount,
            orderType: _orderType,
            status: OrderStatus.PENDING,
            messageHash: _messageHash
        });

        emit OrderCreated(_orderId, _user, _token, _amount, _orderType);
    }

    /**
     * @dev Step 2: Escrow Funds. Pulls tokens into this contract.
     * For OFFRAMP: Pulls crypto from the User.
     * For ONRAMP: Pulls crypto from the Treasury.
     */
    function escrowFunds(bytes32 _orderId) external whenNotPaused {
        Order storage order = orders[_orderId];
        require(order.user != address(0), "Order does not exist");
        require(order.status == OrderStatus.PENDING, "Order not pending");

        // Determine who is funding the escrow based on the order type
        address fundSource = (order.orderType == OrderType.OFFRAMP) ? order.user : treasury;
        
        // Update state before external transfer (CEI pattern)
        order.status = OrderStatus.ESCROWED;
        
        // Requires the fundSource to have approved this contract beforehand
        IERC20(order.token).safeTransferFrom(fundSource, address(this), order.amount);
        
        emit FundsEscrowed(_orderId, order.amount, fundSource);
    }

    /**
     * @dev Step 3: Settle Order. Called by the backend when the fiat leg is confirmed.
     * For OFFRAMP: Pays the Treasury (M-Pesa was sent to User).
     * For ONRAMP: Pays the User (M-Pesa was received from User).
     */
    function settleOrder(bytes32 _orderId) external onlyAgent whenNotPaused {
        Order storage order = orders[_orderId];
        require(order.status == OrderStatus.ESCROWED, "Order not escrowed");

        // Determine who receives the crypto based on the order type
        address destination = (order.orderType == OrderType.OFFRAMP) ? treasury : order.user;

        // Update state before external transfer (CEI pattern)
        order.status = OrderStatus.SETTLED;
        
        IERC20(order.token).safeTransfer(destination, order.amount);

        emit OrderSettled(_orderId, destination);
    }

    /**
     * @dev Alternative Step 3: Refund Order. Called if the fiat leg fails or times out.
     * Returns funds to whoever originally escrowed them.
     */
    function refundOrder(bytes32 _orderId) external onlyAgent whenNotPaused {
        Order storage order = orders[_orderId];
        require(order.status == OrderStatus.ESCROWED, "Order not escrowed");

        // Return to the original source
        address destination = (order.orderType == OrderType.OFFRAMP) ? order.user : treasury;

        // Update state before external transfer (CEI pattern)
        order.status = OrderStatus.REFUNDED;
        
        IERC20(order.token).safeTransfer(destination, order.amount);

        emit OrderRefunded(_orderId, destination);
    }

    // --- View Functions --- //

    /**
     * @dev Returns the current balance of a specific token held in this escrow contract.
     */
    function getContractBalance(address _token) external view returns (uint256) {
        return IERC20(_token).balanceOf(address(this));
    }

    /**
     * @dev Returns the current balance of a specific token held in the treasury wallet.
     * Useful for checking total available liquidity.
     */
    function getTreasuryBalance(address _token) external view returns (uint256) {
        if (treasury == address(0)) return 0;
        return IERC20(_token).balanceOf(treasury);
    }

    /**
     * @dev Returns the current allowance the treasury has given to this contract.
     * Useful for the backend to monitor when the treasury needs to approve more funds.
     */
    function getTreasuryAllowance(address _token) external view returns (uint256) {
        if (treasury == address(0)) return 0;
        return IERC20(_token).allowance(treasury, address(this));
    }

    /**
     * @dev Returns the full details of an order as a struct.
     * This is often easier for frontends/backends to parse than the default mapping getter.
     */
    function getOrder(bytes32 _orderId) external view returns (Order memory) {
        return orders[_orderId];
    }
}
