# Smile ID sandbox setup (Tier-2 KYC)

Chamapay uses **Smile ID** for Kenya National ID, passport, and driver’s license + selfie/liveness.

## 1. Partner portal

1. Create an account at [https://portal.usesmileid.com](https://portal.usesmileid.com)
2. Create a **sandbox** app for Kenya (`KE`)
3. Enable **Document Verification** (or Enhanced Document Verification if IPRS matching is required later)
4. Download `smile_config.json` from the SDK section
5. Place it at `Application/smile_config.json` (gitignored) — never commit live secrets

## 2. Server env

Add to `Server/.env` (see `.env.example`):

```bash
SMILE_PARTNER_ID=
SMILE_API_KEY=
SMILE_CALLBACK_URL=https://<your-api-host>/kyc/webhook
# Optional HMAC / signature secret if configured in portal
SMILE_WEBHOOK_SECRET=
# true = allow POST /kyc/sandbox/approve for local testing without Smile
SMILE_SANDBOX=true
```

Public callback must be reachable by Smile (use ngrok/cloudflare tunnel in local sandbox).

## 3. Mobile

- Screen: `/verify-identity`
- Native SDK: `@smile_identity/react-native-expo` (requires a custom Expo/dev-client build)
- Until partner keys exist, `SMILE_SANDBOX=true` lets the app complete a simulated approval via the backend

## 4. Supported document types (KE)

| UI label | Smile `documentType` |
|----------|----------------------|
| National ID | `NATIONAL_ID` |
| Passport | `PASSPORT` |
| Driver’s license | `DRIVERS_LICENSE` |

## 5. Flow

1. App `POST /kyc/session` with `{ documentType }` (auth)
2. Server creates `KycJob` (`pending`) and returns `jobId` + Smile launch params
3. App runs Smile capture (or sandbox simulate)
4. Smile `POST /kyc/webhook` → on approve, `User.kycTier = 2`, `kycStatus = approved`
5. On-ramp limit becomes **100,000 KES / month**
