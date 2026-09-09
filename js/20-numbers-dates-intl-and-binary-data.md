# 20 — Numbers, Dates, Intl, and Binary Data

## Why does this file exist?

**The problem it solves:** files 01–19 cover the "control flow and object model" side of JS in depth, but a senior interview will also poke at the built-in APIs used constantly in real apps: number precision bugs, `BigInt`, `Date`, locale-aware formatting (`Intl`), and binary data (`TypedArray`/`ArrayBuffer`/`DataView`). These are genuinely different topics from arrays/strings/objects (files 17–19), so they get their own file.

**Already covered elsewhere — not repeated here:**
- `NaN`/`Infinity` inside the `==`/`===` coercion algorithm — file 16.
- `JSON.stringify` turning `NaN`/`Infinity` into `null` — file 16.

---

## Number Precision, `NaN`, and `Infinity`

**What is it?**
JS has exactly ONE number type for all non-BigInt numbers: a 64-bit IEEE-754 double-precision float — there's no separate `int`/`float`/`double` like in Java or C. `NaN` ("Not a Number") is the special value produced by invalid numeric operations, and `Infinity`/`-Infinity` represent values outside the representable range (or the result of dividing by zero).

```js
console.log(0.1 + 0.2);          // 0.30000000000000004 — NOT 0.3
console.log(0.1 + 0.2 === 0.3);  // false — classic interview trap

// Fix: compare within a small tolerance instead of exact equality
console.log(Math.abs(0.1 + 0.2 - 0.3) < Number.EPSILON); // true
console.log(Number.EPSILON); // 2.220446049250313e-16 — smallest meaningful gap near 1

// Safe integer range
console.log(Number.MAX_SAFE_INTEGER);                       // 9007199254740991 (2^53 - 1)
console.log(9007199254740993 === 9007199254740992);         // true — both round to the SAME float!
console.log(Number.isSafeInteger(Number.MAX_SAFE_INTEGER + 1)); // false

// isNaN() vs Number.isNaN() — a real gotcha
console.log(isNaN("abc"));         // true  — coerces "abc" to a number first (NaN), THEN checks
console.log(Number.isNaN("abc"));  // false — no coercion; "abc" simply isn't the NaN VALUE
console.log(Number.isNaN(NaN));    // true  — the only reliable way to check for actual NaN

console.log(1 / 0);   // Infinity
console.log(-1 / 0);  // -Infinity
console.log(0 / 0);   // NaN
```

**Why was it invented / what problem does it solve?**
Floating point isn't a JS quirk — it's how virtually every mainstream language represents non-integer numbers, because binary can't exactly represent most decimal fractions (`0.1` in binary is a repeating fraction, just like `1/3` is a repeating decimal). JS made the deliberate design choice to have only ONE number type (simplicity), which means even "integer-looking" arithmetic quietly rides on the same imprecise float representation once you go outside the *safe integer* range (`±(2^53 - 1)`) — which is why `Number.isSafeInteger` and `BigInt` (next section) exist as escape hatches.

**Real-time / real-world usage:** money/financial calculations (never store currency as a raw float — use integer cents, a decimal library, or `BigInt`, because `19.99 + 0.01` style rounding errors are unacceptable in billing); ID generation once counts exceed `Number.MAX_SAFE_INTEGER` (database auto-increment IDs, Twitter/Discord "snowflake" IDs — this is exactly why those APIs return IDs as STRINGS, not numbers, in JSON); any equality check on computed floats (test assertions comparing computed values should use a tolerance/`toBeCloseTo`, not `===`).

**How to explain in an interview (simple English):**
"JS only has one number type — a 64-bit float — so `0.1 + 0.2` doesn't exactly equal `0.3` because most decimals can't be represented exactly in binary, the same way `1/3` can't be written exactly in decimal. The fix is comparing with a small tolerance (`Number.EPSILON`) instead of `===`. There's also a 'safe integer' ceiling around 2^53 — past that, distinct integers can round to the same float, which is why very large IDs are often sent as strings in JSON, and why `Number.isNaN()` should be used instead of the global `isNaN()`, since the global version coerces its argument first and gives false positives on non-numeric strings."

