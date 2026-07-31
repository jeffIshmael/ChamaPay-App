// We have 2 types of transactions:
// 1. Internal transfers
// 2. Withdrawals to M-PESA

// For internal transfers, we have a fee structure that is based on the amount of the transfer.
// For withdrawals to M-PESA, we have a fee structure that is based on the amount of the withdrawal.

// Internal transfer fee lookup table
const TRANSFER_FEE_BRACKETS = [
    { min: 0.01, max: 1.00, fee: 0.01 },
    { min: 1.01, max: 10.00, fee: 0.05 },
    { min: 10.01, max: 50.00, fee: 0.10 },
    { min: 50.01, max: 100.00, fee: 0.25 },
    { min: 100.01, max: 500.00, fee: 0.50 },
    { min: 500.01, max: 1000.00, fee: 0.75 },
] as const;

const MAX_TRANSFER_FEE = 1.00;

export const internalTransferFee = (amount: number): number => {
    // Validate amount
    if (amount < 0.01) throw new Error("Minimum transfer amount is 0.01 USDC");
    
    const bracket = TRANSFER_FEE_BRACKETS.find(
        b => amount >= b.min && amount <= b.max
    );
    
    return bracket?.fee ?? MAX_TRANSFER_FEE;
}

// Withdrawal fee lookup table
const WITHDRAWAL_FEE_BRACKETS = [
    { min: 100, max: 500, fee: 5 },
    { min: 501, max: 1000, fee: 10 },
    { min: 1001, max: 2500, fee: 15 },
    { min: 2501, max: 5000, fee: 25 },
    { min: 5001, max: 10000, fee: 40 },
    { min: 10001, max: 20000, fee: 60 },
    { min: 20001, max: 35000, fee: 100 },
    { min: 35001, max: 50000, fee: 150 },
    { min: 50001, max: 70000, fee: 220 },
    { min: 70001, max: 100000, fee: 300 },
] as const;

const MAX_WITHDRAWAL_FEE = 300;

export const withdrawalToMpesaFee = (amount: number): number => {
    // Validate amount
    if (amount < 100) throw new Error("Minimum withdrawal is 100 Kshs");
    if (amount > 100000) throw new Error("Maximum withdrawal is 100,000 Kshs");
    
    const bracket = WITHDRAWAL_FEE_BRACKETS.find(
        b => amount >= b.min && amount <= b.max
    );
    
    return bracket?.fee ?? MAX_WITHDRAWAL_FEE;
}