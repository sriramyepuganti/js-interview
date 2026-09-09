# 03 — `this`, call, apply, bind

## What is `this`?

**What is it?**
`this` is a special keyword whose value is decided by **how a function is called** (its "call-site"), not where it's defined. It refers to the object that is currently "in control" of the function call.

**Why was it invented?**
JS needed a way for a single function (like a method) to work generically across many different objects. Rather than hard-coding which object a function belongs to, `this` lets the *same function* behave differently depending on who calls it — this is the foundation of how object methods, constructors, and event handlers work.

## The Rules for Determining `this` (in priority order)

1. **`new` binding** — when a function is called with `new`, `this` is the newly created object.
2. **Explicit binding** — `call`, `apply`, or `bind` are used to explicitly set `this`.
3. **Implicit binding** — the function is called as a method of an object (`obj.method()`); `this` is that object.
4. **Default binding** — a plain function call (`fn()`) with no context; `this` is `undefined` in strict mode, or the global object (`window`/`global`) in non-strict (sloppy) mode.
5. **Arrow functions have NO `this` of their own** — they inherit `this` lexically from their enclosing scope (see below). Arrow functions are not part of the above 4 rules at all.

```js
function show() { console.log(this); }

show(); // default binding → undefined (strict mode) or window (sloppy)

const obj = { show };
obj.show(); // implicit binding → obj

const bound = show.bind({ id: 1 });
bound(); // explicit binding → { id: 1 }

function Person(name) { this.name = name; } // new binding
const p = new Person("Sri"); // this → the new object being constructed
```

**Real-world usage:** This is exactly why old-style event handlers (`this.handleClick = this.handleClick.bind(this)` in React class components) exist, and why arrow functions became popular for class methods and callbacks — they avoid `this` getting lost.

**How to explain in an interview:** "`this` depends on *how* you call a function, not where you wrote it. If you call it as `obj.fn()`, `this` is `obj`. If you call it plain like `fn()`, `this` is undefined in strict mode. If you use `new`, `this` is the new object being built. And `call`/`apply`/`bind` let you manually decide what `this` should be. Arrow functions break this pattern entirely — they just borrow `this` from whatever scope they were written inside."

---

## Arrow Functions and `this`

**What is it?**
Arrow functions do not have their own `this`. They capture `this` lexically — meaning whatever `this` was in the surrounding code at the time the arrow function was *defined*, that's what it keeps forever.

**Why invented?**
Before arrow functions, a very common bug was losing `this` inside callbacks (e.g., inside `setTimeout`, `.forEach`, event handlers) because those functions get called with default binding, wiping out the outer `this`. Developers had to write `const self = this;` hacks or use `.bind(this)` everywhere. Arrow functions were introduced (partly) to solve this exact pain point.

```js
class Timer {
  constructor() {
    this.seconds = 0;
  }
  start() {
    // Regular function here would lose "this" (would be undefined/global inside setInterval)
    setInterval(() => {
      this.seconds++; // arrow function keeps "this" = the Timer instance
      console.log(this.seconds);
    }, 1000);
  }
}
```

**Real-world usage:** Almost all modern class methods used as callbacks (React event handlers before hooks, array methods with class context) use arrow functions specifically to preserve `this`.

**How to explain in an interview:** "Arrow functions don't have their own `this` — they just look at what `this` was in the code around them when they were created, and keep using that forever. That's why they're great for callbacks inside class methods: they don't lose track of the class instance like a regular function would."

---

## call, apply, bind

**What are they?**
Three built-in methods on every function that let you explicitly control what `this` is when the function runs.

| Method | Invokes immediately? | Arguments format | Returns |
|---|---|---|---|
| `call` | Yes | Listed individually: `fn.call(obj, a, b)` | The function's return value |
| `apply` | Yes | As an array: `fn.apply(obj, [a, b])` | The function's return value |
| `bind` | No | Listed individually: `fn.bind(obj, a, b)` | A NEW function, permanently bound, to call later |

```js
function greet(greeting, name) {
  console.log(`${greeting}, ${name}! this.id = ${this.id}`);
}

greet.call({ id: 1 }, "Hi", "Sri");     // runs immediately
greet.apply({ id: 2 }, ["Hi", "Sri"]);  // runs immediately, args as array
const boundGreet = greet.bind({ id: 3 }, "Hi");
boundGreet("Sri"); // runs later, "Hi" already locked in, "Sri" added now
```

**Why were they invented?**
Because `this` is dynamic (decided at call-time), JS needed an escape hatch to *force* a specific `this` regardless of how the function is eventually called. This is essential for:
- **Borrowing methods** — using an array method on an array-like object (e.g., `arguments`, a `NodeList`).
- **Partial application / currying** — `bind` with extra args pre-fills some parameters.
- **Fixing lost context** — the classic problem of passing `this.method` as a callback and losing `this`.

**Real-world usage:**
```js
// Borrowing Array methods for array-like objects (classic pre-ES6 trick)
function sumArgs() {
  return Array.prototype.slice.call(arguments).reduce((a, b) => a + b, 0);
}

// Fixing lost `this` in old-style class components
class Button {
  constructor() { this.label = "Submit"; this.handleClick = this.handleClick.bind(this); }
  handleClick() { console.log(this.label); }
}
```

