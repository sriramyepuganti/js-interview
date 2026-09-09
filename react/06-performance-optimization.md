# 06 — Performance Optimization

## Why does this matter for a senior interview?
Senior React interviews almost always include "the app is slow, how do you fix it" style questions. The core skill being tested is not "do you know the API names" but "do you know **when** applying an optimization actually helps vs when it's wasted/harmful complexity." Cover the WHY behind each tool, not just WHAT it does.

---

## 0. NOTE — The React Compiler changes the framing below (read this first)

**What's changed:** React 19 ships alongside the **React Compiler** — a build-time tool that automatically inserts the equivalent of `useMemo`/`useCallback`/`React.memo` for you, in codebases that opt into it. Everything below (sections 1-2 especially) was written for the "you, the developer, must manually decide when to memoize" world — that knowledge is **still correct and still asked about in interviews**, but it's worth stating the updated framing up front:

- **In a codebase that has adopted the React Compiler:** manual `useMemo`/`useCallback`/`React.memo` become **escape hatches** for cases the compiler can't safely handle (e.g., code that doesn't strictly follow the Rules of Hooks/purity) — not the default first move. The compiler applies memoization automatically and correctly, with no risk of a wrong/missing dependency array, since nothing is hand-maintained.
- **In a codebase that hasn't adopted it** (still the majority as of 2025/2026 — it requires opting in, plus code that's actually safe to auto-memoize), everything below is exactly what you need to know, and exactly what a senior interview still expects.
- **Either way, understanding *why* memoization matters doesn't go away** — the compiler automates *applying* it, not the reasoning behind it. If the compiler skips a component (because it can't prove it's safe), manual memoization knowledge is exactly how you'd reason about — and fix — that gap.

See file `15-react-19-features.md` section 9 for the full writeup on the React Compiler itself.

---

## 1. React.memo

**What is it?** A higher-order component that wraps a function component and skips re-rendering it if its props are shallowly equal to the previous render's props.

```jsx
const ExpensiveRow = React.memo(function ExpensiveRow({ item }) {
  console.log('rendering row', item.id);
  return <li>{item.name}</li>;
});
```

**Why invented?** By default, when a parent re-renders, **every child re-renders too**, regardless of whether that child's own props changed. For a large list or an expensive child, that's wasted work. `React.memo` adds a shallow-equality prop check before the child's render function runs.

**The catch:** shallow comparison means an object/array/function prop that's re-created on every parent render (a new reference, even with identical contents) will **always** be seen as "different," making `React.memo` useless unless paired with `useMemo`/`useCallback` on the parent's side for those props.

```jsx
// Without stabilizing the callback, React.memo on Child does nothing —
// onClick is a new function reference every Parent render, so props are never "equal"
function Parent() {
  const [count, setCount] = useState(0);
  return <MemoChild onClick={() => console.log('click')} />; // new fn every render!
}

// Fixed: stable reference via useCallback so memo actually works
function Parent() {
  const [count, setCount] = useState(0);
  const handleClick = useCallback(() => console.log('click'), []);
  return <MemoChild onClick={handleClick} />;
}
```

**When it helps:** components that render often due to parent re-renders but whose own props rarely change, and whose render is non-trivial (large lists, charts, rich text areas).
**When it's premature:** small/cheap components — the shallow comparison itself has a cost, and for trivial components it can be a net negative plus extra code to maintain.

---

## 2. useMemo / useCallback — when they actually help vs premature optimization

(Full mechanics covered in file 03 — this is the *performance decision* angle.)

**They help when:**
- The computation is genuinely expensive (profiler shows real time spent).
- You need referential stability specifically to satisfy a dependency array or a `React.memo` child.

