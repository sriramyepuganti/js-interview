# 17 — Array Methods Reference (Practical Guide)

## Why does this file exist?

**The problem it solves:** Files 01-16 mention array methods here and there (closures examples use `.reduce()`, design patterns use `.map()`, polyfills reimplement a few), but there's no single place that lays out the *whole* toolbox — every common `Array.prototype` method, when to reach for it, whether it mutates the original array, and worked examples. Almost every JS interview includes at least one "which array method would you use for X" or "write a function using array methods" question. This file is that one-stop reference.

**Already covered elsewhere — not re-explained here, just listed for completeness:**
- `Array.prototype.at()`, `flat()`, `flatMap()` — file 07
- `toSorted()` / `toReversed()` / `toSpliced()` / `with()` (the non-mutating ES2023 siblings of sort/reverse/splice) — file 07
- `findLast()` / `findLastIndex()` — file 07
- `Object.groupBy()` (the modern built-in alternative to manually grouping with `.reduce()`) — file 15

This file is organized by **what problem each category solves**, not alphabetically — that's how you should think about choosing a method in an interview too.

---

## Creating Arrays

**What problem does this solve?** Sometimes you don't have an array literal to start from — you have a count, an array-like object (a `NodeList`, `arguments`), an iterable (a `Set`, a `Map`), or you need to check if something even IS an array before calling array methods on it.

### `Array.of(...items)`

```js
Array.of(7);        // [7]            — a single-element array containing 7
Array(7);            // [ <7 empty items> ] — the confusing legacy constructor: a SINGLE number arg means "array of that length"!
Array.of(1, 2, 3);   // [1, 2, 3]
```
**Why it exists:** `Array(7)` is ambiguous — one numeric argument means "make an empty array of length 7," but `Array(1, 2, 3)` means "make `[1,2,3]`." `Array.of()` always treats its arguments as elements, no special-casing.

### `Array.from(arrayLike, mapFn?)`

Converts an array-like or iterable object into a real array, with an optional mapping function applied to each element (like `.map()` built right in).

```js
Array.from("hello");                 // ["h","e","l","l","o"] — strings are iterable
Array.from(new Set([1, 2, 2, 3]));   // [1, 2, 3] — from a Set
Array.from(new Map([["a",1],["b",2]])); // [["a",1],["b",2]] — from a Map (array of entries)

// From a NodeList (browser DOM) — NodeList isn't a real array, so .map() isn't available on it directly
// const divs = Array.from(document.querySelectorAll("div"));

// The mapping-function second argument — avoids a separate .map() call:
Array.from({ length: 5 }, (_, i) => i * 2); // [0, 2, 4, 6, 8] — build a sequence from scratch
Array.from([1, 2, 3], (x) => x * x);        // [1, 4, 9]
```
**Real-world usage:** converting `document.querySelectorAll()` results to a real array so you can `.map()`/`.filter()` them; generating ranges (`Array.from({length: n}, (_, i) => i)`); converting `arguments` to a real array inside older function bodies.

### `Array.isArray(value)`

```js
Array.isArray([1, 2, 3]);  // true
Array.isArray("abc");      // false
Array.isArray({ length: 0 }); // false — array-LIKE isn't the same as an array
```
**Why it exists:** `typeof [] === "object"`, so `typeof` can't distinguish an array from a plain object. `Array.isArray()` is the reliable check (even across iframes/realms, unlike `instanceof Array`).

---

## Adding / Removing Elements (Mutating)

**What problem does this solve?** You need to grow or shrink an array in place — a queue, a stack, or inserting/removing items from the middle.

**All of these methods mutate the original array.**

### `push(...items)` — add to the end

```js
const arr = [1, 2];
arr.push(3, 4);      // returns new length: 4
console.log(arr);    // [1, 2, 3, 4]
```

### `pop()` — remove from the end

```js
const arr = [1, 2, 3];
const last = arr.pop(); // returns 3 (the removed element)
console.log(arr);       // [1, 2]
```

### `shift()` — remove from the start

```js
const arr = [1, 2, 3];
const first = arr.shift(); // returns 1
console.log(arr);          // [2, 3]
```

### `unshift(...items)` — add to the start

```js
const arr = [2, 3];
arr.unshift(0, 1);   // returns new length: 4
console.log(arr);    // [0, 1, 2, 3]
```
**Performance note:** `push`/`pop` operate at the end and are O(1). `shift`/`unshift` operate at the start and are O(n) — every remaining element has to be re-indexed. For a queue-heavy workload, this matters at scale.

