# ChamaPay FX Balancer Strategy

## Overview
To maintain liquidity for the custom FX system without relying exclusively on expensive third-party crypto on-ramps for every transaction, ChamaPay uses a "Treasury Balancer" approach. This ensures there is always enough KES for withdrawals and enough USDC for deposits.

## 1. The Two-Bucket System
The Treasury consists of two liquidity pools (buckets):
1. **The Fiat Bucket:** The ChamaPay M-Pesa Paybill / Corporate Bank Account (KES).
2. **The Crypto Bucket:** The ChamaPay Treasury Smart Contract Wallet on Base (USDC).

## 2. Watermark Logic
To avoid excessive transaction fees from third-party exchanges, the Treasury does not rebalance on every transaction. Instead, it uses a High/Low watermark system.

*   **Low Watermark (Trigger):** The threshold at which a rebalance is required.
*   **High Watermark (Target):** The target balance to restore the bucket to.

### Scenario A: High Deposits (Running out of USDC)
When users deposit large amounts of KES to receive USDC:
1. The **Crypto Bucket (USDC)** drops to the Low Watermark (e.g., $200).
2. The **Fiat Bucket (KES)** overflows.
3. **Rebalance Action:** The balancer takes KES from the Fiat Bucket, purchases USDC via a third-party API (e.g., Pretium/YellowCard), and sends it to the Crypto Bucket to restore the High Watermark (e.g., $1,000).

### Scenario B: High Withdrawals (Running out of KES)
When users withdraw large amounts of USDC to receive KES via M-Pesa:
1. The **Fiat Bucket (KES)** drops to the Low Watermark (e.g., 20,000 KES).
2. The **Crypto Bucket (USDC)** overflows.
3. **Rebalance Action:** The balancer sells USDC via the third-party API and deposits the resulting KES into the Fiat Bucket to restore the High Watermark (e.g., 130,000 KES).

## 3. Initial Capital Requirements (Closed Beta)
For the closed beta (~50 users, averaging $15 per transaction), a massive capital pool is not required. 

**Recommended Initial Beta Pool:**
*   **Crypto Bucket:** $1,000 USDC
*   **Fiat Bucket:** 130,000 KES
*   **Total Capital Tied Up:** ~$2,000 USD

This buffer is sufficient to handle a scenario where all 50 users deposit or withdraw on the exact same day without draining the Treasury.

## 4. Implementation Phases

### Phase 1: Manual Rebalancing (Closed Beta)
*   **Implementation:** A background script monitors the balances of the M-Pesa Paybill and the Base Treasury Wallet.
*   **Action:** When a Low Watermark is hit, the system sends an automated Telegram or Email alert to the administrators (e.g., *"⚠️ WARNING: USDC Treasury is below $200"*).
*   **Resolution:** An admin manually logs into the third-party provider (e.g., Pretium dashboard) and executes the trade to rebalance.
*   **Rationale:** Safest approach for launch. Prevents any bugs in an automated trading script from accidentally draining the bank account.

### Phase 2: Automated Rebalancing (Post-Beta)
*   **Implementation:** A scheduled cron job (e.g., `fxBalancer.ts`) runs periodically to check balances.
*   **Action:** If a watermark is hit, the script automatically triggers the third-party API (e.g., `PretiumService.buyUSDC()` or `PretiumService.sellUSDC()`).
*   **Resolution:** Rebalancing happens instantly and autonomously.
