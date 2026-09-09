/**
 * array-methods-practice.js
 * Run with: node array-methods-practice.js
 *
 * Demonstrates: creating arrays, mutating vs non-mutating methods,
 * searching, reduce patterns, iteration protocol, and 5 classic
 * interview mini-problems (flatten, dedupe, chunk, groupBy, sortBy).
 * See ../17-array-methods-reference.md for the full explanation.
 */

// ---------------------------------------------------------------------------
// 1. Creating arrays
// ---------------------------------------------------------------------------
console.log("=== Creating Arrays ===");
console.log(Array.of(7));                          // [7]
console.log(Array.from("hello"));                    // ["h","e","l","l","o"]
console.log(Array.from(new Set([1, 2, 2, 3])));      // [1, 2, 3]
console.log(Array.from({ length: 5 }, (_, i) => i * 2)); // [0, 2, 4, 6, 8]
console.log(Array.isArray([1, 2]), Array.isArray("x")); // true false


// ---------------------------------------------------------------------------
// 2. Adding / removing (mutating)
// ---------------------------------------------------------------------------
console.log("\n=== Adding/Removing (Mutating) ===");
const stack = [1, 2];
stack.push(3, 4);
console.log("after push:", stack);   // [1, 2, 3, 4]
console.log("pop:", stack.pop(), "->", stack); // 4 -> [1, 2, 3]
console.log("shift:", stack.shift(), "->", stack); // 1 -> [2, 3]
stack.unshift(0);
console.log("after unshift:", stack); // [0, 2, 3]

const letters = ["a", "b", "c", "d", "e"];
const removed = letters.splice(1, 2, "X", "Y", "Z"); // remove 2 from index 1, insert 3
console.log("splice result:", letters, "removed:", removed);
// letters: ["a","X","Y","Z","d","e"], removed: ["b","c"]

const truncateMe = [1, 2, 3, 4, 5];
truncateMe.length = 2;
console.log("length truncation:", truncateMe); // [1, 2]


// ---------------------------------------------------------------------------
// 3. Non-mutating transforms
// ---------------------------------------------------------------------------
console.log("\n=== Non-Mutating Transforms ===");
const nums = [1, 2, 3, 4, 5];
console.log("map (double):", nums.map((n) => n * 2));       // [2,4,6,8,10]
console.log("filter (even):", nums.filter((n) => n % 2 === 0)); // [2, 4]
console.log("flatMap:", [1, 2, 3].flatMap((n) => [n, n * 10])); // [1,10,2,20,3,30]
console.log("flat(2):", [1, [2, [3, [4]]]].flat(2));         // [1, 2, 3, [4]]
console.log("slice:", nums.slice(1, 3));                      // [2, 3]
console.log("concat:", [1, 2].concat([3, 4], 5));              // [1,2,3,4,5]
console.log("join:", ["a", "b", "c"].join("-"));                // "a-b-c"
console.log("original untouched:", nums);                       // [1,2,3,4,5]


// ---------------------------------------------------------------------------
// 4. Reordering / filling (mutating) — including the sort() trap
// ---------------------------------------------------------------------------
console.log("\n=== Reordering/Filling (Mutating) — sort() trap ===");
console.log("WRONG (no comparator):", [10, 1, 2].sort());       // [1, 10, 2] -- lexicographic trap
console.log("RIGHT (with comparator):", [10, 1, 2].sort((a, b) => a - b)); // [1, 2, 10]

const toReverse = [1, 2, 3];
toReverse.reverse();
console.log("reverse (mutated):", toReverse); // [3, 2, 1]

const toFill = [1, 2, 3, 4, 5];
toFill.fill(0, 1, 3);
console.log("fill:", toFill); // [1, 0, 0, 4, 5]

const toCopyWithin = [1, 2, 3, 4, 5];
toCopyWithin.copyWithin(0, 3);
console.log("copyWithin:", toCopyWithin); // [4, 5, 3, 4, 5]