### `splice(start, deleteCount, ...itemsToInsert)` — the Swiss-army-knife (insert AND/OR remove AND/OR replace)

```js
const arr = ["a", "b", "c", "d", "e"];

// 1. REMOVE only — delete 2 elements starting at index 1
const removed = arr.splice(1, 2);
console.log(arr);    // ["a", "d", "e"]
console.log(removed); // ["b", "c"] — splice returns the removed elements

// 2. INSERT only — delete 0 elements, insert new ones at index 1
const arr2 = ["a", "d", "e"];
arr2.splice(1, 0, "b", "c");
console.log(arr2);   // ["a", "b", "c", "d", "e"]

// 3. REPLACE — delete 1 element at index 2, insert a replacement
const arr3 = ["a", "b", "X", "d", "e"];
arr3.splice(2, 1, "c");
console.log(arr3);   // ["a", "b", "c", "d", "e"]
```
**Why it exists:** it's the only built-in way to insert/remove from the MIDDLE of an array without manually slicing and rebuilding.

### The `length =` truncation trick (mutating)

```js
const arr = [1, 2, 3, 4, 5];
arr.length = 2;
console.log(arr); // [1, 2] — instantly truncates, no method call needed
arr.length = 0;
console.log(arr); // [] — a common (if unusual-looking) way to "empty" an array in place
```
**Why this works:** `length` isn't just a read-only count — it's a writable property, and setting it shorter actually deletes the trailing elements.

---

## Non-Mutating Transforms

**What problem does this solve?** You want a NEW array derived from an existing one — transformed, filtered, sliced, or combined — without touching the original. This is essential for React/Redux-style immutable state updates.

### `map(callback)` — transform every element into something else, 1-to-1

```js
const nums = [1, 2, 3];
const doubled = nums.map((n) => n * 2);
console.log(doubled); // [2, 4, 6]
console.log(nums);    // [1, 2, 3] — untouched
```

### `filter(callback)` — keep only elements that pass a test

```js
const nums = [1, 2, 3, 4, 5, 6];
const evens = nums.filter((n) => n % 2 === 0);
console.log(evens); // [2, 4, 6]
```

### `flatMap(callback)` — map, then flatten one level (see file 07 for depth)

```js
[1, 2, 3].flatMap((n) => [n, n * 10]); // [1, 10, 2, 20, 3, 30]
```

### `flat(depth)` — flatten nested arrays (see file 07 for full depth discussion)

```js
[1, [2, [3]]].flat();  // [1, 2, [3]] — depth 1 by default
[1, [2, [3]]].flat(2); // [1, 2, 3]
[1, [2, [3]]].flat(Infinity); // flatten ALL levels, however deep
```

### `slice(start, end)` — extract a portion (non-mutating; supports negative indices)

```js
const arr = ["a", "b", "c", "d", "e"];
arr.slice(1, 3);   // ["b", "c"] — index 1 up to (not including) 3
arr.slice(-2);      // ["d", "e"] — last 2 elements
arr.slice();        // ["a","b","c","d","e"] — a common shallow-copy idiom (like [...arr])
console.log(arr);   // unchanged — slice never mutates
```

### `concat(...arraysOrValues)` — merge arrays into a new one

```js
const a = [1, 2];
const b = [3, 4];
const merged = a.concat(b, [5, 6], 7);
console.log(merged); // [1, 2, 3, 4, 5, 6, 7]
console.log(a);       // [1, 2] — untouched
// In modern code, spread is usually preferred: [...a, ...b]
```

### `join(separator)` — turn an array into a string

```js
["a", "b", "c"].join("-"); // "a-b-c"
["a", "b", "c"].join("");  // "abc"
[1, 2, 3].join();           // "1,2,3" — default separator is a comma
```

---

## Reordering / Filling (Mutating)

**What problem does this solve?** Sorting, reversing, or bulk-filling values IN PLACE.

### `sort(compareFn?)` — the classic interview trap

