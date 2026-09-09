# 01 — Execution Context, Scope, Hoisting, and TDZ

## Execution Context

**What is it?**
An execution context is the "environment" JS creates to run your code — it holds your variables, functions, and the value of `this` for that piece of code.

**Why was it invented / what problem does it solve?**
JS needs a systematic way to know *which variables exist*, *where to find them*, and *what `this` means* at any point in the program. Without a formal context model, the engine couldn't manage memory, scoping, or execution order predictably.

**Types of execution context:**
- **Global Execution Context (GEC)** — created once, when the script starts running. It creates the global object (`window` in browsers, `global`/`globalThis` in Node) and sets `this` at the top level.
- **Function Execution Context (FEC)** — created every time a function is called. Each call gets its own fresh context (its own local variables, arguments, `this`).
- **Block/Eval Execution Context** — created for blocks `{ ... }` when they contain `let`/`const`/`class` declarations (introduced with ES6 block scoping).

Every execution context is created in two phases:
1. **Creation (memory/hoisting) phase** — the engine scans the code and allocates memory for variables and functions before running anything.
   - `var` variables → set to `undefined`.
   - `let`/`const` variables → allocated but left "uninitialized" (this is the TDZ, explained below).
   - Function declarations → the *entire function* is hoisted (usable before its line).
2. **Execution phase** — code runs line by line, assigning actual values.

```js
console.log(a); // undefined (not an error) — memory phase already reserved "a"
console.log(fun()); // works — function declarations are fully hoisted
var a = 10;
function fun() { return "hi"; }
```

**Real-world usage:** Every single function call, every module load, every `<script>` tag execution creates a context. Understanding this is how you reason about hoisting bugs, "temporal dead zone" errors, and why some code "works before it's declared."

**How to explain in an interview (simple English):**
"Before JS runs your code line by line, it does a quick pass to set up memory for variables and functions — that's the execution context. Every function call gets its own context, and there's one global context for the whole file. This two-phase process (memory setup, then execution) is why `var` and function declarations seem to 'exist' before the line where you wrote them."

---

## The Call Stack

**What is it?**
A stack (LIFO — last in, first out) data structure that tracks which function is currently running and what called it.

**Why invented?**
JS is single-threaded — it can only do one thing at a time. The call stack is how the engine keeps track of "where to return to" once the current function finishes, enabling nested function calls to work correctly.

```js
function a() { b(); }
function b() { c(); }
function c() { console.log("top of stack"); }
a();
// stack grows: a -> b -> c
// then unwinds: c returns -> b returns -> a returns
```

If a function calls itself (or another function) endlessly without a base case, the stack keeps growing until you get `RangeError: Maximum call stack size exceeded` ("stack overflow").

**Real-world usage:** Reading a stack trace in DevTools/error logs — from top (innermost/most recent call) to bottom (where it all started) — is literally reading the call stack at the moment of the error.

**How to explain in an interview:** "The call stack is like a stack of plates — each function call gets placed on top, and when it finishes, it's popped off. JS can only execute what's on top of the stack, which is why JS is single-threaded: one call stack, one thing at a time."

---

## Recursion and Tail Call Optimization

**What is it?**
Recursion is a function calling itself (directly or indirectly) to break a problem into smaller sub-problems, until a "base case" stops the calls. Every recursive call pushes a brand-new frame onto the call stack above, so recursion depth is limited by stack size. "Tail call optimization" (TCO/proper tail calls) is a theoretical compiler technique where, IF a function's very last action is simply `return someOtherCall(...)` (nothing left to do after it returns), the engine can reuse the current stack frame instead of pushing a new one — making that specific recursive pattern run in constant stack space, no matter how deep it goes.

```js
// Plain (non-tail) recursion — each call has work left to do AFTER the recursive call returns
function factorial(n) {
  if (n <= 1) return 1;
  return n * factorial(n - 1); // multiplication happens AFTER factorial(n-1) returns — not a tail call
}
console.log(factorial(5)); // 120

// Tail-call FORM — the recursive call is the last thing executed, nothing pending after it
function factorialTail(n, acc = 1) {
  if (n <= 1) return acc;
  return factorialTail(n - 1, n * acc); // the recursive call IS the return value — a proper tail call
}
console.log(factorialTail(500)); // Infinity (correct math-wise, small enough depth to not overflow)

// Deep tail-form recursion STILL blows the stack on V8/Node — proving TCO isn't actually applied:
try {
  console.log(factorialTail(100000));
} catch (e) {
  console.log(e.message); // "Maximum call stack size exceeded" — even though this IS a tail call in form!
}
```