---

## `BigInt`

**What is it?**
A second, separate numeric primitive type (`typeof x === "bigint"`) for arbitrary-precision integers — created by appending `n` to an integer literal (`10n`) or calling `BigInt(10)`. Unlike `Number`, a `BigInt` can represent integers of ANY size, exactly, with no precision loss.

```js
const big = 9007199254740993n;        // beyond Number.MAX_SAFE_INTEGER, but exact
console.log(big);                     // 9007199254740993n
console.log(big + 1n);                // 9007199254740994n — exact, no rounding

console.log(typeof 10n);              // "bigint"
console.log(10n + 20n);               // 30n

// You CANNOT mix BigInt and Number directly:
try {
  console.log(10n + 10);              // TypeError: Cannot mix BigInt and other types
} catch (e) {
  console.log(e.message);
}
console.log(10n + BigInt(10));        // 20n — must convert explicitly
console.log(Number(10n) + 10);        // 20   — or convert the other way (loses BigInt's precision guarantee)

console.log(10n === 10);              // false — different types, strict equality fails
console.log(10n == 10);               // true  — loose equality DOES coerce across the two
```

**Why was it invented / what problem does it solve?**
`Number` silently loses precision past `2^53 - 1` (previous section) — for use cases that genuinely need exact large integers (cryptography, high-precision timestamps, financial ledgers, big counters), that silent precision loss is a real correctness bug, not a rounding nuisance. `BigInt` solves it by being a completely separate type with no upper bound, at the cost of being slower than `Number` for typical small-integer math and unable to mix with `Number` without an explicit conversion (a deliberate design choice to prevent accidental precision loss from sneaking in unnoticed).

**Real-time / real-world usage:** cryptography and hashing libraries; database libraries returning 64-bit IDs (e.g., some Postgres `bigint` columns map to JS `BigInt` instead of `Number`); high-precision timestamps (`process.hrtime.bigint()` in Node); any domain working with numbers that can realistically exceed ~9 quadrillion.

**How to explain in an interview (simple English):**
"`BigInt` is a second number type for integers that need to be exact beyond what a regular `Number` can safely represent — past about 9 quadrillion, `Number` starts silently rounding, but `BigInt` never does, because it doesn't use floating point at all. The trade-off is you can't mix a `BigInt` and a `Number` in the same arithmetic expression without converting one — that's intentional, so precision loss can't happen by accident."

---

## `Date` — Core Methods

**What is it?**
JS's built-in object for representing a single moment in time, stored internally as a millisecond timestamp relative to the Unix epoch (Jan 1, 1970 UTC).

```js
const now = new Date();                      // current date/time
const specific = new Date(2026, 8, 9);        // Sep 9, 2026 — MONTH IS 0-INDEXED (8 = September)!
const fromISO = new Date("2026-09-09T10:00:00Z"); // parsing an ISO string — the reliable format

console.log(specific.getFullYear());  // 2026
console.log(specific.getMonth());     // 8   — 0-indexed, classic trap
console.log(specific.getDate());      // 9   — day of month (getDay() is day of WEEK, 0=Sunday)
console.log(specific.getDay());       // 3   — Wednesday

console.log(fromISO.toISOString());   // "2026-09-09T10:00:00.000Z" — unambiguous, use this for storage/APIs
console.log(Date.now());              // current epoch milliseconds (a plain number, no Date object needed)

// Date math: Date objects convert to their epoch-ms number for arithmetic
const oneDayLater = new Date(specific.getTime() + 24 * 60 * 60 * 1000);
console.log(oneDayLater.getDate());   // 10

// Comparing dates
console.log(specific < oneDayLater);  // true — relational operators coerce Dates to numbers (epoch ms)
console.log(specific.getTime() === new Date(2026, 8, 9).getTime()); // true — same instant
console.log(specific === new Date(2026, 8, 9)); // false — different OBJECT references, like any object
```

