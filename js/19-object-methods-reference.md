# 19 — Object Methods Reference (Practical Guide)

## Why does this file exist?

**The problem it solves:** just like arrays and strings, `Object` static methods (`Object.keys`, `Object.assign`, `Object.freeze`, etc.) are used everywhere but scattered across this folder without a dedicated reference. This file collects them all with practical "how do I use this" examples.

**Already covered elsewhere — cross-referenced, not re-explained:**
- Prototype chain, `__proto__` vs `prototype`, classical vs prototypal inheritance — file 04 (this file only briefly touches `Object.create`/`getPrototypeOf`/`setPrototypeOf` and points there for depth)
- `Object.fromEntries()`, `Object.hasOwn()` — file 07
- `Object.groupBy()` — file 15
- Deep clone vs shallow clone, `structuredClone()` — files 11 and 16 (this file only notes that `Object.assign`/spread are shallow, and links to those files for the deep-clone discussion)
- `JSON.stringify`/`JSON.parse` replacer/reviver — file 16

**The key concept underlying most of this file:**

> **Objects are compared and assigned by reference, not by value.**

```js
const obj1 = { name: "Sri" };
const obj2 = { name: "Sri" };
console.log(obj1 === obj2); // false — two DIFFERENT objects in memory, even with identical contents

const a = obj1;             // a now points to the SAME object as obj1, no copy is made
console.log(a === obj1);    // true — same reference
a.name = "Ram";
console.log(obj1.name);     // "Ram" — mutating through `a` affects obj1 too, since they're the same object
```
This is exactly why methods like `Object.assign()`, spread, and `structuredClone()` exist — you often need a way to explicitly COPY an object instead of just handing out another reference to the same one.

---

## Reading Structure

**What problem does this solve?** Getting an object's keys, values, or key-value pairs as arrays you can loop over or feed into array methods (`map`, `filter`, `reduce`).

### `Object.keys(obj)`

```js
const user = { name: "Sri", age: 30, city: "Chennai" };
Object.keys(user); // ["name", "age", "city"]

Object.keys(user).forEach((key) => console.log(key, "=", user[key]));
// name = Sri
// age = 30
// city = Chennai
```

### `Object.values(obj)`

```js
Object.values(user); // ["Sri", 30, "Chennai"]
Object.values(user).reduce((sum, v) => typeof v === "number" ? sum + v : sum, 0); // 30
```

### `Object.entries(obj)` — pairs, great for `for...of` and `reduce`

```js
Object.entries(user); // [["name","Sri"], ["age",30], ["city","Chennai"]]

for (const [key, value] of Object.entries(user)) {
  console.log(`${key}: ${value}`);
}
```

### `Object.fromEntries(entries)` — completes the round trip (file 07)

```js
const entries = Object.entries(user);
const rebuilt = Object.fromEntries(entries);
console.log(rebuilt); // { name: "Sri", age: 30, city: "Chennai" } — back to an object

// Practical use: transform an object's values via entries -> map -> fromEntries
const upperKeys = Object.fromEntries(
  Object.entries(user).map(([k, v]) => [k.toUpperCase(), v])
);
console.log(upperKeys); // { NAME: "Sri", AGE: 30, CITY: "Chennai" }
```

---

## Copying / Merging

**What problem does this solve?** Combining two or more objects into one, or making a copy so mutating the copy doesn't affect the original.

### `Object.assign(target, ...sources)` — mutates and returns the FIRST argument

```js
const target = { a: 1 };
const source = { b: 2 };
const result = Object.assign(target, source);
console.log(result); // { a: 1, b: 2 }
console.log(target);  // { a: 1, b: 2 } — target itself was MUTATED, this is the classic gotcha
console.log(result === target); // true — same object

// The common safe pattern: pass an EMPTY object as the target so nothing existing gets mutated
const merged = Object.assign({}, source1, source2); // later sources override earlier ones on key conflicts
```

### Spread `{...obj}` — the modern preferred alternative