**Why was it invented / what problem does it solve?**
Recursion is often the most natural way to express problems that are themselves recursively structured — tree/graph traversal, parsing, `flatMap`-style flattening — but naive recursion risks a stack overflow on deep inputs. Proper tail calls were added to the ES2015 spec specifically to make deep, tail-recursive functions safe to write without an artificial depth limit, as an alternative to manually rewriting recursion into an iterative loop.

**The critical interview-relevant catch:** proper tail calls are in the ECMAScript spec, but **V8 (Chrome, Node.js) has never implemented them**, and never plans to — only Safari's JavaScriptCore engine actually optimizes tail calls in practice. The `factorialTail(100000)` call above IS written in tail-call form (the recursive call is the literal return value, nothing pending after it), and still throws `RangeError: Maximum call stack size exceeded` on Node, proving the engine isn't reusing the stack frame despite the code being in the "correct" shape for it. This is a well-known, senior-level "gotcha" — knowing that TCO is real in the spec but NOT reliably available in the engine you're most likely running (V8) is more valuable than reciting the spec definition.

**Real-time / real-world usage:** because TCO can't be relied on in Node/Chrome, real code that needs deep "recursion-shaped" logic on large inputs either (a) converts it to an explicit iterative loop with a manual stack/accumulator, or (b) uses trampolining — a pattern where each "recursive call" instead RETURNS a lightweight function/thunk describing the next step, and an outer loop repeatedly invokes it, keeping the actual call stack flat.

```js
// Trampoline pattern — sidesteps the lack of real TCO in V8
function trampoline(fn) {
  return (...args) => {
    let result = fn(...args);
    while (typeof result === "function") result = result(); // keep "bouncing" instead of recursing
    return result;
  };
}
function factorialStep(n, acc = 1) {
  if (n <= 1) return acc;
  return () => factorialStep(n - 1, n * acc); // return a THUNK instead of calling recursively
}
const safeFactorial = trampoline(factorialStep);
console.log(safeFactorial(100000)); // Infinity (overflows numerically, but never overflows the STACK)
```

**How to explain in an interview (simple English):**
"Recursion breaks a problem down by having a function call itself, but every call adds a new frame to the call stack, so very deep recursion can overflow it. The ES2015 spec defines 'proper tail calls' — reusing the stack frame when a recursive call is the very last thing a function does — but V8, the engine behind Chrome and Node, never actually implemented that optimization, so you can't rely on tail-call form alone to make deep recursion stack-safe in JS. In practice, if I need deep recursion-shaped logic, I either convert it to an explicit loop or use a trampoline — returning a function to call next instead of calling it immediately, so an outer loop drives the iteration and the stack never grows."

---

## Lexical Scope and the Scope Chain

**What is it?**
Lexical scope means a variable's accessibility is determined by *where it's physically written* in the code, not by how the function is called. The scope chain is the path the engine follows outward — from the current scope, to its parent, to its parent's parent, all the way to global — when looking up a variable.

**Why invented?**
Programs need a predictable, static way to resolve "which `x` do you mean?" when there are multiple variables with the same name in different scopes. Lexical scoping makes this determinable just by reading the source code (not by tracing runtime call order).

```js
function outer() {
  let x = "outer x";
  function inner() {
    console.log(x); // finds x by walking UP the scope chain to outer()
  }
  inner();
}
outer(); // "outer x"
```

`inner` doesn't have its own `x`, so the engine looks at the scope it was *defined* in (outer), not the scope it was *called* from.

**Real-world usage:** This is the entire mechanism behind closures (see file 02), module-scoped helper variables, and avoiding global namespace pollution.

**How to explain in an interview:** "Scope is decided by where you write the code, not where you call it from. If a variable isn't found in the current function, JS looks outward to the function that contains it, then that one's container, and so on until it hits the global scope — that chain of lookups is the scope chain."

---

## var vs let vs const

| Feature | `var` | `let` | `const` |
|---|---|---|---|
| Scope | Function-scoped | Block-scoped | Block-scoped |
| Hoisting | Hoisted, initialized to `undefined` | Hoisted, but in TDZ until declaration line | Hoisted, but in TDZ until declaration line |
| Re-declaration | Allowed | Not allowed in same scope | Not allowed in same scope |
| Re-assignment | Allowed | Allowed | Not allowed (but object/array *contents* can still mutate) |
| Attaches to global object | Yes (`window.a`) | No | No |

