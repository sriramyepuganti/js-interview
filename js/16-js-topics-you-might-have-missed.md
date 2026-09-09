# 16 — JS Topics You Might Have Missed (Gap-Fill for Senior Interviews)

This file exists because "interview can ask any concept" — files 01-15 cover execution model, closures, `this`, prototypes, async, ES6+/latest features, iterators/generators, modules, patterns, memory, errors, and build tools in depth, but a senior-level panel can just as easily open with `==` vs `===` internals, regex, `Proxy`, or `JSON.stringify` edge cases. This file plugs exactly those gaps. Currying/composition is deliberately **not** repeated here — it's already covered in depth in file 10.

---

## `==` vs `===` — The Abstract Equality Algorithm

**What is it?**
`===` ("strict equality") compares type AND value with zero conversion. `==` ("loose/abstract equality") first tries to convert both operands to the **same type**, then compares — following a specific, spec-defined algorithm (the Abstract Equality Comparison Algorithm), not "random" behavior.

**Why was it invented?**
`==` is actually the OLDER operator — it reflects JS's original design goal of being forgiving with types (comparing a form input string `"5"` to the number `5` "just working" was considered convenient in 1995). `===` was needed almost immediately after, once developers realized implicit coercion produces surprising, bug-prone results, so both operators have coexisted since JS's earliest versions.

**The algorithm, simplified:**
1. Same type? → same result as `===`.
2. `null == undefined` → always `true` (a special-cased rule — but `null`/`undefined` are NOT loosely equal to anything else, including `0`, `""`, or `false`).
3. `number == string` → the string is converted to a number, then compared.
4. `boolean == anything` → the boolean is converted to a number (`true`→`1`, `false`→`0`), then that rule applies again.
5. `object == primitive` → the object is converted to a primitive via `ToPrimitive` (tries `valueOf()` first, then `toString()`), then compared using the rules above.
6. `NaN` is never equal to anything, including itself, under either operator.

```js
console.log(1 == "1");          // true  — string "1" → number 1
console.log(true == 1);         // true  — true → 1
console.log(false == "0");      // true  — "0" → 0, false → 0
console.log(null == undefined); // true  — special case
console.log(null == 0);         // false — null/undefined don't convert to numbers for ==
console.log(NaN === NaN);       // false — only value not equal to itself
console.log(NaN !== NaN);       // true

// The classic trick question:
console.log([] == false);       // true  — [] → ToPrimitive → "" → ToNumber → 0; false → 0
console.log([] == ![]);         // true  — ![] is false first (arrays are truthy, so ! flips it),
                                 //          then [] == false, same as above
console.log([] == "");          // true  — [] → ToPrimitive → "" (empty array joins to "")
console.log([1,2] == "1,2");    // true  — [1,2] → ToPrimitive → "1,2" (Array.join default)
```

