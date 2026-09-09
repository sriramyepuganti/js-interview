# 10 — Design Patterns in JavaScript

## Module Pattern

**What is it?** A way to bundle related private state and public methods together, using a closure to hide internals, exposing only what's needed.

**Why invented:** Before ES modules existed (file 09) and before private class fields existed (file 07), this was THE way to fake encapsulation in plain JS.

```js
const CartModule = (function () {
  let items = []; // private — not reachable from outside this IIFE's closure
  return {
    add(item) { items.push(item); },
    getItems() { return [...items]; }, // return a copy, not the real internal array
  };
})();
```

**Real-world usage:** Still seen in legacy codebases, browser globals set up by third-party scripts (e.g., analytics SDKs), and conceptually lives on inside every ES module today (each module file already has this privacy built in natively).

---

## Singleton Pattern

**What is it?** Ensures a class/object has exactly ONE instance across the whole app, and provides a single global access point to it.

**Why invented:** Some things genuinely should only exist once — a single database connection pool, a single global app configuration object, a single logging service — to avoid wasted resources or inconsistent state if multiple instances existed.

```js
class Logger {
  static #instance;
  constructor() {
    if (Logger.#instance) return Logger.#instance; // if one already exists, return that instead
    this.logs = [];
    Logger.#instance = this;
  }
  log(msg) { this.logs.push(msg); console.log(msg); }
}

const a = new Logger();
const b = new Logger();
console.log(a === b); // true — same instance every time
```

**Real-world usage:** Redux/Zustand stores (one store per app), a single Axios instance with shared config/interceptors, database connection managers.

**Caution (senior-level nuance):** overused singletons create hidden global state and make unit testing harder (shared mutable state across tests). Modern code often prefers dependency injection over singletons for testability.

---

## Factory Pattern

**What is it?** A function (or method) that creates and returns objects, hiding the decision of exactly *which* object/class to instantiate behind a single creation interface.

**Why invented:** avoids repeating `new SpecificClass(...)` logic all over the codebase, and lets the creation logic decide dynamically what to build based on input — the caller doesn't need to know the concrete class.

```js
function createShape(type) {
  switch (type) {
    case "circle": return { type, area: (r) => Math.PI * r * r };
    case "square": return { type, area: (s) => s * s };
    default: throw new Error(`Unknown shape: ${type}`);
  }
}
const shape = createShape("circle");
```

**Real-world usage:** UI component factories (rendering different component types from a config-driven schema), creating different API client instances per environment (dev/staging/prod), error object factories.

---

## Observer / Pub-Sub Pattern (and how it relates to RxJS)

**What is it?** A pattern where an object (the "subject"/"publisher") maintains a list of dependents ("observers"/"subscribers") and notifies them automatically whenever something changes — without the subject needing to know any details about who's listening.

**Why invented:** to decouple the thing producing events from the things reacting to them. The producer doesn't need to know how many listeners exist or what they do; listeners can be added/removed freely at runtime.

```js
class PubSub {
  #listeners = {};
  on(event, callback) {
    (this.#listeners[event] ??= []).push(callback);
    return () => this.off(event, callback); // return an "unsubscribe" function
  }
  off(event, callback) {
    this.#listeners[event] = (this.#listeners[event] || []).filter(fn => fn !== callback);
  }
  emit(event, data) {
    (this.#listeners[event] || []).forEach(fn => fn(data));
  }
}

const bus = new PubSub();
const unsubscribe = bus.on("userLoggedIn", (user) => console.log(`Welcome, ${user.name}`));
bus.emit("userLoggedIn", { name: "Sri" }); // "Welcome, Sri"
unsubscribe(); // stop listening
```

### Relating to RxJS concepts you already know

You already know RxJS's `Observable`/`Subject`/`BehaviorSubject` — they're a more powerful, formalized evolution of exactly this pattern:

