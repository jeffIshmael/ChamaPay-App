# Moonwell Save and Earn Integration

This document outlines the architecture and technical flow for integrating the Moonwell protocol into the ChamaPay application for the "Save and Earn" feature.

## 1. Overview
The **Save and Earn** feature allows users to deposit their USDC into the Moonwell money market protocol on the Base network to earn yield (APY). It abstracts the complexities of blockchain transactions, providing a gasless and seamless experience by utilizing EIP-7702 Smart Accounts.

## 2. Frontend Architecture
- **Data Fetching:** The frontend uses `Application/lib/moonwellService.ts` to fetch real-time APY rates and user positions from the public Moonwell API endpoints (`https://api.moonwell.fi/v1/rates` and `/positions`).
- **User Interface:** Users interact with the `save-earn.tsx` screen and the `MoonwellDepositModal.tsx` component to initiate a deposit, specifying the amount of USDC they want to supply.
- **API Request:** Upon user confirmation, the frontend sends a POST request to the backend endpoint `/moonwell/deposit` containing the authenticated token and the deposit amount.

## 3. Backend Controller Flow (`Server/Controllers/moonwellController.ts`)
- **Authentication & Validation:** The `depositToMoonwell` endpoint authenticates the request using the user's JWT token and validates the deposit amount.
- **Key Retrieval:** The backend retrieves the user's private key via the secure `getPrivateKey(userId)` helper function.
- **Transaction Invocation:** The controller then calls the blockchain write function `bcMoonwellDeposit` with the private key and amount.

## 4. Blockchain Execution (`Server/Blockchain/WriteFunction.ts`)
The `bcMoonwellDeposit` function handles the on-chain execution. It utilizes **EIP-7702** to provide a seamless, sponsored transaction experience:

1. **Smart Account Initialization:** 
   The function calls `createEIP7702SmartAccount(privateKey)` to establish an EIP-7702 Smart Account. This allows the user's Externally Owned Account (EOA) to temporarily adopt smart contract capabilities for the duration of the transaction.
2. **Amount Formatting:** 
   The requested deposit amount is parsed into the 6-decimal format required by USDC (`parseUnits(amount, 6)`).
3. **Approve Transaction:** 
   The Smart Account client writes to the Base USDC contract to `approve` the Moonwell USDC Market (`moonwellUSDCAddress`) to spend the specified deposit amount.
4. **Mint Transaction (Supply):** 
   The client writes to the Moonwell USDC Market contract calling the `mint` function. This pulls the USDC from the user's wallet into the Moonwell protocol and mints `mUSDC` (Moonwell's receipt token) back to the user, which continuously accrues interest.
5. **Builder Code Attribution:** 
   All transactions append the `builderCodeDataSuffix` to the transaction data for developer attribution and potential referral earnings.

## 5. Record Keeping and Database
- After the on-chain deposit is successfully confirmed, the backend registers a new `Payment` record in the database using Prisma.
- It logs the transaction hash (`txHash`), deposit amount, sets the description to "Moonwell Deposit", the `sender` to "Wallet", and the `receiver` to "Moonwell".
- The controller responds to the frontend with a success status and the transaction details, allowing the UI to update accordingly.

## 6. Next Steps (Withdrawals)
- Currently, the application can fetch and display the user's real-time supplied mUSDC balance using `getMoonwellPositions`.
- To complete the feature loop, a corresponding backend endpoint (`/moonwell/withdraw`) and blockchain function (`bcMoonwellWithdraw`) will need to be implemented. This function will call Moonwell's `redeem` or `redeemUnderlying` methods to convert the user's `mUSDC` back into `USDC`.
