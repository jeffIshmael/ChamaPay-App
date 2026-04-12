Base Builder Codes

Copy page

Attribute onchain activity to your app, wallet or agent with Builder Codes.

​
What Are Builder Codes
Base Builder Codes are an ERC-721 NFT collection where unique codes (e.g. “abc123”) are minted to help identify builders onchain.
Each code has associated metadata. Onchain metadata primarily includes a “payout address” where each code declares where potential rewards should be sent to. Offchain metadata includes more details about the app including its name and site.
Get your Builder Code by registering on base.dev. You can find your code under Settings → Builder Code.
​
Integration Guides
For App Developers
Integrate Builder Codes using Wagmi or Viem
For Wallet Developers
Implement the dataSuffix capability
For Agent Developers
Attribute your AI agent’s transactions via the API
​
Benefits
Rewards: If your app drives transactions, Builder Codes let Base automatically attribute that usage back to you, unlocking rewards as the program expands.
Analytics: Reliably track onchain usage, user acquisition, and conversion metrics in Base.dev.
Visibility: Apps with Builder Codes can show up in discovery surfaces like App Leaderboards, Base App store, and ecosystem spotlights.
​
FAQ
​
Do I Need to Modify My Smart Contracts?
No. The attribution suffix is appended to the end of transaction calldata. Smart contracts execute normally and ignore the extra data. Attribution is extracted by offchain indexers after the fact.
This means:
Any existing smart contract automatically supports ERC-8021
No upgrades or redeployments required
Zero impact on contract execution
​
How Much Additional Gas Do Builder Codes Cost?
The ERC-8021 suffix adds a negligible amount of gas to each transaction at 16 gas per non-zero byte.
​
Will Builder Codes Expose My Identity?
No. Builder Codes only associate transactions with your application—they don’t expose any wallet information that isn’t already public onchain.
​
Can I Use ERC-8021 with Externally Owned Accounts (EOAs)?
Yes. ERC-8021 works with both EOAs and smart contract wallets.
​
How Do I Verify That My Transaction Was Properly Attributed?
1. Check base.dev
Visit base.dev
Select Onchain from the transaction type dropdown
Under the Total Transactions section, attribution counts increment when transactions with your code are processed
2. Use a Block Explorer (Basescan, Etherscan, etc.)
Find your transaction hash
View the input data field
Verify the last 16 bytes are the 8021 repeating
Decode the suffix to confirm your Builder Code is present
3. Open Source Tools
Use the Builder Code Validation tool
Select transaction type
Enter the transaction or UserOperation hash
Click the Check Attribution button
​
Which Wallets Currently Support ERC-8021?
EOAs:
All EOA wallets support dataSuffix by default.
Smart Wallets:
Wallets supporting ERC-5792 can use the DataSuffixCapability for clean suffix appending.
Example Code

Embedded Wallets:
Privy - Embedded wallet solution with ERC-8021 capability
Turnkey - Infrastructure for programmatic wallets
​
Additional Resources
Official ERC-8021 Proposal
Builder Code Validation Tool
​
Builder Codes for App Developers

Copy page

Integrate Builder Codes into your app using Wagmi or Viem to attribute onchain activity.

​
Automatic Attribution on Base
Once your app is registered on base.dev, the Base App will auto-append your Builder Code to transactions its users make in your app (e.g. via your app, or the Base App’s browser). This powers your onchain analytics in base.dev and qualifies you for potential future rewards.
​
Integrating Outside the Base App
If users also access your app on the web or through other clients, you’ll need to integrate the dataSuffix parameter to capture that activity.
When you register on base.dev, you will receive a Builder Code—a random string (e.g., bc_b7k3p9da) that you’ll use to generate your attribution suffix. The recommended approach is to configure dataSuffix at the client level, which appends your Builder Code to all transactions.
You can find your code anytime under Settings → Builder Code.
​
Quick Setup with Wagmi
1
Install Dependencies

Install the required packages. Requires viem version 2.45.0 or higher.
npm i ox wagmi viem
2
Configure Your Wagmi Client

Add the dataSuffix option to your Wagmi config. This automatically appends your Builder Code to all transactions.
config.ts
import { createConfig, http } from "wagmi";
import { base } from "wagmi/chains";
import { Attribution } from "ox/erc8021";

// Get your Builder Code from base.dev > Settings > Builder Codes
const DATA_SUFFIX = Attribution.toDataSuffix({
  codes: ["YOUR-BUILDER-CODE"],
});

export const config = createConfig({
  chains: [base],
  transports: {
    [base.id]: http(),
  },
  dataSuffix: DATA_SUFFIX,
});
3
Use Wagmi Hooks as Usual

With the config in place, all transactions automatically include your Builder Code—no changes to your hooks or components. This works with both useSendTransaction and useSendCalls.
App.tsx
import { useSendTransaction } from "wagmi";
import { parseEther } from "viem";

function SendButton() {
  const { sendTransaction } = useSendTransaction();

  return (
    <button
      onClick={() =>
        sendTransaction({
          to: "0x70997970c51812dc3a010c7d01b50e0d17dc79c8",
          value: parseEther("0.01"),
        })
      }
    >
      Send ETH
    </button>
  );
}
​
Quick Setup with Viem
1
Install Dependencies

Install the required packages. Requires viem version 2.45.0 or higher.
npm i ox viem
2
Configure Your Wallet Client

Add the dataSuffix option when creating your wallet client. See the viem wallet client docs for more configuration options.
client.ts
import { createWalletClient, http } from "viem";
import { base } from "viem/chains";
import { Attribution } from "ox/erc8021";

