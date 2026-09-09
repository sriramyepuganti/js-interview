/**
 * latest-js-features.js
 * Run with: node latest-js-features.js
 *
 * Demonstrates ES2023–ES2025 features: toSorted/toReversed/with (ES2023),
 * Object.groupBy/Map.groupBy (ES2024), and the new Set composition methods (ES2025).
 * See ../15-latest-js-features.md for the full explanation of each feature.
 *
 * Node version notes (checked against Node 22.5.1):
 *   - toSorted/toReversed/toSpliced/with  -> requires Node 20+
 *   - Object.groupBy / Map.groupBy        -> requires Node 21+
 *   - Set.prototype.union/intersection/etc -> requires Node 22+
 * If your Node version is older than the above, the corresponding section
 * below will throw a TypeError ("... is not a function") — that's expected,
 * not a bug in this file.
 */

// ---------------------------------------------------------------------------
// 1. Non-mutating array methods: toSorted, toReversed, with (ES2023)
// ---------------------------------------------------------------------------
console.log("=== toSorted / toReversed / with (ES2023, Node 20+) ===");

const original = [3, 1, 4, 1, 5, 9, 2, 6];

const sorted = original.toSorted((a, b) => a - b);
console.log("original:", original); // [3, 1, 4, 1, 5, 9, 2, 6]  <- untouched!
console.log("sorted (new array):", sorted); // [1, 1, 2, 3, 4, 5, 6, 9]

const reversed = original.toReversed();
console.log("reversed (new array):", reversed); // [6, 2, 9, 5, 1, 4, 1, 3]
console.log("original still untouched:", original); // [3, 1, 4, 1, 5, 9, 2, 6]

const replaced = original.with(0, 100); // like original[0] = 100, but non-mutating
console.log("with(0, 100) (new array):", replaced); // [100, 1, 4, 1, 5, 9, 2, 6]
console.log("original still untouched:", original); // [3, 1, 4, 1, 5, 9, 2, 6]

// Why this matters: in React/Redux you must never mutate state directly.
// The old way required spreading/cloning manually:
const oldWaySorted = [...original].sort((a, b) => a - b); // works, but easy to forget the [...spread]
console.log("old-way equivalent of toSorted:", oldWaySorted); // [1, 1, 2, 3, 4, 5, 6, 9]


// ---------------------------------------------------------------------------
// 2. Object.groupBy and Map.groupBy (ES2024, Node 21+)
// ---------------------------------------------------------------------------
console.log("\n=== Object.groupBy / Map.groupBy (ES2024, Node 21+) ===");

const orders = [
  { id: 1, status: "pending", total: 50 },
  { id: 2, status: "shipped", total: 20 },
  { id: 3, status: "pending", total: 75 },
  { id: 4, status: "delivered", total: 30 },
  { id: 5, status: "shipped", total: 15 },
];

// Object.groupBy: best when group keys are plain strings.
const byStatus = Object.groupBy(orders, (order) => order.status);
console.log("Object.groupBy result:");
console.log(byStatus);
// Expected shape:
// {
//   pending:   [{id:1,...}, {id:3,...}],
//   shipped:   [{id:2,...}, {id:5,...}],
//   delivered: [{id:4,...}]
// }

// Map.groupBy: safe for non-string keys too (here we group by a number: total >= 50 -> true/false).
const byBigOrder = Map.groupBy(orders, (order) => order.total >= 50);
console.log("Map.groupBy result (grouped by boolean key):");
console.log("  true (big orders):", byBigOrder.get(true));   // [{id:1,total:50,...}, {id:3,total:75,...}]
console.log("  false (small orders):", byBigOrder.get(false)); // [{id:2,...}, {id:4,...}, {id:5,...}]

// The old way, before groupBy existed — a manual reduce:
const oldWayGroupBy = orders.reduce((acc, order) => {
  (acc[order.status] ??= []).push(order);
  return acc;
}, {});
console.log("old-way equivalent (manual reduce):");
console.log(oldWayGroupBy); // same shape as byStatus above


// ---------------------------------------------------------------------------
// 3. Set composition methods (ES2025, Node 22+)
// ---------------------------------------------------------------------------
console.log("\n=== Set composition methods (ES2025, Node 22+) ===");

const admins = new Set(["alice", "bob", "carol"]);
const editors = new Set(["bob", "carol", "dave"]);

console.log("admins:", admins);   // Set(3) {'alice','bob','carol'}
console.log("editors:", editors); // Set(3) {'bob','carol','dave'}

console.log("union:", admins.union(editors));
// Expected: Set(4) {'alice','bob','carol','dave'} — everyone in either group

console.log("intersection:", admins.intersection(editors));
// Expected: Set(2) {'bob','carol'} — in both groups

console.log("difference (admins - editors):", admins.difference(editors));
// Expected: Set(1) {'alice'} — admin-only, not also an editor

console.log("symmetricDifference:", admins.symmetricDifference(editors));
// Expected: Set(2) {'alice','dave'} — in exactly one of the two sets, not both

console.log("isSubsetOf:", admins.isSubsetOf(editors));
// Expected: false — "alice" is in admins but not editors

console.log("isSupersetOf:", admins.isSupersetOf(new Set(["bob"])));
// Expected: true — admins contains everything in {"bob"}

console.log("isDisjointFrom:", admins.isDisjointFrom(new Set(["zoe"])));
// Expected: true — no overlap between admins and {"zoe"}

// The old way, before these methods existed — Set -> Array -> filter/spread -> Set:
const oldWayUnion = new Set([...admins, ...editors]);
const oldWayIntersection = new Set([...admins].filter((name) => editors.has(name)));
console.log("old-way union:", oldWayUnion);               // same as admins.union(editors)
console.log("old-way intersection:", oldWayIntersection);  // same as admins.intersection(editors)

console.log("\n=== Done. If any section above threw a TypeError, your Node version ===");
console.log("=== is older than what that feature requires (see version notes at top). ===");
