# Backend Performance Diagnostic Questionnaire

Instructions for the AI agent: Go through this codebase and answer each question as specifically as possible. Include file names, line numbers, actual code snippets, and config values where relevant. If a question doesn't apply (e.g., no database), say "N/A" and briefly explain why.

---

## 1. Hosting & Deployment (Render)

1.1. What Render plan/instance type is this service on (Free, Starter, Standard, etc.)?

1.2. What region is the Render service deployed in?

1.3. Is there a `render.yaml` or dashboard config showing auto-scaling, health checks, or instance count?

1.4. Are there any build/start scripts that do heavy work on every boot (e.g., re-seeding data, rebuilding assets)?

---

## 2. Database

2.1. What database(s) are used (Postgres, MongoDB, MySQL, etc.), and where are they hosted?

2.2. Is the database in the same region as the Render service?

2.3. How is the database connection established — is a connection pool used (e.g., `pg.Pool`, `mongoose` default pooling), or is a new connection opened per request?

2.4. What is the configured pool size (min/max connections)?

2.5. List all indexes currently defined on the main tables/collections used in hot-path endpoints.

2.6. For the 3-5 most frequently called endpoints, list the exact queries they run. Are any of them missing a `WHERE` clause index, doing a full table scan, or sorting on an unindexed column?

2.7. Are there any endpoints making multiple sequential DB queries that could be combined into one query or run in parallel with `Promise.all`?

2.8. Are there any loops that call the database once per iteration (classic N+1 pattern)? List the file/function.

2.9. Is there any ORM (Prisma, Sequelize, Mongoose, TypeORM)? If so, is query logging enabled anywhere to see generated SQL? If yes, paste a sample of a slow generated query.

---

## 3. API Route / Controller Logic

3.1. For the top 5 slowest or most-used endpoints, paste the full route handler code.

3.2. Do any handlers call external third-party APIs (payment, email, maps, auth providers, etc.) synchronously in the request path? List them and note whether they're awaited before responding to the client.

3.3. Is there any heavy synchronous computation happening in a request handler (large loops, JSON.parse/stringify on big objects, image/file processing, crypto/hashing, regex on large strings)?

3.4. Are any endpoints doing file I/O (reading/writing to disk) synchronously (`fs.readFileSync`, etc.)?

3.5. Is body-parsing middleware configured with reasonable size limits, or could large payloads be slowing things down?

---

## 4. Caching

4.1. Is there any caching layer in place (Redis, in-memory cache, CDN, HTTP cache headers)?

4.2. Which endpoints return data that rarely changes but is NOT cached?

4.3. Are static assets (if any are served from this backend) cached with appropriate headers?

---

## 5. Middleware & Request Pipeline

5.1. List all global middleware in the order they run (e.g., CORS, logging, auth, body-parser, rate limiter).

5.2. Is `compression` (gzip/brotli) middleware enabled?

5.3. Is there any middleware doing a DB or network call on every single request (e.g., auth middleware that hits the DB to validate every token instead of using a stateless JWT check)?

5.4. Is logging synchronous or writing to disk/console in a way that could block (e.g., verbose `console.log` of large objects on every request)?

---

## 6. External APIs / Third-Party Services

6.1. List every external API this backend calls (payment processors, auth, maps, storage, AI APIs, etc.).

6.2. For each, is there a timeout configured? What happens if that service is slow — does it block the whole request?

6.3. Are any of these calls made sequentially when they could be parallelized?

6.4. Are responses from external APIs cached where appropriate (e.g., geocoding results, exchange rates)?

---

## 7. Mobile App → Backend Communication

7.1. How many separate API calls does the mobile app make to load its main/home screen?

7.2. Are any of those calls made sequentially (waiting for one to finish before starting the next) when they could run in parallel?

7.3. What is the average response payload size (in KB) for the main endpoints the app calls on load?

7.4. Does the app fetch more data than it displays (e.g., fetching a full list when only a summary is shown)?

7.5. Is there a way to combine multiple endpoint calls into a single "batched" endpoint for screens that currently make several requests?

---

## 8. Node.js Runtime & Code-Level Issues

8.1. What Node.js version is specified in `package.json` / Render settings?

8.2. Are there any `async` functions missing `await` in ways that cause unhandled floating promises or race conditions affecting response timing?

8.3. Is the event loop ever blocked by CPU-heavy synchronous work? (Search for large `for` loops, `JSON.parse` on big data, image manipulation libraries running in-process, bcrypt with high salt rounds, etc.)

8.4. Are there memory leaks suspected (e.g., growing arrays/caches that are never cleared)? Check Render's memory metrics over time if available.

---

## 9. Monitoring / Evidence

9.1. Paste any existing timing/logging data showing which endpoints are slow and by how much (e.g., response time logs, APM data, Render metrics screenshots described in text).

9.2. If no logging exists yet, note that — this is the highest priority gap to fix first.

9.3. What does a `curl -w "@curl-format.txt"` or Postman timing breakdown show for the slowest endpoint (DNS, connect, TLS, TTFB, download)?

---

## 10. Quick Config Checks

10.1. Paste the full `package.json` dependencies list (to check for outdated/heavy libraries).

10.2. Is `NODE_ENV=production` actually set on Render? (Some frameworks run in dev mode with extra overhead if not.)

10.3. Are there any `console.log` statements left in hot paths that could be adding overhead in production?
