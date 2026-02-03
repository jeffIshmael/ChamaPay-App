/**
 * @title ChamaPay - Circular Savings management smart contract (Upgradeable)
 * @author Jeff Muchiri
 */

// SPDX-License-Identifier: MIT
pragma solidity ^0.8.22;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts-upgradeable/utils/ReentrancyGuardUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/PausableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";


contract ChamaPay is 
    Initializable,
    OwnableUpgradeable,
    PausableUpgradeable,
    ReentrancyGuardUpgradeable,
    UUPSUpgradeable 
{
    using SafeERC20 for IERC20;
    uint public totalChamas;
    uint public totalPayments;
    uint public totalFees;

    IERC20 public USDCToken;
    address public aiAgent;

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    function initialize() public initializer {
        __Ownable_init(msg.sender);
        __Pausable_init();
        __ReentrancyGuard_init();
        __UUPSUpgradeable_init();

        aiAgent = msg.sender;
        USDCToken = IERC20(0xcebA9300f2b948710d2653dD7B07f33A8B32118C);
    }

    function _authorizeUpgrade(address newImplementation) internal override onlyOwner {}

    struct Chama {
        uint chamaId;
        uint amount;
        uint startDate;
        uint payDate;
        uint duration;
        uint maxMembers;
        uint cycle;
        uint round;
        address admin;       
        address[] members;
        address[] payoutOrder;
        mapping(address => uint) balances;
        mapping(address => bool) hasSent;
        mapping(address => uint) lockedAmounts;
        bool isPublic;
    }

    Chama[] public chamas;

    struct Payment {
        uint id;
        uint chamaId;
        address receiver;
        uint amount;
        uint timestamp;
    }

    Payment[] public payments;

    event ChamaRegistered(uint indexed id, uint amount, uint duration, uint maxMembers, uint startDate, bool _isPublic, address indexed admin);
    event CashDeposited(uint indexed chamaId, address indexed receiver, uint amount);
    event OnrampUpdated(uint indexed chamaId, address indexed memberAddress, uint amount);
    event LockedAmountUpdated(uint indexed chamaId, address indexed memberAddress, uint remainingAmount, bool onramp);
    event FundsDisbursed(uint indexed chamaId, address indexed recipient, uint amount);
    event RefundIssued(uint indexed chamaId, address indexed member, uint amount);
    event amountWithdrawn(address indexed _address, uint amount);
    event MemberAdded(uint indexed _chamaId, address indexed _address);
    event PayoutOrderSet(uint indexed _chamaId, address[] indexed _payoutOrder);
    event MemberRemoved(uint indexed _chamaId, address indexed _member);
    event ChamaDeleted(uint indexed _chamaId);
    event PayOutProcessed(address indexed _receiver, uint _amount);
    event WithdrawalRecorded(uint indexed _chamaId, address indexed _receiver, uint _amount);
    event RefundUpdated(uint indexed _chamaId);
    event MemberAddedToPayoutOrder(uint indexed _chamaId, address[] indexed _member);
    event aiAgentSet(address indexed _aiAgent);
    event PayDateChecked(uint indexed _chamaId, bool _isPastPayDate, bool _isAllMembersContributed, bool isDisbursed);
    event TransferDone(address indexed _receiver, uint _amount, bool _success, uint _contractBal, uint _receiverBalBefore);
    event PayoutDone(uint indexed _chamaId, address indexed _receiver, uint _amount);

    function registerChama(
        uint _amount, 
        uint _duration, 
        uint _startDate, 
        uint _maxMembers, 
        bool _isPublic
    ) public nonReentrant whenNotPaused {
        require(_startDate >= block.timestamp, "Start date must be in the future.");
        require(_duration > 0, "Duration must be greater than 0.");
        require(_amount > 0, "Amount must be greater than 0.");
        require(_maxMembers <= 15, "Maximum number of members is 15.");
        
        if(_isPublic) {
            require(
                USDCToken.transferFrom(msg.sender, address(this), _amount * _maxMembers),
                "Token transfer failed"
            );
        }

        Chama storage newChama = chamas.push();
        newChama.chamaId = totalChamas;
        newChama.amount = _amount;
        newChama.startDate = _startDate;
        newChama.duration = _duration;
        newChama.maxMembers = _maxMembers;
        newChama.payDate = _startDate + _duration * 1 days;
        newChama.admin = msg.sender;
        newChama.members.push(msg.sender);
        newChama.cycle = 1;
        newChama.round = 1;
        newChama.balances[msg.sender] = 0;
        newChama.hasSent[msg.sender] = false;
        newChama.isPublic = _isPublic;

        if (_isPublic) {
            newChama.lockedAmounts[msg.sender] = _amount * _maxMembers;
        }

        totalChamas++;

        emit ChamaRegistered(
            totalChamas - 1, 
            _amount,
            _maxMembers, 
            _duration, 
            _startDate, 
            _isPublic,  
            msg.sender
        );
    }
    
    function addMember(address _address, uint _chamaId) public onlyAdmin(_chamaId) whenNotPaused {
        require(_chamaId < chamas.length, "The chamaId does not exist");
        Chama storage chama = chamas[_chamaId];
        require(chama.members.length < 15, "Chama already has max members.");
        require(chama.round == 1, "member cannot join mid cycle.");
        require(!isMember(_chamaId,_address), "Already a member of the chama.");
        chama.members.push(_address);
        if(block.timestamp > chama.startDate && chama.payoutOrder.length > 0 ) {
            chama.payoutOrder.push(_address);
        }
        emit MemberAdded(_chamaId, _address);
    }

    function addPublicMember(uint _chamaId, uint _amount) public nonReentrant whenNotPaused {
        require(_chamaId < chamas.length, "The chamaId does not exist");
        Chama storage chama = chamas[_chamaId];
        require(chama.isPublic, "This is not a public chama.");
        require(chama.members.length < chama.maxMembers, "Chama already has max members");
        require(!isMember(_chamaId, msg.sender), "Already a member of the chama.");
        require(chama.round == 1, "member cannot join mid cycle.");
        require(_amount >= chama.amount * chama.maxMembers, "Amount too small.");
        
        require(
            USDCToken.transferFrom(msg.sender, address(this), _amount),
            "Token transfer failed"
        );
        
        chama.members.push(msg.sender);
        if(block.timestamp > chama.startDate && chama.payoutOrder.length > 0) {
            chama.payoutOrder.push(msg.sender);
        }
        chama.lockedAmounts[msg.sender] += _amount;
        emit MemberAdded(_chamaId, msg.sender);
    }

    function depositCash(uint _chamaId, uint _amount) 
        public 
        onlyMembers(_chamaId) 
        nonReentrant 
        whenNotPaused 
    {
        require(_chamaId < totalChamas, "Chama does not exist");
        Chama storage chama = chamas[_chamaId];
        require(_amount > 0, "Amount must be greater than 0");

        require(
            USDCToken.transferFrom(msg.sender, address(this), _amount),
            "Token transfer failed"
        );


        chama.balances[msg.sender] += _amount;

        if (chama.balances[msg.sender] >= chama.amount) {
            chama.hasSent[msg.sender] = true;
        }

        emit CashDeposited(_chamaId, msg.sender, _amount);
    }


    function depositForMember(address _memberAddress, uint _chamaId, uint _amount) public onlyAiAgent nonReentrant whenNotPaused {
        require(_chamaId < totalChamas, "Chama does not exist");
        require(isMember(_chamaId, _memberAddress), "User is not a member.");
        require(_amount > 0, "amount should be greater than 0");
        Chama storage chama = chamas[_chamaId];

        require(
            USDCToken.transferFrom(msg.sender, address(this), _amount),
            "Token transfer failed"
        );

        chama.balances[_memberAddress] += _amount;

        if (chama.balances[_memberAddress] >= chama.amount) {
            chama.hasSent[_memberAddress] = true;
        }
        emit OnrampUpdated(_chamaId, _memberAddress, _amount);
    }

    function updateLockedAmount(address _memberAddress, uint _chamaId, bool onramp) public nonReentrant whenNotPaused {
        require(_chamaId < totalChamas, "Chama does not exist");
        require(isMember(_chamaId, _memberAddress), "User is not a member.");
        Chama storage chama = chamas[_chamaId];

        uint requiredAmount = chama.amount * chama.members.length;
        uint userLocked = chama.lockedAmounts[_memberAddress];

        require(userLocked < requiredAmount, "User already has required locked amount.");

        uint remainingAmount = requiredAmount - userLocked;

        require(
            USDCToken.transferFrom(msg.sender, address(this), remainingAmount),
            "Token transfer failed"
        );
       
        chama.lockedAmounts[_memberAddress] += remainingAmount;

        emit LockedAmountUpdated(_chamaId, _memberAddress, remainingAmount, onramp);
    }

    function addMemberToPayoutOrder(uint _chamaId, address[] memory _member) public onlyAiAgent whenNotPaused {
        Chama storage chama = chamas[_chamaId];
        require(chama.round == 1, "Cannot add member to payout order during an active round");
        
        for (uint i = 0; i < _member.length; i++) {
            require(isMember(_chamaId, _member[i]), "Member is not a member of the chama");
        }
        
        for (uint i = 0; i < _member.length; i++) {
            chama.payoutOrder.push(_member[i]);
        }
        emit MemberAddedToPayoutOrder(_chamaId, _member);
    }

    function _allMembersContributed(uint _chamaId) private view returns (bool) {
        require(_chamaId < totalChamas, "Chama does not exist");
        Chama storage chama = chamas[_chamaId];

        for (uint i = 0; i < chama.members.length; i++) {
            uint membersBalance = chama.balances[chama.members[i]] + chama.lockedAmounts[chama.members[i]];
            if (membersBalance < chama.amount) {
                return false;
            }
        }
        return true;
    }
    
    function allMembersContributed(uint _chamaId) internal view returns (bool) {
        return _allMembersContributed(_chamaId);
    }
    
    function checkAllMembersContributed(uint _chamaId) public view returns (bool) {
        return _allMembersContributed(_chamaId);
    }

    function processPayout(address _receiver, uint _amount) internal {
        require(USDCToken.balanceOf(address(this)) >= _amount, "Contract does not have enough USDC");

        uint contractBal = USDCToken.balanceOf(address(this));
        uint receiverBalBefore = USDCToken.balanceOf(_receiver);

        // Safe transfer handles all non-standard ERC20 implementations
        USDCToken.safeTransfer(_receiver, _amount);

        emit TransferDone(_receiver, _amount, true, contractBal, receiverBalBefore);
        emit PayOutProcessed(_receiver, _amount);
    }

    function recordWithdrawal(uint _chamaId, address _receiver, uint _amount) internal {
        payments.push(Payment({
            id: totalPayments,
            chamaId: _chamaId,
            receiver: _receiver,
            amount: _amount,
            timestamp: block.timestamp
        }));

        totalPayments++;
        emit WithdrawalRecorded(_chamaId, _receiver, _amount);
    }

    function disburse(uint _chamaId) internal {
        Chama storage chama = chamas[_chamaId];

        require(chama.payoutOrder.length > 0, "Payout order is empty");
        require(chama.members.length > 0, "No members in chama");

        // Select recipient of this round
        uint index = (chama.round == 0) ? 0 : (chama.round - 1);
        index = index % chama.payoutOrder.length;

        address recipient = chama.payoutOrder[index];

        // Fallback if payoutOrder contains invalid address
        if (recipient == address(0)) {
            recipient = chama.members[index % chama.members.length];
        }

        // Calculate the amount each member must contribute
        uint contributionAmount = chama.amount;
        uint memberCount = chama.payoutOrder.length;

        uint totalPay = contributionAmount * memberCount;


        // Calculate total funds available
        uint totalAvailable = 0;

        for (uint i = 0; i < chama.members.length; i++) {
            address m = chama.members[i];
            totalAvailable += chama.balances[m];

            if (chama.isPublic) {
                totalAvailable += chama.lockedAmounts[m];
            }
        }

        require(totalAvailable >= totalPay, "Not enough total funds");

        // Fix any underfunded members BEFORE payout
        for (uint i = 0; i < chama.members.length; i++) {
            address member = chama.members[i];

            if (chama.balances[member] < contributionAmount) {
                uint deficit = contributionAmount - chama.balances[member];

                require(chama.isPublic, "Private: member has insufficient balance");
                require(chama.lockedAmounts[member] >= deficit, "Insufficient locked funds");

                // Cover deficit
                chama.lockedAmounts[member] -= deficit;
                chama.balances[member] += deficit;
            }
        }


        // Make the payout
        processPayout(recipient, totalPay);
        recordWithdrawal(_chamaId, recipient, totalPay);


        // Deduct each member’s contribution SAFELY
        for (uint i = 0; i < chama.members.length; i++) {
            address m = chama.members[i];

            // This will never underflow because we fixed deficits earlier
            chama.balances[m] -= contributionAmount;

            // Reset for next round
            chama.hasSent[m] = false;
        }


        // Update round & cycle
        if (chama.round + 1 > chama.payoutOrder.length) {
            chama.cycle += 1;
            chama.round = 1;
        } else {
            chama.round += 1;
        }

        // Move pay date
        chama.payDate += chama.duration * 1 days;

        emit FundsDisbursed(_chamaId, recipient, totalPay);
    }

    function deleteMember(uint _chamaId, address _member) public onlyMembers(_chamaId) {
        Chama storage chama = chamas[_chamaId];
        require(msg.sender == chama.admin || msg.sender == _member, "Only admin or the member can delete");
        require(chama.members.length > 0, "No members to remove");
        require(chama.round == 1, "Cannot delete member during an active cycle");

        uint refundAmount = chama.balances[_member];
        if (refundAmount > 0) {
            processPayout(_member, refundAmount);
            recordWithdrawal(_chamaId, _member, refundAmount);
            chama.balances[_member] = 0;
        }

        if(chama.isPublic) {
            uint lockedAmount = chama.lockedAmounts[_member];
            if (lockedAmount > 0) {
                processPayout(_member, lockedAmount);
                recordWithdrawal(_chamaId, _member, lockedAmount);
                chama.lockedAmounts[_member] = 0;
                emit RefundIssued(_chamaId, _member, lockedAmount);
            }
        }

        for (uint i = 0; i < chama.members.length; i++) {
            if (chama.members[i] == _member) {
                chama.members[i] = chama.members[chama.members.length - 1];
                chama.members.pop();
                break;
            }
        }
        
        for (uint i = 0; i < chama.payoutOrder.length; i++) {
            if (chama.payoutOrder[i] == _member) {
                chama.payoutOrder[i] = chama.payoutOrder[chama.payoutOrder.length - 1];
                chama.payoutOrder.pop();
                break;
            }
        }

        emit MemberRemoved(_chamaId, _member);
    }

    function deleteChama(uint _chamaId) public onlyAdmin(_chamaId) {
        Chama storage chama = chamas[_chamaId];
        require(chama.members.length > 0, "No members to remove");
        require(chama.round == 1, "Cannot delete member during an active cycle");

        refund(_chamaId);

        Chama storage lastChama = chamas[chamas.length - 1];
        chamas[_chamaId].chamaId = lastChama.chamaId;
        chamas[_chamaId].amount = lastChama.amount;
        chamas[_chamaId].startDate = lastChama.startDate;
        chamas[_chamaId].payDate = lastChama.payDate;
        chamas[_chamaId].duration = lastChama.duration;
        chamas[_chamaId].cycle = lastChama.cycle;
        chamas[_chamaId].round = lastChama.round;
        chamas[_chamaId].admin = lastChama.admin;
        chamas[_chamaId].members = lastChama.members;
        chamas[_chamaId].payoutOrder = lastChama.payoutOrder;
        chamas.pop();

        emit ChamaDeleted(_chamaId);
    }

    function checkPayDate(uint[] memory chamaIds) public onlyAiAgent nonReentrant whenNotPaused {
        for (uint i = 0; i < chamaIds.length; i++) {
            uint chamaId = chamaIds[i];
            require(chamaId < totalChamas, "Chama does not exist");
            Chama storage chama = chamas[chamaId];
            bool isPastPayDate = block.timestamp >= chama.payDate;
            
            // Skip if pay date hasn't passed yet
            if (!isPastPayDate) {
                emit PayDateChecked(chamaId, false, false, false);
                continue;
            }
            
            bool isAllMembersContributed = allMembersContributed(chamaId);
            bool isDisbursed;
            
            if (isAllMembersContributed) {
                disburse(chamaId);
                isDisbursed = true;
            } else {
                refund(chamaId);
                isDisbursed = false;
            }
            
            emit PayDateChecked(chamaId, isPastPayDate, isAllMembersContributed, isDisbursed);
        }
    }

    function getBalance(uint _chamaId, address _member) public view returns (uint[] memory) {
        require(_chamaId < totalChamas, "Chama does not exist");
        Chama storage chama = chamas[_chamaId];
        
        uint[] memory balances = new uint[](2);
        balances[0] = chama.balances[_member];
        balances[1] = chama.lockedAmounts[_member];
        
        return balances;
    }

    function pauseContract() external onlyOwner {
        _pause();
    }

    function unpauseContract() external onlyOwner {
        _unpause();
    }

    function getEachMemberBalance(uint _chamaId) public view returns (address[] memory, uint[][] memory) {
        require(_chamaId < totalChamas, "Chama does not exist");    
        Chama storage chama = chamas[_chamaId];
        
        uint memberCount = chama.members.length;
        
        address[] memory memberAddresses = new address[](memberCount);
        uint[][] memory balances = new uint[][](memberCount);
        
        for (uint i = 0; i < memberCount; i++) {
            address member = chama.members[i];
            memberAddresses[i] = member;

            uint[] memory memberBalance = new uint[](2);
            memberBalance[0] = chama.balances[member];
            memberBalance[1] = chama.lockedAmounts[member];

            balances[i] = memberBalance;
        }

        return (memberAddresses, balances);
    }

    function setPayoutOrder(uint _chamaId, address[] memory _payoutOrder) public onlyAiAgent whenNotPaused {
        require(_payoutOrder.length == chamas[_chamaId].members.length, "Payout order length mismatch");
        Chama storage chama = chamas[_chamaId];
        chama.payoutOrder = _payoutOrder;
        emit PayoutOrderSet(_chamaId, _payoutOrder);
    }

    function refund(uint _chamaId) internal {
        Chama storage chama = chamas[_chamaId];

        for (uint i = 0; i < chama.members.length; i++) {
            address member = chama.members[i];
            uint refundAmount = chama.balances[member];
            if (refundAmount > 0) {
                processPayout(member, refundAmount);
                recordWithdrawal(_chamaId, member, refundAmount);
                chama.balances[member] = 0;
                emit RefundIssued(_chamaId, member, refundAmount);
            }
        }
        
        for (uint i = 0; i < chama.members.length; i++) {
            chama.hasSent[chama.members[i]] = false;
        }
        
        if (chama.cycle + 1 > chama.members.length) {
            chama.round += 1;
        }
        chama.payDate += chama.duration * 24 * 60 * 60;
        chama.cycle++;
        emit RefundUpdated(_chamaId);
    }

    function getPayments() public view returns (Payment[] memory) {
        return payments;
    }

    function getChamas() public view returns (
        uint[] memory, 
        uint[] memory, 
        uint[] memory, 
        uint[] memory, 
        address[] memory
    ) {
        uint[] memory chamaIds = new uint[](chamas.length);
        uint[] memory amounts = new uint[](chamas.length);
        uint[] memory startDates = new uint[](chamas.length);
        uint[] memory durations = new uint[](chamas.length);    
        address[] memory admins = new address[](chamas.length);

        for (uint i = 0; i < chamas.length; i++) {
            Chama storage chama = chamas[i];
            chamaIds[i] = chama.chamaId;
            amounts[i] = chama.amount;
            startDates[i] = chama.startDate;
            durations[i] = chama.duration;        
            admins[i] = chama.admin;
        }

        return (chamaIds, amounts, startDates, durations, admins);
    }

    function getChama(uint _chamaId) public view returns (
        uint,
        uint,
        uint,
        uint,
        uint,
        uint,
        address,
        address[] memory,
        bool
    ) {
        Chama storage chama = chamas[_chamaId];
        return (
            chama.payDate,
            chama.amount,
            chama.startDate,
            chama.duration,
            chama.round,
            chama.cycle,
            chama.admin,
            chama.members,
            chama.isPublic
        );
    }

    function getChamaPayoutOrder(uint _chamaId) public view returns (address[] memory) {
        Chama storage chama = chamas[_chamaId];
        return chama.payoutOrder;
    }

    function isMember(uint _chamaId, address _user) public view returns (bool) {
        Chama storage chama = chamas[_chamaId];
        for (uint i = 0; i < chama.members.length; i++) {
            if (chama.members[i] == _user) {
                return true;
            }
        }
        return false;
    }

    modifier onlyMembers(uint _chamaId) {
        bool isAMember = false;
        for (uint i = 0; i < chamas[_chamaId].members.length; i++) {
            if (msg.sender == chamas[_chamaId].members[i]) {
                isAMember = true;
                break;
            }
        }
        require(isAMember, "You are not a member of the chama.");
        _;
    }

    function emergencyWithdraw(address _address, uint _amount) public onlyOwner {
        USDCToken.transfer(_address, _amount);
        emit amountWithdrawn(_address, _amount);
    }

    function setAiAgent(address _aiAgent) public onlyOwner {
        require(_aiAgent != address(0), "Invalid address");
        aiAgent = _aiAgent;
        emit aiAgentSet(_aiAgent);
    }
   
    modifier onlyAdmin(uint _chamaId) {
        require(chamas[_chamaId].admin == msg.sender, "only the admin can add a member");
        _;
    }

    modifier onlyAiAgent() {
        require(msg.sender == aiAgent || msg.sender == owner(), "Only aiAgent or owner");
        _;
    }
}