**Real-world usage:** Every lint config (Airbnb, Standard, ESLint's `eqeqeq`) bans `==` except for the one accepted idiom `x == null` (a deliberate shorthand to catch BOTH `null` and `undefined` in one check). Legacy codebases are full of `==`, so recognizing these coercion rules matters for debugging inherited code, not just passing interviews.

**How to explain in an interview:** "`===` never converts types — different types are automatically not-equal. `==` tries to make both sides the same type first, following the spec's coercion rules, and `null`/`undefined` are a special case that only equal each other. I always use `===` in code I write, except the one common idiom `x == null` to catch both null and undefined at once."

| Expression | Result | Why |
|---|---|---|
| `0 == false` | `true` | `false` → `0` |
| `0 == null` | `false` | `null` doesn't convert to a number for `==` |
| `0 == undefined` | `false` | same rule |
| `null == undefined` | `true` | special case, only with each other |
| `"" == 0` | `true` | `""` → `0` |
| `[] == ![]` | `true` | `![]` is `false`, then `[] == false` |
| `NaN == NaN` | `false` | `NaN` never equals anything |

---

## `JSON.stringify` / `JSON.parse` — Serialization Deep Dive

**What is it?**
`JSON.stringify(value, replacer, space)` converts a JS value into a JSON string. `JSON.parse(text, reviver)` converts a JSON string back into a JS value. Both accept a lesser-known **second argument** that most people forget about.

**Why was it invented?**
Before JSON, exchanging structured data between client/server (or storing it) meant hand-parsing XML or ad-hoc formats. JSON (a subset of JS object/array literal syntax) became the universal, lightweight interchange format — and since it's literally JS syntax, `JSON.parse`/`JSON.stringify` were natural additions to the language itself (standardized in ES5, though browsers shipped it earlier).

**The `replacer` parameter (2nd arg of `stringify`):**
- As a **function** `(key, value) => ...`: called for every key/value pair; return `undefined` to omit that key, or a transformed value to replace it.
- As an **array** of strings: acts as a whitelist — only those keys are included.

```js
const user = { name: "Sri", password: "secret123", age: 30 };

// function replacer — strip sensitive fields
JSON.stringify(user, (key, value) => key === "password" ? undefined : value);
// '{"name":"Sri","age":30}'

// array replacer — whitelist keys
JSON.stringify(user, ["name", "age"]);
// '{"name":"Sri","age":30}'

// space argument — pretty-printing (indent by 2 spaces)
JSON.stringify(user, null, 2);
```

**The `reviver` parameter (2nd arg of `parse`):**
Called for every key/value pair while parsing — commonly used to turn ISO date STRINGS back into real `Date` objects (since JSON has no native Date type).

```js
const json = '{"name":"Sri","createdAt":"2024-01-01T00:00:00.000Z"}';
const revived = JSON.parse(json, (key, value) =>
  key === "createdAt" ? new Date(value) : value
);
console.log(revived.createdAt instanceof Date); // true
```

**Edge cases that trip people up in `stringify`:**
```js
JSON.stringify({ a: undefined, b: function(){}, c: Symbol("x"), d: 1 });
// '{"d":1}' — undefined, functions, and Symbols are SILENTLY DROPPED from objects

JSON.stringify([undefined, function(){}, 1]);
// '[null,null,1]' — but inside ARRAYS, those same values become "null" instead of being dropped

JSON.stringify({ date: new Date(0) });
// '{"date":"1970-01-01T00:00:00.000Z"}' — Date has a built-in toJSON(), so it becomes an ISO string
// (this means round-tripping through JSON.parse gives you back a STRING, not a Date — the classic
// "JSON.parse(JSON.stringify(x)) breaks Dates" problem behind structuredClone's existence, file 07)

JSON.stringify({ a: NaN, b: Infinity });
// '{"a":null,"b":null}' — non-finite numbers silently become null

const circular = {};
circular.self = circular;
JSON.stringify(circular);
// TypeError: Converting circular structure to JSON — stringify cannot handle cycles at all
```

**Real-world usage:** `localStorage` (only stores strings), API request/response bodies, Redux DevTools state snapshots (which is exactly why Redux state must avoid `undefined`/functions/circular refs), config files, deep-clone hack (`JSON.parse(JSON.stringify(x))`) — now superseded by `structuredClone()` for anything with Dates/Maps/Sets/circular refs (see file 07).

**How to explain in an interview:** "`stringify` drops `undefined`, functions, and Symbols from objects but turns them into `null` inside arrays. It can't handle circular references at all — it throws. Dates get converted to ISO strings via their built-in `toJSON()`, which is why parsing them back doesn't give you a Date unless you use a reviver function. Both `stringify` and `parse` take an optional second argument — a replacer/reviver — to transform or filter values during the conversion, which is how you'd strip sensitive fields before sending JSON, or restore Date objects after receiving it."

---

## Regular Expressions

**What is it?**
A mini pattern-matching language for strings, exposed in JS via the `RegExp` object — either as a literal `/pattern/flags` or `new RegExp("pattern", "flags")` (needed when the pattern is built dynamically from a variable).

**Why was it invented?**
Text validation, searching, and extraction (emails, phone numbers, parsing log lines, tokenizing) are so common that hand-writing character-by-character loops for every case would be unmanageable. JS adopted the (already well-established, Perl-inspired) regex syntax so this logic could be expressed declaratively in one line instead of imperative string-scanning code.

**Core methods:**
| Method | Called on | Returns | Notes |
|---|---|---|---|
| `regex.test(str)` | RegExp | `boolean` | Just "does it match?" — fastest for validation |
| `regex.exec(str)` | RegExp | match array or `null` | With the `g` flag, remembers `.lastIndex` between calls — call repeatedly in a loop to get ALL matches one at a time |
| `str.match(regex)` | String | array or `null` | Without `g`: like `exec` (one match + capture groups). With `g`: all matches as a flat array, but **no** capture group info |
| `str.matchAll(regex)` | String | iterator of match arrays | Requires the `g` flag; gives you ALL matches, each WITH full capture-group info (best of both worlds — modern replacement for the `exec` loop) |
| `str.replace(regex, replacement)` | String | new string | `replacement` can be a string (with `$1`, `$<name>` backreferences) or a function `(match, ...groups) => ...` |
| `str.replaceAll(regex, replacement)` | String | new string | Like `replace`, but regex MUST have `g` flag (or it throws) |

```js
const re = /(\d{3})-(\d{4})/;
console.log(re.test("call 555-1234"));            // true
console.log(re.exec("call 555-1234"));
// ["555-1234", "555", "1234", index: 5, input: ..., groups: undefined]

console.log("a1 b2 c3".match(/\d/g));              // ["1", "2", "3"] — no group info, just matches
console.log([..."a1 b2 c3".matchAll(/([a-z])(\d)/g)].map(m => m[1] + m[2]));
// ["a1", "b2", "c3"] — matchAll gives full capture groups PER match

console.log("2024-01-15".replace(/(\d+)-(\d+)-(\d+)/, "$3/$2/$1")); // "15/01/2024"
```

**Named capture groups** — clearer than positional `$1`/`$2`:
```js
const dateRegex = /(?<year>\d{4})-(?<month>\d{2})-(?<day>\d{2})/;
const match = "2024-01-15".match(dateRegex);
console.log(match.groups); // { year: "2024", month: "01", day: "15" }
console.log("2024-01-15".replace(dateRegex, "$<day>/$<month>/$<year>")); // "15/01/2024"
```

**Common flags:**
| Flag | Meaning |
|---|---|
| `g` | Global — find all matches, not just the first |
| `i` | Case-insensitive |
| `m` | Multiline — `^`/`$` match start/end of EACH line, not just the whole string |
| `s` | dotAll — `.` also matches newlines (normally it doesn't) |
| `u` | Unicode-aware matching (needed for emoji/astral code points) |
| `y` | Sticky — matches only from `lastIndex`, no searching ahead |

**Lookahead / lookbehind (assert without consuming characters):**
```js
console.log("price: $100".match(/(?<=\$)\d+/)[0]);   // "100" — lookbehind: preceded by $, but $ isn't captured
console.log("100px".match(/\d+(?=px)/)[0]);            // "100" — lookahead: followed by "px", but "px" isn't captured
console.log("password1".match(/^(?!.*password).*$/)); // null — negative lookahead: reject if "password" appears anywhere
```

**Real-world usage:** Form validation (email/phone/password strength), parsing structured text (log files, CSV-ish data), input sanitization, syntax highlighters/tokenizers, URL routing (Express route params are regex under the hood).

**Common interview gotcha:** reusing a `/g` regex with `.test()`/`.exec()` across calls is STATEFUL — `lastIndex` persists, so calling the same global regex's `.test()` in a `while` loop can silently skip matches or loop forever if you don't reset `lastIndex`.

**How to explain in an interview:** "Regex lets me describe a text pattern instead of writing manual character loops. `test` just tells me yes/no, `exec`/`match`/`matchAll` give me the actual matched text and capture groups — `matchAll` is the modern way to get every match WITH groups in one iterator, whereas `match` with the `g` flag gives you matches but drops the groups. Named groups (`(?<name>...)`) make the result readable instead of counting `$1`, `$2`. And I know the `g` flag makes RegExp objects stateful via `lastIndex`, which is a classic footgun in a loop."

---

## `Symbol` — The Primitive Type

**What is it?**
`Symbol` is JS's 7th primitive type (alongside string, number, boolean, `null`, `undefined`, `bigint`). Every call to `Symbol([description])` creates a brand-new, globally unique value — even two symbols with the identical description are never equal.

**Why was it invented?**
Before ES6, object keys were always strings, meaning ANY new "special" property name (like a future built-in protocol method) risked colliding with a property some existing object already used for something else. Symbols solve this by being **guaranteed collision-free** — you can safely add metadata or protocol hooks to any object without ever accidentally overwriting (or being overwritten by) a string-keyed property. They also solve it for enumeration: symbol-keyed properties are skipped by `for...in`, `Object.keys`, and `JSON.stringify` by default, making them a natural home for "hidden" internal data.

```js
console.log(Symbol("id") === Symbol("id")); // false — always unique, description is just for debugging
console.log(typeof Symbol("x"));            // "symbol"

const id = Symbol("userId");
const user = { name: "Sri", [id]: 12345 };
console.log(Object.keys(user));                // ["name"] — symbol key is invisible here
console.log(JSON.stringify(user));             // '{"name":"Sri"}' — invisible here too
console.log(Object.getOwnPropertySymbols(user)); // [Symbol(userId)] — but retrievable if you ask directly

// Symbol.for() — a GLOBAL registry; same key always returns the SAME symbol (unlike Symbol())
const s1 = Symbol.for("shared");
const s2 = Symbol.for("shared");
console.log(s1 === s2); // true — looked up/created once in the global symbol registry
```

**Well-known symbols** (built-in symbols the engine itself looks for on objects to customize behavior):
| Symbol | Purpose |
|---|---|
| `Symbol.iterator` | Makes an object work with `for...of`/spread (file 08) |
| `Symbol.asyncIterator` | Same, for `for await...of` (see below) |
| `Symbol.toPrimitive` | Customizes how an object converts to a primitive (`+obj`, `` `${obj}` ``, comparisons) |
| `Symbol.toStringTag` | Customizes the string `Object.prototype.toString.call(obj)` produces |
| `Symbol.hasInstance` | Customizes what `instanceof` checks (e.g., `obj instanceof MyClass`) |

```js
class Money {
  constructor(amount) { this.amount = amount; }
  [Symbol.toPrimitive](hint) {
    if (hint === "number") return this.amount;
    if (hint === "string") return `$${this.amount.toFixed(2)}`;
    return `Money(${this.amount})`; // "default" hint
  }
}
const price = new Money(19.5);
console.log(+price);        // 19.5   — hint "number"
console.log(`${price}`);    // "$19.50" — hint "string"
console.log(price + "");    // "Money(19.5)" — hint "default"
```

**Real-world usage:** `Symbol.iterator` (custom iterables, file 08), avoiding property-name collisions when attaching metadata to third-party objects, defining private-ish "protocol" methods, React's `Symbol.for('react.element')` internally tags React elements so they can be distinguished from plain objects/JSON.

**How to explain in an interview:** "A Symbol is a primitive that's always unique, even if you give two symbols the same description — that uniqueness is the whole point: I can add a property to any object using a Symbol as the key and know for certain it will never collide with an existing or future string key. They're also invisible to `for...in`, `Object.keys`, and `JSON.stringify`, which is why the language itself uses well-known symbols like `Symbol.iterator` to add 'hidden' protocol behavior to objects without polluting their normal enumerable properties."

---

## `Proxy` and `Reflect`

**What is it?**
A `Proxy` wraps a target object and lets you intercept and customize FUNDAMENTAL operations on it — reading a property, setting one, checking `in`, calling `delete`, even calling the object as a function — via handler functions called **traps**. `Reflect` is a built-in object providing the DEFAULT implementation of those same fundamental operations as plain functions, meant to be called from inside a trap so you don't have to reimplement default behavior by hand.

**Why was it invented?**
Before `Proxy`, "meta-programming" (intercepting generic object operations) was limited to `Object.defineProperty` getters/setters — which only work for property names you know AHEAD OF TIME. There was no way to intercept `delete obj.x`, the `in` operator, or ANY property access on an object generically (including future/dynamic keys). `Proxy` fills that gap. `Reflect` was added alongside it because operations like `delete`, `in`, and property enumeration previously only existed as OPERATORS or special syntax, not callable functions — traps need a reliable, non-recursive way to invoke "just do the normal thing," and `Reflect.deleteProperty(obj, key)` / `Reflect.get(obj, key)` etc. provide exactly that.

```js
const target = { name: "Sri", age: 30 };

const validated = new Proxy(target, {
  set(obj, prop, value) {
    if (prop === "age" && typeof value !== "number") {
      throw new TypeError("age must be a number");
    }
    return Reflect.set(obj, prop, value); // perform the DEFAULT set behavior
  },
  get(obj, prop) {
    console.log(`reading "${prop}"`);
    return Reflect.get(obj, prop); // default get behavior, but logged first
  }
});

validated.name;         // logs: reading "name"
validated.age = 31;     // ✅ works
validated.age = "old";  // ❌ throws TypeError: age must be a number
```

**Common traps:** `get`, `set`, `has` (for `in`), `deleteProperty` (for `delete`), `ownKeys` (for `Object.keys`/`for...in`), `apply` (for calling the proxy as a function), `construct` (for `new proxy()`).

**Real-world usage:**
- **Vue 3's reactivity system** wraps reactive state objects in a `Proxy` (`get`/`set` traps track dependencies and trigger re-renders) — this replaced Vue 2's `Object.defineProperty`-per-key approach, which couldn't detect brand-new properties being added or array index/length changes after the fact.
- **Validation objects** — reject invalid assignments before they happen (as above).
- **Negative array indices / default values** — a `get` trap can return a computed fallback for missing keys instead of `undefined`.
- **Read-only/immutable wrappers**, logging/tracing every property access for debugging, auto-generated API clients (a `get` trap returns a function per method name you access, without pre-declaring every endpoint).

**How to explain in an interview:** "A Proxy sits in front of an object and lets me intercept basic operations like get/set/delete/has instead of the engine doing them directly — it's how Vue 3's reactivity detects when reactive state is read or changed, and how you'd build a validating or logging wrapper around any object generically, not just for properties you predefined. Reflect gives me the plain-function version of those same default operations, so inside a trap I can say 'now actually do the normal thing' without writing that logic myself or accidentally recursing."

---

## Tagged Template Literals

**What is it?**
Calling a function using template-literal syntax — `` tagFn`text ${a} more ${b}` `` — instead of the literal producing a string immediately, the TAG FUNCTION receives the literal STRING PARTS as an array (with a `.raw` version too) and each interpolated VALUE as separate arguments, and controls what the final result is.

**Why was it invented?**
Plain template literals always immediately coerce interpolated values to strings and concatenate everything — you lose access to the raw pieces. Some use cases need to intercept each piece BEFORE concatenation: escaping each value differently depending on context (HTML vs SQL), preserving un-escaped raw text (`` `\n` `` as the two literal characters `\` and `n`, not an actual newline), or parsing the whole literal into something other than a string entirely (a CSS object, a query object).

```js
function highlight(strings, ...values) {
  // strings = ["Hello, ", "! You have ", " new messages."]
  // values  = ["Sri", 5]
  return strings.reduce((result, str, i) =>
    `${result}${str}${values[i] !== undefined ? `**${values[i]}**` : ""}`, "");
}
const name = "Sri", count = 5;
console.log(highlight`Hello, ${name}! You have ${count} new messages.`);
// "Hello, **Sri**! You have **5** new messages."

// A SAFETY use case — auto-escaping to prevent injection
function safeHTML(strings, ...values) {
  const escape = (str) => String(str).replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  }[c]));
  return strings.reduce((result, str, i) =>
    result + str + (values[i] !== undefined ? escape(values[i]) : ""), "");
}
const userInput = "<script>alert('xss')</script>";
console.log(safeHTML`<div>${userInput}</div>`);
// "<div>&lt;script&gt;alert(&#39;xss&#39;)&lt;/script&gt;</div>" — every interpolated value auto-escaped
```

**Real-world usage:** `styled-components` (`` styled.div`color: red;` ``) parses the tagged literal into CSS rules; GraphQL clients' `` gql`query { ... }` `` tag parses the literal into a query AST; i18n libraries tag strings for translation-key lookup; safe SQL-building libraries (like `sql` template tags) auto-parameterize interpolated values instead of string-concatenating them (preventing SQL injection).

**How to explain in an interview:** "A tagged template literal lets a function control what a template literal actually produces, instead of it just becoming a string. The tag function gets the literal string pieces and the interpolated values SEPARATELY, before anything is joined — so it can transform or escape each value differently. `styled-components` is the classic example: `` styled.div`...` `` isn't magic syntax, it's a normal tag function receiving the CSS text and interpolated props as arguments."

---

## Async Iterators and `for await...of`

**What is it?**
The async counterpart to the iterable protocol (file 08). An object is **async iterable** if it implements `Symbol.asyncIterator` (instead of `Symbol.iterator`), whose `.next()` returns a **Promise** that resolves to `{ value, done }`. `for await...of` automatically awaits each one, letting you loop over a sequence of values that each arrive asynchronously, one at a time.

**Why was it invented?**
Sync generators/iterators (file 08) assume every value is available IMMEDIATELY when `.next()` is called. But many real sources produce values one-at-a-time over time — a paginated API (next page requires a network round-trip), a database cursor, a Node.js readable stream, reading a huge file line by line. Before this existed, you'd have to manually `await` each `.next()` call yourself in a loop; `for await...of` (and `async function*`) standardize that pattern.

```js
// async generator — combines `yield` with `await` naturally
async function* fetchPages(totalPages) {
  for (let page = 1; page <= totalPages; page++) {
    await new Promise((r) => setTimeout(r, 100)); // simulate network delay
    yield `page-${page}-data`;
  }
}

