# 07 — ES6+ Features (through ES2023/2024)

## Why does this file exist?

**The problem it solves:** JavaScript evolves every year (one release per year since ES2015/"ES6"). Senior interviews often probe whether you've kept up — not just "do you know `let`," but "do you know what's *recently* useful." This file covers both the ES6 foundations and the newer additions worth knowing.

---

## The ES6 (2015) Foundations

### `let` / `const`
Block-scoped variable declarations — see file 01 for full depth. **Why:** fixed `var`'s function-scoping bugs.

### Arrow functions
```js
const add = (a, b) => a + b;
```
**Why:** shorter syntax + no own `this`/`arguments` (see file 03) — solves the "lost `this` in callbacks" problem.

### Template literals
```js
const name = "Sri";
console.log(`Hello, ${name}! 2 + 2 = ${2 + 2}`);
```
**Why:** string concatenation with `+` was error-prone and unreadable for multi-variable strings; template literals also support real multi-line strings without `\n` hacks.

### Destructuring
```js
const { name, age = 30 } = { name: "Sri" }; // age defaults to 30
const [first, , third] = [1, 2, 3]; // skip the 2nd element
```
**Why:** avoids repetitive `obj.a`, `obj.b`, `obj.c` extraction lines; makes function parameters self-documenting.

