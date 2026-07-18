# Performance Fix Plan

Based on the diagnostic answers, the app's slowness is almost entirely explained by **one endpoint's design pattern** (`getChamaBySlug`) plus a few smaller systemic gaps. Nothing here requires a rewrite — these are targeted fixes, ordered by impact.

---

## Priority 1 — Fix `getChamaBySlug` (the biggest single cause)

This one function likely explains most of the "slow fetching" the app is experiencing. It has four compounding problems stacked on top of each other:

### 1a. Unbounded nested `include` queries
It fetches **every** member, message, and payment for a chama, with no limit. As a chama accumulates history, this endpoint gets linearly slower and eventually falls over.

**Fix:** Split it into two responses.
- The main `getChamaBySlug` call should only return chama metadata + members + a small recent slice of messages/payments (e.g., last 10-20), using `take` and `orderBy`:
```typescript
messages: {
  include: { sender: { select: { ... } } },
  orderBy: { createdAt: "desc" },
  take: 20,
},
payments: {
  include: { user: { select: { ... } } },
  orderBy: { doneAt: "desc" },
  take: 20,
},
```
- Add separate paginated endpoints: `GET /chama/:slug/messages?cursor=...` and `GET /chama/:slug/payments?cursor=...` for when the user actually scrolls into history. The app should only call these when the user navigates to those views, not on initial load.

### 1b. Sequential blockchain RPC calls
`getUserChamaBalance` and `getEachMemberBalance` are awaited one after another. They don't depend on each other.

**Fix:**
```typescript
const [userBalance, eachMemberBalance] = await Promise.all([
  getUserChamaBalance(user.smartAddress, BigInt(Number(chama.blockchainId))),
  getEachMemberBalance(BigInt(Number(chama.blockchainId))),
]);
```
Also parallelize the initial `user` and `chama` lookups if neither depends on the other's result:
```typescript
const [user, chama] = await Promise.all([
  prisma.user.findUnique({ where: { id: Number(userId) } }),
  prisma.chama.findUnique({ where: { slug }, include: { ... } }),
]);
```

### 1c. Blocking `JSON.parse(JSON.stringify(...))` on a large object
This is a synchronous, CPU-bound operation that blocks the entire event loop — meaning it doesn't just slow down this one request, it slows down **every concurrent request** the server is handling while it runs.

**Fix:** Since you only need this to serialize BigInts, don't round-trip the whole object through `JSON.stringify`/`parse`. Write a small recursive replacer that only touches BigInt fields, or use a library like `json-bigint`. At minimum, only apply it to `userBalance` and `eachMemberBalance` (which are small), not to the full `chama` object:
```typescript
const finalChama = {
  ...chama,
  userBalance: serializeBigInts(userBalance),
  eachMemberBalance: serializeBigInts(eachMemberBalance),
};
```
This alone removes the biggest event-loop-blocking operation in the codebase.

### 1d. No caching on blockchain reads
Blockchain RPC calls are slow by nature and this data doesn't need to be real-time on every request.

**Fix:** Cache `userBalance` and `eachMemberBalance` for 10-30 seconds (in-memory or Redis, see Priority 3). Even a short TTL will cut RPC calls dramatically for chamas with frequent views.

---

## Priority 2 — Add request timing/logging (do this first, actually)

You currently have **no visibility** into which endpoints are slow or by how much. Before/while making the above changes, add this so you can measure the before/after and catch anything else:

```typescript
// simple middleware, add near the top of app.ts
app.use((req, res, next) => {
  const start = Date.now();
  res.on("finish", () => {
    const ms = Date.now() - start;
    console.log(`${req.method} ${req.originalUrl} - ${res.statusCode} - ${ms}ms`);
  });
  next();
});
```
Or use `morgan` with a custom format. This costs nothing to add and will confirm whether the fixes above are actually working, and surface any other slow endpoints not covered in the diagnostic.

---

## Priority 3 — Add compression middleware

Zero `compression` package currently in use. This is a 2-line fix with a real payload-size win, especially for the chama endpoint's JSON responses:

```bash
npm install compression
```
```typescript
import compression from "compression";
app.use(compression());
```

---

## Priority 4 — Fix the in-memory cache leak

`Server/Lib/cache.ts` only evicts expired entries on access, so keys that are never re-accessed (like one-off search queries) accumulate forever and can OOM-crash the server over time.

**Fix:** Add a periodic sweep:
```typescript
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of cache.entries()) {
    if (entry.expiresAt < now) cache.delete(key);
  }
}, 60_000); // every 60s
```
Or switch to a proper LRU cache library (e.g., `lru-cache`) with a max size cap, which solves both the leak and gives you eviction for free.

---

## Priority 5 — Move toward Redis for caching (medium-term)

Once you have more than one server instance (or want cache to survive restarts/deploys), in-memory caching won't be enough since each instance has its own separate cache. Render offers managed Redis. Use it for:
- Blockchain balance reads (short TTL, e.g. 15-30s)
- `searchUsers` results
- Any other frequently-read, infrequently-changed data

This isn't urgent today but will matter as soon as you scale past one instance.

---

## Priority 6 — Timeouts on external calls

None of your blockchain/RPC/third-party calls have explicit timeouts, so a slow or unresponsive RPC node can hang a request indefinitely (and tie up server resources while it does).

**Fix:** Set explicit timeouts on `axios` calls and RPC client configs (viem/ethers both support custom transport timeouts). A sensible default is 5-10 seconds — fail fast and return an error rather than hanging.

---

## Priority 7 — Clean up `console.log` in hot paths

Not a major cost individually, but `console.log` of large nested objects (e.g., `console.log("the chama data", chamaData)`) in a high-throughput handler adds unnecessary serialization overhead on every call. Strip these from `chamaControllers.ts` and `userController.ts`, or gate them behind a `DEBUG` env flag so they're off in production.

---

## Priority 8 — Mobile app request pattern

Once the backend fixes land, check the app itself:
- If `getUserDetails` and `getChamasUserIsMemberOf` are called sequentially on boot, fire them in parallel instead (`Promise.all` equivalent on the client, e.g. `Promise.all([fetch(...), fetch(...)])`).
- Consider a single "home screen" endpoint that returns user + chama summary list in one round trip, since mobile networks add latency per request that doesn't exist on wifi/desktop.

---

## Suggested order of execution

1. Add request timing logging (30 min, zero risk, gives you before/after numbers)
2. Fix `getChamaBySlug`: pagination, `Promise.all`, and the BigInt serialization fix (highest impact)
3. Add `compression` middleware (5 min)
4. Fix the cache eviction leak (15 min)
5. Add timeouts to external calls
6. Clean up hot-path logging
7. Parallelize app-side boot requests
8. Redis, once you're scaling past one instance

Steps 1-4 alone should produce a dramatic, measurable improvement, since they directly target the event-loop-blocking operation and the unbounded query that are almost certainly responsible for the "slow even in fetching" symptom you're seeing.
