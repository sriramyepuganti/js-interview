/**
 * child-process-fork-child.js
 *
 * A helper Node script used ONLY by child-process-methods-demo.js's fork() example.
 * Not meant to be run directly (though it won't error if you do -- it'll just wait for
 * a message that never arrives).
 *
 * Demonstrates the IPC (inter-process communication) side of fork(): this child process
 * listens for structured messages via process.on('message') and replies via process.send().
 * This is the big differentiator vs spawn/exec/execFile, which only give you text streams.
 */

process.on('message', (msg) => {
  console.log(`  [child pid=${process.pid}] received:`, msg);
  const doubled = msg.n * 2;
  process.send({ doubled }); // send a structured JS object back to the parent, not just text
  process.exit(0); // done -- exit cleanly so the parent's demo can move on
});
