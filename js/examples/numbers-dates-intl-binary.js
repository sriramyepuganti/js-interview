// Run with: node numbers-dates-intl-binary.js
// Companion to js/20-numbers-dates-intl-and-binary-data.md

// ---------------------------------------------------------------------------
// 1. Number precision, NaN, Infinity
// ---------------------------------------------------------------------------
console.log("--- Number precision ---");
console.log(0.1 + 0.2);                              // Expected: 0.30000000000000004
console.log(0.1 + 0.2 === 0.3);                      // Expected: false
console.log(Math.abs(0.1 + 0.2 - 0.3) < Number.EPSILON); // Expected: true
console.log(Number.MAX_SAFE_INTEGER);                // Expected: 9007199254740991
console.log(9007199254740993 === 9007199254740992);  // Expected: true (both round to same float)
console.log(Number.isSafeInteger(Number.MAX_SAFE_INTEGER + 1)); // Expected: false

console.log(isNaN("abc"));         // Expected: true  (coerces first)
console.log(Number.isNaN("abc"));  // Expected: false (no coercion)
console.log(Number.isNaN(NaN));    // Expected: true

console.log(1 / 0);   // Expected: Infinity
console.log(-1 / 0);  // Expected: -Infinity
console.log(0 / 0);   // Expected: NaN

// ---------------------------------------------------------------------------
// 2. BigInt
// ---------------------------------------------------------------------------
console.log("\n--- BigInt ---");
const big = 9007199254740993n;
console.log(big);              // Expected: 9007199254740993n (exact, unlike the Number version above)
console.log(big + 1n);         // Expected: 9007199254740994n
console.log(typeof 10n);       // Expected: "bigint"
console.log(10n + 20n);        // Expected: 30n

try {
  console.log(10n + 10); // eslint-disable-line
} catch (e) {
  console.log("Mixing error:", e.message); // Expected: Cannot mix BigInt and other types...
}
console.log(10n + BigInt(10)); // Expected: 20n
console.log(Number(10n) + 10); // Expected: 20
console.log(10n === 10);       // Expected: false
console.log(10n == 10);        // Expected: true

// ---------------------------------------------------------------------------
// 3. Date core methods
// ---------------------------------------------------------------------------
console.log("\n--- Date ---");
const specific = new Date(2026, 8, 9); // Sep 9 2026 — month is 0-indexed (8 = September)
console.log(specific.getFullYear()); // Expected: 2026
console.log(specific.getMonth());    // Expected: 8
console.log(specific.getDate());     // Expected: 9
console.log(specific.getDay());      // Expected: 3 (Wednesday)

const fromISO = new Date("2026-09-09T10:00:00Z");
console.log(fromISO.toISOString());  // Expected: 2026-09-09T10:00:00.000Z

const oneDayLater = new Date(specific.getTime() + 24 * 60 * 60 * 1000);
console.log(oneDayLater.getDate());  // Expected: 10
console.log(specific < oneDayLater); // Expected: true
console.log(specific.getTime() === new Date(2026, 8, 9).getTime()); // Expected: true
console.log(specific === new Date(2026, 8, 9)); // Expected: false (different object refs)

// ---------------------------------------------------------------------------
// 4. Intl — locale-aware formatting
// ---------------------------------------------------------------------------
console.log("\n--- Intl ---");
const usd = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });
console.log(usd.format(1234.5)); // Expected: $1,234.50

const inr = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" });
console.log(inr.format(1234567.89)); // Expected: ₹12,34,567.89

const dateFmt = new Intl.DateTimeFormat("en-GB", { dateStyle: "long" });
console.log(dateFmt.format(new Date(2026, 8, 9))); // Expected: 9 September 2026

const rtf = new Intl.RelativeTimeFormat("en", { numeric: "auto" });
console.log(rtf.format(-1, "day")); // Expected: yesterday
console.log(rtf.format(3, "day"));  // Expected: in 3 days

const words = ["café", "cafe", "cafz"];
console.log([...words].sort(new Intl.Collator("en").compare)); // locale-correct sort

// ---------------------------------------------------------------------------
// 5. TypedArray, ArrayBuffer, DataView
// ---------------------------------------------------------------------------
console.log("\n--- TypedArray / ArrayBuffer / DataView ---");
const buffer = new ArrayBuffer(4);
const int32View = new Int32Array(buffer);
int32View[0] = 65;

const byteView = new Uint8Array(buffer);
console.log(byteView); // Expected: Uint8Array(4) [ 65, 0, 0, 0 ]

const dv = new DataView(buffer);
console.log(dv.getInt32(0, true)); // Expected: 65
console.log(dv.getUint8(0));       // Expected: 65

const floats = new Float64Array([1.5, 2.5, 3.5]);
console.log(floats.length);            // Expected: 3
console.log(floats.map((n) => n * 2)); // Expected: Float64Array(3) [ 3, 5, 7 ]

console.log("\n=== Done. ===");