async function run() {
  for await (const page of fetchPages(3)) {
    console.log(page); // "page-1-data" ... waits ... "page-2-data" ... waits ... "page-3-data"
  }
}
run();
```

**Distinguishing from sync generators (file 08):** a sync generator's `.next()` returns `{ value, done }` directly, and `for...of` never awaits anything. An async generator's `.next()` returns a `Promise<{ value, done }>`, and only `for await...of` (or manually `await`-ing `.next()`) can consume it correctly — using plain `for...of` on an async iterable would give you Promise objects instead of resolved values.

**Real-world usage:** Node.js readable streams are natively async-iterable (`for await (const chunk of readableStream)`), paginated REST/GraphQL APIs (yield each page as it's fetched instead of loading everything upfront), reading a large file line-by-line without loading it all into memory, consuming WebSocket/server-sent-event streams as a sequence.

**How to explain in an interview:** "It's the same iterable protocol as generators, but built for values that each take time to produce. `Symbol.asyncIterator`'s `.next()` returns a Promise instead of a plain object, and `for await...of` automatically awaits each one before moving to the next iteration. It's the natural fit for things like paginated APIs or Node streams, where you genuinely can't have the next value ready synchronously."

---

## Strict Mode (`'use strict'`)

**What is it?**
A directive (`"use strict";` at the top of a file or function) that opts a script into a stricter variant of JS semantics — turning several previously-silent mistakes into thrown errors, and removing a few confusing/unsafe legacy behaviors.

**Why was it invented?**
JS's original ("sloppy mode") semantics allowed several silent footguns that couldn't be REMOVED without breaking millions of existing websites depending on that exact (buggy) behavior. ES5 introduced strict mode as an **opt-in** way to get the safer behavior going forward, without breaking backward compatibility for code that doesn't opt in.

**What actually changes:**
```js
"use strict";

