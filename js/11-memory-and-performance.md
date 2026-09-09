# 11 — Memory, Garbage Collection, and Performance

## Garbage Collection Basics

**What is it?**
JS automatically manages memory — you never manually allocate or free it like in C/C++. The **garbage collector (GC)** periodically finds objects that are no longer reachable/usable by your program and frees their memory.

**Why was it invented?**
Manual memory management is a huge source of bugs (use-after-free, double-free, memory leaks) in languages like C/C++. JS (like Java) chose automatic memory management to make the language safer and easier to use — you focus on logic, the engine handles cleanup.

**How it works — Mark and Sweep (the algorithm modern JS engines use):**
1. Start from a set of "roots" (global object, currently executing functions' local variables, the call stack).
2. **Mark** every object reachable from those roots by walking references (object → object → object...).
3. **Sweep** — anything NOT marked (i.e., not reachable from any root) is considered garbage and its memory is freed.

```js
let obj = { data: "big data" };
obj = null; // the original object is now unreachable — nothing points to it anymore
// on the next GC cycle, mark-and-sweep will free its memory
```

The key insight: **it's not about reference *counting*, it's about reachability**. Even if two objects reference each other (a cycle), if NEITHER is reachable from a root, both get collected — this is how mark-and-sweep correctly handles circular references, which naive reference-counting garbage collectors historically struggled with.

## Memory Leaks in JS (even though we have a GC!)

**What is it?**
A memory leak happens when memory that's no longer actually needed is still *reachable* — so the GC can't collect it, because reachability is the only thing it checks. The bug isn't "the GC failed," it's "your code accidentally kept a reference alive."

### Common causes (senior-level, practical):

**1. Detached DOM nodes**
```js
let detachedDiv = document.getElementById("box");
document.body.removeChild(detachedDiv);
// detachedDiv still holds a reference to the removed DOM node —
// it can never be garbage collected until this variable is also cleared/reassigned
```

**2. Forgotten timers/intervals**
```js
class Widget {
  constructor() {
    this.data = new Array(1000000).fill("x"); // big chunk of memory
    this.interval = setInterval(() => this.tick(), 1000); // keeps "this" alive forever via the closure
  }
  destroy() {
    clearInterval(this.interval); // MUST do this, or the Widget instance (and its big data) never gets collected
  }
}
```

**3. Forgotten event listeners**
```js
function attachHandler() {
  const bigData = new Array(1000000).fill("leak");
  window.addEventListener("resize", () => console.log(bigData.length)); // closure keeps bigData alive forever
  // if this component is destroyed but the listener is never removed, bigData leaks for the entire page lifetime
}
```
Fix: always pair `addEventListener` with `removeEventListener` when a component/widget is torn down.

**4. Closures holding unintended references**
```js
function setup() {
  const hugeCache = loadHugeDataset();
  const smallHelper = new Array(1000000).fill("x");
  return function tinyFunction() {
    return "I only need one small thing"; // but this closure still keeps ALL of setup()'s variables alive, including hugeCache!
  };
}
```
Even if `tinyFunction` doesn't use `hugeCache`, if it's defined in the same scope, some engines may keep the whole scope alive. Best practice: null out large unneeded references, or scope closures tightly to only what they need.

**5. Global variables accumulating data** — accidentally attaching growing arrays/objects to `window`/`global` that never get cleared.

## `WeakMap` and `WeakSet` — Memory-Safe Collections

**What is it?**
`WeakMap` and `WeakSet` look and behave like `Map`/`Set` (see file 07 for `Map`/`Set` basics), with one crucial difference: their keys (`WeakMap`) or values (`WeakSet`) MUST be objects, and those references are held **weakly** — meaning holding something in a `WeakMap`/`WeakSet` does NOT prevent the garbage collector from reclaiming it if nothing else references it.

```js
let user = { name: "Sri" };
const cache = new Map();
cache.set(user, "extra metadata");

const weakCache = new WeakMap();
weakCache.set(user, "extra metadata");

user = null; // drop the only "real" reference

// cache still holds `user` alive forever — a leak, because Map keys are strong references
// weakCache does NOT keep `user` alive — once nothing else references it, GC can collect it,
// and its entry silently disappears from the WeakMap too
```

**Why was it invented / what problem does it solve?**
This directly solves the memory-leak problem described above. If you want to attach extra data to an object (metadata, a DOM node's cached measurements, private instance data) WITHOUT that attachment itself becoming the reason the object never gets garbage collected, a regular `Map` is dangerous — the `Map` holds a strong reference forever, even after every other part of the program is done with that object. `WeakMap` was built specifically so "extra data tied to an object's lifetime" doesn't require you to manually remember to delete the entry when the object goes away.

The trade-off for this safety: `WeakMap`/`WeakSet` are NOT iterable (no `.forEach`, no `for...of`, no `.size`) — because the collection's contents can shrink at any unpredictable moment (whenever GC runs), so exposing "how many things are in here right now" or "let me list them all" would be a meaningless, unstable answer.

**Real-time / real-world usage**
- Attaching private data to class instances without using closures or `#privateFields` (an older pattern, mostly superseded by `#fields` now, but still asked about in interviews).
- Caching expensive computed results per DOM node or per object, where you want the cache entry to vanish automatically once that node/object is removed/GC'd — no manual cleanup needed.
- Tracking "have I already visited this object" during algorithms that walk object graphs (e.g., a custom deep-clone or deep-equal implementation) without accidentally keeping every visited object alive forever via the tracking structure itself.
- `WeakSet` specifically: marking a set of objects as "already processed" or "already initialized" (e.g., `WeakSet` of DOM elements that already have a click handler attached), so you don't need cleanup when those elements are removed from the page.

**How to explain this in an interview (simple English)**
"`WeakMap`/`WeakSet` are like `Map`/`Set`, but the references they hold don't count for garbage collection — so if I attach some extra data to an object via a `WeakMap` and every other reference to that object goes away, the object (and my extra data with it) gets cleaned up automatically instead of leaking forever. I'd reach for this any time I want to tag or cache something against an object's lifetime without manually tracking when to remove it."

**Map/Set vs WeakMap/WeakSet**

| | `Map` / `Set` | `WeakMap` / `WeakSet` |
|---|---|---|
| Reference strength | Strong — prevents GC of its keys/values | Weak — does NOT prevent GC |
| Key/value type allowed | Any type | Objects only (no primitives) |
| Iterable / has `.size` | Yes | No — contents can shrink unpredictably |
| Typical use case | General-purpose collection you fully control the lifetime of | Metadata/cache tied to an object's own lifetime |

## Performance Profiling Basics

**What is it?**
Using browser DevTools (Performance tab, Memory tab) or Node's `--prof`/`--inspect` to observe where time and memory are actually being spent, rather than guessing.

**Practical steps:**
- **Memory tab → Heap snapshot**: take a snapshot, perform an action (e.g., open/close a modal several times), take another snapshot, and compare — if memory keeps growing and never comes back down after GC, that's a leak signal.
- **Performance tab → record**: shows a flame chart of function calls, highlighting long tasks that block the main thread (and therefore block the event loop — see file 05).
- **`console.time()`/`console.timeEnd()`**: quick, low-effort way to measure how long a specific piece of code takes.

```js
console.time("processData");
processLargeArray(data);
console.timeEnd("processData"); // logs "processData: 123.45ms"
```

## Debouncing and Throttling for Performance

**What problem do they solve here?**
Some events fire extremely frequently (scroll, resize, keystrokes, mousemove) — potentially dozens or hundreds of times per second. Running expensive logic (API calls, heavy DOM updates) on every single firing can overwhelm the main thread and tank performance/responsiveness.

- **Debounce** delays execution until the event stream goes quiet for a period — ideal for "search as you type" (only fire the API call once the user pauses).
- **Throttle** guarantees execution happens at most once per fixed interval — ideal for scroll/resize handlers where you still want periodic updates, just not on every single event.

(Full implementations with comments: `examples/debounce-throttle.js`.)

## Real-world usage
- SPA route transitions that don't clean up subscriptions/listeners are one of the most common real-world sources of memory leaks (Angular's `ngOnDestroy`, React's `useEffect` cleanup function exist specifically to prevent this).
- Debounced search inputs, throttled scroll-based infinite-loading or sticky-header logic.
- Heap snapshot comparison is a standard senior-level debugging technique when a QA/support ticket says "the app gets slower the longer it's open."

## How to explain in an interview (simple English)

"JS has a garbage collector that automatically frees memory for objects nothing can reach anymore — it works by starting at the global scope and the call stack, marking everything reachable from there, and sweeping away everything that wasn't marked. A memory leak happens when your code accidentally keeps something reachable that it doesn't actually need anymore — classic examples are forgetting to clear a `setInterval`, forgetting to remove an event listener, or a closure that unintentionally holds onto a huge object. To find leaks in practice, I'd use the browser's Memory tab to take heap snapshots before and after an action and see if memory keeps growing instead of coming back down."

## Quick Reference

| Term | One-liner |
|---|---|
| Garbage collection | Automatic freeing of memory for unreachable objects |
| Mark and sweep | Mark everything reachable from roots, free everything else |
| Memory leak | Memory that's unreachable-in-intent but still reachable-in-fact |
| Detached DOM nodes | Removed from the page but still referenced in JS variables |
| Forgotten timers/listeners | Keep closures (and everything they reference) alive indefinitely |
| Debounce | Run once after activity stops |
| Throttle | Run at most once per interval |
