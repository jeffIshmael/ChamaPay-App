# Chamapay user-side security phases

Chamapay wallets are **custodial / managed** (Coinbase CDP server wallets) until we deliberately choose a non-custodial model. Users do not hold seed phrases for normal accounts.

Device PIN / biometrics today protect **that phone only**. They do **not** stop an attacker who steals the user’s email, logs in on a new device, and sets a new local PIN.

---

## Custody messaging (support / product)

| Question | Answer |
|---|---|
| Is Chamapay non-custodial? | **No** — managed CDP wallets. |
| Can I import to MetaMask? | Withdraw USDC to your MetaMask address. We do not hand out private keys in normal support. |
| CDP export technically possible? | Yes for app-controlled EOAs via CDP `exportAccount`, but that is a future product/policy decision — not enabled casually. |

---

## Phase 1 — Account protection for email users (start here)

**Goal:** Stolen email alone must not open Chamapay.

1. Finish **login with phone** (WhatsApp OTP) — see [phone_whatsapp_auth.md](./phone_whatsapp_auth.md) and [whatsapp_otp_setup.md](./whatsapp_otp_setup.md).
2. Let users **link a phone** to an email account.
3. Enable **2FA in Profile Settings** (“Phone protection”):
   - After email OTP → also require WhatsApp OTP (when 2FA is on).
4. **Step-up verification** on sensitive actions even if already logged in:
   - Withdraw / offramp / send
   - Change email
   - Disable 2FA
   - (Later) export key if ever offered

**Order of work**

1. WhatsApp Cloud API sending OTPs from the Chamapay business number  
2. Full phone login / signup  
3. Profile 2FA + step-up on withdraw  

---

## Phase 2 — Sessions and money moves

1. **Single active session / new-device control**
   - New login can invalidate older refresh tokens.
   - Optional “new device” challenge via WhatsApp.
2. **Server-verified transaction PIN** (hashed on backend)
   - Needed for multi-device and future **WhatsApp bot** money moves.
   - Separate from today’s **local unlock PIN / biometrics**.

| Factor | Role | Stored where |
|---|---|---|
| Local PIN / biometrics | Unlock this device | Device only (current) |
| WhatsApp OTP | Login 2FA + step-up | Ephemeral server OTP |
| Server PIN (future) | Confirm money moves / bot | Hash in DB |

---

## Phase 3 — Recovery and hardening

1. Recovery codes or KYC-assisted email change when inbox is lost.
2. Alerts: new login, new device, large offramp.
3. Rate limits and lockouts on OTP abuse.
4. Stronger OAuth verification if Google/Apple remain login paths.

---

## What we must not lose (platform)

Protect as if they *are* user funds:

- CDP API keys + wallet secret  
- Treasury / settlement wallets  
- `JWT_SECRET`, encryption secrets  
- Pretium / M-Pesa credentials  
- WhatsApp / email provider tokens  
- Production database  

Never send private keys in support tickets, Slack, or email.

---

## Follow-up docs

- [whatsapp_otp_setup.md](./whatsapp_otp_setup.md) — step-by-step Meta setup for OTP sending  
- [phone_whatsapp_auth.md](./phone_whatsapp_auth.md) — app/API flow for phone login  
- [whatsapp_bot_strategy.md](./whatsapp_bot_strategy.md) — later Chamapay WhatsApp bot (same Business number family)  