x = 10; // ❌ ReferenceError — sloppy mode would silently create a global variable

function greet() { console.log(this); }
greet(); // this = undefined (sloppy mode: this = global object)

const obj = Object.freeze({ a: 1 });
obj.a = 2; // ❌ TypeError (sloppy mode: fails silently, `obj.a` stays 1 with no error at all)

function bad(a, a) {} // ❌ SyntaxError — duplicate parameter names not allowed

delete Object.prototype; // ❌ TypeError — can't delete a non-configurable property (sloppy: silently fails)
```

| Behavior | Sloppy mode | Strict mode |
|---|---|---|
| Assigning to an undeclared variable | Silently creates a global | `ReferenceError` |
| Assigning to a non-writable/frozen property | Silently fails, no error | `TypeError` |
| Duplicate function parameter names | Allowed | `SyntaxError` |
| `this` in a plain function call | Global object | `undefined` |
| `with` statement | Allowed | `SyntaxError` (disallowed entirely) |
| Octal literals (`0755`) | Allowed | `SyntaxError` |
| Deleting a plain variable/function name | Allowed (weird edge case) | `SyntaxError` |

**Real-world usage:** You almost certainly ALREADY write strict-mode code without adding the directive: **ES modules and the body of every `class` are automatically strict mode**, and every modern bundler (Babel/webpack/Vite) emits `"use strict"` at the top of compiled output. Knowing it's the silent default in modern code is more interview-relevant than the directive syntax itself.

**How to explain in an interview:** "Strict mode turns several silent JS mistakes into real thrown errors — assigning to an undeclared variable, assigning to a frozen property, duplicate function parameters — instead of failing quietly. It also makes `this` `undefined` in a plain function call instead of defaulting to the global object. It's opt-in for backward compatibility, but in practice I'm already always in strict mode, because ES modules and class bodies are strict by default, and that's basically all modern code."

---

## Functional Programming Principles — Pure Functions, Immutability, Higher-Order Functions

**What is it?**
Three related ideas borrowed from functional programming that show up constantly in day-to-day JS, especially React/Redux:
- **Pure function** — given the same input, always returns the same output, and causes NO observable side effects (no mutating arguments, no I/O, no reading/writing external mutable state).
- **Immutability** — never modify an existing data structure in place; instead, create a new one with the change applied, leaving the original untouched.
- **Higher-order function (HOF)** — a function that takes another function as an argument, returns a function, or both (`map`/`filter`/`reduce`, `debounce`, middleware, event handler wrappers).

**Why do these matter (specifically for React/Redux)?**
- **Purity → predictability & testability.** A pure function can be tested with plain input/output assertions and safely memoized (same input always safe to reuse the last output — this is literally how `React.memo`/`useMemo` work).
- **Immutability → cheap change detection.** If state is NEVER mutated, "did anything change?" is just a `===` reference check (`prevState !== newState`) instead of an expensive deep comparison — this is EXACTLY how React decides whether to re-render, and how Redux's `connect`/selectors decide whether to recompute. It's also what makes Redux DevTools' time-travel debugging possible: past state snapshots are safe to keep around forever because nothing can silently change them later.
- **HOFs → composable, declarative logic.** `array.map(fn)` reads as "what to do," not "how to loop." Redux reducers are literally required to be pure functions `(state, action) => newState`; Redux middleware (`store => next => action => {...}`) is a chain of HOFs (see file 10's currying/composition section — same underlying idea).

```js
// Impure — mutates the argument, output depends on hidden external state
let taxRate = 0.1;
function addTaxImpure(cart) {
  cart.total = cart.total * (1 + taxRate); // mutates caller's object!
  return cart;
}