// ---------------------------------------------------------------------------
// 5. Searching
// ---------------------------------------------------------------------------
console.log("\n=== Searching ===");
const users = [{ id: 1, name: "A" }, { id: 2, name: "B" }, { id: 3, name: "C" }];
console.log("find:", users.find((u) => u.id === 2));           // {id:2, name:"B"}
console.log("findIndex:", users.findIndex((u) => u.id === 2)); // 1
console.log("findLast (even):", [1, 2, 3, 4].findLast((n) => n % 2 === 0)); // 4
console.log("includes NaN:", [1, NaN].includes(NaN));           // true
console.log("indexOf NaN (fails):", [1, NaN].indexOf(NaN));      // -1
console.log("some > 2:", [1, 2, 3].some((n) => n > 2));           // true
console.log("every > 0:", [1, 2, 3].every((n) => n > 0));         // true


// ---------------------------------------------------------------------------
// 6. Aggregating with reduce — 3 mental-model examples
// ---------------------------------------------------------------------------
console.log("\n=== reduce() — accumulator mental model ===");

// (a) sum
const total = [10, 20, 30].reduce((sum, n) => sum + n, 0);
console.log("sum:", total); // 60

// (b) group-by-manually
const people = [
  { name: "Alice", dept: "Eng" },
  { name: "Bob", dept: "Sales" },
  { name: "Carol", dept: "Eng" },
];
const byDept = people.reduce((acc, person) => {
  (acc[person.dept] ??= []).push(person);
  return acc;
}, {});
console.log("group-by-manually:", JSON.stringify(byDept));

// (c) build a lookup object from an array
const byId = users.reduce((acc, user) => {
  acc[user.id] = user;
  return acc;
}, {});
console.log("lookup table:", byId);

console.log("reduceRight:", [1, 2, 3].reduceRight((acc, n) => acc + "" + n, "")); // "321"


// ---------------------------------------------------------------------------
// 7. Iteration protocol — forEach can't break, entries/keys/values
// ---------------------------------------------------------------------------
console.log("\n=== forEach cannot break/return-out ===");
[1, 2, 3, 4].forEach((n) => {
  if (n === 2) return; // only skips THIS iteration
  console.log("forEach visited:", n);
});
console.log("(notice: 2 was skipped, but 3 and 4 still ran — forEach never stopped)");

console.log("\n=== entries/keys/values ===");
for (const [index, value] of ["a", "b", "c"].entries()) {
  console.log("entries:", index, value);
}
for (const index of ["a", "b", "c"].keys()) {
  console.log("keys:", index);
}
for (const value of ["a", "b", "c"].values()) {
  console.log("values:", value);
}


// ---------------------------------------------------------------------------
// 8. Classic interview mini-problems
// ---------------------------------------------------------------------------
console.log("\n=== Mini-Problem 1: Flatten a nested array ===");
function flatten(arr) {
  return arr.reduce((flat, item) => {
    return flat.concat(Array.isArray(item) ? flatten(item) : item);
  }, []);
}
console.log(flatten([1, [2, 3, [4, [5, 6]]], 7])); // [1,2,3,4,5,6,7]

console.log("\n=== Mini-Problem 2: Remove duplicates ===");
function dedupe(arr) {
  return [...new Set(arr)];
}
console.log(dedupe([1, 2, 2, 3, 3, 3, 4])); // [1,2,3,4]

function dedupeBy(arr, key) {
  const seen = new Set();
  return arr.filter((item) => {
    if (seen.has(item[key])) return false;
    seen.add(item[key]);
    return true;
  });
}
console.log(dedupeBy([{ id: 1 }, { id: 2 }, { id: 1 }], "id")); // [{id:1},{id:2}]

console.log("\n=== Mini-Problem 3: Chunk an array into groups of N ===");
function chunk(arr, size) {
  const result = [];
  for (let i = 0; i < arr.length; i += size) {
    result.push(arr.slice(i, i + size));
  }
  return result;
}
console.log(chunk([1, 2, 3, 4, 5, 6, 7], 3)); // [[1,2,3],[4,5,6],[7]]

console.log("\n=== Mini-Problem 4: Group array of objects by a property ===");
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
console.log("(modern built-in alternative: Object.groupBy(orders, o => o.status) — see file 15)");

console.log("\n=== Mini-Problem 5: Sort an array of objects by a property ===");
const peopleToSort = [
  { name: "Carol", age: 25 },
  { name: "Alice", age: 35 },
  { name: "Bob", age: 30 },
];
console.log(
  "sorted by age asc:",
  [...peopleToSort].sort((a, b) => a.age - b.age).map((p) => p.name)
); // ["Carol", "Bob", "Alice"]
