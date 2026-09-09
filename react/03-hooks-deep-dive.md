# 03 — Hooks Deep Dive

This file expands on the hook usage patterns from the old `remaningHooks.jsx`/`functionalComponent.jsx` notes (useReducer, useMemo, useCallback, useImperativeHandle, useLayoutEffect, useDebugValue) and adds the why/when for each, plus the Rules of Hooks and what's actually happening under the hood.

---

## 1. useState

**What is it?** Adds local state to a function component. Returns `[value, setterFunction]`.

**Why invented?** Before hooks, only classes could hold state. `useState` gives function components the same power with far less boilerplate (`this.state`, `this.setState`, constructor binding all disappear).

```jsx
const [count, setCount] = useState(0);
setCount(count + 1);            // direct value
setCount((prev) => prev + 1);   // functional update — safer, avoids stale closure bugs
```

**Key pitfall:** if you update state based on the previous state, prefer the **functional updater form**. If you call `setCount(count + 1)` twice in the same event handler, both calls see the same stale `count` and you only get +1, not +2. The functional form `setCount(c => c + 1)` always operates on the latest value.

**How to explain in an interview:** "useState gives a function component a piece of memory that survives across renders. Calling the setter schedules a re-render with the new value. When the next state depends on the previous state, I use the updater-function form to avoid stale-value bugs from batched updates."

---

## 2. useEffect

**What is it?** Runs a side effect (data fetching, subscriptions, manually touching the DOM, timers, logging) **after** the render is committed to the screen.

**Why invented?** Class lifecycle methods forced you to split *one logical concern* across multiple methods — e.g., subscribing in `componentDidMount` and unsubscribing in `componentWillUnmount`, even though they're really "one effect." `useEffect` lets you write the setup and its matching cleanup together, in one place, and React re-runs it whenever the effect's dependencies change.

```jsx
useEffect(() => {
  const subscription = ChatAPI.subscribe(id, handleStatusChange);
  return () => subscription.unsubscribe(); // cleanup — runs before next effect or on unmount
}, [id]); // dependency array
```

**The dependency array — the #1 source of bugs:**

| Dependency array | When effect runs |
|---|---|
| Omitted entirely | After **every** render (rarely what you want) |
| `[]` | Once, after initial mount only (like `componentDidMount`) |
| `[a, b]` | After mount, and again whenever `a` or `b` changes between renders |

**Stale closure pitfall** ("what's wrong with this code" style):
```jsx
// BUG: this effect captures `count` from the render where it was defined (0),
// and the interval keeps calling setCount(0 + 1) forever — count never goes past 1
useEffect(() => {
  const id = setInterval(() => {
    setCount(count + 1); // "count" here is stale — closed over old render's value
  }, 1000);
  return () => clearInterval(id);
}, []); // missing `count` in deps is what causes the staleness

// FIX 1: use the functional updater — doesn't need `count` from the closure
useEffect(() => {
  const id = setInterval(() => setCount(c => c + 1), 1000);
  return () => clearInterval(id);
}, []);

// FIX 2: include the real dependency (re-creates interval each change — less ideal here)
useEffect(() => {
  const id = setInterval(() => setCount(count + 1), 1000);
  return () => clearInterval(id);
}, [count]);
```

**Infinite re-render loop pitfall:**
```jsx
// BUG: a new object literal is created on every render, so the dependency
// is "different" every time by reference → effect runs → causes a state update
// → re-render → new object again → effect runs again → forever
useEffect(() => {
  doSomething();
}, [{ id: props.id }]); // object recreated each render, never "equal" to the previous one

// FIX: depend on the primitive value, not a fresh object/array
useEffect(() => {
  doSomething();
}, [props.id]);
```
This is exactly why `useMemo`/`useCallback` exist for objects/functions used as dependencies (see sections 5 & 6).

**Cleanup function — why it matters:** without cleanup, effects that subscribe to something (WebSocket, event listener, interval, external store) keep running even after the component unmounts, causing memory leaks and "setState called on unmounted component" warnings.

**Real-world usage:** data fetching (though React Query/TanStack Query now handles this far better, see file 07), syncing with browser APIs (`document.title`, `window.addEventListener`), analytics logging, WebSocket subscriptions.

**How to explain in an interview:** "useEffect runs side effects after the DOM has been updated, and its dependency array controls how often. The two classic bugs are stale closures — where the effect captures an old value and never sees updates because it's missing from the deps array — and infinite loops, caused by putting a freshly-created object or array in the deps array so it never matches the previous render's dependency by reference."

