# Phone login via WhatsApp

Chamapay supports **Continue with phone** on the new auth screen. Codes are sent only on **WhatsApp** (Meta Cloud API) — no SMS provider.

**Setup (Meta number, token, env):** see [whatsapp_otp_setup.md](./whatsapp_otp_setup.md).  
**Security roadmap (2FA, sessions):** see [security_user_side_phases.md](./security_user_side_phases.md).

## Flow

1. User taps **Continue with phone** → dedicated modal
2. Enters number → **Get code** / **Continue**
3. “Code sent” / Check WhatsApp screen → **Enter code**
4. Enters 6-digit OTP → login or wallet-setup

## Server env (summary)

```bash
WHATSAPP_TOKEN=EAAB...          # permanent system-user token
WHATSAPP_PHONE_NUMBER_ID=123... # Chamapay business number ID from Meta
# Optional later (Meta-approved auth template)
# WHATSAPP_OTP_TEMPLATE=chamapay_otp
# WHATSAPP_OTP_TEMPLATE_LANG=en
# WHATSAPP_OTP_DEBUG=true   # only local: return OTP in API JSON
```

Restart the Server after setting env vars. Full steps: [whatsapp_otp_setup.md](./whatsapp_otp_setup.md).

## Notes

- 60s cooldown between sends per number
- OTP never returned to the client unless `WHATSAPP_OTP_DEBUG=true`
- SMS was intentionally skipped (Africa’s Talking minimum spend too high for now)
- Same WhatsApp Business number can later power the Chamapay bot