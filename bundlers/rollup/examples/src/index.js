// Tiny reference library entry point — this is what rollup.config.js's
// `input` points to. Everything exported here is what consumers of this
// "library" would be able to import.

export function add(a, b) {
  return a + b;
}

export function subtract(a, b) {
  return a - b;
}

// A tree-shaking bundler consuming this library (via the ESM build) would
// drop `subtract` from ITS OWN bundle entirely if it only imports `add`:
//
//   import { add } from 'my-lib'; // only `add` ships in the consumer's bundle
