# Phone login via WhatsApp

Chamapay supports **Continue with phone** on the new auth screen. Codes are sent only on **WhatsApp** (Meta Cloud API) — no SMS provider.

## Flow

1. User taps **Continue with phone** → dedicated modal
2. Enters number → **Get code**
3. Lovely “Code sent” screen → **I have the code**
4. Enters 6-digit OTP → login or wallet-setup

## How to get `WHATSAPP_TOKEN` and `WHATSAPP_PHONE_NUMBER_ID`

### 1. Meta developer app
1. Go to [https://developers.facebook.com](https://developers.facebook.com) and log in.
2. **My Apps** → **Create App** → type **Business**.
3. Add the **WhatsApp** product to the app.

### 2. WhatsApp Cloud API setup
1. In the app dashboard open **WhatsApp → API Setup** (or **Getting Started**).
2. You’ll see a **temporary access token** (good for testing; expires in ~24h) and a **Phone number ID**.
3. Copy:
   - **Phone number ID** → `WHATSAPP_PHONE_NUMBER_ID`
   - **Temporary token** → `WHATSAPP_TOKEN` (for quick tests only)

### 3. Permanent token (production)
1. Open [Meta Business Suite](https://business.facebook.com) → **Business settings**.
2. **Users → System users** → create a system user (Admin).
3. **Add assets** → assign your WhatsApp Business Account / app with full control.
4. **Generate new token** → select your app → permissions at least:
   - `whatsapp_business_messaging`
   - `whatsapp_business_management`
5. Copy the token → set as `WHATSAPP_TOKEN` on the server (never commit it).

### 4. From / to numbers
- **From:** the WhatsApp Business number Meta shows in API Setup (test number first, then your own).
- **To:** the user’s personal WhatsApp number (must be able to receive WhatsApp).
- In **sandbox/test**, add recipient numbers under **API Setup → To** (allowed list) before messaging them.

### 5. Server env

```bash
WHATSAPP_TOKEN=EAAB...          # permanent system-user token
WHATSAPP_PHONE_NUMBER_ID=123... # from API Setup
# Optional later (Meta-approved auth template)
# WHATSAPP_OTP_TEMPLATE=chamapay_otp
# WHATSAPP_OTP_TEMPLATE_LANG=en
# WHATSAPP_OTP_DEBUG=true   # only local: return OTP in API JSON
```

Restart the Server after setting env vars.

### 6. Production tip
Plain text OTP works for early testing. Before scale, create an **Authentication** message template in WhatsApp Manager and set `WHATSAPP_OTP_TEMPLATE` so Meta doesn’t throttle free-form auth messages.

## Notes

- 60s cooldown between sends per number
- OTP never returned to the client unless `WHATSAPP_OTP_DEBUG=true`
- SMS was intentionally skipped (Africa’s Talking minimum spend too high for now)
