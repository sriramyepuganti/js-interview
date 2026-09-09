# 04 — Custom Hooks

## What is it?

A custom hook is just a regular JavaScript function whose name starts with `use`, that internally calls other hooks (`useState`, `useEffect`, etc.) to encapsulate and reuse **stateful logic** across multiple components.

```jsx
function useCounter(initial = 0) {
  const [count, setCount] = useState(initial);
  const increment = () => setCount(c => c + 1);
  const decrement = () => setCount(c => c - 1);
  return { count, increment, decrement };
}

// Usage in any component:
function Counter() {
  const { count, increment, decrement } = useCounter(0);
  return <button onClick={increment}>{count}</button>;
}
```

## Why were custom hooks invented?

Before hooks (pre-2019), if two unrelated components needed the same **stateful behavior** (e.g., "track window size," "debounce a value," "fetch data with loading/error state"), you had exactly two clunky options:

1. **Higher-Order Components (HOCs)** — wrap a component to inject props (`withWindowSize(MyComponent)`). Problem: "wrapper hell" — deeply nested trees of HOCs (`withA(withB(withC(MyComponent)))`), unclear prop origins, naming collisions between HOCs injecting the same prop name, and harder-to-read component trees in DevTools (this is exactly the pattern in the old `hoc.jsx` — see file 08 for the full breakdown).
2. **Render props** — pass a function as a child that receives the shared state (`<DataProvider>{data => <MyComponent data={data} />}</DataProvider>`). Problem: leads to deeply nested JSX ("callback hell" equivalent in JSX form), harder to compose multiple shared behaviors together.

Custom hooks solve this cleanly: **just call multiple hooks in the same function, no wrapping, no nesting, no extra components in the tree at all.** You get sharing of logic without any of the indirection — the component tree in DevTools stays flat and matches what you actually wrote. This is widely considered one of the best ergonomic wins hooks brought to React.

```jsx
// Old way (HOC) — adds a wrapper component to the tree
const EnhancedComponent = withWindowSize(withAuth(withTheme(MyComponent)));

// New way (custom hooks) — no wrapping, logic composed directly inside the component
function MyComponent() {
  const size = useWindowSize();
  const user = useAuth();
  const theme = useTheme();
  // ...
}
```

## How to build one — the rules

- Name must start with `use` (this is a **convention enforced by lint rules**, e.g. `eslint-plugin-react-hooks`, which uses the name to know it must apply the Rules of Hooks to that function).
- Internally, it's just composing existing hooks — there's no special "custom hook" API.
- It follows the same Rules of Hooks as any hook (top-level calls only, no conditionals/loops).
- Each component that calls a custom hook gets its **own independent state** — calling `useCounter()` in two different components does not share state between them (unless you explicitly share via Context or a store).

## Real-world / production custom hooks

### `useFetch` — data fetching with loading/error state

```jsx
// Simple custom hook: fetch JSON from a URL, track loading/error/data.
// NOTE: in real production code, prefer React Query / TanStack Query (see file 07) —
// this hand-rolled version is what interviewers often ask you to WRITE FROM SCRATCH
// to test your understanding of effects, cleanup, and race conditions.
function useFetch(url) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let ignore = false; // guards against setting state after this effect is stale
    setLoading(true);
    setError(null);

    fetch(url)
      .then(res => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then(json => { if (!ignore) { setData(json); setLoading(false); } })
      .catch(err => { if (!ignore) { setError(err); setLoading(false); } });

    return () => { ignore = true; }; // cleanup: ignore late responses if url changes/unmounts
  }, [url]);

  return { data, loading, error };
}
```
**Why the `ignore` flag matters:** if `url` changes quickly (e.g., a search box typing fast) or the component unmounts before the fetch resolves, an old fetch can resolve **after** a newer one and overwrite fresh data with stale data — a race condition. The cleanup flag prevents applying a stale response.

### `useDebounce` — delay updating a value until input settles

```jsx
// Returns a debounced version of `value` that only updates after `delay` ms
// of no changes. Classic use: search-as-you-type without firing an API call per keystroke.
function useDebounce(value, delay = 500) {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer); // cancel the pending update if value changes again before delay elapses
  }, [value, delay]);

  return debounced;
}

// Usage
function SearchBox() {
  const [text, setText] = useState('');
  const debouncedText = useDebounce(text, 400);

  useEffect(() => {
    if (debouncedText) searchApi(debouncedText); // fires only after typing pauses
  }, [debouncedText]);

  return <input value={text} onChange={e => setText(e.target.value)} />;
}
```

### `useLocalStorage` — sync state with `localStorage`

```jsx
// Behaves like useState, but persists the value to localStorage and
// reads the persisted value back on mount.
function useLocalStorage(key, initialValue) {
  const [value, setValue] = useState(() => {
    try {
      const stored = window.localStorage.getItem(key);
      return stored !== null ? JSON.parse(stored) : initialValue;
    } catch {
      return initialValue; // e.g. localStorage disabled, or corrupted JSON
    }
  });

  useEffect(() => {
    try {
      window.localStorage.setItem(key, JSON.stringify(value));
    } catch {
      // storage full or unavailable — fail silently, not critical
    }
  }, [key, value]);

  return [value, setValue];
}

// Usage
const [theme, setTheme] = useLocalStorage('theme', 'light');
```

### `useWindowSize` — track viewport dimensions reactively

```jsx
function useWindowSize() {
  const [size, setSize] = useState({
    width: window.innerWidth,
    height: window.innerHeight,
  });

  useEffect(() => {
    const handleResize = () =>
      setSize({ width: window.innerWidth, height: window.innerHeight });

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize); // cleanup, avoid leaks
  }, []);

  return size;
}
```

## How to explain custom hooks in an interview

"A custom hook is just a plain function starting with `use` that calls other hooks internally, so I can extract stateful logic — like fetching data, debouncing a value, or syncing with localStorage — and reuse it across components without any wrapper components in the tree. Before hooks existed, the only ways to share stateful logic were higher-order components or render props, both of which added extra nesting and indirection to the component tree. Custom hooks solve the same problem with plain function composition — flatter, easier to trace, and easier to test in isolation."

## See also
- Fully working versions of `useFetch`, `useDebounce`, and `useLocalStorage` are in `examples/custom-hooks-examples.jsx`.
