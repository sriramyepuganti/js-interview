/**
 * abort-controller-demo.js
 *
 * No npm install needed — uses only Node built-ins (AbortController is a global since
 * Node 15; timers/promises is built-in).
 * Run with: node abort-controller-demo.js
 *
 * Demonstrates:
 *   1) Using AbortController to enforce a timeout on Node's built-in abortable sleep
 *      (timers/promises), the same pattern used for a fetch() timeout.
 *   2) Making a CUSTOM async function cooperatively abortable -- the part that does NOT
 *      happen automatically just because you created an AbortController.
 */

const { setTimeout: sleep } = require('timers/promises');

async function demoTimeoutPattern() {
  console.log('--- 1) Aborting a built-in abortable operation (timers/promises sleep) ---');
  const controller = new AbortController();

  // Abort after 100ms, but ask for a 5-second sleep -- the abort should win.
  const timer = setTimeout(() => controller.abort(), 100);

  try {
    await sleep(5000, undefined, { signal: controller.signal });
    console.log('  Slept the full 5 seconds (should not happen in this demo)');
  } catch (err) {
    console.log(`  Sleep was aborted as expected: ${err.name} (${err.message})`);
  } finally {
    clearTimeout(timer);
  }
}

// -----------------------------------------------------------------------------
// A custom "job" that does NOT automatically respect an AbortSignal -- it has to
// check signal.aborted itself, cooperatively, between units of work. This is the
// part interviewers want to see understood: AbortController doesn't retroactively
// make arbitrary code interruptible.
// -----------------------------------------------------------------------------
async function processItems(items, signal) {
  const processed = [];
  for (const item of items) {
    if (signal.aborted) {
      throw new Error(`Job cancelled after processing ${processed.length}/${items.length} items`);
    }
    await sleep(50); // simulate a small unit of async work per item
    processed.push(item * 2);
    console.log(`  processed item ${item} -> ${item * 2}`);
  }
  return processed;
}

async function demoCustomAbortable() {
  console.log('\n--- 2) Making a custom async function cooperatively abortable ---');
  const controller = new AbortController();
  const items = [1, 2, 3, 4, 5, 6, 7, 8];

  // Abort partway through the job, after item 3 or so has had time to process.
  setTimeout(() => {
    console.log('  (external event fires: aborting the job now)');
    controller.abort();
  }, 170);

  try {
    const result = await processItems(items, controller.signal);
    console.log('  Finished all items:', result);
  } catch (err) {
    console.log(`  Caught expected cancellation: ${err.message}`);
  }
}

(async () => {
  await demoTimeoutPattern();
  await demoCustomAbortable();
  console.log('\nDone.');
})();
