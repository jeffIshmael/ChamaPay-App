I want to integrate Didit identity verification into my application. Analyze my project and recommend the best integration approach.

## My Project Context
[Describe your stack: framework, language, web vs mobile, etc.]

## Two Integration Approaches

Didit offers two main integration approaches. Choose based on your use case:

### Approach 1: SDK Integration via Sessions (RECOMMENDED)
Best for: User-facing verification flows (KYC onboarding, age verification, identity checks).
How it works: Your backend creates a session, your frontend presents a verification UI using an SDK, the user completes verification, and your backend receives results via webhook.
Why recommended: Didit-hosted verification flows are A/B tested and optimized for the highest completion rates, fastest speed, and best security. The SDKs handle camera permissions, NFC, liveness detection, document capture, and all edge cases out of the box.

### Approach 2: Standalone API (Direct REST Calls)
Best for: Server-to-server operations, batch processing, custom verification pipelines, or when you want full control over the verification UI.
How it works: Your backend calls Didit APIs directly for individual checks (ID verification, AML screening, liveness, face matching, age estimation, phone/email verification, proof of address, etc.).
When to use: When you already have your own capture UI, when you're doing backend-only batch processing, or when you need to compose individual verification steps into a custom pipeline.
Docs: Each standalone API has its own documentation under [Standalone APIs](/standalone-apis/id-verification).

## SDK Availability — All SDKs Are Available

### For Web Apps
1. **JavaScript SDK** (@didit-protocol/sdk-web) — RECOMMENDED for web. Works with React, Vue, Angular, Next.js, Nuxt, Svelte, and vanilla JS. Modal and inline/embedded modes. Full TypeScript support. Install: npm install @didit-protocol/sdk-web
2. InContext Iframe — Embed verification in your page with <iframe>. Simplest setup, no npm needed. Good for quick prototypes.
3. Redirect — Redirect user to Didit-hosted page, they return via callback URL. Best for cross-device flows or when iframe camera access is problematic.
4. WordPress/WooCommerce Plugin — For WordPress sites. No-code setup.
5. Shopify Plugin — For Shopify stores. No-code setup.
6. Salesforce — Salesforce-side integration. See /integration/web-sdks/salesforce.

