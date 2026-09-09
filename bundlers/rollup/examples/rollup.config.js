// ─────────────────────────────────────────────────────────────────────────
// MINIMAL BUT COMPLETE ROLLUP CONFIG — annotated reference for a small
// LIBRARY build (not an app). Not meant to be run as-is (no node_modules
// installed here); this is study material showing correct shape/usage.
// ─────────────────────────────────────────────────────────────────────────

import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import terser from '@rollup/plugin-terser';

// A single INPUT can produce MULTIPLE OUTPUTS (different formats) — this
// is exactly why libraries use Rollup: one build, several consumer targets.
export default {
  // ── INPUT ────────────────────────────────────────────────────────────
  // Where Rollup starts building the dependency graph, same idea as
  // Webpack's `entry`.
  input: 'src/index.js',

  // ── OUTPUT (array = multiple formats from one input) ────────────────
  output: [
    {
      // ESM build: for modern bundlers/apps using native `import`.
      // Preferred by consumers' own bundlers because it enables THEIR
      // tree-shaking too (only what they use from this library ships).
      file: 'dist/index.esm.js',
      format: 'esm',
    },
    {
      // CommonJS build: for Node.js / anything using `require()`.
      file: 'dist/index.cjs.js',
      format: 'cjs',
      exports: 'named', // be explicit about named exports for CJS interop
    },
    {
      // UMD build: works in ANY environment (browser global, AMD, or
      // CommonJS) — auto-detects at runtime. Needed for plain <script>
      // tag consumers with no build tooling at all.
      file: 'dist/index.umd.js',
      format: 'umd',
      name: 'MyLib', // required for umd/iife: the global variable name (window.MyLib)
    },
    {
      // Minified UMD variant for direct <script> use in production,
      // where every KB matters and there's no bundler to minify it later.
      file: 'dist/index.umd.min.js',
      format: 'umd',
      name: 'MyLib',
      plugins: [terser()], // output-specific plugin: only minify THIS output
    },
  ],

  // ── PLUGINS (apply to input/bundling stage) ──────────────────────────
  plugins: [
    // 1. Resolve bare `import 'some-package'` specifiers via node_modules.
    //    Rollup's core only understands relative/absolute paths without this.
    resolve(),

    // 2. Convert any CommonJS dependencies pulled in from node_modules
    //    into an ESM-compatible shape, since Rollup's engine is ESM-only.
    commonjs(),
  ],
};
