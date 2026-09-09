# 01. Rollup Core Concepts

## What is Rollup?

**What is it?**
Rollup is a module bundler, like Webpack, but designed from the start around **ES Modules** as the native module format, with a strong focus on producing small, clean, tree-shaken output. It was released in 2015, explicitly built to take advantage of ESM's static structure for better dead-code elimination than CommonJS-based bundlers of that era could achieve.

**Why was it invented / what problem does it solve?**
When Rollup came out, Webpack already existed but was optimized for bundling *applications* — handling every asset type, dev servers, HMR, complex apps with many entry points. Rollup targeted a different, narrower problem: **bundling libraries** (npm packages) that need to produce the smallest, cleanest possible output, in multiple formats, so that whoever *consumes* that library (in their own app, bundled by their own tool) gets minimal, tree-shakeable code with no unnecessary runtime overhead.

Rollup's core idea — introduced and popularized the term "tree-shaking" itself — is that because ES Modules declare their imports/exports *statically*, a bundler can precisely determine what's actually used across the whole dependency graph and produce output that reads almost like you'd written it by hand, concatenated, with dead code physically removed. Early Webpack (CommonJS-oriented) couldn't do this nearly as well.

**Why it's the go-to for bundling libraries, not apps**
- **Clean, minimal output** — no bundler-specific runtime/module-loader wrapper code injected around your modules (Webpack, by contrast, injects its own module system/runtime into the bundle, which is fine for an app but adds overhead/noise for a library meant to be re-bundled by consumers).
- **Best-in-class tree-shaking** — critical for libraries, since consumers only want to pay (in bundle size) for the parts of your library they actually use.
- **Multiple output formats in one config** — a library often needs to support very different consumers (a project using `import`, one using `require`, one using a plain `<script>` tag) — Rollup makes emitting all of them from one build easy.
- **Not designed for app-specific needs** — Rollup doesn't ship a built-in dev server with HMR, doesn't have Webpack's asset-loader ecosystem (images/fonts as first-class modules) out of the box, and needs extra plugins for things like resolving CommonJS dependencies from `node_modules` — all reasonable trade-offs for a tool focused on libraries, but a poor fit for building a full app UI on its own (which is why Vite uses Rollup only for the *production build* step, with its own separate dev-server layer on top).

**Real-world usage**
Extremely popular libraries are built with Rollup: React itself (parts of its build), Vue 3, D3, and countless npm utility packages. If you `npm install` a modern, well-maintained library and look at its `dist/` folder, there's a good chance Rollup (or a Rollup-based tool like `tsup` or `vite build --lib`) produced those files.

**How to explain this in an interview (simple English)**
"Rollup is a bundler built specifically around ES Modules, optimized for producing small, clean, tree-shaken output — which is exactly what you want when you're publishing a library for other people to import into their own apps. Unlike Webpack, it doesn't wrap your code in its own runtime/module system, and it can easily output multiple formats (ESM, CommonJS, UMD) from one config, which libraries often need. It's not really built for complex app features like a full dev server with HMR — that's Webpack or Vite's job."

---

## Output Formats: esm / cjs / umd / iife — and why a library needs multiple

Rollup can emit the *same* bundled code in different module formats, because different consumers of your published library understand different formats:

| Format | Stands for | Who consumes it | Example |
|---|---|---|---|
| `esm` | ES Module | Modern bundlers/browsers that understand native `import`/`export` | `import { debounce } from 'my-lib'` |
| `cjs` | CommonJS | Node.js, older tools, anything using `require()` | `const { debounce } = require('my-lib')` |
| `umd` | Universal Module Definition | Works in *any* environment — browser global, AMD, or CommonJS — detects which at runtime | `<script src="my-lib.umd.js"></script>` then use `window.MyLib` |
| `iife` | Immediately Invoked Function Expression | A plain `<script>` tag with no module system at all | Just drop the script in an HTML page; it runs immediately and can expose a global |

```js
// rollup.config.js — emitting multiple formats from one input
export default {
  input: 'src/index.js',
  output: [
    { file: 'dist/index.esm.js', format: 'esm' },
    { file: 'dist/index.cjs.js', format: 'cjs' },
    { file: 'dist/index.umd.js', format: 'umd', name: 'MyLib' }, // 'name' required for UMD/IIFE global variable
  ],
};
```

**Why a library needs multiple formats:**
A single library might be consumed by:
- A modern app using Vite/Webpack with native `import` → wants the `esm` build (best tree-shaking for them).
- A Node.js backend script using `require()` → wants the `cjs` build.
- Someone pasting a `<script>` tag directly into an HTML page with no build tooling at all → wants the `umd` (or `iife`) build.

Publishing all three (via `package.json`'s `main`, `module`, and `unpkg`/`browser` fields) means the library works everywhere without forcing every consumer onto the same toolchain.

```json
// A library's package.json pointing at Rollup's multiple outputs
{
  "main": "dist/index.cjs.js",     // Node/CommonJS consumers
  "module": "dist/index.esm.js",   // bundlers that understand ESM (enables their tree-shaking)
  "unpkg": "dist/index.umd.js",    // CDN / plain <script> tag consumers
  "sideEffects": false
}
```

**How to explain this in an interview (simple English)**
"A published library doesn't control how its consumers build their own apps — some use modern bundlers with `import`, some use Node with `require`, some just drop a `<script>` tag with no build step at all. Rollup makes it easy to output ESM, CommonJS, and UMD builds from the same source in one config, so the library works correctly no matter how it's consumed."

---

## Quick Summary Table

| Concept | One-liner |
|---|---|
| Rollup | ESM-native bundler focused on small, clean, tree-shaken output |
| Best for | Bundling libraries (npm packages), not full apps |
| Why not apps | No built-in dev server/HMR, minimal asset handling by default, needs extra plugins for CJS interop |
| `esm` format | For modern bundlers/browsers using native `import` |
| `cjs` format | For Node.js / `require()` consumers |
| `umd` format | Works everywhere — browser global, AMD, or CJS (auto-detected) |
| `iife` format | Plain `<script>` tag, no module system, runs immediately |