// Get your Builder Code from base.dev > Settings > Builder Codes
const DATA_SUFFIX = Attribution.toDataSuffix({
  codes: ["YOUR-BUILDER-CODE"],
});

export const walletClient = createWalletClient({
  chain: base,
  transport: http(),
  dataSuffix: DATA_SUFFIX,
});
3
Send Transactions as Usual

All transactions sent through this client automatically include your Builder Code.
import { parseEther } from "viem";
import { walletClient } from "./client";

const hash = await walletClient.sendTransaction({
  to: "0x70997970c51812dc3a010c7d01b50e0d17dc79c8",
  value: parseEther("0.01"),
});
​
Using Privy
Privy provides a dataSuffix plugin that automatically appends your Builder Code to all transactions—including both EOA transactions and ERC-4337 smart wallet user operations.
See the Privy Builder Codes integration guide for setup instructions.
​
Legacy: Per-Transaction Approach
Appending dataSuffix Per-Transaction

​
Verify Attribution
To confirm your Builder Code is being appended correctly:
1. Check base.dev
Visit base.dev
Select Onchain from the transaction type dropdown
Under the Total Transactions section, attribution counts increment when transactions with your code are processed
2. Use a Block Explorer (Basescan, Etherscan, etc.)
Find your transaction hash
View the input data field
Verify the last 16 bytes are the 8021 repeating
Decode the suffix to confirm your Builder Code is present
3. Open Source Tools
Use the Builder Code Validation tool
Select transaction type
Enter the transaction or UserOperation hash
Click the Check Attribution button

Builder Codes for Wallet Developers

Copy page

Implement the dataSuffix capability in your wallet to enable Builder Code attribution.

​
Overview
Wallet providers need to support the dataSuffix capability to enable attribution. This involves accepting the capability and appending the suffix to the calldata before signing.
1
Support the dataSuffix Capability

Your wallet should accept a dataSuffix object in the capabilities object of wallet_sendCalls.
type DataSuffixCapability = {
  value: `0x${string}`;  // hex-encoded bytes provided by the app
  optional?: boolean;    // whether the capability is optional
}
2
Append Suffix to Calldata

When constructing the transaction or User Operation, extract the dataSuffix and append it to the calldata.
EOA Transactions
ERC-4337 User Operations
Append to tx.data.
// Minimal example for EOA
function applySuffixToEOA(tx, capabilities) {
  const suffix = capabilities.dataSuffix?.value
  if (!suffix) return tx

  return {
    ...tx,
    // Append suffix bytes (remove 0x prefix from suffix if tx.data has it)
    data: tx.data + suffix.slice(2)
  }
}
3
Add Wallet Attribution (Optional)

Wallets may also include their own attribution code (their own ERC-8021 suffix) by prepending the wallet’s suffix before the app’s.
No interaction required with apps: The wallet handles this independently.
Multi-code support: ERC-8021 natively supports multiple attribution codes.
Example:
finalSuffix = walletSuffix + appSuffix
This ensures both the app and the wallet receive onchain attribution.

Builder Codes for Agent Developers

Copy page

Attribute your AI agent’s onchain transactions to your identity on Base and unlock analytics and leaderboard features.

AI agents operate autonomously and send transactions without a user manually triggering each one. Builder Codes give you a way to attribute all of that activity back to your agent’s identity on Base.
​
Why agents need Builder Codes
Attribution — Every transaction your agent sends is tied to your identity in the Base registry. Without it, your agent’s onchain activity is anonymous.
Analytics — Track your agent’s transaction volume, user reach, and onchain conversion in base.dev.
Visibility — Agents with Builder Codes can appear in discovery surfaces like Base’s App Leaderboard and ecosystem spotlights.
​
How it works
A Builder Code is a unique identifier (e.g. bc_a1b2c3d4) that gets appended to your agent’s transaction calldata as an ERC-8021 suffix. Smart contracts ignore the suffix; it is extracted by offchain indexers after the fact. The gas overhead is minimal (16 gas per non-zero byte).
​
API reference
​
Register your agent
POST /v1/agents/builder-codes
No authentication required.
Field	Type	Required	Description
walletAddress	string	Yes	Your agent’s EVM wallet address (0x...)
Returns the builder code for the given wallet. The same wallet address always returns the same code.
Terminal
curl -X POST https://api.base.dev/v1/agents/builder-codes \
  -H "Content-Type: application/json" \
  -d '{
    "walletAddress": "<your-wallet-address>"
  }'
Response
{
  "builderCode": "bc_a1b2c3d4",
  "walletAddress": "0x..."
}
Already registered? Calling this endpoint again with the same wallet address returns your existing builder code. Safe to call on every deploy.
​
Using the Base skill
If you’re using an AI coding tool (Claude Code, Cursor, Codex), install the Base skills package and let the skill handle registration end-to-end:
Terminal
npx skills add base/skills
Then ask your agent: “Register my agent for a builder code on Base.dev.”
The skill handles wallet validation, calls the registration API, writes the returned code to src/constants/builderCode.ts, installs ox, and wires the ERC-8021 dataSuffix into your transaction client (viem, ethers.js, or managed service).
Read more in the Builder Codes for Agents guide.
​
Verify attribution
To confirm your Builder Code is being appended correctly:
1. Check base.dev
Visit base.dev
Select Onchain from the transaction type dropdown
Under the Total Transactions section, attribution counts increment when transactions with your code are processed
2. Use a block explorer (Basescan, Etherscan, etc.)
Find your transaction hash
View the input data field
Verify the last 16 bytes are the 8021 repeating
Decode the suffix to confirm your Builder Code is present
3. Open source tools
Use the Builder Code Validation tool
Select transaction type
Enter the transaction or UserOperation hash
Click the Check Attribution button