```js
// THE TRAP: sort() with no comparator converts elements to STRINGS and
// sorts lexicographically (dictionary order), NOT numerically!
const nums = [10, 1, 2];
console.log(nums.sort()); // [1, 10, 2] — "10" comes before "2" as STRINGS ("1" < "2")

// THE FIX: always pass a comparator for numbers
console.log([10, 1, 2].sort((a, b) => a - b)); // [1, 2, 10] — ascending
console.log([10, 1, 2].sort((a, b) => b - a)); // [10, 2, 1] — descending
```
**Comparator mental model:** return a negative number if `a` should come first, positive if `b` should come first, `0` if they're equal. `a - b` gives exactly that for numbers.

**Mutating!** `sort()` reorders the ORIGINAL array in place and also returns it (same reference).
```js
const original = [3, 1, 2];
const result = original.sort();
console.log(result === original); // true — same array, sorted in place
```
(For a non-mutating version, use `.toSorted()` — see file 07.)

### `reverse()` — reverse in place (mutating)

```js
const arr = [1, 2, 3];
arr.reverse();
console.log(arr); // [3, 2, 1] — the ORIGINAL array, reversed in place
```
(Non-mutating version: `.toReversed()` — file 07.)

### `fill(value, start?, end?)` — overwrite a range with a fixed value (mutating)

```js
const arr = [1, 2, 3, 4, 5];
arr.fill(0, 1, 3);
console.log(arr); // [1, 0, 0, 4, 5] — indices 1 and 2 replaced with 0

new Array(5).fill(null); // [null, null, null, null, null] — common way to init a fixed-size array
```

### `copyWithin(target, start?, end?)` — copy a slice of itself over another part of itself (mutating)

```js
const arr = [1, 2, 3, 4, 5];
arr.copyWithin(0, 3); // copy from index 3 to the end, paste starting at index 0
console.log(arr); // [4, 5, 3, 4, 5]
```
**Real-world usage:** rare in everyday app code, but shows up in typed-array/buffer manipulation and is a "do you know the obscure ones" interview check.

---

## Searching

**What problem does this solve?** Finding an element (or its index), or checking whether elements match a condition, without manually writing a loop.

### `find(callback)` — first matching ELEMENT (or `undefined`)

```js
const users = [{ id: 1, name: "A" }, { id: 2, name: "B" }];
users.find((u) => u.id === 2); // { id: 2, name: "B" }
users.find((u) => u.id === 99); // undefined
```

### `findIndex(callback)` — first matching INDEX (or `-1`)

```js
users.findIndex((u) => u.id === 2); // 1
users.findIndex((u) => u.id === 99); // -1
```

### `findLast(callback)` / `findLastIndex(callback)` — search from the end (ES2023, see file 07)

```js
[1, 2, 3, 4].findLast((n) => n % 2 === 0);      // 4
[1, 2, 3, 4].findLastIndex((n) => n % 2 === 0); // 3
```

### `includes(value)` — does the array contain this exact value?

```js
[1, 2, 3].includes(2);   // true
[1, 2, NaN].includes(NaN); // true — unlike indexOf, includes correctly detects NaN
```

### `indexOf(value)` / `lastIndexOf(value)` — find the position of a value (uses `===`, can't find `NaN`)

```js
["a", "b", "c", "b"].indexOf("b");     // 1 — first occurrence
["a", "b", "c", "b"].lastIndexOf("b"); // 3 — last occurrence
[NaN].indexOf(NaN); // -1 — indexOf uses strict equality, and NaN === NaN is false
```

### `some(callback)` — does AT LEAST ONE element pass?

```js
[1, 2, 3].some((n) => n > 2); // true
```

### `every(callback)` — do ALL elements pass?

```js
[1, 2, 3].every((n) => n > 0); // true
[1, 2, 3].every((n) => n > 1); // false
```

---

## Aggregating: `reduce` and `reduceRight`

**What problem does this solve?** Boiling an entire array down to a SINGLE value (a sum, an object, a max, a flattened structure) by processing one element at a time and carrying forward an "accumulator."

### The accumulator mental model

`array.reduce((accumulator, currentElement, index, array) => newAccumulator, initialValue)`

Think of the accumulator as a box you're carrying through the array. On each element, you take what's in the box, combine it with the current element, and put the RESULT back in the box for the next step. Whatever's in the box at the end is the return value.

**Example 1 — sum:**
```js
const total = [10, 20, 30].reduce((sum, n) => sum + n, 0);
console.log(total); // 60
// box starts at 0 -> 0+10=10 -> 10+20=30 -> 30+30=60
```

