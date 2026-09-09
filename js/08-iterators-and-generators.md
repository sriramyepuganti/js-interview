# 08 — Iterators and Generators

## The Iterable Protocol

**What is it?**
"Iterable" is a formal contract: any object that implements a method named `Symbol.iterator` (which returns an "iterator" object) can be used in a `for...of` loop, with the spread operator (`...`), and with destructuring.

An **iterator** is an object with a `.next()` method that returns `{ value, done }` each time it's called.

```js
const range = {
  from: 1,
  to: 5,
  [Symbol.iterator]() { // this makes the object "iterable"
    let current = this.from;
    const last = this.to;
    return {
      next() { // this is the "iterator" object itself
        return current <= last
          ? { value: current++, done: false }
          : { value: undefined, done: true };
      }
    };
  }
};

for (const num of range) console.log(num); // 1 2 3 4 5
console.log([...range]); // [1, 2, 3, 4, 5] — spread works too, because it's iterable
```

**Why was it invented?**
Before ES6, only arrays and array-like objects had special iteration support (`for` loops with indices, or `for...in` which iterates keys and is unreliable for arrays). JS needed a **generic, uniform way** for ANY object — custom data structures, strings, Maps, Sets, even infinite sequences — to say "here's how to loop through me," without every consumer needing to know the internal shape of that object.

**Real-world usage:** Arrays, Strings, Maps, Sets, and NodeLists are all built-in iterables. Custom iterables show up when building things like a linked list, a paginated data wrapper, or a custom range/sequence utility.

## Generator Functions

**What is it?**
A generator function (`function*`) is a special function that can **pause** its execution at a `yield` statement and **resume** later, right where it left off — maintaining its own local state between pauses. Calling a generator function doesn't run its body immediately; it returns a generator object (which is both an iterator AND iterable).

```js
function* countTo3() {
  console.log("start");
  yield 1;
  console.log("resumed after 1");
  yield 2;
  console.log("resumed after 2");
  yield 3;
  console.log("done");
}

const gen = countTo3(); // nothing logs yet — body hasn't run
console.log(gen.next()); // logs "start", returns { value: 1, done: false }
console.log(gen.next()); // logs "resumed after 1", returns { value: 2, done: false }
console.log(gen.next()); // logs "resumed after 2", returns { value: 3, done: false }
console.log(gen.next()); // logs "done", returns { value: undefined, done: true }

for (const val of countTo3()) console.log(val); // 1 2 3 — generators are iterable directly
```

**Why were generators invented?**
1. **Writing custom iterators without manual state management** — implementing `[Symbol.iterator]` by hand (like the `range` example above) means manually tracking `current`, `done`, etc. A generator does this automatically — the function's own local variables and "current line" ARE the state.
2. **Lazy evaluation** — you can represent infinite or very large sequences without computing them all upfront, since values are only produced on-demand, one `.next()` call at a time.
3. **Pausable async flow (historical)** — before `async/await` existed, generators + a runner library were used to write async code that "looked synchronous" (this is literally how libraries like `co` worked, and it's the same core idea `redux-saga` still uses).

```js
// Iterable made trivially with a generator instead of manual Symbol.iterator object
function* rangeGen(from, to) {
  for (let i = from; i <= to; i++) yield i;
}
console.log([...rangeGen(1, 5)]); // [1, 2, 3, 4, 5]
```

## Real-world usage

**1. Lazy / infinite sequences**
```js
function* naturalNumbers() {
  let n = 1;
  while (true) yield n++; // infinite, but safe because values are only produced when asked for
}
const numbers = naturalNumbers();
console.log(numbers.next().value); // 1
console.log(numbers.next().value); // 2
// You could loop forever consuming this, or stop whenever you want — nothing is precomputed
```

**2. Lazy pagination** — fetch the next page of data only when the consumer actually asks for more, instead of loading everything upfront (see `examples/generators-iterators.js`).

**3. redux-saga context** — redux-saga uses generator functions as "sagas" to describe async side-effect flows (`yield call(apiFn)`, `yield put(action)`). The generator pauses at each `yield`, the saga middleware runs the described effect (like calling an API), and resumes the generator with the result once it's ready — giving you sequential-looking, testable async code, and the ability to pause/cancel side-effect logic mid-flow (something plain `async/await` can't do, since you can't "cancel" or "step into" a running async function from outside).

**4. `Array.from`, spread, destructuring** all work on generators for free, since a generator object is iterable.

## How to explain in an interview (simple English)

"An iterable is any object that knows how to be looped over — it implements a `Symbol.iterator` method that returns an iterator, which is just an object with a `.next()` method giving you `{ value, done }` each time. Generators are a shortcut for writing iterators: a generator function can pause at `yield` and pick back up later, so I don't have to manually track state like 'where am I in the sequence' — the function itself remembers via its paused execution point. They're great for lazy data — like an infinite sequence, or paging through data where you only fetch the next chunk when it's actually needed."

## Quick Reference

| Term | One-liner |
|---|---|
| Iterable | Object with a `[Symbol.iterator]` method — usable in `for...of`, spread, destructuring |
| Iterator | Object with a `.next()` method returning `{ value, done }` |
| Generator function | `function*` — pausable/resumable function, returns a generator object |
| `yield` | Pauses the generator, hands a value out, waits to be resumed |
| Real uses | Custom iterables, lazy/infinite sequences, pagination, redux-saga effects |
