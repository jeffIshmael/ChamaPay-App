# Chamapay Currency & Exchange Rate Architecture

## Overview

Chamapay is a Kenyan-first application, but all blockchain settlement happens in **USDC**.

The platform should present itself as a KES-native application while internally using USDC as the source of truth.

Users should **never experience exchange-rate fluctuations** inside the app for normal operations such as balances, chama contributions, or savings.

Instead, Chamapay uses a **Platform Exchange Rate** for all internal calculations and only uses the provider's live rate when actually buying or selling USDC.

---

# Source of Truth

The source of truth is always:

- USDC amounts stored on-chain
- USDC balances
- USDC contribution amounts

KES is only a display currency.

---

# Platform Exchange Rate

Introduce a configurable platform exchange rate.

Example:

```env
CHAMAPAY_RATE=132
```

This value is **not** fetched from Pretium.

It is controlled by Chamapay.

This rate should be configurable through environment variables or an admin dashboard in the future.

---

# Chama Creation

When a user creates a chama, they enter the contribution amount in KES.

Example:

```
KES 1,000
```

The platform converts it using the platform rate.

```
1000 / 132
=
7.575757 USDC
```

Store:

```
ContributionUSDC = 7.575757
PlatformRate = 132
```

The smart contract should only know about the USDC amount.

The KES amount is reconstructed whenever needed by multiplying:

```
ContributionUSDC × PlatformRate
```

This guarantees that the contribution is always displayed as:

```
KES 1,000
```

regardless of market movements.

---

# Deposits

When a member deposits KES into a chama:

The UI should always ask for:

```
KES 1,000
```

Never calculate a different amount because of exchange-rate changes.

The platform receives KES 1,000 via M-Pesa.

Now the backend buys USDC from Pretium using the **live provider rate**.

Example:

Platform Rate

```
132
```

Live Pretium Rate

```
131.50
```

User deposits

```
KES 1,000
```

Pretium conversion

```
1000 / 131.50
=
7.604563 USDC
```

The chama only requires

```
7.575757 USDC
```

Transfer only

```
7.575757 USDC
```

to the user's chama.

The remaining

```
0.028806 USDC
```

should remain inside the Chamapay treasury.

This difference is called the **FX Reserve**.

---

# FX Reserve

The FX Reserve is the accumulated USDC remaining after conversions.

Formula:

```
Reserve =
ActualUSDCReceived
-
RequiredUSDC
```

Example

```
Received
7.604563

Required
7.575757

Reserve
0.028806 USDC
```

This reserve belongs to Chamapay.

Its purpose is to absorb future exchange-rate losses.

It should NOT automatically be sent to users.

---

# When the Provider Rate is Worse

Suppose:

Platform Rate

```
132
```

Live Rate

```
132.30
```

User deposits

```
KES 1,000
```

Received

```
1000 / 132.30
=
7.558579 USDC
```

Required

```
7.575757 USDC
```

Difference

```
0.017178 USDC
```

The backend should top up the missing amount from the FX Reserve.

The user should never notice this.

They still deposited exactly

```
KES 1,000
```

---

# Wallet Balance

Wallet balances should use the Platform Rate.

Example

Wallet

```
20 USDC
```

Displayed as

```
20 × 132
=
KES 2,640
```

Do NOT use the live Pretium rate.

The user's balance should remain stable.

---

# Chama Balances

Use the Platform Rate.

Never the live provider rate.

---

# Savings

Savings balances also use the Platform Rate.

Example

```
120 USDC
```

Display

```
KES 15,840
```

If yield increases the balance to

```
121 USDC
```

Display

```
KES 15,972
```

The only reason the balance should increase is because the user earned more USDC.

Not because exchange rates changed.

---

# Withdrawals

Withdrawals are different.

When the user presses Withdraw:

Fetch the current sell rate from Pretium.

Example

Wallet

```
20 USDC
```

Live Sell Rate

```
127.60
```

Withdrawal quote

```
20 × 127.60

=
KES 2,552
```

Show the user:

```
You'll receive

KES 2,552
```

Do NOT use the Platform Rate here.

Withdrawals should always use the provider's current live sell rate.

---

# Currency Settings

Allow users to choose:

- KES
- USDC
- Both

Changing this setting only changes presentation.

It never changes stored values.

---

# Data Model

Every chama should store:

```
ContributionUSDC

PlatformRate
```

Every wallet stores:

```
BalanceUSDC
```

Display calculations:

```
BalanceKES =
BalanceUSDC × PlatformRate
```

---

# Important Rules

Rule 1

USDC is the source of truth.

Never store KES as the authoritative balance.

---

Rule 2

Use the Platform Rate for every internal display.

Examples:

- Wallet
- Savings
- Chama Contributions
- Chama Pot
- Dashboard
- History

---

Rule 3

Use the live provider rate only when interacting with Pretium.

Examples:

- Buying USDC
- Selling USDC
- Withdrawal Quotes

---

Rule 4

Keep all surplus USDC generated during deposits inside the FX Reserve.

---

Rule 5

Use the FX Reserve whenever the provider rate is worse than the Platform Rate.

Users should never be asked to pay more than the contribution amount they originally agreed to.

---

# Design Philosophy

Chamapay is a KES-native experience powered by USDC.

Users think in Kenyan shillings.

The blockchain thinks in USDC.

The Platform Rate acts as the bridge between these two worlds.

Exchange-rate volatility should be managed by Chamapay's FX Reserve rather than exposed to users.

This provides a predictable, trustworthy experience while preserving the benefits of on-chain USDC settlement.