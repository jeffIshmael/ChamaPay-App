# WhatsApp OTP setup (Chamapay business number)

Step-by-step guide to send login / 2FA codes on WhatsApp using Meta Cloud API.

## How the pieces fit

| Piece | Role |
|---|---|
| **Your new Chamapay phone number** | Registered as a **WhatsApp Business** number on Meta. This is the **From** number users see when they get an OTP (and later the bot they chat with). |
| **`WHATSAPP_PHONE_NUMBER_ID`** | Meta’s ID for that business number (not the digits `+254…`). Used in API calls. |
| **`WHATSAPP_TOKEN`** | Long-lived access token that authorizes your server to send messages as that number. |
| **User’s personal WhatsApp** | The **To** number — where the OTP is delivered. |

**Same number for OTP and future bot?**  
Yes — that is the usual setup. One WhatsApp Business number:

1. **Now:** server sends OTPs (auth / 2FA).  
2. **Later:** same number powers the Chamapay WhatsApp bot (menus, deposits, etc.).

You do **not** need a separate number for OTP vs bot. Keep one Chamapay brand number.

---

## Prerequisites

- Meta / Facebook account with access to a **Meta Business** portfolio  
- The **new phone number** (SIM or virtual) dedicated to Chamapay  
- Ability to receive SMS/voice on that number for Meta verification  
- Server `.env` access (`Server/.env`)

---

## Step 1 — Create (or open) the Meta app

1. Go to [https://developers.facebook.com](https://developers.facebook.com) → log in.  
2. **My Apps** → **Create App** (or open the existing Chamapay app).  
3. Choose **Business** type → connect / create a Business portfolio.  
4. In the app dashboard: **Add product** → **WhatsApp** → **Set up**.

---

## Step 2 — Connect WhatsApp Business Account (WABA)

1. Open **WhatsApp → API Setup** (or **Getting Started**).  
2. Follow prompts to create or select a **WhatsApp Business Account**.  
3. Meta will show a **test number** first (fine for early tests).  
4. You will also see:
   - **Temporary access token** (~24h — testing only)  
   - **Phone number ID**  
   - **WhatsApp Business Account ID**

Copy **Phone number ID** somewhere safe; you will put it in `.env` as `WHATSAPP_PHONE_NUMBER_ID`.

---

## Step 3 — Add your real Chamapay phone number

1. In WhatsApp Manager / API Setup, choose **Add phone number** (or **Phone numbers**).  
2. Enter the **new Chamapay number** (country code included).  
3. Verify with the SMS/voice code Meta sends to that SIM.  
4. Complete display name / business profile (Chamapay) as Meta requires.  
5. After verification, select that number as the sender and copy its **Phone number ID**  
   (each number has its own ID — use the Chamapay one, not the old test ID).

**Display name tip:** Use a clear name like `Chamapay` so users trust OTP messages.

---

## Step 4 — Create a permanent token (production)

Temporary tokens expire. For real OTP sending:

1. Open [Meta Business Suite](https://business.facebook.com) → **Business settings**.  
2. **Users → System users** → **Add** → create a system user (e.g. `chamapay-api`) with **Admin** (or enough access).  
3. **Add assets** → assign:
   - the WhatsApp Business Account  
   - the Meta app  
   with control to manage WhatsApp.  
4. **Generate new token**:
   - Select the Chamapay app  
   - Permissions at least:
     - `whatsapp_business_messaging`  
     - `whatsapp_business_management`  
5. Copy the token once → this is `WHATSAPP_TOKEN`. Store only in secrets / `.env`, never in git.

---

## Step 5 — Put credentials on the server

In `Server/.env`:

```bash
WHATSAPP_TOKEN=EAAB...your_system_user_token
WHATSAPP_PHONE_NUMBER_ID=123456789012345

# Optional while developing (returns OTP in API JSON — never in production)
# WHATSAPP_OTP_DEBUG=true

# After Meta approves an Auth template (recommended before scale):
# WHATSAPP_OTP_TEMPLATE=chamapay_otp
# WHATSAPP_OTP_TEMPLATE_LANG=en
```

Restart the Server process so env vars load.

Your code path:

- `Server/Lib/WhatsAppService.ts` → `sendWhatsAppOTP`  
- `POST /auth/send-whatsapp-otp`  
- `POST /auth/verify-whatsapp-otp`

---

## Step 6 — Test recipient allowlist (sandbox / early access)

While the number or app is in development / limited mode:

1. WhatsApp **API Setup** → **To** / allowed recipients.  
2. Add **your personal WhatsApp numbers** you will test with.  
3. Only those numbers can receive messages until the business is fully live.

Then call send OTP from the app (Continue with phone) or:

```bash
curl -X POST "$SERVER_URL/auth/send-whatsapp-otp" \
  -H "Content-Type: application/json" \
  -d '{"phone":"7XXXXXXXX","countryCode":"254"}'
```

(Adjust body fields to match your controller’s expected JSON.)

You should receive a WhatsApp message from the Chamapay business number with a 6-digit code.

---

## Step 7 — Authentication template (before scale)

Plain text OTP is OK for early testing. For production volume, Meta prefers an **Authentication** template:

1. WhatsApp Manager → **Message templates** → create template.  
2. Category: **Authentication**.  
3. Name example: `chamapay_otp`.  
4. Body includes a code variable (follow Meta’s OTP template format).  
5. Submit for approval.  
6. When approved, set:

```bash
WHATSAPP_OTP_TEMPLATE=chamapay_otp
WHATSAPP_OTP_TEMPLATE_LANG=en
```

`WhatsAppService` prefers the template when set, and can fall back to plain text if template send fails.

---

## Step 8 — Checklist before calling OTP “done”

- [ ] Chamapay number verified on Meta  
- [ ] Correct `WHATSAPP_PHONE_NUMBER_ID` for that number  
- [ ] Permanent `WHATSAPP_TOKEN` (not the 24h temp token)  
- [ ] Server restarted with env set  
- [ ] Test number on allowlist (if still in test mode)  
- [ ] OTP arrives on WhatsApp within seconds  
- [ ] Verify endpoint accepts the code (`/auth/verify-whatsapp-otp`)  
- [ ] `WHATSAPP_OTP_DEBUG` is **off** in production  

---

## After OTP sending works

Follow [security_user_side_phases.md](./security_user_side_phases.md) Phase 1:

1. Finish **phone login / signup** UX + backend edge cases.  
2. Add **2FA in Profile Settings** (email login → also WhatsApp OTP).  
3. Step-up OTP on withdraw / change email.

Later: same business number → WhatsApp bot ([whatsapp_bot_strategy.md](./whatsapp_bot_strategy.md)). Bot will need webhooks; OTP sending only needs outbound Cloud API + token + phone number ID.

---

## Troubleshooting

| Symptom | Likely cause |
|---|---|
| `WhatsApp credentials not configured` | Missing/empty env; server not restarted |
| 401 from Graph API | Bad/expired token — use system user permanent token |
| 404 / wrong number | Wrong `WHATSAPP_PHONE_NUMBER_ID` |
| User never receives OTP | Number not on allowlist; user has no WhatsApp; wrong country code |
| Template errors | Template name/lang mismatch or not approved yet |

Enable temporary logging with care; never log full tokens or OTPs in production logs.
