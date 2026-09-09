# 13. Latest Node.js Runtime Features (Node 18-22+ era)

Node has quietly absorbed a lot of what used to require third-party packages (Jest/Mocha, nodemon, dotenv, ws) directly into the runtime. This file covers what's new enough that even experienced Node developers may not have used it yet in production. (Note: this file assumes Node 20/22 LTS as the practical baseline — a few items are still marked "experimental" and worth knowing the caveats for, since interviewers like to probe "is this actually production-ready?")

---

## Built-in Test Runner (`node:test`)

**What is it?** A test runner, assertion library integration point, mocking utility, and coverage tool built directly into Node — no npm install required. You write tests with `test()`/`describe()`/`it()` imported from `node:test`, and assert with the also-built-in `node:assert` module. Run them with `node --test`.

**Why was it invented / what problem does it solve?** For years, "install Jest or Mocha" was step one of testing any Node project — an extra dependency (and its own dependency tree) just to run `expect(x).toBe(y)`. Deno and Bun shipped test runners out of the box and made "zero-install testing" a selling point; Node followed, landing an experimental runner in Node 18 and marking it **stable in Node 20**. The goal: a new Node project can have working, CI-ready tests with zero `npm install`.

**Real-world usage:** Small-to-medium services, CLIs, and libraries increasingly skip Jest entirely and use `node --test` directly in CI (`node --test --test-reporter=spec`). Larger codebases with heavy mocking/snapshot needs still often reach for Jest, since `node:test`'s built-in mocking (`t.mock`) is more basic than Jest's. It also supports test isolation, subtests, `describe`/`it` nesting, `before`/`after`/`beforeEach`/`afterEach` hooks, and built-in code coverage via `node --test --experimental-test-coverage` (stabilizing to `--test-coverage` in newer versions) — so mid-sized projects can drop Jest/nyc entirely.

```js
// sum.test.js
const { test, describe, before, after } = require('node:test');
const assert = require('node:assert');

function sum(a, b) { return a + b; }

describe('sum()', () => {
  before(() => console.log('setup runs once before all tests in this describe'));
  after(() => console.log('teardown runs once after all tests'));

  test('adds two positive numbers', () => {
    assert.strictEqual(sum(2, 3), 5);
  });

  test('adds negative numbers', () => {
    assert.strictEqual(sum(-1, -1), -2);
  });
});
```
```bash
node --test                       # runs every *.test.js / *.test.mjs / test/**/*.js file it finds
node --test sum.test.js           # run a single file
node --test --watch               # re-run tests on file change (combines with --watch below)
node --test --test-coverage       # built-in coverage report, no nyc/c8 needed (flag name varies by version)
```

### `node:test` vs Jest vs Mocha

| | `node:test` | Jest | Mocha |
|---|---|---|---|
| Install needed | None (built into Node 20+) | `npm i -D jest` | `npm i -D mocha chai sinon` |
| Assertions | `node:assert` (built-in) | Built-in `expect()` | Needs Chai (separate package) |
| Mocking | Built-in but basic (`t.mock`) | Rich, mature (`jest.mock`, auto-mocking) | Needs Sinon (separate package) |
| Snapshot testing | No | Yes | No (needs a plugin) |
| Watch mode | Yes (`node --test --watch`) | Yes (`jest --watch`) | Yes (`mocha --watch`) |
| Parallelization | Yes, built-in | Yes, built-in | Limited |
| Ecosystem/plugins | Small, growing | Huge (React Testing Library, snapshot tooling, etc.) | Mature but you assemble it yourself |
| Best fit | Libraries/CLIs/services wanting zero deps | Large apps needing rich mocking/snapshots/React support | Teams with an existing Mocha+Chai+Sinon setup |

**How to explain this in an interview (simple English):**
> "Since Node 20, you don't need Jest or Mocha for basic testing — `node:test` gives you `test()`, `describe()`, hooks, mocking, and coverage built into the runtime, and `node:assert` gives you assertions. You run it with `node --test`, no install. It's a great fit for libraries and services that want zero test dependencies; for large apps with heavy snapshot testing or React component testing, Jest is still often the stronger choice because its mocking and ecosystem are more mature."

---

## Built-in Watch Mode (`node --watch`)

**What is it?** A flag that makes Node automatically restart your process whenever a watched file changes — the same "auto-restart on save" behavior developers have used `nodemon` for, for years, now built directly into the `node` binary.

