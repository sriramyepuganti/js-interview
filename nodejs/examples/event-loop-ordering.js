/**
 * event-loop-ordering.js
 *
 * No npm install needed — uses only Node built-ins.
 * Run with: node event-loop-ordering.js
 *
 * This file walks through 3 ordering examples that show how Node's event loop
 * schedules process.nextTick, Promise microtasks, setTimeout, and setImmediate.
 * Run each example separately (comment/uncomment) to see clean output, or run
 * all together and read the comments to understand the interleaving.
 */

const fs = require('fs');

console.log('=== Example 1: basic ordering at the top level ===');
(function example1() {
  console.log('1: sync - first line');

  setTimeout(() => console.log('1: setTimeout callback'), 0);

  setImmediate(() => console.log('1: setImmediate callback'));

  Promise.resolve().then(() => console.log('1: Promise.then callback'));

  process.nextTick(() => console.log('1: process.nextTick callback'));

  console.log('1: sync - last line');

  // Expected/guaranteed relative order:
  // 'sync - first line', 'sync - last line'   -> synchronous code always runs first, top to bottom
  // 'process.nextTick callback'                -> nextTick queue is drained before ANY macrotask phase
  // 'Promise.then callback'                    -> then the Promise microtask queue is drained
  // 'setTimeout callback' / 'setImmediate callback' -> order between these two is NOT strictly
  //   guaranteed at the top level of the program (depends on how long it took to get the process
  //   started and enter the timers phase vs check phase on this first loop iteration).
})();

// Give example1's timers time to fire before starting example2, just so console output
// doesn't interleave confusingly between examples when you read it top to bottom.
setTimeout(() => {
  console.log('\n=== Example 2: setTimeout vs setImmediate INSIDE an I/O callback ===');
  fs.readFile(__filename, () => {
    // Once we're inside an I/O callback (poll phase), the ordering IS guaranteed:
    // setImmediate (check phase) always fires before setTimeout (next timers phase),
    // because after poll, the event loop moves to check next, and only comes back to
    // timers on the FOLLOWING loop iteration.
    setTimeout(() => console.log('2: setTimeout callback (inside I/O)'), 0);
    setImmediate(() => console.log('2: setImmediate callback (inside I/O) -- always fires first here'));
  });
}, 50);

// Run example 3 after example 2 has had time to finish.
setTimeout(() => {
  console.log('\n=== Example 3: process.nextTick recursion vs setTimeout starvation risk ===');
  let count = 0;

  function recursiveTick() {
    console.log('3: nextTick run #' + (count + 1));
    count++;
    if (count < 4) {
      // Each nextTick call here re-queues itself BEFORE the event loop is allowed to move on.
      // If this recursion never stopped, it would starve the event loop entirely --
      // no timers, no I/O, nothing else would ever get a chance to run. This is why
      // process.nextTick should never be used for unbounded recursive scheduling.
      process.nextTick(recursiveTick);
    }
  }

  process.nextTick(recursiveTick);

  setTimeout(() => {
    // This only prints AFTER all 4 nextTick recursions have fully drained --
    // proving nextTick callbacks are exhausted before the timers phase even runs.
    console.log('3: setTimeout callback -- only runs after ALL nextTicks are drained');
  }, 0);
}, 150);
