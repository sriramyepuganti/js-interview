/**
 * generators-iterators.js
 * Run with: node generators-iterators.js
 *
 * Demonstrates: a custom iterable object, a generator-based infinite
 * sequence, and a generator-based lazy pagination example.
 * See ../08-iterators-and-generators.md for the full explanation.
 */

// ---------------------------------------------------------------------------
// 1. Custom iterable object — manually implementing Symbol.iterator
// ---------------------------------------------------------------------------
console.log("=== Custom iterable (manual Symbol.iterator) ===");

const range = {
  from: 1,
  to: 5,
  [Symbol.iterator]() {
    let current = this.from;
    const last = this.to;
    return {
      next() {
        // Every iterator must return { value, done }
        return current <= last
          ? { value: current++, done: false }
          : { value: undefined, done: true };
      },
    };
  },
};

for (const num of range) {
  console.log("range value:", num); // 1 2 3 4 5
}
console.log("spread works too:", [...range]); // [1, 2, 3, 4, 5]


// ---------------------------------------------------------------------------
// 2. The SAME iterable, but written as a generator (much less boilerplate)
// ---------------------------------------------------------------------------
console.log("\n=== Same iterable, written with a generator ===");

function* rangeGen(from, to) {
  for (let i = from; i <= to; i++) {
    yield i; // pause here, hand out `i`, resume on the next .next() call
  }
}

console.log([...rangeGen(1, 5)]); // [1, 2, 3, 4, 5]


// ---------------------------------------------------------------------------
// 3. Generator-based infinite sequence — lazy, nothing precomputed
// ---------------------------------------------------------------------------
console.log("\n=== Infinite sequence (lazy) ===");

function* naturalNumbers() {
  let n = 1;
  while (true) {
    yield n++; // infinite loop is SAFE here because nothing runs until .next() is called
  }
}

const numbers = naturalNumbers();
console.log(numbers.next().value); // 1
console.log(numbers.next().value); // 2
console.log(numbers.next().value); // 3
// We can stop here forever — nothing was wastefully precomputed for numbers we never asked for.

// A helper to take the first N values from any (possibly infinite) generator
function take(generator, count) {
  const result = [];
  for (let i = 0; i < count; i++) {
    const { value, done } = generator.next();
    if (done) break;
    result.push(value);
  }
  return result;
}

console.log("first 5 naturals via take():", take(naturalNumbers(), 5)); // [1, 2, 3, 4, 5]

// Fibonacci sequence — also infinite, also lazy
function* fibonacci() {
  let [a, b] = [0, 1];
  while (true) {
    yield a;
    [a, b] = [b, a + b];
  }
}
console.log("first 8 fibonacci numbers:", take(fibonacci(), 8)); // [0, 1, 1, 2, 3, 5, 8, 13]


// ---------------------------------------------------------------------------
// 4. Generator-based LAZY PAGINATION — fetch the next page only when asked
// ---------------------------------------------------------------------------
console.log("\n=== Lazy pagination with a generator ===");

// Simulated "database" of 25 items, paginated
const fakeDatabase = Array.from({ length: 25 }, (_, i) => `item-${i + 1}`);

function fetchPageFromServer(pageNumber, pageSize) {
  // simulate a "network call" happening only when this page is actually requested
  console.log(`  (simulated network call for page ${pageNumber})`);
  const start = (pageNumber - 1) * pageSize;
  return fakeDatabase.slice(start, start + pageSize);
}

function* paginate(pageSize) {
  let pageNumber = 1;
  while (true) {
    const page = fetchPageFromServer(pageNumber, pageSize);
    if (page.length === 0) return; // no more data — stop the generator
    yield page; // hand out one page at a time; nothing beyond this is fetched yet
    pageNumber++;
  }
}

const pager = paginate(10);
console.log("Page 1:", pager.next().value); // triggers fetch for page 1 only
console.log("Page 2:", pager.next().value); // triggers fetch for page 2 only, NOT page 3+
console.log("Page 3:", pager.next().value); // last partial page (5 items)
console.log("Page 4 (done):", pager.next());  // { value: undefined, done: true } — no more data

// Note: in real redux-saga usage, this same "yield, pause, resume with a result" mechanism
// is used to describe async side-effects step by step (yield call(apiFn), yield put(action)),
// letting middleware control/cancel/test the flow externally.
