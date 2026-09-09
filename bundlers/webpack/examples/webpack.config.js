// ─────────────────────────────────────────────────────────────────────────
// MINIMAL BUT COMPLETE WEBPACK CONFIG — annotated reference, not meant to be
// run as-is (no node_modules installed here). Every field is explained so
// this can be read as study material.
// ─────────────────────────────────────────────────────────────────────────

const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const webpack = require('webpack');

module.exports = (env, argv) => {
  const isProduction = argv.mode === 'production';

  return {
    // ── MODE ──────────────────────────────────────────────────────────
    // Toggles a bundle of sensible defaults:
    // 'development' -> fast rebuilds, no minification, NODE_ENV='development'
    // 'production'  -> minification on, NODE_ENV='production', tree-shaking-friendly
    mode: isProduction ? 'production' : 'development',

    // ── ENTRY ─────────────────────────────────────────────────────────
    // Where Webpack starts building the dependency graph. Only files
    // reachable from here (via import/require) get bundled.
    entry: './src/index.js',

    // ── OUTPUT ────────────────────────────────────────────────────────
    output: {
      // [contenthash] changes only when THIS file's content changes,
      // so unchanged files keep their name/browser-cache across deploys.
      filename: isProduction ? '[name].[contenthash].js' : '[name].js',
      path: path.resolve(__dirname, 'dist'), // must be an absolute path
      clean: true, // wipe old files from dist/ before each build (replaces CleanWebpackPlugin)
    },

    // ── SOURCE MAPS ───────────────────────────────────────────────────
    // Dev: fast rebuilds + decent accuracy. Prod: full accuracy but slower
    // to build; here we still generate one for local study purposes.
    devtool: isProduction ? 'source-map' : 'eval-source-map',

    // ── MODULE RULES (LOADERS) ────────────────────────────────────────
    // Loaders transform INDIVIDUAL FILES as they're added to the graph.
    module: {
      rules: [
        {
          // Transpile modern JS (and JSX, if you add @babel/preset-react)
          // down to broadly-compatible JS. Skip node_modules — those are
          // assumed to already be published in a compatible format.
          test: /\.jsx?$/,
          exclude: /node_modules/,
          use: {
            loader: 'babel-loader',
            options: {
              presets: ['@babel/preset-env'],
            },
          },
        },
        {
          // CSS pipeline:
          // - css-loader resolves @import/url() inside CSS as dependencies
          // - in dev: style-loader injects <style> tags via JS (fast HMR)
          // - in prod: MiniCssExtractPlugin.loader emits a real .css file
          //   instead (better caching, no flash-of-unstyled-content)
          test: /\.css$/,
          use: [
            isProduction ? MiniCssExtractPlugin.loader : 'style-loader',
            'css-loader',
          ],
        },
        {
          // Webpack 5 built-in asset modules (replaces file-loader/url-loader).
          // Images become importable dependencies; Webpack copies them to
          // dist/ and rewrites references to the final hashed URL.
          test: /\.(png|jpe?g|gif|svg)$/i,
          type: 'asset/resource',
        },
      ],
    },

    // ── PLUGINS ────────────────────────────────────────────────────────
    // Plugins hook into the BROADER BUILD LIFECYCLE, not just one file.
    plugins: [
      // Generates index.html and auto-injects the correct (hashed) script
      // tag — so we never hardcode a filename that changes every build.
      new HtmlWebpackPlugin({
        template: './src/index.html',
      }),

      // Only active in production: extracts CSS into a separate, real
      // .css file instead of injecting it via JS at runtime.
      ...(isProduction
        ? [new MiniCssExtractPlugin({ filename: '[name].[contenthash].css' })]
        : []),

      // Compile-time constant substitution. Many libraries (e.g. React)
      // check this to strip dev-only warnings in production.
      new webpack.DefinePlugin({
        'process.env.NODE_ENV': JSON.stringify(
          isProduction ? 'production' : 'development'
        ),
      }),
    ],

    // ── OPTIMIZATION ───────────────────────────────────────────────────
    optimization: {
      // Automatically pull shared/vendor code into its own chunk so it
      // caches independently from app code that changes more often.
      splitChunks: {
        chunks: 'all',
        cacheGroups: {
          vendor: {
            test: /[\\/]node_modules[\\/]/,
            name: 'vendor',
            chunks: 'all',
          },
        },
      },
    },

    // ── DEV SERVER ─────────────────────────────────────────────────────
    // Only used when running `webpack serve` locally (not for `build`).
    devServer: {
      static: './dist',
      port: 3000,
      hot: true, // enable Hot Module Replacement
      open: true, // auto-open browser on start
      historyApiFallback: true, // support client-side routing (SPA refresh on deep links)
      proxy: {
        // Forward API calls to a real backend during dev, avoiding CORS setup.
        '/api': 'http://localhost:5000',
      },
    },
  };
};
