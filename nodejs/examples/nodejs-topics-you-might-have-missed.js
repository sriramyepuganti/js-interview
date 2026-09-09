/**
 * nodejs-topics-you-might-have-missed.js
 *
 * Companion code for file 14 (14-nodejs-topics-you-might-have-missed.md).
 *
 * No npm install needed for the RUNNABLE parts below -- uses only Node built-ins
 * (crypto). Run with: node nodejs-topics-you-might-have-missed.js
 *
 * Demonstrates (runnable, no external services required):
 *  1) Cursor-based pagination logic (vs offset-based), against an in-memory dataset.
 *  2) Webhook signature verification using Node's built-in `crypto` module (HMAC +
 *     timing-safe comparison) -- the same technique Stripe/GitHub-style webhooks use.
 *  3) The GraphQL-style N+1 query problem, demonstrated with a naive resolver vs a
 *     batched ("DataLoader-style") resolver against an in-memory fake "database".
 *
 * NOT included as runnable code (would require external packages/services -- see
 * the block comment near the bottom for correct-but-non-executed reference code):
 *  - Socket.IO rooms/namespaces (requires `npm install socket.io socket.io-client`
 *    plus an actual running server+client pair).
 */

const crypto = require('crypto');

// =============================================================================
// PART 1: Cursor-based pagination vs offset-based pagination
// =============================================================================
// Why this matters (see file 14 / file 12 Q22, Q49): offset pagination (LIMIT/OFFSET)
// gets slower as the offset grows, because the DB still has to scan/skip every prior
// row just to discard it. Cursor pagination jumps straight to "give me rows after this
// stable sort key" using an index, so it stays fast and is stable even if rows are
// inserted/deleted between page requests.

// Pretend this is a large sorted table/collection (sorted by `id`, ascending).
const ITEMS = Array.from({ length: 1000 }, (_, i) => ({ id: i + 1, name: `item-${i + 1}` }));

/**
 * Offset-based pagination: "skip N rows, take the next `limit`".
 * Simple, but on a real DB this cost grows with `offset` (the DB scans+discards
 * `offset` rows every single time) and pages can shift if rows are inserted/deleted
 * between requests.
 */
function getPageOffset(offset, limit) {
  return {
    items: ITEMS.slice(offset, offset + limit),
    nextOffset: offset + limit < ITEMS.length ? offset + limit : null,
  };
}

/**
 * Cursor-based pagination: "give me items with id greater than `cursor`, limit N".
 * On a real DB this is a `WHERE id > ? ORDER BY id LIMIT ?` query, which an index on
 * `id` can satisfy directly -- no scanning/discarding prior rows, and stable even if
 * data changes between page requests (a new insert doesn't shift where you "are").
 */
function getPageCursor(cursor, limit) {
  const startIndex = cursor === null ? 0 : ITEMS.findIndex((item) => item.id > cursor);
  const slice = startIndex === -1 ? [] : ITEMS.slice(startIndex, startIndex + limit);
  return {
    items: slice,
    nextCursor: slice.length === limit ? slice[slice.length - 1].id : null,
  };
}

function demoPagination() {
  console.log('\n=== PART 1: Cursor-based vs Offset-based Pagination ===');

  const offsetPage1 = getPageOffset(0, 5);
  console.log('[offset] page 1:', offsetPage1.items.map((i) => i.id), '-> nextOffset:', offsetPage1.nextOffset);
  const offsetPage2 = getPageOffset(offsetPage1.nextOffset, 5);
  console.log('[offset] page 2:', offsetPage2.items.map((i) => i.id), '-> nextOffset:', offsetPage2.nextOffset);

  const cursorPage1 = getPageCursor(null, 5);
  console.log('[cursor] page 1:', cursorPage1.items.map((i) => i.id), '-> nextCursor:', cursorPage1.nextCursor);
  const cursorPage2 = getPageCursor(cursorPage1.nextCursor, 5);
  console.log('[cursor] page 2:', cursorPage2.items.map((i) => i.id), '-> nextCursor:', cursorPage2.nextCursor);

  // Simulate the "data changed between pages" problem: an item that was ALREADY shown
  // on page 1 (id=3) gets deleted before the client fetches page 2. This is the classic
  // offset-pagination bug: everything after the deleted row shifts left by one position,
  // so a fixed numeric offset now points at the WRONG place.
  const originalItem3Index = ITEMS.findIndex((i) => i.id === 3);
  const removed = ITEMS.splice(originalItem3Index, 1)[0];
  console.log(`\n[simulating a delete of ALREADY-SHOWN id=${removed.id}, then fetching page 2]`);

  // Offset pagination silently SKIPS id=6 entirely: since id=3 was removed, everything
  // after it shifted left by one, so slice(5, 10) now lands one position further along
  // than intended and id=6 (never shown on page 1) is skipped -- the user never sees it.
  const offsetPage2AfterDelete = getPageOffset(5, 5);
  console.log('[offset] page 2 AFTER delete:', offsetPage2AfterDelete.items.map((i) => i.id), '<- BUG: id=6 was never shown and is now silently skipped');

  // Cursor pagination is unaffected -- "give me ids > 5" doesn't care how many rows
  // exist before that point, so it correctly still returns id=6 onward.
  const cursorPage2AfterDelete = getPageCursor(5, 5);
  console.log('[cursor] page 2 AFTER delete:', cursorPage2AfterDelete.items.map((i) => i.id), '<- correct: id=6 still shows up, nothing skipped');

  // restore the array for any later demo code in this file
  ITEMS.splice(originalItem3Index, 0, removed);
}

