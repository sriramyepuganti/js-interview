# 09. Microservices and Scaling

## Monolith vs Microservices
**What is it?** A **monolith** is one codebase/deployable unit containing all of an application's functionality. **Microservices** split functionality into multiple small, independently deployable services that communicate over the network (HTTP/gRPC/message queues).

**Why did microservices get invented/popular?** As applications and teams grow, a monolith becomes hard to scale organizationally (many teams stepping on each other in one codebase), hard to deploy safely (one bug anywhere risks the whole app), and hard to scale selectively (you can't scale just the "image processing" part without scaling everything else). Microservices let teams own services independently, deploy independently, and scale only the parts that need it.

**The trade-off (this is the senior-level nuance):** Microservices trade code-level complexity for **operational** complexity — network calls can fail (unlike in-process function calls), you need service discovery, distributed tracing/logging, and you introduce eventual-consistency problems across services. Many teams adopt microservices too early and pay this operational cost before they actually have the scaling/organizational problem that justifies it.

| | Monolith | Microservices |
|---|---|---|
| Deployment | One unit, simpler pipeline | Many independent deployments, more complex pipeline |
| Scaling | Scale the whole app together | Scale individual services independently |
| Team ownership | Harder to split cleanly among large teams | Natural per-team/per-service ownership |
| Failure isolation | One bug can affect everything | A failing service can be isolated (with proper design) |
| Operational overhead | Low | High — networking, observability, service discovery, data consistency |
| Good starting point for | Small teams, early-stage products, unclear domain boundaries | Large orgs, well-understood domain boundaries, independent scaling needs |

**How to explain it in an interview:**
> "I'd generally start with a well-structured monolith unless there's a clear reason not to — it's simpler to build, deploy, and reason about. Microservices solve real problems around independent scaling and team ownership at larger scale, but they introduce real operational costs: network failures, distributed data consistency, more complex observability. The decision should be driven by actual organizational/scaling pain, not by trend-following."

---

## `child_process` vs `worker_threads` vs Clustering
This is one of the most commonly confused senior-level topics — they solve **different** problems.

### `child_process`
**What is it?** Spawns a completely separate OS **process** (its own memory space, can even run a different program/language, e.g., a Python script) and lets you communicate with it via stdin/stdout or IPC.

```js
const { exec } = require('child_process');
exec('ls -la', (err, stdout, stderr) => {
  if (err) return console.error(err);
  console.log(stdout);
});
```
**When to use it:** Running external programs (ImageMagick, ffmpeg, a Python ML script), or when you need real OS-level process isolation (a crash in the child doesn't crash your main process at all).

#### `spawn` vs `exec` vs `execFile` vs `fork` — the four methods, and why four exist
**Why does `child_process` even have four ways to do "run something"?** Because "run something external" covers genuinely different shapes of problem — a huge shell command whose output you want to buffer with a single callback, vs. a long-running program streaming megabytes of output, vs. running another Node script that you want to talk to like a first-class collaborator. Each method trades off buffering, shell access, and IPC differently:

| Method | Shell involved? | Output handling | Best for |
|---|---|---|---|
| `exec(command, cb)` | Yes — runs via `/bin/sh` (or `cmd.exe`), so you can use pipes/glob (`ls \| grep foo`) | Buffers the **entire** stdout/stderr in memory, hands it to you in one callback | Short commands with output you know is small (a `git rev-parse`, a shell one-liner) |
| `execFile(file, args, cb)` | No — runs the executable directly, no shell parsing | Buffered, like `exec` | Same as `exec`, but safer — since there's no shell, you avoid shell-injection risk if `args` contains user input |
| `spawn(command, args)` | No (by default) | **Streams** stdout/stderr as `data` events — never buffers the whole output in memory | Long-running processes or large output (tailing a log, `ffmpeg` transcoding, anything where buffering everything in RAM would be wasteful/dangerous) |
| `fork(modulePath)` | N/A — always runs another **Node.js** script | Streaming, plus a built-in bidirectional **IPC channel** (`.send()`/`.on('message')`) for passing JS objects, not just text | Spawning a Node.js helper/worker process you want to exchange structured messages with, not just read text output from |

```js
const { exec, execFile, spawn, fork } = require('child_process');

// exec — buffers everything, shell-parsed. DANGEROUS with unsanitized user input
// (string concatenation into a shell command is a command-injection risk, same family
// of bug as SQL injection in file 07 — never do exec(`ls ${userInput}`) with raw input).
exec('git rev-parse HEAD', (err, stdout) => console.log('HEAD commit:', stdout.trim()));

// execFile — no shell, so passing args as an array is safe even if they came from user input
execFile('git', ['rev-parse', 'HEAD'], (err, stdout) => console.log(stdout.trim()));

// spawn — streams output chunk by chunk, doesn't buffer a potentially huge output in memory
const grep = spawn('grep', ['ERROR', 'app.log']);
grep.stdout.on('data', (chunk) => process.stdout.write(chunk)); // handle each chunk as it arrives
grep.on('close', (code) => console.log(`grep exited with code ${code}`));

// fork — a full Node.js child, with a structured-message IPC channel (not just text streams)
// child.js:  process.on('message', (msg) => process.send({ doubled: msg.n * 2 }));
const child = fork('./child.js');
child.send({ n: 21 });
child.on('message', (msg) => console.log('Got back:', msg)); // { doubled: 42 }
```

**Important distinction from `cluster.fork()` above:** `child_process.fork()` and `cluster.fork()` are **different APIs that happen to share a name** — `cluster.fork()` (used above) spawns another copy of *the same server*, specifically to share a listening port across CPU cores. `child_process.fork()` spawns a Node process running *any script you point it at*, for general-purpose parallel work/IPC — it has nothing to do with sharing a port. (In fact, `cluster` is implemented internally *using* `child_process.fork()`.)

See `examples/child-process-methods-demo.js` for a runnable comparison of all four.

### `worker_threads`
**What is it?** Runs JavaScript on a separate **thread** within the *same* process, with the ability to share memory efficiently (via `SharedArrayBuffer`/`Atomics` or transferring `ArrayBuffer`s) — lighter weight than spawning a whole new process.

**Why was it invented?** Before `worker_threads` (stabilized in Node 12), the only way to parallelize CPU-heavy JS work was `child_process`, which is heavier (full process overhead) and awkward for sharing data (everything has to be serialized and sent, no shared memory). `worker_threads` was added specifically so **CPU-bound JavaScript** work could run in parallel without blocking the main event loop, and without the overhead of a full separate process.

```js
// main.js
const { Worker } = require('worker_threads');
const worker = new Worker('./heavy-task.js', { workerData: { n: 40 } });
worker.on('message', (result) => console.log('Result:', result));
worker.on('error', (err) => console.error(err));

// heavy-task.js
const { workerData, parentPort } = require('worker_threads');
function fib(n) { return n < 2 ? n : fib(n - 1) + fib(n - 2); } // CPU-bound work
parentPort.postMessage(fib(workerData.n));
```

### Clustering (the `cluster` module)
**What is it?** Spawns multiple **copies of your entire Node process**, each on its own CPU core, all listening on the same port — the OS/Node distributes incoming connections across them. Used for **scaling I/O-bound web servers** across multiple cores, not for splitting one CPU-heavy computation.

```js
const cluster = require('cluster');
const os = require('os');

if (cluster.isPrimary) {
  const cpuCount = os.cpus().length;
  for (let i = 0; i < cpuCount; i++) cluster.fork(); // one worker process per CPU core
  cluster.on('exit', (worker) => {
    console.log(`Worker ${worker.process.pid} died, restarting...`);
    cluster.fork(); // basic self-healing
  });
} else {
  require('./server'); // each worker runs its own full copy of the Express app, etc.
}
```
See `examples/clustering-example.js` for a runnable version.

### Decision table — the single most important senior-level distinction here

| Situation | Right tool | Why |
|---|---|---|
| CPU-bound work (image resize, heavy math, compression) blocking the event loop | `worker_threads` | Offloads pure computation to another thread without full process overhead; can share memory |
| Need to run an external program/binary, or want full crash isolation | `child_process` | Separate OS process, independent memory, can run non-Node programs |
| I/O-bound web server (typical REST API) needs to use all CPU cores | `cluster` (or PM2's cluster mode) | One process per core, each independently handling connections; the workload itself is I/O-bound, not CPU-bound, so this is about *parallel request handling*, not parallel computation |
| Need true fault isolation between unrelated subsystems | `child_process` (or actual microservices) | A crash doesn't take down the parent |

**How to explain it in an interview:**
> "child_process spawns a whole separate OS process — useful for running external programs or when you need full crash isolation, but heavier and communication is more limited. worker_threads runs JS on a separate thread within the same process, specifically to offload CPU-bound work off the main event loop without the overhead of a full process, and it supports shared memory. Clustering is different again — it's about running multiple copies of your whole server process, one per CPU core, so an I/O-bound API can use all available cores to handle more concurrent connections, not to parallelize one heavy computation."

---

## Horizontal scaling & load balancing
**What is it?** Horizontal scaling = running more instances of your app (across processes/machines) rather than making one instance bigger (vertical scaling). A **load balancer** sits in front and distributes incoming traffic across the instances.

**Why it matters for Node specifically:** since one Node process only uses one core for JS execution, horizontal scaling (clustering within a machine, and/or multiple machines behind a load balancer) is the standard way to use available hardware and handle more concurrent load. **PM2** is a common process manager that handles clustering, auto-restart on crash, and zero-downtime reloads without you hand-rolling the `cluster` module logic yourself.
```
pm2 start server.js -i max   # -i max = one worker process per CPU core, PM2 manages it
```
**Practical note:** once you run multiple instances, anything "in-memory" on one instance (sessions, caches, rate-limit counters) isn't visible to the others — you need a shared store like Redis for that state (see below), or you go fully stateless (JWT).

---

## Message Queues (brief)
**What is it?** A message queue lets one service **publish** a message and one or more other services **consume** it asynchronously, instead of calling each other directly and synchronously over HTTP.

**Why was it invented?** Direct service-to-service HTTP calls create tight coupling — if the receiving service is down or slow, the caller is blocked/fails too. Queues (RabbitMQ, Kafka) decouple producers from consumers: the producer just drops a message and moves on; consumers process at their own pace, and messages can be retried/replayed if a consumer was temporarily down.

**Real-world usage:** "User signed up" event triggers welcome email (async, doesn't block the signup response), order processing pipelines, event-driven microservices architectures. **RabbitMQ** is a traditional message broker (good for task queues, routing). **Kafka** is a distributed event streaming platform (good for high-throughput event logs, replayable history, many consumers reading the same stream independently).

---

## Caching with Redis
**What is it?** Redis is an in-memory key-value store, commonly used as a cache layer in front of a slower database, or as shared state across multiple app instances.

**Why was it invented / why use it?** Database queries (especially complex/aggregated ones) are relatively slow and expensive to repeat. Caching the result in Redis (in-memory, sub-millisecond reads) for frequently-requested, rarely-changing data massively cuts database load and response time. It also solves the "shared state across multiple Node instances" problem mentioned above — sessions, rate-limit counters, feature flags can live in Redis instead of a single process's memory.

```js
const redis = require('redis');
const client = redis.createClient();
await client.connect();

async function getUser(id) {
  const cached = await client.get(`user:${id}`);
  if (cached) return JSON.parse(cached); // cache hit — skip the DB entirely

  const user = await db.users.findById(id); // cache miss — go to the source of truth
  await client.set(`user:${id}`, JSON.stringify(user), { EX: 300 }); // cache for 5 minutes
  return user;
}
```

### Cache invalidation strategies — "the hardest problem in computer science"
**What is it?** Invalidation is *how and when* a cache entry gets removed or refreshed once the underlying data changes — a cache that never invalidates just serves stale data forever; a phrase you'll hear senior interviewers use almost verbatim is Phil Karlton's line: "there are only two hard things in computer science: cache invalidation, and naming things."

**Why is this genuinely hard?** The cache is a second, denormalized copy of the truth (the DB). The moment the DB row changes, the cached copy is a lie until something corrects it — and "something" has to happen reliably, even if that write came from a different service, a background job, or a direct DB edit that never went through your API at all.

**The main strategies, and their trade-offs:**

| Strategy | How it works | Trade-off |
|---|---|---|
| **TTL expiry (the pattern used above)** | Every cached entry gets a max lifetime (`EX 300` = 5 minutes); after that it's simply gone and the next read re-fetches from the DB | Simplest to implement, but there's an inherent window (up to the TTL) where the cache can serve stale data after an update — you're trading some staleness for simplicity |
| **Cache-aside with explicit invalidation (write-through-ish)** | On every write/update to the DB, your application code also explicitly `DEL`s (or updates) the corresponding cache key, right after the write succeeds | No staleness window, but every single code path that writes that data must remember to invalidate — easy to forget in one code path (a bulk-update script, a different service) and end up with silent staleness |
| **Write-through cache** | Writes go *through* the cache layer itself (the cache updates itself synchronously as part of the write), rather than the app remembering to invalidate separately | Removes the "forgot to invalidate" risk since the write path itself owns it, but couples your write path to the cache being available/fast |
| **Event-based invalidation** | A write publishes an event (e.g., via Redis pub/sub, or a message queue) that any interested cache layer subscribes to and reacts to by invalidating its own copy | Scales cleanly to *multiple* services/caches that all need to invalidate on the same underlying change, without the writer needing to know who's caching what — but adds infrastructure (a pub/sub layer) and another moving part that can itself fail silently |

**Real-world usage:** A product-catalog API might use plain TTL (a price change being stale for up to 60 seconds is an acceptable trade-off for simplicity). A user-profile-update endpoint more often uses cache-aside invalidation (`DEL user:${id}` right after the DB write) since serving someone their *old* name/avatar for 5 minutes after they just changed it is a visibly broken experience. A multi-service architecture where several services cache the same "product" data often reaches for event-based invalidation so a price update in the Inventory service correctly busts the cache the Storefront service is holding too.

**How to explain it in an interview:**
> "The simplest cache invalidation is just a TTL — accept some staleness window in exchange for simplicity. Where staleness is visibly wrong to the user, I'd invalidate explicitly right after the write, in the same code path that wrote the DB — that's cache-aside invalidation. The failure mode there is forgetting to invalidate in some other code path that also writes that data, which is exactly the case event-based invalidation solves — the writer publishes a change event, and every cache that cares subscribes and invalidates itself, so you don't need every writer to know about every cache."

See `examples/cache-invalidation-demo.js` for a runnable side-by-side comparison of TTL-only vs cache-aside invalidation, using the same underlying data.

**How to explain scaling in an interview:**
> "Since Node uses one thread per process, scaling means running multiple processes — clustering within a machine (or PM2), and multiple machines behind a load balancer, for horizontal scaling. Once you're horizontal, anything in-memory per-instance, like sessions or caches, needs to move to a shared store like Redis, or you go stateless with JWT. For decoupling services so one being slow/down doesn't cascade, message queues like RabbitMQ or Kafka let services communicate asynchronously instead of via tightly-coupled direct calls."
