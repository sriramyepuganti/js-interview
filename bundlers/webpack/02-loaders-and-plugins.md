# 02. Common Loaders and Plugins

## Common Loaders

Recall: loaders transform **individual files** as Webpack encounters them while building the dependency graph. They're configured in `module.rules`, each with a `test` (regex to match filenames) and a `use` (which loader(s) to run, in **right-to-left / bottom-to-top order**).

### babel-loader

**What it does:** Runs Babel on each matched JS/JSX file, converting modern JS syntax (and JSX) into syntax older browsers understand.

**Why you'd need it:** You write ES2022+/JSX; browsers (especially older ones) don't support all of that natively. Without this, your code either crashes on older browsers or you can't use JSX at all (browsers have no idea what `<div>` means inside a `.js` file).

```js
{
  test: /\.jsx?$/,
  exclude: /node_modules/,
  use: {
    loader: 'babel-loader',
    options: { presets: ['@babel/preset-env', '@babel/preset-react'] },
  },
}
```

### css-loader

**What it does:** Understands `@import` and `url()` inside CSS files, resolving them like JS dependencies, and turns CSS into a JS module (a string that, when required, represents the CSS).

**Why you'd need it:** Without it, Webpack (a JS-focused tool) has no idea what to do with a `.css` file being imported. `css-loader` makes `import './styles.css'` in JS actually resolvable.

### style-loader

**What it does:** Takes the CSS that `css-loader` produced (as JS) and injects it into the page by creating `<style>` tags in the DOM at runtime.

**Why you'd need it:** `css-loader` alone just resolves CSS as data — it doesn't *apply* it to the page. `style-loader` is what actually makes the styles visible. Commonly used **together**, and order matters:

```js
{
  test: /\.css$/,
  use: ['style-loader', 'css-loader'], // right-to-left: css-loader runs first, then style-loader
}
```

Note: `style-loader` is typically only used in **development** (injecting `<style>` tags via JS is fine for fast HMR, but bad for production — it means CSS loads only after JS executes, causing flash-of-unstyled-content, and can't be cached separately). In production, `MiniCssExtractPlugin` is used instead to emit real `.css` files.

### file-loader / asset modules

**What it does (older Webpack, `file-loader`):** Copies a file (image, font, etc.) to the output directory and returns its public URL so it can be referenced in code/CSS.

**Webpack 5+ (built-in "asset modules")** replaced `file-loader`/`url-loader` with a native feature — no separate package needed:

```js
{
  test: /\.(png|jpg|gif|svg)$/,
  type: 'asset/resource', // emits a separate file, like file-loader
  // type: 'asset/inline'  -> inlines as base64 data URI, like url-loader
  // type: 'asset'         -> automatically picks resource vs inline based on file size
}
```

**Why you'd need it:** Bundlers are JS-centric by default; without an asset loader/module, `import logo from './logo.png'` has no meaning. This lets images/fonts be treated as first-class dependencies (with hashed filenames for caching, and no manual copy step).

### Quick Loader Reference Table

| Loader | Handles | Why needed |
|---|---|---|
| `babel-loader` | `.js`/`.jsx` | Transpile modern JS/JSX to broadly-compatible JS |
| `ts-loader` / `@babel/preset-typescript` | `.ts`/`.tsx` | Compile/strip TypeScript |
| `css-loader` | `.css` (`@import`, `url()`) | Resolve CSS as a dependency graph |
| `style-loader` | Output of css-loader | Inject CSS into DOM at runtime (dev) |
| `sass-loader` | `.scss`/`.sass` | Compile Sass to plain CSS (feeds into css-loader) |
| Asset modules (`asset/resource`, `asset/inline`) | Images, fonts | Treat binary assets as importable modules |

---

## Common Plugins

Recall: plugins hook into the broader compilation lifecycle — they can act on the entire bundle/build, not just one file.

### HtmlWebpackPlugin

**What it does:** Automatically generates an `index.html` file (from a template) that includes `<script>`/`<link>` tags pointing at your actual, hashed output filenames.

**Why/when you'd need it:** Your output JS filename often includes a content hash (`bundle.a1b2c3.js`) that changes every build. Hardcoding that filename in a static HTML file would break every time you rebuild. This plugin auto-injects the *current* correct filenames.

```js
new HtmlWebpackPlugin({
  template: './src/index.html', // your HTML template (can have placeholders)
  filename: 'index.html',
})
```

### MiniCssExtractPlugin

**What it does:** Extracts CSS that was imported into JS (`import './styles.css'`) into a **separate, real `.css` file**, instead of injecting it via JS at runtime.

**Why/when you'd need it:** For production, you want CSS to load in parallel with JS (via a `<link>` tag), be cacheable independently, and not require JS execution before styles apply (avoids flash-of-unstyled-content). This is the production counterpart to `style-loader`.

```js
{
  test: /\.css$/,
  use: [MiniCssExtractPlugin.loader, 'css-loader'], // note: use the plugin's OWN loader here instead of style-loader
}
// and in plugins:
new MiniCssExtractPlugin({ filename: '[name].[contenthash].css' })
```

### DefinePlugin

**What it does:** Replaces global identifiers in your source code with fixed values **at build time** — a simple find-and-replace done at compile time, not runtime.

**Why/when you'd need it:** Feature flags, environment-specific config (API URLs), and — most commonly — setting `process.env.NODE_ENV` so libraries like React can strip out dev-only code paths in production builds.

```js
new webpack.DefinePlugin({
  'process.env.NODE_ENV': JSON.stringify('production'),
  'API_URL': JSON.stringify('https://api.example.com'),
})
```

**Important nuance:** because this is literal text substitution, string values must be wrapped in `JSON.stringify` — otherwise you'd be injecting bare identifiers/code instead of a quoted string, which would break or silently misbehave.

### Quick Plugin Reference Table

| Plugin | What it does | Why/when |
|---|---|---|
| `HtmlWebpackPlugin` | Generates HTML with correct injected script/link tags | Output filenames are hashed and change every build |
| `MiniCssExtractPlugin` | Extracts CSS into real `.css` files | Production CSS delivery (parallel load, cacheable, no FOUC) |
| `DefinePlugin` | Compile-time constant substitution | Set `NODE_ENV`, inject config/feature flags |
| `CleanWebpackPlugin` | Deletes old build output before a new build | Prevents stale files from accumulating in `dist/` |
| `BundleAnalyzerPlugin` | Visualizes what's inside your bundle (treemap) | Diagnose why bundle size is large |

**How to explain loaders vs plugins with examples in an interview (simple English)**
"A loader is like `babel-loader` — it looks at one file and transforms its content (JSX to JS). A plugin is like `HtmlWebpackPlugin` — it doesn't care about one file's content, it hooks into the whole build process to do something bigger, like generating an HTML file that references your final bundle names. Loaders answer 'how do I read this file type,' plugins answer 'what else should happen during/after the build.'"
