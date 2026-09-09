# 11. Performance and Production

## Clustering / PM2 for multi-core usage
**What is it?** Since one Node process uses one CPU core for JS execution, running multiple processes (one per core) is how a Node app actually uses a multi-core machine fully. **PM2** is a production process manager that wraps this (plus auto-restart, log management, zero-downtime reload) so you don't hand-roll `cluster` module logic.
```
pm2 start server.js -i max     # cluster mode: one instance per CPU core
pm2 reload server.js           # zero-downtime reload — replaces workers one at a time
pm2 logs                       # aggregated logs from all instances
pm2 monit                      # live CPU/memory monitoring
```
See file 09 for the raw `cluster` module explanation and `examples/clustering-example.js`.

---

## Environment variables / config management
**What is it?** Storing configuration (DB URLs, API keys, feature flags, ports) outside your code, injected at runtime via environment variables, rather than hardcoded.

**Why it matters:** The same code should run unchanged across dev/staging/production, with only the *configuration* differing — this is the core idea of the widely-referenced "12-factor app" methodology. Hardcoding a DB URL or secret in code means committing secrets to git (a real security risk) and needing a code change just to point at a different environment.
```js
require('dotenv').config(); // loads a local .env file into process.env (dev convenience only — never commit .env)

const PORT = process.env.PORT || 3000;
const DB_URL = process.env.DATABASE_URL;
if (!DB_URL) throw new Error('DATABASE_URL is required');
```
**Real-world usage:** Secrets managers (AWS Secrets Manager, Vault) inject env vars at deploy time in real production systems rather than relying on `.env` files, which are a local-dev-only convenience.

---

## Graceful shutdown
**What is it?** Making sure that when your process receives a termination signal (e.g., during a deploy, or when a container orchestrator like Kubernetes scales down a pod), it finishes in-flight requests and cleanly closes connections (DB, message queue) instead of dying mid-request.

**Why it matters:** Without this, deploys or scale-down events can abruptly kill requests in progress, causing dropped connections and, if a DB write was half-done, potential data inconsistency.
```js
const server = app.listen(3000);

function shutdown(signal) {
  console.log(`${signal} received, shutting down gracefully...`);
  server.close(() => {          // stop accepting NEW connections, let existing ones finish
    console.log('HTTP server closed');
    db.disconnect().then(() => {
      console.log('DB connection closed');
      process.exit(0);
    });
  });
  // safety net: force exit if graceful shutdown hangs too long
  setTimeout(() => process.exit(1), 10000);
}

process.on('SIGTERM', () => shutdown('SIGTERM')); // sent by orchestrators (k8s, PM2) on scale-down/redeploy
process.on('SIGINT', () => shutdown('SIGINT'));   // Ctrl+C locally
```

---

## Process-level crash safety: `uncaughtException` and `unhandledRejection`
**What is it?** Two process-wide events Node emits as a last resort:
- **`uncaughtException`** — fires when a synchronous error is `throw`n and **nothing** catches it anywhere up the call stack.
- **`unhandledRejection`** — fires when a `Promise` rejects and **no** `.catch()`/`try-catch` around an `await` ever handles that rejection.

**Why do these matter, and why is the "obvious" fix wrong?** By default, an uncaught exception crashes the entire Node process immediately — every in-flight request on every connection this process was handling dies with it, not just the one that errored. Beginners' first instinct is often "just add `process.on('uncaughtException', () => {})` so it doesn't crash" — **this is a well-known anti-pattern and a real interview trap.** Swallowing the event doesn't fix anything; it just means your process keeps running in an **unknown, possibly corrupted state** (a half-completed operation, a connection left in a broken state, a lock never released) — silently, with no crash to alert anyone, until it fails in some *other*, much harder-to-diagnose way later. Node's own docs are explicit that `uncaughtException` is "a crude mechanism... intended to be used as a last resort," not a substitute for proper error handling (`try/catch`, `.catch()`, Express's error middleware from file 06).

**The correct pattern:** treat both events purely as a **last-resort safety net for logging/alerting and a clean exit** — log the error with full context (so you can actually fix the real bug afterward), and then let the process exit, ideally after finishing in-flight work the same way graceful shutdown does above. In a properly clustered/orchestrated setup (PM2, Kubernetes), a crashed instance is expected and immediately replaced — that's the actual safety net, not staying alive in a broken state.

```js
process.on('uncaughtException', (err, origin) => {
  logger.fatal({ err, origin }, 'Uncaught exception — process is in an unknown state, exiting');
  // Do NOT try to keep serving new requests here — the process's internal state
  // (open handles, half-finished operations) can no longer be trusted.
  gracefulShutdownThenExit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.fatal({ reason }, 'Unhandled promise rejection — exiting');
  // Historically Node just logged a warning for this and kept running; that default is
  // considered a footgun (a "swallowed" failed async operation, no one ever knows it failed) --
  // which is why treating it the same as uncaughtException (log + exit) is the modern best practice.
  gracefulShutdownThenExit(1);
});
```

**Why `unhandledRejection` is its own trap, separate from the anti-pattern above:** it's extremely easy to accidentally create one — any `async` function called without `await` or a trailing `.catch()`, whose returned promise later rejects, produces an unhandled rejection even though the *code itself* looks perfectly normal:
```js
async function sendWelcomeEmail(user) { /* ... can reject ... */ }

app.post('/signup', async (req, res) => {
  const user = await createUser(req.body);
  sendWelcomeEmail(user); // BUG: not awaited, no .catch() — if this rejects, it's unhandled
  res.status(201).json(user);
});
```
The fix is always at the source — `await sendWelcomeEmail(user).catch(logAndIgnore)` if a failed welcome email genuinely shouldn't fail the signup — **not** relying on the global `unhandledRejection` handler to paper over missed error handling; that handler's only real job is to catch what slips through as a last line of defense and fail loudly instead of silently.