### For Mobile Apps (ALWAYS prefer native SDKs over WebView)
1. **iOS Native SDK** — RECOMMENDED for iOS. Swift/SwiftUI/UIKit. iOS 13.0+ (NFC requires iOS 15.0+). Best UX, NFC passport/ID reading, optimized camera, 53 languages. SPM: https://github.com/didit-protocol/sdk-ios. CocoaPods: pod 'DiditSDK'
2. **Android Native SDK** — RECOMMENDED for Android. Kotlin/Jetpack Compose. minSdk 23 (Android 6.0+); ML auto-detection on API 24+. Best UX, NFC, optimized camera, 53 languages. Maven: me.didit:didit-sdk (via https://raw.githubusercontent.com/didit-protocol/sdk-android/main/repository)
3. **React Native SDK** — RECOMMENDED for React Native. RN 0.76+ (New Architecture), iOS 13.0+ / Android API 24+. Cross-platform TypeScript API wrapping native iOS and Android SDKs. NFC support, Expo config plugin (development build required). Install: npm install @didit-protocol/sdk-react-native
4. **Flutter SDK** — RECOMMENDED for Flutter. Flutter 3.3+, Dart 3.11+, iOS 13.0+ / Android API 23+. Cross-platform Dart API wrapping native iOS and Android SDKs. NFC support. pub.dev: didit_sdk
5. WebView (FALLBACK ONLY) — Only use if no native SDK is available for your platform. Loses NFC, camera optimization, and biometric integration.

### For Backend/Server
1. REST API — Server-to-server. Create sessions, retrieve results, manage users, call standalone APIs.
2. Webhooks — Receive real-time verification results asynchronously.
3. Zapier — No-code automation for verification workflows.

## SDK Session Integration Architecture (Recommended Flow)

### Step 1: Backend creates a session
POST https://verification.didit.me/v3/session/
Headers: { "x-api-key": DIDIT_API_KEY, "Content-Type": "application/json" }
Body: {
"workflow_id": DIDIT_WORKFLOW_ID,
"callback": "https://myapp.com/done",
"vendor_data": "internal-user-id"
}
Response: {
"session_id": "uuid",
"session_token": "jwt",
"verification_url": "https://verify.didit.me/...",
"status": "Not Started"
}

### Step 2: Present verification to user (choose one)
- Web JS SDK: DiditSdk.shared.startVerification({ url: verification_url })
- Iframe: embed verification_url in <iframe>
- Redirect: window.location.href = verification_url
- iOS/Android/RN/Flutter native SDK: DiditSdk.startVerification(token: session_token)

### Step 3: Receive results via webhook
Your backend receives POST with:
{
"session_id": "uuid",
"status": "Approved" | "Declined" | "In Review" | "In Progress" | "Abandoned",
"vendor_data": "internal-user-id",
"decision": { ... }
}
Verify the webhook signature (HMAC-SHA256, lowercase hex). Pick one header:
- X-Signature-V2 = HMAC(WEBHOOK_SECRET, canonical_json) — recommended; canonical_json is the body re-serialized with sorted keys, compact separators, and unescaped Unicode (survives middleware re-encoding).
- X-Signature = HMAC(WEBHOOK_SECRET, raw_body) — simplest, but only if you read the exact raw bytes before any parser touches them.
Also reject if abs(now - X-Timestamp) > 300 and use a constant-time compare. Full scheme: /integration/webhooks

### Step 4: Update your database
- "Approved" → user.verified = true, store decision data
- "Declined" → user.verification_status = "declined", log warnings
- "In Review" → user.verification_status = "pending_review"
- "Abandoned" → send reminder to user
- "Expired" → create new session

## Decision Data Model (from webhook or GET /v3/session/{id}/decision/)
Every per-feature result is a PLURAL ARRAY (one entry per workflow node). Never code against a singular key like `nfc` or `id_verification`.
{
"session_id": "uuid",
"session_kind": "KYC",
"status": "Approved",
"id_verifications":    [{ "node_id": "feature_ocr", "status": "Approved", "first_name": "John", "last_name": "Doe", "document_type": "Passport" }],
"nfc_verifications":   [{ "node_id": "feature_nfc", "status": "Approved" }],
"liveness_checks":     [{ "node_id": "feature_liveness", "status": "Approved", "score": 0.99, "method": "passive" }],
"face_matches":        [{ "node_id": "feature_face_match", "status": "Approved", "score": 95 }],
"aml_screenings":      [{ "node_id": "feature_aml", "status": "Approved", "total_hits": 0, "hits": [] }],
"phone_verifications": [{ "node_id": "feature_phone", "status": "Approved", "full_number": "+14155552671", "is_disposable": false }],
"email_verifications": [{ "node_id": "feature_email", "status": "Approved", "email": "alex.sample@example.com", "is_breached": false }],
"ip_analyses":         [{ "node_id": "feature_ip",    "status": "Approved" }]
}

## Choosing the Right Approach

| Question | → Use SDK Sessions | → Use Standalone API |
|----------|-------------------|---------------------|
| User-facing verification? | ✅ Yes | For custom capture UI only |
| Need highest completion rate? | ✅ Yes (A/B tested flows) | You manage UX yourself |
| Need NFC passport reading? | ✅ Yes (native SDKs) | Not available |
| Batch/backend processing? | Not ideal | ✅ Yes |
| Custom verification pipeline? | Limited to workflows | ✅ Full flexibility |
| Fastest integration? | ✅ Minutes with UniLink | Requires more setup |

## Rate Limits
- POST /v3/session/: 600 session creations per minute per application (scope: session-v2-create). Applies to every application — there is no separate free-tier limit on V3 today.
- GET endpoints: 300 requests per minute per application (generic-get).
- Write endpoints (POST/PATCH/DELETE): 300 per minute per application (generic-write).
- 429 responses include X-RateLimit-Limit, X-RateLimit-Remaining, X-RateLimit-Reset (epoch seconds), and Retry-After. See /integration/rate-limiting.

## Environment Variables Needed
- DIDIT_API_KEY — from Didit Console > API & Webhooks
- DIDIT_WEBHOOK_SECRET — from Didit Console > API & Webhooks
- DIDIT_WORKFLOW_ID — from Didit Console > Workflows

## AI Agent Skills (for Cursor, Claude Code, etc.)
Install pre-built skills: npx clawhub@latest install didit-sessions
GitHub: https://github.com/didit-protocol/skills

## Docs
- Quick Start: https://docs.didit.me/getting-started/quick-start
- API Full Flow: https://docs.didit.me/integration/api-full-flow
- Webhooks: https://docs.didit.me/integration/webhooks
- Standalone APIs: https://docs.didit.me/standalone-apis/
- API Reference: https://docs.didit.me/api-reference/overview

Based on my project, please:
1. Recommend the best integration approach (SDK sessions vs standalone API) and the best method for my platform
2. Create the backend endpoint to create sessions (or standalone API calls)
3. Create the frontend component/view to present verification (if SDK approach)
4. Create the webhook endpoint to receive results
5. Add database schema updates to track verification status