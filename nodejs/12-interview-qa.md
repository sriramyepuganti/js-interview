# 12. Rapid-Fire Interview Q&A (Senior Node.js)

## Core Node / Event Loop

**1. Why is Node.js single-threaded, and how is it still scalable?**
Node runs your JS on one thread, but delegates I/O (disk, network) to the OS/libuv instead of blocking that thread. The thread only ever does actual computation, so it can juggle thousands of concurrent I/O-bound operations without needing a thread per connection.

**2. What are the event loop phases, in order?**
timers -> pending callbacks -> idle/prepare -> poll -> check -> close callbacks. `setTimeout`/`setInterval` run in timers, I/O callbacks in poll, `setImmediate` in check, and things like `socket.on('close')` in close callbacks.

**3. Does `process.nextTick` or a Promise `.then()` run first?**
`process.nextTick` always runs first — Node drains the nextTick queue completely, then the Promise microtask queue, before moving on to the next macrotask/phase.

**4. Predict the output:**
```js
console.log('A');
setTimeout(() => console.log('B'), 0);
Promise.resolve().then(() => console.log('C'));
process.nextTick(() => console.log('D'));
console.log('E');
```
Answer: `A E D C B` — sync code first (A, E), then nextTick (D), then Promise microtasks (C), then the timer macrotask (B).

**5. Predict the output (inside I/O):**
```js
const fs = require('fs');
fs.readFile(__filename, () => {
  setTimeout(() => console.log('timeout'), 0);
  setImmediate(() => console.log('immediate'));
});
```
Answer: `immediate` then `timeout`, guaranteed — inside an I/O callback, the check phase (setImmediate) always comes before the next timers phase.

**6. Predict the output (nextTick recursion risk):**
```js
let count = 0;
function tick() {
  if (count++ < 3) process.nextTick(tick);
  console.log('tick', count);
}
tick();
setTimeout(() => console.log('timeout fires last'), 0);
```
Answer: `tick 1, tick 2, tick 3, tick 4, timeout fires last` — all nextTick recursions fully drain before the event loop even reaches the timers phase.

**7. What blocks the event loop, and why is that dangerous?**
Any synchronous, CPU-heavy code (big loops, sync JSON.parse on huge payloads, sync crypto) blocks the single thread — every other pending request, timer, and I/O callback waits until it finishes. There's no thread scheduler to rescue other requests.

**8. What's the difference between `setImmediate` and `setTimeout(fn, 0)`?**
Both schedule "as soon as possible," but they run in different phases (check vs timers). At the top level their order isn't guaranteed; inside an I/O callback, `setImmediate` always wins.

---

## Modules

**9. What's the difference between CommonJS and ESM in Node?**
CommonJS uses `require`/`module.exports`, loads synchronously, and gives you `__dirname`/`__filename` automatically. ESM uses `import`/`export`, is part of the JS language standard, supports top-level await, and requires `import.meta.url` tricks to get directory paths.

**10. Can you `require()` an ESM module from CommonJS?**
Not synchronously — you'd need a dynamic `import()`, which returns a Promise, because ESM loading is inherently asynchronous.

**11. Why does `require()` caching matter?**
A module's top-level code runs once; subsequent `require()` calls return the same cached exports object. This means modules can behave like singletons — useful for shared connections, but a gotcha if you mutate exported objects.

---

## Async Patterns

**12. Why did async/await replace Promise chains as the preferred style?**
It lets you write async code using normal `try/catch`, loops, and conditionals — the same control flow developers already know — instead of chaining `.then()` calls, which get awkward with branching logic.

**13. What's wrong with this code?**
```js
const a = await fetchA();
const b = await fetchB();
```
It runs sequentially even though `fetchA` and `fetchB` don't depend on each other — wastes time. Fix: `const [a, b] = await Promise.all([fetchA(), fetchB()]);`

**14. When would you use EventEmitter instead of a Promise?**
When something can happen multiple times (not a single eventual result) or multiple independent listeners need to react to the same occurrence — e.g., streams' `data` event, or an internal pub/sub between modules.

**15. What does `util.promisify` do?**
Converts an error-first callback function into one that returns a Promise, so older callback-based APIs can be used with async/await.

---

## Streams / Buffers

**16. Why use streams instead of just reading a whole file into memory?**
Streams process data in chunks, keeping memory usage roughly constant regardless of total data size — critical for large files/network data that could otherwise exhaust memory.

**17. What is backpressure, and how does `.pipe()` handle it?**
Backpressure is when a fast data source overwhelms a slower destination's ability to consume it. `.pipe()` automatically pauses the source when the destination's internal buffer is full, and resumes it on the `drain` event.

**18. What's a Buffer, and why does Node need it separate from strings?**
A fixed-length chunk of raw bytes for binary data (files, network packets) — JS strings are text (UTF-16) and aren't a good fit for binary data. Buffer is built on top of JS's standard `Uint8Array`.

---

## Express / REST API Design

**19. What does Express add on top of the raw `http` module?**
Routing, middleware pipeline, built-in body parsing (`express.json()`), and conveniences that would otherwise require manually parsing URLs/bodies and dispatching by method/path yourself.

**20. What is middleware, exactly?**
A function `(req, res, next)` that can inspect/modify the request/response and either call `next()` to continue the pipeline or send a response to short-circuit it.

**21. How does Express's error-handling middleware work?**
A middleware with 4 parameters `(err, req, res, next)` — Express detects this signature and routes any error passed via `next(err)` from anywhere in the app to it, centralizing error response formatting.