**Real-world usage:** Production Node services register both handlers purely to log the fatal error (with full context, ideally to an error-tracking tool like Sentry) and exit with a non-zero code, relying on the process manager (PM2, Kubernetes) to restart a fresh, known-good instance — the same "let it crash, restart clean" philosophy behind Erlang/OTP supervisors, applied to Node.

**How to explain it in an interview:**
> "`uncaughtException` and `unhandledRejection` are last-resort, process-wide safety nets — a thrown error or rejected promise that nothing else caught. The common beginner mistake is registering a handler that just swallows them to 'stop the crash,' but that leaves the process running in an unknown, potentially corrupted state with no visible signal anything went wrong — it just fails differently and more confusingly later. The correct pattern is to log the error with full context for debugging, then exit the process deliberately, and rely on a process manager or orchestrator to restart a clean instance — 'let it crash and restart' rather than 'catch and hope.' The actual fix for `unhandledRejection` specifically is finding the missing `await`/`.catch()` at the source, not leaning on the global handler."

See `examples/process-crash-safety-demo.js` for a runnable demonstration of both events and the "missing await" trap.

---

## Health checks
**What is it?** A dedicated endpoint (`/health` or `/healthz`) that a load balancer or orchestrator polls to decide whether an instance is alive and ready to receive traffic.
```js
app.get('/health', async (req, res) => {
  try {
    await db.ping(); // check real dependencies, not just "is the process alive"
    res.status(200).json({ status: 'ok' });
  } catch (err) {
    res.status(503).json({ status: 'unhealthy', error: err.message });
  }
});
```
**Liveness vs readiness (Kubernetes terms worth knowing):** a **liveness** check answers "should this instance be restarted?" (is it deadlocked/crashed); a **readiness** check answers "should traffic be routed to this instance right now?" (e.g., it's alive but still warming up its DB connection pool — not ready yet, but not broken either).

---

## Monitoring basics
**What is it?** Continuously observing key metrics (request latency, error rate, CPU/memory, event loop lag) so you notice problems proactively rather than from user complaints.

**Real-world usage:** APM tools (Datadog, New Relic, Prometheus + Grafana) track request latency percentiles (p50/p95/p99 — p99 matters more than average, since it reflects your worst-experienced users), error rates, and Node-specific metrics like **event loop lag** (how long callbacks are waiting to run — a rising trend signals the event loop is getting blocked, see file 02) and memory/heap usage over time.

---

## Memory leak detection in long-running Node processes
**What is it?** A memory leak is when memory usage keeps climbing over time and is never released, eventually causing the process to slow down (excessive GC) or crash (out of memory).

**Common Node-specific causes:**
- Accidentally growing a global array/cache/Map with no eviction (e.g., caching every request's data forever).
- Forgotten `setInterval`/event listeners that are never cleared, each holding a reference to data that should have been garbage collected.
- Closures unintentionally capturing large objects (e.g., a callback capturing a big buffer in scope, kept alive by a long-lived timer/listener).

**How to detect it:**
```js
console.log(process.memoryUsage());
// { rss, heapTotal, heapUsed, external, arrayBuffers }
// Watch heapUsed over time — a steady upward trend with no plateau (even under GC) suggests a leak
```
- Take **heap snapshots** (via `--inspect` + Chrome DevTools' Memory tab, or `node --inspect` + `heapdump` package) at intervals under sustained load, and compare — objects that keep growing in count between snapshots point to the leak's source.
- Tools: `clinic.js` (`clinic heapprofiler`), Chrome DevTools heap snapshots, or APM-integrated memory profiling in production.

**How to explain it in an interview:**
> "I'd watch `heapUsed` over time in production metrics — a steady climb that never plateaus even after GC runs is the signature of a leak. To find the actual source, I'd take heap snapshots under load via the inspector and compare object counts between snapshots to see what's accumulating — usually it's something like an ever-growing cache/array with no eviction, or listeners/timers that were never cleaned up, keeping references alive."

---

## Why Node is good/bad for CPU-heavy work
**Good for:** I/O-bound work — APIs, proxying, real-time messaging, streaming — where the bottleneck is waiting on network/disk, not computation. The single-threaded non-blocking model shines here (see file 01).

**Bad for:** Sustained CPU-heavy computation (image/video processing, heavy cryptography, complex data crunching, ML inference) directly on the main thread — since there's only one thread executing JS, a long CPU-bound task blocks *every other request* the process is handling. Mitigations: offload to `worker_threads` (in-process, for JS computation), `child_process` (external programs), or a completely separate service/language better suited to the workload (e.g., a Python service for heavy ML), keeping Node itself focused on orchestration and I/O.

**How to explain the whole file in an interview:**
> "In production, I'd run Node behind PM2 or Kubernetes with clustering to use all CPU cores, load config through environment variables rather than hardcoding, and implement graceful shutdown so in-flight requests finish cleanly on SIGTERM during deploys. I'd expose health/readiness endpoints so the orchestrator only routes traffic to instances that are actually ready, and monitor latency percentiles, error rates, and event loop lag to catch blocking issues early. For memory leaks, I'd track heapUsed over time and use heap snapshots to find what's accumulating. And architecturally, I'd keep CPU-heavy work off the main thread — worker_threads or a separate service — since Node's single-threaded model is great for I/O but bad for sustained computation."
