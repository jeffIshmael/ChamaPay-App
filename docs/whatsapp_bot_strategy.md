# ChamaPay WhatsApp Bot Strategy

## Overview
The WhatsApp bot strategy is designed to bypass the friction of mobile app downloads and solve the iOS platform gap. By leveraging the Meta WhatsApp Business API and Account Abstraction, users can interact with Web3 smart contracts entirely through a familiar chat interface.

**Target Timeline:** Phase 2 (Post-Closed Beta). The closed beta will focus exclusively on the native Android application to validate the core smart contract and FX logic.

## 1. Architecture

*   **Interface:** Meta WhatsApp Business API (via providers like Twilio or MessageBird).
*   **Wallet Infrastructure:** Account Abstraction (e.g., Base Smart Wallets or Privy). A smart wallet is generated on the backend, mapped to the user's WhatsApp phone number.
*   **Payments:** Daraja API (STK Push for deposits, B2C for withdrawals).
*   **Interaction Model:** Structured Bot. Instead of conversational AI, the bot uses WhatsApp's "Interactive Messages" (List Menus and Reply Buttons) to create an app-like navigation experience.

## 2. User Flow Example (Deposit)

1.  **User:** Sends "Hi" to the ChamaPay WhatsApp number.
2.  **Bot:** Replies with an interactive menu: `[View Balance]`, `[View Chamas]`, `[Deposit]`, `[Withdraw]`.
3.  **User:** Taps `[Deposit]`.
4.  **Bot:** "How much KES would you like to deposit? (Current Rate: 130 KES/USDC)"
5.  **User:** "1000"
6.  **Bot:** "Please check your phone for an M-Pesa PIN prompt to complete the deposit of 1000 KES."
7.  *Backend triggers Daraja STK Push.*
8.  *User enters M-Pesa PIN.*
9.  **Bot:** "Success! Your ChamaPay wallet has been credited with 7.69 USDC."

## 3. Economics and Cost

*   **Meta API Pricing:** Meta charges per "24-hour conversation window".
*   **Cost Efficiency:** In Kenya, a user-initiated "Utility" conversation costs roughly $0.005 (~0.65 KES). This allows the user to perform multiple transactions (deposit, check balance, withdraw) within that 24-hour window for a single charge.
*   **Comparison:** This is often more economical than sending traditional SMS OTPs or notifications, which typically cost ~1 KES per message.

## 4. Security Considerations

*   **Authentication:** While the phone number acts as the primary identifier, sensitive actions (such as withdrawals or authorizing Chama payouts) will require a 4-digit ChamaPay PIN set up during onboarding.
*   **Deep Links:** For complex UI tasks (e.g., viewing detailed analytics or long lists of Chama members), the bot can provide a secure, authenticated web-view link that opens within the device's browser.