// Pure — same input always gives same output, no mutation
function addTaxPure(cart, rate) {
  return { ...cart, total: cart.total * (1 + rate) }; // new object returned
}

const cart = { total: 100 };
const withTax = addTaxPure(cart, 0.1);
console.log(cart.total, withTax.total); // 100 110 — original untouched

// A reducer MUST be pure — this is the Redux contract
function counterReducer(state = { count: 0 }, action) {
  switch (action.type) {
    case "INCREMENT": return { ...state, count: state.count + 1 }; // new object, old one untouched
    default: return state;
  }
}
```

**Real-world usage:** `Array.prototype.map/filter/reduce/sort` callbacks, Redux reducers (must be pure), React component render functions (should be pure — same props/state → same output), memoization (`useMemo`/`useCallback`/`React.memo` all rely on the purity + reference-equality assumption), `toSorted`/`toReversed`/`with()` (file 07/15) exist specifically to make immutability easier without hand-rolling `[...arr]` copies.

**How to explain in an interview:** "A pure function's output only depends on its inputs and doesn't change anything outside itself — that predictability is what makes it safely memoizable and easy to test. Immutability means I never mutate existing objects/arrays in place; I return new ones. Those two together are why React and Redux can just do a cheap reference check (`===`) to know if something changed, instead of deep-comparing — and it's why Redux DevTools can safely keep every past state snapshot for time-travel debugging. Higher-order functions — functions that take or return other functions — are how `map`/`filter`/reducers/middleware let me compose behavior declaratively instead of writing manual loops and mutation."

---

## The Concurrency Model — Message Passing with Web Workers

**What is it?**
JS is fundamentally single-threaded: one call stack, one thread, run-to-completion semantics (file 01/05). A **Web Worker** runs JS on a genuinely SEPARATE thread with its OWN independent global scope and memory — it does NOT share variables/objects with the main thread. The only way the two communicate is **asynchronous message passing**: `worker.postMessage(data)` from one side, received via an `onmessage`/`message` event handler on the other. This is a deliberate JS-language concurrency decision, not just a browser API detail: since nothing is shared by default, there are no data races and no locks/mutexes needed — the trade-off is that you can't directly share memory, only copy data back and forth.

**Why was it invented?**
Because JS is single-threaded, one genuinely expensive CPU-bound task (image/video processing, big-data sorting, cryptography, complex parsing) BLOCKS EVERYTHING ELSE on the main thread — rendering, clicks, scrolling, other timers — for as long as it runs (file 11's "don't block the main thread" problem). Workers give you a real extra thread to offload that work to, but to preserve JS's core "no shared mutable state = no race conditions" guarantee, the language exposes that thread only through message passing (copying data across), not direct shared-variable access (aside from the opt-in, advanced `SharedArrayBuffer`/`Atomics`).

```js
// main.js
const worker = new Worker("worker.js");
worker.postMessage({ command: "sum", numbers: [1, 2, 3, 4, 5] });
worker.onmessage = (event) => {
  console.log("Result from worker:", event.data); // 15
};