```js
const obj1 = { a: 1, b: 2 };
const obj2 = { b: 99, c: 3 };
const merged = { ...obj1, ...obj2 };
console.log(merged); // { a: 1, b: 99, c: 3 } — later spread wins on conflicts
console.log(obj1);   // { a: 1, b: 2 } — untouched, spread never mutates its sources
```
**Why spread is generally preferred over `Object.assign` today:** it's more concise, reads left-to-right the same way merge order works, and there's no risk of accidentally mutating one of the source objects by forgetting to pass `{}` as the first argument.

**Both are SHALLOW.** Nested objects are copied by REFERENCE, not recursively cloned:
```js
const original = { name: "Sri", address: { city: "Chennai" } };
const copy = { ...original };
copy.address.city = "Bangalore";
console.log(original.address.city); // "Bangalore" — the nested object was SHARED, not copied!
```
For a real recursive copy, see the Deep Clone vs Shallow Clone discussion in file 16 (and `structuredClone()` in file 07) — not re-explained here.

---

## Locking Down Objects

**What problem does this solve?** Preventing accidental mutation of an object — at different levels of strictness. These three are constantly confused with each other, so here's a direct comparison.

### `Object.freeze(obj)` — the strictest: no adding, removing, or changing existing properties

```js
const config = Object.freeze({ apiUrl: "https://api.example.com", nested: { retries: 3 } });
config.apiUrl = "hacked";       // silently fails (throws in strict mode / modules)
config.newProp = "nope";         // silently fails
delete config.apiUrl;            // silently fails
console.log(config.apiUrl);      // "https://api.example.com" — unchanged

// THE CLASSIC GOTCHA: freeze is SHALLOW — nested objects are still fully mutable!
config.nested.retries = 999;
console.log(config.nested.retries); // 999 — freeze did NOT protect the nested object
```

### `Object.seal(obj)` — can MODIFY existing properties, but not add or remove any

```js
const sealed = Object.seal({ a: 1 });
sealed.a = 2;        // allowed — modifying an EXISTING property is fine
sealed.b = 3;        // silently fails — can't ADD a new property
delete sealed.a;      // silently fails — can't REMOVE either
console.log(sealed);  // { a: 2 }
```

### `Object.preventExtensions(obj)` — the loosest: can't ADD new properties, but CAN modify/delete existing ones

```js
const noExtend = Object.preventExtensions({ a: 1 });
noExtend.a = 2;         // allowed
delete noExtend.a;       // allowed — this one is different from seal, delete DOES work here
noExtend.b = 3;           // silently fails — can't add
console.log(noExtend);    // {} (a was deleted, b was never added)
```

### Comparison Table

| | Add new props? | Remove existing props? | Modify existing props? |
|---|---|---|---|
| `Object.freeze()` | No | No | No |
| `Object.seal()` | No | No | **Yes** |
| `Object.preventExtensions()` | No | **Yes** | **Yes** |

### Checking the state: `isFrozen()` / `isSealed()` / `isExtensible()`

```js
const obj = Object.freeze({});
Object.isFrozen(obj);        // true
Object.isSealed(obj);        // true — frozen objects are ALSO sealed (freeze is a superset)
Object.isExtensible(obj);    // false

const plain = {};
Object.isExtensible(plain);  // true — plain objects are extensible by default
```

---

## Prototype-Related (Brief — See File 04 for Depth)

### `Object.create(proto)` — create an object with a specific prototype

```js
const animal = { speak() { return `${this.name} makes a sound`; } };
const dog = Object.create(animal);
dog.name = "Rex";
console.log(dog.speak()); // "Rex makes a sound" — dog inherits speak() via the prototype chain

const noProto = Object.create(null); // an object with NO prototype at all — no inherited methods, not even toString()
```

### `Object.getPrototypeOf(obj)` / `Object.setPrototypeOf(obj, proto)`

```js
Object.getPrototypeOf(dog) === animal; // true
Object.setPrototypeOf(dog, {});          // reassigns dog's prototype (rarely done in practice, hurts performance)
```
See file 04 for the full explanation of the prototype chain, `__proto__` vs `prototype`, and why `Object.create` matters for prototypal inheritance.

