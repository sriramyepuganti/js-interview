# 02. Rollup Plugins and Config

## Rollup's Plugin System — and why it needs more plugins than Webpack for "basic" things

**What is it?**
Rollup ships with a deliberately small core that only understands ES Modules. Anything beyond plain ESM-to-ESM bundling — resolving packages from `node_modules`, handling CommonJS dependencies, transpiling syntax, minifying — is added via plugins, using hooks into Rollup's build pipeline (similar spirit to Webpack plugins, but Rollup doesn't have a separate "loader vs plugin" split — it's just plugins).

**Why Rollup needs more plugins for things Webpack does by default**
Webpack was built to be an all-in-one application bundler — it assumes you'll need to resolve `node_modules`, handle mixed module formats, and process many asset types, so a lot of that is either built-in or expected/documented as "just add this common loader." Rollup deliberately stayed **minimal and ESM-focused** — its core job is "bundle ES modules well," and anything else is opt-in via plugins. This keeps Rollup's core simple and its output clean, but means real-world usage (where you inevitably depend on some CommonJS-only package from npm) requires explicitly adding plugins Webpack users might not think about, because Webpack handles it silently.

### @rollup/plugin-node-resolve

**What it does:** Teaches Rollup how to resolve bare import specifiers like `import React from 'react'` by looking inside `node_modules` (Node.js's own module resolution algorithm) — without this, Rollup only understands relative/absolute paths (`./foo.js`), not package names.

```js
import resolve from '@rollup/plugin-node-resolve';

export default {
  // ...
  plugins: [resolve()],
};
```

**Why you'd need it:** Almost every real project imports at least one npm package by name, not by relative path. Webpack does this resolution out of the box; Rollup requires this plugin explicitly, in keeping with its "minimal core" philosophy.

### @rollup/plugin-commonjs

**What it does:** Converts CommonJS modules (`require`/`module.exports`) into ES Modules that Rollup can include in its ESM-based dependency graph.

```js
import commonjs from '@rollup/plugin-commonjs';

export default {
  // ...
  plugins: [commonjs()],
};
```

**Why you'd need it:** Rollup's engine is built around static ESM analysis. A huge portion of the npm ecosystem (especially older packages) is still published as CommonJS. Without this plugin, Rollup simply can't include such a dependency in the bundle at all — this plugin bridges the gap by converting CJS to an ESM-compatible shape at build time (with some approximation, since CJS is dynamic and ESM is static — this is also *why* CJS dependencies pulled in this way often don't tree-shake as well as native ESM ones).

### @rollup/plugin-babel (or the newer, faster @rollup/plugin-swc-family tools)

**What it does:** Runs Babel (a per-file transpiler) on modules as Rollup processes them — e.g., transpiling JSX, TypeScript syntax, or newer JS syntax down to a target compatibility level.

```js
import babel from '@rollup/plugin-babel';

export default {
  // ...
  plugins: [babel({ babelHelpers: 'bundled' })],
};
```

**Why you'd need it:** Same reasoning as `babel-loader` in Webpack — bundling and transpiling are different jobs (see the shared overview doc). Rollup only bundles; it delegates syntax transformation to Babel via this plugin, matching source syntax to whatever your library's supported consumers need.

### @rollup/plugin-terser

**What it does:** Runs Terser (a minifier) on the final Rollup output to shrink file size.

```js
import terser from '@rollup/plugin-terser';

export default {
  // ...
  plugins: [terser()], // usually only for the minified production output variant
};
```

**Why you'd need it:** Rollup's core job is bundling + tree-shaking, not minification — that's a separate concern handled by its own plugin, again in line with Rollup's minimal-core philosophy (Webpack, by contrast, bundles Terser in by default under `mode: 'production'`).

### Plugin Order Matters

```js
// Correct, conventional order:
plugins: [
  resolve(),   // 1. find packages in node_modules
  commonjs(),  // 2. convert any CJS packages found into ESM-compatible modules
  babel({ babelHelpers: 'bundled' }), // 3. transpile syntax
  terser(),    // 4. minify the final output (often only for a dedicated minified build variant)
]
```

Plugins run in array order for most hooks — resolving packages before trying to convert their module format before transpiling their syntax is the logical pipeline order.

---

## Quick Reference Table

| Plugin | What it does | Why needed (vs Webpack's default behavior) |
|---|---|---|
| `@rollup/plugin-node-resolve` | Resolves bare `import 'package-name'` specifiers via `node_modules` | Webpack does this natively; Rollup's minimal core doesn't |
| `@rollup/plugin-commonjs` | Converts CommonJS deps into ESM-compatible modules | Rollup's engine is ESM-only by design; most bundlers (Webpack) handle mixed CJS/ESM transparently |
| `@rollup/plugin-babel` | Transpiles JS/JSX/TS syntax per file | Bundling and transpiling are separate jobs in both tools; Rollup needs this plugin explicitly |
| `@rollup/plugin-terser` | Minifies final output | Rollup doesn't minify by default; Webpack's `production` mode does |

**How to explain this in an interview (simple English)**
"Rollup keeps its core deliberately small — it only truly understands ES Modules. Anything else, like resolving npm packages from `node_modules`, converting CommonJS dependencies, transpiling syntax, or minifying, is added through plugins. Webpack does a lot of that by default because it's built to be an all-in-one app bundler; Rollup stays minimal on purpose, which keeps its output clean but means a typical real project still needs `node-resolve`, `commonjs`, and often `babel` or `terser` plugins to work with the real npm ecosystem."
