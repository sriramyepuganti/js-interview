# 01. Node.js Fundamentals

## What is Node.js?
**What is it?** Node.js is a runtime that lets you run JavaScript outside a browser — on a server, on your laptop, in a CLI tool — using Google Chrome's V8 engine plus a C library called `libuv` that adds file system, networking, and timer capabilities JS doesn't have on its own.

**Why was it invented?** Before 2009, JavaScript only ran inside browsers. Backend servers were written in Java, PHP, Python, etc. Ryan Dahl (Node's creator) was frustrated by how traditional web servers like **Apache** handled concurrency: Apache spawns a new **thread** (or process) per incoming request. Threads are expensive — each one needs its own stack memory (often 1-2MB), and the OS has to context-switch between them. If you have 10,000 slow clients (e.g., waiting on a slow database or a slow client connection), Apache tries to keep 10,000 threads alive, which chokes the server on memory and CPU context-switching long before the server is actually "doing" 10,000 things at once (this is the classic **C10K problem**).

Node's answer: **one thread, non-blocking I/O.** Instead of blocking a thread while waiting for a disk read or network response, Node fires off the I/O operation, immediately moves on to the next piece of work, and gets notified via a callback/event when the I/O finishes. Because JavaScript already had a "callback on event" mental model (from browser `onClick` handlers), it was a natural fit for this style of programming — that's why JS, not another language, was chosen for the server side.

**Real-world usage:** Node is the default choice for I/O-heavy backends — REST/GraphQL APIs, real-time apps (chat, live dashboards via WebSockets), streaming services, BFF (backend-for-frontend) layers, and API gateways. It is a poor fit for CPU-heavy work (image/video processing, heavy math) unless you offload that work (see `worker_threads` in file 09).

**How to explain this in an interview (simple English):**
> "Node.js runs JavaScript on the server using Chrome's V8 engine. It was built to solve the problem traditional threaded servers had: they burn a thread per connection, which doesn't scale well when you have thousands of concurrent, mostly-idle connections. Node uses a single thread with an event loop and non-blocking I/O — so instead of waiting on I/O, it registers a callback and handles other requests in the meantime. This makes it very efficient for I/O-bound workloads like APIs, but not ideal for CPU-heavy tasks since it only has one main thread for JS execution."

---

## V8 Engine
**What is it?** V8 is Google's open-source JavaScript engine (written in C++) that compiles JS directly to native machine code (via JIT — Just-In-Time compilation) instead of interpreting it line by line. It's the same engine that powers Chrome.

**Why was it invented?** JS engines used to be slow, tree-walking interpreters. V8 introduced JIT compilation and hidden classes/inline caching to make JS run close to native speed, which made server-side JS actually viable performance-wise.

**Real-world usage:** Every `node` process you run is really "V8 + Node's C++ bindings (via libuv) + Node's JS standard library" bolted together. Startup time, garbage collection pauses, and memory limits you hit in production (`--max-old-space-size`) are all V8 characteristics, not "Node" characteristics per se.

**How to explain it:** "V8 is the JS engine — it parses and JIT-compiles JavaScript to machine code. Node embeds V8 and adds OS-level capabilities (files, network, processes) that V8 alone doesn't have, via libuv."

---

## libuv and the Event Loop (high level)
**What is it?** `libuv` is a C library that gives Node its async I/O superpowers: it abstracts OS-specific mechanisms (epoll on Linux, kqueue on macOS, IOCP on Windows) into one consistent API, and it implements the **event loop** plus a small **thread pool** (default size 4) for operations that can't be done asynchronously at the OS level (like some file system calls, DNS lookups via `dns.lookup`, and some crypto functions).

**Why was it invented?** Different operating systems have completely different native APIs for "tell me when this socket/file is ready." libuv unifies them so Node's non-blocking model works the same way on Linux, macOS, and Windows.

**Real-world usage:** When you call `fs.readFile`, it doesn't block the main thread — libuv either uses async OS I/O or, if that's not available, quietly hands it to one of the 4 threads in its internal thread pool and calls your callback once done. This is why heavy concurrent `fs.readFile` calls can eventually queue up behind that thread pool of 4 — a real, practical gotcha in production file-heavy services. (Full event loop phases are covered in file 02.)

**How to explain it:** "libuv is what actually makes Node's non-blocking I/O possible across operating systems. It runs the event loop and manages a small thread pool for things the OS can't do async natively, like certain file and DNS operations."

---

## Single-threaded but highly scalable — how?
**What is it?** Your JavaScript code in Node runs on **one main thread**. There is no multi-threaded JS execution happening for your application logic.

**Why is it still scalable?** Because most backend work is *waiting* — waiting on a database query, waiting on a network call, waiting on disk I/O. Node doesn't block the thread during that wait; it delegates the waiting to the OS/libuv and moves on to serve other requests. The single thread is only ever "busy" doing actual JS computation, which for typical API logic (parse JSON, validate, format response) is milliseconds. So one thread can juggle thousands of in-flight I/O operations.

The catch: if you *do* run CPU-heavy synchronous JS (e.g., a huge `for` loop, synchronous JSON.parse of a huge payload, image resizing in pure JS), it blocks that single thread and **every other request stalls** — there's no thread scheduler to rescue you. This is Node's single biggest production gotcha.

**Real-world usage:** A Node API server can comfortably handle thousands of concurrent open connections (chat servers, long-polling, SSE) on one process because each connection is "cheap" while idle. Compare this to a traditional thread-per-request server, which pays a fixed memory/CPU cost per connection just for it to exist.

**How to explain it in an interview:**
> "Node runs your JS on one thread, but scalability comes from non-blocking I/O — the thread never sits idle waiting on the network or disk, it delegates that to the OS/libuv and keeps processing other work. The trade-off is that CPU-bound synchronous code blocks everyone, since there's only one thread doing JS. For CPU-heavy work you use worker_threads or offload to another service."

---

## REPL
**What is it?** REPL = **R**ead **E**val **P**rint **L**oop. It's the interactive shell you get when you type `node` with no file argument — like a live JavaScript console in your terminal.

**Why was it invented?** Developers need a fast way to test small snippets of code, inspect an API, or debug an expression without creating a file and running it. Every scripting language (Python, Ruby) has one; Node needed the same for quick JS experimentation.

**Real-world usage:** Quickly checking what a built-in method returns (`Array.prototype.flat` behavior, `Buffer.from('x')` output), or debugging in production via a live console attached to a running process (with caution).

```
$ node
> const arr = [1, [2, 3]];
> arr.flat()
[ 1, 2, 3 ]
> .exit
```

**How to explain it:** "REPL is Node's interactive prompt — Read, Eval, Print, Loop — useful for quickly testing JS snippets without writing a full script."

---

## Global Objects
**What is it?** Node exposes certain objects/functions to every module without requiring an `import`/`require` — these are "globals." The important ones for interviews: `process`, `__dirname`, `__filename`, `Buffer`, `global` (and `console`, `setTimeout`, etc.).

### `process`
Represents the currently running Node process. Gives you environment info and control over the process itself.
```js
console.log(process.pid);        // process ID
console.log(process.platform);   // 'darwin', 'linux', 'win32'
console.log(process.argv);       // CLI arguments passed to this script
console.log(process.env.NODE_ENV); // environment variables
process.exit(1);                 // exit with a failure code
```
**Real-world usage:** Reading config from `process.env` (12-factor app config), reacting to `process.on('SIGTERM', ...)` for graceful shutdown (see file 11), inspecting `process.memoryUsage()` for leak debugging.

### `__dirname` / `__filename`
- `__dirname` — the absolute path of the directory containing the currently executing file.
- `__filename` — the absolute path of the currently executing file itself.

These only exist in **CommonJS** modules. In ESM (`type: "module"`) they don't exist natively — you recreate them with `import.meta.url` (see file 03).
```js
console.log(__dirname);   // /Users/you/project/src
console.log(__filename);  // /Users/you/project/src/index.js
```
**Real-world usage:** Building reliable file paths regardless of where the process was launched from — e.g., `path.join(__dirname, 'views')` instead of a relative path that breaks depending on your current working directory.

### `Buffer`
A global class for handling raw binary data. Covered in depth in file 04, but the key point: it's global, no `require` needed.
```js
const buf = Buffer.from('hello', 'utf-8');
console.log(buf);          // <Buffer 68 65 6c 6c 6f>
console.log(buf.toString()); // 'hello'
```

### `global`
The Node equivalent of `window` in browsers — the top-level namespace. Rarely used directly in modern code (attaching things to `global` is considered bad practice, similar to polluting `window`), but you should know it exists.

**How to explain globals in an interview:**
> "Node gives every module access to certain globals without requiring them — `process` for runtime/environment info, `__dirname`/`__filename` for file paths (CommonJS only), `Buffer` for binary data, and `global` as the top-level object, similar to `window` in browsers. In ESM these differ slightly — `__dirname` isn't available and you use `import.meta.url` instead."

---

## Quick Reference Table

| Concept | One-liner |
|---|---|
| Node.js | JS runtime for servers, built on V8 + libuv, non-blocking I/O |
| V8 | JIT-compiles JS to machine code (also powers Chrome) |
| libuv | C library giving Node the event loop + async OS I/O + small thread pool |
| Single-threaded | Only one thread runs your JS; I/O is delegated, not blocking |
| REPL | Interactive JS shell (`node` with no args) |
| `process` | Info/control over the running Node process |
| `__dirname`/`__filename` | Current directory/file path (CommonJS only) |
| `Buffer` | Global class for binary data |
| `global` | Top-level object, like `window` in browsers |
