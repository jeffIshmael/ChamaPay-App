# ChamaPay Escrow Smart Contract Design

Based on our discussions, we have stripped down the complex Element Pay logic to create a secure, simple, and perfectly tailored smart contract for ChamaPay.

The design for this contract has been drafted in: [`hardhat/contracts/ChamaPayEscrow.sol`](file:///Users/jeff/coding/ChamaPay-App%20%28Casi%27s%20copy%29/hardhat/contracts/ChamaPayEscrow.sol).

## 1. What We Simplified
- **Maintained Upgradability:** We kept the UUPS Proxy pattern (`Initializable`, `OwnableUpgradeable`, `UUPSUpgradeable`). This ensures you can upgrade the FX logic in the future without losing your state or changing your contract address. We also added `PausableUpgradeable` for emergency stops.
- **Three-Tier Role Architecture:** We split the operational control and liquidity management to match your existing backend (`Server/.env`). The contract now has an `owner` (admin), an `agent` (backend operational signer), and a `treasury` (external wallet holding liquidity).
- **Simplified Order Types:** We simplified the order types to just `ONRAMP` and `OFFRAMP`.

## 2. Security Roles

### `owner` (Admin)
- Can upgrade the contract implementation.
- Can pause (`pause()`) and unpause (`unpause()`) the contract in an emergency.
- Can update the `agent` and `treasury` addresses.
- **Cannot** create, settle, or refund orders directly.

### `agent` (Backend Wallet)
- This is your `AGENT_WALLET` managed by CDP.
- Authorized to call the day-to-day operational functions: `createOrder`, `settleOrder`, and `refundOrder`.
- Does **not** hold funds and cannot pause the contract.

### `treasury` (Liquidity EOA)
- This is your `TREASURY_WALLET` which securely holds your USDC.
- Does not call any contract functions directly.
- The contract automatically routes funds from this address (during `ONRAMP` escrow) and to this address (during `OFFRAMP` settlement).

## 3. Core Data Structures

### Enums
```solidity
enum OrderType {
    ONRAMP,  // Fiat to Crypto (User pays M-Pesa, receives Crypto)
    OFFRAMP  // Crypto to Fiat (User pays Crypto, receives M-Pesa)
}

enum OrderStatus {
    PENDING,
    ESCROWED,
    SETTLED,
    REFUNDED,
    CANCELLED
}
```

### The Order Struct
```solidity
struct Order {
    bytes32 orderId;       // Unique ID for the transaction
    address user;          // The user's wallet address
    address token;         // The stablecoin address (e.g., USDC)
    uint256 amount;        // Amount of tokens
    OrderType orderType;   // ONRAMP or OFFRAMP
    OrderStatus status;    // State machine (PENDING -> ESCROWED -> SETTLED)
    string messageHash;    // Off-chain tracking (e.g. KYC or Transaction ID)
}
```

## 4. The 3-Step Escrow Lifecycle

### Step 1: Create Order
- **Function:** `createOrder(...)`
- **Who calls it:** The Backend (`onlyAgent`)
- **Action:** Initializes the order as `PENDING`.

### Step 2: Escrow Funds
- **Function:** `escrowFunds(bytes32 _orderId)`
- **Who calls it:** Anyone can call this, as long as the funds are approved.
- **Action:** 
  - If `ONRAMP`: It pulls the crypto from the **treasury** into the smart contract.
  - If `OFFRAMP`: It pulls the crypto from the **User** into the smart contract.
- **State Change:** Order becomes `ESCROWED`.

### Step 3: Settle (or Refund)
- **Function:** `settleOrder(bytes32 _orderId)`
- **Who calls it:** The Backend (`onlyAgent`), after confirming the M-Pesa transaction is successful.
- **Action:**
  - If `ONRAMP`: Sends the escrowed crypto to the **User**.
  - If `OFFRAMP`: Sends the escrowed crypto to the **treasury**.
- **State Change:** Order becomes `SETTLED`.

*(If the M-Pesa leg fails, the backend simply calls `refundOrder`, which returns the crypto to whoever originally escrowed it).*

## 5. Next Steps
- Review the final `ChamaPayEscrow.sol` draft.
- Set up Foundry/Hardhat tests to verify the routing of funds to the treasury.
- Deploy a test instance to Base Sepolia using your Deployer `owner` wallet, passing in the `agent` and `treasury` addresses from your `.env`.
