# 18 — String Methods Reference (Practical Guide)

## Why does this file exist?

**The problem it solves:** just like arrays, string methods are used constantly across real code and interviews ("reverse a string," "check for a palindrome," "capitalize words") but there's no single dedicated reference for them in this folder. This file is that reference.

**The single most important fact about strings in JS:**

> **Strings are immutable.** Every string method returns a BRAND NEW string — it never modifies the original string in place, because it CAN'T. There is no such thing as a "mutating" string method.

```js
const s = "hello";
s.toUpperCase();
console.log(s); // "hello" — completely unchanged, toUpperCase() returned a new string we simply didn't keep
const upper = s.toUpperCase(); // you must capture the return value
console.log(upper); // "HELLO"

s[0] = "H"; // silently does nothing (or throws in strict mode) — you cannot mutate a string by index either
console.log(s); // "hello"
```
Keep this in mind for every method below — you're always working with a NEW string.

**Already covered elsewhere — not re-taught here:**
- Regex mechanics (flags, groups, lookaheads) — file 16, "Regular Expressions" section. This file only shows how the regex-related string METHODS are called.
- Tagged template literals in depth — file 16.

---

## Searching

**What problem does this solve?** Checking whether a substring/pattern exists, and where.

### `includes(substring)` / `startsWith(substring)` / `endsWith(substring)`

```js
"Hello World".includes("World");   // true
"Hello World".startsWith("Hello"); // true
"Hello World".endsWith("World");   // true
"Hello World".includes("world");   // false — case-sensitive
```

### `indexOf(substring)` / `lastIndexOf(substring)`

```js
"a-b-c-b".indexOf("b");     // 2 — first occurrence
"a-b-c-b".lastIndexOf("b"); // 6 — last occurrence
"a-b-c".indexOf("z");        // -1 — not found
```

### `search(regex)` — like `indexOf` but takes a regex

```js
"Order #4521".search(/\d+/); // 7 — index where the pattern starts
```

### `match(regex)` / `matchAll(regex)` — extract matches (see file 16 for regex depth)

```js
"2024-01-15".match(/\d+/);        // ["2024", index: 0, ...] — first match only (no /g flag)
"2024-01-15".match(/\d+/g);        // ["2024", "01", "15"] — all matches, but loses group detail

// matchAll requires the /g flag, returns an iterator, each match keeps its own groups:
for (const m of "2024-01-15".matchAll(/(\d+)/g)) {
  console.log(m[0], m.index); // "2024" 0, then "01" 5, then "15" 8
}
```

---

## Extracting

**What problem does this solve?** Pulling out a piece of a string — a substring, a single character, or a character code.

### `slice(start, end)` — supports negative indices

```js
"Hello World".slice(0, 5);  // "Hello"
"Hello World".slice(-5);     // "World" — negative counts from the end
"Hello World".slice(-5, -1); // "Worl"
```

### `substring(start, end)` — the key difference from `slice`

```js
"Hello World".substring(0, 5);   // "Hello" — same result as slice() here
"Hello World".substring(-5);      // "Hello World" — negative treated as 0, NOT counted from the end!
"Hello World".substring(5, 0);    // "Hello" — swaps the args if start > end (slice would return "" instead)
"Hello World".slice(5, 0);         // "" — slice does NOT swap args
```
**This exact difference is commonly asked in interviews:**

| | `slice` | `substring` |
|---|---|---|
| Negative indices | Counted from the end | Treated as `0` |
| `start > end` | Returns `""` | Swaps the two arguments |

**`substr(start, length)` — legacy/deprecated, do not use.** It takes a LENGTH as the second argument instead of an end index, which is a common source of confusion, and it's removed from the web standard (kept only for legacy compatibility). Use `slice()` instead.

### `charAt(index)` vs bracket access

```js
"Hello".charAt(1); // "e"
"Hello"[1];          // "e" — equivalent for in-bounds indices
"Hello".charAt(99);  // "" — out of bounds returns an empty string
"Hello"[99];          // undefined — out of bounds returns undefined instead
```

