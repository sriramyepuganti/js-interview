# 14 — Rapid-Fire Interview Q&A (Senior JS)

## Part 1: Crisp Q&A (Most Commonly & Recently Asked)

**1. What's the difference between `var`, `let`, and `const`?**
`var` is function-scoped and hoisted as `undefined`; `let`/`const` are block-scoped and stay in the TDZ until declared. `const` can't be reassigned (but object/array contents can still mutate).

**2. What is a closure?**
A function that remembers and can access variables from its outer scope even after that outer function has finished executing.

**3. Why does `typeof null === "object"`?**
It's a long-standing bug from JS's very first implementation (values were tagged with a type flag, and `null`'s flag happened to match the object type). Fixing it now would break the web, so it's permanent.

**4. What's the difference between `==` and `===`?**
`===` checks value AND type with no conversion. `==` performs type coercion before comparing, which can produce surprising results (`"" == 0` is `true`).

**5. Explain the event loop in one sentence.**
JS runs sync code first, then fully empties the microtask queue (Promises), then takes one task from the macrotask queue (setTimeout etc.), repeating forever.

**6. What is hoisting?**
JS allocates memory for variable/function declarations before executing any code — `var` becomes `undefined`, functions are fully usable, `let`/`const` are in TDZ.

**7. Difference between `null` and `undefined`?**
`undefined` means a variable was declared but never assigned a value (JS's own default). `null` is an intentional, explicit "no value," assigned by the developer.

**8. What does `this` refer to in an arrow function?**
Nothing of its own — it inherits `this` lexically from the enclosing scope where it was defined.

**9. What's the difference between `call`, `apply`, and `bind`?**
`call`/`apply` invoke the function immediately with a given `this` (args individually vs as an array); `bind` returns a new function with `this` locked in, to call later.

**10. What is the prototype chain?**
The lookup path JS follows through an object's `__proto__` links to resolve a property/method that isn't found directly on the object.

**11. How is `class` related to prototypes?**
`class`/`extends` is syntactic sugar — under the hood it still just wires up the same prototype chain as constructor functions always used.

**12. What problem do Promises solve?**
Callback hell — deeply nested async callbacks that were hard to read and had inconsistent error handling.

**13. What are the three Promise states?**
`pending`, `fulfilled`, `rejected` — and once settled (fulfilled/rejected), it can never change again.

**14. Difference between `Promise.all` and `Promise.allSettled`?**
`all` fails fast if any promise rejects; `allSettled` waits for every promise and gives you each outcome (success or failure) without ever rejecting itself.

**15. What is `async/await` really?**
Syntactic sugar over Promises — lets you write async code using normal `try/catch`/control flow, while still running on the microtask queue underneath.

**16. What's the difference between microtasks and macrotasks?**
Microtasks (Promises) are fully drained before the next macrotask (setTimeout, etc.) runs — microtasks always have priority.

**17. What is optional chaining `?.` and why use it?**
Safely access deeply nested properties, returning `undefined` instead of throwing if an intermediate value is `null`/`undefined`.

**18. Difference between `??` and `||`?**
`??` only falls back on `null`/`undefined`; `||` falls back on ANY falsy value (`0`, `""`, `false`, `NaN` too) — often a source of bugs when `0` or `""` are valid values.

**19. What is the iterable protocol?**
Any object implementing `[Symbol.iterator]` (returning an object with `.next()`) can be used in `for...of`, spread, and destructuring.

**20. What is a generator function used for?**
Writing pausable/resumable functions — great for custom iterators, lazy/infinite sequences, and (historically) async flow control (redux-saga still uses this).

**21. Why were JS modules invented?**
To fix global scope pollution — before modules, every script shared one global namespace with no privacy or reliable dependency ordering.

**22. Why does ESM enable tree-shaking but CommonJS mostly doesn't?**
ESM `import`/`export` are static (analyzable without running code); CommonJS's `require()` is a dynamic runtime function call, so bundlers can't safely prove something is unused.

**23. What's a memory leak in a garbage-collected language?**
Memory that's no longer needed but is still *reachable* — e.g., via a forgotten timer, event listener, or closure — so the GC can't collect it.

**24. Explain mark-and-sweep garbage collection.**
Start from root references (globals, call stack), mark everything reachable, then sweep away (free) everything unmarked — correctly handles even circular references.

**25. What's the difference between debounce and throttle?**
Debounce waits for activity to stop before running once; throttle runs at most once per fixed interval regardless of how often the event fires.

**26. What is currying?**
Transforming a multi-argument function into a sequence of single-argument functions, enabling partial application.

**27. What's the difference between a shallow copy and a deep copy?**
Shallow copy (`{...obj}`, `Object.assign`) copies top-level properties only — nested objects are still shared by reference. Deep copy (`structuredClone`) recursively clones everything.

**28. What is `Object.freeze` and its limitation?**
Prevents adding/removing/reassigning top-level properties, but it's shallow — nested objects inside a frozen object can still be mutated.

**29. What is a WeakMap and why use it over a Map?**
Like a Map but keys must be objects and are weakly referenced — they don't prevent garbage collection, making it good for attaching private/extra data to objects without causing memory leaks.

**30. What is event delegation?**
Attaching a single listener to a parent element to handle events from its children (via bubbling), instead of attaching a listener to every child individually — better performance, works for dynamically added children.

**31. Difference between event bubbling and capturing?**
Bubbling: event fires on the target first, then propagates UP to ancestors. Capturing: event fires on the ancestors first, going DOWN to the target. Set the 3rd arg of `addEventListener` to `true` for capturing.

**32. What does `Function.prototype.bind` actually return?**
A brand-new function with `this` (and optionally some leading arguments) permanently fixed — calling `.bind()` again on it does nothing (first bind wins).

**33. What is a pure function?**
A function that always returns the same output for the same input and causes no side effects (doesn't mutate external state).

**34. Why is immutability valued in modern JS (React/Redux)?**
It makes change detection cheap (reference comparison instead of deep comparison) and avoids subtle bugs from shared mutable state.

**35. What's the difference between `Object.keys` and `Object.getOwnPropertyNames`?**
`Object.keys` only returns enumerable own properties; `getOwnPropertyNames` returns ALL own properties including non-enumerable ones.

**36. What's a `Symbol` used for?**
Creating guaranteed-unique property keys, often to avoid naming collisions or to define "hidden" protocol methods like `Symbol.iterator`.

**37. What happens if you don't handle a Promise rejection?**
It becomes an "unhandled promise rejection" — logged as a warning/error in the console, and in Node it can even crash the process depending on version/config.

**38. What is `structuredClone` and why was it added?**
A built-in deep-clone function that correctly handles Dates, Maps, Sets, etc., unlike the old `JSON.parse(JSON.stringify(x))` hack which silently breaks those types.

**39. What are private class fields (`#field`)?**
True, engine-enforced private state on classes (ES2022) — inaccessible from outside, unlike the old convention of prefixing with `_` (which was just a naming convention, not real privacy).

**40. What's the difference between a polyfill and a transpiler?**
A polyfill adds a MISSING runtime feature/method (e.g., `Array.prototype.includes`); a transpiler rewrites NEW SYNTAX into older, equivalent syntax (e.g., arrow functions → regular functions).

**41. Why is synchronous AJAX considered bad practice?**
It blocks the single JS thread entirely — the whole page freezes (no clicking, scrolling, typing) until the request finishes.

**42. What is `NaN` and how do you correctly check for it?**
"Not a Number" — the result of invalid numeric operations. `NaN === NaN` is `false` (the only value not equal to itself), so use `Number.isNaN(x)` to check correctly.

**43. What is the difference between `slice` and `splice` on arrays?**
`slice` returns a new array without modifying the original; `splice` mutates the original array in place (removing/inserting elements) and returns the removed elements.

**44. What's the difference between synchronous and asynchronous iteration?**
Sync iterators (`Symbol.iterator`, `for...of`) return values immediately; async iterators (`Symbol.asyncIterator`, `for await...of`) return Promises of values, for streams of async data.

**45. What is `Array.prototype.at()` and why was it added?**
Allows negative indexing (`arr.at(-1)` for last element) — cleaner than `arr[arr.length - 1]`, added in ES2022.

**46. What is a stale closure bug (common in React)?**
When a closure (e.g., inside `useEffect`/`setTimeout`) captures an OLD value of a variable/state from a previous render/call and keeps using that outdated value instead of the current one.

**47. What is `process.nextTick` and how does it differ from `setImmediate` in Node?**
`process.nextTick` queues a callback to run at the very end of the CURRENT operation, before the event loop continues — even before Promise microtasks. `setImmediate` queues a callback for the "check" phase of the NEXT event loop iteration — a full loop tick later.

**48. What is the difference between shallow equality and deep equality?**
Shallow equality (`===` on objects) checks reference identity; deep equality checks whether all nested values are equivalent, regardless of reference (needed by libraries like Lodash's `isEqual`).

**49. What do `Object.groupBy()` and `Map.groupBy()` do (ES2024)?**
Both group elements of an iterable into buckets using a callback that returns a group key per element. `Object.groupBy` returns a plain object (best for string keys); `Map.groupBy` returns a real `Map` (safe for any key type, including objects/numbers). Both replace the classic `.reduce()`-into-an-object grouping pattern. See file 15.

**50. What problem does `Promise.withResolvers()` solve (ES2024)?**
It replaces the old "declare `let resolve, reject` above `new Promise(...)` and capture them inside the executor" boilerplate — it directly returns `{ promise, resolve, reject }` so you can resolve/reject a Promise from outside its constructor without the manual capture dance. See file 15.

**51. What are the new `Set` composition methods added in ES2025?**
`union()`, `intersection()`, `difference()`, `symmetricDifference()` (all return a new Set), plus `isSubsetOf()`, `isSupersetOf()`, `isDisjointFrom()` (return booleans) — built-in set-algebra operations that replace manually spreading Sets into arrays and using `.filter()`/`.every()`. See file 15.

**52. What are Iterator helper methods (ES2025), and why do they matter for generators?**
Methods like `.map()`, `.filter()`, `.take()`, `.drop()`, `.reduce()`, `.toArray()` now exist directly on iterators/generators, evaluated lazily. This means you can chain array-style operations on an infinite generator (e.g., `.filter().take(5).toArray()`) without ever materializing the whole sequence into an array first — something that was previously impossible for infinite sequences. See files 08 and 15.

**53. What is `WeakRef` and when would you actually use it?**
A `WeakRef` holds a reference to an object without keeping it alive for garbage collection purposes — `.deref()` returns the object if it's still reachable elsewhere, or `undefined` if it's been collected. Real use case: memory-pressure-friendly caches (e.g., an image cache that's allowed to lose entries under memory pressure and re-fetch later), not everyday application code.

**54. What is `FinalizationRegistry`, and what's the big caveat with it?**
It lets you register a callback that runs sometime after an object is garbage collected — useful for safety-net cleanup (e.g., auto-unsubscribing a forgotten subscription). The big caveat: GC timing is never guaranteed (and the callback may never run at all, e.g., on process exit), so it must never be relied on for anything time-sensitive or correctness-critical like closing a DB connection.

**55. What are `using` and `await using` declarations, and what do they solve?**
New declaration forms (Stage 4, landing in engines — not yet in Node 22 unflagged) that guarantee a resource's cleanup method (`[Symbol.dispose]` / `[Symbol.asyncDispose]`) runs automatically when the enclosing block exits, even via an exception — replacing manual `try/finally { thing.close() }` boilerplate, especially when nesting multiple resources.

**56. Why is the `Temporal` API being introduced when `Date` already exists?**
Because `Date` has permanent design flaws it can never fix without breaking the web: it's mutable (`.setHours()` mutates in place), has no real timezone modeling, and has a confusing API (0-indexed months). `Date` itself can't change for backwards compatibility, so `Temporal` is a brand-new, immutable, timezone-aware API meant to eventually replace it — the same gap libraries like Luxon/date-fns currently fill.

---

## Part 2: Predict-the-Output Challenges

### 1. Closures in a loop (var vs let)
```js
for (var i = 0; i < 3; i++) {
  setTimeout(() => console.log(i), 0);
}
```
**Output:** `3 3 3`
**Why:** `var` is function-scoped — there's only ONE `i`, shared by all three callbacks. By the time any callback runs (after the synchronous loop finishes), `i` is already `3`.

```js
for (let i = 0; i < 3; i++) {
  setTimeout(() => console.log(i), 0);
}
```
**Output:** `0 1 2`
**Why:** `let` creates a fresh binding of `i` for EACH iteration, so each callback closes over its own independent copy.

### 2. Event loop ordering
```js
console.log("A");
setTimeout(() => console.log("B"), 0);
Promise.resolve().then(() => console.log("C"));
console.log("D");
```
**Output:** `A D C B`
**Why:** Sync code (`A`, `D`) runs first. Then the microtask queue (Promise → `C`) is fully drained before the event loop touches the macrotask queue (setTimeout → `B`).

### 3. `this` binding trap
```js
const obj = {
  name: "Sri",
  greet() {
    setTimeout(function () { console.log(this.name); }, 0);
  }
};
obj.greet();
```
**Output:** `undefined` (or throws in strict mode if `this` is undefined and you access `.name` on it — but typically logs `undefined` since `this` defaults to the global object in sloppy mode, which has no `name`)
**Why:** The regular `function` passed to `setTimeout` is called with DEFAULT binding (plain function call), NOT as `obj`'s method — so `this` is not `obj`.

**Fix with an arrow function:**
```js
const obj2 = {
  name: "Sri",
  greet() {
    setTimeout(() => console.log(this.name), 0); // arrow inherits `this` from greet(), which is `obj2`
  }
};
obj2.greet(); // "Sri"
```

### 4. `==` vs `===` edge cases
```js
console.log(0 == "0");      // true  — "0" is coerced to number 0
console.log(0 == "");       // true  — "" is coerced to number 0
console.log(0 == false);    // true  — false is coerced to number 0
console.log("" == false);   // true  — both coerced to 0
console.log(null == undefined); // true — special case, they equal each other but NOTHING else
console.log(null === undefined); // false — different types
console.log(NaN == NaN);    // false — NaN never equals anything, including itself
```

### 5. Hoisting trap
```js
console.log(x);
var x = 5;

console.log(y); // ReferenceError: Cannot access 'y' before initialization
let y = 10;
```
**Why:** `x` logs `undefined` because `var` is hoisted with a default value. `y` throws because `let` is hoisted into the TDZ — it exists but can't be touched until its declaration line runs.

### 6. Closures capturing a shared reference
```js
function createFunctions() {
  const funcs = [];
  for (var i = 0; i < 3; i++) {
    funcs.push(function () { return i; });
  }
  return funcs;
}
const [f0, f1, f2] = createFunctions();
console.log(f0(), f1(), f2()); // 3 3 3 — same var-in-loop issue, just returned instead of logged directly
```

### 7. Promise microtask ordering with async/await
```js
async function foo() {
  console.log("1");
  await null;
  console.log("2");
}
console.log("start");
foo();
console.log("end");
```
**Output:** `start` → `1` → `end` → `2`
**Why:** `foo()` runs synchronously up to the `await` (`"1"` logs immediately). `await null` schedules the rest of the function as a microtask and returns control to the caller — so `"end"` (still synchronous, in the outer scope) logs before the microtask (`"2"`) gets a chance to run.

### 8. Object reference vs primitive trap
```js
function modify(obj, num) {
  obj.value = 100;
  num = 100;
}
const myObj = { value: 1 };
let myNum = 1;
modify(myObj, myNum);
console.log(myObj.value); // 100 — objects are passed by reference (the reference itself is copied, but points to the same object)
console.log(myNum);       // 1   — primitives are passed by value (a fresh copy, unrelated to the outer variable)
```

### 9. Coercion/equality trick questions (see file 16 for the full algorithm)
```js
console.log([] == []);          // false — two DIFFERENT array objects, not primitives, no coercion makes objects equal to each other
console.log([] == false);       // true  — [] → ToPrimitive → "" → ToNumber → 0; false → 0; 0 == 0
console.log("0" == false);      // true  — "0" → 0 (ToNumber), false → 0
console.log("0" == []);         // false — [] → ToPrimitive → "", then "0" == "" is a string-to-string compare (no further coercion) → false
console.log(null == 0);         // false — null only loosely equals undefined, nothing else
console.log(NaN === NaN);       // false — the one value never equal to itself
console.log(Number.isNaN("x")); // false — "x" is not the NaN value, isNaN checks the actual value
console.log(isNaN("x"));        // true  — global isNaN COERCES its argument to a number first ("x" → NaN), a classic footgun isNaN vs Number.isNaN
```
**Why `"0" == []` is false but `[] == false` is true:** once `[]` reduces to `""` via `ToPrimitive`, comparing `"0" == ""` is STRING vs STRING — same type, so it's a direct value comparison (no further coercion), and `"0" !== ""`. But `[] == false` compares `""` (already reduced) against a BOOLEAN, which forces ANOTHER coercion round (both become `0`).

### 10. Regex predict-the-output
```js
const re = /\d+/g;
console.log(re.test("a1b2")); // true  — finds "1", lastIndex now 2
console.log(re.test("a1b2")); // true  — resumes from lastIndex 2, finds "2"
console.log(re.test("a1b2")); // false — resumes from lastIndex 4 (end of string), nothing left to find, lastIndex resets to 0
console.log(re.test("a1b2")); // true  — starts over from 0, finds "1" again — the classic /g + test() infinite-toggle footgun

console.log("2024-01-15".match(/\d+/g));       // ["2024", "01", "15"] — g flag, no capture-group info
console.log("2024-01-15".match(/(\d+)-(\d+)/)); // ["2024-01", "2024", "01", index: 0, ...] — no g flag, first match + its groups

console.log("foo bar".replace(/o/g, "0"));  // "f00 bar" — replaces ALL matches (g flag)
console.log("foo bar".replace(/o/, "0"));   // "f0o bar" — replaces only the FIRST match (no g flag)
```

---

## Part 3: Additional Rapid-Fire Q&A (Gap-Fill Topics — see file 16)

**57. What's the actual algorithm behind `==`?**
The Abstract Equality Comparison Algorithm: if both operands are the same type, it behaves like `===`. Otherwise it converts one/both sides (via `ToNumber`/`ToPrimitive`) until they're comparable — e.g., booleans become `0`/`1`, objects convert via `valueOf`/`toString`. `null`/`undefined` are a hard-coded special case: equal to each other, equal to nothing else.

**58. Why is `[] == false` `true`?**
`[]` isn't a primitive, so it goes through `ToPrimitive` first → an empty array's default string conversion is `""`. Then `"" == false` triggers boolean coercion → `false` becomes `0`, and `""` becomes `0` too → `0 == 0` → `true`.

**59. What does `JSON.stringify` do with `undefined`, functions, and circular references?**
Inside a plain object, keys whose value is `undefined`/a function/a Symbol are silently OMITTED. Inside an ARRAY, those same values become `null` instead of being omitted. A circular reference throws `TypeError: Converting circular structure to JSON` — `stringify` has no cycle-detection built in.

**60. What's the difference between `String.prototype.match()` and `matchAll()`?**
`match()` without the `g` flag returns one match with capture groups; WITH `g` it returns all matches but loses group info. `matchAll()` requires the `g` flag and returns an iterator of every match, each one still carrying its own full capture-group data — it's the modern replacement for looping `exec()` manually.

**61. Why does a global (`/g`) regex misbehave when reused across multiple `.test()`/`.exec()` calls?**
A global regex object is stateful — it stores `lastIndex` and resumes searching from there on the next call. Reusing the same regex instance across unrelated strings/loops without resetting `lastIndex` can cause matches to be skipped or `test()` to alternate `true`/`false` unexpectedly.

**62. Is `Symbol("id") === Symbol("id")` true or false, and why?**
`false`. Every call to `Symbol()` creates a brand-new, unique value regardless of the description string — the description is purely for debugging/logging, not an identity key. Use `Symbol.for("id")` instead if you want the SAME symbol returned for the same key (it uses a global registry).

**63. What problem does `Proxy` solve that `Object.defineProperty` getters/setters can't?**
`defineProperty` only intercepts a property name you explicitly configure ahead of time. `Proxy` intercepts operations generically — including properties that don't exist yet, `delete`, the `in` operator, and enumeration — which is why Vue 3 moved from `defineProperty`-per-key reactivity (Vue 2) to wrapping state in a `Proxy` (can detect new properties and array mutations that Vue 2 couldn't).

**64. What does `Reflect.get(obj, key)` do differently from just `obj[key]`?**
Functionally the same result for a plain object — but `Reflect` methods exist so that code INSIDE a `Proxy` trap has a guaranteed, non-recursive way to invoke the "default" behavior for an operation (get/set/delete/has/etc.), since those operations were previously only expressible as operators/syntax, not callable functions.

**65. What's the difference between a tagged template literal and a normal one?**
A normal template literal immediately produces a string. A tagged one (`` fn`...` ``) calls `fn` with the literal's string parts and interpolated values kept SEPARATE, letting the function control/transform the final output — e.g., auto-escaping each interpolated value (`styled-components`, safe HTML/SQL builders) before anything is concatenated.

**66. How is `for await...of` different from a regular `for...of` on a generator?**
`for...of` expects `.next()` to return `{ value, done }` synchronously. `for await...of` expects (and automatically awaits) `.next()` returning a PROMISE of `{ value, done }` — needed for async generators/`Symbol.asyncIterator`, where each value arrives over time (streams, paginated API calls) rather than being instantly available.

**67. Name two things that change under `'use strict'` that don't throw an error in sloppy mode.**
(1) Assigning to an undeclared variable creates a silent global in sloppy mode vs. throwing `ReferenceError` in strict mode. (2) Assigning to a non-writable/frozen property fails silently in sloppy mode vs. throwing `TypeError` in strict mode.

**68. Are you writing strict-mode code even without adding `'use strict'`?**
Very likely yes — the body of every ES module and every `class` is automatically strict mode by spec, with no directive needed, and virtually all modern bundler output (Babel/webpack/Vite) is ESM-based or explicitly emits the directive.

**69. Why do React and Redux care so much about immutability?**
Because their change-detection is a cheap `===` reference check, not a deep comparison — `prevState !== newState` only reliably means "something changed" if state is NEVER mutated in place. Mutating nested state directly can make React/Redux miss a re-render entirely (the reference didn't change) even though the data did.

**70. What's the concurrency model difference a Web Worker introduces?**
Everything else in JS runs on ONE thread with ONE call stack (event loop model). A Worker is a genuine separate thread with its own memory/global scope — the two can only communicate via `postMessage`/`onmessage`, which COPIES data across (structured clone), not shared references — so there's no shared mutable state and therefore no race conditions to guard against.

**71. Why does spreading (`{...obj}`) a nested object not protect the original from mutation?**
Spread only copies TOP-LEVEL properties. Any property whose value is itself an object/array is copied AS A REFERENCE — the "copy" and the original still point to the exact same nested object, so mutating the nested part through either one affects both.

**72. Why would you use a `Map` instead of a plain object?**
When keys aren't strings (objects, numbers without stringification), when you need guaranteed insertion order plus an O(1) `.size`, or when you're worried about prototype pollution (a plain object always has inherited keys like `toString`; a `Map` doesn't). See file 07 for the full comparison table.

**73. Why is checking membership with `Set.has()` better than `Array.includes()` for large collections?**
`Set.has()` is an O(1) hash lookup. `Array.includes()` is O(n) — it walks the array checking each element. For a one-off check on a small array the difference is invisible, but inside a loop (checking membership N times against a collection of size M) it's the difference between O(N) and O(N×M).

**74. What's the key difference between `Map`/`Set` and `WeakMap`/`WeakSet`?**
`Map`/`Set` hold STRONG references — an object stored in one will never be garbage collected as long as the Map/Set itself is alive, even if nothing else in the program references it (a common accidental memory leak). `WeakMap`/`WeakSet` hold WEAK references — they don't stop garbage collection, so they're the right tool for attaching metadata/cache entries to an object's lifetime. The trade-off: `WeakMap`/`WeakSet` are not iterable and have no `.size`.

**75. Why can't a `WeakMap` key be a primitive like a string or number?**
Weak references only make sense for garbage-collectable objects — primitives aren't heap-allocated, garbage-collected values with an independent identity/lifetime (two `"abc"` strings are indistinguishable), so "weakly reference this primitive" is a meaningless concept. This restriction is also why `WeakMap`/`WeakSet` can't be iterated: the engine deliberately doesn't expose object identity/lifetime timing to your code.

---

## Part 4: Array / String / Object Methods Q&A (see files 17, 18, 19 for full depth)

**76. What's wrong with `[10, 1, 2].sort()`?**
`sort()` with no comparator converts elements to strings and sorts lexicographically — `"10"` comes before `"2"` as strings, giving `[1, 10, 2]` instead of the numerically-sorted `[1, 2, 10]`. Always pass a comparator for numbers: `.sort((a, b) => a - b)`.

**77. Which array methods mutate the original array, and which don't?**
Mutating: `push`, `pop`, `shift`, `unshift`, `splice`, `sort`, `reverse`, `fill`, `copyWithin`, and setting `.length` directly. Non-mutating: `map`, `filter`, `slice`, `concat`, `flat`, `flatMap`, `find`/`findIndex`, `reduce`, `forEach`, and the newer `toSorted`/`toReversed`/`toSpliced`/`with()` (ES2023, file 07), which exist specifically as non-mutating siblings of `sort`/`reverse`/`splice`/index-assignment.

**78. Why can't you `break` out of a `.forEach()` loop?**
`forEach` calls your callback as a regular function once per element — `return` inside it only exits that single callback invocation, not the loop, and there's no `break` keyword available because `forEach` isn't loop syntax at all, it's a method call. Use a `for`/`for...of` loop (or `.some()`/`.every()` as an early-exit hack) if you need to stop iterating.

**79. What does `reduce()` do if you don't pass an initial value?**
With no initial value, the FIRST array element becomes the starting accumulator and the callback runs starting from the second element. On an empty array with no initial value, this throws `TypeError: Reduce of empty array with no initial value` — always pass an initial value to avoid that crash.

**80. What's the difference between `slice()` and `substring()` on a string?**
`slice()` treats negative indices as "count from the end" and returns `""` if `start > end`. `substring()` clamps negative indices to `0` and SWAPS the two arguments if `start > end` instead of returning an empty string. `substr()` (legacy, deprecated) takes a length as its second argument instead of an end index — avoid it.

**81. What's the classic trap with `String.prototype.replace()`?**
`.replace(searchString, replacement)` with a plain STRING pattern only replaces the FIRST occurrence, not all of them. `.replaceAll()` (ES2021) fixes this without needing a regex just to add the `/g` flag. A regex pattern WITH the `/g` flag also replaces all occurrences via `.replace()`.

**82. Are string methods mutating?**
No — strings are immutable in JS. Every string method (`toUpperCase`, `trim`, `replace`, `slice`, etc.) always returns a brand-new string; there is no such thing as a mutating string method, and you can't change a string via index assignment either.

**83. What's the difference between `Object.freeze()`, `Object.seal()`, and `Object.preventExtensions()`?**
`freeze` blocks adding, removing, AND modifying properties. `seal` blocks adding and removing, but still allows modifying existing properties. `preventExtensions` only blocks adding new properties — existing ones can still be modified or deleted.

**84. Is `Object.freeze()` deep or shallow?**
Shallow — it only locks the object's own top-level properties. Any nested object/array inside is completely unaffected and remains fully mutable, unless you recursively freeze it yourself (a "deep freeze").

**85. What's the difference between `Object.is()` and `===`?**
They behave identically except for two edge cases: `Object.is(NaN, NaN)` is `true` (unlike `NaN === NaN`, which is `false`), and `Object.is(0, -0)` is `false` (unlike `0 === -0`, which is `true`). `Object.is` implements the spec's "SameValue" algorithm rather than the Strict Equality Comparison algorithm.

**86. Does `Object.assign()` mutate its arguments?**
It mutates and returns its FIRST argument (the target) — all subsequent source objects are read-only and untouched. The common safe pattern is `Object.assign({}, source1, source2)`, passing an empty object as the target so nothing existing gets mutated. Spread (`{...obj}`) avoids this gotcha entirely since it never mutates any of its operands.

**87. Are `Object.assign()` and spread (`{...obj}`) deep or shallow copies?**
Both are shallow — only top-level properties are copied by value; any nested object/array is copied by REFERENCE, so mutating a nested field through the "copy" also mutates the original. See files 11/16 for the deep-clone discussion (`structuredClone()`, recursive clone).

**88. What's the difference between `Object.keys()` and `Object.getOwnPropertyNames()`?**
`Object.keys()` returns only ENUMERABLE own string-keyed properties. `Object.getOwnPropertyNames()` returns ALL own string-keyed properties, enumerable or not (e.g., ones defined via `Object.defineProperty` with `enumerable: false`). Neither includes Symbol-keyed properties — use `Object.getOwnPropertySymbols()` for those.

**89. How would you deep-flatten a nested array without using `.flat(Infinity)`?**
Recursively `.reduce()` over the array, concatenating each element directly if it's not an array, or recursively flattening it first if it is: `arr.reduce((flat, item) => flat.concat(Array.isArray(item) ? flatten(item) : item), [])`. See file 17 for the full worked example.

**90. How do you dedupe an array of primitives vs an array of objects?**
Primitives: `[...new Set(arr)]` works directly, since `Set` uses `===`-style equality. Objects: `Set` alone won't dedupe by CONTENT (two different object references are never "equal" to a `Set`, even with identical fields) — you need to dedupe by some key, e.g., `.filter()` combined with a tracking `Set` of already-seen key values (see file 17's `dedupeBy` example).

**91. How do you group an array of objects by a property?**
Manually: `.reduce()` into an object, pushing each item into a bucket array keyed by the group value (`(acc[item.key] ??= []).push(item)`). Or, on modern engines, use the built-in `Object.groupBy()` (ES2024, file 15), which does exactly this in one line.

**92. Why is writing your own `deepEqual()` function genuinely hard?**
A naive recursive key-by-key comparison works for simple plain objects/arrays, but a fully correct version also has to handle circular references (which would infinite-loop naively), `Date`/`RegExp`/`Map`/`Set` comparisons, `NaN` equality semantics, Symbol-keyed properties, and getters with side effects. That large surface area is exactly why most codebases reach for a battle-tested library (like Lodash's `_.isEqual`) instead of hand-rolling it.

**93. What problem does `Error.cause` (ES2022) solve?**
Before it existed, wrapping a low-level error in a more meaningful high-level error meant choosing between throwing the new error (losing the original details) or the original (losing context about what higher-level operation failed). `new Error(message, { cause: originalError })` lets you keep both — the wrapper error's `.cause` property holds the original error intact, so logging tools can walk the full chain instead of seeing only the outermost, most-generic message. See file 12.

## Part 4: Tricky Senior-Level Traps (Predict, Misconceptions, Edge Cases)

**94. What does this log, and why?**
```js
console.log(foo);
var foo = 1;
function foo() {}
console.log(foo);
```
Output: `[Function: foo]` then `1`. Function declarations are hoisted BEFORE `var` declarations, and hoisted with their full body already attached (not just `undefined`) — so at the very first `console.log`, `foo` is already the function. `var foo = 1` doesn't hoist a second binding (same name, already exists); it just hoists the declaration (a no-op here) while leaving the ASSIGNMENT `foo = 1` in place at its original line. So when that assignment line actually executes, it overwrites the function with `1`, which is what the second log sees.

**95. What does `[1, 2, 3].map(parseInt)` return?**
`[1, NaN, NaN]`, not `[1, 2, 3]`. `Array.prototype.map` calls its callback with THREE arguments — `(element, index, array)` — and `parseInt` also accepts a second argument: a radix. So `map` accidentally passes the index as the radix: `parseInt(1, 0)` (radix `0` means "infer," giving `1`), `parseInt(2, 1)` (radix `1` is invalid, giving `NaN`), `parseInt(3, 2)` (binary radix, and `"3"` isn't a valid binary digit, giving `NaN`). This is one of the most common real-world bugs from assuming a callback only receives the arguments you intend to use — the fix is `arr.map(Number)` or `arr.map(n => parseInt(n, 10))`.

**96. What does a `return` inside `finally` do to a `return` (or even a `throw`) inside the matching `try`?**
It silently WINS and overrides it — `finally` always runs, and if it contains its own `return`, that value replaces whatever the `try` (or `catch`) was about to return, even if the `try` block had already thrown an uncaught exception. `function f(){ try { throw new Error('boom'); } finally { return 'rescued'; } }` returns `'rescued'` — the exception is swallowed entirely, never propagating to the caller. Most developers assume `finally` is purely for cleanup and can't affect control flow, but a `return`/`throw` inside it always has the final say.

**97. Is `typeof x` always a safe way to check if `x` exists without throwing?**
No — that's a common misconception. `typeof someUndeclaredGlobal` is indeed safe and returns `"undefined"`. But if `x` is a `let`/`const` declared LATER in the same block, `typeof x` before that line throws `ReferenceError: Cannot access 'x' before initialization`, because `x` is real (in the TDZ), not simply nonexistent — `typeof` only gets its "safe on undeclared identifiers" superpower for names that were never declared anywhere in scope at all.

**98. What's the difference between `Array(3)`, `Array.of(3)`, and `Array(1, 2, 3)`?**
`Array(3)` with a SINGLE numeric argument creates a sparse array of length `3` with no actual elements (`[ <3 empty items> ]`) — a classic footgun since `Array(3).map(x => 1)` still logs `[ <3 empty items> ]` (map skips holes, it doesn't fill them). `Array.of(3)` always treats its arguments as elements, giving `[3]` — added specifically to sidestep the single-numeric-argument special case. `Array(1, 2, 3)` (multiple arguments) also just creates elements, `[1, 2, 3]` — the special "length only" behavior only triggers with exactly one numeric argument.

**99. If you `delete arr[1]` on an array, what happens to `arr.length`?**
Nothing — `delete` removes the element at that index (leaving a genuine hole, and `1 in arr` becomes `false`), but it never touches `.length`. `[1,2,3]` after `delete arr[1]` becomes `[1, <1 empty item>, 3]` with `length` still `3`. Most people expect `delete` to shift things down like `splice` does; instead it just punches a hole in place, which is almost never what you actually want (use `splice` to remove-and-reindex).

**100. Do array holes behave the same across `forEach`, `map`, spread, and `for...of`?**
No, and this trips up a lot of people. Given `const arr = [1, , 3]` (a hole at index 1): `forEach` and `map` SKIP the hole entirely — `forEach` only logs `1` and `3` (never visits index 1 at all), and `map` preserves the hole in its output rather than filling it with anything. But the iterator protocol has no concept of "holes" — spreading (`[...arr]`) or a `for...of` loop both produce an actual `undefined` at that position, materializing the hole into a real value. So the exact same array can look different depending on which mechanism you use to walk it.

**101. Can you store `NaN` in a `Set` or use it as a `Map` key, given that `NaN !== NaN`?**
Yes, and it dedupes/matches correctly — `new Set([NaN, NaN]).size` is `1`, and `set.has(NaN)` is `true`. This surprises people who reason "`NaN` never equals itself, so a `Set` can never find it again." `Set`/`Map` don't use `===`; they use the SameValueZero algorithm, which specifically special-cases `NaN` as equal to itself (it only differs from `Object.is`/SameValue in treating `+0`/`-0` as equal too). So `NaN` is the one value where `Set`/`Map` behavior and `===` genuinely disagree.

**102. Does `0.1 + 0.2 === 0.3`?**
No — it's `false`, because `0.1 + 0.2` actually evaluates to `0.30000000000000004`. JS numbers are IEEE-754 double-precision floats, and most decimal fractions (like `0.1` and `0.2`) can't be represented exactly in binary, so tiny rounding error creeps in on every arithmetic operation. This is a language-level footgun, not a bug — the standard workarounds are comparing with a small epsilon tolerance (`Math.abs(a - b) < Number.EPSILON`) or working in integer cents/subunits instead of floating decimals for money.

**103. If `obj` is `null`, does `obj?.foo(sideEffect())` still call `sideEffect()`?**
No — and this is a common misconception. Optional chaining short-circuits the ENTIRE rest of the expression the moment it hits a nullish value, meaning the arguments to `foo(...)` are never even evaluated, not just that `foo` itself isn't called. Most developers assume arguments are always evaluated eagerly before a call happens (which is normally true), but `?.` is special-cased at the language level to skip evaluating everything downstream of the short-circuit point, similar to how `&&`/`||` skip their right-hand side.

**104. What does this return, and why?**
```js
function foo() {
  return
  {
    bar: 1
  };
}
console.log(foo());
```
It logs `undefined`, not `{ bar: 1 }`. Automatic Semicolon Insertion (ASI) inserts an invisible semicolon immediately after `return` because `return` and the `{` on the next line are on separate lines — the parser treats it as `return;` followed by an unreachable, orphaned block statement. This is exactly why style guides insist the opening brace of a returned object literal must stay on the SAME line as `return`.

**105. If you extract a class method off an instance and call it standalone, what happens to `this`?**
It's not the global object (as sloppy-mode "default binding" intuition would suggest) — it's `undefined`, and accessing any property on it throws `TypeError: Cannot read properties of undefined`. `class Counter { count = 0; increment() { this.count++; } }`, then `const fn = new Counter().increment; fn();` throws. This is because ALL code inside a class body runs in strict mode implicitly (even without `'use strict'`), and in strict mode, a plain function call never falls back to the global object for `this` — it stays exactly `undefined`. This is why callbacks/handlers extracted from class instances (`onClick={this.handleClick}` in old-style React classes) needed explicit `.bind(this)` or an arrow-function class field.

**106. Can a `Symbol` be implicitly converted to a string?**
No — unlike every other primitive type, attempting to implicitly coerce a `Symbol` to a string throws `TypeError: Cannot convert a Symbol value to a string`. This means `` `${sym}` `` (template literal interpolation) and `sym + ''` both throw. The ONLY way to get a `Symbol`'s string form is an EXPLICIT conversion: `String(sym)` or `sym.toString()`, both of which work fine and return something like `"Symbol(id)"`. This asymmetry is deliberate — it prevents symbols from being silently and lossily stringified by accident.

**107. What is `Symbol.toPrimitive`, and how does it change coercion?**
It lets an object define exactly how it converts to a primitive, receiving a `hint` argument (`"number"`, `"string"`, or `"default"`) so it can return a DIFFERENT value depending on the coercion context — something `valueOf`/`toString` alone can't do. `` const obj = { [Symbol.toPrimitive](hint) { return hint === "number" ? 42 : hint === "string" ? "str" : "default"; } } ``: `+obj` (unary plus forces a number hint) gives `42`, `` `${obj}` `` (template literals force a string hint) gives `"str"`, and `obj + ""` (the `+` operator uses the ambiguous "default" hint) gives `"default"`. Most developers only know `toString`/`valueOf` and are surprised coercion can branch on context at all.

**108. What do labeled loops let you do that `break`/`continue` alone can't?**
Target an OUTER loop directly from inside a nested loop — most developers don't know `break`/`continue` can take a label at all, and assume they only ever affect the innermost loop. `outer: for (let i = 0; i < 3; i++) { for (let j = 0; j < 3; j++) { if (j === 1) continue outer; console.log(i, j); } }` logs `0 0`, `1 0`, `2 0` — `continue outer` skips the rest of the INNER loop AND the rest of the current OUTER iteration, jumping straight to the outer loop's next increment, rather than just restarting the inner loop's next `j`.

**109. What happens if you call `.next()` on a generator after it's already finished, or call `.return()` mid-iteration?**
Calling `.return(value)` immediately finishes the generator (as if a `return` statement executed at the current `yield`), which means any `finally` block wrapping that `yield` still runs — generators guarantee cleanup semantics even when force-stopped from the outside. After a generator is done (whether it ran to completion or was `.return()`-ed), every subsequent `.next()` call just keeps returning `{ value: undefined, done: true }` forever — it never throws, never resets, and never resumes; a finished generator is permanently finished.

**110. What happens if you manually assign a new value to `array.length`?**
It actually mutates the array in place — most developers treat `.length` as a purely read-only, derived value, but it's a real, writable, and highly unusual own property. Setting it SMALLER truncates the array, permanently discarding every element at or beyond the new length (`[1,2,3,4,5]` with `.length = 2` becomes `[1, 2]`, unrecoverably). Setting it LARGER extends the array with trailing sparse holes rather than `undefined` values (`.length = 4` on a 2-element array gives `[1, 2, <2 empty items>]`).

**111. Can you use `new` on an arrow function?**
No — `new (() => {})()` throws `TypeError: ... is not a constructor`. Regular functions get an implicit, writable `.prototype` object created for them (used as the new instance's prototype when called with `new`), but arrow functions never get a `.prototype` property at all (`arrowFn.prototype` is `undefined`) and are explicitly excluded from being constructible by the spec, precisely because their whole design purpose is to inherit `this` lexically rather than receive a freshly bound `this` the way `new` would need to give them.

**112. Is `new Boolean(false)` truthy or falsy in an `if` check?**
Truthy — which surprises almost everyone. `new Boolean(false)` creates a boxed Boolean OBJECT wrapping the primitive `false`, and in JS, every object is truthy regardless of what primitive value it wraps internally — only the seven actual falsy primitives (`false`, `0`, `-0`, `""`, `null`, `undefined`, `NaN`) are falsy. So `if (new Boolean(false)) { ... }` runs the `if` branch, even though `new Boolean(false) == false` is separately `true` (loose equality unwraps the object via `valueOf` before comparing). This is exactly why constructing primitive wrapper objects with `new` is considered a footgun and essentially never done in real code.

**113. What does this log, and why?**
```js
function bar(a = b, b = 2) {
  console.log(a);
}
bar();
```
It throws `ReferenceError: Cannot access 'b' before initialization`, not `2` or `undefined`. Default parameter values are evaluated left to right, and each parameter gets its own mini-scope (distinct from the function body's scope) chained to the previous ones — so `b` DOES exist as a binding by the time `a`'s default runs, but it's still sitting in the TDZ (its own initializer, `= 2`, hasn't executed yet). This is the same TDZ rule that governs `let`/`const`, just applied to a place — inside a parameter list, evaluated during the call itself — that most developers never think to check.