**Example 2 — group-by-manually (before `Object.groupBy` existed — see file 15 for the modern built-in):**
```js
const people = [
  { name: "Alice", dept: "Eng" },
  { name: "Bob", dept: "Sales" },
  { name: "Carol", dept: "Eng" },
];
const byDept = people.reduce((acc, person) => {
  (acc[person.dept] ??= []).push(person); // create the bucket array if it doesn't exist yet
  return acc;
}, {});
console.log(byDept);
// { Eng: [{name:"Alice",...}, {name:"Carol",...}], Sales: [{name:"Bob",...}] }
```

**Example 3 — build an object (lookup table) from an array:**
```js
const users = [{ id: 1, name: "A" }, { id: 2, name: "B" }];
const byId = users.reduce((acc, user) => {
  acc[user.id] = user;
  return acc;
}, {});
console.log(byId); // { 1: {id:1,name:"A"}, 2: {id:2,name:"B"} } — O(1) lookup by id afterward
```

**Missing initial value trap:**
```js
[5].reduce((a, b) => a + b);       // 5 — with 1 element and no initial value, that element IS the starting accumulator, callback never runs
[].reduce((a, b) => a + b);        // TypeError: Reduce of empty array with no initial value
[].reduce((a, b) => a + b, 0);      // 0 — always pass an initial value to avoid this crash
```

### `reduceRight` — same as `reduce`, but walks right-to-left

```js
const result = [1, 2, 3].reduceRight((acc, n) => acc + "" + n, "");
console.log(result); // "321" — processes 3 first, then 2, then 1
```
**Real-world usage:** rare, but shows up in right-to-left function composition (`compose` implementations, see file 10).

---

## Iteration Protocol Methods

**What problem does this solve?** Simply running code for each element (side effects), or getting an iterator over an array's indices/values/entries for use with `for...of`.

### `forEach(callback)` — run a function per element (no return value)

```js
[1, 2, 3].forEach((n, i) => console.log(`index ${i}: ${n}`));
// index 0: 1
// index 1: 2
// index 2: 3
```
**Why you CAN'T `break`/`return` out of it, unlike a `for` loop:** `forEach` calls your callback function once per element — `return` inside the callback only exits THAT single callback invocation (like a normal function return), it does NOT stop the loop. There's no `break` keyword available at all because `forEach` isn't loop syntax, it's a regular function call under the hood.
```js
[1, 2, 3, 4].forEach((n) => {
  if (n === 2) return; // only skips THIS iteration's remaining code — does NOT stop the loop
  console.log(n);
});
// 1
// 3
// 4
// (never stops at 2 — all elements are still visited)

// To actually break early, use a regular for/for...of loop, or .some()/.every() as a "break" hack:
for (const n of [1, 2, 3, 4]) {
  if (n === 2) break; // this DOES stop the loop
  console.log(n);
}
```

### `entries()`, `keys()`, `values()` — get iterators

```js
const arr = ["a", "b", "c"];

for (const [index, value] of arr.entries()) {
  console.log(index, value); // 0 'a', 1 'b', 2 'c'
}

for (const index of arr.keys()) {
  console.log(index); // 0, 1, 2
}

for (const value of arr.values()) {
  console.log(value); // 'a', 'b', 'c'
}
```
**Real-world usage:** `entries()` is handy when you need both index AND value in a `for...of` loop without manual indexing (`arr[i]`). Arrays are iterable by default via `values()` under the hood, which is why plain `for (const v of arr)` already works without calling `.values()` explicitly.

---

## Mutates the Original Array? — Quick Reference Table

| Method | Mutates original? |
|---|---|
| `push` | **Yes** |
| `pop` | **Yes** |
| `shift` | **Yes** |
| `unshift` | **Yes** |
| `splice` | **Yes** |
| `length = n` (truncation) | **Yes** |
| `sort` | **Yes** |
| `reverse` | **Yes** |
| `fill` | **Yes** |
| `copyWithin` | **Yes** |
| `map` | No |
| `filter` | No |
| `flat` | No |
| `flatMap` | No |
| `slice` | No |
| `concat` | No |
| `join` | No |
| `find` / `findIndex` | No |
| `findLast` / `findLastIndex` | No |
| `includes` / `indexOf` / `lastIndexOf` | No |
| `some` / `every` | No |
| `reduce` / `reduceRight` | No (unless your own callback mutates something) |
| `forEach` | No (unless your own callback mutates something) |
| `entries` / `keys` / `values` | No |
| `toSorted` / `toReversed` / `toSpliced` / `with` (file 07) | No — the whole point of these is being the non-mutating siblings of sort/reverse/splice/index-assignment |

