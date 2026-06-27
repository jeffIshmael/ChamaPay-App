# ChamaPay Landing Page — Stats API

Use your own server base URL (e.g. `https://chamapay-app.onrender.com`). All endpoints are public, read-only, and return JSON.

---

## Base URL

```
{YOUR_SERVER_URL}
```

Example: `https://chamapay-app.onrender.com`

---

## Endpoints

### `GET /stats`

Aggregate platform metrics for the marketing `/stats` page.

| Property | Value |
|----------|-------|
| Method | `GET` |
| Auth | None |
| Content-Type | `application/json` |
| Cache | `Cache-Control: public, max-age=60` |

**URL:** `{YOUR_SERVER_URL}/stats`

#### Success response — `200 OK`

```json
{
  "downloads": {
    "ios": 0,
    "android": 0,
    "total": 3241
  },
  "activeChamas": 186,
  "activeUsers": 892,
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

#### Error responses

| Status | Body |
|--------|------|
| `500` | `{ "error": "Stats temporarily unavailable" }` |

---

## Field definitions

| Field | Type | Source |
|-------|------|--------|
| `downloads.ios` | `number` | `STATS_IOS_DOWNLOADS` env var (optional) |
| `downloads.android` | `number` | `STATS_ANDROID_DOWNLOADS` env var (optional) |
| `downloads.total` | `number` | iOS + Android, or total registered users if env vars unset |
| `activeChamas` | `number` | Chamas with at least one contribution in the last 30 days |
| `activeUsers` | `number` | Users with a payment, payout, or M-Pesa tx in the last 30 days |
| `usdcVolume.contributions` | `number` | Sum of chama-linked `Payment` amounts (whole USDC) |
| `usdcVolume.payouts` | `number` | Sum of `PayOut` amounts |
| `usdcVolume.transfers` | `number` | Sum of peer `Payment` amounts (no chama) |
| `usdcVolume.total` | `number` | contributions + payouts + transfers |
| `transactions.total` | `number` | All-time payments + payouts + completed M-Pesa txs |
| `transactions.last30Days` | `number` | Same counts, rolling 30 days |
| `mpesa.deposits` | `number` | Completed on-ramp / deposit Pretium transactions |
| `mpesa.withdrawals` | `number` | Completed off-ramp / payment Pretium transactions |
| `mpesa.volumeKes` | `number` | Total KES volume from completed Pretium transactions |
| `updatedAt` | `string` | ISO 8601 timestamp when stats were computed |

---

## Landing site integration

### Environment variable

```env
CHAMAPAY_STATS_API_URL=https://your-server.onrender.com/stats
```

### Next.js route handler example

```ts
// app/api/stats/route.ts
import { NextResponse } from "next/server";

export async function GET() {
  const res = await fetch(process.env.CHAMAPAY_STATS_API_URL!, {
    next: { revalidate: 60 },
  });

  if (!res.ok) {
    return NextResponse.json(
      { error: "Stats temporarily unavailable" },
      { status: res.status }
    );
  }

  const stats = await res.json();
  return NextResponse.json(stats, {
    headers: { "Cache-Control": "public, max-age=60" },
  });
}
```

### TypeScript type

```ts
export type ChamapayStats = {
  downloads: { ios: number; android: number; total: number };
  activeChamas: number;
  activeUsers: number;
  usdcVolume: {
    total: number;
    contributions: number;
    payouts: number;
    transfers: number;
  };
  transactions: { total: number; last30Days: number };
  mpesa: { deposits: number; withdrawals: number; volumeKes: number };
  updatedAt: string;
};
```

### Direct fetch (browser)

```ts
const stats: ChamapayStats = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/stats`).then(
  (res) => res.json()
);
```

Ensure CORS on the server allows your landing domain if fetching from the browser.

---

## Optional server env vars

Set on Render (or `.env`) when you have real App Store / Play Store install counts:

```env
STATS_IOS_DOWNLOADS=2847
STATS_ANDROID_DOWNLOADS=4123
```

If unset, `downloads.total` falls back to total registered users and iOS/Android return `0`.
