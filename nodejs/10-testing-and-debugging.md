# 10. Testing and Debugging

## Why testing backend code matters
**What is it?** Automated tests are code that verifies your application code behaves correctly, run repeatedly without a human manually clicking through scenarios.

**Why was it invented / why it matters for backends specifically?** Backend bugs are often invisible until they hit production — a broken edge case in payment logic, an off-by-one in pagination, a race condition — and manual testing doesn't scale as the codebase grows or as multiple developers touch the same code. Automated tests act as a safety net: they catch regressions when someone changes code months later without knowing all the original edge cases, and they document expected behavior far more reliably than comments.

**Real-world usage:** CI pipelines run the test suite on every pull request, blocking merges if tests fail — this is the actual mechanism that lets teams ship confidently without a human manually re-testing everything each time.

---

## Unit vs Integration Testing

| | Unit Test | Integration Test |
|---|---|---|
| Scope | One function/module in isolation | Multiple parts working together (e.g., API route -> DB) |
| Dependencies | Mocked/stubbed (no real DB, no real network) | Often real or realistic (test DB, in-memory DB) |
| Speed | Very fast | Slower |
| What it catches | Logic bugs in a single unit | Wiring bugs — things that work alone but break together |
| Example | "Does `calculateDiscount(price, code)` return the right value for a valid code?" | "Does `POST /orders` actually create a row in the DB and return 201?" |

**Real-world usage:** A healthy test suite typically has many unit tests (fast, cheap, run on every save) and fewer, targeted integration tests (slower, but catch real wiring issues) — this shape is sometimes called the "testing pyramid."

**Where does end-to-end (e2e) testing fit, and how is it different from integration testing?** They're often confused. An **integration test** (the Supertest example below) exercises your own app's layers together — route, middleware, DB — but still runs **in-process**, without a real running server, real network hop, or a real browser. An **end-to-end test** goes a level further: it runs against a **fully deployed, running instance** of the system (a real server process, a real browser driving the actual UI via Playwright/Cypress/Selenium, hitting real or realistic staging infrastructure) to verify the entire user-facing flow works — "can a user actually sign up, verify their email, and log in," clicking through the real UI, not calling the API directly. E2E tests sit at the **top** of the testing pyramid: fewer of them, since they're the slowest and most brittle (a UI tweak can break a test that has nothing to do with the underlying logic), but they catch things unit/integration tests structurally can't — a broken build, a misconfigured environment variable in staging, a frontend/backend contract mismatch that both sides individually "pass" tests for.

| | Unit | Integration | E2E |
|---|---|---|---|
| Runs in-process? | Yes | Yes (usually) | No — real running server/app |
| Real network/browser? | No | No | Yes |
| Speed | Fastest | Medium | Slowest |
| Catches | Logic bugs | Wiring bugs within your app | Full-system/deploy/environment bugs, real UI flows |
| Typical tools (Node) | Jest, `node:test` | Jest/`node:test` + Supertest | Playwright, Cypress, Selenium |

### Jest / Mocha
**What is it?** Test runners/frameworks for JS. Jest bundles a test runner, assertion library, and mocking utilities together (batteries-included). Mocha is a test runner only — you pair it with a separate assertion library (Chai) and mocking library (Sinon).
```js
// Jest example — a simple unit test
function calculateDiscount(price, code) {
  if (code === 'SAVE10') return price * 0.9;
  return price;
}

test('applies 10% discount for SAVE10', () => {
  expect(calculateDiscount(100, 'SAVE10')).toBe(90);
});

test('returns full price for unknown code', () => {
  expect(calculateDiscount(100, 'BOGUS')).toBe(100);
});
```

### Supertest — HTTP integration testing
**What is it?** A library for testing Express (or any HTTP) apps by making real HTTP-style requests against your app **in-process**, without actually binding to a network port.
```js
const request = require('supertest');
const app = require('../app'); // your Express app

test('GET /users returns 200 and a list', async () => {
  const res = await request(app).get('/users');
  expect(res.status).toBe(200);
  expect(Array.isArray(res.body)).toBe(true);
});

test('POST /users with missing name returns 400', async () => {
  const res = await request(app).post('/users').send({});
  expect(res.status).toBe(400);
});
```

---

## Mocking DB calls
**What is it?** Replacing a real database call with a fake, controllable stand-in for the duration of a test, so the test is fast, deterministic, and doesn't depend on a real DB being up.
```js
// Jest mocking example
jest.mock('../models/User'); // auto-mock the User model
const User = require('../models/User');

test('getUser returns 404 when user not found', async () => {
  User.findById.mockResolvedValue(null); // control exactly what the "DB" returns
  const res = await request(app).get('/users/123');
  expect(res.status).toBe(404);
});
```
**Why mock instead of hitting a real test DB?** Speed (no real I/O) and determinism (no leftover data from previous test runs causing flaky failures) for **unit** tests. For true **integration** tests, it's still valuable to hit a real (test/in-memory) database occasionally, to catch things mocks can't — like an actual invalid query or a schema mismatch.

---

## Debugging Node apps
**What is it?** Instead of scattering `console.log` everywhere, Node has a real debugger protocol you can attach to (the same Inspector protocol Chrome DevTools uses).

```
node --inspect index.js          # starts app with a debugger port open, attach via Chrome DevTools
node --inspect-brk index.js      # same, but pauses on the very first line, useful for startup bugs
```
Then open `chrome://inspect` in Chrome, or attach directly from VS Code's built-in Node debugger (breakpoints, step-through, watch variables — the full experience, not just print statements).

**Real-world usage:** Debugging a tricky async bug where `console.log` ordering is confusing (see file 02 for why), or inspecting the exact shape of an object at a specific point without guessing from log output.

---

## Logging best practices — why `console.log` isn't enough in production
**What is it?** `console.log` writes plain unstructured text to stdout — fine for local development, but poor for production observability.

**Why it falls short in production:**
1. **No log levels** — you can't easily filter "just errors" vs "just debug info" at runtime.
2. **No structure** — plain text is hard to search/filter/aggregate in log tools (Datadog, ELK/Elasticsearch, CloudWatch) at scale. Structured logs (JSON) can be queried like `level:error AND service:orders`.
3. **No context correlation** — in a busy server handling many concurrent requests, interleaved `console.log` lines from different requests are impossible to untangle without a request/trace ID tying them together.
4. **Performance** — synchronous console writes under high load can add up; dedicated logging libraries batch/stream more efficiently.

**Structured logging example (`pino`, a fast structured logger):**
```js
const pino = require('pino');
const logger = pino();

logger.info({ userId: 42, action: 'login' }, 'User logged in'); 
// outputs JSON: {"level":30,"time":..., "userId":42, "action":"login", "msg":"User logged in"}

logger.error({ err, orderId: 99 }, 'Failed to process order');
```
**Real-world usage:** Every request gets a correlation/trace ID attached to its logger context, so when debugging a production incident you can filter logs by that one ID and see the full request's story across services, instead of guessing from scattered plain-text lines.

**How to explain this section in an interview:**
> "Unit tests isolate and mock dependencies to test logic quickly and deterministically; integration tests (often with Supertest) verify the real wiring — routes, middleware, DB — works together, usually against a real or in-memory test database. For debugging, `node --inspect` gives you a real breakpoint-based debugger via Chrome DevTools or an editor, which is far more reliable than sprinkling console.log. In production, plain console.log isn't enough — structured JSON logging with levels and request-correlation IDs, via something like pino or winston, is what actually makes logs searchable and useful when debugging a live incident."
