# 03. Modules: CommonJS and ES Modules (ESM)

## Why does Node need a module system at all?
**What is it?** A module system lets you split code across files and load/reuse it (`require`/`import`), instead of writing everything in one giant file or relying on global variables.

**Why was it invented?** Browsers historically had no built-in module system (multiple `<script>` tags all shared one global scope — a mess of naming collisions). When Node was created in 2009, JS itself had no standardized module syntax (ES Modules didn't exist yet — that came in ES2015/ES6, 2015, and browsers/tools took years to support it fully). So Node adopted **CommonJS**, an existing spec for server-side JS modules, giving us `require()` and `module.exports`. Years later, once ES Modules (`import`/`export`) became a real, standardized, browser-native feature, Node added support for them too — so today Node supports **both**.

---

## CommonJS (`require` / `module.exports`)
**What is it?** The original Node module system. Every file is treated as its own module with its own scope; you pull in other modules with `require()` and expose things with `module.exports`.

```js
// math.js
function add(a, b) { return a + b; }
module.exports = { add };

// app.js
const { add } = require('./math');
console.log(add(2, 3)); // 5
```

### How it actually works under the hood (the "module wrapper")
When Node loads a CommonJS file, it doesn't run your code as-is — it **wraps** it in a function like this:
```js
(function (exports, require, module, __filename, __dirname) {
  // your file's code goes here
});
```
This is *why* `require`, `module`, `exports`, `__filename`, and `__dirname` are available in every CommonJS file without you importing them — they're just parameters injected by this wrapper function. It's also why top-level `var`/`let`/`const` declarations in one file don't leak into another — each file gets its own function scope.

### Module caching
`require()` **caches** modules by their resolved file path. The first `require('./math')` runs the file and stores the resulting `module.exports` object; every subsequent `require('./math')` — from any file — returns the **same cached object**, without re-running the file.
```js
// Both of these get the SAME object reference, and the module's top-level code runs only ONCE
const a = require('./math');
const b = require('./math');
console.log(a === b); // true
```
**Why does this matter?** It means modules can hold shared state (e.g., a singleton DB connection), but it also means mutating an exported object in one place affects everyone who required it — a common source of subtle bugs.

**Real-world usage:** Almost all pre-2020 Node code, and still extremely common today — most npm packages ship CommonJS (or both) for backward compatibility.

---

## ES Modules (ESM) in Node
**What is it?** The standardized JavaScript module syntax (`import`/`export`) that's native to the language itself (not Node-specific), running the same way conceptually in browsers and Node.

**How to enable it in Node:**
- Set `"type": "module"` in `package.json`, **or**
- Name files with a `.mjs` extension (works regardless of `package.json`).

```json
// package.json
{ "type": "module" }
```
```js
// math.mjs (or math.js if type: module)
export function add(a, b) { return a + b; }

// app.mjs
import { add } from './math.mjs';
console.log(add(2, 3));
```

### Key differences from CommonJS
| | CommonJS | ESM |
|---|---|---|
| Syntax | `require()` / `module.exports` | `import` / `export` |
| Loading | Synchronous | Asynchronous (under the hood) |
| Top-level `await` | Not supported | Supported |
| `__dirname`/`__filename` | Available automatically | Not available — recreate via `import.meta.url` |
| Analysis | Dynamic (can `require()` conditionally at runtime easily) | Static — imports are analyzable at build time without running code |
| Tree-shaking | Hard (bundlers can't easily tell what's used) | Possible, because imports/exports are static |
| File extension needed in imports | Optional | Required for relative imports (`./math.js`, not `./math`) |

Recreating `__dirname` in ESM:
```js
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
```

### Why was ESM adopted, if CommonJS already worked?
1. **Standardization** — `import`/`export` is part of the actual JavaScript language spec (ECMAScript), not a Node-only convention. Code becomes portable between browser and server without translation.
2. **Static analysis / tree-shaking** — because ESM imports/exports must be at the top level and can't be conditionally computed at runtime the way `require()` calls can, tools (bundlers, minifiers) can determine *exactly* what's used and strip out the rest at build time — smaller bundles for frontend code, and better dead-code elimination generally.
3. **Browser + server parity** — the same module syntax now works natively in `<script type="module">` in browsers and in Node, reducing the "different mental model per environment" problem that existed for a decade.
4. **Top-level `await`** — ESM allows `await` at the top level of a module (no need to wrap in an async IIFE), which is genuinely convenient for startup code (e.g., "connect to DB, then start listening").

---

## Interop gotchas (CommonJS <-> ESM)
- An ESM file **can** `import` a CommonJS module — Node does the conversion for you (the CJS `module.exports` becomes the default export, roughly).
  ```js
  import express from 'express'; // express still ships as CommonJS; this works fine
  ```
- A CommonJS file **cannot** `require()` a pure ESM-only package synchronously — you'd need a dynamic `import()` (which returns a Promise), because ESM loading is inherently async and `require()` is inherently sync.
  ```js
  // inside a CommonJS file, to load an ESM-only package:
  const mod = await import('esm-only-package'); // only works inside an async function
  ```
- Mixed named/default export confusion: some CJS packages that get imported from ESM don't cleanly expose named exports (Node has to guess via static analysis of `module.exports`), which occasionally forces you to do `import pkg from 'x'; const { thing } = pkg;` instead of `import { thing } from 'x'`.
- `package.json`'s `"type"` field is **directory-scoped by default** — if you need to mix, you can put a `package.json` with `{"type":"commonjs"}` in a specific subfolder to override the parent's ESM setting, or just use explicit `.mjs`/`.cjs` extensions to be unambiguous regardless of `type`.

**How to explain this section in an interview:**
> "Node originally used CommonJS — `require`/`module.exports` — because JS had no standardized module system when Node launched. Under the hood, `require()` wraps each file in a function that injects `require`, `module`, `exports`, `__dirname`, and caches modules by path so they only execute once. Later, JavaScript standardized ES Modules — `import`/`export` — which Node now supports via `type: module` or `.mjs` files. ESM was adopted because it's the real language standard, it allows static analysis for tree-shaking, it gives browser/server parity, and it supports top-level await. The main interop gotcha is that ESM can import CommonJS easily, but CommonJS can only load ESM via async dynamic `import()`, since ESM loading is asynchronous by design."