---

## 3. useRef

**What is it?** Gives you a mutable box (`{ current: value }`) that persists across renders **without** causing a re-render when it changes.

**Why invented?** Sometimes you need to remember a value or reach into the DOM, but updating it shouldn't trigger a re-render (unlike state). Direct DOM access (`inputRef.current.focus()`) replaces the old `document.getElementById` style DOM queries.

```jsx
const inputRef = useRef(null);
const focusInput = () => inputRef.current.focus();
return <input ref={inputRef} />;
```

Also used to store "instance variables" that survive across renders — e.g., a previous value, a timer id, a flag like `didMountRef` — anything you don't want tied to the render cycle.

**How to explain in an interview:** "useRef gives me a persistent mutable reference that doesn't cause re-renders when changed. I use it for direct DOM access — like focusing an input — and for storing values across renders that shouldn't trigger a re-render, like a timer ID or a 'previous value' tracker."

---

## 4. useReducer

**What is it?** An alternative to `useState` for managing more complex state — you dispatch **action objects**, and a **reducer function** `(state, action) => newState` decides the next state.

**Why invented?** When state logic has multiple related sub-values, or the next state depends heavily on the previous one and the *type* of update (increment/decrement/reset), spreading that logic across many `useState` calls and scattered `setX` calls gets messy and hard to test. `useReducer` centralizes "how state changes" into one pure function you can unit test in isolation — this is the same mental model as Redux, just local to one component (see file 07 for the full Redux connection).

```jsx
function reducer(state, action) {
  switch (action.type) {
    case 'increment': return { count: state.count + 1 };
    case 'decrement': return { count: state.count - 1 };
    case 'reset':      return { count: action.payload };
    default: throw new Error(`Unknown action: ${action.type}`);
  }
}

function Counter({ initialCount }) {
  const [state, dispatch] = useReducer(reducer, { count: initialCount });
  return (
    <>
      Count: {state.count}
      <button onClick={() => dispatch({ type: 'decrement' })}>-</button>
      <button onClick={() => dispatch({ type: 'increment' })}>+</button>
      <button onClick={() => dispatch({ type: 'reset', payload: initialCount })}>Reset</button>
    </>
  );
}
```

**Lazy initialization** (third argument, `init` function) — useful when computing the initial state is expensive; it only runs once, not on every render:
```jsx
function init(initialCount) { return { count: initialCount }; }
const [state, dispatch] = useReducer(reducer, initialCount, init);
```

**When to reach for it over useState:** state is an object/array with multiple related fields updated together, the "next state" logic is nontrivial, or many different event handlers update the same state in different ways (form wizards, complex UI state machines, undo/redo).

**How to explain in an interview:** "useReducer centralizes state transition logic into one pure reducer function that I dispatch named actions to, instead of scattering setState calls everywhere. It shines when state updates are complex or interdependent — it's basically 'local Redux' and makes the state transitions easy to test and reason about."

---

## 5. useMemo

**What is it?** Memoizes (caches) the **result of a computation** across renders, only recomputing when its dependencies change.

**Why invented?** Some calculations are expensive (sorting/filtering large arrays, heavy math). Without memoization, they'd re-run on **every** render — even ones triggered by unrelated state changes. `useMemo` skips the recomputation unless a listed dependency actually changed.

```jsx
const UseMemo = () => {
  const [data, setData] = useState(0);
  const [count, setCount] = useState(0); // unrelated state

  const heavyCalc = (d) => { /* expensive work */ return d * 100; };

  // Without useMemo: heavyCalc runs on EVERY render, even when only `count` changes
  // const result = heavyCalc(data);

  // With useMemo: only recomputes when `data` changes
  const result = useMemo(() => heavyCalc(data), [data]);

  return (
    <div>
      <button onClick={() => setCount(count + 1)}>Counter-{count}</button>
      <div>{result}</div>
    </div>
  );
};
```

**Also used to memoize objects** so referential equality holds across renders (important as a dependency for other hooks, or as a prop to a `React.memo`-wrapped child):
```jsx
const style = useMemo(() => ({ color: theme.primary }), [theme.primary]);
```

**Pitfall / premature optimization:** `useMemo` itself has a small cost (storing + comparing deps). For cheap computations (simple string concat, small array of 5 items), it's not worth it — and can even make the code slightly slower and definitely harder to read. Reach for it when profiling shows an actual expensive computation, or when you need referential stability for a dependency/prop — not by default on every value. **Never do side effects inside `useMemo`** — its function runs during rendering, so it should be pure.

