# 03. Rollup Interview Q&A (Most Commonly Asked)

**1. What is Rollup, in one sentence?**
An ES-Module-native bundler focused on producing small, clean, tree-shaken output — most commonly used to bundle libraries (npm packages) rather than full applications.

**2. Why is Rollup considered better at tree-shaking than Webpack (historically)?**
Rollup was built from the ground up around ESM's static `import`/`export` structure specifically to maximize dead-code elimination, and it doesn't wrap output in its own module-loader runtime the way Webpack does — so its output reads closer to hand-written, concatenated code with unused parts physically removed. Webpack has closed much of this historical gap in recent versions, but Rollup's output is still generally considered cleaner/more minimal for library use cases.

**3. Why doesn't Rollup resolve `node_modules` imports out of the box?**
Rollup's core is deliberately minimal and only understands ES Modules with relative/absolute paths. Resolving bare package names (`import react from 'react'`) via Node's module resolution algorithm requires the `@rollup/plugin-node-resolve` plugin — Webpack does this natively because it's built to be an all-in-one app bundler.

**4. Why does Rollup need `@rollup/plugin-commonjs`?**
Because a large part of the npm ecosystem still publishes CommonJS (`require`/`module.exports`), but Rollup's engine is designed around static ESM analysis. This plugin converts CJS modules into an ESM-compatible shape so Rollup can include them in its bundle — though tree-shaking on such converted modules is generally weaker than on native ESM modules, since CJS's dynamic nature can't be fully statically analyzed.

**5. What output formats can Rollup produce, and why does that matter?**
`esm` (native `import`/`export`, for modern bundlers/browsers), `cjs` (`require`, for Node.js), `umd` (works anywhere — detects environment at runtime), and `iife` (self-running function, for plain `<script>` tags with no module system). Libraries often need to publish multiple formats because consumers use different toolchains.

**6. What does `output.name` do in a Rollup config, and when is it required?**
It sets the name of the global variable your bundle exposes when using the `umd` or `iife` formats (e.g., `window.MyLib`). It's required for those formats because there's no module system to `import` from — the only way to access your library's exports is through that global.

**7. Why would a library ship both a `main` and a `module` field in package.json?**
`main` points to the CommonJS build (for Node/older tooling), and `module` points to the ESM build. Bundlers that understand ESM (which is most modern ones) prefer `module` specifically because it enables tree-shaking on the consumer's side — importing the whole library still lets a tree-shaking bundler strip out the parts the consumer doesn't use.

**8. Does Rollup have a concept of "loaders" like Webpack?**
No — Rollup only has "plugins." There isn't a strict file-transform-vs-lifecycle-hook split in naming the way Webpack frames it; a single Rollup plugin can both resolve/transform files and hook into other build stages.

**9. Can Rollup do code-splitting?**
Yes, via dynamic `import()`, similarly to Webpack — Rollup will emit separate chunks for dynamically imported modules. However, code-splitting is used far less often for libraries (which are usually meant to be small, single-purpose bundles) than for applications, which is part of why Webpack (or Vite, using Rollup for its production app builds) is more associated with code-splitting in practice.

**10. Why doesn't Rollup ship a dev server with HMR like Webpack?**
Rollup's design goal is being a focused, minimal bundler for producing library output — a live dev server with Hot Module Replacement is an application-development concern, not a library-bundling concern, so it's outside Rollup's scope. (Vite solves this by using its own lightweight dev server, separate from Rollup, and only calling on Rollup for the production build step.)

**11. How does Rollup handle CSS or images, compared to Webpack?**
Not natively — Rollup's core only understands JS/ESM. Handling CSS/images requires dedicated community plugins (e.g., `rollup-plugin-postcss`), whereas Webpack treats "everything as a module" out of the box via loaders. This is consistent with Rollup targeting libraries (which often don't ship bundled CSS/images the way apps do) rather than full applications.

**12. What is `@rollup/plugin-terser` used for, and why isn't minification built in?**
It runs the Terser minifier on Rollup's final output to shrink file size. It's a separate plugin (not built into core) because Rollup's philosophy keeps its core to just bundling + tree-shaking, delegating anything else — including minification — to opt-in plugins.

**13. What's the classic "Webpack vs Rollup, when would you use which" interview question — model answer:**
"I'd use Rollup when I'm publishing a library/npm package — its ESM-native design produces the smallest, cleanest, most tree-shakeable output, and it easily emits multiple formats (ESM/CJS/UMD) that different consumers need. I'd use Webpack when I'm building a full application with complex requirements — a dev server with HMR, many asset types treated as modules, fine-grained code-splitting for routes, or things like Module Federation for micro-frontends. In short: Rollup optimizes for 'a clean library other tools will bundle,' Webpack optimizes for 'a complete, deployable application.' In practice, tools like Vite blur this line nicely — using esbuild/its own server for a fast app dev experience, then Rollup under the hood for the actual production app build, getting Rollup's clean output benefits even for an application."

**14. Why might a CJS-heavy dependency tree hurt Rollup's tree-shaking even with `@rollup/plugin-commonjs`?**
Because CommonJS's `require`/`module.exports` are dynamic (can be conditional, computed, or mutated at runtime), a bundler can't always statically prove which parts are unused, even after converting the module's *shape* to be ESM-compatible. The conversion makes CJS *includable*, not necessarily as *tree-shakeable* as code that was ESM from the start.

**15. What does "scope hoisting" mean, and does Rollup do it?**
Scope hoisting means combining multiple modules into a single shared scope in the output, instead of wrapping each module in its own function closure — this produces smaller, faster output because there's less per-module wrapper overhead, and lets the minifier see and optimize across module boundaries. Rollup does this by default (it's central to how it achieves clean output); Webpack added an equivalent optional feature (`ModuleConcatenationPlugin` / "scope hoisting" mode) specifically to close this gap with Rollup in later versions.

**16. Is Rollup slower or faster than Webpack?**
For comparable tasks, Rollup is often faster for pure ESM bundling because its analysis is simpler (fully static ESM graph, less machinery). However, "speed" comparisons today are usually dominated by newer tools like esbuild/SWC (written in Go/Rust) rather than Rollup vs Webpack (both primarily JS-based) — which is exactly why Vite uses esbuild for dev and only uses Rollup for the final production bundling step, not for raw speed during development.

**17. If Rollup is so good at tree-shaking, why isn't it the default choice for building apps too?**
Because tree-shaking is only one piece of what an app needs from a bundler. Apps need a fast dev server, HMR, handling many asset types (CSS, images, fonts) as first-class modules, and often complex code-splitting across many routes — areas where Rollup's minimal, library-focused design requires significantly more manual plugin setup than Webpack (or Vite, which pairs Rollup's strengths with its own app-focused tooling).

**18. What's a `plugins` array's execution order significance in a Rollup config?**
Plugins generally run in the order listed for most build hooks — e.g., you'd put `resolve()` before `commonjs()` before `babel()` so packages are located, then their module format normalized, then their syntax transpiled, in that logical sequence, before a final `terser()` minifies the result.
