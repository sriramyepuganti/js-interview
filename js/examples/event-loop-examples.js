/**
 * event-loop-examples.js
 * Run with: node event-loop-examples.js
 *
 * Several ordering examples (setTimeout, Promise, process.nextTick, queueMicrotask)
 * with comments explaining WHY the output is what it is.
 * See ../05-event-loop-and-async.md for the full explanation.
 *
 * NOTE: run each example block separately (comment/uncomment) if you want to
 * study one output at a time without them interleaving with each other.
 */

console.log("########## Example 1: basic sync vs microtask vs macrotask ##########");
(function example1() {
  console.log("1: sync (start)");

  setTimeout(() => console.log("2: macrotask (setTimeout)"), 0);

  Promise.resolve().then(() => console.log("3: microtask (Promise.then)"));

  console.log("4: sync (end)");

  // Expected output:
  // 1: sync (start)
  // 4: sync (end)
  // 3: microtask (Promise.then)   <-- microtasks always drain before the next macrotask
  // 2: macrotask (setTimeout)
})();


setTimeout(() => {
  console.log("\n########## Example 2: process.nextTick vs microtask vs macrotask (Node) ##########");
  (function example2() {
    console.log("1: sync (start)");

    setTimeout(() => console.log("5: macrotask (setTimeout)"), 0);

    setImmediate(() => console.log("6: macrotask (setImmediate, check phase)"));

    process.nextTick(() => console.log("2: process.nextTick (runs before ANY other queue)"));

    Promise.resolve().then(() => console.log("3: microtask (Promise.then)"));

    queueMicrotask(() => console.log("4: microtask (queueMicrotask, same priority as Promise.then)"));

    console.log("1.5: sync (end)");

    // Expected order:
    // 1: sync (start)
    // 1.5: sync (end)
    // 2: process.nextTick        <-- Node gives nextTick its OWN queue, checked before microtasks
    // 3: microtask (Promise.then)
    // 4: microtask (queueMicrotask)
    // 5 / 6: macrotasks           <-- order between setTimeout(0) and setImmediate at top level is not
    //                                 spec-guaranteed; inside an I/O callback, setImmediate always wins.
  })();
}, 10);


setTimeout(() => {
  console.log("\n########## Example 3: microtasks queueing more microtasks (drains fully before next macrotask) ##########");
  (function example3() {
    console.log("start");

    setTimeout(() => console.log("macrotask: setTimeout"), 0);

    Promise.resolve()
      .then(() => {
        console.log("microtask 1");
        return Promise.resolve(); // returning a promise chains another microtask
      })
      .then(() => {
        console.log("microtask 2 (chained from microtask 1)");
      });

    Promise.resolve().then(() => console.log("microtask 3 (separate chain)"));

    console.log("end");

    // Expected order:
    // start
    // end
    // microtask 1
    // microtask 3          <-- runs before microtask 2! Each .then schedules ONE microtask at a time;
    //                           "microtask 3" was already queued before "microtask 2" got scheduled
    //                           by the .then() chain resolving.
    // microtask 2
    // macrotask: setTimeout   <-- only runs after ALL microtasks (including chained ones) are drained
  })();
}, 20);


setTimeout(() => {
  console.log("\n########## Example 4: async/await pauses only the async function, not the whole program ##########");
  (async function example4() {
    console.log("A: sync start (inside async fn, runs immediately when called)");

    async function delayedLog() {
      console.log("B: sync, runs immediately when delayedLog() is called");
      await null; // pauses HERE — schedules the rest as a microtask, hands control back to caller
      console.log("D: resumes as a microtask, AFTER the caller's remaining sync code");
    }

    delayedLog(); // starts running synchronously up to its first "await"

    console.log("C: sync, runs right after calling delayedLog() (before D, because D is a microtask)");

    // Expected order: A, B, C, D
    // Why: delayedLog() runs synchronously until "await null", logging B.
    // Then it YIELDS control back to example4(), which keeps running synchronously and logs C.
    // Only once example4()'s synchronous code is done does the event loop drain microtasks, logging D.
  })();
}, 30);