**Why was it invented / what problem does it solve?** `nodemon` (and similar tools) is an extremely common dev dependency for one narrow job: watch files, restart the process. That's a whole extra package (plus a `nodemon.json` config file, in some setups) just for a restart loop. `--watch` was introduced experimentally in Node 18.11 and became **stable in Node 22** — no more experimental warning, no more separate dependency.

**Real-world usage:** Local development for any Node service or script — `node --watch server.js` restarts on save, matching the `nodemon server.js` workflow developers already know, minus the dependency. Combine it with `node --watch --test` for auto-rerunning your test suite on save, replacing `jest --watch` for teams already on `node:test`.

```bash
node --watch server.js                     # restarts server.js whenever a required file changes
node --watch --watch-path=./src server.js  # only watch a specific directory
node --watch-preserve-output server.js     # don't clear the terminal on each restart
```

### `nodemon` vs `node --watch`

| | `nodemon` | `node --watch` |
|---|---|---|
| Install | `npm i -D nodemon` | None — built into Node 18.11+ (stable in 22+) |
| Config | Optional `nodemon.json` for ignore patterns, extensions | CLI flags (`--watch-path`, `--watch-preserve-output`) |
| Ignoring `node_modules` | Automatic | Automatic |
| Maturity/extra features | More mature, more configuration knobs (delay, custom exec command) | Simpler, fewer knobs, but zero-install |

**How to explain this in an interview (simple English):**
> "You used to need `nodemon` as a dev dependency just to auto-restart your server on file changes. Since Node 22, `node --watch app.js` does the same thing natively — no install needed. For most projects it's now enough to drop `nodemon` entirely; teams only keep it if they rely on its extra config options like custom restart delays."

---

## Native `.env` File Loading (`--env-file`)

**What is it?** A CLI flag that loads environment variables from a `.env` file directly into `process.env` before your code runs — no code needed, no package installed.

**Why was it invented / what problem does it solve?** Loading a `.env` file for local development config (`DATABASE_URL`, `API_KEY`, etc.) has been the `dotenv` package's entire job for years: `require('dotenv').config()` at the top of your entry file. That's a dependency, and it has to run *before* anything else that reads `process.env`, which is a common source of "why is my env var undefined" ordering bugs. `--env-file`, introduced experimentally in Node 20.6, loads the file at the OS/CLI level — before your code even starts — eliminating both the dependency and the ordering footgun.

**Real-world usage:** Local dev and simple deployments where you just need key=value pairs loaded — no interpolation, no `.env.local` cascading logic. For more advanced needs (variable expansion like `API_URL=${HOST}/api`, multiple cascading `.env` files with override precedence), `dotenv`/`dotenv-expand` are still more feature-rich, so many teams keep them for complex setups.

```bash
node --env-file=.env app.js                 # loads .env, then runs app.js
node --env-file=.env --env-file=.env.local app.js   # later files override earlier ones
node --env-file-if-exists=.env app.js       # doesn't error if the file is missing (newer versions)
```
```js
// app.js — no dotenv import needed at all
console.log(process.env.DATABASE_URL); // already populated by --env-file, before this line even runs
```

### `dotenv` package vs `--env-file`

| | `dotenv` package | `--env-file` |
|---|---|---|
| Install | `npm i dotenv` | None — built in since Node 20.6 |
| Code needed | `require('dotenv').config()` at top of entry file | None — pure CLI flag |
| Variable expansion (`${VAR}`) | Yes, with `dotenv-expand` | No |
| Multiple files / precedence | Yes, flexible | Yes, via repeated `--env-file` flags (later wins) |
| Ordering risk | Yes — must run before other imports read `process.env` | No — loaded before your code starts at all |
| Fit | Complex config setups, expansion needs | Simple key=value config, most common case |

**How to explain this in an interview (simple English):**
> "You don't need the `dotenv` package for basic `.env` loading anymore. `node --env-file=.env app.js` loads environment variables before your code even runs, which also sidesteps the classic dotenv bug where some other imported file reads `process.env` before `dotenv.config()` has run. For simple key=value config it fully replaces dotenv; for variable interpolation or complex multi-file cascading, dotenv is still more capable."

---

## The Permission Model (`node --permission`)

**What is it?** An opt-in sandboxing mechanism that restricts what a Node process is allowed to do at runtime — filesystem reads/writes, spawning child processes, loading native addons, spinning up worker threads — unless you explicitly allow it. Conceptually similar to Deno's permission flags (`--allow-read`, `--allow-net`, etc.), which Node's model was directly inspired by.

