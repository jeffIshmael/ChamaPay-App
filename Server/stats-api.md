# ChamaPay Stats API

This document describes the backend endpoint the landing site needs to display real platform metrics on `/stats`.

The landing page currently serves mock data from `GET /api/stats`. Once the backend is ready, update `app/api/stats/route.ts` to proxy or fetch from the server endpoint below.

---

## Endpoint

### `GET /stats`

Returns aggregate, public platform metrics suitable for the marketing stats page.

| Property | Value |
|----------|-------|
| Method | `GET` |
| Auth | None (public read-only) |
| Content-Type | `application/json` |
| Suggested base URL | `https://api.chamapay.io` |

**Full URL (proposed):** `https://api.chamapay.io/stats`

---

## Response schema

All numeric fields should be non-negative numbers. Monetary USDC values are in **whole USDC units** (not cents). KES volume is in **whole KES units**.

```json
{
  "downloads": {
    "ios": 2847,
    "android": 4123,
    "total": 6970
  },
  "activeChamas": 186,
  "activeUsers": 3241,
  "usdcVolume": {
    "total": 1284650,
    "contributions": 742300,
    "payouts": 398200,
    "transfers": 144150
  },
  "transactions": {
    "total": 28940,
    "last30Days": 3218
  },
  "mpesa": {
    "deposits": 5842,
    "withdrawals": 3106,
    "volumeKes": 98450000
  },
  "updatedAt": "2026-06-22T16:30:00.000Z"
}
```

### Field definitions

| Field | Type | Description |
|-------|------|-------------|
| `downloads.ios` | `number` | Total App Store installs (or unique download events). |
| `downloads.android` | `number` | Total Google Play installs (or unique download events). |
| `downloads.total` | `number` | Sum of iOS + Android downloads. |
| `activeChamas` | `number` | Chamas with at least one contribution in the last 30 days. |
| `activeUsers` | `number` | Users with at least one app action in the last 30 days. |
| `usdcVolume.total` | `number` | All-time USDC moved through the platform. |
| `usdcVolume.contributions` | `number` | USDC contributed to chamas. |
| `usdcVolume.payouts` | `number` | USDC paid out to chama members. |
| `usdcVolume.transfers` | `number` | USDC sent between ChamaPay users. |
| `transactions.total` | `number` | All-time on-platform transaction count. |
| `transactions.last30Days` | `number` | Transactions in the rolling last 30 days. |
| `mpesa.deposits` | `number` | Count of M-Pesa deposit events. |
| `mpesa.withdrawals` | `number` | Count of M-Pesa withdrawal events. |
| `mpesa.volumeKes` | `number` | Total KES volume processed via M-Pesa (deposits + withdrawals). |
| `updatedAt` | `string` | ISO 8601 timestamp of when stats were last computed. |

---

## Example request

```http
GET /stats HTTP/1.1
Host: api.chamapay.io
Accept: application/json
```

## Example success response

**Status:** `200 OK`

```json
{
  "downloads": {
    "ios": 2847,
    "android": 4123,
    "total": 6970
  },
  "activeChamas": 186,
  "activeUsers": 3241,
  "usdcVolume": {
    "total": 1284650,
    "contributions": 742300,
    "payouts": 398200,
    "transfers": 144150
  },
  "transactions": {
    "total": 28940,
    "last30Days": 3218
  },
  "mpesa": {
    "deposits": 5842,
    "withdrawals": 3106,
    "volumeKes": 98450000
  },
  "updatedAt": "2026-06-22T16:30:00.000Z"
}
```

## Error responses

| Status | When |
|--------|------|
| `500` | Stats service unavailable or aggregation failed |
| `503` | Temporary maintenance |

Error body (recommended):

```json
{
  "error": "Stats temporarily unavailable"
}
```

---

## Operational notes

### Caching

Stats do not need to be real-time. Recommended:

- Compute on a schedule (e.g. every 5–15 minutes).
- Return `Cache-Control: public, max-age=60` or similar from the backend.
- The landing page proxy at `/api/stats` already caches for 60 seconds.

### CORS

If the frontend fetches the backend directly from the browser, allow:

- `https://chamapay.io`
- `https://www.chamapay.io`
- `http://localhost:3000` (local dev)

Alternatively, keep the backend private and have the Next.js route at `/api/stats` fetch server-side (no CORS needed).

### Environment variable (landing site)

When the endpoint is live, configure:

```env
CHAMAPAY_STATS_API_URL=https://api.chamapay.io/stats
```

The landing route handler can then replace mock data with:

```ts
const res = await fetch(process.env.CHAMAPAY_STATS_API_URL!, {
  next: { revalidate: 60 },
});
const stats = await res.json();
return NextResponse.json(stats);
```

---

## TypeScript type (landing site)

The landing site expects this shape (`lib/stats.ts`):

```ts
export type ChamapayStats = {
  downloads: {
    ios: number;
    android: number;
    total: number;
  };
  activeChamas: number;
  activeUsers: number;
  usdcVolume: {
    total: number;
    contributions: number;
    payouts: number;
    transfers: number;
  };
  transactions: {
    total: number;
    last30Days: number;
  };
  mpesa: {
    deposits: number;
    withdrawals: number;
    volumeKes: number;
  };
  updatedAt: string;
};
```

Any backend response matching this schema will work without frontend changes.