**22. How would you design pagination for a large dataset?**
Prefer **cursor-based pagination** (e.g., "give me items after id/timestamp X, limit 20") over classic offset/limit for large datasets — offset pagination gets slower as the offset grows (the DB still has to scan/skip all prior rows) and can show duplicate/missing items if data changes between pages. Cursor pagination stays fast and stable regardless of dataset size.
```js
// cursor-based example
app.get('/items', async (req, res) => {
  const { cursor, limit = 20 } = req.query;
  const query = cursor ? { _id: { $gt: cursor } } : {};
  const items = await Item.find(query).sort({ _id: 1 }).limit(Number(limit));
  res.json({ items, nextCursor: items.length ? items[items.length - 1]._id : null });
});
```

**23. REST API versioning — how would you handle it?**
Commonly via URL path (`/api/v1/users`) for simplicity/visibility, or a custom header (`Accept-Version`) for a cleaner URL. Path versioning is more common in practice because it's obvious and cache-friendly.

**24. What's idempotency, and why does it matter for REST APIs?**
An idempotent operation produces the same result no matter how many times it's repeated (GET, PUT, DELETE should be idempotent; POST typically isn't). It matters for safe retries — if a client times out and retries a request, idempotent operations won't cause duplicate side effects (e.g., double-charging a payment).

---

## Security

**25. Sessions vs JWT — when would you pick each?**
Sessions for a traditional server-rendered app with one backend (simpler, easy to revoke). JWT for stateless REST APIs, mobile clients, or microservices where you don't want a shared session store across servers.

**26. Why is MD5/SHA-256 alone bad for password hashing?**
They're fast by design — great for checksums, terrible for passwords, since fast hashing lets attackers brute-force leaked hashes quickly. Use bcrypt/argon2, which are deliberately slow and handle salting.

**27. How do you prevent NoSQL injection in MongoDB queries?**
Validate/sanitize input types before querying (e.g., ensure a "password" field is actually a string, not an object like `{"$gt": ""}`), and use schema validation (Joi/Zod) at the API boundary rather than trusting raw `req.body`.

**28. What's the difference between XSS and CSRF?**
XSS injects malicious script into your page (e.g., via unescaped user content) so it runs in another user's browser. CSRF tricks a logged-in user's browser into sending an unwanted authenticated request to your site, relying on cookies being sent automatically.

**29. What do `httpOnly`, `secure`, and `sameSite` cookie flags do?**
`httpOnly` blocks JS from reading the cookie (mitigates XSS token theft), `secure` only sends it over HTTPS, and `sameSite` restricts the browser from sending it on cross-site requests (mitigates CSRF).

**30. What is CORS, actually protecting?**
It's a browser-enforced rule about which origins are allowed to *read* a cross-origin response via JS — it doesn't protect your server directly, but stops malicious sites from silently using a logged-in user's session against your API from within the browser.

**31. How would you design a rate limiter?**
Track request counts per client key (IP or API key) in a fast shared store (Redis) with a sliding or fixed time window, rejecting requests once the count exceeds a threshold within that window; use `INCR` + `EXPIRE` in Redis for a simple, race-condition-safe counter across multiple app instances.

---

## Databases

**32. MongoDB vs PostgreSQL — how do you decide?**
Depends on data shape and consistency needs: relational data with strict integrity/complex JOINs and strong transactional guarantees points to Postgres; flexible/evolving schemas, document-shaped data, or horizontal write scaling needs point to MongoDB.

**33. What does an index actually do, and what's the cost?**
It's a B-tree-like structure letting the DB find matches without scanning every document/row. Cost: slightly slower writes (index must be updated too) and extra storage — so index fields you actually filter/sort on frequently.

**34. Replica set vs sharding — what's the difference?**
Replica set = multiple copies of the same data for high availability/failover. Sharding = splitting the dataset across multiple machines for horizontal scaling. Different problems: durability/uptime vs capacity.

**35. What does an ORM/ODM actually give you over raw queries?**
Schema/validation, less repetitive/error-prone query code, and (for modern tools like Prisma) generated type safety and migrations — at the cost of some abstraction overhead and occasionally needing to drop to raw queries for complex cases.

---

## Scaling / Architecture (system-design-adjacent)

**36. child_process vs worker_threads vs cluster — the one-line distinction for each?**
child_process = separate OS process, for external programs or crash isolation. worker_threads = separate thread in the same process, for offloading CPU-bound JS work. cluster = multiple copies of your whole server process, one per core, for scaling an I/O-bound web server across CPUs.

**37. How would you design a file upload service?**
Accept the upload via a streaming multipart parser (e.g., `multer`) so large files aren't fully buffered in memory; stream the file directly to object storage (S3) rather than local disk for durability/scalability; validate file type/size before/during streaming; return a reference (URL/key) rather than storing binary blobs in the primary database; consider generating a pre-signed upload URL so the client uploads directly to S3, bypassing your server entirely for the heavy bytes.

**38. How would you design a rate limiter for a distributed system (multiple app instances)?**
Don't count in-memory per instance (each instance would have its own separate, wrong count) — use a shared store like Redis with atomic `INCR`/`EXPIRE` (or a sliding-window algorithm) so all instances see the same counter.

**39. How do you scale a Node app horizontally, and what breaks when you do?**
Run multiple processes/instances behind a load balancer (clustering/PM2 within a machine, multiple machines beyond that). What breaks: any in-memory state (sessions, caches, rate-limit counters) is no longer shared — you need Redis or a stateless approach (JWT) once you're running more than one instance.

**40. Why would you introduce a message queue (RabbitMQ/Kafka) into an architecture?**
To decouple services so a slow/down consumer doesn't block or fail the producer's request — the producer just publishes and moves on, and consumers process asynchronously, with built-in retry/replay if using something like Kafka.