| Concept | Plain Observer/Pub-Sub | RxJS equivalent |
|---|---|---|
| The thing emitting events | The "subject" in your own PubSub class | `Subject` — same idea: it can `.next(value)` to push to all subscribers, and multiple subscribers get the SAME value at the same time (multicast) |
| A stream that "remembers" its last value for new subscribers | Not built-in — you'd have to manually store + replay the last value yourself | `BehaviorSubject` — automatically stores and immediately gives new subscribers the current/last value |
| Unsubscribing | Your manual `unsubscribe()` function | `.subscribe()` returns a `Subscription` with `.unsubscribe()` |
| A pure "cold" producer that only runs when subscribed to, and can run its own logic (sync or async) per subscriber | Not directly expressible in basic pub-sub | `Observable` — created with `new Observable(observer => {...})`; each `.subscribe()` re-runs the producer function independently unless you multicast it (e.g., wrap in a `Subject`) |
| Transforming/filtering emitted values before delivering | You'd hand-write filtering inside your emit logic | Operators via `.pipe(map(...), filter(...), debounceTime(...))` — composable, reusable transformations on the stream |

**In short:** RxJS's `Subject` behaves almost exactly like the hand-rolled `PubSub` class above (multicasting the same value to many listeners). `BehaviorSubject` adds "always remember the latest value for late subscribers." `Observable` is the more general, "cold" (lazy, per-subscriber) version, and operators (`pipe`) give you a composable way to transform the stream instead of writing that logic by hand inside the emitter.

**Real-world usage:** DOM events themselves are pub-sub (`addEventListener`/`dispatchEvent`), Node's `EventEmitter`, React Context + custom event buses, state management libraries (Redux's store subscription model is pub-sub), and RxJS itself in Angular apps (`HttpClient` returns Observables, reactive forms use Observables under the hood).

---

## Debounce / Throttle (as a pattern)

Covered in depth with implementations in file 11 and `examples/debounce-throttle.js`. In short:
- **Debounce**: wait until activity STOPS for a period, then run once (e.g., search-as-you-type — wait until the user stops typing).
- **Throttle**: run at most once per fixed interval, no matter how often the event fires (e.g., limiting scroll-handler execution to once every 100ms).

---

## Currying and Function Composition

**What is it?**
**Currying** transforms a function taking multiple arguments into a sequence of functions, each taking a single argument (mined directly from the old notes, expanded):
```js
function curry(fn) {
  return function (a) {
    return function (b) {
      return fn(a, b);
    };
  };
}
const sum = (a, b) => a + b;
const curriedSum = curry(sum);
console.log(curriedSum(3)(2)); // 5
```

**Function composition** combines multiple simple functions into one, where the output of one becomes the input of the next:
```js
const compose = (...fns) => (x) => fns.reduceRight((acc, fn) => fn(acc), x);
const double = x => x * 2;
const addOne = x => x + 1;
const doubleThenAddOne = compose(addOne, double);
console.log(doubleThenAddOne(5)); // double(5)=10, then addOne(10)=11
```

**Why invented:** both are core ideas from functional programming aimed at building complex behavior out of small, single-purpose, reusable, testable functions — instead of writing one big function that does everything. Currying specifically enables "partial application" — pre-filling some arguments and getting back a specialized function for later (similar in spirit to `bind`, file 03).

**Real-world usage:** Redux middleware (`store => next => action => {...}` IS a curried function), functional utility libraries (Lodash/Ramda's `curry`), React's `connect()(Component)` pattern, RxJS `pipe()` (composition of operators).

## How to explain in an interview (simple English)

"Design patterns are just proven, reusable solutions to common problems. The module pattern uses a closure to hide private data. Singleton makes sure only one instance of something ever exists. Factory hides the 'which class do I create' decision behind one function. Observer/pub-sub lets one thing broadcast events to many listeners without knowing who they are — RxJS's Subject and BehaviorSubject are just more powerful, built-in versions of that same idea, where BehaviorSubject additionally remembers the last emitted value for anyone who subscribes late. Currying and composition are about building complex logic out of small, single-argument, reusable functions instead of one big function."