**How to explain in an interview:** "useMemo caches an expensive computed value between renders and only recalculates it when its dependencies change. I reach for it either when a calculation is genuinely expensive, or when I need a stable object/array reference so a memoized child or another hook's dependency array doesn't think something changed when it didn't. I don't wrap every value in useMemo — that's premature optimization that adds overhead without benefit."

---

## 6. useCallback

**What is it?** Like `useMemo`, but specifically memoizes a **function** instead of a value — it returns the same function reference across renders as long as dependencies don't change.

**Why invented?** In JavaScript, a new function is created (a new reference in memory) every render:
```jsx
const handleClick = () => { console.log('Clicked!'); }; // new function every render
```
That's fine on its own — cheap functions are, well, cheap. It matters when that function is passed as a **prop to a child wrapped in `React.memo`**: `React.memo` does a shallow prop comparison, and a "new" function reference every time makes the child think its props changed, so it re-renders anyway, defeating the memoization.

```jsx
const UseCallBackCom = () => {
  const [state, setState] = useState(0);
  // Stable reference across renders as long as `state` doesn't change
  const handleClick = useCallback(() => {
    setState(state + 10);
  }, [state]);
  return <MemoizedChild onClick={handleClick} />;
};
```

**Note on the functional-updater trick** — you can often avoid the dependency entirely:
```jsx
const handleClick = useCallback(() => {
  setState(s => s + 10); // no need to depend on `state` at all — always stable!
}, []);
```

**useMemo vs useCallback:**

| | useMemo | useCallback |
|---|---|---|
| Memoizes | A **value** (result of a function call) | A **function reference** itself |
| Syntax | `useMemo(() => computeValue(), [deps])` | `useCallback(fn, [deps])` |
| Equivalent to | `useMemo(() => fn, [deps])` for useCallback | — |
| Use case | Expensive calculations, stable object/array refs | Stable function refs passed to memoized children or as effect dependencies |

**How to explain in an interview:** "useCallback memoizes a function's identity across renders, which matters mainly when that function is passed to a `React.memo`-wrapped child or used as a dependency elsewhere — without it, a fresh function reference every render defeats memoization downstream. It's functionally `useMemo` that returns a function instead of a value."

---

## 7. useLayoutEffect vs useEffect

**What is it?** Same signature as `useEffect`, but fires **synchronously right after DOM mutations, before the browser paints** — whereas `useEffect` fires **asynchronously after paint**.

```jsx
const UseLayoutEffect = () => {
  const [text, setText] = useState('');
  const inputRef = useRef(null);

  useEffect(() => {
    console.log(inputRef.current.value); // may log an OLDER value — runs after paint
  });

  useLayoutEffect(() => {
    console.log(inputRef.current.value); // runs before paint, guaranteed up to date w.r.t DOM
  });

  return <input ref={inputRef} onKeyUp={() => setText(inputRef.current.value)} />;
};
```

**Why invented?** Most of the time you don't care about the exact timing — `useEffect` is preferred because it doesn't block the browser from painting, keeping the UI responsive. But some tasks **must** happen before the user sees anything, to avoid a visible flicker — e.g., measuring a DOM node's size/position and then adjusting styles based on that measurement (a tooltip that needs to reposition itself so it doesn't go off-screen). If you used `useEffect` for that, the user would briefly see the tooltip in the wrong place, then see it "jump."

**Rule of thumb:** default to `useEffect`. Only reach for `useLayoutEffect` when you're reading layout (`getBoundingClientRect`, scroll position, size) and need to synchronously adjust the DOM/state **before the paint** to avoid visual flicker.

**How to explain in an interview:** "Both run after the DOM has been updated, but useEffect runs asynchronously after the browser has painted, while useLayoutEffect runs synchronously before the paint. I default to useEffect since it doesn't block rendering — I only use useLayoutEffect when I need to measure or adjust the DOM before the user sees it, like preventing a layout flicker."

---

## 8. useImperativeHandle (with forwardRef)

**What is it?** Lets a child component customize what gets exposed on a `ref` when a parent attaches one to it — instead of exposing the raw DOM node, you expose a curated object with only the methods you want the parent to call.

**Why invented?** By default, refs on function components don't work at all (you'd get a warning) — function components need `forwardRef` to receive a ref, and even then, forwarding the raw `inputRef` would expose the **entire DOM node API** to the parent, breaking encapsulation. `useImperativeHandle` lets you expose a minimal, intentional imperative API.

