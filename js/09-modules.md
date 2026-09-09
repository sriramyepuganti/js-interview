# 09 — JavaScript Modules

## Why were modules invented?

**The problem:** In early JS, every `<script>` tag on a page shared ONE single global scope. Any variable or function declared in one file was visible (and could be accidentally overwritten) by every other script on the page. As apps grew, this caused:
- **Global namespace pollution** — naming collisions between unrelated scripts/libraries.
- **No real dependency management** — you had to manually order `<script>` tags so that a file using `$` loaded AFTER jQuery, with no enforcement.
- **No privacy** — everything was globally reachable; there was no clean way to say "this variable is internal to this file."

**What modules solve:** each module file gets its **own scope** — nothing inside it leaks out unless explicitly exported, and it can explicitly declare what it depends on (`import`) — solving pollution, ordering, and privacy all at once.

## CommonJS (CJS) vs ES Modules (ESM)

| | CommonJS | ES Modules |
|---|---|---|
| Origin | Node.js (pre-ES6), designed for server-side | Official ECMAScript standard (ES6/2015) |
| Syntax | `require()` / `module.exports` | `import` / `export` |
| Loading | Synchronous | Can be async (supports dynamic `import()`, top-level `await`) |
| When resolved | Runtime (can be conditional — `require` inside an `if`) | Statically analyzed at parse time (imports must be at top level, fixed paths) |
| Tree-shaking | Not really possible (dynamic, can't statically analyze) | Yes — because imports/exports are static and analyzable, bundlers can eliminate unused code |
| File extension convention | `.js`, `.cjs` | `.mjs`, or `.js` with `"type": "module"` in package.json |
| Browser support | No native browser support | Native support in all modern browsers (`<script type="module">`) |

```js
// CommonJS
const { readFile } = require("fs");
module.exports = { greet: () => "hi" };

// ES Modules
import { readFile } from "fs";
export const greet = () => "hi";
export default function main() {}
```

## Named vs Default Exports

```js
// named exports — a module can have many
export const PI = 3.14;
export function add(a, b) { return a + b; }
// import with matching names:
import { PI, add } from "./math.js";

// default export — a module can have at most ONE
export default class Calculator {}
// import with any name you choose:
import Calc from "./Calculator.js";
```

**When to use which:**
- **Named exports** are preferred for utility modules with multiple related exports (better for tree-shaking, better IDE auto-import, renaming is explicit at the import site with `as`).
- **Default exports** are common for a module whose whole purpose IS one thing (a single React component, a single class).

## Tree-Shaking — Why ESM Enables It

**What is it?**
Tree-shaking is a bundler optimization (Webpack, Rollup, esbuild) that removes exported code that's never actually imported/used anywhere, shrinking the final bundle size.

**Why ESM enables it and CommonJS mostly doesn't:**
ESM's `import`/`export` statements are **static** — they must appear at the top level of a file, with fixed string paths and fixed names, and can't be computed or conditional. This means a bundler can build an accurate dependency graph *without running the code* — just by reading the syntax. If a named export is never imported anywhere in the whole app, the bundler can safely delete it.

CommonJS's `require()` is a normal function call — it can happen conditionally, inside loops, with a computed string (`require(someVariable)`). Since the bundler can't safely predict what will be required without actually running the code, it can't confidently prove a given export is "unused" — so it has to keep it just in case, resulting in larger bundles.

```js
// utils.js — ESM
export function used() { return "I'm imported"; }
export function unused() { return "I'm never imported anywhere — tree-shaken away"; }

// main.js
import { used } from "./utils.js"; // bundler sees exactly what's used; "unused" gets dropped from the final bundle
```

## Dynamic `import()`

**What is it?**
`import()` (as a function call, returning a Promise) lets you load a module **on demand**, at runtime, instead of always up-front.

```js
button.addEventListener("click", async () => {
  const { default: openModal } = await import("./modal.js"); // only downloaded when the button is actually clicked
  openModal();
});
```

**Why invented:** for **code-splitting** — large apps don't need to ship every single module in the initial bundle. Route-based code-splitting in React (`React.lazy(() => import('./Page'))`) and feature-flag-gated code both rely on dynamic `import()` to keep the initial page load fast, only fetching additional JS chunks when actually needed.

## `import.meta`

**What is it?**
An object automatically available inside every ES module (NOT CommonJS) giving the module metadata about itself. Its most universally-supported property is `import.meta.url` — the full URL/path of the current module file.

```js
// inside my-module.mjs (or any .js file in an ESM-mode project)
console.log(import.meta.url);
// "file:///Users/you/project/my-module.mjs" in Node, or an https:// URL in the browser

// A very common real pattern: resolving a path relative to the CURRENT module,
// which replaces CommonJS's old __dirname/__filename (neither exists in ESM)
import { fileURLToPath } from "node:url";
import path from "node:path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
console.log(__dirname); // the directory this module lives in
```

**Why was it invented / what problem does it solve?**
CommonJS modules automatically got `__filename`/`__dirname` as ambient variables — but those are CommonJS-specific globals, and ES modules deliberately don't have them (ESM is a web/engine-level standard, not a Node-specific one, so it can't rely on Node-only globals). `import.meta` gives ESM its OWN standardized way to ask "what module am I, and where am I running," in a way that works identically in Node, browsers, and any other JS engine implementing ES modules — solving the "how do I resolve a path relative to my own file" problem `__dirname` used to solve, without reintroducing a Node-only global into a spec that has to work in browsers too.