**41. What's the point of caching with Redis, beyond "it's faster"?**
It's also how you share state across multiple stateless app instances (sessions, rate limits, feature flags) and reduce load on the primary database for hot, frequently-read, infrequently-changed data.

---

## Testing / Debugging / Production

**42. Unit vs integration tests — what's the actual difference in practice?**
Unit tests isolate one function/module with mocked dependencies (fast, no real DB). Integration tests exercise multiple layers together (e.g., an API route hitting a real/test DB via Supertest), catching wiring bugs unit tests can't.

**43. Why isn't `console.log` enough for production logging?**
No log levels, no structure for searching/filtering at scale, and no way to correlate scattered log lines back to a single request in a busy concurrent server. Structured JSON logging (pino/winston) with request IDs solves this.

**44. How would you detect a memory leak in a long-running Node process?**
Watch `process.memoryUsage().heapUsed` over time — a steady climb that never plateaus even after GC is the signature of a leak. Confirm the source with heap snapshots taken under load and compared over time.

**45. What's the difference between a liveness check and a readiness check?**
Liveness answers "is this instance broken and needs restarting?" Readiness answers "is this instance currently able to accept traffic?" (e.g., alive but still connecting to the DB — not ready yet, but not broken).

**46. Why is graceful shutdown important, and how do you implement it?**
Without it, deploys/scale-downs can kill in-flight requests abruptly. Implement by listening for `SIGTERM`, calling `server.close()` to stop accepting new connections while letting existing ones finish, closing DB connections, then exiting — with a timeout fallback to force-exit if it hangs.

**47. Why is Node good for I/O-bound work but bad for CPU-bound work?**
Single thread + non-blocking I/O means the thread is rarely idle waiting on I/O, so it handles many concurrent I/O-bound requests well. But a CPU-heavy synchronous task blocks that one thread entirely, stalling every other request — there's no thread pool rescuing JS execution the way there is for I/O.

**48. What is p99 latency, and why does it matter more than average latency?**
The 99th percentile latency — 99% of requests are faster than this value. It matters because average latency can hide a "long tail" of slow requests; p99 reflects the experience of your worst-affected users, which is often what actually causes support tickets/complaints.

**49. Why prefer cursor-based pagination over offset-based for large datasets?**
Offset pagination (`LIMIT/OFFSET`) gets slower as the offset grows, since the DB still has to scan/skip prior rows, and can produce inconsistent results if data changes between page requests. Cursor pagination (based on a stable sort key like `_id` or timestamp) stays fast regardless of position and is stable under concurrent writes.

**50. How would you explain the Node.js event loop to someone non-technical, in one sentence?**
"Node handles many tasks by starting each one, moving on to the next without waiting, and coming back to finish each task the moment it's ready — like a waiter taking multiple orders instead of standing at one table until that meal is fully cooked."

---

## Latest Node.js Runtime Features (see file 13)

**51. Do you still need Jest or Mocha for testing a Node project?**
Not necessarily. `node:test` (stable since Node 20) gives you `test()`, `describe()`, hooks, mocking, and coverage built into the runtime, run via `node --test`, with zero install. Jest is still stronger for rich mocking/snapshot testing and large app ecosystems, but small services/libraries can skip test dependencies entirely now.

**52. What does `node --watch` do, and what did people use before it existed?**
It restarts the process automatically whenever a watched file changes — the same job `nodemon` has done for years. It was experimental in Node 18.11 and became stable in Node 22, so many projects can now drop `nodemon` as a dependency.

**53. How does `node --env-file=.env` compare to using the `dotenv` package?**
`--env-file` loads environment variables from a file before your code even runs, with zero dependency and no ordering bugs (no risk of some other import reading `process.env` before `.config()` was called). `dotenv` is still more capable for variable expansion (`${VAR}`) and complex multi-file cascading — for simple key=value config, `--env-file` fully replaces it.

**54. What is Node's Permission Model, and what problem is it solving?**
`node --permission` (stable since Node 23.5) lets you run a script with filesystem/child-process/worker/network access denied by default, then explicitly allow only what it needs via flags like `--allow-fs-read=./data`. It's a defense against supply-chain attacks — even if a compromised dependency tries to read your SSH keys or spawn a shell, it hits `ERR_ACCESS_DENIED` instead of silently succeeding.

**55. Is native `fetch()` in Node actually production-ready, and what's it built on?**
Yes — it shipped experimentally in Node 18 and has been stable, unflagged, since Node 21. It's built on `undici` internally and matches the browser Fetch API. For simple HTTP calls it replaces `axios`/`node-fetch`; libraries needing retries/interceptors/connection-pool tuning often still reach for `undici` directly.

**56. Can Node's built-in global `WebSocket` replace the `ws` package?**
Only partially. The global `WebSocket` (stable since Node 22.4) is a browser-compatible **client** — great for connecting out to a WebSocket server with zero dependencies. But it's client-only; there's no built-in WebSocket server, so `ws` (or Socket.IO) is still required if you need to accept incoming WebSocket connections.

**57. What are Single Executable Applications (SEA), and what's the catch?**
SEA bundles your Node app plus the Node runtime itself into one standalone binary, so end users can run it without installing Node — useful for distributing CLI tools. The catch: the binary bundles the entire runtime, so it's large (tens of MB), and native addons need special handling. It's been experimental since ~Node 20, with Node 25.5 adding a simpler one-step `--build-sea` flag.

**58. What does Corepack do, and what changed about it in Node 25?**
Corepack ensures every developer/CI machine uses the exact npm/yarn/pnpm version declared in a project's `package.json` (`"packageManager"` field), avoiding "works on my machine" lockfile mismatches from different global package manager versions. It shipped bundled with Node from 14.19 through Node 24; starting with Node 25, it's no longer bundled by default and must be installed separately (`npm install -g corepack`).