**Why was it invented / what problem does it solve?**
Every real application needs to represent, store, compare, and format points in time — `Date` gives JS a built-in, engine-native way to do that instead of every library reinventing epoch-math from scratch. Its rough edges (0-indexed months, mutable setters, no built-in timezone-safe arithmetic) are historical baggage from JS's original 1995 design being modeled closely on Java's now-deprecated `java.util.Date` — which is exactly why `date-fns`/`Luxon`/`day.js` exist as safer wrappers, and why the Temporal API (file 15) is being built as `Date`'s eventual, less-footgun-prone replacement.

**Real-time / real-world usage:** timestamping records ("created at", "updated at"), scheduling/reminders, formatting relative times ("2 hours ago"), any UI showing dates — always store/transmit as UTC ISO strings (`toISOString()`) and only convert to local/display format at the very last step, to avoid timezone bugs.

**How to explain in an interview (simple English):**
"`Date` stores a single point in time as milliseconds since the Unix epoch. The classic gotcha is `getMonth()` being 0-indexed — January is `0`, not `1` — so `getMonth() + 1` is a common pattern when displaying a month number. For anything beyond simple display, I'd reach for a library like `date-fns` or the newer Temporal API, because `Date`'s own methods mutate in place (`setDate()`, etc.) and have no real timezone-safe arithmetic built in."

---

## `Intl` — Locale-Aware Formatting

**What is it?**
A built-in namespace providing locale-aware formatting for numbers, currency, dates, relative times, and string comparison/sorting — without needing a third-party i18n library for the basics.

```js
// Currency and number formatting
const usd = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });
console.log(usd.format(1234.5));               // "$1,234.50"

const inr = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" });
console.log(inr.format(1234567.89));           // "₹12,34,567.89" — Indian digit grouping, not Western

// Date formatting, locale-aware
const dateFmt = new Intl.DateTimeFormat("en-GB", { dateStyle: "long" });
console.log(dateFmt.format(new Date(2026, 8, 9))); // "9 September 2026"

// Relative time ("3 days ago" style, no manual math needed)
const rtf = new Intl.RelativeTimeFormat("en", { numeric: "auto" });
console.log(rtf.format(-1, "day"));             // "yesterday"
console.log(rtf.format(3, "day"));              // "in 3 days"

// Locale-correct string comparison/sorting (better than naive < / >)
const words = ["café", "cafe", "cafz"];
console.log([...words].sort());                                  // naive sort — byte-order, can be wrong
console.log([...words].sort(new Intl.Collator("en").compare));   // locale-correct sort
```

**Why was it invented / what problem does it solve?**
Hand-rolling currency symbols, digit grouping (commas vs. periods vs. spaces), date formats, and pluralization rules for every locale your app supports is enormous, error-prone, and something the JS engine itself already has to know (it ships with locale data) — `Intl` exposes that engine-native locale data directly, replacing what used to require heavyweight libraries just to right-pad a number with the correct thousands separator for a given country.

**Real-time / real-world usage:** e-commerce sites showing prices in the visitor's currency/locale format; dashboards showing "5 minutes ago" timestamps; any internationalized product (Airbnb, Amazon, Shopify storefronts) formatting numbers/dates/plurals correctly per user locale without a translation library doing the heavy numeric formatting itself.

**How to explain in an interview (simple English):**
"`Intl` is a built-in namespace for locale-aware formatting — `Intl.NumberFormat` for currency/number formatting (correct digit grouping and currency symbol per locale), `Intl.DateTimeFormat` for dates, `Intl.RelativeTimeFormat` for 'in 3 days'/'2 hours ago' style strings, and `Intl.Collator` for locale-correct string sorting. It's built into the engine, so I don't need a heavy library just to show a price with the right comma placement and currency symbol for a user's region."

---

## `TypedArray`, `ArrayBuffer`, and `DataView`

**What is it?**
- `ArrayBuffer` — a fixed-length, raw block of binary memory (just bytes; no methods to read/write individual values directly).
- A `TypedArray` (`Uint8Array`, `Int32Array`, `Float64Array`, etc.) — a "view" over an `ArrayBuffer` that interprets those raw bytes as a specific numeric type, giving you array-like indexed access.
- `DataView` — a more flexible view over the same `ArrayBuffer` that lets you read/write DIFFERENT numeric types at arbitrary byte offsets (mixed types in one buffer), and control endianness explicitly.

