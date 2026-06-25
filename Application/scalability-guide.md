# ChamaPay Scalability Guide — 100k+ Transactions

A practical roadmap to keep the app fast and reliable as transaction volume grows toward 100,000+ txs without degrading UX.

---

## 1. Database & indexing

**Current risk:** Full-table scans on transaction history, notifications, and chama lookups slow down as rows grow.

**Actions:**
- Add composite indexes for hot query patterns, e.g. `(userId, createdAt DESC)` on `Payment`, `PretiumTransaction`, and `Notification`.
- Index `PretiumTransaction.transactionCode`, `Chama.slug`, and `ChamaMember(chamaId, userId)`.
- Paginate every list endpoint (`cursor` or `offset + limit`); never return unbounded history to the mobile client.
- Archive cold data (>12 months) to a read-only `PaymentArchive` table or object storage; keep the live DB lean.

---

## 2. API layer

**Current risk:** Synchronous blockchain + Pretium calls inside HTTP request handlers block workers under load.

**Actions:**
- Move offramp/onramp status polling to the server (webhook-driven updates) instead of the client polling every 2s.
- Use a job queue (BullMQ + Redis, or Inngest) for: cron payouts, Pretium callbacks, Expo push notifications, and USDC transfers.
- Return `202 Accepted` + `transactionId` for long-running ops; let the client subscribe via push notification or a lightweight status endpoint.
- Add Redis caching for exchange rates, user profiles, and chama summaries (TTL 30–60s).

---

## 3. Mobile app performance

**Current risk:** Re-fetching balances and full transaction lists on every screen focus.

**Actions:**
- Use React Query / TanStack Query with `staleTime` and background refetch instead of ad-hoc `useEffect` fetches.
- Virtualize long transaction lists (`FlashList` from Shopify).
- Debounce user search (300ms) and cache recent search results in memory.
- Prefetch wallet balance only on wallet tab focus, not globally on app launch.
- Keep images (wallet logos, avatars) sized and cached; use `expo-image` with disk cache.

---

## 4. Blockchain & wallet operations

**Current risk:** Per-request private-key decryption and direct RPC calls don't scale.

**Actions:**
- Batch Pimlico / smart-account operations where the protocol allows.
- Use a dedicated RPC provider with rate-limit headroom (Alchemy, Infura, or a Base-specific node).
- Never block the HTTP response on `transferTx` confirmation — enqueue and confirm asynchronously.
- Monitor nonce gaps and failed UserOps; add retry with exponential backoff.

---

## 5. Pretium / offramp integration

**Current risk:** Client-side polling × concurrent withdrawals = unnecessary API load.

**Actions:**
- Rely on `pretiumOfframpCallback` as the source of truth; expose `GET /pretium/status/:code` backed by DB, not live Pretium API on every poll.
- Idempotency keys on offramp initiation to prevent duplicate USDC sends on double-tap.
- Rate-limit offramp per user (e.g. 5/hour) at the API gateway.

---

## 6. Notifications

**Current risk:** `notifyAllChamaMembers` loops sequentially; Expo push is fire-and-forget without batching.

**Actions:**
- Batch Expo push via `expo-server-sdk` chunk API (100 tokens per request).
- Store dedup keys (already started for 3-day reminders) for all recurring cron notifications.
- Move notification writes to a queue; one DB `createMany` per chama instead of N sequential inserts.

---

## 7. Cron & background jobs

**Actions:**
- Run payout cron with row-level locking (`SELECT … FOR UPDATE SKIP LOCKED`) so overlapping runs don't double-pay.
- Split `checkStartDate` and `checkPaydate` into isolated workers with per-chama error isolation (partially done).
- Log job duration and failure rate; alert if payout job exceeds cycle time.

---

## 8. Observability

**Actions:**
- Structured logging (JSON) with `transactionCode`, `userId`, `chamaId` on every financial operation.
- APM on API routes (Datadog, Sentry Performance, or OpenTelemetry).
- Dashboards: offramp success rate, avg completion time, cron failures, RPC error rate.
- Dead-letter queue for failed jobs with manual replay tooling.

---

## 9. Infrastructure

| Scale tier | Suggested setup |
|---|---|
| < 10k txs | Single Render/Fly instance + managed Postgres |
| 10k–50k txs | API autoscaling (2–4 instances) + Redis + connection pooling (PgBouncer) |
| 50k–100k+ txs | Read replica for history queries, job workers on separate service, CDN for static assets |

- Enable Postgres connection pooling; Prisma defaults can exhaust connections under load.
- Set `statement_timeout` and query timeouts on the API.
- Load-test offramp + payout flows with k6 before hitting 10k txs/month.

---

## 10. Quick wins (do first)

1. Paginate transaction history on server and client.
2. Stop client-side Pretium polling; poll DB status endpoint instead.
3. Add Redis cache for exchange rates and user search.
4. Queue Expo notifications and cron payouts.
5. Add composite DB indexes on `Payment` and `PretiumTransaction`.

These five changes alone typically handle 10× traffic without architectural rewrites.