// worker.js (runs on its own thread, separate global scope — no access to main thread's variables)
self.onmessage = (event) => {
  const { command, numbers } = event.data;
  if (command === "sum") {
    const result = numbers.reduce((a, b) => a + b, 0);
    self.postMessage(result); // send the result BACK — still just a copied message, not shared memory
  }
};
```

**What actually crosses the boundary:** data passed via `postMessage` is copied using the **structured clone algorithm** (the same mechanism behind `structuredClone()`, file 07) — plain objects, arrays, Dates, Maps, Sets, and typed arrays copy fine; functions and DOM nodes CANNOT be sent (they throw or are silently dropped, depending on the engine).

**Real-world usage:** Heavy image/canvas processing, client-side big-data sorting/filtering/parsing (large CSV/JSON), cryptographic hashing, real-time collaborative-editing diffing — anything CPU-heavy enough to visibly freeze the UI otherwise. Node.js has the equivalent `worker_threads` module with `parentPort.postMessage`/`.on('message', ...)` following the identical message-passing model.

**Note:** this is the JS-language mechanics angle specifically (why message-passing exists as JS's concurrency answer) — if your notes elsewhere cover Web Workers as a browser API (creating/terminating workers, `importScripts`, etc.), that's the complementary, more DOM/browser-focused half.

**How to explain in an interview:** "JS's concurrency model is single-threaded with an event loop — Web Workers don't break that; they give you an ADDITIONAL, fully independent thread with its own memory, and the ONLY way to talk to it is `postMessage`, which copies data across (using the same structured-clone algorithm as `structuredClone()`) rather than sharing it directly. That's a deliberate trade-off: no shared mutable state means no race conditions to worry about, at the cost of not being able to pass functions or live references — only serializable data."

---

## Event Bubbling, Capturing, and Delegation

**What is it?**
When an event fires on a DOM element, it doesn't just run handlers on that one element — it travels through the DOM tree in three phases: **capturing** (from `window` DOWN to the target, outer ancestors first), **target** (the element the event actually happened on), then **bubbling** (from the target back UP to `window`, target first, then each ancestor in turn). By default, `addEventListener(type, handler)` listens during the BUBBLING phase; passing a third argument of `true` (or `{ capture: true }`) listens during the CAPTURING phase instead.

```js
// HTML: <div id="outer"><button id="inner">Click</button></div>