### Spread / Rest
```js
const arr2 = [...arr1, 4, 5];       // spread: expand an iterable
const merged = { ...obj1, ...obj2 }; // spread: shallow-merge objects (later keys win)
function sum(...nums) { return nums.reduce((a, b) => a + b, 0); } // rest: collect args into array
```
**Why:** `spread` replaced verbose patterns like `Array.prototype.concat.apply` or `Object.assign({}, a, b)`; `rest` replaced the clunky `arguments` object with a real, well-behaved array, and works in arrow functions (which don't have `arguments` at all).

### Default parameters
```js
function greet(name = "Guest") { return `Hi ${name}`; }
```
**Why:** removes the old `name = name || "Guest"` pattern, which had a bug: it also overrides falsy-but-valid values like `0` or `""`.

### `Map` and `Set`

**What is it?**
`Map` is a key-value collection like a plain object, except keys can be ANY type (not just strings/symbols) and insertion order is guaranteed. `Set` is a collection of unique values — adding a duplicate is a silent no-op.

```js
const map = new Map();
map.set("name", "Sri");
map.set(42, "the answer");           // a number key — impossible with plain object keys (they'd be stringified to "42")
map.set({ id: 1 }, "user object key"); // even an object can be a key
console.log(map.get(42));            // "the answer"
console.log(map.size);               // 3
for (const [key, value] of map) { /* iterate in insertion order */ }

const set = new Set([1, 2, 2, 3, 3, 3]);
console.log(set);      // Set {1, 2, 3} — duplicates auto-removed
console.log(set.has(2)); // true — O(1) lookup, unlike Array.includes() which is O(n)
set.add(4);
```

**Why was it invented / what problem does it solve?**
Before ES6, people faked a "map" using a plain object — but object keys are always coerced to strings (`obj[42]` and `obj["42"]` are the same key), plain objects inherit prototype properties that can accidentally collide with user data (`obj["toString"]`), and getting the size required manually counting `Object.keys(obj).length`. `Map` fixes all three: any key type, no prototype-pollution risk (a `Map` isn't prebuilt with inherited keys), and a real `.size` property. `Set` fixes the old "fake set via object/array" pattern — deduplicating an array used to mean `arr.filter((v, i) => arr.indexOf(v) === i)` (O(n²)) or juggling an object used purely as a `{ [value]: true }` lookup table; `Set` makes "does this collection contain X" an O(1), purpose-built operation.

**Real-time / real-world usage**
- `Map`: caching computed results keyed by an object/array/complex key (memoization), tracking metadata per DOM node or per component instance, building a lookup table from an API response array (`new Map(users.map(u => [u.id, u]))` for O(1) lookups instead of `.find()`'s O(n) scan).
- `Set`: deduplicating an array of IDs (`[...new Set(ids)]`), tracking "have I already processed this item" during a loop, fast membership checks (permission sets, visited-node tracking in graph/tree traversal).

**How to explain this in an interview (simple English)**
"`Map` is like an object but with any type of key allowed and a built-in `.size` — I reach for it when I need non-string keys or want to avoid prototype-pollution edge cases. `Set` is a collection that automatically keeps only unique values and gives me O(1) `has()` checks — I use it any time I need 'is this already in my collection' to be fast, or just to quickly dedupe an array with `[...new Set(arr)]`."

**Map vs plain Object**

| | `Map` | Plain Object |
|---|---|---|
| Key types | Any value (object, function, NaN, etc.) | String or Symbol only (others get stringified) |
| Key order | Guaranteed insertion order | Mostly insertion order, but integer-like keys are sorted first (a footgun) |
| Size | `map.size` | `Object.keys(obj).length` |
| Prototype pollution risk | None — no inherited keys | Inherits from `Object.prototype` (`"toString" in obj` is `true` even if you never set it) |
| Performance for frequent add/remove | Better, optimized for this | Worse |
| JSON-serializable directly | No (needs manual conversion) | Yes |

**Set vs Array (for uniqueness/lookup)**

| | `Set` | `Array` |
|---|---|---|
| Duplicates | Auto-rejected | Allowed |
| `has()`/`includes()` lookup cost | O(1) | O(n) |
| Guarantees order | Yes (insertion order) | Yes (index order) |
| Indexed access (`arr[2]`) | No | Yes |

---

## Newer Additions Worth Knowing (ES2016 → ES2023/2024)

### Optional chaining `?.` (ES2020)
```js
const city = user?.address?.city; // undefined if user or address is null/undefined, instead of throwing
const result = someFn?.(); // only calls someFn if it exists
const item = arr?.[0];
```
**Why invented:** avoids long defensive chains like `user && user.address && user.address.city`. Extremely common in real code dealing with API responses that might have missing nested fields.

### Nullish coalescing `??` (ES2020)
```js
const count = value ?? 0; // only falls back if value is null or undefined
const count2 = value || 0; // falls back for ANY falsy value: 0, "", false, NaN too — often a bug source
```
**Why invented:** `||` incorrectly treats `0`, `""`, and `false` as "missing" — `??` only treats `null`/`undefined` as missing, which is what you usually actually mean.

### `Array.prototype.flat` / `flatMap` (ES2019)
```js
[1, [2, [3, [4]]]].flat(2); // [1, 2, 3, [4]]
[1, 2, 3].flatMap(x => [x, x * 2]); // [1,2,2,4,3,6]
```

### `Object.fromEntries` (ES2019)
```js
Object.fromEntries([["a", 1], ["b", 2]]); // { a: 1, b: 2 } — reverse of Object.entries
```

### `Array.prototype.at()` (ES2022)
```js
[1, 2, 3].at(-1); // 3 — negative indexing, finally! No more arr[arr.length - 1]
```

### `Object.hasOwn()` (ES2022)
```js
Object.hasOwn(obj, "key"); // safer replacement for obj.hasOwnProperty("key")
```
**Why invented:** works even if `obj` was created with `Object.create(null)` (no prototype, so no `.hasOwnProperty` method to call).

### Class fields, private fields `#`, static blocks (ES2022)
```js
class Counter {
  #count = 0; // truly private — not accessible outside the class, enforced by the engine
  static #instances = 0;
  increment() { return ++this.#count; }
}
```
**Why it matters:** this is the FIRST time JS had real, engine-enforced private state on classes — before this, "privacy" always relied on closures (see file 02) because plain object/class properties were always publicly reachable.

### Top-level `await` (ES2022)
```js
// at the top of an ES module (not inside any function)
const data = await fetch("/api/config").then(r => r.json());
```
**Why invented:** previously `await` only worked inside `async function`s; this lets module entry files do async setup (e.g., loading config before the rest of the module runs) without wrapping everything in an IIFE.

### `structuredClone()` (ES2022, widely available in browsers/Node 17+)
```js
const original = { date: new Date(), nested: { a: 1 }, set: new Set([1,2]) };
const copy = structuredClone(original); // deep clone, handles Dates, Maps, Sets, etc.
```
**Why invented:** `JSON.parse(JSON.stringify(obj))` was the old deep-clone hack, but it silently breaks `Date`, `Map`, `Set`, `undefined` values, functions, and circular references. `structuredClone` is a proper built-in deep clone.

### `Array.prototype.findLast` / `findLastIndex` (ES2023)
```js
[1, 2, 3, 4].findLast(x => x % 2 === 0); // 4 — search from the end
```

### `Array.prototype.toSorted` / `toReversed` / `toSpliced` / `with()` (ES2023)
```js
const original = [3, 1, 2];
const sorted = original.toSorted(); // [1,2,3] — original is untouched (non-mutating!)
console.log(original); // [3, 1, 2] — still original order
```
**Why invented:** `.sort()`, `.reverse()`, `.splice()` all mutate the original array in place, which causes subtle bugs (especially in React/Redux where you must not mutate state directly). These new "immutable" siblings return a new array instead.

### `Array.prototype.group` / `Object.groupBy` (newer, ES2024 stage)
```js
Object.groupBy([1,2,3,4,5], x => x % 2 === 0 ? "even" : "odd");
// { odd: [1,3,5], even: [2,4] }
```

---

## Comparison Table: `||` vs `??`

| Expression | `0 \|\| 5` | `0 ?? 5` | `"" \|\| "x"` | `"" ?? "x"` | `null \|\| 5` | `null ?? 5` |
|---|---|---|---|---|---|---|
| Result | `5` | `0` | `"x"` | `""` | `5` | `5` |

## Real-world usage
- Optional chaining + nullish coalescing are used everywhere API responses are consumed (`response?.data?.items ?? []`).
- Private class fields (`#`) are used for real encapsulation in modern class-based code (replacing old closure-based tricks or `_prefixed` fake-private conventions).
- Immutable array methods (`toSorted`, etc.) matter directly for state management in React/Redux, where mutating state breaks change detection.

## How to explain in an interview (simple English)

"ES6 in 2015 brought the big stuff — `let`/`const`, arrow functions, template literals, destructuring, spread/rest. Since then JS adds smaller but genuinely useful features every year: optional chaining and nullish coalescing to safely read nested data, private class fields for real encapsulation, and newer non-mutating array methods like `toSorted()` so you don't accidentally mutate shared state. Staying current with these shows you actively write and read modern JS, not just what you learned years ago."
