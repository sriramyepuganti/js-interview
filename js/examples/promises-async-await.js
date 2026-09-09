/**
 * promises-async-await.js
 * Run with: node promises-async-await.js
 *
 * Demonstrates: Promise.all/race/allSettled/any, converting callback-based
 * code to promises, and async/await error handling.
 * See ../06-promises-and-async-await.md for the full explanation.
 */

// ---------------------------------------------------------------------------
// 1. Converting callback-based code into a Promise-based API
// ---------------------------------------------------------------------------

// Old-style callback API (Node "error-first callback" convention)
function fetchUserCallback(id, callback) {
  setTimeout(() => {
    if (id <= 0) return callback(new Error("Invalid id"));
    callback(null, { id, name: `User${id}` });
  }, 100);
}

// Wrap it in a Promise — this is exactly what util.promisify does under the hood
function fetchUserPromise(id) {
  return new Promise((resolve, reject) => {
    fetchUserCallback(id, (err, user) => {
      if (err) return reject(err);
      resolve(user);
    });
  });
}

console.log("=== Callback -> Promise conversion ===");
fetchUserPromise(1)
  .then((user) => console.log("Fetched via promise wrapper:", user))
  .catch((err) => console.error("Error:", err.message));


// ---------------------------------------------------------------------------
// 2. Promise.all — all must succeed, fails fast on first rejection
// ---------------------------------------------------------------------------
function delay(value, ms, shouldFail = false) {
  return new Promise((resolve, reject) => {
    setTimeout(() => (shouldFail ? reject(new Error(`${value} failed`)) : resolve(value)), ms);
  });
}

async function demoPromiseAll() {
  console.log("\n=== Promise.all (all succeed) ===");
  const results = await Promise.all([
    delay("A", 50),
    delay("B", 30),
    delay("C", 10),
  ]);
  console.log("All resolved:", results); // ['A', 'B', 'C'] — order matches input, not completion time

  console.log("\n=== Promise.all (one fails -> fails fast) ===");
  try {
    await Promise.all([delay("X", 10), delay("Y", 20, true), delay("Z", 999)]);
  } catch (err) {
    console.log("Caught rejection immediately:", err.message); // doesn't wait for "Z" (999ms) to finish
  }
}


// ---------------------------------------------------------------------------
// 3. Promise.allSettled — always resolves, gives every outcome
// ---------------------------------------------------------------------------
async function demoAllSettled() {
  console.log("\n=== Promise.allSettled ===");
  const results = await Promise.allSettled([
    delay("ok1", 10),
    delay("fail1", 10, true),
    delay("ok2", 10),
  ]);
  results.forEach((r, i) => {
    if (r.status === "fulfilled") console.log(`Task ${i}: succeeded with`, r.value);
    else console.log(`Task ${i}: failed with`, r.reason.message);
  });
}


// ---------------------------------------------------------------------------
// 4. Promise.race — first to settle wins (useful for timeouts)
// ---------------------------------------------------------------------------
function withTimeout(promise, ms) {
  const timeout = new Promise((_, reject) =>
    setTimeout(() => reject(new Error("Timed out!")), ms)
  );
  return Promise.race([promise, timeout]);
}

async function demoRace() {
  console.log("\n=== Promise.race (timeout pattern) ===");
  try {
    const result = await withTimeout(delay("slow response", 500), 100);
    console.log("Got:", result);
  } catch (err) {
    console.log("Race result:", err.message); // "Timed out!" — the 100ms timeout wins against the 500ms delay
  }
}


// ---------------------------------------------------------------------------
// 5. Promise.any — first SUCCESS wins, ignores early rejections
// ---------------------------------------------------------------------------
async function demoAny() {
  console.log("\n=== Promise.any ===");
  try {
    const result = await Promise.any([
      delay("server1 failed", 10, true),
      delay("server2 succeeded", 50),
      delay("server3 succeeded (slower)", 100),
    ]);
    console.log("First success:", result); // "server2 succeeded" — ignores server1's failure entirely
  } catch (err) {
    console.log("All failed (AggregateError):", err.errors?.map((e) => e.message));
  }
}


// ---------------------------------------------------------------------------
// 6. async/await error handling patterns
// ---------------------------------------------------------------------------
async function demoErrorHandling() {
  console.log("\n=== async/await error handling ===");

  // Pattern A: try/catch around the await
  try {
    await delay("will fail", 10, true);
  } catch (err) {
    console.log("Pattern A caught:", err.message);
  } finally {
    console.log("Pattern A finally: always runs");
  }

  // Pattern B: forgetting "await" — a common real bug (rejection escapes as unhandled,
  // NOT caught by the surrounding try/catch, because the promise was never awaited/linked to it)
  async function buggy() {
    try {
      const floatingPromise = delay("oops no await", 10, true); // MISSING await!
      // We attach a no-op .catch() here ONLY to keep this demo script from crashing
      // with an "unhandledRejection" — in real buggy code, nobody does this, which is
      // exactly why forgotten-await bugs cause silent failures or process crashes.
      floatingPromise.catch(() => {});
    } catch (e) {
      console.log("This will NOT print for the missing-await case");
    }
  }
  await buggy(); // buggy() itself resolves fine — its try/catch never sees the floating rejection above

  // Pattern C: parallel calls with individual error handling
  const [safeA, safeB] = await Promise.allSettled([
    delay("parallel-ok", 10),
    delay("parallel-fail", 10, true),
  ]);
  console.log("Pattern C results:", safeA.status, safeB.status);
}


// Run all demos in sequence so the console output stays readable
(async function main() {
  await demoPromiseAll();
  await demoAllSettled();
  await demoRace();
  await demoAny();
  await demoErrorHandling();
})();