### `charCodeAt(index)` / `codePointAt(index)` — get the numeric code of a character

```js
"A".charCodeAt(0);   // 65
"😀".charCodeAt(0);   // 55357 — WRONG for emoji/astral characters, because charCodeAt only sees one UTF-16 "code unit" (half of a surrogate pair)
"😀".codePointAt(0);  // 128512 — CORRECT full Unicode code point, handles surrogate pairs properly
```
**Why `codePointAt` exists:** some characters (emoji, many CJK/historical scripts) need TWO UTF-16 code units ("surrogate pairs") to represent. `charCodeAt` only reads one unit at a time; `codePointAt` reads the full character correctly.

### `at(index)` — like array `.at()`, supports negative indices

```js
"Hello".at(-1); // "o" — last character, no more "Hello"[Hello.length - 1]"
"Hello".at(0);   // "H"
```

---

## Transforming

**What problem does this solve?** Producing a modified (new) string — different case, trimmed whitespace, padded, repeated, or with parts replaced.

### `toUpperCase()` / `toLowerCase()`

```js
"Hello".toUpperCase(); // "HELLO"
"Hello".toLowerCase(); // "hello"
```

### `trim()` / `trimStart()` / `trimEnd()`

```js
"  hello  ".trim();      // "hello"
"  hello  ".trimStart(); // "hello  "
"  hello  ".trimEnd();   // "  hello"
```
**Real-world usage:** cleaning up user input from a form field before validating/saving it.

### `padStart(targetLength, padString)` / `padEnd(targetLength, padString)`

