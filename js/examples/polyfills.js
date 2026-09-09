/**
 * polyfills.js
 * Run with: node polyfills.js
 *
 * Implements Array.prototype.map/filter/reduce, Promise.all, and Function.prototype.bind
 * from scratch — a classic senior-level interview coding task.
 * See ../13-build-tools-concepts.md for the polyfill-vs-transpilation distinction.
 */

// ---------------------------------------------------------------------------
// Array.prototype.myMap
// ---------------------------------------------------------------------------
Array.prototype.myMap = function (callback, thisArg) {
  if (typeof callback !== "function") throw new TypeError(`${callback} is not a function`);
  const result = [];
  for (let i = 0; i < this.length; i++) {
    if (i in this) { // skip holes in sparse arrays, same as the real .map()
      result[i] = callback.call(thisArg, this[i], i, this);
    }
  }
  return result;
};

console.log("=== myMap ===");
console.log([1, 2, 3].myMap((x) => x * 2)); // [2, 4, 6]


// ---------------------------------------------------------------------------
// Array.prototype.myFilter
// ---------------------------------------------------------------------------
Array.prototype.myFilter = function (callback, thisArg) {
  if (typeof callback !== "function") throw new TypeError(`${callback} is not a function`);
  const result = [];
  for (let i = 0; i < this.length; i++) {
    if (i in this && callback.call(thisArg, this[i], i, this)) {
      result.push(this[i]);
    }
  }
  return result;
};

console.log("\n=== myFilter ===");
console.log([1, 2, 3, 4, 5].myFilter((x) => x % 2 === 0)); // [2, 4]


// ---------------------------------------------------------------------------
// Array.prototype.myReduce
// ---------------------------------------------------------------------------
Array.prototype.myReduce = function (callback, initialValue) {
  if (typeof callback !== "function") throw new TypeError(`${callback} is not a function`);

  let accumulator = initialValue;
  let startIndex = 0;

  if (accumulator === undefined) {
    // no initial value provided — use the first element as the seed (matches native behavior)
    if (this.length === 0) throw new TypeError("Reduce of empty array with no initial value");
    accumulator = this[0];
    startIndex = 1;
  }

  for (let i = startIndex; i < this.length; i++) {
    if (i in this) {
      accumulator = callback(accumulator, this[i], i, this);
    }
  }
  return accumulator;
};

console.log("\n=== myReduce ===");
console.log([1, 2, 3, 4].myReduce((acc, x) => acc + x, 0)); // 10
console.log([1, 2, 3, 4].myReduce((acc, x) => acc + x));    // 10 — no initial value, uses first element as seed


// ---------------------------------------------------------------------------
// Function.prototype.myBind
// ---------------------------------------------------------------------------
Function.prototype.myBind = function (context, ...boundArgs) {
  const originalFn = this;
  return function (...callArgs) {
    return originalFn.apply(context, [...boundArgs, ...callArgs]);
  };
};

console.log("\n=== myBind ===");
function greet(greeting, name) {
  return `${greeting}, ${name}! (this.id = ${this?.id})`;
}
const boundGreet = greet.myBind({ id: 42 }, "Hello");
console.log(boundGreet("World")); // "Hello, World! (this.id = 42)"


// ---------------------------------------------------------------------------
// Promise.myAll — resolves when ALL input promises resolve, rejects on first rejection
// ---------------------------------------------------------------------------
Promise.myAll = function (promises) {
  return new Promise((resolve, reject) => {
    if (!Array.isArray(promises)) {
      return reject(new TypeError("Argument must be an array"));
    }
    if (promises.length === 0) return resolve([]);

    const results = new Array(promises.length);
    let completedCount = 0;

    promises.forEach((p, index) => {
      // Promise.resolve() ensures non-promise values (plain values) are handled too, like the real Promise.all
      Promise.resolve(p)
        .then((value) => {
          results[index] = value; // store at the ORIGINAL index — preserves input order regardless of completion order
          completedCount++;
          if (completedCount === promises.length) {
            resolve(results);
          }
        })
        .catch(reject); // fail fast — first rejection immediately rejects the whole thing
    });
  });
};

console.log("\n=== Promise.myAll ===");
function delayResolve(value, ms) {
  return new Promise((res) => setTimeout(() => res(value), ms));
}

Promise.myAll([delayResolve("A", 30), delayResolve("B", 10), delayResolve("C", 20)]).then(
  (results) => console.log("myAll resolved (order preserved despite different delays):", results)
  // Expected: ['A', 'B', 'C'] — even though B finishes first, A's result stays at index 0
);

Promise.myAll([delayResolve("X", 10), Promise.reject(new Error("Y failed"))]).catch((err) =>
  console.log("myAll rejected fast:", err.message)
);