**59. Can a CommonJS file `require()` an ES Module now? What changed?**
Partially — as of Node 22.12 (unflagged by default), `require()` can load a **synchronous** ES Module (no top-level `await`) directly, no `Promise` involved. This closes a long-standing gap where CJS could only load ESM via `await import(...)`. It still doesn't work if the target module uses top-level `await` — that case still needs a dynamic `import()`.

**60. Name three things that used to require an npm package but are now built into Node.**
Any three of: `node:test` (replaces Jest/Mocha for basic testing), `--watch` (replaces `nodemon`), `--env-file` (replaces `dotenv` for simple cases), global `fetch()` (replaces `axios`/`node-fetch` for simple calls), or global `WebSocket` client (replaces `ws` for client-only use cases).

---

## Cross-Cutting Backend / System Design (see file 14)

**61. Why was GraphQL invented when REST already existed?**
To solve over-fetching (a fixed REST response shape returns more fields than a client needs) and under-fetching (related data needs multiple round-trip REST calls — a "waterfall"). GraphQL lets the client specify exactly the fields and nested relationships it wants in a single request to one endpoint.

**62. What's the N+1 query problem, and where does it usually show up?**
It's when fetching a list of N items, then naively fetching a related item for each one individually, causes 1 + N queries instead of 2. It shows up constantly in GraphQL resolvers (e.g., resolving `product` for each of 20 `orders`) but can happen in any ORM-based code with lazy-loaded relations. Fix: batch the related lookups into one `WHERE id IN (...)` query (the DataLoader pattern).

**63. When would you pick REST over GraphQL for a new API?**
When you need simple CRUD, want to lean on HTTP-level caching (CDN/browser caching keyed by URL, which GraphQL's single `POST /graphql` endpoint doesn't get for free), have fairly uniform clients that don't need wildly different data shapes, or need straightforward file upload/streaming support.

**64. What does Socket.IO add on top of raw WebSocket that you'd otherwise have to build yourself?**
Automatic reconnection with backoff, a fallback to HTTP long-polling for clients/networks that can't establish a WebSocket connection (with transparent upgrade once possible), and rooms/namespaces for broadcasting to a subset of connected clients instead of tracking that manually.

**65. What's the difference between a Socket.IO room and a namespace?**
A namespace is a separate communication channel over the same connection (like `/chat` vs `/admin`), set up at connection time. A room is a dynamic group within a namespace that a socket can join/leave at runtime (e.g., `order-42`) used purely for targeted broadcasting.

**66. What is a webhook, conceptually, and how is it different from polling?**
It inverts polling: instead of your app repeatedly asking a service "anything new?", you register a URL and the service POSTs to you the instant a relevant event happens — less wasted traffic, near-instant notification instead of waiting for the next poll interval.

**67. How do you verify a webhook request is genuinely from the provider and not spoofed?**
The provider signs the payload with a shared secret using HMAC and sends the signature in a header (e.g., `Stripe-Signature`). Your endpoint recomputes the HMAC over the raw request body with the same secret and compares it to the received signature using a timing-safe comparison (`crypto.timingSafeEqual`), not `===`.

**68. Why must a webhook route use the raw request body instead of `express.json()`'s parsed body when verifying a signature?**
Because the signature was computed over the exact original bytes the provider sent. Parsing then re-serializing JSON can change whitespace or key order, producing different bytes than what was signed — so the recomputed HMAC wouldn't match even for a genuine, unmodified request. You configure `express.raw()` on just that route to get the untouched body buffer.

**69. Why use a multi-stage Dockerfile for a Node app instead of a single-stage one?**
A single-stage build leaves devDependencies (compilers, test runners, linters) and source files sitting in the final image, needlessly bloating it. A multi-stage build does the install/build/compile work in a throwaway "builder" stage, then copies only the final build output into a clean stage that installs just production dependencies — smaller image, smaller attack surface, faster deploys.

**70. What does a typical CI pipeline check before allowing a merge on a Node project?**
Installs exact locked dependencies (`npm ci`), runs the linter, runs the test suite (unit + integration), and runs the build step — failing any of those blocks the merge, catching regressions before they reach main/production rather than after.

**71. What's a "cold start" in serverless, and how do you minimize it for a Node function?**
The extra latency on the first invocation (or after a period of inactivity) while the provider provisions a fresh execution environment: downloading the deployment package, starting the Node runtime, and running all top-level module code before the handler even runs. Minimize it by keeping the dependency tree small and initializing expensive resources (DB clients, SDK clients) at module scope outside the handler, so warm invocations reuse them instead of reinitializing every call.

**72. When would serverless (e.g., Lambda) be a poor fit for a Node service?**
For steady, high-throughput traffic where cold starts and per-invocation pricing add overhead compared to an always-warm server, and for anything needing long-lived connections (WebSockets, SSE, or long streaming responses), since serverless platforms typically cap execution duration and don't naturally hold persistent connections.

**73. Name a couple of "12-factor app" principles that come up constantly in scaling/production interview questions, even if the interviewer never says "12-factor."**
Config via environment variables (not hardcoded, so the same build runs unchanged across environments), stateless processes (anything that must persist goes in a backing service like Redis/a DB, not in-process memory — this is exactly why you need Redis once you scale to multiple instances), and disposability (fast startup, graceful shutdown on `SIGTERM` — directly what enables safe autoscaling and zero-downtime deploys).

