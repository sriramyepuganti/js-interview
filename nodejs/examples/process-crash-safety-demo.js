/**
 * process-crash-safety-demo.js
 *
 * No npm install needed — uses only Node built-ins.
 * Run with: node process-crash-safety-demo.js
 *
 * Demonstrates:
 *   1) The "missing await/.catch()" trap that silently produces an unhandledRejection,
 *      even though the calling code looks completely normal.
 *   2) A registered `unhandledRejection` handler catching it as a last resort, logging
 *      it, and exiting -- the "log and exit" pattern from 11-performance-and-production.md,
 *      instead of the anti-pattern of silently swallowing it and continuing.
 *   3) An `uncaughtException` handler doing the same for a synchronous throw.
 *
 * NOTE: this script deliberately triggers both events, logs them, and then exits --
 * that's the whole point (crash safety = fail loudly and cleanly, not "never crash").
 */

let step = 'unhandledRejection';

process.on('unhandledRejection', (reason) => {
  console.error(`\n[unhandledRejection caught] step="${step}"`);
  console.error('  reason:', reason.message || reason);
  console.error('  -> In production: log this with full context (Sentry/pino), then exit.');
  console.error('     The REAL fix is adding the missing await/.catch() at the source --');
  console.error('     this handler is only a last-resort net, not a substitute for that fix.\n');

  // Move on to demonstrating uncaughtException next, instead of exiting immediately,
  // purely so this one demo file can show both events in a single run.
  step = 'uncaughtException';
  triggerUncaughtException();
});

process.on('uncaughtException', (err, origin) => {
  console.error(`[uncaughtException caught] origin="${origin}"`);
  console.error('  error:', err.message);
  console.error('  -> Process state is now considered untrustworthy. Exiting with code 1.');
  console.error('     A process manager (PM2/Kubernetes) would restart a fresh instance.\n');
  console.log('Demo complete. Exiting cleanly (as the real pattern would) instead of hanging.');
  process.exit(1);
});

// -----------------------------------------------------------------------------
// THE TRAP: this function is async and CAN reject, but it's called here without
// `await` and without a `.catch()`. The code reads fine at a glance -- that's exactly
// why this bug is so common and so easy to miss in a real codebase.
// -----------------------------------------------------------------------------
async function sendWelcomeEmail() {
  throw new Error('SMTP provider timed out (simulated)');
}

function simulateSignupHandler() {
  console.log('Simulating a request handler with a missing await/.catch() bug...');
  sendWelcomeEmail(); // BUG: not awaited, no .catch() attached -- this WILL be unhandled
  console.log('(Handler code continues on, looking completely fine here...)');
}

function triggerUncaughtException() {
  console.log('\nNow simulating a plain synchronous throw with nothing to catch it...');
  setTimeout(() => {
    throw new Error('Something threw synchronously with no surrounding try/catch (simulated)');
  }, 100);
}

simulateSignupHandler();
