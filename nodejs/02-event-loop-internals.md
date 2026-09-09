# 02. Event Loop Internals

## What is the Event Loop?
**What is it?** The event loop is the mechanism inside Node (implemented by libuv) that lets a single JS thread handle many concurrent operations. It's a loop that continuously checks: "Is there a callback ready to run?" and runs it, cycling through a fixed set of **phases**, each with its own callback queue.

**Why was it invented?** JS itself has a call stack and can only run one thing at a time. Something has to decide, after an async operation (timer, file read, network response) completes, *when* to run its callback relative to everything else pending. The event loop is that scheduler — it's what makes "non-blocking I/O" actually orderly instead of chaotic.

**Real-world usage:** Every time you use `setTimeout`, an HTTP request, a database call, or a file read, you're relying on the event loop to eventually pick up the completed operation's callback and run it in the correct phase. Debugging weird ordering issues ("why did my callback run before/after this other one?") almost always comes back to understanding these phases.

---

## The 6 Phases (per event loop tick)

```
   ┌───────────────────────────┐
┌─>│           timers          │  setTimeout, setInterval callbacks whose time has expired
│  └─────────────┬─────────────┘
│  ┌─────────────┴─────────────┐
│  │     pending callbacks     │  I/O callbacks deferred from previous cycle (e.g. certain TCP errors)
│  └─────────────┬─────────────┘
│  ┌─────────────┴─────────────┐
│  │       idle, prepare       │  internal use only, rarely relevant
│  └─────────────┬─────────────┘
│      ┌─────────┴──────────┐
│      │         poll        │  retrieve new I/O events (file, network); executes I/O callbacks
│      └─────────┬──────────┘
│  ┌─────────────┴─────────────┐
│  │           check           │  setImmediate() callbacks run here
│  └─────────────┬─────────────┘
│  ┌─────────────┴─────────────┐
└──┤       close callbacks     │  e.g. socket.on('close', ...)
   └────────────────────────────┘
```

1. **timers** — runs `setTimeout`/`setInterval` callbacks whose delay has elapsed.
2. **pending callbacks** — runs certain I/O callbacks that were deferred to this cycle (e.g. some TCP error callbacks).
3. **idle, prepare** — internal bookkeeping; not something you interact with directly.
4. **poll** — the big one: retrieves new I/O events (incoming data, completed file reads, etc.) and executes their callbacks. Node will wait here if nothing else is scheduled and no timers are due.
5. **check** — `setImmediate()` callbacks run here, always *after* the poll phase completes.
6. **close callbacks** — handles things like `socket.on('close', ...)`.

After each phase — and actually after **each individual callback** — Node drains the **microtask queues** (see below) before moving to the next callback/phase.

---

## Macrotasks vs Microtasks (the Node-specific nuance)
**What is it?** "Macrotasks" are callbacks scheduled by the event loop phases above (timers, I/O, `setImmediate`, close). "Microtasks" are `process.nextTick()` callbacks and resolved/rejected `Promise` `.then`/`.catch`/`.finally` callbacks (and `queueMicrotask`).

**The critical Node-specific rule:** Node has **two separate microtask-like queues**, and they are **not equal priority**:
1. `process.nextTick()` queue — checked **first**.
2. Promise microtask queue — checked **second**.

Both queues are fully drained **before the event loop moves to the next phase or the next macrotask callback.** And critically, `process.nextTick` always wins over Promise microtasks *within the same round*.

```js
console.log('start');

setTimeout(() => console.log('timeout'), 0);

Promise.resolve().then(() => console.log('promise'));

process.nextTick(() => console.log('nextTick'));

console.log('end');

// Output:
// start
// end
// nextTick     <- process.nextTick queue drains first
// promise      <- then Promise microtask queue drains
// timeout      <- then the event loop moves into the timers phase (macrotask)
```