**Why was it invented / what problem does it solve?** By default, any Node script has unrestricted access to the filesystem, network, and OS — a `require('some-package')` from npm can silently read your SSH keys or `.env` file with no warning. This is a real supply-chain-attack risk (a compromised transitive dependency doing exactly that). The permission model lets you run untrusted or third-party code with a locked-down blast radius: "this script may only read from `./data`, and nothing else." It shipped experimentally as `--experimental-permission` in Node 20, and the flag was renamed to the shorter `--permission` and marked **stable in Node 23.5**.

**Real-world usage:** Sandboxing plugin systems (e.g., a CMS or build tool that runs user-supplied scripts), CI steps that run third-party code you don't fully trust, or defense-in-depth for services that process untrusted input — restricting what a compromised dependency could actually do even if it executes arbitrary code. Ties directly into file 07 (`07-authentication-and-security.md`) — it's a runtime-level security control, complementary to input validation and dependency auditing, not a replacement for them.

```bash
# Deny everything by default, then explicitly allow only what's needed:
node --permission --allow-fs-read=./data --allow-fs-write=./tmp app.js

# Also available: --allow-child-process, --allow-worker, --allow-addons, --allow-wasi, --allow-net (varies by version)
```
```js
// Inside the restricted process, an unauthorized access throws instead of silently succeeding:
const fs = require('fs');
fs.readFileSync('/etc/passwd');
// Throws: Error [ERR_ACCESS_DENIED]: Access to this API has been restricted

// You can also check permissions programmatically:
console.log(process.permission.has('fs.read', '/etc/passwd')); // false
```

**Important caveat for interviews:** flags like `--env-file` are deliberately processed *before* the permission system initializes (they need to read config before anything else starts), so they're not restricted by `--permission` — a nuance worth knowing if asked "does the permission model cover absolutely everything?"

**How to explain this in an interview (simple English):**
> "Node's permission model, stable since Node 23.5, lets you run a script in a locked-down sandbox — deny filesystem/child-process/worker access by default, then explicitly allow only what that script actually needs, similar to how Deno's `--allow-*` flags work. It's a real mitigation against supply-chain attacks: even if a compromised npm dependency tries to read your SSH keys or spawn a shell, it gets a hard `ERR_ACCESS_DENIED` instead of silently succeeding."

---

## Native `fetch()` Global — confirmed present, verifying depth

**What is it?** A global `fetch()` function, matching the browser Fetch API (`fetch(url).then(res => res.json())`), available in every Node script with no import.

**Why was it invented / what problem does it solve?** Making an HTTP request from Node used to mean either the low-level, awkward `http`/`https` module, or a third-party package (`axios`, `node-fetch`, `got`). Browsers already had a clean, Promise-based `fetch()` API — Node adopted the same API (built on the `undici` HTTP client under the hood) so the exact same networking code works in both environments, and small scripts/services no longer need an HTTP client dependency at all. It landed experimentally in Node 18, and became **stable (no flag, no warning) in Node 21**.

**Real-world usage:** Any Node 18+ script calling an external API can skip `axios`/`node-fetch` entirely for straightforward request/response use cases. Libraries and services still often keep `axios` or `undici` directly when they need interceptors, automatic retries, or connection-pooling tuning that raw `fetch` doesn't expose as conveniently.

```js
// No import, no package install — fetch is a global in Node 18+ (stable, unflagged, since Node 21)
const res = await fetch('https://api.example.com/users/1');
if (!res.ok) throw new Error(`Request failed: ${res.status}`);
const user = await res.json();
console.log(user);
```

**How to explain this in an interview (simple English):**
> "Node has shipped a global `fetch()`, matching the browser API, since Node 18 (experimental) and stable without any flag since Node 21. It's built on `undici` internally. For simple HTTP calls you no longer need `axios` or `node-fetch` — but libraries needing retries, interceptors, or fine connection-pool control still often reach for `undici` directly or `axios`."

---

## `AbortController` / `AbortSignal` — cancelling async work
**What is it?** A global, standard (browser-originated) pair of classes for **cancelling** an in-progress async operation. `new AbortController()` gives you a `.signal` (an `AbortSignal`) to hand to whatever you want to be cancellable, and a `.abort()` method to trigger that cancellation from wherever you're holding the controller.