---

## Property Descriptors

**What problem does this solve?** Every object property has more to it than just its value — it also has flags controlling whether it shows up in `for...in`/`Object.keys()` (enumerable), whether it can be reassigned (writable), and whether it can be deleted/reconfigured (configurable). `Object.defineProperty` lets you control these directly.

### `Object.defineProperty(obj, key, descriptor)`

```js
const user = { name: "Sri" };

// Make a property read-only
Object.defineProperty(user, "name", { writable: false });
user.name = "Changed"; // silently fails (throws in strict mode)
console.log(user.name); // "Sri"

// Make a property non-enumerable — hides it from Object.keys()/for...in/JSON.stringify
Object.defineProperty(user, "internalId", {
  value: "abc123",
  enumerable: false,
  writable: true,
  configurable: true,
});
console.log(Object.keys(user));       // ["name"] — internalId is hidden
console.log(user.internalId);          // "abc123" — still directly accessible though
console.log(JSON.stringify(user));     // '{"name":"Sri"}' — also hidden from serialization
```
**Practical use case:** libraries add "hidden" metadata properties to objects (like React does internally, or a class implementing custom iteration) without polluting `Object.keys()`/`JSON.stringify()` output for consumers.

### `Object.defineProperties(obj, descriptorsMap)` — define multiple at once

```js
Object.defineProperties(user, {
  age: { value: 30, enumerable: true, writable: true },
  ssn: { value: "000-00-0000", enumerable: false, writable: false },
});
```

### `Object.getOwnPropertyDescriptor(obj, key)` / `Object.getOwnPropertyNames(obj)`

```js
Object.getOwnPropertyDescriptor(user, "internalId");
// { value: "abc123", writable: true, enumerable: false, configurable: true }

// getOwnPropertyNames vs Object.keys — the key difference: NAMES includes NON-enumerable props too
Object.keys(user);              // ["name", "age"] — only enumerable
Object.getOwnPropertyNames(user); // ["name", "internalId", "age", "ssn"] — everything, enumerable or not
// (Symbol-keyed properties are excluded from BOTH — use Object.getOwnPropertySymbols() for those)
```

---

## Comparison: `Object.is()`

**What problem does this solve?** `===` is usually right, but it has two specific edge cases that don't match mathematical/logical expectations. `Object.is()` implements the "SameValue" algorithm, which fixes both.

```js
// Edge case 1: NaN
NaN === NaN;           // false — the ONE value in JS that's never equal to itself under ===
Object.is(NaN, NaN);    // true — Object.is correctly treats NaN as equal to itself

// Edge case 2: signed zero
0 === -0;               // true — === treats them as the same
Object.is(0, -0);        // false — Object.is correctly distinguishes positive and negative zero

// Everything else behaves exactly like ===
Object.is(1, 1);         // true
Object.is("a", "a");     // true
Object.is({}, {});        // false — still different references, just like ===
```
**Real-world usage:** `Object.is` is what React's core reconciliation used to reference for its default comparison semantics for some checks (though `Object.is`-exact usage varies by version) — mostly relevant in interviews as "know the two edge cases," rarely needed in everyday app code directly.

---

## `Object.hasOwn()` — Cross-Reference

`Object.hasOwn(obj, key)` (ES2022) is the modern, safer replacement for `obj.hasOwnProperty(key)` — it works even on objects with no prototype (`Object.create(null)`). Full explanation and rationale is in file 07; included here only for completeness of this reference.

```js
Object.hasOwn({ a: 1 }, "a"); // true
Object.hasOwn({ a: 1 }, "toString"); // false — toString is inherited, not own
```

---

## Classic Interview Tasks

### 1. Merge two objects, second overriding the first

```js
function mergeObjects(obj1, obj2) {
  return { ...obj1, ...obj2 }; // or Object.assign({}, obj1, obj2)
}
console.log(mergeObjects({ a: 1, b: 2 }, { b: 99, c: 3 })); // { a: 1, b: 99, c: 3 }
```

