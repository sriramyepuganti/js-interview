# 05. Async Patterns: Callbacks -> Promises -> Async/Await

## The evolution, in one sentence
Callbacks came first (simple, but nest badly) -> Promises fixed nesting and gave better error handling -> async/await made Promise-based code read like synchronous code. Each step was invented to fix a real pain point of the previous one.

---

## Callbacks and the error-first convention
**What is it?** A callback is just a function passed as an argument, to be called later when an async operation finishes. Node's convention: **error-first callbacks** — the callback's first parameter is always `error` (or `null` if there wasn't one), and the second (and beyond) are the actual result(s).

```js
const fs = require('fs');

fs.readFile('data.txt', 'utf-8', (err, data) => {
  if (err) {
    console.error('Failed to read file:', err.message);
    return;
  }
  console.log(data);
});
```

**Why the error-first convention?** Before this became standard, every library invented its own way to report errors (separate error callback? throw inside the callback? return an error object?). Standardizing on "error is always the first argument" made it possible to write generic error-handling helpers and made behavior predictable across the entire ecosystem.

**Why did we move away from raw callbacks? ("callback hell")**
When you need to do several async steps in sequence, callbacks nest inside callbacks inside callbacks:
```js
fs.readFile('a.txt', 'utf-8', (err, a) => {
  if (err) return handleError(err);
  fs.readFile('b.txt', 'utf-8', (err, b) => {
    if (err) return handleError(err);
    fs.writeFile('c.txt', a + b, (err) => {
      if (err) return handleError(err);
      console.log('done');
      // ...and it keeps growing sideways ("the pyramid of doom")
    });
  });
});
```
This is hard to read, hard to handle errors consistently in (you repeat the same `if (err)` check everywhere), and hard to compose (what if you want to run two things in parallel and wait for both?).

---

## Promises
**What is it?** A `Promise` is an object representing the eventual result of an async operation — it's either **pending**, **fulfilled** (resolved with a value), or **rejected** (failed with a reason). It gives you `.then()`, `.catch()`, and `.finally()` instead of nested callback arguments.

**Why was it invented?** To flatten the pyramid of doom and unify error handling — instead of checking `err` at every single step, you write one `.catch()` at the end that catches any failure from *any* step in the chain.

```js
const fs = require('fs/promises'); // Node's built-in Promise-based fs API

fs.readFile('a.txt', 'utf-8')
  .then((a) => fs.readFile('b.txt', 'utf-8').then((b) => a + b))
  .then((combined) => fs.writeFile('c.txt', combined))
  .then(() => console.log('done'))
  .catch((err) => console.error('Something failed:', err.message)); // ONE place for all errors
```

Promises also gave us clean **composition helpers**:
- `Promise.all([...])` — run several promises in parallel, wait for all to succeed (rejects fast if any fails).
- `Promise.allSettled([...])` — run in parallel, wait for all, regardless of individual success/failure.
- `Promise.race([...])` — resolves/rejects as soon as the *first* promise settles (useful for timeouts).

---

## Async/Await
**What is it?** Syntax sugar over Promises that lets you write async code that *looks* synchronous — no `.then()` chains, just `await` in front of a Promise-returning call, inside a function marked `async`.

**Why was it invented?** Even with Promises, chaining `.then()` for many sequential steps, or mixing loops/conditionals with `.then()`, was still awkward. Async/await lets you use normal `if`, `for`, `try/catch` — the exact control-flow constructs developers already know — around asynchronous code.

```js
const fs = require('fs/promises');

async function combineFiles() {
  try {
    const a = await fs.readFile('a.txt', 'utf-8');
    const b = await fs.readFile('b.txt', 'utf-8');
    await fs.writeFile('c.txt', a + b);
    console.log('done');
  } catch (err) {
    // try/catch works naturally here — this is the big win over .then/.catch chains
    console.error('Something failed:', err.message);
  }
}
```
Important: `await` only pauses *that async function*, not the whole Node process — the event loop is completely free to handle other work while waiting. Under the hood, `async`/`await` is still Promises; it's the same mechanism with nicer syntax.

**Common gotcha — accidental serialization:**
```js
// BAD: this awaits sequentially, taking the sum of both durations
const a = await fetchA();
const b = await fetchB();

// GOOD: runs both concurrently, taking the max of both durations
const [a, b] = await Promise.all([fetchA(), fetchB()]);
```

---

## `util.promisify` — bridging old callback APIs
**What is it?** A built-in Node utility that converts a standard error-first callback function into one that returns a Promise, so you can `await` it.

**Why was it invented?** Tons of Node's built-in APIs (and older third-party libraries) only expose callback-style functions. Rather than rewrite them all, Node gave us a converter so any well-behaved (error-first) callback function can be used with async/await.

```js
const fs = require('fs');
const util = require('util');

const readFileAsync = util.promisify(fs.readFile);

async function run() {
  const data = await readFileAsync('data.txt', 'utf-8');
  console.log(data);
}
```
(In modern code, prefer `require('fs/promises')` directly when available — but `promisify` is essential for third-party callback APIs that don't ship a Promise version.)

See `examples/promisify-and-async.js` for a complete runnable example with proper `try/catch`.

---

## EventEmitter pattern — when to use it instead of Promises
**What is it?** `EventEmitter` (from the built-in `events` module) lets an object emit **named events** that multiple listeners can subscribe to, independently of each other.

**Why was it invented?** Promises and async/await are designed for a **single eventual result** — one value, resolved once. But some things aren't "one result" — they're an ongoing *stream of occurrences* over time (multiple times, or maybe zero times, or you don't know in advance how many). A Promise can't naturally represent "this might fire 50 times" or "many different parts of the app want to react to this same occurrence" — that's what EventEmitter is for.

```js
const EventEmitter = require('events');

class OrderService extends EventEmitter {
  placeOrder(order) {
    // ... business logic ...
    this.emit('order:placed', order); // notify anyone listening, any number of times
  }
}

const orders = new OrderService();
orders.on('order:placed', (order) => console.log('Send confirmation email for', order.id));
orders.on('order:placed', (order) => console.log('Update inventory for', order.id));

orders.placeOrder({ id: 42 });
```

### When to use EventEmitter vs Promises — decision table

| Situation | Use |
|---|---|
| One async operation, one eventual result (success or failure) | Promise / async-await |
| Something that can happen **multiple times** (data chunks, clicks, incoming connections) | EventEmitter |
| **Multiple independent listeners** need to react to the same occurrence | EventEmitter |
| You need `try/catch`-style sequential error handling | Promise / async-await |
| Building something stream-like or plugin/hook-based | EventEmitter |

**Real-world usage:** Node's own core APIs use EventEmitter everywhere internally — streams (`data`, `end`, `error` events), HTTP servers (`request`, `connection`), and process signals (`process.on('SIGTERM', ...)`). Application code commonly uses it for internal pub/sub between modules without introducing a full message queue.

See `examples/event-emitter-demo.js` for a mini pub/sub example.

**How to explain this whole evolution in an interview:**
> "Callbacks were the original async pattern in Node, using the error-first convention so error handling was consistent. But chaining many callbacks led to 'callback hell' — deeply nested, hard to read code with repeated error checks. Promises fixed that by letting you chain `.then()` and centralize error handling in one `.catch()`, plus they gave composition helpers like `Promise.all`. Async/await then made Promise-based code look synchronous, so you could use normal `try/catch` and loops. `util.promisify` bridges older callback-based APIs into this Promise world. EventEmitter is a separate pattern for when something can fire multiple times or needs multiple independent listeners — not a one-time result, which is what Promises model."
