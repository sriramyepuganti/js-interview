/**
 * latest-nodejs-features.js
 *
 * No npm install needed — uses only Node built-ins (node:test, node:assert).
 * Run with: node --test latest-nodejs-features.js
 *
 * (You can also just run it with plain `node latest-nodejs-features.js` since Node's
 * test runner auto-detects the node:test import and runs the tests either way, but
 * `node --test` is the documented, intended entry point and also gives you the nicer
 * TAP-style pass/fail summary output.)
 *
 * Demonstrates:
 *  1) Basic test() cases using node:test + node:assert (no Jest/Mocha installed).
 *  2) describe()/it() grouping with before/after hooks.
 *  3) An async test (Node's test runner awaits the returned Promise automatically).
 *  4) A deliberately skipped test, to show that feature exists too.
 */

const { test, describe, before, after, it } = require('node:test');
const assert = require('node:assert');

// --- Plain function under test (in a real project this would be require()'d from elsewhere) ---
function sum(a, b) {
  return a + b;
}

function isEven(n) {
  return n % 2 === 0;
}

async function fetchUserFromFakeDb(id) {
  // Simulates an async DB call with a tiny delay.
  await new Promise((resolve) => setTimeout(resolve, 10));
  if (id === 1) return { id: 1, name: 'Ada Lovelace' };
  return null;
}

// ---------------------------------------------------------------------------
// PART 1: standalone test() calls — the simplest possible usage.
// ---------------------------------------------------------------------------
test('sum() adds two positive numbers', () => {
  assert.strictEqual(sum(2, 3), 5);
});

test('sum() handles negative numbers', () => {
  assert.strictEqual(sum(-1, -1), -2);
});

// ---------------------------------------------------------------------------
// PART 2: describe()/it() grouping — familiar Jest/Mocha-style structure,
// but still built into Node itself, with before/after lifecycle hooks.
// ---------------------------------------------------------------------------
describe('isEven()', () => {
  before(() => {
    console.log('[setup] running isEven() test group');
  });

  after(() => {
    console.log('[teardown] finished isEven() test group');
  });

  it('returns true for even numbers', () => {
    assert.strictEqual(isEven(4), true);
  });

  it('returns false for odd numbers', () => {
    assert.strictEqual(isEven(3), false);
  });
});

// ---------------------------------------------------------------------------
// PART 3: async test — node:test awaits the returned Promise automatically,
// no special syntax needed beyond making the test callback async.
// ---------------------------------------------------------------------------
test('fetchUserFromFakeDb() resolves a known user', async () => {
  const user = await fetchUserFromFakeDb(1);
  assert.ok(user, 'expected a user object to be returned');
  assert.strictEqual(user.name, 'Ada Lovelace');
});

test('fetchUserFromFakeDb() resolves null for an unknown id', async () => {
  const user = await fetchUserFromFakeDb(999);
  assert.strictEqual(user, null);
});

// ---------------------------------------------------------------------------
// PART 4: a deliberately skipped test — shows { skip: true } / test.skip exists,
// useful for temporarily disabling a flaky/pending test without deleting it.
// ---------------------------------------------------------------------------
test('a test we are intentionally skipping for this demo', { skip: true }, () => {
  assert.strictEqual(1, 2); // would fail, but never runs because it's skipped
});