### 2. Check if an object is empty

```js
function isEmpty(obj) {
  return Object.keys(obj).length === 0;
}
console.log(isEmpty({}));       // true
console.log(isEmpty({ a: 1 })); // false
```

### 3. Write a simple deep-equal comparison function

```js
function deepEqual(a, b) {
  if (a === b) return true; // handles primitives and same-reference objects, and covers Object.is-style exactness only for ===-safe values
  if (typeof a !== "object" || typeof b !== "object" || a === null || b === null) return false;

  const keysA = Object.keys(a);
  const keysB = Object.keys(b);
  if (keysA.length !== keysB.length) return false;

  return keysA.every((key) => Object.hasOwn(b, key) && deepEqual(a[key], b[key]));
}

console.log(deepEqual({ a: 1, b: { c: 2 } }, { a: 1, b: { c: 2 } })); // true
console.log(deepEqual({ a: 1 }, { a: 1, b: 2 }));                       // false
console.log(deepEqual([1, [2, 3]], [1, [2, 3]]));                       // true — arrays are objects too
```
**Why this is genuinely hard in the general case:** a truly robust deep-equal has to handle circular references (this naive version would infinite-loop), Dates, RegExps, Maps/Sets, `NaN` (should `NaN` equal `NaN`? most libraries say yes, unlike `===`), Symbol-keyed properties, and getters/setters with side effects. This is exactly why battle-tested libraries like Lodash's `_.isEqual` exist instead of everyone hand-rolling their own — it's a deceptively large surface area to get fully correct.

### 4. Bonus: implement a basic `deepFreeze` (recursive), showing you understand `freeze`'s shallow limitation

```js
function deepFreeze(obj) {
  Object.getOwnPropertyNames(obj).forEach((key) => {
    const value = obj[key];
    if (value && typeof value === "object" && !Object.isFrozen(value)) {
      deepFreeze(value); // recurse into nested objects/arrays BEFORE freezing this level
    }
  });
  return Object.freeze(obj);
}

const config = deepFreeze({ apiUrl: "https://api.example.com", nested: { retries: 3 } });
config.nested.retries = 999; // now silently fails too — the nested object got frozen recursively
console.log(config.nested.retries); // 3 — protected, unlike plain Object.freeze()
```

---

## How to Explain in an Interview (Simple English)

"The thing I keep in mind with objects is that they're always handled by reference — assigning or passing an object doesn't copy it, it just hands out another pointer to the same thing in memory. That's why `Object.assign`/spread exist for making actual copies, but both are shallow — nested objects are still shared references, so a real deep copy needs recursion or `structuredClone`. For locking things down, I think of `freeze` → `seal` → `preventExtensions` as three levels of decreasing strictness, and I always remember `freeze` only protects the TOP level — nested objects need a recursive deep-freeze if I actually want full immutability. For comparing objects, `===`/`Object.is` only check reference identity for objects — value-based deep equality has to be written (or borrowed from a library) as a recursive key-by-key comparison."

---

## Quick Summary Table

| Category | Methods |
|---|---|
| Reading structure | `Object.keys`, `Object.values`, `Object.entries`, `Object.fromEntries` (file 07) |
| Copying/merging | `Object.assign` (mutates target), spread `{...obj}` (preferred), both shallow — see files 11/16 for deep clone |
| Locking down | `Object.freeze`, `Object.seal`, `Object.preventExtensions`, `Object.isFrozen`/`isSealed`/`isExtensible` |
| Prototype-related | `Object.create`, `Object.getPrototypeOf`/`setPrototypeOf` — full depth in file 04 |
| Property descriptors | `Object.defineProperty`/`defineProperties`, `Object.getOwnPropertyDescriptor`/`getOwnPropertyNames` |
| Comparison | `Object.is` (fixes `NaN`/`-0` edge cases vs `===`) |
| Existence check | `Object.hasOwn` — full depth in file 07 |
| Grouping | `Object.groupBy` — full depth in file 15 |
