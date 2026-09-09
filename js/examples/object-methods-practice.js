/**
 * object-methods-practice.js
 * Run with: node object-methods-practice.js
 *
 * Demonstrates: reference vs value semantics, reading structure,
 * copying/merging, locking down objects, property descriptors,
 * Object.is, and 4 classic interview mini-problems (merge, isEmpty,
 * deepEqual, deepFreeze).
 * See ../19-object-methods-reference.md for the full explanation.
 */

// ---------------------------------------------------------------------------
// 1. Objects are compared/assigned by reference, not by value
// ---------------------------------------------------------------------------
console.log("=== Reference vs Value Semantics ===");
const obj1 = { name: "Sri" };
const obj2 = { name: "Sri" };
console.log("obj1 === obj2:", obj1 === obj2); // false — different objects, same contents

const a = obj1;
console.log("a === obj1:", a === obj1); // true — same reference
a.name = "Ram";
console.log("mutating through a affects obj1:", obj1.name); // "Ram"


// ---------------------------------------------------------------------------
// 2. Reading structure
// ---------------------------------------------------------------------------
console.log("\n=== Reading Structure ===");
const user = { name: "Sri", age: 30, city: "Chennai" };
console.log("keys:", Object.keys(user));
console.log("values:", Object.values(user));
console.log("entries:", Object.entries(user));

for (const [key, value] of Object.entries(user)) {
  console.log(`  ${key}: ${value}`);
}

const rebuilt = Object.fromEntries(Object.entries(user));
console.log("fromEntries round-trip:", rebuilt);

const upperKeys = Object.fromEntries(
  Object.entries(user).map(([k, v]) => [k.toUpperCase(), v])
);
console.log("transformed keys:", upperKeys);


// ---------------------------------------------------------------------------
// 3. Copying / merging
// ---------------------------------------------------------------------------
console.log("\n=== Copying/Merging ===");
const target = { a: 1 };
const source = { b: 2 };
const assignResult = Object.assign(target, source);
console.log("Object.assign result:", assignResult);
console.log("target was mutated:", target); // { a: 1, b: 2 } — gotcha!
console.log("result === target:", assignResult === target); // true

const safeAssign = Object.assign({}, { x: 1 }, { y: 2 }); // safe pattern with {} target
console.log("safe Object.assign:", safeAssign);

const mergedSpread = { ...{ a: 1, b: 2 }, ...{ b: 99, c: 3 } };
console.log("spread merge:", mergedSpread); // { a: 1, b: 99, c: 3 }

console.log("\n--- Shallow copy gotcha ---");
const original = { name: "Sri", address: { city: "Chennai" } };
const shallowCopy = { ...original };
shallowCopy.address.city = "Bangalore";
console.log("original.address.city after mutating copy's nested obj:", original.address.city); // "Bangalore" — shared reference!


// ---------------------------------------------------------------------------
// 4. Locking down objects
// ---------------------------------------------------------------------------
console.log("\n=== Locking Down Objects ===");
const frozen = Object.freeze({ apiUrl: "https://api.example.com", nested: { retries: 3 } });
frozen.apiUrl = "hacked";
frozen.newProp = "nope";
delete frozen.apiUrl;
console.log("frozen after mutation attempts:", frozen); // unchanged at top level
frozen.nested.retries = 999; // freeze is SHALLOW
console.log("nested still mutable (freeze gotcha):", frozen.nested.retries); // 999

const sealed = Object.seal({ a: 1 });
sealed.a = 2;   // allowed — modify
sealed.b = 3;   // blocked — add
delete sealed.a; // blocked — remove
console.log("sealed (modify ok, add/remove blocked):", sealed); // { a: 2 }

const preventExt = Object.preventExtensions({ a: 1 });
preventExt.a = 2;      // allowed
delete preventExt.a;    // allowed (unlike seal!)
preventExt.b = 3;        // blocked — add
console.log("preventExtensions (delete ok, add blocked):", preventExt); // {}

console.log("isFrozen:", Object.isFrozen(frozen));       // true
console.log("isSealed (frozen implies sealed):", Object.isSealed(frozen)); // true
console.log("isExtensible (plain obj):", Object.isExtensible({}));           // true


// ---------------------------------------------------------------------------
// 5. Property descriptors
// ---------------------------------------------------------------------------
console.log("\n=== Property Descriptors ===");
const descUser = { name: "Sri" };
Object.defineProperty(descUser, "internalId", {
  value: "abc123",
  enumerable: false,
  writable: true,
  configurable: true,
});
console.log("Object.keys hides non-enumerable:", Object.keys(descUser)); // ["name"]
console.log("direct access still works:", descUser.internalId);            // "abc123"
console.log("JSON.stringify also hides it:", JSON.stringify(descUser));     // '{"name":"Sri"}'
console.log(
  "getOwnPropertyNames sees everything:",
  Object.getOwnPropertyNames(descUser)
); // ["name", "internalId"]
console.log(
  "getOwnPropertyDescriptor:",
  Object.getOwnPropertyDescriptor(descUser, "internalId")
);


// ---------------------------------------------------------------------------
// 6. Object.is — the two edge cases vs ===
// ---------------------------------------------------------------------------
console.log("\n=== Object.is vs === ===");
console.log("NaN === NaN:", NaN === NaN);             // false
console.log("Object.is(NaN, NaN):", Object.is(NaN, NaN)); // true
console.log("0 === -0:", 0 === -0);                     // true
console.log("Object.is(0, -0):", Object.is(0, -0));       // false


// ---------------------------------------------------------------------------
// 7. Classic interview mini-problems
// ---------------------------------------------------------------------------
console.log("\n=== Mini-Problem 1: Merge two objects (second overrides first) ===");
function mergeObjects(o1, o2) {
  return { ...o1, ...o2 };
}
console.log(mergeObjects({ a: 1, b: 2 }, { b: 99, c: 3 })); // { a: 1, b: 99, c: 3 }

console.log("\n=== Mini-Problem 2: Check if an object is empty ===");
function isEmpty(obj) {
  return Object.keys(obj).length === 0;
}
console.log(isEmpty({}));       // true
console.log(isEmpty({ a: 1 })); // false

console.log("\n=== Mini-Problem 3: Simple deep-equal comparison ===");
function deepEqual(x, y) {
  if (x === y) return true;
  if (typeof x !== "object" || typeof y !== "object" || x === null || y === null) return false;

  const keysX = Object.keys(x);
  const keysY = Object.keys(y);
  if (keysX.length !== keysY.length) return false;

  return keysX.every((key) => Object.hasOwn(y, key) && deepEqual(x[key], y[key]));
}
console.log(deepEqual({ a: 1, b: { c: 2 } }, { a: 1, b: { c: 2 } })); // true
console.log(deepEqual({ a: 1 }, { a: 1, b: 2 }));                       // false
console.log(deepEqual([1, [2, 3]], [1, [2, 3]]));                       // true

console.log("\n=== Mini-Problem 4 (Bonus): deepFreeze ===");
function deepFreeze(obj) {
  Object.getOwnPropertyNames(obj).forEach((key) => {
    const value = obj[key];
    if (value && typeof value === "object" && !Object.isFrozen(value)) {
      deepFreeze(value);
    }
  });
  return Object.freeze(obj);
}
const deepConfig = deepFreeze({ apiUrl: "https://api.example.com", nested: { retries: 3 } });
deepConfig.nested.retries = 999; // should now silently fail
console.log("deepFreeze protects nested objects:", deepConfig.nested.retries); // 3