outer.addEventListener("click", () => console.log("outer bubble"));       // bubbling (default)
inner.addEventListener("click", () => console.log("inner bubble"));      // bubbling (default)
outer.addEventListener("click", () => console.log("outer capture"), true); // capturing

// Clicking the button logs, in this order:
// "outer capture"  (capturing: outer to inner, before target)
// "inner bubble"   (target's own handler fires)
// "outer bubble"   (bubbling: back up from target to outer)
```

**Stopping propagation:** `event.stopPropagation()` inside a handler prevents the event from continuing to the next phase/ancestor — but does NOT stop other handlers already attached to the SAME element from also running (`event.stopImmediatePropagation()` is needed for that).

**Event delegation** is the practical technique that bubbling makes possible: instead of attaching a listener to every individual child element (expensive, and impossible for children added later), attach ONE listener to a shared parent and inspect `event.target` inside it to figure out which child was actually clicked.

```js
// Instead of adding a click listener to every <li>, one listener on the parent <ul> handles all of them —
// including <li>s added to the list AFTER this listener was attached:
document.querySelector("ul").addEventListener("click", (event) => {
  if (event.target.tagName === "LI") {
    console.log("Clicked item:", event.target.textContent);
  }
});
```

**Why was it invented / what problem does it solve?**
Without bubbling, every single interactive element would need its own individually-attached listener, which is both a performance cost (many listener objects in memory) and a correctness problem for dynamic UIs (a listener attached to an element that doesn't exist yet — because it'll be added later, e.g., a new row in a table — simply never fires). Bubbling turns "did something inside this container get clicked" into a single check on `event.target`, solving both problems at once. Capturing exists mainly for edge cases where a parent needs to intercept/short-circuit an event BEFORE it reaches a child (e.g., a modal overlay that needs to close on any outside click, checked before the click reaches whatever's underneath).

**Real-world usage:** Every list/table/grid with clickable rows uses event delegation instead of one listener per row (React's synthetic event system does this automatically under the hood — a single listener at the root handles every component's `onClick`). Modal/dropdown "click outside to close" logic often relies on capturing or bubbling order to distinguish an inside-click from an outside-click.

**How to explain in an interview (simple English):**
"When you click an element, the event doesn't just fire there — it travels down from `window` to the target (capturing), then back up from the target to `window` (bubbling). Listeners are bubbling-phase by default. This is what makes event delegation possible: I can put one listener on a parent and check `event.target` to know which child was actually clicked, instead of attaching a listener to every child individually — which also means it keeps working for children added to the DOM later."

---

## Deep Clone vs Shallow Clone

**What is it?**
A **shallow clone** copies only the TOP-LEVEL properties of an object/array — any nested object/array inside it is still the SAME reference as in the original (not copied). A **deep clone** recursively copies EVERY level, so nothing — no matter how deeply nested — is shared by reference between the original and the copy.

**Why this trips people up:** `{...obj}`, `Object.assign({}, obj)`, and `arr.slice()`/`[...arr]` are ALL shallow. This is a textbook React/Redux state-update bug:
```js
const state = { user: { name: "Sri", settings: { theme: "dark" } } };

