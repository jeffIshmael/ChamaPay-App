# Didit KYC setup (Tier-2)

Chamapay uses **Didit** for in-app ID + selfie/liveness (no browser redirect).

## Console setup

1. Create an application at [https://business.didit.me](https://business.didit.me)
2. **Workflows** → create/publish a KYC workflow (ID document + liveness + face match). Copy `workflow_id`.
3. **API & Webhooks** → copy the application API key → `DIDIT_API_KEY`
4. Add a webhook destination:
   - URL: `https://your-api-host/kyc/webhook`
   - Events: `status.updated` (and optionally `data.updated`)
   - Copy `secret_shared_key` → `DIDIT_WEBHOOK_SECRET`

## Server env (`Server/.env`)

```bash
DIDIT_API_KEY=           # from your SANDBOX application
DIDIT_WORKFLOW_ID=       # published KYC workflow on that same sandbox app
DIDIT_WEBHOOK_SECRET=    # sandbox webhook destination secret
DIDIT_SANDBOX=true       # arms sandbox_scenario on session create (default: approve)
# DIDIT_SANDBOX_SCENARIO=approve
# DIDIT_LOCAL_MOCK=true  # offline only — skips Didit API (not Console sandbox)
```

With `DIDIT_SANDBOX=true` and sandbox keys filled in, the server calls Didit’s real sandbox API and passes `sandbox_scenario` (default **`approve`**). Tier upgrades still come from the **webhook** (`environment: "sandbox"`). Do not use `/kyc/sandbox/approve` for Console sandbox — that route is only for `DIDIT_LOCAL_MOCK`.

Public callback must be reachable by Didit (ngrok/cloudflare tunnel in local sandbox).

## App

- Package: `@didit-protocol/sdk-react-native` (Expo config plugin in `app.config.js`)
- Requires a **development / EAS build** — not Expo Go
- NFC disabled in the plugin for smaller binaries (Kenya ID + passport photo page)

## Flow

1. User opens **Verify identity**
2. Server `POST /kyc/session` → Didit `POST /v3/session/` with `vendor_data = userId`
3. App runs `startVerification(session_token)` in-process
4. Didit `POST /kyc/webhook` → on `Approved`, `User.kycTier = 2`, `kycStatus = approved`

## Docs

- RN SDK: https://docs.didit.me/integration/native-sdks/react-native-sdk
- Webhooks: https://docs.didit.me/integration/webhooks
- Sessions: https://docs.didit.me/sessions-api/create-session
