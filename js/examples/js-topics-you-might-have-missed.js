/**
 * js-topics-you-might-have-missed.js
 * Run with: node js-topics-you-might-have-missed.js
 *
 * Demonstrates the most practically-demoable additions from
 * ../16-js-topics-you-might-have-missed.md: equality coercion gotchas,
 * JSON.stringify/parse edge cases (replacer/reviver, circular refs),
 * regex methods, Proxy/Reflect, and currying-adjacent function composition.
 */

// ---------------------------------------------------------------------------
// 1. `==` vs `===` — coercion gotchas
// ---------------------------------------------------------------------------
console.log("=== 1. == vs === coercion gotchas ===");

console.log("[] == false:", [] == false);       // true  — [] -> ToPrimitive -> "" -> ToNumber -> 0; false -> 0
console.log("[] == ![]:", [] == ![]);            // true  — ![] is false (arrays are truthy), then [] == false
console.log('"0" == false:', "0" == false);      // true  — "0" -> 0, false -> 0
console.log('"0" == []:', "0" == []);            // false — [] -> "" first, then "0" == "" is string vs string -> false
console.log("null == undefined:", null == undefined); // true  — special case, ONLY with each other
console.log("null == 0:", null == 0);                 // false — null does not convert to a number for ==
console.log("NaN === NaN:", NaN === NaN);              // false — the one value never equal to itself
console.log("NaN !== NaN:", NaN !== NaN);              // true
console.log("Number.isNaN('x'):", Number.isNaN("x"));  // false — 'x' is not the NaN value
console.log("isNaN('x'):", isNaN("x"));                // true  — global isNaN coerces 'x' to NaN first (footgun)


// ---------------------------------------------------------------------------
// 2. JSON.stringify / JSON.parse edge cases
// ---------------------------------------------------------------------------
console.log("\n=== 2. JSON.stringify / JSON.parse edge cases ===");

const user = { name: "Sri", password: "secret123", age: 30, greet: function () {}, id: undefined };

// Plain stringify: functions, undefined values, and Symbols are silently dropped from OBJECTS
console.log("plain stringify:", JSON.stringify(user));
// '{"name":"Sri","password":"secret123","age":30}'

// replacer as a FUNCTION — strip sensitive fields before serializing
const safeJson = JSON.stringify(user, (key, value) => (key === "password" ? undefined : value));
console.log("replacer (function, strips password):", safeJson);

// replacer as an ARRAY — whitelist only specific keys
console.log("replacer (array whitelist):", JSON.stringify(user, ["name", "age"]));

// space argument — pretty-print with 2-space indent
console.log("pretty print:\n" + JSON.stringify({ name: "Sri", age: 30 }, null, 2));

// undefined/function behave differently inside an ARRAY vs an object — become `null`, not dropped
console.log("array with undefined/function:", JSON.stringify([undefined, function () {}, 1]));
// '[null,null,1]'

// Dates get converted via their built-in toJSON() -> ISO string (loses the Date type on round-trip)
console.log("Date stringified:", JSON.stringify({ createdAt: new Date("2024-01-01T00:00:00.000Z") }));

// reviver — revive an ISO date STRING back into a real Date object during parse
const revived = JSON.parse(
  '{"name":"Sri","createdAt":"2024-01-01T00:00:00.000Z"}',
  (key, value) => (key === "createdAt" ? new Date(value) : value)
);
console.log("revived.createdAt instanceof Date:", revived.createdAt instanceof Date); // true

// Circular reference -> stringify THROWS (no built-in cycle detection)
const circular = { name: "oops" };
circular.self = circular;
try {
  JSON.stringify(circular);
} catch (err) {
  console.log("circular ref error:", err.message); // "Converting circular structure to JSON"
}


// ---------------------------------------------------------------------------
// 3. Regular expressions
// ---------------------------------------------------------------------------
console.log("\n=== 3. Regular expressions ===");

// test() — boolean check
console.log('/\\d+/.test("abc123"):', /\d+/.test("abc123")); // true

// exec() + capture groups (no g flag: one match, with groups)
const phoneMatch = /(\d{3})-(\d{4})/.exec("call 555-1234 now");
console.log("exec() match + groups:", phoneMatch[0], phoneMatch[1], phoneMatch[2]); // "555-1234" "555" "1234"

// match() with g flag — all matches, but NO group info
console.log('"a1 b2 c3".match(/\\d/g):', "a1 b2 c3".match(/\d/g)); // ["1", "2", "3"]

