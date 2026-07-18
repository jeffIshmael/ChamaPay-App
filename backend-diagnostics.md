# Backend Performance Diagnostic Answers

Here are the answers to the diagnostic questionnaire based on an analysis of the `Server` codebase.

---

## 1. Hosting & Deployment (Render)

**1.1. What Render plan/instance type is this service on (Free, Starter, Standard, etc.)?**
N/A. This is not visible in the codebase, as it's configured directly via the Render Dashboard.

**1.2. What region is the Render service deployed in?**
N/A. This is also configured in the Render Dashboard and not specified in the codebase.

**1.3. Is there a `render.yaml` or dashboard config showing auto-scaling, health checks, or instance count?**
No `render.yaml` file exists in the repository. The configuration is likely managed entirely through the Render web UI.

**1.4. Are there any build/start scripts that do heavy work on every boot (e.g., re-seeding data, rebuilding assets)?**
No. The scripts in `package.json` are standard:
`"build": "tsc && mkdir -p dist/Blockchain && cp Blockchain/chamaPay.json dist/Blockchain/chamaPay.json..."`
`"start": "node dist/index.js"`
It does not perform data seeding on boot in the production `start` script.

---

## 2. Database

**2.1. What database(s) are used (Postgres, MongoDB, MySQL, etc.), and where are they hosted?**
PostgreSQL is used. This is indicated by `provider = "postgresql"` in `prisma/schema.prisma`. The hosting location is defined by the `DATABASE_URL` environment variable.

**2.2. Is the database in the same region as the Render service?**
N/A. This cannot be determined from the code. It depends on where the database is provisioned.

**2.3. How is the database connection established?**
A connection pool is managed by Prisma Client. In `Server/Lib/prismaFunctions.ts`, the connection is established simply via `const prisma = new PrismaClient();`.

**2.4. What is the configured pool size (min/max connections)?**
There is no explicit connection limit configured in `.env.example` or the Prisma instantiation. It relies on Prisma's default pool sizing formula.

**2.5. List all indexes currently defined on the main tables/collections used in hot-path endpoints.**
From `schema.prisma`:
- `Chama`: `@@index([payDate])`, `@@index([status, payDate])`
- `ChamaMember`: `@@index([chamaId, userId])`
- `Payment`: `@@index([userId, doneAt(sort: Desc)])`
- `Notification`: `@@index([userId, createdAt(sort: Desc)])`, `@@index([chamaId, type])`
- `PayOut`: `@@index([userId, doneAt(sort: Desc)])`
- `PretiumTransaction`: Multiple indexes on `userId`, `transactionCode`, `status`, `type`, `createdAt`, `[userId, createdAt(sort: Desc)]`.

**2.6. For the 3-5 most frequently called endpoints, list the exact queries they run. Are any of them missing a WHERE clause index, doing a full table scan, or sorting on an unindexed column?**
The most potentially heavy query is in `getChamaBySlug` (`Server/Controllers/chamaControllers.ts`). It queries by `slug` (which has a `@unique` index), but it includes a massive amount of nested relations without pagination:
```typescript
const chama = await prisma.chama.findUnique({
  where: { slug: slug },
  include: {
    members: { include: { user: { select: { ... } } } },
    payments: { include: { user: { select: { ... } } }, orderBy: { doneAt: "desc" } },
    messages: { include: { sender: { select: { ... } } } },
    admin: { select: { ... } },
    payOuts: { include: { user: { select: { ... } } } }
  },
});
```
This query fetches almost all associated records for a chama on every call. If a chama has many messages or payments, this will be very slow and memory-intensive.

**2.7. Are there any endpoints making multiple sequential DB queries that could be combined into one query or run in parallel with `Promise.all`?**
Yes. In `getChamaBySlug`, there are sequential queries and network calls:
```typescript
const user = await prisma.user.findUnique({ ... });
const chama = await prisma.chama.findUnique({ ... });
const userBalance = await getUserChamaBalance(...);
const eachMemberBalance = await getEachMemberBalance(...);
```
These are awaited sequentially but could largely be parallelized using `Promise.all` since they don't depend on each other sequentially (aside from needing the user/chama basic info for the blockchain calls).

**2.8. Are there any loops that call the database once per iteration (classic N+1 pattern)? List the file/function.**
In `Server/Lib/prismaFunctions.ts`, `notifyAllChamaMembers` does the right thing by using `createMany` instead of looping and calling `.create()` sequentially. However, deep `include` queries in Prisma (like in `getChamaBySlug`) often result in Prisma executing multiple sequential `SELECT ... IN (...)` queries under the hood to resolve relations, simulating an N+1 delay at the database driver level.

