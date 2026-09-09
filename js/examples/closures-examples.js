/**
 * closures-examples.js
 * Run with: node closures-examples.js
 *
 * Demonstrates: private counter, memoization, module pattern
 * See ../02-closures.md for the full explanation.
 */

// ---------------------------------------------------------------------------
// 1. Private counter — the classic "data privacy via closure" example
// ---------------------------------------------------------------------------
function createCounter(startAt = 0) {
  let count = startAt; // this variable is PRIVATE — no way to reach it from outside

  return {
    increment() { return ++count; },
    decrement() { return --count; },
    getValue() { return count; },
  };
}

const counter = createCounter(10);
console.log("=== Private Counter ===");
console.log(counter.increment()); // 11
console.log(counter.increment()); // 12
console.log(counter.decrement()); // 11
console.log(counter.getValue());  // 11
console.log(counter.count);       // undefined — truly inaccessible from outside


// ---------------------------------------------------------------------------
// 2. Memoization — closure holds a cache that persists between calls
// ---------------------------------------------------------------------------
function memoize(fn) {
  const cache = new Map(); // private cache, trapped in the closure

  return function (...args) {
    const key = JSON.stringify(args);
    if (cache.has(key)) {
      console.log(`(cache hit for ${key})`);
      return cache.get(key);
    }
    const result = fn(...args);
    cache.set(key, result);
    return result;
  };
}

function slowSquare(n) {
  // simulate an expensive computation
  for (let i = 0; i < 1e6; i++) {} // pretend this takes a while
  return n * n;
}

const fastSquare = memoize(slowSquare);
console.log("\n=== Memoization ===");
console.log(fastSquare(5)); // computed: 25
console.log(fastSquare(5)); // cache hit: 25 (instant, no recompute)
console.log(fastSquare(6)); // computed: 36


// ---------------------------------------------------------------------------
// 3. Module Pattern — IIFE + closure to fake "private" module internals
//    (This is what people used before ES Modules / private class fields existed)
// ---------------------------------------------------------------------------
const ShoppingCart = (function () {
  let items = []; // private state, unreachable from outside this IIFE

  function calculateTotal() {
    return items.reduce((sum, item) => sum + item.price * item.qty, 0);
  }

  // Only these methods are exposed — the public API
  return {
    addItem(name, price, qty = 1) {
      items.push({ name, price, qty });
    },
    removeItem(name) {
      items = items.filter((item) => item.name !== name);
    },
    getTotal() {
      return calculateTotal();
    },
    getItems() {
      return [...items]; // return a COPY, so callers can't mutate our private array directly
    },
  };
})();

console.log("\n=== Module Pattern (Shopping Cart) ===");
ShoppingCart.addItem("Book", 15, 2);
ShoppingCart.addItem("Pen", 2, 5);
console.log(ShoppingCart.getItems());
console.log("Total:", ShoppingCart.getTotal()); // 15*2 + 2*5 = 40
console.log(ShoppingCart.items); // undefined — items is private, not reachable


// ---------------------------------------------------------------------------
// 4. Classic interview trap — var vs let inside a loop with closures
// ---------------------------------------------------------------------------
console.log("\n=== var vs let in loops (closure trap) ===");

console.log("Using var (all print 3, since there's only ONE shared i):");
for (var i = 0; i < 3; i++) {
  setTimeout(() => console.log("  var i =", i), 0);
}

console.log("Using let (prints 0, 1, 2 — each iteration gets its own i):");
for (let j = 0; j < 3; j++) {
  setTimeout(() => console.log("  let j =", j), 0);
}