// =============================================================================
// PART 2: Webhook signature verification (HMAC + timing-safe comparison)
// =============================================================================
// Why this matters (see file 14): a webhook endpoint is a PUBLIC url. Anyone could
// POST a fake "payment succeeded" body to it. Real providers (Stripe, GitHub) sign
// the payload with a shared secret, and you must verify that signature server-side
// before trusting the payload.

const WEBHOOK_SECRET = 'whsec_demo_shared_secret_never_hardcode_this_for_real'; // in real life: process.env.WEBHOOK_SECRET

/**
 * Simulates what the PROVIDER does before sending the webhook: sign the raw body.
 */
function signPayload(rawBody, secret) {
  return crypto.createHmac('sha256', secret).update(rawBody).digest('hex');
}

/**
 * Simulates what YOUR SERVER does on receiving the webhook: recompute the signature
 * over the raw body it actually received, and compare using a timing-safe comparison
 * (never a plain `===` or string comparison for secrets/signatures -- that leaks timing
 * information an attacker could use to guess the correct value byte by byte).
 */
function verifyWebhookSignature(rawBody, receivedSignatureHex, secret) {
  const expectedSignatureHex = signPayload(rawBody, secret);

  const expectedBuf = Buffer.from(expectedSignatureHex, 'utf-8');
  const receivedBuf = Buffer.from(receivedSignatureHex, 'utf-8');

  // crypto.timingSafeEqual THROWS if buffers differ in length, so guard that first --
  // an attacker sending a wrong-length signature should just fail verification, not crash.
  if (expectedBuf.length !== receivedBuf.length) return false;

  return crypto.timingSafeEqual(expectedBuf, receivedBuf);
}

function demoWebhookVerification() {
  console.log('\n=== PART 2: Webhook Signature Verification ===');

  // NOTE: in a real Express route, `rawBody` must come from `express.raw({ type: 'application/json' })`
  // on that specific route -- NOT the parsed/re-serialized `req.body` from `express.json()` --
  // because re-serializing JSON can change whitespace/key order and break the signature match.
  const rawBody = JSON.stringify({ event: 'payment_intent.succeeded', amount: 4999, currency: 'usd' });

  // --- Case 1: legitimate request, correctly signed by "the provider" ---
  const legitimateSignature = signPayload(rawBody, WEBHOOK_SECRET);
  const isLegitimateValid = verifyWebhookSignature(rawBody, legitimateSignature, WEBHOOK_SECRET);
  console.log('[legit webhook] signature valid?', isLegitimateValid); // true

  // --- Case 2: an attacker POSTs a fake body with a made-up signature ---
  const fakeSignature = 'deadbeef'.repeat(8); // 64 hex chars, same length as a real sha256 hex digest
  const isFakeValid = verifyWebhookSignature(rawBody, fakeSignature, WEBHOOK_SECRET);
  console.log('[forged webhook] signature valid?', isFakeValid); // false

  // --- Case 3: the body was tampered with in transit (amount changed) after signing ---
  const tamperedBody = JSON.stringify({ event: 'payment_intent.succeeded', amount: 999999, currency: 'usd' });
  const isTamperedValid = verifyWebhookSignature(tamperedBody, legitimateSignature, WEBHOOK_SECRET);
  console.log('[tampered webhook] signature valid?', isTamperedValid); // false -- body changed, HMAC no longer matches
}