**2.9. Is there any ORM? If so, is query logging enabled anywhere to see generated SQL?**
Prisma is used. However, query logging is **not** enabled. The client is initialized as `new PrismaClient()` without the `log: ['query']` parameter.

---

## 3. API Route / Controller Logic

**3.1. For the top 5 slowest or most-used endpoints, paste the full route handler code.**
The `getChamaBySlug` endpoint is a prime candidate for being the slowest due to heavy DB fetches and sequential RPC calls.
```typescript
// Server/Controllers/chamaControllers.ts (lines 147-247)
export const getChamaBySlug = async (req: Request, res: Response) => {
  try {
    const { slug } = req.params;
    const userId = req.user?.userId;
    // ... basic checks ...
    const user = await prisma.user.findUnique({ where: { id: Number(userId) } });
    
    // HEAVY QUERY: Fetches all members, payments, messages, payouts
    const chama = await prisma.chama.findUnique({
      where: { slug: slug },
      include: { members: { ... }, payments: { ... }, messages: { ... }, payOuts: { ... } }
    });

    // SYNCHRONOUS BLOCKCHAIN CALLS
    const userBalance = await getUserChamaBalance(user.smartAddress, BigInt(Number(chama.blockchainId)));
    const eachMemberBalance = await getEachMemberBalance(BigInt(Number(chama.blockchainId)));

    // SYNCHRONOUS HEAVY COMPUTATION
    const finalChama = {
      ...chama,
      userBalance: JSON.parse(JSON.stringify(userBalance, bigIntReplacer)),
      eachMemberBalance: JSON.parse(JSON.stringify(eachMemberBalance, bigIntReplacer)),
    };

    return res.status(200).json({ success: true, chama: finalChama });
  } catch (error) { ... }
};
```

**3.2. Do any handlers call external third-party APIs (payment, email, maps, auth providers, etc.) synchronously in the request path?**
Yes, prominently. Blockchain RPC calls via viem/ethers are made synchronously during request execution:
- `getUserChamaBalance`
- `getEachMemberBalance`
- `bcGetTotalChamas`
- `bcCreateChama`
These calls block the API response until the blockchain node responds or the transaction is mined/simulated.

**3.3. Is there any heavy synchronous computation happening in a request handler?**
Yes. In `getChamaBySlug`, big integers are handled via `JSON.parse(JSON.stringify(..., bigIntReplacer))`. Stringifying and re-parsing a potentially large JSON object (containing all members, messages, and payments) is a CPU-intensive, synchronous operation that will block the Node.js event loop.

**3.4. Are any endpoints doing file I/O (reading/writing to disk) synchronously?**
No obvious synchronous file I/O (`fs.readFileSync`) is happening in the hot paths.

**3.5. Is body-parsing middleware configured with reasonable size limits?**
`express.json()` is used without explicit size limits, meaning it defaults to `100kb`. This is reasonable and likely not causing issues.

---

## 4. Caching

**4.1. Is there any caching layer in place?**
There is a basic in-memory map cache implemented in `Server/Lib/cache.ts`. It is used for the `searchUsers` endpoint in `userController.ts`, but **not** for heavy endpoints like `getChamaBySlug`.

**4.2. Which endpoints return data that rarely changes but is NOT cached?**
`getChamaBySlug` returns chama details that might not change every few seconds, yet it performs heavy DB queries and blockchain RPC reads on every single request.

**4.3. Are static assets cached with appropriate headers?**
N/A. The backend serves an API, not static web assets.

---

## 5. Middleware & Request Pipeline

**5.1. List all global middleware in the order they run.**
1. `express.json(...)` (with rawBody parser)
2. `cors()`
(from `Server/app.ts`)

**5.2. Is `compression` (gzip/brotli) middleware enabled?**
No. The `compression` package is not in `package.json` and not configured in `app.ts`.

**5.3. Is there any middleware doing a DB or network call on every single request?**
No. The `authMiddleware.ts` relies solely on `jwt.verify()`, which is a stateless check.

**5.4. Is logging synchronous or writing to disk/console in a way that could block?**
Basic `console.log` and `console.error` are used extensively throughout the codebase. In production, heavy use of `console.log` can add minor overhead, but it's not writing to disk directly via a heavy logging library.

---

## 6. External APIs / Third-Party Services

**6.1. List every external API this backend calls.**
- Coinbase CDP SDK / Blockchain RPCs (viem/ethers)
- Expo Push Notifications
- Alchemy Webhooks
- Pinata (IPFS)
- Resend / Nodemailer (Emails)

**6.2. For each, is there a timeout configured?**
There are no explicit timeouts configured in the custom helper functions wrapping these calls. They rely on the default timeouts of `axios` or `viem`.

**6.3. Are any of these calls made sequentially when they could be parallelized?**
Yes. Blockchain reads in `getChamaBySlug` (`getUserChamaBalance` and `getEachMemberBalance`) are awaited sequentially.