```js
"5".padStart(3, "0");   // "005" — classic zero-padding
"7".padStart(2, "0");   // "07"

// Real use case: aligning console output / tabular data
console.log("Name".padEnd(10) + "Score");
console.log("Bob".padEnd(10) + "42");
// Name      Score
// Bob       42

// Formatting a clock display
const minutes = 5, seconds = 3;
console.log(`${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`); // "05:03"
```

### `repeat(count)`

```js
"ab".repeat(3); // "ababab"
"-".repeat(20);  // a quick horizontal rule for console output
```

### `replace(pattern, replacement)` vs `replaceAll(pattern, replacement)`

```js
"foo bar foo".replace("foo", "X");    // "X bar foo" — ONLY the FIRST occurrence, classic trap!
"foo bar foo".replaceAll("foo", "X"); // "X bar X" — ALL occurrences

// With a regex + /g flag, replace() DOES replace all (the /g flag is what does it, not replace() itself):
"foo bar foo".replace(/foo/g, "X"); // "X bar X"

// replaceAll with a STRING pattern (not regex) does NOT need /g at all:
"foo bar foo".replaceAll("foo", "X"); // "X bar X"

// Replacement can also be a function (receives the match, capture groups, offset, full string):
"2024-01-15".replace(/(\d+)-(\d+)-(\d+)/, (match, y, m, d) => `${d}/${m}/${y}`);
// "15/01/2024"
```
**The trap to remember:** `"...".replace("foo", "X")` with a plain STRING pattern only ever replaces the FIRST match — this is one of the most common "gotcha" interview questions. `replaceAll()` (ES2021) exists specifically to fix this without forcing you to reach for a regex just to get the `/g` flag.

### `concat(...strings)` — rarely used in practice

```js
"Hello".concat(" ", "World"); // "Hello World"
// In practice, + and template literals are strongly preferred — concat() is legacy-feeling and less readable:
const a = "Hello", b = "World";
`${a} ${b}`; // preferred
a + " " + b;  // also fine
```

---

## Splitting / Joining

**What problem does this solve?** Breaking a string into pieces (an array), and the reverse — building a string back up from an array.

### `split(separator, limit?)`

```js
"a,b,c".split(",");        // ["a", "b", "c"]
"a,b,c".split(",", 2);      // ["a", "b"] — limit caps how many pieces you get
"one   two  three".split(/\s+/); // ["one", "two", "three"] — split on a regex (any run of whitespace)
"hello".split("");            // ["h","e","l","l","o"] — split into individual characters
```

### Round-tripping with `Array.prototype.join()` (file 17)

```js
const csv = "Alice,30,Engineer";
const parts = csv.split(",");      // ["Alice", "30", "Engineer"]
const rebuilt = parts.join(",");    // "Alice,30,Engineer" — back to the original string
```

---

## `String.raw` — Brief Mention

`String.raw` is a built-in tag function used with tagged template literals (full depth in file 16) that returns the RAW string content, without processing escape sequences like `\n`.

```js
console.log(`Line1\nLine2`);       // Line1
                                     // Line2  — \n is processed as a real newline
console.log(String.raw`Line1\nLine2`); // "Line1\nLine2" — \n stays as literal backslash-n text
```
**Real-world usage:** displaying a Windows file path (`String.raw\`C:\new\test\``) or regex source without every backslash needing to be doubled.

---

## Classic Interview Tasks

### 1. Reverse a string (strings have no `.reverse()` — borrow it from arrays)

```js
function reverseString(str) {
  return str.split("").reverse().join("");
}
console.log(reverseString("hello")); // "olleh"
```

### 2. Check if a string is a palindrome

```js
function isPalindrome(str) {
  const cleaned = str.toLowerCase().replace(/[^a-z0-9]/g, ""); // ignore case/punctuation/spaces
  const reversed = cleaned.split("").reverse().join("");
  return cleaned === reversed;
}
console.log(isPalindrome("A man, a plan, a canal: Panama")); // true
console.log(isPalindrome("hello"));                            // false
```

### 3. Count character frequency

```js
function charFrequency(str) {
  return str.split("").reduce((freq, char) => {
    freq[char] = (freq[char] || 0) + 1;
    return freq;
  }, {});
}
console.log(charFrequency("hello"));
// { h: 1, e: 1, l: 2, o: 1 }
```

### 4. Capitalize the first letter of every word

```js
function capitalizeWords(str) {
  return str
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
}
console.log(capitalizeWords("hello there world")); // "Hello There World"
```

### 5. Check if two strings are anagrams

```js
function isAnagram(a, b) {
  const normalize = (str) =>
    str.toLowerCase().replace(/[^a-z0-9]/g, "").split("").sort().join("");
  return normalize(a) === normalize(b);
}
console.log(isAnagram("listen", "silent")); // true
console.log(isAnagram("Dormitory", "Dirty Room")); // true (spaces/case ignored)
console.log(isAnagram("hello", "world"));    // false
```

---

## How to Explain in an Interview (Simple English)

"The first thing I always mention about strings is that they're immutable — every method I call returns a NEW string, so I have to reuse the return value, not expect the original to change. After that, picking the right method is usually about what shape of answer I need: a boolean (`includes`, `startsWith`, `some regex test`), a position (`indexOf`, `search`), a substring (`slice`), or a fully transformed string (`replace`/`replaceAll`, `toUpperCase`, `trim`). For anything that needs per-character logic — reversing, counting frequency, checking a palindrome — I convert the string to an array with `split("")`, use array methods, then `join("")` back into a string, since strings themselves don't have methods like `.reverse()` or `.map()`."

---

## Quick Summary Table

| Category | Methods |
|---|---|
| Searching | `includes`, `startsWith`, `endsWith`, `indexOf`, `lastIndexOf`, `search`, `match`, `matchAll` |
| Extracting | `slice`, `substring`, ~~`substr`~~ (deprecated), `charAt`, `charCodeAt`, `codePointAt`, `at` |
| Transforming | `toUpperCase`, `toLowerCase`, `trim`/`trimStart`/`trimEnd`, `padStart`/`padEnd`, `repeat`, `replace`, `replaceAll`, `concat` |
| Splitting/joining | `split`, `Array.prototype.join` (file 17) |
| Tagged templates | `String.raw` (full depth in file 16) |
