# ChamaPay Closed Beta Campaign Strategy

## Overview
A 20-day "caged" public beta test utilizing real money to thoroughly stress-test the ChamaPay platform (smart contracts, onramps, offramps, and UI/UX) before public launch. 

The campaign is optimized to generate **~1,000 onchain transactions** while keeping the participant group and budget manageable.

---

## 1. Logistics & Parameters

*   **Total Participants:** 45 people (invited via a central WhatsApp group).
*   **Total Chamas:** 9 Chamas.
*   **Members per Chama:** 5 people.
*   **Campaign Duration:** 20 Days.
*   **Contribution Rules:** Every user contributes **50 KES daily**.
*   **Payout Rules:** Payouts occur every **2 days** (Totaling 500 KES per payout).

### The Math (Hitting 1,000 Transactions)
*   **Moonwell Locks:** 45 users × 1 tx = 45 txs
*   **Daily Contributions:** 45 users × 20 days = 900 txs
*   **Payouts:** 9 chamas × 10 payouts = 90 txs
*   **Total Onchain Transactions:** 1,035 Transactions.

---

## 2. Financials & Budget

To ensure a frictionless experience and prevent users from running out of money before their payout turn, users will be seeded with a "float" balance upfront.

### Seed Capital Per User
*   **Moonwell Lock:** 500 KES
*   **Contribution Float:** 500 KES (covers 10 days of 50 KES contributions before the final person gets paid).
*   **Gas & Platform Fee Buffer:** 100 KES
*   **Total Seed per user:** **1,100 KES**

### Total Campaign Budget
*   **Base Seed Budget:** 45 people × 1,100 KES = **49,500 KES**
*   **AI Feedback / Bug Bounty Pool:** **10,000 KES**
*   **Total Maximum Budget:** **59,500 KES** (~$450 USD).

*(Note: Users will be allowed to withdraw and keep their remaining wallet balance at the end of the 20-day beta as their reward for participating).*

---

## 3. Core Testing Strategies

### 1. The 19-Day Withdrawal Lock
*   To prevent the "run-off" risk (users taking the initial 1,100 KES seed and ghosting), all Pretium withdrawals (offramping) will be **locked** for the first 19 days of the beta.
*   On Day 20, the lock is lifted, and all users are instructed to withdraw their balances. This serves as a massive, simultaneous stress test for the Pretium API and webhook processing.

### 2. Seeding via In-App Wallets
*   Instead of sending M-Pesa directly to users, the seed capital will be credited directly to their ChamaPay in-app wallets (or Base addresses). This forces them to participate in the Chamas to circulate the funds.

### 3. Deliberate Unhappy Paths
*   The Admin (Jeff) will secretly instruct specific members to break the rules to test system resilience:
    *   **The Defaulter:** Someone deliberately misses a daily contribution to trigger the automatic refund protocol.
    *   **The Impatient:** Someone attempts to withdraw locked funds.
    *   **The Latecomer:** Someone attempts to join a Chama after the cycle has started.

---

## 4. Admin Role
*   **Jeff will act as the Admin for all 9 Chamas** to maintain control and orchestrate the stress tests.
*   *Optional:* Allow 1-2 trusted testers to create a Chama to test the organic "Chama Creation" and "Invite" user flows.