**74. System design: design a webhook receiver endpoint that safely handles signature verification and retries.**
Key pieces: (1) mount the route with `express.raw({ type: 'application/json' })`, not `express.json()`, so you have the exact bytes the provider signed; (2) recompute the HMAC signature with the shared secret and compare via `crypto.timingSafeEqual`, rejecting with 4xx on mismatch before doing any business logic; (3) respond `200` **fast** — do the actual processing (updating an order, sending an email) asynchronously (e.g., push to a queue) rather than making the provider's webhook call wait on slow work, since most providers retry on timeout; (4) make processing **idempotent** using the event's unique ID (store processed event IDs, e.g., in Redis/DB with a TTL) since providers retry on timeout/5xx and may deliver the same event more than once — without an idempotency check you'd risk double-processing (e.g., fulfilling an order twice); (5) log/alert on verification failures, since a spike of them can indicate someone probing your endpoint.

**75. System design: how would you design a real-time notification system for a web app (e.g., "you have a new message")?**
Use Socket.IO (or raw WebSocket behind a gateway) for the persistent client connection, with each connected client joining a room keyed by their user ID; when an event occurs (e.g., a new message saved to the DB), the originating service emits to `room:user-<id>` so only that user's open connections receive it. For users not currently connected, fall back to a stored/queued notification (DB row, or push notification via FCM/APNs) delivered on next login/poll. Since WebSocket connections are stateful and tied to a specific server instance, running multiple app instances requires a shared pub/sub layer (e.g., Redis pub/sub, or the `socket.io-redis` adapter) so an event emitted on one instance reaches a client connected to a different instance.

---

## Process Crash Safety, child_process, OAuth, Connection Pooling, Caching, npm Tooling (audit additions)

**76. What's the difference between `uncaughtException` and `unhandledRejection`, and why is "just add a handler so it stops crashing" the wrong instinct?**
`uncaughtException` fires when a synchronous `throw` reaches nowhere with a catch; `unhandledRejection` fires when a rejected Promise has no `.catch()`/surrounding `try/catch` anywhere. Swallowing either just to "prevent the crash" leaves the process running in an unknown, possibly corrupted state (a half-finished operation, a released-but-not-really lock) with no signal anything went wrong — it fails differently and more confusingly later instead of failing loudly now. The correct pattern is: log the error with full context, then exit deliberately, and let a process manager (PM2/Kubernetes) restart a clean instance.

**77. How does an `unhandledRejection` typically sneak into otherwise normal-looking code?**
Calling an `async` function without `await` or a trailing `.catch()` — the code reads fine, but if that function's returned promise later rejects, nothing is attached to observe it. Example: `sendWelcomeEmail(user);` inside an async route handler, with no `await` and no `.catch()`. The real fix is always adding the missing `await`/`.catch()` at the call site, not relying on the global handler to paper over it.

**78. What's the difference between `child_process.spawn()`, `exec()`, `execFile()`, and `fork()`?**
`exec()` runs a command through a shell and buffers all output into one callback (convenient, but shell-injection risk with unsanitized input). `execFile()` does the same buffering but runs the executable directly with no shell, so array-based args are safe even with dynamic/user-supplied values. `spawn()` also skips the shell but streams stdout/stderr as `data` events instead of buffering everything — the right choice for long-running processes or large output. `fork()` specifically spawns another **Node.js** script and adds a structured-message IPC channel (`.send()`/`on('message')`), not just text streams.

**79. Is `child_process.fork()` the same thing as `cluster.fork()`?**
No — they share a method name but do different things. `cluster.fork()` spawns another copy of the *same* server process specifically to share a listening port across CPU cores (and is actually implemented on top of `child_process.fork()` internally). `child_process.fork()` spawns a Node process running *any* script you point it at, for general-purpose parallel work and IPC, with no concept of shared ports.

**80. Walk through the OAuth 2.0 Authorization Code flow.**
(1) Your app redirects the browser to the provider's login/consent page with your `client_id`, `redirect_uri`, and requested `scope`s. (2) The user authenticates directly with the provider — your app never sees their password. (3) The provider redirects back to your `redirect_uri` with a short-lived, single-use authorization `code`. (4) Your backend exchanges that code plus your `client_id`/`client_secret` for an access token (and, for OIDC, an ID token) via a server-to-server call to the provider's token endpoint. (5) Your backend uses the access token to call the provider's API on the user's behalf.

**81. What problem does PKCE solve, and why do public clients (SPAs, mobile apps) need it specifically?**
A public client can't safely hold a `client_secret` — it would be visible in the shipped JS bundle/app binary. Without PKCE, an attacker who intercepts the authorization code in the redirect step could redeem it themselves, since the code alone would be sufficient. PKCE has the app generate a random `code_verifier` up front, send only its hashed `code_challenge` in the initial redirect, and then present the original `code_verifier` at the token-exchange step — so stealing the code in transit isn't enough; the attacker never saw the verifier.

**82. What's the difference between authentication and authorization in the OAuth/OIDC context?**
Authentication ("who is this user?") is OIDC's job — it issues an ID token. Authorization ("what is this app allowed to do on the user's behalf?") is OAuth's job — it issues an access token scoped to specific permissions. OAuth alone doesn't define a standard way to know who logged in; OIDC adds that on top.

**83. Why does a database connection pool exist instead of just opening a new connection per request?**
Opening a connection costs a TCP handshake plus, for SQL databases, an auth round-trip — real per-request latency if paid every time. Worse, the database has a hard cap on concurrent connections (Postgres defaults to 100); a traffic spike opening unbounded new connections can exhaust that limit and take the database down for every client, not just the spike's cause. A pool amortizes the connection cost once and caps how many connections your app can ever hold.

**84. What breaks if you forget to call `client.release()` after `pool.connect()` in a transaction?**
That connection is leaked out of the pool permanently — it's neither usable nor returned. Enough leaks under sustained load and the pool silently shrinks toward zero available connections, which looks exactly like "the database is down" in monitoring, but is actually an application bug. The fix is always releasing in a `finally` block so it happens even when the transaction throws.

