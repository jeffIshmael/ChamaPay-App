# ChamaPay FX & KYC Strategy

## Overview
To provide the best user experience and rates, ChamaPay operates a custom FX liquidity pool rather than relying on third-party crypto on-ramps (which charge high spreads). Users interact strictly with an M-Pesa Paybill, while the backend mints/transfers USDC on the Base network.

## 1. Custom FX Architecture

### Deposit Flow (KES -> USDC)
1. **User Action:** The user initiates a deposit to the ChamaPay Paybill, using their ChamaPay ID or phone number as the account number.
2. **Webhook Reception:** Safaricom's Daraja API sends a C2B validation/confirmation webhook to the ChamaPay backend.
3. **Rate Calculation:** The backend verifies the KES amount and converts it to USDC based on the internal ChamaPay FX rate.
4. **Treasury Execution:** The ChamaPay Treasury Wallet (a funded wallet on the Base network) automatically executes a transaction to transfer the equivalent USDC to the user's smart wallet.

### Withdrawal Flow (USDC -> KES)
1. **User Action:** The user requests a withdrawal of USDC.
2. **Blockchain Transfer:** The requested USDC is transferred from the user's smart wallet back to the ChamaPay Treasury Wallet.
3. **M-Pesa Payout:** The backend triggers the M-Pesa B2C (Business to Customer) API to instantly disburse the KES equivalent directly to the user's phone number.

### Liquidity Management
*   The Treasury maintains a balance of both KES (in the bank/M-Pesa) and USDC (on-chain).
*   If traffic is heavily one-sided (e.g., more deposits than withdrawals), the Treasury will need to periodically rebalance by converting KES to USDC via an OTC desk or partner exchange.

---

## 2. Tiered KYC Approach

To balance frictionless onboarding with regulatory compliance (AML), ChamaPay implements a Tiered KYC strategy. This leverages the fact that Safaricom already performs KYC on all M-Pesa registered numbers.

### Tier 1: Low Limits (Up to 20,000 KES / month)
*   **Requirements:** Phone number verification (OTP) + the M-Pesa registered name (First Name, Last Name) provided via the Daraja API upon their first deposit.
*   **Rationale:** Keeps onboarding instant and frictionless. 20,000 KES is a great buffer that is sufficient for casual users testing the app or participating in smaller Chamas.

### Tier 2: High Limits (Above 20,000 KES / month)
*   **Requirements:** National ID upload (front & back) + Selfie verification (via providers like Smile Identity or Dojah).
*   **Rationale:** Ensures full regulatory compliance for high-volume transactors. By the time a user hits this threshold, they have experienced the product's value and are willing to complete full KYC.
