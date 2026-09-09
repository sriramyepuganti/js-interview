# 02 — Closures

## What is it?

A closure is a function that "remembers" the variables from the scope it was created in, even after that outer scope has finished running.

```js
function outer() {
  let count = 0;
  return function inner() {
    count++;
    return count;
  };
}

const counter = outer(); // outer() has already finished running
console.log(counter()); // 1
console.log(counter()); // 2
console.log(counter()); // 3 — count is still alive, remembered by inner()
```

Normally you'd expect `count` to disappear once `outer()` returns. It doesn't — because `inner` closes over (captures a reference to) the variable environment of `outer`.

## Why was it invented / what problem does it solve?

Before ES6 classes had `#privateFields`, JavaScript had **no built-in concept of private variables**. Every property on an object was publicly accessible and could be overwritten from outside. Closures were the only mechanism to create true data privacy — a variable that lives in memory, is usable by specific functions, but is completely unreachable and untamperable from the outside world.

More generally, closures solve the problem of **preserving state between function calls without using global variables**. Global variables are shared and can be accidentally overwritten by any code; a closure gives a function its own private, persistent "memory."

## Real-world / real-time usage

1. **Data privacy / encapsulation (the original motivation)**
```js
function createBankAccount(initialBalance) {
  let balance = initialBalance; // private — no way to touch this directly from outside

  return {
    deposit(amount) { balance += amount; return balance; },
    withdraw(amount) {
      if (amount > balance) throw new Error("Insufficient funds");
      balance -= amount;
      return balance;
    },
    getBalance() { return balance; }
  };
}

const acc = createBankAccount(100);
acc.deposit(50);
console.log(acc.getBalance()); // 150
console.log(acc.balance); // undefined — can't reach it directly
```

2. **Debounce / throttle** — a timer id or "last called" timestamp needs to persist across multiple calls of the returned function. Closures are exactly how that persistent state is stored (see `examples/debounce-throttle.js`).

3. **Memoization / caching** — a cache object needs to live between calls to the memoized function.

4. **The Module Pattern** — before ES modules existed, developers used an IIFE (Immediately Invoked Function Expression) plus closures to fake "private" module internals while exposing a small public API. This is still used in some libraries and older codebases.
```js
const CounterModule = (function () {
  let count = 0; // private, trapped inside this IIFE's closure
  return {
    increment: () => ++count,
    reset: () => (count = 0),
  };
})();
```

5. **React hooks** rely heavily on closures — every render captures the props/state values available at that point in time via closures (this is why "stale closure" bugs happen in `useEffect`/`useCallback` when dependencies are missed).

## How to explain in an interview (simple English)

"A closure is when a function keeps access to variables from the place it was created, even after that outer function has already returned. It's like the inner function carries a backpack of variables with it wherever it goes. We use this to create private state — a variable nobody outside can touch directly — and to keep values alive between multiple calls, like a counter, a cache, or a debounce timer."

## Common Interview Trap: `var` vs `let` in loops + closures

**The classic question:**
```js
for (var i = 0; i < 3; i++) {
  setTimeout(() => console.log(i), 100);
}
// Output: 3, 3, 3  — NOT 0, 1, 2!
```

**Why:** `var` is function-scoped, not block-scoped. There is only ONE `i` variable shared across all three loop iterations. By the time the `setTimeout` callbacks actually run (after the loop has already finished), `i` has already become `3`. All three closures point to the *same* `i` in memory.

**The fix with `let`:**
```js
for (let i = 0; i < 3; i++) {
  setTimeout(() => console.log(i), 100);
}
// Output: 0, 1, 2
```

**Why this works:** `let` is block-scoped, and the `for` loop spec actually creates a **new binding of `i` for every single iteration**. So each callback closes over its own independent copy of `i`.

**The old-school fix (before `let` existed)** — wrap in an IIFE to force a new scope per iteration:
```js
for (var i = 0; i < 3; i++) {
  (function (capturedI) {
    setTimeout(() => console.log(capturedI), 100);
  })(i);
}
// Output: 0, 1, 2 — same idea, done manually
```

This trap is one of the most commonly asked closure questions because it tests whether you truly understand scoping, not just the definition of "closure."

## Quick Reference

| Concept | What it means |
|---|---|
| Closure | Function + reference to its outer lexical scope's variables |
| Why it exists | Data privacy before private class fields; persistent state without globals |
| Common uses | Debounce/throttle, memoization, module pattern, private counters |
| Classic trap | `var` in a loop shares one variable; `let` creates one per iteration |
