# 05. Webpack Interview Q&A (Most Commonly Asked)

**1. What is Webpack, in one sentence?**
A module bundler that starts from an entry file, builds a dependency graph of everything it imports (JS, CSS, images, etc.), and produces optimized output bundles for the browser.

**2. What's the difference between loaders and plugins?**
Loaders transform individual files (file-level, e.g., `babel-loader` converts JSX to JS). Plugins hook into the broader build lifecycle and can act on the whole compilation (e.g., `HtmlWebpackPlugin` generates an HTML file referencing the final bundle). Configured in `module.rules` vs `plugins` respectively.

**3. How does Webpack know what to bundle?**
It starts at the configured `entry` file(s), parses `import`/`require` statements to find dependencies, recursively opens those files and repeats — building a full dependency graph. Only files reachable from an entry point end up in the output; unused files are never touched.

**4. What is tree-shaking, and why does it need ES Modules?**
Tree-shaking removes exported code that's never imported/used anywhere, shrinking the bundle. It relies on `import`/`export` being *static* (fixed at the top level, not computed at runtime), so the bundler can determine usage just by reading code. CommonJS's `require`/`module.exports` is dynamic, so bundlers can't safely prove code is unused — tree-shaking mostly fails on CJS-only code.

**5. How do you reduce bundle size in a Webpack app?**
- Code-split with dynamic `import()` (route/component-level lazy loading).
- Use `splitChunks` to separate vendor code so it caches independently.
- Ensure tree-shaking works (use ESM imports, mark `sideEffects: false` where safe, avoid `import _ from 'lodash'` in favor of named/ESM imports).
- Minify with Terser (default in `mode: 'production'`).
- Analyze the bundle with `webpack-bundle-analyzer` to find unexpectedly large dependencies.
- Compress assets (gzip/brotli) at the server/CDN level (not Webpack's job directly, but part of the overall size story).

**6. What's the difference between `webpack.dev.js` and `webpack.prod.js` in a typical setup?**
They're usually merged with a shared `webpack.common.js` via `webpack-merge`. Dev config prioritizes speed and debuggability: `mode: 'development'`, fast source maps (`eval-source-map`), `webpack-dev-server` with HMR enabled, no minification. Prod config prioritizes output quality: `mode: 'production'`, minification via Terser, `MiniCssExtractPlugin` for real CSS files instead of `style-loader`, `contenthash` filenames for caching, and often no source maps shipped publicly (or `hidden-source-map` uploaded privately to error tracking).

**7. What is code-splitting, and how do you trigger it?**
Splitting output into multiple chunks loaded on demand instead of one giant bundle. Triggered via dynamic `import()` (e.g., `React.lazy(() => import('./Page'))`), or automatically for shared/vendor code via `optimization.splitChunks`.

**8. What's the difference between `style-loader` and `MiniCssExtractPlugin`?**
Both handle CSS that's imported into JS, but `style-loader` injects CSS into the page via a `<style>` tag at runtime using JS (fine for dev/HMR), while `MiniCssExtractPlugin` extracts CSS into a real, separate `.css` file loaded via `<link>` (better for production — parallel loading, independent caching, no flash of unstyled content).

**9. What does `mode: 'production'` actually change?**
Enables minification (Terser), sets `process.env.NODE_ENV` to `'production'` (so libraries like React strip dev warnings), and applies other built-in optimizations (module concatenation/"scope hoisting," tree-shaking-friendly defaults). `development` mode favors build speed and readable output/error messages instead.

**10. What is HMR and what problem does it solve?**
Hot Module Replacement swaps only the changed module into a running app in the browser, without a full page reload — preserving in-memory app state (form data, component state) and making the dev feedback loop much faster than reload-everything.

**11. Why would you use `contenthash` instead of `hash` in output filenames?**
`hash` changes for the *entire build* whenever anything changes, invalidating the browser cache for every output file even if most of them are unchanged. `contenthash` is tied to a specific file's actual content, so only genuinely changed files get a new filename/cache-bust — unrelated files (like an unchanged vendor chunk) keep their old filename and stay cached.

**12. What's the difference between `dependencies` and `devDependencies` in the context of a Webpack project?**
Not Webpack-specific, but commonly asked alongside it: `dependencies` are needed at runtime in the shipped app (rare for a frontend app, since everything gets bundled — more relevant for Node backends); `devDependencies` are build-time-only tools (Webpack itself, loaders, plugins, Babel) that never ship to the browser.

**13. How does Webpack handle CSS if CSS isn't JavaScript?**
Via loaders: `css-loader` resolves `@import`/`url()` inside CSS files as dependencies and turns CSS into a JS-consumable module; then either `style-loader` (dev, injects `<style>` tags at runtime) or `MiniCssExtractPlugin` (prod, emits real `.css` files) actually delivers it to the page.

**14. What is `DefinePlugin` used for?**
Compile-time constant substitution — replacing identifiers in source code with fixed values at build time, most commonly setting `process.env.NODE_ENV`, but also for feature flags or environment-specific config (API URLs) baked into the build.

**15. What's the difference between a "chunk" and a "module" in Webpack terminology?**
A **module** is a single file (with its own dependencies) in the graph. A **chunk** is a group of modules that Webpack decides to output together as one file — one chunk can contain many modules (e.g., a vendor chunk bundling all of `node_modules`'s used code).

**16. Why can bundling actually make dev slower, and what's the modern fix?**
Traditional bundlers (Webpack) must bundle your *entire* app before serving even a single page in dev, and every full bundle build takes time proportional to app size. Vite's dev server sidesteps this by serving your own source code as native ES Modules directly to the browser (no bundling needed at all in dev) and only pre-bundling `node_modules` dependencies with esbuild — this is why Vite's dev server starts near-instantly even on large apps, compared to Webpack.

**17. What is Module Federation?**
A Webpack 5 feature enabling micro-frontend architectures: multiple independently-built and independently-deployed apps can expose/consume modules from each other at runtime, sharing common dependencies (like React) instead of each app bundling its own copy.

**18. How would you debug "why is my bundle so large"?**
Use `webpack-bundle-analyzer` to get a visual treemap of what's actually inside the bundle — often reveals an accidentally-duplicated dependency, a large library imported in full instead of as needed functions, or missing code-splitting on a heavy feature.

**19. What's the difference between `resolve.alias` and a relative import path?**
`resolve.alias` lets you define shortcuts (e.g., `@components` → `src/components`) so imports don't need long relative paths like `../../../components/Button`. Purely a developer-convenience/readability feature; doesn't affect output.

**20. Why does import order matter for `use: [...]` in a loader rule?**
Loaders in a single rule's `use` array run **right to left** (bottom to top if written multi-line). E.g., `use: ['style-loader', 'css-loader']` runs `css-loader` first (resolves CSS as data) then passes its output to `style-loader` (injects into DOM) — getting the order backwards breaks the pipeline.

**21. What is `sideEffects: false` in package.json, and why does it matter for tree-shaking?**
It's a signal from a package author to bundlers: "importing any file in this package, even without using its exports, has no observable side effect — it's safe to fully remove unused exports/files." Without it, bundlers are conservative and may keep code around "just in case" a module's mere presence does something (e.g., a polyfill).

**22. Can Webpack bundle a Node.js backend app?**
Yes, with `target: 'node'` — this changes built-in defaults (e.g., not trying to polyfill Node built-ins like `fs`/`path` for the browser, and not bundling `node_modules` by default). More common for frontend, but this shows understanding that Webpack's assumptions are browser-oriented by default and configurable.

**23. What's the trade-off of enabling full production source maps?**
Slower build time, larger deploy artifacts, and a security consideration — a full source map can reconstruct your original, readable source. Many teams generate source maps in prod but keep them private (upload to Sentry) instead of serving them publicly next to the JS bundle (`hidden-source-map` avoids even the reference comment pointing to the map).

**24. What's the difference between `optimization.splitChunks` and manually creating multiple entries?**
Multiple `entry` points create genuinely separate top-level bundles (e.g., a separate `admin.js` app) — used when you have distinct apps/pages. `splitChunks` operates *within* the dependency graph of your existing entries/chunks to automatically extract shared code (like common vendor libraries) into its own chunk, avoiding duplication across chunks that already exist.

**25. Webpack vs Vite — when would you still choose Webpack for a new project?**
When you need something Webpack's mature ecosystem uniquely offers well — Module Federation for micro-frontends, highly specific/legacy loader-plugin requirements, or you're joining/extending an existing large Webpack codebase where migrating to Vite isn't worth the cost. For a new, typical app with no unusual requirements, Vite is generally the faster, simpler default today.