**Why does this matter?** `process.nextTick` runs so eagerly that if you recursively call it, you can **starve the event loop entirely** — I/O, timers, everything else waits forever because Node keeps draining the nextTick queue before proceeding. This is a real footgun; it's why `process.nextTick` should be used sparingly (e.g., to ensure a callback always runs asynchronously, right after the current operation, before anything else) rather than as a general-purpose "defer this" tool. For most "run this async, after current sync code" use cases, prefer `Promise`-based scheduling or `queueMicrotask`.

**Real-world usage:** Library authors use `process.nextTick` to guarantee a callback fires asynchronously (never synchronously) even if the result is already available — this keeps APIs consistent ("always async, never sometimes sync"). Application code rarely needs it directly; async/await + Promises cover almost everything.

---

## `setTimeout` vs `setImmediate` — ordering

**What is it?** Both schedule a callback to run "later," but in different phases: `setTimeout(fn, 0)` fires in the **timers** phase; `setImmediate(fn)` fires in the **check** phase (right after poll).

**The rule that determines ordering:**
- **Inside the main module (top-level script), the order between `setTimeout(fn, 0)` and `setImmediate(fn)` is *not guaranteed*** — it depends on process startup performance, because entering the event loop's timers phase might happen before or after the 0-1ms timer threshold has technically elapsed.
- **Inside an I/O callback (e.g., inside `fs.readFile`'s callback), `setImmediate` is *always* guaranteed to run before `setTimeout(fn, 0)`** — because after an I/O callback finishes (poll phase), the very next phase is **check** (`setImmediate`), while `setTimeout` has to wait for the loop to come back around to the **timers** phase on the *next* iteration.

```js
// Example mined from original notes, ex-1: not inside I/O, order can vary run to run
console.log('first');
setTimeout(() => console.log('third-ish'), 0);
setImmediate(() => console.log('fourth-ish'));
process.nextTick(() => console.log('second'));
// Guaranteed: 'first' then 'second' (nextTick always wins vs timers/immediate)
// Not strictly guaranteed which of setTimeout(0) vs setImmediate fires next at top level

// Example mined from original notes, ex-2: inside fs I/O callback, ordering IS guaranteed
const fs = require('fs');
fs.readFile(__filename, () => {
  setTimeout(() => console.log('timeout'), 0);
  setImmediate(() => console.log('immediate'));
  // Guaranteed output here: 'immediate' before 'timeout'
  // because after I/O (poll phase) completes, 'check' phase (setImmediate) runs next,
  // and 'timers' phase only comes around on the following loop iteration.
});
```

See `examples/event-loop-ordering.js` for runnable variations including `process.nextTick` starvation and Promise vs nextTick ordering.

---

## Practical debugging implications
- **A blocked event loop = a frozen server.** If a request handler does heavy synchronous work (a huge loop, synchronous crypto, `JSON.parse` on a massive payload), *every other request* — timers, incoming sockets, everything — waits, because there's only one thread and the loop can't move to the next phase until the current callback returns.
- **Recursive `process.nextTick` starves I/O.** If you keep re-scheduling `process.nextTick` inside itself, the event loop never gets to the poll phase, so no network/file I/O completes. This has caused real production incidents.
- **`setInterval` inside a callback that's slower than the interval** builds up a backlog — Node doesn't run overlapping intervals concurrently; they queue up right after each other, which can silently drift your timing.
- **Tools:** `--prof` and `--inspect` (see file 10) help you find what's actually blocking the loop. Also watch `process.hrtime()`-based loop-lag metrics in production (tools like `clinic.js`, `blocked-at`, or simple lag-monitoring middlewares).

**How to explain this section in an interview:**
> "Node's event loop has 6 phases per tick — timers, pending callbacks, idle/prepare, poll, check, and close callbacks. On top of that, Node drains two microtask queues between every callback: `process.nextTick` first, then Promise callbacks — and both run before the loop even considers moving phases. `setImmediate` runs in the check phase, right after poll, so inside an I/O callback it's guaranteed to fire before a `setTimeout(fn, 0)`, but at the top level that ordering isn't guaranteed. The big practical risk is that any of these — recursive nextTick calls, or plain CPU-heavy sync code — can block the loop and freeze the whole server, since there's only one thread."