---

## Classic Interview Tasks

### 1. Flatten a nested array

```js
function flatten(arr) {
  return arr.reduce((flat, item) => {
    return flat.concat(Array.isArray(item) ? flatten(item) : item);
  }, []);
}
console.log(flatten([1, [2, 3, [4, [5, 6]]], 7])); // [1, 2, 3, 4, 5, 6, 7]

// Or, since it's built in and handles any depth:
console.log([1, [2, 3, [4, [5, 6]]], 7].flat(Infinity)); // same result
```

### 2. Remove duplicates

```js
function dedupe(arr) {
  return [...new Set(arr)];
}
console.log(dedupe([1, 2, 2, 3, 3, 3, 4])); // [1, 2, 3, 4]

// For deduping objects by a property, Set alone isn't enough (objects compare by reference):
function dedupeBy(arr, key) {
  const seen = new Set();
  return arr.filter((item) => {
    if (seen.has(item[key])) return false;
    seen.add(item[key]);
    return true;
  });
}
console.log(dedupeBy(
  [{ id: 1 }, { id: 2 }, { id: 1 }],
  "id"
)); // [{id:1}, {id:2}]
```

### 3. Chunk an array into groups of N

```js
function chunk(arr, size) {
  const result = [];
  for (let i = 0; i < arr.length; i += size) {
    result.push(arr.slice(i, i + size));
  }
  return result;
}
console.log(chunk([1, 2, 3, 4, 5, 6, 7], 3)); // [[1,2,3],[4,5,6],[7]]
```

### 4. Group an array of objects by a property (manual `reduce` version)

```js
function groupBy(arr, key) {
  return arr.reduce((acc, item) => {
    const groupKey = item[key];
    (acc[groupKey] ??= []).push(item);
    return acc;
  }, {});
}
const orders = [
  { id: 1, status: "pending" },
  { id: 2, status: "shipped" },
  { id: 3, status: "pending" },
];
console.log(groupBy(orders, "status"));
// { pending: [{id:1,...},{id:3,...}], shipped: [{id:2,...}] }

// Modern built-in alternative — see file 15 for the full write-up:
// Object.groupBy(orders, (order) => order.status)
```

### 5. Sort an array of objects by a property

```js
const people = [
  { name: "Carol", age: 25 },
  { name: "Alice", age: 35 },
  { name: "Bob", age: 30 },
];

// Ascending by age
console.log([...people].sort((a, b) => a.age - b.age).map((p) => p.name));
// ["Carol", "Bob", "Alice"]

// Descending by name (string comparator)
console.log([...people].sort((a, b) => b.name.localeCompare(a.name)).map((p) => p.name));
// ["Carol", "Bob", "Alice"]
```
**Note:** spreading into a new array first (`[...people]`) avoids mutating the original — remembering `sort()` mutates is exactly the kind of thing interviewers probe for.

---

## How to Explain in an Interview (Simple English)

"When I'm picking an array method, I first ask: am I TRANSFORMING the array into a new one (`map`, `filter`, `flatMap`), COLLAPSING it into a single value (`reduce`), SEARCHING for something (`find`, `some`, `every`, `includes`), or actually mutating it in place (`push`, `splice`, `sort`)? That question alone usually narrows it to the right method. The other thing I always double-check is whether the method mutates — `sort`, `reverse`, and `splice` are the classic ones that silently change your original array, which matters a lot if I'm working with React/Redux state that must stay immutable. When in doubt, I make a copy first (`[...arr]` or `.slice()`) before calling a mutating method."

---

## Quick Summary Table

| Category | Methods |
|---|---|
| Creating | `Array.of`, `Array.from`, `Array.isArray` |
| Add/remove (mutating) | `push`, `pop`, `shift`, `unshift`, `splice`, `length =` |
| Non-mutating transforms | `map`, `filter`, `flatMap`, `flat`, `slice`, `concat`, `join` |
| Reorder/fill (mutating) | `sort`, `reverse`, `fill`, `copyWithin` |
| Searching | `find`, `findIndex`, `findLast`, `findLastIndex`, `includes`, `indexOf`, `lastIndexOf`, `some`, `every` |
| Aggregating | `reduce`, `reduceRight` |
| Iteration protocol | `forEach`, `entries`, `keys`, `values`, `for...of` |
