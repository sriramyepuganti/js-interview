// Run with: node map-set-weakmap-weakset.js
// Companion to js/07-es6-plus-features.md (Map/Set) and js/11-memory-and-performance.md (WeakMap/WeakSet)

// ---------------------------------------------------------------------------
// 1. Map — any key type, guaranteed order, real .size
// ---------------------------------------------------------------------------
const userIdKey = { id: 1 };
const map = new Map();
map.set("name", "Sri");          // string key
map.set(42, "the answer");        // number key — impossible with a plain object (would become "42")
map.set(userIdKey, "user object as key"); // object key

console.log(map.get(42));         // "the answer"
console.log(map.size);            // 3

for (const [key, value] of map) {
  console.log("map entry:", key, "=>", value);
}

// A plain object would silently stringify the number key and could collide with inherited props:
const plainObj = {};
plainObj[42] = "the answer";
console.log(Object.keys(plainObj)); // ["42"] — now a string, original number identity lost
console.log("toString" in plainObj); // true — inherited from Object.prototype, not something you added

// ---------------------------------------------------------------------------
// 2. Set — unique values, O(1) has()
// ---------------------------------------------------------------------------
const ids = [1, 2, 2, 3, 3, 3, 4];
const uniqueIds = new Set(ids);
console.log(uniqueIds);           // Set { 1, 2, 3, 4 }
console.log([...uniqueIds]);      // [1, 2, 3, 4] — quick dedupe pattern

console.log(uniqueIds.has(3));    // true, O(1) lookup
console.log(ids.includes(3));     // true, but O(n) lookup — slower at scale

// ---------------------------------------------------------------------------
// 3. WeakMap — metadata tied to an object's lifetime, doesn't block GC
// ---------------------------------------------------------------------------
const weakCache = new WeakMap();

function attachMetadata(obj, meta) {
  weakCache.set(obj, meta); // does NOT keep `obj` alive on its own
}

let tempUser = { name: "temporary" };
attachMetadata(tempUser, { loadedAt: Date.now() });
console.log(weakCache.get(tempUser)); // { loadedAt: ... }

// Once we drop every other reference to tempUser, the WeakMap entry becomes
// eligible for cleanup too (we can't force/observe GC deterministically here,
// but this is exactly why WeakMap is safe for "attach data to this object"
// patterns where a regular Map would leak memory forever):
tempUser = null;

// Note: WeakMap has no .size, no .keys(), no for...of — uncomment to see the TypeError:
// for (const entry of weakCache) {}  // TypeError: weakCache is not iterable

// ---------------------------------------------------------------------------
// 4. WeakSet — "have I already processed this object" without leaking
// ---------------------------------------------------------------------------
const alreadyProcessed = new WeakSet();

function processOnce(item) {
  if (alreadyProcessed.has(item)) {
    console.log("skipping, already processed:", item.name);
    return;
  }
  alreadyProcessed.add(item);
  console.log("processing:", item.name);
}

const itemA = { name: "A" };
const itemB = { name: "B" };
processOnce(itemA); // processing: A
processOnce(itemB); // processing: B
processOnce(itemA); // skipping, already processed: A

// ---------------------------------------------------------------------------
// Expected output when run:
// the answer
// 3
// map entry: name => Sri
// map entry: 42 => the answer
// map entry: { id: 1 } => user object as key
// [ '42' ]
// true
// Set(4) { 1, 2, 3, 4 }
// [ 1, 2, 3, 4 ]
// true
// true
// { loadedAt: <timestamp> }
// processing: A
// processing: B
// skipping, already processed: A
// ---------------------------------------------------------------------------