**How to explain in an interview:** "`call` and `apply` do the same thing — run a function right now with a specific `this` — the only difference is how you pass arguments: individually for `call`, as an array for `apply`. `bind` is different: instead of running immediately, it gives you back a brand-new function with `this` permanently locked in, which you can call whenever you want."

---

## Implementing call, apply, bind from scratch (polyfills)

This is one of the most common senior-level JS interview tasks — see `examples/this-call-apply-bind.js` for the full runnable versions. Core idea for all three:

```js
Function.prototype.myCall = function (context = globalThis, ...args) {
  context = Object(context); // handle primitives being passed as context
  const fnKey = Symbol("fn"); // avoid overwriting an existing property
  context[fnKey] = this; // "this" here = the function myCall was called on
  const result = context[fnKey](...args); // calling it as context.fn() makes "this" = context
  delete context[fnKey];
  return result;
};
```

The trick behind all three polyfills: **temporarily attach the function as a property of the target object, then call it through that object** — this naturally makes `this` equal to that object, because of the "implicit binding" rule.

---

## The `arguments` Object

**What is it?**
Inside any regular (non-arrow) function, `arguments` is an automatically-available, **array-LIKE** object holding every argument the function was actually called with, by index — including extra arguments beyond the named parameters.

```js
function sum() {
  console.log(arguments);         // [Arguments] { '0': 1, '1': 2, '2': 3 } — looks array-ish...
  console.log(Array.isArray(arguments)); // false — it is NOT a real Array
  console.log(typeof arguments);         // "object"
  console.log(arguments.length);         // 3 — has .length, and is indexable...

  // ...but has NO array methods (.map, .filter, .reduce, etc. all missing):
  console.log(typeof arguments.map);     // "undefined"

  // Convert to a real array to use array methods:
  const args = Array.from(arguments);          // or: [...arguments], or Array.prototype.slice.call(arguments)
  return args.reduce((a, b) => a + b, 0);
}
console.log(sum(1, 2, 3)); // 6

// arguments does NOT exist in arrow functions — they capture the ENCLOSING scope's arguments instead:
function outer() {
  const arrow = () => console.log(arguments[0]); // looks up the scope chain to outer()'s arguments
  arrow();
}
outer("from outer"); // "from outer"

const bareArrow = () => {
  console.log(arguments); // ReferenceError: arguments is not defined — no enclosing function at all
};
// bareArrow(); // would throw

// Non-strict mode: arguments[i] and the matching named parameter are LIVE-LINKED (legacy, surprising)
function legacySync(a) {
  arguments[0] = 99;
  console.log(a); // 99 — changing arguments[0] also changed `a`!
}
legacySync(1);

// Strict mode removes that link — much saner, one more reason to always use it:
function stricterSync(a) {
  "use strict";
  arguments[0] = 99;
  console.log(a); // 1 — unaffected, as you'd expect
}
stricterSync(1);
```

**Why was it invented / what problem does it solve?**
Before rest parameters (`...args`, ES2015), `arguments` was the ONLY built-in way to access all arguments a function received, including ones beyond its named parameters — useful for variadic functions (`Math.max(...)`-style APIs) written before rest syntax existed. It's array-like (not a real array) because it was designed in JS's earliest days purely as a lightweight, positional lookup structure, not a full collection type — and the live-linking to named parameters in non-strict mode was an early design choice that turned out to be a footgun, which is exactly why strict mode disables it and why rest parameters (a real `Array`, no linking, and available in arrow functions) have replaced `arguments` in modern code.

**Real-time / real-world usage:** you'll mostly see `arguments` in OLDER codebases or libraries maintaining broad backward compatibility; modern code almost always prefers rest parameters (`function sum(...nums)`) instead, which gives a real array (all methods available immediately) and works in arrow functions. `arguments` still shows up in interview questions specifically to test whether you know it's array-LIKE (not a real array) and that it's absent in arrow functions.

**How to explain in an interview (simple English):**
"`arguments` is an old, array-like object automatically available inside regular functions, holding every argument passed in — but it's not a real array, so array methods like `.map()` aren't on it directly; you have to convert it first with `Array.from(arguments)` or `[...arguments]`. It doesn't exist inside arrow functions at all — an arrow function looks outward to its enclosing regular function's `arguments` instead, or throws a `ReferenceError` if there isn't one. Rest parameters (`...args`) replaced it in modern code because they give you a real array immediately and work everywhere, including arrow functions."

## Quick Reference

| Rule | Example | `this` becomes |
|---|---|---|
| Default | `fn()` | `undefined` (strict) / global object |
| Implicit | `obj.fn()` | `obj` |
| Explicit | `fn.call(obj)` / `fn.apply(obj)` / `fn.bind(obj)()` | `obj` |
| `new` | `new Fn()` | the new instance |
| Arrow function | (none of the above apply) | inherited from enclosing scope |
