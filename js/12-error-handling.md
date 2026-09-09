# 12 — Error Handling

## try / catch / finally

**What is it?**
A control structure that lets you run code that might fail (`try`), handle the failure gracefully instead of crashing (`catch`), and run cleanup code regardless of success or failure (`finally`).

**Why was it invented?**
Without it, any thrown error immediately stops execution and propagates up the call stack until something catches it (or the program/page crashes). `try/catch` gives you a controlled place to recover, log, retry, or show a fallback UI instead of the whole app dying.

```js
try {
  const data = JSON.parse(invalidJson); // throws SyntaxError
} catch (err) {
  console.error("Failed to parse:", err.message);
} finally {
  console.log("This always runs, error or not — great for cleanup (closing a connection, hiding a spinner)");
}
```

Important nuance: `try/catch` only catches **synchronous** errors thrown within its block. It does NOT catch errors from callbacks scheduled asynchronously (e.g., inside a `setTimeout`) unless you're using `await` (because `await` re-throws inside the same async function, which is what makes `try/catch` work with it — see file 06).

```js
try {
  setTimeout(() => { throw new Error("boom"); }, 100); // NOT caught — this runs later, outside the try block's active stack
} catch (e) {
  console.log("never reached");
}
```

## Standard Built-in Error Types

| Error type | When it's thrown |
|---|---|
| `SyntaxError` | Invalid code syntax (e.g., malformed JSON in `JSON.parse`) |
| `ReferenceError` | Using an undeclared variable, or accessing a `let`/`const` in its TDZ |
| `TypeError` | Calling something that isn't a function, or operating on the wrong type (e.g., `null.foo`) |
| `RangeError` | A value is outside an allowed range (e.g., invalid array length, stack overflow) |
| `URIError` | Malformed URI in `encodeURI`/`decodeURI` |
| `EvalError` | Legacy, rarely thrown by modern engines |

## Custom Error Classes

**What is it?**
Extending the built-in `Error` class to create domain-specific error types that carry extra context (status codes, error codes, field names) and can be distinguished with `instanceof`.

**Why invented:** A generic `Error("Something went wrong")` gives no way to programmatically distinguish "the network failed" from "the user's input was invalid" from "they're not authorized." Custom error classes let calling code branch on error TYPE, not fragile string-matching on `.message`.

```js
class ValidationError extends Error {
  constructor(message, field) {
    super(message); // must call super() first — sets up the base Error behavior (message, stack)
    this.name = "ValidationError"; // shows up in stack traces instead of generic "Error"
    this.field = field;
  }
}

class ApiError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.name = "ApiError";
    this.statusCode = statusCode;
  }
}

function validateAge(age) {
  if (age < 0) throw new ValidationError("Age cannot be negative", "age");
}

try {
  validateAge(-5);
} catch (err) {
  if (err instanceof ValidationError) {
    console.log(`Invalid field: ${err.field}`); // handle validation errors specifically
  } else if (err instanceof ApiError) {
    console.log(`API failed with status ${err.statusCode}`);
  } else {
    throw err; // unknown error — don't swallow it, let it propagate
  }
}
```

## `Error.cause` — Chaining Errors (ES2022)

**What is it?**
A standard second argument to `Error`'s constructor — `new Error(message, { cause: originalError })` — that lets you wrap a low-level error inside a higher-level one without losing the original.

**Why was it invented?**
Before this, re-throwing a more meaningful error inside a `catch` block meant you had to choose: throw the new, more useful error (and lose the original stack/details forever), or throw the original (and lose the higher-level context about what your code was trying to do). `cause` lets you keep both.

```js
async function loadUserProfile(id) {
  try {
    return await fetchUser(id);
  } catch (err) {
    // wrap it: a caller sees "Failed to load user profile" but the ORIGINAL network error is preserved
    throw new Error(`Failed to load user profile for id ${id}`, { cause: err });
  }
}

try {
  await loadUserProfile(42);
} catch (err) {
  console.error(err.message);       // "Failed to load user profile for id 42"
  console.error(err.cause);         // the original fetch/network error, fully intact
}
```

**Real-world usage:** logging/monitoring tools (Sentry, etc.) can walk `.cause` chains to show the full failure chain instead of just the outermost, most-generic message — critical for debugging errors that pass through several layers (DB → service → API route → client).

---

## Async Error Handling

**Promises:**
```js
fetchData()
  .then(data => process(data))
  .catch(err => console.error("Caught in chain:", err)); // catches rejections from anywhere above it
```

**async/await:**
```js
async function loadData() {
  try {
    const data = await fetchData(); // if fetchData's promise rejects, it throws HERE, catchable normally
    return process(data);
  } catch (err) {
    console.error("Caught with try/catch:", err);
  }
}
```

**Common trap:** forgetting to `return` or `await` a promise inside a `try` means its rejection escapes as an "unhandled promise rejection" instead of being caught.
```js
async function buggy() {
  try {
    doAsyncThing(); // missing "await"! If this rejects, catch below never sees it
  } catch (e) {
    console.log("never called for the async rejection above");
  }
}
```

## Global Error Handlers

**What is it?**
Last-resort, app-wide hooks that catch errors which weren't handled anywhere else — used for logging/monitoring (e.g., sending to Sentry/Datadog) so you at least know production errors happened, even if you can't recover from them at that point.

**Browser:**
```js
window.onerror = function (message, source, lineno, colno, error) {
  console.error("Global error caught:", message, error);
  // send to error-tracking service
  return true; // prevents the default browser console error (optional)
};

window.addEventListener("unhandledrejection", (event) => {
  console.error("Unhandled promise rejection:", event.reason);
  event.preventDefault(); // stops it from also logging to console as "uncaught"
});
```

**Node.js equivalents:**
```js
process.on("uncaughtException", (err) => {
  console.error("Uncaught exception:", err);
  // log it, then usually still exit — the process may be in an unknown/unsafe state
  process.exit(1);
});

process.on("unhandledRejection", (reason, promise) => {
  console.error("Unhandled promise rejection:", reason);
});
```

**Why these exist:** No matter how careful your `try/catch` coverage is, some error will eventually slip through (a typo in a rarely-hit code path, a third-party library throwing unexpectedly). Global handlers are the safety net that ensures you at least SEE and LOG these instead of silently failing or crashing without a trace.

## Real-world usage
- API client wrappers throw custom `ApiError`/`NetworkError` classes so calling code can branch cleanly (retry on network error, show a login prompt on 401, show a generic toast otherwise).
- Global handlers wired up to error-monitoring services (Sentry, Rollbar, Datadog RUM) in virtually every production web app.
- React Error Boundaries are the component-tree-scoped equivalent for catching rendering errors that plain `try/catch` can't catch (since React rendering is not synchronous function-call code you wrap manually).

## How to explain in an interview (simple English)

"`try/catch` lets you run risky code and handle failure without crashing the whole program, and `finally` always runs for cleanup regardless of outcome. It's important to know it only catches synchronous errors in that block — with promises you need `.catch()`, and with `async/await` you need `try/catch` around the `await` itself. For real apps, I'd create custom Error subclasses so I can tell different failure types apart with `instanceof`, instead of guessing from a string message. And no matter how much I handle locally, I'd still wire up a global handler — `window.onerror`/`unhandledrejection` in the browser, or `process.on('uncaughtException'/'unhandledRejection')` in Node — as a safety net to log anything that slips through."
