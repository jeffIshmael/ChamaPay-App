# Chamapay Transactional Email Redesign

## What this is
The five transactional emails (`sendResendOTPEmail`, `sendPayoutEmail`, `sendBulkReminderEmails`, `sendBulkChamaUpdateEmails`, `sendUSDCReceivedEmail`) have been redesigned for a cleaner, more modern look. Reference implementation: `email-service.ts` in this same output.

## Your task
Merge the HTML/styling from `email-service.ts` into our actual email service file. **Do not** replace the class wholesale — our real file has the `resend` client import, error handling patterns, and possibly other methods not shown here. Pull in:
1. The shared layout helpers at the top of the file (`wrapEmail`, `heading`, `paragraph`, and the color constants).
2. The rebuilt `html:` string inside each of the five methods.

Leave everything else (function signatures, `resend.emails.send` / `resend.batch.send` calls, return shapes, error logging) untouched — only the HTML content changes.

## What changed and why

### 1. Shared layout instead of five one-off templates
Every email used to build its own `<div>` markup from scratch with inconsistent styling. Now there's a single `wrapEmail(bodyHtml, opts)` function every method calls, so all emails share the same card, spacing, and footer. Individual methods only supply their body content via `heading()` / `paragraph()` helpers.

### 2. Real brand colors, not guesses
Colors now map directly to our `downy` Tailwind scale plus the gray/emerald tokens the app already uses:

| Constant | Value | Source | Used for |
|---|---|---|---|
| `ACCENT` | `#1c8584` | `downy-600` | Primary brand accent (OTP code, chama-update border) |
| `ACCENT_SOFT` | `#26a6a2` | `downy-500` | Lighter accent (e.g. "days left" in reminders) |
| `SUCCESS` | `#059669` | `emerald-600` | **Only** for "you received money" amounts (payout, deposit) — matches the app's existing success semantics, kept separate from brand teal |
| `SURFACE` | `#f1fcfa` | `downy-50` | Light background boxes (OTP box, receipt box) |
| `INK` | `#111827` | `gray-900` | Headings, primary text |
| `MUTED` | `#6b7280` | `gray-500` | Secondary text, footer |
| `BORDER` | `#e5e7eb` | `gray-200` | Card border |

If the actual `downy` or `emerald` values in `tailwind.config.js` ever change, update the constants at the top of the file — nothing else needs to change.

### 3. Logo header
Every email now opens with the Chamapay logo (`https://chamapay.xyz/images/logo.png`) centered above the content, at `height: 44px`. This was bumped up from an initial `28px` pass — it rendered too small/icon-like in Gmail. **If the logo still looks stretched or off once live**, it's because we're scaling by `height` only (`width: auto`); tell me the image's actual pixel dimensions and I'll pin a `width` or `max-width` instead.

### 4. Inline styles + table layout, no `<style>` blocks
This is intentional, not a style regression — Gmail, Outlook, and Apple Mail strip or mangle `<style>` blocks unpredictably, so every rule is inlined and the wrapper uses `<table role="presentation">` for layout. Don't "clean this up" into semantic `<div>`/CSS-class markup or it will break in Outlook.

### 5. Preheader text
Each `wrapEmail()` call now passes a short `preheader` string — the hidden text that shows up next to the subject line in inbox previews. Keep this whenever adding new email methods; it's a real deliverability/open-rate feature, not decoration.

## Checklist for the agent
- [ ] Copy `LOGO_URL`, `ACCENT`, `ACCENT_SOFT`, `SUCCESS`, `INK`, `MUTED`, `BORDER`, `SURFACE`, `wrapEmail()`, `heading()`, `paragraph()` into the real email service file (module scope, above the class).
- [ ] Replace the `html:` value in each of the five `resend.emails.send(...)` / batch payload calls with the corresponding block from `email-service.ts`.
- [ ] Keep all `from`, `subject`, error handling, and return values as they currently are in our codebase — only swap the HTML.
- [ ] If there are other transactional emails not covered here (e.g. welcome email, password reset if we add one later), use the same `wrapEmail()` pattern for consistency rather than one-off markup.
- [ ] Send a real test email through Resend (not just eyeball the HTML) before merging — table-based email HTML can render differently than expected even when it looks right in a browser preview.
