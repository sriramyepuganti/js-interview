# 03. Optimization: Tree-Shaking, Code-Splitting, Caching

## Tree-Shaking

**What is it?**
Removing exported code that is never actually imported/used anywhere in your app, so it's dropped from the final bundle.

**Why was it invented / what problem does it solve?**
Libraries often export dozens of functions, but a given app might use only 2-3 of them. Without tree-shaking, importing from that library would pull in the *entire* library into your bundle, wasting bytes users have to download.

**How Webpack determines dead code**
Webpack relies on the **static structure of ES Modules** (`import`/`export`) to determine, at build time (without running the code), exactly which exports are actually used:

```js
// mathUtils.js
export function add(a, b) { return a + b; }
export function subtract(a, b) { return a - b; } // unused anywhere

// index.js
import { add } from './mathUtils.js';
console.log(add(2, 3));
```

Webpack's process:
1. During bundling, it marks which exports of each module are actually imported elsewhere ("used exports" analysis).
2. In production `mode`, Terser (the minifier Webpack uses by default) performs **dead code elimination** — it physically removes code paths that are provably unreachable, including unused exports that Webpack has flagged.

**Why it needs static ESM imports to work well**
`import`/`export` are *static* — they must appear at the top level, with literal names, and can't be conditionally computed. This lets tools analyze the whole dependency graph just by reading the code (no execution needed) to know exactly what's used.

CommonJS (`require`/`module.exports`) is *dynamic* — you can `require()` inside an `if` block, compute a variable path, or mutate `module.exports` after the fact. Tools can't safely prove something is dead code without actually running it, so tree-shaking mostly fails on CommonJS modules. **This is why library authors ship an ESM build (`"module"` field in package.json) specifically so bundlers can tree-shake them** — a CJS-only library (`"main"` field) forces consumers to bundle the whole thing.

```json
// package.json of a well-behaved library
{
  "main": "dist/index.cjs.js",   // CommonJS fallback (Node, older tools)
  "module": "dist/index.esm.js", // ESM build — bundlers prefer this for tree-shaking
  "sideEffects": false           // tells bundlers "no import in this package has side effects; safe to drop unused ones"
}
```

The `sideEffects: false` flag matters too — even with ESM, Webpack is conservative by default: if a module *might* have a side effect just from being imported (e.g., it polyfills something globally, or mutates a shared object), Webpack won't remove it even if none of its exports are used, unless you explicitly tell it it's safe.

**Real-world usage**
Importing a single function from a large utility library (`import { debounce } from 'lodash-es'` instead of `import _ from 'lodash'`) is a classic tree-shaking-friendly pattern — `lodash-es` is the ESM build of lodash specifically so this works.

**How to explain this in an interview (simple English)**
"Tree-shaking removes exported code that's never imported anywhere, so it doesn't bloat the final bundle. It relies on ES Modules being static — the bundler can see exactly what's imported just by reading the code. CommonJS's `require` is dynamic, so bundlers can't safely prove code is unused, which is why tree-shaking mostly doesn't work with CommonJS, and why libraries ship an ESM build specifically to support it."

---

## Code-Splitting

**What is it?**
Breaking the output into multiple chunks that load on demand, instead of one giant bundle the user must download upfront.

### Dynamic `import()`

**What it does:** Instead of a static `import` at the top of a file (which forces that code into the same chunk), `import()` (a function call, returning a Promise) tells Webpack "this is a separate chunk, load it only when this line actually runs."

```js
// Static import — always bundled into the same chunk as this file
import Dashboard from './Dashboard';

// Dynamic import — Webpack automatically creates a separate chunk for Dashboard
button.addEventListener('click', () => {
  import('./Dashboard').then((module) => {
    const Dashboard = module.default;
    // render it
  });
});
```

**Why/when:** Any feature not needed on initial page load — a modal, an admin panel, a rarely-used settings page, a heavy charting library — is a candidate. This directly reduces the initial JS payload, which improves metrics like First Contentful Paint / Time to Interactive.