**Why was it invented / what problem does it solve?** Before this existed, cancelling an in-flight async operation in JS was awkward and inconsistent — a Promise, once created, has no built-in way to say "actually, stop" (you could ignore its eventual result, but the underlying work — an HTTP request, a timer — kept running/consuming resources regardless). Browsers standardized `AbortController` specifically to make `fetch()` cancellable, and Node adopted the same global (available since Node 15, with more and more built-ins accepting a `signal` option since) so the exact same cancellation pattern works for HTTP requests, timers, streams, and even your own custom async functions.

**The most common real use — a request timeout:**
```js
async function fetchWithTimeout(url, timeoutMs) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs); // trigger cancellation after timeoutMs

  try {
    const res = await fetch(url, { signal: controller.signal }); // fetch cancels itself when the signal fires
    return await res.json();
  } catch (err) {
    if (err.name === 'AbortError') throw new Error(`Request to ${url} timed out after ${timeoutMs}ms`);
    throw err;
  } finally {
    clearTimeout(timer); // don't leave a dangling timer if the request finished before timing out
  }
}
```
**Node's own timer/stream APIs accept a `signal` too**, not just `fetch`:
```js
const { setTimeout: sleep } = require('timers/promises');
await sleep(5000, undefined, { signal: controller.signal }); // an abortable sleep — rejects if aborted early
```
**Making your *own* async functions abortable** (the part interviewers actually want to see you reason through, since nothing does this for you automatically):
```js
async function processLargeJob(items, signal) {
  for (const item of items) {
    if (signal.aborted) throw new Error('Job cancelled'); // check cooperatively between units of work
    await processOne(item);
  }
}
// Or react immediately rather than polling: signal.addEventListener('abort', () => { /* cleanup now */ });
```

