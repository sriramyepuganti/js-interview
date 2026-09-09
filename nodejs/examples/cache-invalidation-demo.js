/**
 * cache-invalidation-demo.js
 *
 * No npm install needed — uses only Node built-ins (no Redis required; a plain in-memory
 * Map stands in for Redis so this is runnable with zero infra, but the logic below is
 * exactly what you'd write against a real `redis` client — see 09-microservices-and-scaling.md).
 * Run with: node cache-invalidation-demo.js
 *
 * Demonstrates the two most common invalidation strategies side by side, using the SAME
 * underlying "database" (a plain object) and cache (a Map with a stored expiry timestamp):
 *   1) TTL expiry only        -- accepts a staleness window, simplest to implement
 *   2) Cache-aside invalidation -- explicitly deletes the cache key right after a write,
 *                                  so there is NO staleness window
 */

// A fake "database" -- just an object standing in for a real DB table/collection.
const db = {
  1: { id: 1, name: 'Sriram', email: 'old-email@example.com' },
};

// A fake "Redis" -- a Map storing { value, expiresAt } per key.
const cache = new Map();

function cacheGet(key) {
  const entry = cache.get(key);
  if (!entry) return undefined;
  if (Date.now() > entry.expiresAt) {
    cache.delete(key); // TTL expired -- treat as a miss
    return undefined;
  }
  return entry.value;
}

function cacheSet(key, value, ttlMs) {
  cache.set(key, { value, expiresAt: Date.now() + ttlMs });
}

function cacheDelete(key) {
  cache.delete(key);
}

// -----------------------------------------------------------------------------
// Strategy 1: TTL-only. A write updates the DB but does NOT touch the cache --
// the old cached value keeps being served until it naturally expires.
// -----------------------------------------------------------------------------
async function getUserTtlOnly(id) {
  const cacheKey = `ttl:user:${id}`;
  const cached = cacheGet(cacheKey);
  if (cached) {
    console.log(`  [TTL strategy] cache HIT for user ${id}:`, cached);
    return cached;
  }
  console.log(`  [TTL strategy] cache MISS for user ${id} -- reading from "DB"`);
  const user = { ...db[id] };
  cacheSet(cacheKey, user, 200); // cache for 200ms (short, just so this demo runs quickly)
  return user;
}

function updateUserTtlOnly(id, changes) {
  Object.assign(db[id], changes); // DB is updated...
  // ...but the cache is deliberately left alone here, to demonstrate the staleness window.
}

// -----------------------------------------------------------------------------
// Strategy 2: cache-aside with explicit invalidation. A write updates the DB AND
// immediately deletes the cache key in the same code path -- no staleness window.
// -----------------------------------------------------------------------------
async function getUserCacheAside(id) {
  const cacheKey = `aside:user:${id}`;
  const cached = cacheGet(cacheKey);
  if (cached) {
    console.log(`  [Cache-aside] cache HIT for user ${id}:`, cached);
    return cached;
  }
  console.log(`  [Cache-aside] cache MISS for user ${id} -- reading from "DB"`);
  const user = { ...db[id] };
  cacheSet(cacheKey, user, 60000); // long TTL is fine here -- invalidation is explicit, not time-based
  return user;
}

function updateUserCacheAside(id, changes) {
  Object.assign(db[id], changes); // 1) write the DB
  cacheDelete(`aside:user:${id}`); // 2) immediately invalidate -- next read is guaranteed fresh
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

(async () => {
  console.log('=== Strategy 1: TTL-only invalidation ===');
  await getUserTtlOnly(1); // MISS, populates cache
  await getUserTtlOnly(1); // HIT, still cached
  console.log('  Updating email in the DB directly (simulating an update)...');
  updateUserTtlOnly(1, { email: 'new-email@example.com' });
  const staleResult = await getUserTtlOnly(1); // STILL HIT -- serves the OLD email, this is the staleness window
  console.log('  -> Notice this still shows the OLD email:', staleResult.email);
  console.log('  Waiting 250ms for the TTL to expire...');
  await sleep(250);
  const freshResult = await getUserTtlOnly(1); // MISS now -- TTL expired, re-reads from DB
  console.log('  -> Now shows the NEW email after TTL expiry:', freshResult.email);

  console.log('\n=== Strategy 2: cache-aside with explicit invalidation ===');
  await getUserCacheAside(1); // MISS, populates cache
  await getUserCacheAside(1); // HIT, still cached
  console.log('  Updating email via the proper write path (which also invalidates the cache)...');
  updateUserCacheAside(1, { email: 'brand-new-email@example.com' });
  const immediatelyFreshResult = await getUserCacheAside(1); // MISS immediately -- NO staleness window
  console.log('  -> Shows the NEW email IMMEDIATELY, no waiting:', immediatelyFreshResult.email);
})();
