// SPDX-License-Identifier: MIT
pragma solidity ^0.8.22;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts-upgradeable/utils/ReentrancyGuardUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/PausableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";

/**
 * @title IMErc20
 * @notice Minimal Moonwell / Compound-style mToken interface.
 */
interface IMErc20 is IERC20 {
    function mint(uint256 mintAmount) external returns (uint256);
    function redeem(uint256 redeemTokens) external returns (uint256);
    function redeemUnderlying(uint256 redeemAmount) external returns (uint256);
    function exchangeRateStored() external view returns (uint256);
    function underlying() external view returns (address);
    function getCash() external view returns (uint256);
}

/**
 * @title ChamaPayGoal
 * @author Jeff Muchiri
 * @notice Save-for-Goal vault: shared USDC pots with optional Moonwell yield.
 *
 * Yield is binary per goal while earning:
 * - yieldEnabled = false → USDC sits idle in this contract (idleUsdc)
 * - yieldEnabled = true  → goal funds are supplied to Moonwell (mTokenShares)
 *
 * Withdraw (creator only): All / YieldOnly / PrincipalOnly / Amount (principal-first accounting).
 * After a partial withdraw with yield still ON, leftover idle USDC is re-supplied to Moonwell.
 */
contract ChamaPayGoal is
    Initializable,
    OwnableUpgradeable,
    PausableUpgradeable,
    ReentrancyGuardUpgradeable,
    UUPSUpgradeable
{
    using SafeERC20 for IERC20;

    enum GoalType {
        Personal, // 0
        Invite,   // 1
        Public    // 2 — create always starts with yield OFF; toggle still allowed on-chain
    }

    enum WithdrawMode {
        All,            // 0 — full totalBalance
        YieldOnly,      // 1 — yieldEarned only
        PrincipalOnly,  // 2 — principalRemaining only
        Amount          // 3 — exact amount; accounting reduces principal first
    }

    IERC20 public usdc;
    IMErc20 public mUsdc;

    uint256 public totalGoals;

    struct Goal {
        uint256 goalId;
        address creator;
        uint256 targetAmount;
        uint256 endDate;
        uint256 idleUsdc;
        uint256 mTokenShares;
        uint256 principalRemaining;
        GoalType goalType;
        bool yieldEnabled;
        bool active;
        address[] members;
    }

    struct GoalFinance {
        uint256 idleUsdc;
        uint256 moonwellUsdc;
        uint256 totalBalance;
        uint256 principalRemaining;
        uint256 yieldEarned;
        uint256 maxWithdrawable;
        uint256 targetAmount;
        uint256 endDate;
        uint256 totalContributed;
        GoalType goalType;
        bool yieldEnabled;
        bool active;
        address creator;
    }

    mapping(uint256 => Goal) public goals;
    mapping(uint256 => mapping(address => bool)) public isMember;
    mapping(uint256 => mapping(address => uint256)) public contributed;
    mapping(uint256 => uint256) public totalContributed;

    event GoalCreated(
        uint256 indexed goalId,
        address indexed creator,
        uint256 targetAmount,
        uint256 endDate,
        bool yieldEnabled,
        GoalType goalType
    );
    event MemberAdded(uint256 indexed goalId, address indexed member);
    event MemberRemoved(uint256 indexed goalId, address indexed member);
    event Contributed(
        uint256 indexed goalId,
        address indexed contributor,
        address indexed payer,
        uint256 amount,
        bool suppliedToMoonwell
    );
    event YieldToggled(uint256 indexed goalId, bool yieldEnabled, uint256 usdcMoved);
    event Withdrawn(
        uint256 indexed goalId,
        address indexed creator,
        uint256 amount,
        WithdrawMode mode
    );

    modifier onlyCreator(uint256 goalId) {
        require(goals[goalId].creator == msg.sender, "Not goal creator");
        _;
    }

    modifier goalActive(uint256 goalId) {
        require(goalId < totalGoals, "Invalid goal");
        require(goals[goalId].active, "Goal inactive");
        _;
    }

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    function initialize(
        address initialOwner,
        address usdc_,
        address mUsdc_
    ) public initializer {
        require(initialOwner != address(0), "Invalid owner");
        require(usdc_ != address(0), "Invalid USDC");
        require(mUsdc_ != address(0), "Invalid mUSDC");

        __Ownable_init(initialOwner);
        __Pausable_init();
        __ReentrancyGuard_init();
        __UUPSUpgradeable_init();

        usdc = IERC20(usdc_);
        mUsdc = IMErc20(mUsdc_);

        usdc.forceApprove(mUsdc_, type(uint256).max);
    }

    function _authorizeUpgrade(address) internal override onlyOwner {}

    // -------------------------------------------------------------------------
    // Admin
    // -------------------------------------------------------------------------

    function pause() external onlyOwner {
        _pause();
    }

    function unpause() external onlyOwner {
        _unpause();
    }

    // -------------------------------------------------------------------------
    // Create & members
    // -------------------------------------------------------------------------

    /**
     * @param targetAmount Optional target (USDC 6 decimals). 0 = open-ended.
     * @param endDate Unix timestamp; 0 = no deadline.
     * @param yieldEnabled Put money to work. Forced false when goalType == Public.
     * @param goalType Personal / Invite / Public
     */
    function createGoal(
        uint256 targetAmount,
        uint256 endDate,
        bool yieldEnabled,
        GoalType goalType
    ) external whenNotPaused nonReentrant returns (uint256 goalId) {
        require(uint8(goalType) <= uint8(GoalType.Public), "Invalid type");
        if (endDate != 0) {
            require(endDate > block.timestamp, "End date must be future");
        }

        // Public goals always start idle; setYieldEnabled remains available later.
        if (goalType == GoalType.Public) {
            yieldEnabled = false;
        }

        goalId = totalGoals;
        Goal storage g = goals[goalId];
        g.goalId = goalId;
        g.creator = msg.sender;
        g.targetAmount = targetAmount;
        g.endDate = endDate;
        g.yieldEnabled = yieldEnabled;
        g.goalType = goalType;
        g.active = true;
        g.members.push(msg.sender);
        isMember[goalId][msg.sender] = true;

        totalGoals++;

        emit GoalCreated(goalId, msg.sender, targetAmount, endDate, yieldEnabled, goalType);
        emit MemberAdded(goalId, msg.sender);
    }

    function addMember(uint256 goalId, address member)
        external
        whenNotPaused
        goalActive(goalId)
        onlyCreator(goalId)
    {
        require(member != address(0), "Invalid member");
        require(!isMember[goalId][member], "Already member");

        isMember[goalId][member] = true;
        goals[goalId].members.push(member);
        emit MemberAdded(goalId, member);
    }

    function removeMember(uint256 goalId, address member)
        external
        whenNotPaused
        goalActive(goalId)
        onlyCreator(goalId)
    {
        require(member != goals[goalId].creator, "Cannot remove creator");
        require(isMember[goalId][member], "Not a member");
        require(contributed[goalId][member] == 0, "Has contributions");

        isMember[goalId][member] = false;
        address[] storage members = goals[goalId].members;
        for (uint256 i = 0; i < members.length; i++) {
            if (members[i] == member) {
                members[i] = members[members.length - 1];
                members.pop();
                break;
            }
        }
        emit MemberRemoved(goalId, member);
    }

    // -------------------------------------------------------------------------
    // Contribute
    // -------------------------------------------------------------------------

    /**
     * @notice Contribute USDC from the caller's wallet; credit goes to msg.sender.
     * @dev Member wallet deposit, or post-M-Pesa after USDC landed in the member wallet.
     *      Off-chain treasury may also call this for public/guest pay-link deposits
     *      (app treats that treasury address as stranger).
     */
    function contribute(uint256 goalId, uint256 amount)
        external
        whenNotPaused
        nonReentrant
        goalActive(goalId)
    {
        _contribute(goalId, msg.sender, amount);
    }

    /**
     * @notice Pay from the caller's wallet but credit a goal member.
     * @dev Used when: (1) a member contributes for another member, or
     *      (2) off-chain treasury / pay-link selects a member to receive the credit.
     *      `contributor` must already be a member of the goal.
     */
    function contributeFor(uint256 goalId, address contributor, uint256 amount)
        external
        whenNotPaused
        nonReentrant
        goalActive(goalId)
    {
        require(contributor != address(0), "Invalid contributor");
        require(isMember[goalId][contributor], "Contributor not a member");
        _contribute(goalId, contributor, amount);
    }

    function _contribute(uint256 goalId, address contributor, uint256 amount) internal {
        require(amount > 0, "Amount is zero");
        Goal storage g = goals[goalId];
        if (g.endDate != 0) {
            require(block.timestamp <= g.endDate, "Goal ended");
        }

        // Always charge the caller (member wallet, or off-chain treasury for guest flows)
        usdc.safeTransferFrom(msg.sender, address(this), amount);

        contributed[goalId][contributor] += amount;
        totalContributed[goalId] += amount;
        g.principalRemaining += amount;

        if (g.yieldEnabled) {
            _supplyToMoonwell(goalId, amount);
            emit Contributed(goalId, contributor, msg.sender, amount, true);
        } else {
            g.idleUsdc += amount;
            emit Contributed(goalId, contributor, msg.sender, amount, false);
        }
    }

    // -------------------------------------------------------------------------
    // Yield toggle
    // -------------------------------------------------------------------------

    function setYieldEnabled(uint256 goalId, bool enabled)
        external
        whenNotPaused
        nonReentrant
        goalActive(goalId)
        onlyCreator(goalId)
    {
        Goal storage g = goals[goalId];
        require(g.yieldEnabled != enabled, "Already set");

        uint256 moved;
        if (enabled) {
            moved = g.idleUsdc;
            require(moved > 0, "Nothing to supply");
            g.idleUsdc = 0;
            _supplyToMoonwell(goalId, moved);
            g.yieldEnabled = true;
        } else {
            uint256 moonwellValue = _moonwellValue(g.mTokenShares);
            require(moonwellValue > 0, "No Moonwell position");
            require(mUsdc.getCash() >= moonwellValue, "Insufficient Moonwell liquidity");
            moved = _redeemAllFromMoonwell(goalId);
            g.yieldEnabled = false;
        }

        emit YieldToggled(goalId, enabled, moved);
    }

    // -------------------------------------------------------------------------
    // Withdraw
    // -------------------------------------------------------------------------

    /**
     * @notice Creator withdraws to their wallet.
     * @param amount Used only when mode == Amount; otherwise pass 0.
     * @param mode All | YieldOnly | PrincipalOnly | Amount
     *
     * Amount mode accounting: reduces principalRemaining first (not yield).
     * If yield stays ON after a partial withdraw, leftover idle is re-supplied.
     */
    function withdraw(uint256 goalId, uint256 amount, WithdrawMode mode)
        external
        whenNotPaused
        nonReentrant
        goalActive(goalId)
        onlyCreator(goalId)
    {
        Goal storage g = goals[goalId];

        uint256 total = _goalBalance(goalId);
        require(total > 0, "Nothing to withdraw");

        uint256 yieldEarned = total > g.principalRemaining ? total - g.principalRemaining : 0;
        uint256 need;

        if (mode == WithdrawMode.All) {
            need = total;
        } else if (mode == WithdrawMode.YieldOnly) {
            need = yieldEarned;
            require(need > 0, "No yield");
        } else if (mode == WithdrawMode.PrincipalOnly) {
            need = g.principalRemaining;
            require(need > 0, "No principal");
        } else if (mode == WithdrawMode.Amount) {
            need = amount;
            require(need > 0, "Amount is zero");
            require(need <= total, "Exceeds balance");
        } else {
            revert("Invalid mode");
        }

        uint256 available = _maxWithdrawable(goalId);
        require(need <= available, "Insufficient Moonwell liquidity");

        _pullToIdle(goalId, need);

        g.idleUsdc -= need;
        usdc.safeTransfer(g.creator, need);

        // Accounting
        if (mode == WithdrawMode.All) {
            g.principalRemaining = 0;
        } else if (mode == WithdrawMode.YieldOnly) {
            // principal unchanged
        } else if (mode == WithdrawMode.PrincipalOnly) {
            g.principalRemaining = 0;
        } else {
            // Amount: reduce principal first
            if (need >= g.principalRemaining) {
                g.principalRemaining = 0;
            } else {
                g.principalRemaining -= need;
            }
        }

        // Re-supply leftover idle if still earning
        if (g.yieldEnabled && g.idleUsdc > 0) {
            uint256 toSupply = g.idleUsdc;
            g.idleUsdc = 0;
            _supplyToMoonwell(goalId, toSupply);
        }

        if (_goalBalance(goalId) == 0) {
            g.active = false;
            g.principalRemaining = 0;
            g.yieldEnabled = false;
        }

        emit Withdrawn(goalId, g.creator, need, mode);
    }

    // -------------------------------------------------------------------------
    // Moonwell helpers
    // -------------------------------------------------------------------------

    function _supplyToMoonwell(uint256 goalId, uint256 usdcAmount) internal {
        require(usdcAmount > 0, "Zero supply");
        uint256 sharesBefore = mUsdc.balanceOf(address(this));
        uint256 err = mUsdc.mint(usdcAmount);
        require(err == 0, "Moonwell mint failed");
        uint256 sharesAfter = mUsdc.balanceOf(address(this));
        goals[goalId].mTokenShares += (sharesAfter - sharesBefore);
    }

    function _redeemAllFromMoonwell(uint256 goalId) internal returns (uint256 usdcReceived) {
        Goal storage g = goals[goalId];
        uint256 shares = g.mTokenShares;
        require(shares > 0, "No Moonwell position");

        uint256 usdcBefore = usdc.balanceOf(address(this));
        uint256 err = mUsdc.redeem(shares);
        require(err == 0, "Moonwell redeem failed");
        usdcReceived = usdc.balanceOf(address(this)) - usdcBefore;

        g.mTokenShares = 0;
        g.idleUsdc += usdcReceived;
    }

    /**
     * @dev Make sure at least `need` USDC is liquid in idleUsdc before a payout.
     * If idle is short, redeem the shortfall from this goal's Moonwell position.
     */
    function _pullToIdle(uint256 goalId, uint256 need) internal {
        Goal storage g = goals[goalId];
        if (g.idleUsdc >= need) return;

        uint256 shortfall = need - g.idleUsdc;
        uint256 moonwellValue = _moonwellValue(g.mTokenShares);
        require(moonwellValue >= shortfall, "Insufficient Moonwell balance");
        require(mUsdc.getCash() >= shortfall, "Insufficient Moonwell liquidity");

        uint256 sharesBefore = mUsdc.balanceOf(address(this));
        uint256 usdcBefore = usdc.balanceOf(address(this));
        uint256 err = mUsdc.redeemUnderlying(shortfall);
        require(err == 0, "Moonwell redeemUnderlying failed");
        uint256 usdcReceived = usdc.balanceOf(address(this)) - usdcBefore;
        uint256 sharesAfter = mUsdc.balanceOf(address(this));

        g.mTokenShares -= (sharesBefore - sharesAfter);
        g.idleUsdc += usdcReceived;
        require(g.idleUsdc >= need, "Idle shortfall");
    }

    function _moonwellValue(uint256 shares) internal view returns (uint256) {
        if (shares == 0) return 0;
        return (shares * mUsdc.exchangeRateStored()) / 1e18;
    }

    function _goalBalance(uint256 goalId) internal view returns (uint256) {
        Goal storage g = goals[goalId];
        return g.idleUsdc + _moonwellValue(g.mTokenShares);
    }

    function _maxWithdrawable(uint256 goalId) internal view returns (uint256) {
        Goal storage g = goals[goalId];
        uint256 moonwellUsdc = _moonwellValue(g.mTokenShares);
        if (moonwellUsdc == 0) {
            return g.idleUsdc;
        }
        uint256 cash = mUsdc.getCash();
        uint256 fromMoonwell = moonwellUsdc < cash ? moonwellUsdc : cash;
        return g.idleUsdc + fromMoonwell;
    }

    // -------------------------------------------------------------------------
    // Views
    // -------------------------------------------------------------------------

    function goalBalance(uint256 goalId) public view returns (uint256) {
        require(goalId < totalGoals, "Invalid goal");
        return _goalBalance(goalId);
    }

    function maxWithdrawable(uint256 goalId) external view returns (uint256) {
        require(goalId < totalGoals, "Invalid goal");
        return _maxWithdrawable(goalId);
    }

    function getGoalFinance(uint256 goalId) external view returns (GoalFinance memory info) {
        require(goalId < totalGoals, "Invalid goal");
        Goal storage g = goals[goalId];
        uint256 moonwellUsdc = _moonwellValue(g.mTokenShares);
        uint256 total = g.idleUsdc + moonwellUsdc;
        uint256 yieldEarned = total > g.principalRemaining ? total - g.principalRemaining : 0;

        info = GoalFinance({
            idleUsdc: g.idleUsdc,
            moonwellUsdc: moonwellUsdc,
            totalBalance: total,
            principalRemaining: g.principalRemaining,
            yieldEarned: yieldEarned,
            maxWithdrawable: _maxWithdrawable(goalId),
            targetAmount: g.targetAmount,
            endDate: g.endDate,
            totalContributed: totalContributed[goalId],
            goalType: g.goalType,
            yieldEnabled: g.yieldEnabled,
            active: g.active,
            creator: g.creator
        });
    }

    function getMembers(uint256 goalId) external view returns (address[] memory) {
        require(goalId < totalGoals, "Invalid goal");
        return goals[goalId].members;
    }

    function memberCount(uint256 goalId) external view returns (uint256) {
        require(goalId < totalGoals, "Invalid goal");
        return goals[goalId].members.length;
    }
}