```js
const person = { name: "Sri" };
person.name = "Ram"; // ✅ allowed — we're mutating the object, not reassigning the binding
person = {};          // ❌ TypeError — reassigning a const
```

**Why `let`/`const` were invented:** `var`'s function-scoping (ignoring block boundaries like `if`/`for`) caused real bugs — variables "leaking" out of `if` blocks or loops and colliding with each other. ES6 introduced block scoping to match how most other languages (and how developers intuitively think) work.

```js
if (true) {
  var leaked = "I'm visible outside!";
}
console.log(leaked); // "I'm visible outside!" — var doesn't respect the block

if (true) {
  let notLeaked = "I'm block-scoped";
}
console.log(notLeaked); // ReferenceError — correctly scoped to the if-block
```

**Real-world usage:** Modern style guides (Airbnb, Google) ban `var` entirely — use `const` by default, `let` when reassignment is needed.

**How to explain in an interview:** "`var` is old-school and scoped to the whole function, which caused bugs with loops and if-blocks. `let` and `const` fixed that by being block-scoped — they only exist inside the `{ }` they were declared in. Use `const` unless you know you need to reassign, then use `let`."

---

## Hoisting

**What is it?**
Hoisting is the behavior where variable and function *declarations* are processed during the memory-creation phase, before the code actually executes — making them "available" earlier than the line they're written on (with caveats).

**Why does it exist?**
It's a side effect of the two-phase execution model described above — it's not really a deliberate "feature" so much as a consequence of how JS sets up memory ahead of time. Function declaration hoisting specifically is useful because it lets you organize helper functions below the code that uses them (readability), and mutually recursive functions can call each other regardless of order.

```js
sayHi(); // "hi" — function declarations are fully hoisted
function sayHi() { console.log("hi"); }

console.log(typeof greet); // "undefined" (var is hoisted but not the assignment)
var greet = function() { console.log("hello"); };
```

**Real-world usage / trap:** Interviewers love testing whether you know `var` is hoisted as `undefined` (no error), but `let`/`const` throw a `ReferenceError` if accessed before declaration (TDZ, below). Function *expressions* (`var fn = function(){}`) are NOT hoisted with their value, only their `var` declaration.

**How to explain in an interview:** "Hoisting means JS sets aside memory for variables and functions before running any code. `var` variables get hoisted and set to `undefined`, so using them early doesn't crash — it just gives `undefined`. Function declarations are hoisted with their full body, so you can call them before they appear in the file. `let`/`const` are technically hoisted too but stay in a 'temporal dead zone' where touching them throws an error."

---

## Temporal Dead Zone (TDZ)

**What is it?**
The TDZ is the period between entering a scope (where a `let`/`const` variable is hoisted) and the line where it's actually declared. During that window, the variable exists but accessing it throws a `ReferenceError`.

**Why was it invented?**
It's a deliberate safety net. `var`'s silent `undefined` hoisting hid real bugs (using a variable "too early" gave no warning). The TDZ makes that mistake loud and immediate — it forces you to declare before use, catching bugs at the earliest possible point.

```js
{
  console.log(myLet); // ReferenceError: Cannot access 'myLet' before initialization
  let myLet = 5;
}
```

**Real-world usage:** You'll hit TDZ errors in real code when you accidentally reference a `let`/`const` variable (often a `class`, since classes are also TDZ'd) before its declaration line, e.g., in a big file where declarations aren't near their usage.

**How to explain in an interview:** "TDZ is the gap between when a `let`/`const` variable is hoisted and when it's actually initialized with a value. If you try to use it during that gap, JS throws an error instead of silently giving you `undefined`, like `var` would. It's there to catch bugs early."

---

## Quick Summary Table

| Concept | One-liner |
|---|---|
| Execution Context | The environment (variables + `this`) created to run a piece of code |
| Call Stack | Tracks which function is currently executing, LIFO order |
| Lexical Scope | Variable visibility determined by where code is *written* |
| Scope Chain | The lookup path outward through parent scopes to find a variable |
| Hoisting | Declarations processed before execution starts |
| TDZ | The window where a hoisted `let`/`const` exists but can't be touched yet |
