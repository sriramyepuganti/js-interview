# 06 — Promises and async/await

## Why were Promises invented? (Callback Hell)

**What problem existed before?**
Before Promises, async operations used plain callbacks. When you needed to chain several async steps (fetch a user, then their orders, then order details), callbacks nested inside callbacks inside callbacks — this became known as "callback hell" or "the pyramid of doom":

```js
getUser(id, (user) => {
  getOrders(user.id, (orders) => {
    getOrderDetails(orders[0].id, (details) => {
      // deeply nested, hard to read, hard to handle errors consistently
      console.log(details);
    }, handleError);
  }, handleError);
}, handleError);
```

Problems: unreadable nesting, error handling duplicated at every level, hard to run things in parallel, and "inversion of control" — you hand your callback to some other function and just have to trust it will call it correctly (once, with the right arguments, handling errors properly).

**What is a Promise?**
An object representing the *eventual* result of an async operation — a placeholder for a value that doesn't exist yet but will (or will fail to) at some point.

## Promise States

| State | Meaning | Can transition to |
|---|---|---|
| `pending` | Initial state, operation not finished yet | `fulfilled` or `rejected` |
| `fulfilled` | Operation succeeded, has a resulting value | (final, can't change again) |
| `rejected` | Operation failed, has a reason/error | (final, can't change again) |

A promise can only settle (fulfill or reject) ONCE — this immutability-after-settling is important; it's what makes chains reliable.

```js
const promise = new Promise((resolve, reject) => {
  setTimeout(() => {
    const success = true;
    success ? resolve("Data loaded") : reject(new Error("Failed"));
  }, 1000);
});
```

## Chaining

**Why chaining matters:** it turns the nested pyramid into a flat, readable sequence, and each `.then` automatically gets a NEW promise, letting you keep composing.

```js
getUser(id)
  .then(user => getOrders(user.id))
  .then(orders => getOrderDetails(orders[0].id))
  .then(details => console.log(details))
  .catch(err => console.error("Something failed:", err)); // ONE catch handles errors from ANY step above
```

Returning a value from `.then` wraps it in a new resolved promise automatically; returning a promise from `.then` "flattens" it — the chain waits for it before continuing.

## Promise Combinators

| Method | Resolves when | Rejects when | Result | Typical use case |
|---|---|---|---|---|
| `Promise.all` | ALL promises fulfill | ANY promise rejects (fails fast) | Array of all results, in order | All results required — e.g., load 3 API endpoints needed to render a page |
| `Promise.allSettled` | ALL promises settle (success or fail) | Never rejects | Array of `{status, value/reason}` objects | Want the outcome of every task even if some fail — e.g., batch-uploading files, report which succeeded |
| `Promise.race` | Whichever settles FIRST (success or fail) | Whichever settles FIRST if it's a rejection | Value/reason of the first settled promise | Timeout pattern — race an API call against a timer |
| `Promise.any` | FIRST one to fulfill | Only if ALL reject (`AggregateError`) | Value of first successful promise | Try multiple fallback servers/CDNs, use whichever responds successfully first |

```js
// Parallel API calls — a very common real-world pattern
const [user, posts, comments] = await Promise.all([
  fetch("/api/user").then(r => r.json()),
  fetch("/api/posts").then(r => r.json()),
  fetch("/api/comments").then(r => r.json()),
]);
```

## async/await — Syntactic Sugar Over Promises

**What is it?**
`async/await` lets you write asynchronous code that *looks* synchronous — no `.then` chains — while still being built entirely on top of Promises under the hood.

- An `async function` ALWAYS returns a Promise (even if you `return` a plain value, it gets auto-wrapped).
- `await` pauses execution of that async function (NOT the whole program) until the awaited promise settles, then unwraps the value (or throws, if rejected).

```js
async function loadUserData(id) {
  try {
    const user = await getUser(id);       // pauses here until resolved
    const orders = await getOrders(user.id);
    return orders;
  } catch (err) {
    console.error("Failed to load:", err); // catches rejection from EITHER await above
    throw err; // re-throw if caller needs to know too
  }
}
```

**Why was it invented on top of Promises?** Even with `.then` chaining, deeply branched async logic (conditionals, loops, try/catch around async steps) was still awkward with pure Promise chains. `async/await` lets you use normal control-flow constructs (`if`, `for`, `try/catch`) with async code exactly like sync code, which drastically improves readability, while the engine still uses Promises + the microtask queue behind the scenes.

## Error Handling

```js
async function fetchWithHandling() {
  try {
    const res = await fetch("/api/data");
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (err) {
    // catches: network failure, non-2xx if you throw manually, JSON parse errors
    console.error(err);
    return null; // fallback value
  } finally {
    console.log("Request attempt finished"); // always runs, success or fail
  }
}
```

A common trap: forgetting `await` before a rejecting promise inside `try` means the `catch` never sees it (it becomes an unhandled rejection instead).

## Real-world usage
- Parallel independent API calls with `Promise.all` (dashboard widgets, multi-source page load).
- `Promise.allSettled` for batch operations where partial failure is acceptable (bulk email sends, file uploads).
- `Promise.race` for implementing a timeout wrapper around a slow API call.
- `async/await` in nearly all modern async code — Express route handlers, React data-fetching hooks, Node scripts.
- Converting an old callback-based API into a Promise-based one (`util.promisify` in Node, or manually wrapping in `new Promise(...)`) — see `examples/promises-async-await.js`.

## How to explain in an interview (simple English)

"Promises exist because chaining callbacks for multiple async steps got messy and unreadable — 'callback hell.' A Promise is a placeholder for a value that will exist later; it's either pending, fulfilled, or rejected, and once it settles, it can't change again. `.then` lets you chain steps in a flat, readable way, and `.catch` handles errors from anywhere in that chain. `async/await` is just a nicer way to write the same Promise-based code — it lets you use normal `try/catch` and write async code that reads top-to-bottom like sync code, but under the hood it's still all Promises and the microtask queue."

## Quick Reference

| Term | One-liner |
|---|---|
| Callback hell | Deeply nested callbacks, hard to read/maintain/error-handle |
| Promise | Object representing an eventual async result |
| States | pending → fulfilled or rejected (final, one-time transition) |
| `.then/.catch/.finally` | Chain success/error/cleanup handlers |
| `Promise.all` | All must succeed, fails fast |
| `Promise.allSettled` | Wait for all, get every outcome |
| `Promise.race` | First to settle wins |
| `Promise.any` | First to succeed wins, ignores early failures |
| `async/await` | Sugar over Promises — write async code with sync-looking syntax |