**85. Name three cache invalidation strategies and their trade-offs.**
(1) TTL expiry — simplest, but accepts a staleness window until the entry naturally expires. (2) Cache-aside explicit invalidation — the write path deletes the cache key immediately after writing the DB, so there's no staleness window, but every code path that writes that data has to remember to do it. (3) Event-based invalidation — a write publishes a change event (Redis pub/sub, a queue) that any interested cache subscribes to and invalidates itself on, which scales to multiple independent caches without the writer needing to know who's caching what, at the cost of an extra moving part.

**86. What does `^4.18.2` mean in `package.json`, versus `~4.18.2` or an exact `4.18.2`?**
`^` allows automatic upgrades to any MINOR or PATCH release (up to but not including the next MAJOR) — semver's "no breaking changes" promise. `~` is more conservative, allowing only PATCH upgrades within the same MINOR. An exact version pins it completely, no auto-upgrades at all. This is a social convention enforced by package authors' discipline, not something npm can technically guarantee — which is why `package-lock.json` exists as a separate safety net.

**87. If `package.json` already specifies versions, why is `package-lock.json` needed too?**
`package.json`'s `^`/`~` are ranges, re-resolved against whatever's currently published — two installs on two different days (or two different machines) can resolve a range to different actual versions, including transitive dependencies you don't even see. `package-lock.json` freezes the entire resolved tree exactly, so `npm ci` produces a byte-identical `node_modules` every time, which is why CI pipelines use `npm ci` instead of `npm install`.

**88. What does `npx` actually do that `npm install -g` doesn't?**
It runs a package's executable on demand — using the local project's copy from `node_modules/.bin` if present, or fetching and running it ephemerally if not — without permanently installing anything globally. Useful for one-off tools (scaffolding a new project, running a specific linter version) you don't want cluttering a global npm install.

**89. What problem do npm/yarn/pnpm workspaces solve in a monorepo?**
Without workspaces, a shared package used by multiple other packages in the same repo would need to be published and version-bumped in every consumer just to test a change — often across several PRs. Workspaces symlink local packages to each other and install shared dependencies once at the repo root, so a change to a shared package and its consumers can be made and tested together in one commit, with no publish step needed until you actually want to ship externally.