**6.4. Are responses from external APIs cached where appropriate?**
No. Blockchain reads (which can be slow depending on RPC health) are not cached.

---

## 7. Mobile App → Backend Communication

**7.1. How many separate API calls does the mobile app make to load its main/home screen?**
Likely makes calls to `getUserDetails` and `getChamasUserIsMemberOf`. If the user taps a chama, it calls `getChamaBySlug`.

**7.2. Are any of those calls made sequentially when they could run in parallel?**
If the app fetches user details and chama lists sequentially on boot, it could slow down the initial load.

**7.3. What is the average response payload size (in KB)?**
The `getChamaBySlug` endpoint will have an unbounded response payload size as the `messages` and `payments` arrays grow over time, since there is no pagination or limits applied to those `include` queries.

**7.4. Does the app fetch more data than it displays?**
Yes. `getChamaBySlug` fetches every single message and payment related to the chama, even if the user is just looking at the summary screen.

**7.5. Is there a way to combine multiple endpoint calls into a single "batched" endpoint?**
GraphQL could be used, or a custom summary endpoint that only fetches the latest 5 messages/payments instead of all of them.

---

## 8. Node.js Runtime & Code-Level Issues

**8.1. What Node.js version is specified in `package.json` / Render settings?**
`@types/node: ^24.1.0` suggests development targeting modern Node versions (Node 20+).

**8.2. Are there any `async` functions missing `await` in ways that cause unhandled floating promises?**
Expo push notifications are awaited properly inside controller logic. However, if any fail, they might reject and cause error logs, but no immediate unhandled promise exceptions stand out.

**8.3. Is the event loop ever blocked by CPU-heavy synchronous work?**
Yes. The `JSON.parse(JSON.stringify(..., bigIntReplacer))` operation in `getChamaBySlug` is a CPU-intensive, synchronous operation. When applied to a deeply nested object with hundreds of members, messages, and payments, it will block the event loop, increasing TTFB (Time to First Byte) for all concurrent requests.

**8.4. Are there memory leaks suspected?**
There is a potential memory leak in `Server/Lib/cache.ts`. It uses a generic `Map<string, CacheEntry>`. Expired keys are only deleted when they are accessed again (`getCached`). If a cache key is generated dynamically (like search queries in `searchUsers`) and never accessed again, the map will grow indefinitely until the server crashes with an Out Of Memory (OOM) error.

---

## 9. Monitoring / Evidence

**9.1. Paste any existing timing/logging data showing which endpoints are slow.**
N/A. There is no APM or timing logging currently active in the codebase.

**9.2. If no logging exists yet, note that — this is the highest priority gap to fix first.**
Noted. Implementing a middleware to log request durations (e.g., `morgan` or custom timing logic) is critical.

**9.3. What does a `curl -w "@curl-format.txt"` show?**
N/A currently.

---

## 10. Quick Config Checks

**10.1. Paste the full `package.json` dependencies list.**
```json
  "dependencies": {
    "@coinbase/cdp-sdk": "^1.51.2",
    "@mento-protocol/mento-sdk": "^1.14.0",
    "@noble/ciphers": "^1.3.0",
    "@noble/hashes": "^1.8.0",
    "@prisma/client": "^6.12.0",
    "axios": "^1.13.2",
    "bcryptjs": "^3.0.2",
    "cors": "^2.8.5",
    "decimal.js-light": "^2.5.1",
    "dotenv": "^17.2.1",
    "ethers": "^6.16.0",
    "expo-server-sdk": "^4.0.0",
    "express": "^4.21.2",
    "google-auth-library": "^10.2.0",
    "jsbi": "^4.3.2",
    "jsonwebtoken": "^9.0.2",
    "moment": "^2.30.1",
    "multer": "^2.0.2",
    "nodemailer": "^7.0.5",
    "nodemon": "^3.1.10",
    "ox": "^0.14.15",
    "permissionless": "^0.2.53",
    "resend": "^6.8.0",
    "socket.io": "^4.8.1",
    "thirdweb": "^5.108.3",
    "toformat": "^2.0.0",
    "viem": "^2.47.12"
  }
```

**10.2. Is `NODE_ENV=production` actually set on Render?**
Unknown, but standard for Render deployments. Ensure it is set to avoid extra dev-mode overhead in Express and other libraries.

**10.3. Are there any `console.log` statements left in hot paths that could be adding overhead in production?**
Yes. `chamaControllers.ts` and `userController.ts` are littered with `console.log`s (e.g., `console.log("the chama data", chamaData);`). While not completely disastrous, logging large nested objects synchronously to standard output in Node.js can block the event loop in high-throughput environments.
