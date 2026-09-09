# 09 — Error Boundaries, Suspense, and Concurrent Rendering

## 1. Error Boundaries

**What is it?** A component that catches JavaScript errors thrown anywhere in its child tree during rendering, logs them, and displays a fallback UI instead of letting the whole app crash to a blank white screen.

His old pattern (`errorHandling.jsx`), still exactly how it's written today because **error boundaries can only be class components**:
```jsx
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true }; // triggers fallback UI render
  }
  componentDidCatch(error, errorInfo) {
    logErrorToMyService(error, errorInfo); // side effect: log to Sentry/etc.
  }
  render() {
    if (this.state.hasError) return <h1>Something went wrong.</h1>;
    return this.props.children;
  }
}

<ErrorBoundary>
  <BuggyCounter />
</ErrorBoundary>
```

**Why it was invented:** Before React 16, an error thrown during rendering anywhere in the tree could corrupt React's internal state entirely, leaving the app in a broken, unrecoverable condition with cryptic follow-up errors. Error boundaries let React **isolate the blast radius** — catch the error at a defined boundary, unmount just that broken subtree, and keep the rest of the app running.

**Why class-only — the real reason:** Error boundaries rely on two lifecycle methods, `static getDerivedStateFromError` and `componentDidCatch`, which are lifecycle hooks tied to the class component instance model. There is currently **no hook equivalent** (`useErrorBoundary` does not exist in React core) — the React team has stated hooks don't cleanly map to this "catch an error during rendering and re-render differently" behavior the way lifecycle methods do. This is one of the few cases where you're stuck writing (or importing) a class.

**What error boundaries do NOT catch** (common interview trap):
- Errors in event handlers (use a normal try/catch there).
- Errors in async code (`setTimeout`, promises) — same, use try/catch or `.catch()`.
- Errors during server-side rendering.
- Errors thrown in the error boundary itself.

### The modern workaround: `react-error-boundary`

**What is it?** A small, widely-used community library that wraps the class-based error boundary in a clean, hook-friendly API, so you rarely hand-write the class yourself anymore.

```jsx
import { ErrorBoundary } from 'react-error-boundary';

function Fallback({ error, resetErrorBoundary }) {
  return (
    <div role="alert">
      <p>Something went wrong: {error.message}</p>
      <button onClick={resetErrorBoundary}>Try again</button>
    </div>
  );
}

<ErrorBoundary FallbackComponent={Fallback} onReset={() => window.location.reload()} onError={logErrorToService}>
  <BuggyCounter />
</ErrorBoundary>
```
It still uses a class internally (because it has to), but exposes function-component-friendly props (`FallbackComponent`, `onReset`, `onError`) and even a `useErrorBoundary()` hook to trigger the fallback programmatically from event handlers/async code.

**How to explain in an interview:** "Error boundaries catch rendering errors in their child tree and show a fallback instead of crashing the whole app. They must be class components because they rely on `getDerivedStateFromError`/`componentDidCatch`, which have no hook equivalent yet. In practice, I use `react-error-boundary` instead of hand-writing the class — it wraps the same mechanism in a hook-friendly API with `FallbackComponent` and `onReset` props, and it also gives you a hook to trigger the boundary from event handlers or async code, which a plain error boundary can't catch on its own."

---

## 2. Suspense

**What is it?** A component that lets you show a fallback UI (like a spinner) while its children aren't "ready" yet — originally for lazy-loaded components (`React.lazy`), and expanded into a general mechanism for **data fetching** in frameworks that support it (Next.js App Router, Remix, React Query's `useSuspenseQuery`).

**Lazy-loading usage (well established, from his old notes too):**
```jsx
const OtherComponent = React.lazy(() => import('./OtherComponent'));

<Suspense fallback={<div>Loading...</div>}>
  <OtherComponent />
</Suspense>
```