**90. What does `AbortController` actually do, and what's the common misconception about it?**
It gives you a standard `.signal` you can pass into cancellable operations (`fetch`, Node's `timers/promises` sleep, streams) and an `.abort()` method to trigger cancellation. The common misconception is that wrapping *any* async code in an AbortController makes it interruptible — it doesn't. A custom async function has to cooperatively check `signal.aborted` (or listen for the `abort` event) at sensible points itself; only APIs that were explicitly built to accept and honor a signal actually stop early.

**91. What's the difference between an integration test and an end-to-end (e2e) test?**
An integration test (e.g., Supertest hitting Express routes) still runs in-process — no real network hop, no real browser — verifying your app's own layers work together. An e2e test runs against a fully deployed, running instance of the system, often driving the real UI through a real browser (Playwright/Cypress), verifying the entire user-facing flow end to end. E2E tests are slower and more brittle, sit at the top of the testing pyramid, but catch deploy/environment/contract issues that unit and integration tests structurally can't see.

---

## Tricky Gotchas, Misconceptions & Edge Cases (audit additions)

**92. Predict the output — does `after emit` ever print, and does throwing inside an `'error'` listener behave any differently from having no `'error'` listener at all?**
```js
const { EventEmitter } = require('events');
const ee = new EventEmitter();
ee.on('error', (err) => {
  throw new Error('secondary: ' + err.message);
});
console.log('before emit');
ee.emit('error', new Error('boom'));
console.log('after emit');
```
Answer: `emit()` is synchronous, so in both cases the process crashes before `'after emit'` ever logs — with no listener at all, Node throws the original error directly ("Unhandled 'error' event"); with a listener that throws, the *listener's* thrown error propagates instead, but the outcome is identical: an uncaught exception, since nothing wraps `emit()` in a try/catch. The common misconception is that adding *any* `'error'` listener "handles" the error safely — it only prevents the special "unhandled error event" crash message; it does nothing to stop your own listener code from re-throwing and killing the process anyway.

**93. Is Node.js single-threaded for everything, including `fs.readFile` and `crypto.pbkdf2`?**
No — only your JS runs on a single thread. Node delegates DNS lookups, filesystem calls, and several `crypto` functions (`pbkdf2`, `scrypt`, async `randomBytes`) to libuv's threadpool, a real OS thread pool sitting behind the scenes, default size 4 (configurable via `UV_THREADPOOL_SIZE`). Firing 8 concurrent `crypto.pbkdf2` calls proves this directly: the first 4 finish together in one "wave" around the same timestamp, then the remaining 4 finish together in a second wave once threads free up — clear evidence that only 4 run truly in parallel no matter how many async calls get queued. Network sockets don't use this pool at all — those go through the OS's own async I/O (epoll/kqueue/IOCP) — which is why network-heavy servers scale far further than crypto/fs-heavy ones without raising the pool size.

**94. What actually happens if you keep calling `stream.write()` without checking its return value or waiting for `'drain'`?**
`write()` returns `false` the moment the destination's internal buffer exceeds its `highWaterMark`, signaling "please pause" — but nothing forces you to obey it; the stream keeps accepting and queuing chunks regardless. Writing 10 chunks into a slow destination with a tiny 16-byte `highWaterMark` and ignoring the return value produced `false` on 9 of the 10 writes while `writableLength` climbed steadily to 80 bytes and kept growing — no error, no crash, just silent unbounded memory buildup that eventually exhausts the heap under real sustained load. The correct pattern is to stop writing once `write()` returns `false` and resume only after the `'drain'` event fires (which is exactly what `.pipe()` does for you automatically).

**95. In an Express-style async route handler with no `try/catch` and no `.catch()`, does a rejected promise crash the whole server or just leave that one request hanging?**
```js
async function routeHandler(req, res) {
  await Promise.resolve();
  throw new Error('DB query failed');
}
app.get('/', (req, res) => {
  routeHandler(req, res); // Express never awaits or catches this for you
});
```
Answer: on modern Node (>=15) it's worse than "just hangs" — it crashes the *entire* process. Express doesn't await async handlers or attach a `.catch()` for you (true for Express 4, which plenty of production apps still run), so the rejection goes unhandled; since Node 15 the default `--unhandled-rejections` mode is `throw`, meaning an unhandled rejection escalates to an uncaught exception that kills the process — taking down every other in-flight request on that instance, not just the one that errored. Reproducing this with a bare `http` server confirms it: the request never gets a response, and moments later the whole process exits with a stack trace. The fix is wrapping every async handler (`express-async-errors`, or a manual try/catch that calls `next(err)`) or moving to Express 5, which auto-forwards rejected promises to error middleware.

**96. If one `cluster` worker sets an in-memory variable (say, a cache), can other workers or the primary see it?**
No — this is one of the most common `cluster` misconceptions. `cluster.fork()` shares no memory at all; each worker is a completely separate OS process with its own heap, spawned the same way `child_process.fork()` spawns any child process. The only thing `cluster` coordinates is round-robin distribution of incoming connections across workers via IPC and a shared listening handle — never application state. Forking two workers, having the primary increment a "shared" counter after hearing from worker 1, then asking worker 2 what it thinks that counter is, shows worker 2 reporting its own untouched local value — completely unaware of anything the primary or worker 1 did. Any state that genuinely needs to be shared across workers (sessions, rate limits, caches) has to live outside the process entirely — Redis, a database, a message bus — `cluster` gives zero help here.

**97. `Promise.all([fetchA(), fetchB()])` runs both "at the same time" instead of sequentially — does that mean Node executes their JS in parallel on separate threads?**
No — this is the deeper trap behind "is async/await actually concurrent?" `Promise.all` only overlaps the *waiting* time: if `fetchA` and `fetchB` are I/O-bound, their idle-waiting periods overlap because neither blocks the single thread while waiting, so the total wall-clock time looks like `max(A, B)` instead of `A + B` — timing this directly shows two sequential 300ms awaits taking ~600ms while the same two calls wrapped in `Promise.all` take ~300ms. But if `fetchA` and `fetchB` instead did heavy *synchronous* CPU work before returning a promise, `Promise.all` wouldn't parallelize that computation at all — there's still exactly one thread, so the CPU-bound portions still run strictly one after another. Confusing "concurrent" (interleaved waiting, still one thread) with "parallel" (actually simultaneous execution, needs multiple threads/cores) is the root of the misconception — Node gives you the former for free and the latter only via `worker_threads`/`cluster`.

**98. Predict the output — why does the `for...of` loop below wait between iterations, but the `.forEach` version doesn't wait for anything at all?**
```js
async function withForOf() {
  for (const n of [1, 2, 3]) {
    await wait(100);
    console.log('for-of', n);
  }
}
async function withForEach() {
  [1, 2, 3].forEach(async (n) => {
    await wait(100);
    console.log('forEach', n);
  });
  console.log('forEach() already returned');
}
```
Answer: `for-of` logs each item roughly 100ms apart because `await` genuinely pauses that loop's execution at every iteration. `forEach`, on the other hand, invokes its callback once per element and immediately moves to the next — it has no idea the callback returned a promise and makes zero attempt to await it, so `'forEach() already returned'` logs at +0ms, before any of the three `forEach` callbacks have even reached their own `await`. This is a classic trap in "convert this callback to async" refactors: swapping a `for` loop for `.forEach()`/`.map()` silently drops all sequencing guarantees, and any code placed right after the `.forEach()` call runs before the async work inside it has done anything, let alone finished.

**99. Why can `JSON.stringify()` on a large object stall a running server even though it looks like "just serialization"?**
`JSON.stringify` is fully synchronous — there's no async version — so it occupies the single thread for as long as it takes to walk and serialize the entire structure, exactly like any other CPU-heavy blocking code, just less obviously guilty since it looks like an innocuous utility call rather than a loop. Scheduling a `setTimeout(fn, 50)` and then synchronously building and stringifying a 2-million-element array demonstrates it directly: the timer, which should fire at ~50ms, instead fires at over 1300ms, because the event loop couldn't even check its timers phase until the stringify call finished. In a real server this means one request serializing a large JSON response adds latency to every *other* concurrent request on that instance, not just its own — the fix for genuinely large payloads is streaming the serialization chunk-by-chunk or offloading it to a `worker_thread`.

**100. What's wrong with `const port = Number(process.env.PORT) || 3000;`?**
Every value on `process.env` is always a string, no matter what was actually set — `process.env.PORT` is `"3000"`, never the number `3000`. That alone is a common gotcha, but the sneakier one is what happens for a legitimately configured port `"0"` (used to mean "let the OS pick any free port"): `Number("0")` evaluates to the numeric `0`, and `0` is falsy in JS, so `|| 3000` silently overrides an intentional `0` with `3000` — a bug that only shows up for that one specific, valid value. The safe pattern checks for `undefined` explicitly (`process.env.PORT !== undefined ? Number(process.env.PORT) : 3000`) rather than relying on truthiness for anything read out of `process.env`, since "the string `'0'` is truthy but `Number('0')` is falsy" is exactly the kind of type-coercion seam that env-var configs fall into.

**101. How does forgetting to remove an event listener cause a memory leak, and what warning does Node give you for free?**
Every listener attached with `.on()` is retained by the `EventEmitter` until explicitly removed with `.off()`/`.removeListener()` — if a function that's called repeatedly (a request handler, a reconnect routine) attaches a *new* listener each time instead of attaching once or cleaning up after itself, the listener array only ever grows, each one holding closures over whatever it captured, keeping that memory reachable and un-collectible indefinitely. Node has a built-in tripwire for exactly this: attaching more than the default max of 10 listeners for the same event on the same emitter logs a `MaxListenersExceededWarning: Possible EventEmitter memory leak detected` — reproducing it by calling a buggy helper that attaches a listener 12 times in a loop triggers that exact warning right after the 10th. It's a warning, not an error, so it's easy to miss in production logs, but it's usually the fastest available signal that something is leaking listeners (or, by extension, forgetting a `clearInterval`/`clearTimeout` on a timer whose closure keeps the same kind of references alive) long before `heapUsed` visibly climbs.

**102. Predict the output — do the scheduled timer and the `.then()` below ever actually run?**
```js
setTimeout(() => console.log('timer'), 0);
Promise.resolve().then(() => console.log('promise'));
process.exit(0);
console.log('after exit');
```
Answer: none of `timer`, `promise`, or `after exit` ever print. `process.exit()` terminates the process immediately and synchronously — it doesn't finish draining the current microtask queue and doesn't let any pending timer or I/O callback run; it simply stops. This is the well-known reason `process.exit()` inside otherwise-working async shutdown code can silently discard work you assumed was already scheduled — anything not yet actually executed is just thrown away, which is exactly why graceful-shutdown routines close servers/connections and wait for their callbacks to fire *before* calling `process.exit()`, rather than calling it up front.

**103. Predict the output — does the `try/catch` below catch anything?**
```js
try {
  setTimeout(() => {
    throw new Error('boom');
  }, 10);
} catch (e) {
  console.log('caught:', e.message);
}
console.log('script continues');
```
Answer: `'caught: ...'` never logs — only `'script continues'` prints, followed 10ms later by an uncaught exception that crashes the process. `try/catch` only covers the *synchronous* call stack active while it executes; scheduling `setTimeout` just registers a callback and returns immediately, so the `try` block finishes (having thrown nothing) long before the timer ever fires. By the time the callback actually runs, it's on a brand-new call stack with no enclosing `try/catch` anywhere in sight, so the `throw` inside it becomes an uncaught exception. The `try/catch` has to live *inside* the callback itself to catch anything a timer, `setInterval`, or any other deferred callback throws.

**104. Predict the output — if a `setInterval` callback throws on its second invocation, does the interval keep firing after that?**
```js
let count = 0;
setInterval(() => {
  count++;
  console.log('tick', count);
  if (count === 2) throw new Error('boom on tick 2');
}, 50);
```
Answer: it logs `tick 1`, then `tick 2`, then crashes the entire process with an uncaught exception — there is no `tick 3`. An uncaught synchronous throw inside any callback, including a repeating timer's, isn't scoped to "skip this one iteration and keep the interval alive" — Node has no default recovery from an uncaught exception, so the whole process (and every future tick that interval would ever have produced) dies right there. Operationally this matters: a `setInterval`-based polling/heartbeat job with an unguarded throw doesn't degrade gracefully, it takes the entire process down on its next unlucky tick, which is why interval callbacks that can fail need their own internal try/catch.

**105. Two different packages in `node_modules` both depend on the same library, but end up with two separate copies on disk (a "dual package hazard") — does `require()`'s module cache save you from that?**
No — the module cache is keyed by *fully resolved absolute file path*, not by package name or content. If two different `node_modules/.../shared` directories on disk happen to contain byte-identical code, `require()` still treats them as two entirely separate modules with two separate top-level executions and two separate copies of any "singleton" state that module maintains: requiring the same shared module through two different resolved paths and incrementing a module-level counter through one leaves the other copy's counter completely unaffected, and `moduleA === moduleB` evaluates to `false`. In practice this shows up whenever a real project ends up with mismatched nested dependency versions (a common symptom of npm's nested `node_modules` resolution) — code that assumes "there's only one instance of this library running" (a connection pool, a global config object, `instanceof` checks against a class exported by that library) silently breaks because two logically-identical but physically-distinct instances exist side by side, with no error ever raised to warn you.

**106. `Buffer.allocUnsafe(n)` is faster than `Buffer.alloc(n)` — what exactly is the tradeoff, and when could it actually bite you?**
`Buffer.alloc(n)` zero-fills the memory it hands you before returning it; `Buffer.allocUnsafe(n)` skips that zeroing step entirely for speed, and the documented contract is explicit that its contents are *unspecified* — a freshly started process often shows all zeros (V8 zero-initializes newly created `ArrayBuffer`s under the hood, and reproducing this shows exactly that), but Node deliberately does not guarantee it, because the pooled memory backing small `allocUnsafe` buffers can, depending on allocation history within the process, still hold whatever bytes an earlier buffer wrote into that same region. The real danger is allocating an unsafe buffer, only partially filling it (writing a shorter string/response than the buffer's full length), and then sending the *entire* buffer over the network or into a response — any unwritten bytes at the end could leak previously-processed data (another request's bytes, a stray credential, whatever last occupied that memory) to the wrong recipient. `Buffer.alloc()` should be the default; `allocUnsafe()` is only safe when the code is about to write to and use the buffer's *entire* length before it's ever read or transmitted.