// matchAll() — every match WITH full group info (modern replacement for looping exec())
const pairs = [..."a1 b2 c3".matchAll(/([a-z])(\d)/g)].map((m) => `${m[1]}${m[2]}`);
console.log("matchAll() pairs:", pairs); // ["a1", "b2", "c3"]

// named capture groups
const dateMatch = "2024-01-15".match(/(?<year>\d{4})-(?<month>\d{2})-(?<day>\d{2})/);
console.log("named groups:", dateMatch.groups); // { year: "2024", month: "01", day: "15" }

// replace() with $<name> backreferences using named groups
console.log(
  "reformatted date:",
  "2024-01-15".replace(/(?<year>\d{4})-(?<month>\d{2})-(?<day>\d{2})/, "$<day>/$<month>/$<year>")
); // "15/01/2024"

// replace vs replaceAll
console.log('replace (first only):', "foo bar foo".replace(/foo/, "X"));    // "X bar foo"
console.log('replaceAll (every match):', "foo bar foo".replaceAll(/foo/g, "X")); // "X bar X"

// lookahead / lookbehind
console.log('lookbehind ($ amount):', "price: $100".match(/(?<=\$)\d+/)[0]); // "100"
console.log('lookahead (px unit):', "100px".match(/\d+(?=px)/)[0]);           // "100"

// classic /g + test() statefulness footgun (lastIndex persists between calls)
const globalRe = /\d+/g;
console.log("stateful /g test() calls on the SAME string:");
console.log(" call 1:", globalRe.test("a1b2"), "lastIndex:", globalRe.lastIndex); // true, 2
console.log(" call 2:", globalRe.test("a1b2"), "lastIndex:", globalRe.lastIndex); // true, 4
console.log(" call 3:", globalRe.test("a1b2"), "lastIndex:", globalRe.lastIndex); // false, 0 (resets)
console.log(" call 4:", globalRe.test("a1b2"), "lastIndex:", globalRe.lastIndex); // true, 2 (starts over)


// ---------------------------------------------------------------------------
// 4. Proxy and Reflect
// ---------------------------------------------------------------------------
console.log("\n=== 4. Proxy and Reflect ===");

const target = { name: "Sri", age: 30 };

const validated = new Proxy(target, {
  get(obj, prop) {
    console.log(`  [trap] reading "${prop}"`);
    return Reflect.get(obj, prop); // perform the default get behavior
  },
  set(obj, prop, value) {
    if (prop === "age" && typeof value !== "number") {
      throw new TypeError("age must be a number");
    }
    console.log(`  [trap] writing "${prop}" = ${value}`);
    return Reflect.set(obj, prop, value); // perform the default set behavior
  },
});

console.log("reading validated.name ->", validated.name);
validated.age = 31; // allowed
console.log("age after valid write:", validated.age);

try {
  validated.age = "old"; // rejected by the set trap
} catch (err) {
  console.log("rejected invalid write:", err.message);
}

// A second Proxy example: default value for missing keys, via a `get` trap
const withDefaults = new Proxy(
  { a: 1 },
  { get: (obj, prop) => (prop in obj ? obj[prop] : `<no value for "${prop}">`) }
);
console.log("withDefaults.a:", withDefaults.a);       // 1
console.log("withDefaults.missing:", withDefaults.missing); // '<no value for "missing">'


// ---------------------------------------------------------------------------
// 5. Currying and simple function composition (function-focused demo)
// ---------------------------------------------------------------------------
console.log("\n=== 5. Currying and composition ===");

// A generic curry() that works for any fixed-arity function, not just 2 args
function curry(fn) {
  return function curried(...args) {
    if (args.length >= fn.length) return fn(...args);
    return (...more) => curried(...args, ...more);
  };
}

function volume(length, width, height) {
  return length * width * height;
}
const curriedVolume = curry(volume);
console.log("curriedVolume(2)(3)(4):", curriedVolume(2)(3)(4));       // 24
console.log("curriedVolume(2, 3)(4):", curriedVolume(2, 3)(4));       // 24
console.log("curriedVolume(2)(3, 4):", curriedVolume(2)(3, 4));       // 24

// compose() — combine small functions into one pipeline (right-to-left)
const compose = (...fns) => (x) => fns.reduceRight((acc, fn) => fn(acc), x);
const double = (x) => x * 2;
const addOne = (x) => x + 1;
const square = (x) => x * x;

const pipeline = compose(square, addOne, double); // square(addOne(double(x)))
console.log("compose(square, addOne, double)(3):", pipeline(3)); // double(3)=6, addOne(6)=7, square(7)=49

console.log("\n=== Done ===");
