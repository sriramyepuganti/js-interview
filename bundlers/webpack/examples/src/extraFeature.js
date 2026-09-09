// This module is only ever loaded via the dynamic import() in index.js,
// so Webpack outputs it as a SEPARATE chunk (code-splitting) instead of
// bundling it into the main entry chunk.

export function runExtraFeature() {
  console.log('Extra feature loaded on demand, as its own chunk.');
}
