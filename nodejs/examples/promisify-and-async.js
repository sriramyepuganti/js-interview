/**
 * promisify-and-async.js
 *
 * No npm install needed — uses only Node built-ins (fs, util).
 * Run with: node promisify-and-async.js
 *
 * Demonstrates:
 *  1) Converting a classic error-first callback API (fs.readFile) into a Promise-based
 *     one using util.promisify.
 *  2) Using that promisified function with async/await and proper try/catch error handling.
 *  3) A comparison callback-hell version vs the async/await version, to show WHY this
 *     evolution happened.
 */

const fs = require('fs');
const util = require('util');
const path = require('path');

const SAMPLE_FILE = path.join(__dirname, 'promisify-sample.txt');

// ---------------------------------------------------------------------------
// STEP 0: create a sample file synchronously just so this demo has something to read.
// (Using the sync API here only for demo setup convenience -- not a pattern to copy
// for real request-handling code.)
// ---------------------------------------------------------------------------
fs.writeFileSync(SAMPLE_FILE, 'Hello from a promisified fs.readFile call!');

// ---------------------------------------------------------------------------
// PART 1: the OLD way -- raw error-first callback style.
// Notice the error-first convention: callback(err, result). This is the standard
// Node contract that made util.promisify possible in a generic way.
// ---------------------------------------------------------------------------
function readFileOldStyle() {
  fs.readFile(SAMPLE_FILE, 'utf-8', (err, data) => {
    if (err) {
      console.error('[callback style] Error reading file:', err.message);
      return;
    }
    console.log('[callback style] File contents:', data);
  });
}

// ---------------------------------------------------------------------------
// PART 2: converting fs.readFile into a Promise-returning function with util.promisify.
// util.promisify works because fs.readFile follows the error-first callback convention --
// it wouldn't work reliably on a function with a non-standard callback signature.
// ---------------------------------------------------------------------------
const readFileAsync = util.promisify(fs.readFile);

// (Note: in modern code you'd usually just use require('fs/promises').readFile directly,
// which is a native Promise-based version Node now ships. util.promisify is most valuable
// for OLDER callback APIs or third-party libraries that don't ship their own Promise version.)

// ---------------------------------------------------------------------------
// PART 3: using the promisified function with async/await + try/catch.
// This is the modern, readable style -- no nested callbacks, and ONE place to catch errors.
// ---------------------------------------------------------------------------
async function readFileModernStyle() {
  try {
    const data = await readFileAsync(SAMPLE_FILE, 'utf-8');
    console.log('[async/await style] File contents:', data);
  } catch (err) {
    // Any failure in the awaited call above lands here -- no repeated "if (err)" checks
    // needed at every step, unlike raw callback chaining.
    console.error('[async/await style] Error reading file:', err.message);
  }
}

// ---------------------------------------------------------------------------
// PART 4: demonstrating error handling actually works -- try reading a file that doesn't exist.
// ---------------------------------------------------------------------------
async function demonstrateErrorHandling() {
  try {
    await readFileAsync(path.join(__dirname, 'this-file-does-not-exist.txt'), 'utf-8');
  } catch (err) {
    console.log('[error demo] Caught expected error:', err.code, '-', err.message);
  }
}

// ---------------------------------------------------------------------------
// PART 5: running multiple async reads CONCURRENTLY with Promise.all, instead of
// accidentally serializing them with sequential awaits (a common beginner mistake).
// ---------------------------------------------------------------------------
async function readConcurrently() {
  const start = Date.now();
  const [contentA, contentB] = await Promise.all([
    readFileAsync(SAMPLE_FILE, 'utf-8'),
    readFileAsync(SAMPLE_FILE, 'utf-8'),
  ]);
  console.log(`[concurrent] Read both files in parallel in ${Date.now() - start}ms`);
  console.log('[concurrent] Combined length:', (contentA + contentB).length);
}

// --- Run everything in order for a clean demo output ---
async function main() {
  readFileOldStyle(); // fires async, may log interleaved with the awaited calls below
  await readFileModernStyle();
  await demonstrateErrorHandling();
  await readConcurrently();

  // cleanup the demo file
  fs.unlinkSync(SAMPLE_FILE);
}

main();
