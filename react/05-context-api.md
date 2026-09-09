# 05 — Context API

## What is it?

Context is a built-in React mechanism to pass data through the component tree **without manually threading it through props at every level**. You create a context, wrap part of your tree in a `Provider` with a value, and any descendant — no matter how deep — can read that value with `useContext` (or `static contextType` / `<Context.Consumer>` in class components, as in the old notes).

```jsx
const ThemeContext = React.createContext('light'); // 'light' = default value if no Provider above

function App() {
  return (
    <ThemeContext.Provider value="dark">
      <Toolbar />
    </ThemeContext.Provider>
  );
}

function Toolbar() {
  return <Button />; // Toolbar doesn't need to know/pass "theme" at all
}

function Button() {
  const theme = useContext(ThemeContext); // reads "dark" directly, however deep it is
  return <button className={theme}>Click</button>;
}
```

Old class-component equivalent (from the old notes, still valid, but rare in new code):
```jsx
class SubChild extends React.Component {
  static contextType = ThemeContext;
  render() { return <div>{this.context}</div>; }
}
```

## Why was it invented? — the prop-drilling problem

Without Context, if `Button` (5 levels deep) needs `theme`, you must pass `theme` as a prop through **every intermediate component** (`App → Layout → Toolbar → Group → Button`), even though `Layout`, `Toolbar`, and `Group` don't use `theme` themselves — they just forward it. This is called **prop drilling**.

Problems with prop drilling:
- Intermediate components get cluttered with props they don't actually use, just to pass them along.
- Renaming/refactoring a prop means touching every file in the chain.
- Adding a new deeply-nested consumer means threading the prop through the *entire* path again.

Context lets `Button` "teleport" directly to the value from `App`'s Provider, skipping all the components in between.

## When to use Context vs Redux vs Component Composition

This is a very common senior interview question — the honest answer is: **Context is not a state management replacement for Redux; it's a dependency-injection mechanism.**

| | Component Composition (pass props/children) | Context | Redux / Zustand / global store |
|---|---|---|---|
| Best for | 1-2 levels of prop passing, or "pass the whole child down" (e.g. Card/children pattern) | App-wide but rarely-changing values: theme, current user/auth, locale, feature flags | Frequently-changing shared state, complex business logic, state accessed from many unrelated parts of the app, need for devtools/time-travel debugging |
| Update frequency | N/A | Low — every value change re-renders **all consumers** | Any frequency — selector-based subscriptions avoid over-rendering |
| Built-in? | Yes | Yes (`createContext`) | No — external library |
| Debug tooling | N/A | Minimal (React DevTools component tree) | Excellent (Redux DevTools: time travel, action log) |

**Rule of thumb people say in interviews:** "First try prop composition. If that gets painful, reach for Context — but only for low-frequency, broadly-needed values. If you have complex, frequently-updating, cross-cutting state, or need great debugging/devtools, use a dedicated state library (Redux Toolkit, Zustand, Jotai — see file 07)."

Sometimes composition alone solves what looks like a Context problem — e.g., instead of drilling a value down, just pass the *already-rendered component* down as `children` or a prop, so intermediate layers don't need to know about the data at all:
```jsx
// Instead of drilling `user` through Page -> Layout -> Header
<Layout header={<Header user={user} />} /> // Layout just renders {props.header}, doesn't need `user`
```

## Performance pitfall — "Context re-renders everything"

**The problem:** Every component that calls `useContext(SomeContext)` **re-renders whenever the Provider's `value` changes** — even if that consumer only cares about *part* of the value, and even if the part it cares about didn't change.

```jsx
// BAD: one big context object holding unrelated things
const AppContext = createContext();
function AppProvider({ children }) {
  const [user, setUser] = useState(null);
  const [theme, setTheme] = useState('light');
  // New object literal every render → EVERY consumer re-renders on ANY change,
  // even a component that only reads `theme` re-renders when `user` changes.
  const value = { user, setUser, theme, setTheme };
  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}
```
Two compounding issues here:
1. The `value` object is a **new object every render** (even if `user`/`theme` didn't change) — this alone forces every consumer to re-render, since context comparison is reference-based (like `React.memo`'s shallow prop check).
2. Even if memoized, a `theme`-only consumer still re-renders when `user` changes, because they're bundled in the same context.

### Fix 1 — memoize the value

```jsx
const value = useMemo(() => ({ user, setUser, theme, setTheme }), [user, theme]);
```
This stops the "new object every render" problem, but consumers still re-render on **any** field change since they're all in one context value.

### Fix 2 — split into separate contexts by concern/update-frequency

```jsx
const UserContext = createContext();
const ThemeContext = createContext();

function AppProviders({ children }) {
  const [user, setUser] = useState(null);
  const [theme, setTheme] = useState('light');
  const userValue = useMemo(() => ({ user, setUser }), [user]);
  const themeValue = useMemo(() => ({ theme, setTheme }), [theme]);
  return (
    <UserContext.Provider value={userValue}>
      <ThemeContext.Provider value={themeValue}>
        {children}
      </ThemeContext.Provider>
    </UserContext.Provider>
  );
}
```
Now a component using only `useContext(ThemeContext)` never re-renders when `user` changes, because it's not subscribed to `UserContext` at all.

### Fix 3 — memoize consuming components with React.memo
If a consumer's own rendered output doesn't depend on the *specific* thing that changed, wrapping it in `React.memo` can help — but note `React.memo` does NOT protect against context changes by itself (context reads inside a memoized component still force it to re-render on context changes; memo only helps against prop changes from the parent).

## Real-world usage
- Theme (light/dark mode) — low frequency, needed almost everywhere.
- Authenticated user/session info — read broadly, changes rarely (login/logout).
- i18n/locale strings.
- Feature flags.
- NOT recommended for: frequently updating form state, real-time data (websocket ticks), large shared collections that many components filter/select from differently — those belong in a proper state library with selector-based subscriptions.

## How to explain in an interview (simple English)

"Context solves prop drilling — passing a value through many layers of components that don't actually need it, just to get it to a deeply nested child. You wrap a subtree in a Provider and any descendant can read the value directly with `useContext`. The catch is that every consumer of a context re-renders whenever its value changes, even if they only care about part of it — so for frequently changing state, or when you need fine-grained subscriptions, a proper state library beats Context. In production I split contexts by concern and memoize the Provider's value to avoid over-rendering, rather than dumping everything into one big context object."

## See also
`examples/context-api-example.jsx` — theme + auth context example, plus a demo of the re-render pitfall and the context-splitting fix.
