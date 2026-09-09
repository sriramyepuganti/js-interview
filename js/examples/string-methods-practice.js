/**
 * string-methods-practice.js
 * Run with: node string-methods-practice.js
 *
 * Demonstrates: string immutability, searching, extracting, transforming,
 * splitting/joining, and 5 classic interview mini-problems (reverse,
 * palindrome check, char frequency, capitalize words, anagram check).
 * See ../18-string-methods-reference.md for the full explanation.
 */

// ---------------------------------------------------------------------------
// 1. Strings are immutable — the single most important fact
// ---------------------------------------------------------------------------
console.log("=== Strings Are Immutable ===");
const s = "hello";
s.toUpperCase();
console.log("after calling toUpperCase() without capturing:", s); // "hello" — unchanged
const upper = s.toUpperCase();
console.log("captured return value:", upper); // "HELLO"
s[0] = "H"; // silently does nothing
console.log("after attempted index mutation:", s); // "hello"


// ---------------------------------------------------------------------------
// 2. Searching
// ---------------------------------------------------------------------------
console.log("\n=== Searching ===");
console.log("includes:", "Hello World".includes("World"));    // true
console.log("startsWith:", "Hello World".startsWith("Hello")); // true
console.log("endsWith:", "Hello World".endsWith("World"));      // true
console.log("indexOf:", "a-b-c-b".indexOf("b"));                  // 2
console.log("lastIndexOf:", "a-b-c-b".lastIndexOf("b"));          // 6
console.log("search (regex):", "Order #4521".search(/\d+/));       // 7
console.log("match (no /g):", "2024-01-15".match(/\d+/)[0]);        // "2024"
console.log("match (/g):", "2024-01-15".match(/\d+/g));             // ["2024","01","15"]

const matches = [..."2024-01-15".matchAll(/(\d+)/g)];
console.log("matchAll:", matches.map((m) => m[0])); // ["2024","01","15"]


// ---------------------------------------------------------------------------
// 3. Extracting
// ---------------------------------------------------------------------------
console.log("\n=== Extracting ===");
console.log("slice(0,5):", "Hello World".slice(0, 5));   // "Hello"
console.log("slice(-5):", "Hello World".slice(-5));        // "World"
console.log("substring(-5):", "Hello World".substring(-5)); // "Hello World" (negative -> 0)
console.log("substring(5,0):", "Hello World".substring(5, 0)); // "Hello" (args swapped)
console.log("slice(5,0):", "Hello World".slice(5, 0));            // "" (no swap)
console.log("charAt(1):", "Hello".charAt(1));                       // "e"
console.log("bracket [1]:", "Hello"[1]);                              // "e"
console.log("charCodeAt('A'):", "A".charCodeAt(0));                  // 65
console.log("codePointAt(emoji):", "\u{1F600}".codePointAt(0));       // 128512
console.log("at(-1):", "Hello".at(-1));                                  // "o"


// ---------------------------------------------------------------------------
// 4. Transforming
// ---------------------------------------------------------------------------
console.log("\n=== Transforming ===");
console.log("toUpperCase:", "Hello".toUpperCase()); // "HELLO"
console.log("toLowerCase:", "Hello".toLowerCase()); // "hello"
console.log("trim:", JSON.stringify("  hello  ".trim()));       // "hello"
console.log("trimStart:", JSON.stringify("  hello  ".trimStart())); // "hello  "
console.log("trimEnd:", JSON.stringify("  hello  ".trimEnd()));     // "  hello"

console.log("padStart zero-pad:", "5".padStart(3, "0")); // "005"
console.log("padded table row:", "Name".padEnd(10) + "Score");
console.log("padded table row:", "Bob".padEnd(10) + "42");

const minutes = 5, seconds = 3;
console.log("clock format:", `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`); // "05:03"

console.log("repeat:", "ab".repeat(3)); // "ababab"

console.log("replace (first only):", "foo bar foo".replace("foo", "X"));      // "X bar foo"
console.log("replaceAll:", "foo bar foo".replaceAll("foo", "X"));                // "X bar X"
console.log("replace with /g regex:", "foo bar foo".replace(/foo/g, "X"));       // "X bar X"
console.log(
  "replace with function:",
  "2024-01-15".replace(/(\d+)-(\d+)-(\d+)/, (m, y, mo, d) => `${d}/${mo}/${y}`)
); // "15/01/2024"

console.log("concat:", "Hello".concat(" ", "World")); // "Hello World"


// ---------------------------------------------------------------------------
// 5. Splitting / joining
// ---------------------------------------------------------------------------
console.log("\n=== Splitting/Joining ===");
console.log("split:", "a,b,c".split(","));               // ["a","b","c"]
console.log("split with limit:", "a,b,c".split(",", 2));  // ["a","b"]
console.log("split on regex:", "one   two  three".split(/\s+/)); // ["one","two","three"]

const csv = "Alice,30,Engineer";
const parts = csv.split(",");
const rebuilt = parts.join(",");
console.log("round trip split->join:", rebuilt === csv, rebuilt); // true "Alice,30,Engineer"


// ---------------------------------------------------------------------------
// 6. String.raw — brief mention
// ---------------------------------------------------------------------------
console.log("\n=== String.raw ===");
console.log("normal template:", `Line1\nLine2`);
console.log("String.raw:", String.raw`Line1\nLine2`); // literal backslash-n, not a real newline


// ---------------------------------------------------------------------------
// 7. Classic interview mini-problems
// ---------------------------------------------------------------------------
console.log("\n=== Mini-Problem 1: Reverse a string ===");
function reverseString(str) {
  return str.split("").reverse().join("");
}
console.log(reverseString("hello")); // "olleh"

console.log("\n=== Mini-Problem 2: Palindrome check ===");
function isPalindrome(str) {
  const cleaned = str.toLowerCase().replace(/[^a-z0-9]/g, "");
  const reversed = cleaned.split("").reverse().join("");
  return cleaned === reversed;
}
console.log(isPalindrome("A man, a plan, a canal: Panama")); // true
console.log(isPalindrome("hello"));                            // false

console.log("\n=== Mini-Problem 3: Character frequency count ===");
function charFrequency(str) {
  return str.split("").reduce((freq, char) => {
    freq[char] = (freq[char] || 0) + 1;
    return freq;
  }, {});
}
console.log(charFrequency("hello")); // { h:1, e:1, l:2, o:1 }

console.log("\n=== Mini-Problem 4: Capitalize first letter of every word ===");
function capitalizeWords(str) {
  return str
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
}
console.log(capitalizeWords("hello there world")); // "Hello There World"

console.log("\n=== Mini-Problem 5: Anagram check ===");
function isAnagram(a, b) {
  const normalize = (str) =>
    str.toLowerCase().replace(/[^a-z0-9]/g, "").split("").sort().join("");
  return normalize(a) === normalize(b);
}
console.log(isAnagram("listen", "silent"));       // true
console.log(isAnagram("Dormitory", "Dirty Room")); // true
console.log(isAnagram("hello", "world"));           // false
