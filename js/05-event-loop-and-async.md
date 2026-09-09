# 05 — The Event Loop and Asynchronous JS

## What is it?

**What is it?**
JS is single-threaded — it has exactly ONE call stack and can literally do only one thing at a time. The event loop is the mechanism that lets JS *appear* to handle many things "at once" (timers, network requests, user clicks) without ever needing multiple threads — by coordinating the call stack, task queues, and Web/Node APIs.

**Why was it invented?**
If JS only had a call stack, any slow operation (like a network request or a file read) would freeze the entire program — the UI would be unresponsive (you literally could not click, scroll, or type, as the old notes correctly warned about synchronous AJAX). The event loop solves this by letting slow operations run *outside* the main thread (in the browser's Web APIs or Node's libuv thread pool), and only bringing their results back to the call stack when it's free.

## The Pieces Involved

1. **Call Stack** — executes synchronous code, one frame at a time.
2. **Web APIs (browser) / libuv & C++ APIs (Node)** — where async work (timers, DOM events, `fetch`, file I/O) actually happens, off the main JS thread.
3. **Macrotask Queue** (a.k.a. Callback Queue / Task Queue) — holds callbacks from `setTimeout`, `setInterval`, DOM events, `setImmediate` (Node), I/O callbacks.
4. **Microtask Queue** — holds callbacks from Promises (`.then`/`.catch`/`.finally`), `queueMicrotask()`, and (in Node) `process.nextTick` gets its own even-higher-priority queue that runs before other microtasks.
5. **Event Loop** — a continuously running process that checks: "Is the call stack empty? If yes, first drain the ENTIRE microtask queue, then take exactly ONE task from the macrotask queue, put it on the stack, and repeat."

## The Golden Rule of Ordering

**Synchronous code always runs first (call stack) → then ALL microtasks are drained → then ONE macrotask runs → then microtasks are drained again → then the next macrotask → ...**

Priority order (highest to lowest):
1. Currently executing synchronous code (call stack)
2. `process.nextTick()` queue (Node.js only — runs before other microtasks)
3. Microtask queue (Promise callbacks, `queueMicrotask`)
4. Macrotask queue (`setTimeout`, `setInterval`, `setImmediate`, I/O, UI rendering events)

## Classic Ordering Example (mined from old notes, expanded)

```js
console.log("1: sync");

setTimeout(() => console.log("2: macrotask (setTimeout)"), 0);

Promise.resolve().then(() => console.log("3: microtask (promise)"));

console.log("4: sync");

// Output order:
// 1: sync
// 4: sync
// 3: microtask (promise)
// 2: macrotask (setTimeout)
```

**Why this order?** All synchronous lines run first because they're already on the call stack — nothing can interrupt them. Once the stack is empty, the event loop checks the microtask queue BEFORE the macrotask queue, every single time. So the Promise callback (`.then`) always jumps ahead of a `setTimeout`, even a `setTimeout(fn, 0)` — "0ms" doesn't mean "immediately," it means "as soon as possible in the macrotask queue," which is still lower priority than any pending microtask.

## Node-specific: `process.nextTick` vs microtasks vs macrotasks

(Mined and corrected from the old Node notes, which had it roughly right.)

```js
console.log("first");

setTimeout(() => console.log("timeout (macrotask)"), 0);

setImmediate(() => console.log("immediate (macrotask, check phase)"));

process.nextTick(() => console.log("nextTick (highest priority queue)"));

Promise.resolve().then(() => console.log("promise (microtask)"));

console.log("last");

// Typical output:
// first
// last
// nextTick (highest priority queue)
// promise (microtask)
// timeout (macrotask)          <- order of setTimeout vs setImmediate at top-level
// immediate (macrotask, check phase)  <- is NOT guaranteed; depends on timing
```

Why: synchronous code (`first`, `last`) always finishes first. Then Node drains `process.nextTick` callbacks completely (its own dedicated queue, checked even before microtasks). Then it drains the microtask/Promise queue completely. THEN it moves into the macrotask phases of the event loop (timers phase runs `setTimeout`/`setInterval` callbacks, the check phase runs `setImmediate`). At the very top level of a script (not inside I/O), the order between `setTimeout(fn, 0)` and `setImmediate` is technically not guaranteed by spec — it depends on process startup timing — but inside an I/O callback, `setImmediate` always fires before a `setTimeout(fn, 0)`.

## Microtask vs Macrotask — Comparison Table

| | Microtask | Macrotask |
|---|---|---|
| Examples | `Promise.then/catch/finally`, `queueMicrotask`, `MutationObserver` | `setTimeout`, `setInterval`, `setImmediate` (Node), UI events, I/O callbacks |
| Priority | Higher — entire queue drains before next macrotask | Lower — only ONE task runs per event loop tick |
| Can starve the other? | Yes — if microtasks keep queueing more microtasks, macrotasks (and browser rendering!) can be delayed indefinitely | No — macrotasks yield back to the loop after each one |
| Browser rendering | Paint happens AFTER microtasks drain, typically between macrotasks | — |

## Rendering and the Event Loop (Browser)

Browsers try to repaint the screen at ~60fps. The rendering step is scheduled to happen after the microtask queue is empty and before the next macrotask, roughly per "frame." This is why:
- Heavy synchronous code blocks rendering entirely (the page "freezes").
- A `while(true)` loop of microtasks (e.g., a Promise chain that keeps re-queueing itself forever) can also starve rendering, because the browser never gets a chance to paint if microtasks never fully drain.
- `requestAnimationFrame` callbacks are scheduled specifically to run right before a repaint, distinct from both micro- and macrotasks.

## Real-world usage
- Debugging "why did my UI freeze" bugs — usually a long synchronous loop or a microtask that keeps re-scheduling itself.
- Predicting console.log output ordering — one of the most common interview questions at every level.
- Understanding why `async/await` (which is built on Promises) still yields to microtasks, not macrotasks, when awaiting.
- Never doing synchronous AJAX (mined from old notes) — it blocks the single thread, freezing all user interaction.

## How to explain in an interview (simple English)

"JS can only run one thing at a time because it has a single call stack. To handle things like timers or network calls without freezing everything, that async work is handed off to the browser or Node's internal APIs. When that work finishes, its callback doesn't jump straight back into the running code — it waits in a queue. The event loop's job is: once the call stack is empty, first run everything waiting in the microtask queue (Promises), completely, and only then take one thing from the macrotask queue (like `setTimeout`). That's why a `Promise.then` always logs before a `setTimeout`, even if the timeout is 0ms."

## Quick Reference

| Term | Meaning |
|---|---|
| Call stack | Executes sync code, one frame at a time |
| Web/Node APIs | Where async operations actually happen off-thread |
| Microtask queue | Promises, `queueMicrotask` — fully drained before next macrotask |
| Macrotask queue | `setTimeout`, `setInterval`, I/O — one task per event loop tick |
| `process.nextTick` (Node only) | Runs even before the microtask queue, after current operation |
| Event loop | The coordinator: stack empty? drain microtasks, then take one macrotask |