**Real-world usage:** Enforcing a timeout on an outbound HTTP call to a flaky third-party API (so one slow dependency doesn't hang your request handler indefinitely — directly related to the event-loop-blocking concerns in file 02/11), cancelling a search-as-you-type request when the user keeps typing (abort the previous in-flight request instead of racing it against the new one), and cleanly tearing down long-running work when a client disconnects mid-request (`req.on('close', () => controller.abort())` in Express).

**How to explain this in an interview (simple English):**
> "`AbortController` gives you a standard, cancellable handle for async work — you pass its `.signal` into anything that supports cancellation, like `fetch`, and call `.abort()` from wherever you decided the operation should stop, most commonly a timeout. The part that trips people up is that cancellation isn't magic for *your own* async code — a custom function has to actually check `signal.aborted` (or listen for the `abort` event) at sensible points and bail out itself; wrapping something in an AbortController doesn't retroactively make it interruptible."

See `examples/abort-controller-demo.js` for a runnable version of both the timeout pattern and a custom cooperatively-abortable function.

---

## Native `WebSocket` Client (global `WebSocket`)

**What is it?** A global `WebSocket` class — the same client-side API browsers have had for years (`new WebSocket(url)`, `.onmessage`, `.send()`) — now available natively in Node with no import.

**Why was it invented / what problem does it solve?** Connecting to a WebSocket server from Node used to require the third-party `ws` package (the de facto standard, used even inside some of Node's own tooling). Since browsers already standardized a clean `WebSocket` client API, Node added the same global so client-side WebSocket code is portable between browser and server, and simple scripts don't need a dependency just to open a socket connection. It shipped experimentally in Node 21 (`--experimental-websocket`) and was marked **stable, enabled by default, in Node 22.4** — no flag needed.

**Real-world usage:** A Node CLI tool, script, or service that needs to *connect to* a WebSocket server (e.g., a stock-price feed, a chat backend, a subscription-based API) can use the global `WebSocket` with zero dependencies. Important limitation: this is a **client only** — Node's built-in `WebSocket` cannot accept incoming connections (there's no built-in WebSocket *server*). For a WebSocket server, you still need the `ws` package or a framework with WS support (e.g., Socket.IO, or `ws` layered on Node's `http` server).

```js
// No `require('ws')` needed — WebSocket is a global since Node 22 (stable, unflagged)
const socket = new WebSocket('wss://example.com/socket');

socket.addEventListener('open', () => {
  console.log('connected');
  socket.send(JSON.stringify({ type: 'subscribe', channel: 'prices' }));
});

socket.addEventListener('message', (event) => {
  console.log('received:', event.data);
});

socket.addEventListener('close', () => console.log('connection closed'));
```

### `ws` package vs native `WebSocket`

| | `ws` package | Native `WebSocket` |
|---|---|---|
| Install | `npm i ws` | None — global since Node 22.4 |
| Client support | Yes | Yes |
| Server support | Yes (`new WebSocket.Server(...)`) | **No — client only** |
| API style | Node-flavored (EventEmitter-based) | Browser-standard (`addEventListener`, matches frontend code) |
| Best fit | Anything needing a WS **server**, or Node-style event APIs | Simple scripts/services that only need to **connect out** to a WS server |

**How to explain this in an interview (simple English):**
> "Since Node 22, `WebSocket` is a global, browser-compatible client — no `ws` package needed if you're just connecting *to* a WebSocket server. The catch is it's client-only; if you need to run a WebSocket *server*, you still reach for the `ws` package or something like Socket.IO, since Node doesn't ship a built-in WebSocket server."

---

## Single Executable Applications (SEA)

**What is it?** A way to package a Node.js application, together with the Node runtime itself, into a single standalone binary — something a user can run (`./myapp`) without having Node installed on their machine at all.

**Why was it invented / what problem does it solve?** Distributing a Node-based CLI tool traditionally meant asking the end user to install Node.js first, or bundling via third-party tools like `pkg` or `nexe`. SEA brings this capability into Node core itself, aimed at CLI tools, internal ops scripts, or products handed to non-technical users who shouldn't need to know or care that the tool happens to be built in JavaScript. It's been available experimentally since roughly Node 19.7/20, using `--experimental-sea-config` plus the third-party `postject` tool to inject your code into a copy of the Node binary. Node 25.5 (2026) simplified this further with a one-step `--build-sea` flag that does the whole injection for you.

**Real-world usage:** Shipping an internal CLI tool to teammates who don't want to manage Node versions, or a small utility distributed to customers as a single downloadable file for macOS/Linux/Windows, with no "please install Node first" step.

```bash
# sea-config.json
# {
#   "main": "app.js",
#   "output": "sea-prep.blob",
#   "disableExperimentalSEAWarning": true
# }

node --experimental-sea-config sea-config.json   # 1. generate the injectable blob
cp $(command -v node) myapp                       # 2. copy the Node binary as your app's binary
npx postject myapp NODE_SEA_BLOB sea-prep.blob \  # 3. inject the blob into the copied binary
  --sentinel-fuse NODE_SEA_FUSE_fce680ab2cc467b6e072b8b5df1996b2
./myapp                                            # 4. run it — no `node` on PATH required

# Node 25.5+: the newer, simpler one-step flow
node --build-sea sea-config.json                  # generates the ready-to-run binary directly
```

**Caveats worth knowing for an interview:** the resulting binary bundles the *entire* Node runtime, so it's large (tens of MB, even for a tiny script); native addons (`.node` files) need special handling; and it's still evolving — treat it as "good enough for internal tools and CLIs today," not yet a drop-in replacement for mature tools like `pkg` in every scenario.

**How to explain this in an interview (simple English):**
> "SEA lets you bundle a Node app plus the Node runtime into one executable file, so end users can run it without installing Node — useful for distributing CLI tools. It's been experimental since around Node 20, using `postject` to inject your app's code into a copy of the `node` binary; Node 25 added a simpler one-step `--build-sea` flag. The trade-off is binary size — you're shipping the whole runtime, not just your code."

---

## Corepack (built-in package manager version manager)

**What is it?** A tool that ships with Node (Node 14.19 through Node 24) whose job is to make sure everyone on a project uses the *exact* version of npm/yarn/pnpm the project declares — without each developer having to manually install or manage that version globally.

**Why was it invented / what problem does it solve?** "Works on my machine" bugs caused by different developers (or CI) having different globally-installed versions of yarn or pnpm are a real, recurring annoyance — a lockfile format change or a resolution behavior difference between yarn versions can cause subtly different `node_modules` between two machines. Corepack solves this by reading a `"packageManager"` field from `package.json` and transparently downloading/using exactly that version when someone runs `yarn` or `pnpm`, with zero manual "install the right yarn version" step.

**Real-world usage:** A team standardizes on `pnpm@8.15.0` for a project; every developer and every CI runner, after running `corepack enable` once, automatically uses exactly that pnpm version the moment they run `pnpm install` in that repo — no `npm install -g pnpm@8.15.0` required, and no risk of someone accidentally using a different global version. **Important recent change:** starting in **Node 25 (late 2025)**, Corepack is **no longer bundled by default** with Node — it must be installed separately (`npm install -g corepack`). Node 24 and earlier still ship it.

```json
// package.json
{
  "packageManager": "pnpm@8.15.0"
}
```
```bash
corepack enable                 # one-time setup, activates the shims for yarn/pnpm
pnpm install                    # corepack transparently ensures pnpm@8.15.0 (from package.json) runs, downloading it if needed

# On Node 25+, corepack isn't bundled anymore — install it explicitly first:
npm install -g corepack
corepack enable
```

**How to explain this in an interview (simple English):**
> "Corepack makes sure every developer and CI machine uses the exact package manager version a project declares in `package.json`'s `packageManager` field, instead of relying on whatever's globally installed — avoiding subtle lockfile/dependency-resolution mismatches between machines. It shipped with Node from 14.19 up through Node 24, but starting with Node 25 it's no longer bundled by default, so it needs a separate `npm install -g corepack` now."

---

## `require()` of ESM Modules — the CommonJS/ESM interop gap closing

**What is it?** The ability for a CommonJS file to `require()` a synchronous ES Module directly, getting the result back immediately — something that was flatly impossible in earlier Node versions (see file 03, "Interop gotchas," which documents the old limitation).

**Why was it invented / what problem does it solve?** As covered in file 03, CommonJS's `require()` is synchronous, but ESM loading is inherently asynchronous — so historically, a CJS file could only load an ESM-only package via `await import(...)` (returns a Promise, and only works inside an `async` function). This was a real migration blocker: a huge amount of existing CommonJS code couldn't cleanly adopt ESM-only dependencies, and mixed codebases mid-migration from CJS to ESM hit constant friction. Node closed part of this gap: if the target ES module is **fully synchronous** (no top-level `await`), `require()` can now load it directly and return its exports immediately — no `Promise`, no `await` needed on the calling side.

It shipped as `--experimental-require-module` in Node 22, became **enabled by default (unflagged) starting in Node 22.12**, and has continued moving toward full, unflagged stability in subsequent releases.

**Real-world usage:** Gradual migration of large CommonJS codebases that need to consume newer ESM-only npm packages, without rewriting the entire consuming codebase to ESM first. It's a meaningful unblock for library authors too — you can ship ESM-first while still being `require()`-able by CJS consumers, as long as your module doesn't rely on top-level `await`.

```js
// math.mjs — a synchronous ESM module (no top-level await)
export function add(a, b) { return a + b; }

// app.js — CommonJS file, Node 22.12+
const { add } = require('./math.mjs'); // works directly now — no dynamic import(), no await
console.log(add(2, 3)); // 5
```
```js
// Still NOT supported: requiring an ESM module that uses top-level await —
// that case still requires a dynamic import() from CommonJS, since there's
// genuinely no way to make an in-flight async operation resolve synchronously.
// db.mjs:
//   export const conn = await connectToDb(); // top-level await
// app.js (CJS):
//   const db = require('./db.mjs'); // still throws — must use: const db = await import('./db.mjs');
```

**How to explain this in an interview (simple English):**
> "Node used to make it impossible for a CommonJS file to `require()` an ESM module synchronously — you always needed a dynamic `import()`, which returns a Promise. Since Node 22.12, `require()` can load a synchronous ES module directly, no Promise involved, as long as that module doesn't use top-level await. It's a big help for large CommonJS codebases that need to adopt ESM-only dependencies incrementally, without a full rewrite."

---

## Quick Reference Table

| Feature | Flag / API | Status as of Node 22 LTS | Replaces |
|---|---|---|---|
| Built-in test runner | `node:test`, `node --test` | Stable since Node 20 | Jest/Mocha for basic testing |
| Watch mode | `node --watch` | Stable since Node 22 | `nodemon` |
| `.env` loading | `node --env-file=.env` | Stable since ~Node 22 (landed 20.6) | `dotenv` package (basic cases) |
| Permission model | `node --permission` | Stable since Node 23.5 | Manual sandboxing / no runtime protection |
| Native `fetch()` | global `fetch()` | Stable since Node 21 | `axios`/`node-fetch` (simple cases) |
| `AbortController` | global `AbortController`/`AbortSignal` | Stable since Node 15 | Ad-hoc, inconsistent cancellation flags/booleans |
| Native `WebSocket` client | global `WebSocket` | Stable since Node 22.4 | `ws` package (client-only use cases) |
| Single Executable Apps | `--experimental-sea-config` / `--build-sea` | Experimental (simplified in Node 25.5) | `pkg`, `nexe` |
| Corepack | `corepack enable` | Bundled Node 14.19-24; separate install from Node 25+ | Manually installing global yarn/pnpm versions |
| `require(esm)` | plain `require()` of sync ESM | Default/unflagged since Node 22.12 | Dynamic `import()` workaround from CJS |