```js
const buffer = new ArrayBuffer(4);          // 4 raw bytes, all zeroed
const int32View = new Int32Array(buffer);   // interpret those 4 bytes as one 32-bit integer
int32View[0] = 65;

const byteView = new Uint8Array(buffer);    // a DIFFERENT view over the SAME underlying bytes
console.log(byteView);                      // Uint8Array(4) [ 65, 0, 0, 0 ] — little-endian byte layout

// DataView — explicit control over type AND byte order (endianness) at any offset
const dv = new DataView(buffer);
console.log(dv.getInt32(0, true));  // 65 — true = little-endian
console.log(dv.getUint8(0));        // 65 — read just the first byte as an 8-bit value

// TypedArrays behave like arrays for indexing/iteration, but have a FIXED length and only hold numbers
const floats = new Float64Array([1.5, 2.5, 3.5]);
console.log(floats.length);         // 3
console.log(floats.map((n) => n * 2)); // Float64Array(3) [ 3, 5, 7 ] — map returns another TypedArray
```

**Why was it invented / what problem does it solve?**
Plain JS arrays are flexible but inefficient for large, uniform, numeric data — every element is a boxed value with type-checking overhead, and arrays can hold mixed types, which prevents the kind of memory-packed, contiguous storage that fast binary processing needs. `TypedArray`/`ArrayBuffer` were introduced (originally for WebGL) to give JS a way to work with raw, fixed-type, contiguous binary memory as fast and compactly as languages like C — essential once JS started doing real binary I/O work: file/image/audio processing, network protocols, and WebAssembly's linear memory (which IS literally an `ArrayBuffer` under the hood).

**Real-time / real-world usage:** reading binary file formats (image headers, audio/video codecs) in the browser or Node; `fetch(...).then(r => r.arrayBuffer())` for binary HTTP responses; WebGL/Canvas pixel data manipulation; parsing binary network protocols (WebSockets sending binary frames); Node's `Buffer` (Node-specific) is itself built on top of `Uint8Array`; WebAssembly modules exchanging data with JS through a shared `ArrayBuffer`.

**How to explain in an interview (simple English):**
"`ArrayBuffer` is just a raw chunk of bytes with no way to read them directly. A `TypedArray` like `Uint8Array` or `Int32Array` is a typed 'lens' over that buffer that lets you read/write it as a specific numeric type with array-style indexing. `DataView` is a more flexible lens — it lets you mix different types and byte orders within the same buffer at specific offsets. I'd reach for these when doing real binary work — parsing a file format, handling binary WebSocket frames, or passing data to/from WebAssembly — where a regular JS array's overhead and flexibility are actually a liability, not a feature."

---

## Quick Summary Table

| Topic | One-liner |
|---|---|
| Float precision | JS has one 64-bit float type; `0.1 + 0.2 !== 0.3` — compare with `Number.EPSILON` tolerance, not `===` |
| `Number.isNaN` vs `isNaN` | `Number.isNaN` doesn't coerce (accurate); global `isNaN` coerces first (false positives on non-numeric strings) |
| Safe integers | `Number.MAX_SAFE_INTEGER` = 2^53 - 1; beyond it, distinct integers can round to the same float |
| `BigInt` | Separate arbitrary-precision integer type (`10n`); can't mix with `Number` without explicit conversion |
| `Date` | Epoch-ms based; `getMonth()` is 0-indexed; store/transmit as `toISOString()`, format for display last |
| `Intl` | Built-in locale-aware `NumberFormat`/`DateTimeFormat`/`RelativeTimeFormat`/`Collator` — no library needed for basics |
| `ArrayBuffer` | Raw fixed-length binary memory, no direct read/write |
| `TypedArray` | Typed, fixed-length "view" over an `ArrayBuffer` (`Uint8Array`, `Int32Array`, etc.) |
| `DataView` | Flexible view over an `ArrayBuffer` — mixed types, explicit endianness, arbitrary offsets |
