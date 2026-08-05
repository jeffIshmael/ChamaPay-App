# API Requirements for Onchain Stats Drill-down

This document outlines the required data structure and API endpoints needed for the new `/stats/onchain` drill-down page. The frontend expects this data to be exposed so it can accurately render the breakdown of onchain transactions.

## Proposed Endpoint

`GET /api/stats/onchain`

## Expected JSON Payload

The API should return a JSON response containing three main sections corresponding to the UI requirements:

```typescript
type OnchainStatsResponse = {
  // Section 1: Breakdown by action type
  actionBreakdown: {
    actionType: "contribution" | "payout" | "peer_transfer" | "chama_creation" | "member_addition";
    transactionCountAllTime: number;
    usdcVolumeAllTime: number; // For actions without volume (e.g., chama creation), this can be 0 or omitted
  }[];

  // Section 2: Trend over time
  // Grouped by day for the last 30 days
  trendOverTime: {
    date: string; // ISO format (e.g. "2026-08-01")
    transactionCount: number;
    // Optional: usdcVolume: number; // if we ever want to switch the y-axis
  }[];

  // Section 3: Recent transactions table (verifiability)
  // Show most recent 20 transactions
  recentTransactions: {
    id: string; // Unique identifier
    timestamp: string; // ISO string date/time
    actionType: "contribution" | "payout" | "peer_transfer" | "chama_creation" | "member_addition";
    amountUsdc: number; // 0 for actions like chama creation
    txHash: string; // The full 0x... hash so the UI can link to the block explorer
  }[];
  
  updatedAt: string; // Timestamp of when these stats were last computed
}
```

## Data Retrieval Guidelines for the Backend Agent

When implementing the data aggregation for this endpoint, please follow these guidelines:

1. **Filtering & Deduplication**:
   - Ensure all figures are **strictly onchain-only**.
   - Do NOT include off-chain events like M-Pesa deposit/withdrawal initiations.
   - Ensure transactions are deduplicated by unique transaction hash (especially important if peer transfers are included).

2. **Action Breakdown (`actionBreakdown`)**:
   - Map existing contract functions or transfer events to the 5 specified action types:
     - `contribution`: Deposit to chama
     - `payout`: Process payout
     - `peer_transfer`: USDC transfers outside the contract
     - `chama_creation`: Creating a new chama
     - `member_addition`: Adding a member
   - Even if a category has zero volume/count, return it in the payload. Do not omit sparse categories.

3. **Trend Over Time (`trendOverTime`)**:
   - Generate a continuous 30-day timeline up to the current date.
   - If there were 0 transactions on a specific day, return `0` for that day rather than omitting the date from the array.

4. **Recent Transactions (`recentTransactions`)**:
   - Limit to the most recent 20 transactions globally across all types.
   - Provide the full transaction hash so the UI can construct the block explorer URL and truncate it visually.

## Caching

Given the potentially heavy nature of computing all-time onchain stats and grouping, it is highly recommended to cache this endpoint's response (e.g., using Redis or Next.js ISR) and revalidate every few minutes (e.g., `revalidate: 60`).