```jsx
const FancyInput = React.forwardRef((props, ref) => {
  const inputRef = useRef();
  useImperativeHandle(ref, () => ({
    focus: () => inputRef.current.focus(),           // only expose what's needed
    clear: () => { inputRef.current.value = ''; },
  }));
  return <input ref={inputRef} {...props} />;
});

// Parent
const ref = useRef(null);
<FancyInput ref={ref} />
<button onClick={() => ref.current.focus()}>Focus</button> // only .focus()/.clear() available, not the raw DOM node
```

**Real-world usage:** rare, and intentionally so — "imperative code using refs should be avoided in most cases" (straight from the old notes, still true). Legitimate cases: exposing `.focus()`, `.scrollIntoView()`, `.play()`/`.pause()` on custom components (video players, custom modals with an `.open()`/`.close()` API), integrating with imperative third-party libraries.

**How to explain in an interview:** "useImperativeHandle, combined with forwardRef, lets a component control exactly what's exposed when a parent holds a ref to it — instead of leaking the whole DOM node, you expose just a few intentional methods, like focus() or open(). It's an escape hatch for imperative APIs and should be rare in a codebase that's mostly declarative."

---

## 9. useDebugValue

**What is it?** Lets a **custom hook** display a readable label next to itself in React DevTools, instead of showing raw internal values.

```jsx
function useFriendStatus(friendID) {
  const [isOnline, setIsOnline] = useState(null);
  useDebugValue(isOnline ? 'Online' : 'Offline'); // shows "FriendStatus: Online" in DevTools
  return isOnline;
}
```

**Why invented?** Purely a developer-experience tool for teams building shared custom hooks in a larger codebase/design system — makes debugging in DevTools less cryptic when many components use the same custom hook. No effect on runtime behavior or production bundle behavior.

**How to explain in an interview:** "useDebugValue doesn't affect behavior — it's purely for React DevTools, letting a custom hook show a friendly label instead of raw state, which helps when many components across a large codebase share the same custom hook."

---

## 10. Rules of Hooks — and WHY they exist

**The rules:**
1. Only call hooks at the **top level** of a function component or another custom hook — never inside loops, conditions, or nested functions.
2. Only call hooks from **React function components** or **custom hooks** — never from regular JS functions or class components.

**Why these rules exist — the linked-list mental model:**
React does **not** know hook names or use closures/context to identify "which useState is which" — it identifies each hook purely **by the order it was called in**, on every render. Internally, each component instance keeps a **linked list of hook memory cells**; every render, React walks the list in order and hands out `[value, setter]` (or effect memory) for the current position pointer.

```
Render 1: useState() -> cell[0]   useEffect() -> cell[1]   useState() -> cell[2]
Render 2: useState() -> cell[0]   useEffect() -> cell[1]   useState() -> cell[2]
                (same order → correctly matched to the same cells)
```

If you wrap a hook in a condition:
```jsx
// BUG: if `flag` is true only sometimes, the number/order of hooks called
// differs between renders, and React's positional matching breaks —
// state gets assigned to the wrong hook call, or React throws an error.
if (flag) {
  const [a, setA] = useState(0);
}
const [b, setB] = useState(1);
```
On a render where `flag` is `false`, `useState(1)` becomes the FIRST hook call instead of the second — React thinks cell[0] (which was storing `a`'s state) now belongs to `b`. Order must be **100% identical on every single render** for the same component instance, which is only guaranteed if you never put hooks inside conditionals/loops.

**How to explain in an interview:** "React tracks hooks by call order per component instance, like a linked list — not by name. Every render must call the exact same hooks in the exact same order for that matching to stay correct. That's why hooks can't be conditional or inside loops — doing so shifts the order between renders and corrupts which piece of state maps to which hook call."

---

## Summary Table

| Hook | Memoizes/Manages | Typical use |
|---|---|---|
| `useState` | A single state value | Simple local state |
| `useReducer` | Complex/interdependent state via actions | State machines, forms, multi-field updates |
| `useEffect` | Side effects after paint | Fetching, subscriptions, DOM sync (non-urgent) |
| `useLayoutEffect` | Side effects before paint | Layout measurement, avoiding visual flicker |
| `useRef` | Mutable value / DOM node, no re-render | DOM access, instance variables, timers |
| `useMemo` | Computed value | Expensive calculations, stable object refs |
| `useCallback` | Function reference | Stable callbacks for memoized children/deps |
| `useImperativeHandle` | Custom ref API | Exposing a minimal imperative API via forwardRef |
| `useDebugValue` | DevTools label | Debuggability of custom hooks |