### Lazy loading routes/components (React example)

```js
import { lazy, Suspense } from 'react';

const Dashboard = lazy(() => import('./Dashboard')); // uses dynamic import under the hood

function App() {
  return (
    <Suspense fallback={<Spinner />}>
      <Dashboard />
    </Suspense>
  );
}
```

**Why:** most real apps have many routes but a user only visits one at a time. Bundling every route's code into a single file wastes bandwidth for code the user may never see. Route-based code-splitting is the single highest-impact code-splitting pattern in most apps.

### SplitChunksPlugin (built into Webpack 5, `optimization.splitChunks`)

**What it does:** Automatically finds opportunities to pull shared/common code into separate chunks, rather than duplicating it across multiple entry bundles or leaving it clumped with app code.

```js
module.exports = {
  optimization: {
    splitChunks: {
      chunks: 'all', // apply to both sync and dynamic imports
      cacheGroups: {
        vendor: {
          test: /[\\/]node_modules[\\/]/,
          name: 'vendor',
          chunks: 'all',
        },
      },
    },
  },
};
```

**Why/when — vendor chunk separation:** third-party dependencies (React, lodash, etc.) change far less often than your own app code. If they're bundled together with your app code, then every single app code change invalidates the cache for the *entire* bundle, forcing users to re-download unchanged vendor code too. Separating vendor code into its own chunk means:
- Users' browsers cache the vendor chunk for a long time (it rarely changes).
- Only your (smaller) app chunk needs re-downloading after a typical deploy.

---

## Caching Strategy: `contenthash` in Filenames

**What is it?**
Naming output files with a hash derived from their *content*, e.g., `main.8f7a2c1.js`, so the filename only changes when the file's actual content changes.

```js
output: {
  filename: '[name].[contenthash].js',
}
```

**Why it matters:**
- Browsers cache files aggressively based on URL (filename). If you always name your output `bundle.js`, browsers might serve a stale cached copy after you deploy new code (or you'd have to disable caching entirely, hurting performance).
- With `contenthash`, unrelated files (e.g., vendor chunk) keep the *same* filename/hash across a deploy if their content didn't change — so the browser keeps serving them from cache — while only genuinely changed files get a new filename, forcing a fresh download.

`[contenthash]` vs `[hash]` vs `[chunkhash]`:

| Placeholder | Changes when |
|---|---|
| `[hash]` | *Any* file in the entire build changes — worst for caching, invalidates everything |
| `[chunkhash]` | Anything in that specific chunk changes |
| `[contenthash]` | The actual output file's content changes (most precise, best for caching, recommended) |

**Real-world usage**
This is exactly why, when you inspect deployed React/Vue apps in browser dev tools, you see filenames like `main.3f2a1b9c.chunk.js` — that hash is the caching strategy in action.

**How to explain this in an interview (simple English)**
"I use `contenthash` in output filenames so that a file's name only changes when its content actually changes. That way browsers can cache unchanged files (like a vendor chunk) indefinitely across deploys, and only re-download the files that genuinely changed — which is a big performance win for repeat visitors."

---

## Quick Summary Table

| Technique | What it does | Why |
|---|---|---|
| Tree-shaking | Drops unused exports from the bundle | Smaller bundles; needs static ESM to detect usage reliably |
| `sideEffects: false` | Tells bundler it's safe to drop unused imports even if they could theoretically run side effects | Enables more aggressive tree-shaking |
| Dynamic `import()` | Loads a module only when needed, as a separate chunk | Reduces initial bundle size |
| Route/component lazy loading | Splits code by route/feature | Users only download what they visit |
| `splitChunks` / vendor chunk | Separates shared/vendor code into its own chunk | Better long-term caching, less duplication |
| `contenthash` filenames | Filename tied to file content | Browsers cache unchanged files across deploys |