// Looks like a copy, but ISN'T deep:
const newState = { ...state };
newState.user.settings.theme = "light"; // mutates the SHARED nested object
console.log(state.user.settings.theme); // "light" — the ORIGINAL got mutated too!
console.log(state.user === newState.user); // true — same reference, spread didn't touch it

// The correct (still manual) way to update a nested field immutably:
const properlyUpdated = {
  ...state,
  user: { ...state.user, settings: { ...state.user.settings, theme: "light" } }
};
console.log(state.user.settings.theme); // "dark" — original is now untouched
```
This is exactly why "update nested state without mutating" needs either verbose manual spreading at every level (as above), a deep-clone-then-mutate approach, or a library like Immer that handles it for you.

**A hand-written recursive deep clone (what `structuredClone` does under the hood, simplified):**
```js
function deepClone(value) {
  if (value === null || typeof value !== "object") return value; // primitives: no cloning needed
  if (Array.isArray(value)) return value.map(deepClone);
  if (value instanceof Date) return new Date(value.getTime());
  const cloned = {};
  for (const key in value) {
    if (Object.hasOwn(value, key)) cloned[key] = deepClone(value[key]);
  }
  return cloned;
}

const original = { a: 1, nested: { b: 2 } };
const clone = deepClone(original);
clone.nested.b = 999;
console.log(original.nested.b); // 2 — untouched, truly independent copy
```

**Techniques, from weakest to strongest:**
| Technique | Depth | Limitation |
|---|---|---|
| `{...obj}` / `Object.assign` | Shallow | Nested objects/arrays still shared by reference |
| `arr.slice()` / `[...arr]` | Shallow (for arrays) | Same issue — nested items shared |
| `JSON.parse(JSON.stringify(x))` | Deep, but lossy | Drops functions/`undefined`/Symbols, breaks Dates (→ strings), throws on circular refs (see the JSON section above) |
| Hand-written recursive `deepClone` | Deep | You maintain it; easy to forget edge cases (Dates, Maps, circular refs) |
| `structuredClone(x)` (file 07) | Deep, correct | The modern built-in answer — handles Dates/Maps/Sets/circular refs correctly; still can't clone functions/DOM nodes |

**Real-world usage:** React/Redux nested state updates (the #1 place this bug appears), undo/redo history (each snapshot must be truly independent or "undo" silently corrupts), form state with nested objects, avoiding "spooky action at a distance" bugs where changing a "copy" somewhere unexpectedly changes the original elsewhere in the app.

**How to explain in an interview:** "Shallow copy only duplicates the top level — spread and `Object.assign` are both shallow, so any nested object inside is still the exact same reference in both the original and the 'copy,' which is a classic React state bug: you mutate what you thought was a copy's nested field, and the original state changes too. Deep clone recursively copies every level so nothing is shared. `structuredClone` is the correct modern built-in for that; the old `JSON.parse(JSON.stringify())` hack does it too but silently breaks Dates, drops functions/undefined, and throws on circular references."

---

## Quick Summary Table

| Topic | One-liner |
|---|---|
| `==` vs `===` | `===` never converts types; `==` follows the Abstract Equality Algorithm (ToPrimitive/ToNumber coercion), with `null == undefined` as a special case |
| `JSON.stringify`/`parse` | Support `replacer`/`reviver` 2nd args; silently drop `undefined`/functions/Symbols, convert Dates to ISO strings, throw on circular refs |
| Regex | `test`(bool)/`exec`(stateful w/ `g`)/`match`/`matchAll`(all matches + groups)/`replace`; named groups `(?<name>...)`; lookahead/behind assert without consuming |
| `Symbol` | Unique, collision-free primitive; invisible to `for...in`/`JSON.stringify`; well-known symbols (`Symbol.iterator`, `Symbol.toPrimitive`, etc.) hook into language behavior |
| `Proxy`/`Reflect` | Proxy intercepts fundamental object operations via traps; Reflect provides the default implementation to call from inside a trap (Vue 3 reactivity's core mechanism) |
| Tagged templates | Function controls a template literal's output, receiving raw string parts + values separately (styled-components, safe HTML/SQL escaping) |
| Async iterators | `Symbol.asyncIterator` + `for await...of` — like generators, but `.next()` returns a Promise, for values that arrive over time (streams, paginated APIs) |
| Strict mode | Turns silent mistakes (undeclared global assignment, frozen-property writes, duplicate params) into real errors; automatic in ES modules & classes |
| Pure/Immutable/HOF | Pure = same input→same output, no side effects; immutability enables cheap `===` change detection (React/Redux); HOFs (`map`/reducers/middleware) compose behavior |
| Concurrency (Workers) | Web Workers = real separate thread + own memory; `postMessage`/`onmessage` = the ONLY communication channel, via structured-clone copying, not shared memory |
| Event bubbling/capturing | Capturing goes `window`→target, bubbling goes target→`window`; listeners are bubbling by default; delegation exploits bubbling to use one parent listener instead of many child listeners |
| Deep vs shallow clone | Spread/`Object.assign`/`slice` are shallow (nested refs shared); real deep clone = recursive copy or `structuredClone()` |