**They DON'T help (and can hurt) when:**
- Wrapping every single value/function "just in case" — adds memory overhead (React must store the cached value + the dependency array) and a comparison cost every render, for something that was already cheap.
- The dependency array is wrong (missing deps → stale bugs; too many deps that change often → memoization never actually "hits," so it's pure overhead with zero benefit).

**Rule senior engineers apply:** Don't reach for `useMemo`/`useCallback` by default. Write plain code first. Add memoization only when the React DevTools Profiler (or user-perceived jank) shows it's actually needed, or when you specifically need referential equality for a memoized child/effect dependency.

---

## 3. Virtualization for long lists (react-window / react-virtualized / TanStack Virtual)

**What is it?** Instead of rendering all 10,000 rows of a list into the DOM, virtualization renders **only the rows currently visible in the scroll viewport** (plus a small buffer), recycling DOM nodes as the user scrolls.

**Why invented?** Rendering thousands of DOM nodes at once is expensive for both initial render and reflow/paint on every scroll — the browser has to manage a huge DOM tree it's mostly not showing. Real-world lists (chat logs, tables, infinite feeds) can easily have thousands of rows.

```jsx
import { FixedSizeList } from 'react-window';

function BigList({ items }) {
  const Row = ({ index, style }) => (
    <div style={style}>{items[index].name}</div> // style positions the row absolutely — required by react-window
  );
  return (
    <FixedSizeList height={400} width={300} itemCount={items.length} itemSize={35}>
      {Row}
    </FixedSizeList>
  );
}
```

**Real-world usage:** admin dashboards with big tables, social feeds, chat apps, autocomplete dropdowns with many options.

**How to explain in an interview:** "For long lists, I don't render every row — I use windowing/virtualization (react-window or TanStack Virtual) so only the visible rows plus a small buffer exist in the DOM at any time. As the user scrolls, rows get recycled. This keeps DOM size and render/reflow cost constant regardless of total list length, instead of scaling linearly with item count."

---

## 4. Code splitting — React.lazy + Suspense

**What is it?** Instead of bundling your entire app into one JS file, split it into smaller chunks that load **on demand** (e.g., only when a route is visited).

```jsx
const SettingsPage = React.lazy(() => import('./SettingsPage'));

function App() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <SettingsPage />
    </Suspense>
  );
}
```

**Why invented?** As an app grows, one giant bundle means users pay the download/parse cost for code they may never even visit (e.g., an admin settings page most users never open). Splitting by route (or by heavy rarely-used feature, like a rich text editor or a charting library) means the initial page load only pays for what's actually needed first.

**Real-world usage:** route-based splitting is the most common pattern (`const Home = lazy(() => import('./routes/Home'))`), also used for heavy modals/dialogs that aren't visible on first render, and for large third-party libraries only needed in one feature.

**How to explain in an interview:** "Code splitting breaks the bundle into smaller chunks loaded on demand instead of all upfront. React.lazy + Suspense is the standard way — most commonly applied per-route, so users downloading the app only fetch the JS for pages they actually visit, keeping the initial load fast."

---

## 5. Avoiding unnecessary re-renders — general patterns

- **Don't create new objects/arrays/functions inline as props** if the child is memoized — lifts them out or memoizes them.
- **Push state down** — if only one small part of the tree needs frequently-changing state, keep that state as local as possible instead of high up in a shared ancestor, which forces the whole subtree below it to re-render.
- **Use children/composition to isolate re-renders** — a component that just renders `{children}` doesn't need to re-render even if its own state changes, because React can bail out of re-rendering the already-created `children` elements passed from a parent that didn't change:
  ```jsx
  // MovingBox re-renders every mousemove, but `children` (ExpensiveChart) was created
  // by the PARENT and passed down — React doesn't need to re-render it, since the
  // element reference is unchanged as long as the parent that created it didn't re-render.
  function MovingBox({ children }) {
    const [pos, setPos] = useState({ x: 0, y: 0 });
    return <div style={{ transform: `translate(${pos.x}px,${pos.y}px)` }} onMouseMove={...}>{children}</div>;
  }
  ```
- **Split contexts** (file 05) so unrelated consumers don't re-render on every context change.
- **Avoid prop drilling large objects** where only a small derived piece is needed — pass the derived value, not the whole object, so shallow-equality checks (React.memo) are more likely to succeed.

---

## 6. Profiling with React DevTools Profiler

**What is it?** A browser DevTools panel (React DevTools extension → "Profiler" tab) that records a session of renders and shows: which components rendered, how long each took, and — critically — **why** each one rendered ("Highlight updates when components render" + the "render reasons" in the flamegraph).

**Why it matters in an interview:** Senior engineers are expected to say "I'd profile it first" before jumping to `useMemo` everywhere. Guessing at optimizations without measuring is a common junior mistake interviewers watch for.

**Workflow:**
1. Record a profiling session while performing the slow interaction.
2. Look at the flamegraph — wide/tall bars = components taking long or rendering often.
3. Check "why did this render" — commonly: parent re-rendered and passed new prop references, or a context value changed.
4. Apply the *targeted* fix — memoize that specific prop, split that specific context, virtualize that specific list — not a blanket sprinkle of `useMemo` everywhere.

---

## 7. Common Anti-Patterns (senior interview red flags to know)

| Anti-pattern | Why it's bad | Fix |
|---|---|---|
| Defining components inside another component's render body | New component identity every render → full remount + lost state every time | Define components at module scope |
| Passing new inline objects/arrays/functions to memoized children | Breaks `React.memo`/dependency comparisons | `useMemo`/`useCallback`, or lift constants outside |
| Storing derived data in state instead of computing it during render | Extra state to keep in sync = bugs; unnecessary re-renders | Compute derived values inline or with `useMemo` if expensive |
| One giant Context holding all app state | Every consumer re-renders on any change | Split contexts, or use a proper store with selectors |
| `useEffect` for something that could be computed during render | Extra render pass, potential flash of stale UI | Compute directly in the render body |
| Using array index as `key` for reorderable/filterable lists | Wrong DOM node reused → stale UI state | Use a stable unique id |
| Blanket `useMemo`/`useCallback` on everything "for performance" | Adds overhead without measured benefit, harder to read | Only memoize what profiling shows needs it |

## See also
`examples/performance-optimization.jsx` — `React.memo` + `useMemo` + `useCallback` demo with before/after re-render behavior explained in comments.