**Real-time / real-world usage:** resolving file paths relative to the current module in Node ESM (the `fileURLToPath` pattern above, needed constantly for reading local JSON/config/asset files); feature-detecting "is this the entry module that was run directly" via `import.meta.url === ` the process's entry URL (ESM's replacement for CommonJS's `require.main === module` pattern); bundlers (Vite) expose extra custom properties on `import.meta` (like `import.meta.env` for environment variables).

**How to explain in an interview (simple English):**
"`import.meta` is metadata every ES module automatically has about itself — mainly `import.meta.url`, the module's own file URL. It exists because ES modules can't rely on CommonJS's `__dirname`/`__filename` globals, since ESM has to work the same way in browsers as in Node, and browsers don't have a filesystem-based `__dirname` concept. In Node, the common use is converting `import.meta.url` into a real path with `fileURLToPath()` to resolve files relative to the current module — the direct ESM replacement for `__dirname`."

## Real-world usage
- Every modern frontend app (React, Vue, Angular) is built entirely out of ES modules, bundled together by a build tool.
- Node.js supports both — many packages still ship as CommonJS for backward compatibility, while newer packages are "ESM-only."
- Dynamic imports power route-based code-splitting in virtually every production SPA.

## How to explain in an interview (simple English)

"Before modules, every script on a page shared one big global scope, so variables could collide and there was no real way to say 'this file depends on that file.' Modules fix this by giving each file its own private scope — you only expose what you explicitly `export`, and you explicitly `import` what you need. CommonJS (`require`) was Node's original module system and resolves things at runtime, which is flexible but means tools can't safely tell what's unused. ES Modules (`import`/`export`) are static — the imports/exports are fixed and analyzable without running the code — which is exactly what lets bundlers tree-shake away unused exports and shrink your final bundle."

## Quick Reference

| Term | One-liner |
|---|---|
| Global scope problem | Pre-modules, everything on a page shared one namespace |
| CommonJS | `require`/`module.exports`, dynamic/runtime resolution, Node-originated |
| ES Modules | `import`/`export`, static/analyzable, native browser + modern Node support |
| Tree-shaking | Removing unused exports from the final bundle — needs static imports to work |
| Dynamic `import()` | Loads a module on demand, returns a Promise — enables code-splitting |