**Data-fetching usage (2024/2025 evolution):** Suspense-enabled data sources (like React Query's suspense mode, or Next.js Server Components) can "throw a promise" while loading, which Suspense catches and shows the fallback for — until the promise resolves, then it re-renders with data. This unifies "waiting for code" and "waiting for data" under one mechanism, so a page with multiple independently-loading pieces can show fine-grained fallbacks instead of one big top-level spinner.

```jsx
// with TanStack Query's suspense-enabled hook
function Profile({ userId }) {
  const { data } = useSuspenseQuery({ queryKey: ['user', userId], queryFn: () => fetchUser(userId) });
  return <div>{data.name}</div>; // no loading state needed here — Suspense handles it
}

<Suspense fallback={<Spinner />}>
  <Profile userId={1} />
</Suspense>
```

**Why it was invented:** Manually juggling `isLoading`/`error`/`data` flags in every component that needs async data is repetitive and pushes loading-state logic into places that shouldn't care about it. Suspense moves "what do we show while waiting" to a **declarative boundary** placed wherever makes sense in the tree — you can nest Suspense boundaries to get granular loading states (e.g., a page shell loads immediately, while a slow widget inside shows its own spinner) instead of blocking the whole page on the slowest piece.

**How to explain in an interview:** "Suspense lets a part of the tree 'pause' rendering and show a fallback while something isn't ready — originally for code-split components with React.lazy, and now extended to data fetching in libraries and frameworks that support it, like TanStack Query's suspense mode or Next.js Server Components. It's declarative — you place a Suspense boundary wherever you want a loading state, and you can nest them for fine-grained loading UI instead of one all-or-nothing spinner."

---

## 3. Concurrent Rendering Basics (React 18/19)

**What is it?** A set of features enabled by React's "Fiber" architecture (file 01) that let React **interrupt, pause, and prioritize** rendering work, instead of blocking the main thread with one uninterruptible render pass. The goal: keep the UI responsive even while doing expensive updates.

### useTransition
**What is it?** Lets you mark a state update as **low priority ("non-urgent")** so React can keep the UI (like a text input) responsive while that update happens in the background, without blocking user input.

```jsx
function SearchPage() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [isPending, startTransition] = useTransition();

  const handleChange = (e) => {
    setQuery(e.target.value); // urgent: keep the input feeling instant
    startTransition(() => {
      setResults(computeExpensiveResults(e.target.value)); // non-urgent: can be interrupted/delayed
    });
  };

  return (
    <>
      <input value={query} onChange={handleChange} />
      {isPending && <Spinner />}
      <ResultsList results={results} />
    </>
  );
}
```
**Why invented:** Before this, one expensive state update (e.g., re-filtering a huge list on every keystroke) would block the whole render, making the input itself feel laggy/janky. `startTransition` tells React "this update can wait/be interrupted if something more urgent (like the next keystroke) comes in."

### useDeferredValue
**What is it?** Similar goal, but instead of wrapping the *update*, you wrap a **value** — React will lazily "catch up" the deferred version of that value when it has spare time, keeping the immediate UI (e.g., the input) responsive.

```jsx
function SearchPage() {
  const [query, setQuery] = useState('');
  const deferredQuery = useDeferredValue(query); // lags behind `query` under heavy load
  return (
    <>
      <input value={query} onChange={(e) => setQuery(e.target.value)} />
      <ResultsList query={deferredQuery} /> {/* can render a bit "behind" without blocking input */}
    </>
  );
}
```

**`useTransition` vs `useDeferredValue`:**

| | useTransition | useDeferredValue |
|---|---|---|
| Wraps | A state **update** (a `setState` call) | A **value** you already have |
| Use when | You control the setState call that's expensive | You're receiving a prop/value you can't wrap in a transition yourself |
| Gives you | `isPending` flag | The deferred (possibly stale) value itself |

**Why concurrent rendering matters for interviews:** It's the headline feature of React 18/19 and frequently comes up as "what's new in modern React." The key idea to convey: **rendering became interruptible and priority-aware**, which is what makes features like streaming SSR (file 13), automatic batching, and responsive-while-busy UIs possible — a direct evolution of the Fiber architecture mentioned in his old notes.

## How to explain concurrent features in an interview (simple English)

"React 18 introduced concurrent rendering — React can now start rendering an update, pause it if something more urgent comes in (like a keystroke), and resume or discard it later. `useTransition` and `useDeferredValue` are the two hooks that let you tap into this: mark an expensive update as low-priority so it doesn't block more urgent UI updates like typing. It's the same underlying mechanism that also powers streaming server rendering and Suspense-based data fetching."

## See also
`examples/error-boundary.jsx` — class-based ErrorBoundary wrapping a component that throws.
`examples/suspense-lazy-loading.jsx` — `React.lazy` + `Suspense` code-splitting example.