// =============================================================================
// PART 3: The N+1 query problem -- naive resolver vs batched ("DataLoader-style") resolver
// =============================================================================
// Why this matters (see file 14, REST vs GraphQL section): a naive GraphQL resolver
// that fetches a related record per parent item fires one query PER item. A batched
// resolver collects all the IDs needed across a tick and issues ONE query for all of
// them. Simulated here with an in-memory "database" and a query counter, since no real
// DB is required to demonstrate the pattern -- the counts are what matter.

const FAKE_PRODUCTS_TABLE = Array.from({ length: 50 }, (_, i) => ({ id: i + 1, name: `Product ${i + 1}` }));
const FAKE_ORDERS = Array.from({ length: 20 }, (_, i) => ({
  id: i + 1,
  productId: (i % 50) + 1, // spread across the 50 fake products
}));

let queryCount = 0; // tracks how many "database round trips" each strategy makes

function resetQueryCount() {
  queryCount = 0;
}

/** Simulates a single-row DB lookup -- one round trip per call. */
function fakeDbFindProductById(id) {
  queryCount += 1;
  return FAKE_PRODUCTS_TABLE.find((p) => p.id === id);
}

/** Simulates a batched DB lookup -- ONE round trip regardless of how many ids are requested. */
function fakeDbFindProductsByIds(ids) {
  queryCount += 1;
  const idSet = new Set(ids);
  return FAKE_PRODUCTS_TABLE.filter((p) => idSet.has(p.id));
}

/**
 * NAIVE resolver: for each order, fetch its product individually.
 * 20 orders -> 1 query for orders (not counted here, already have them) + 20 queries
 * for products = the classic N+1 problem.
 */
function resolveOrdersNaive(orders) {
  return orders.map((order) => ({
    ...order,
    product: fakeDbFindProductById(order.productId),
  }));
}

/**
 * BATCHED resolver ("DataLoader" pattern): collect all needed product ids FIRST,
 * issue ONE query for all of them, then map results back onto each order.
 * 20 orders -> 1 single query for all needed products, no matter how many orders.
 */
function resolveOrdersBatched(orders) {
  const neededProductIds = [...new Set(orders.map((o) => o.productId))];
  const products = fakeDbFindProductsByIds(neededProductIds);
  const productsById = new Map(products.map((p) => [p.id, p]));
  return orders.map((order) => ({
    ...order,
    product: productsById.get(order.productId),
  }));
}

function demoN1Problem() {
  console.log('\n=== PART 3: N+1 Query Problem (naive vs batched resolver) ===');

  resetQueryCount();
  const naiveResult = resolveOrdersNaive(FAKE_ORDERS);
  console.log(`[naive resolver] resolved ${naiveResult.length} orders using ${queryCount} "queries" (1 + N)`);

  resetQueryCount();
  const batchedResult = resolveOrdersBatched(FAKE_ORDERS);
  console.log(`[batched resolver] resolved ${batchedResult.length} orders using ${queryCount} "query" (batched)`);

  // sanity check both strategies produce equivalent data
  const sameData = JSON.stringify(naiveResult) === JSON.stringify(batchedResult);
  console.log('Both strategies produced identical order+product data?', sameData);
}

// --- Run all runnable demos in order ---
demoPagination();
demoWebhookVerification();
demoN1Problem();

/* =============================================================================
 * REFERENCE ONLY -- NOT EXECUTED (requires `npm install socket.io socket.io-client`
 * plus an actual server+client process pair; included here only so the code is
 * correct and copy-pasteable, per file 14's Socket.IO section).
 * =============================================================================
 *
 * // server.js
 * const { Server } = require('socket.io');
 * const io = new Server(3000, { cors: { origin: '*' } });
 *
 * io.on('connection', (socket) => {
 *   socket.on('join-room', (roomId) => {
 *     socket.join(roomId); // this socket now receives broadcasts to `roomId`
 *   });
 *
 *   socket.on('chat-message', ({ roomId, message }) => {
 *     socket.to(roomId).emit('chat-message', message); // broadcast to the room, excluding sender
 *   });
 * });
 *
 * // client.js (browser or another Node process with socket.io-client)
 * const { io } = require('socket.io-client');
 * const socket = io('http://localhost:3000');
 * socket.emit('join-room', 'order-42');
 * socket.on('chat-message', (msg) => console.log('New message:', msg));
 */
