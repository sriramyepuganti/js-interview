# 08 — Higher-Order Components (HOC) and Render Props

## 1. Higher-Order Components

**What is it?** A function that takes a component and returns a **new** component with extra behavior/props injected — the component-level equivalent of a higher-order function.

```js
const EnhancedComponent = higherOrderComponent(WrappedComponent);
```

His old pattern (`hoc.jsx`), a HOC that injects click-counting behavior into whatever component it wraps:
```jsx
const HocCounter = (Component) => {
  return class extends React.Component {
    constructor(props) {
      super(props);
      this.state = { count: 0 };
    }
    render() {
      const { count } = this.state;
      return (
        <Component
          inc={() => this.setState({ count: this.state.count + 1 })}
          state={count}
        />
      );
    }
  };
};

const HoverCounter = (props) => <div onMouseEnter={props.inc}>hovered {props.state} times</div>;
export const HocComponent = HocCounter(HoverCounter); // HoverCounter gets `inc`/`state` injected
```

**Why HOCs were invented (pre-hooks era):** Function components couldn't hold state at all, and even class components had no clean built-in way to **share** stateful behavior (like "track clicks," "check auth," "provide window size") across multiple, otherwise-unrelated components without copy-pasting the logic into each one. HOCs let you write that shared logic **once**, in a wrapper, and reuse it by wrapping any component: `withAuth(Profile)`, `withWindowSize(Chart)`, `connect(mapState, mapDispatch)(MyComponent)` (Redux's `connect` is itself a HOC — you've already used one).

**Why hooks mostly replaced them:**

| Problem with HOCs | How custom hooks fix it |
|---|---|
| **Wrapper hell** — `withA(withB(withC(Component)))` creates deeply nested trees, hard to read in DevTools | Custom hooks are just function calls inside the component — flat, no extra tree nodes |
| **Prop name collisions** — two HOCs both injecting a prop called `data` silently overwrite each other | Hook return values are named explicitly wherever you destructure them — no silent collisions |
| **Unclear prop origin** — looking at `<Component data={...} />` you can't tell if `data` came from a HOC, the parent, or Redux, without checking the wrapper chain | You can see exactly which hook produced which value, right there in the function body |
| **Static properties/refs need manual forwarding** (`hoistNonReactStatics`, `forwardRef` boilerplate) | Not an issue — no wrapping component in between |

```jsx
// HOC version — extra wrapper component in the tree, unclear where `inc`/`state` come from
export const HocComponent = HocCounter(HoverCounter);

// Equivalent custom hook version — flat, explicit, no wrapper
function useCounter(initial = 0) {
  const [count, setCount] = useState(initial);
  return { count, inc: () => setCount((c) => c + 1) };
}
function HoverCounter() {
  const { count, inc } = useCounter();
  return <div onMouseEnter={inc}>hovered {count} times</div>;
}
```

## 2. Render Props

**What is it?** A technique for sharing code by passing a **function as a prop** — that function receives shared state/behavior and returns the JSX to render (mentioned explicitly in his old notes: *"render prop refers to a technique for sharing code... using a prop whose value is a function"*).

```jsx
// A DataProvider fetches data and hands it to whatever render function you give it
function DataProvider({ url, children }) {
  const [data, setData] = useState(null);
  useEffect(() => { fetch(url).then(r => r.json()).then(setData); }, [url]);
  return children(data); // children is a FUNCTION, not JSX — this is the "render prop"
}

// Usage
<DataProvider url="/api/user">
  {(data) => (data ? <Profile user={data} /> : <Spinner />)}
</DataProvider>
```

**Why it existed:** Same motivation as HOCs — share stateful logic across components — but avoids some HOC pitfalls (no wrapper component needed, no prop name collisions since you destructure the callback's argument yourself). Downside: deeply nested render-prop usage creates a JSX "pyramid of doom" that's hard to read, similar to nested callbacks in async JS before `async`/`await`.

## Where HOCs/render props are STILL legitimately used today

They didn't disappear entirely — hooks can't solve every case:

1. **Wrapping a component to intercept its rendering entirely** — e.g., `React.memo(Component)` and `React.forwardRef(Component)` are themselves HOCs (functions that take a component, return a new one) — you use them constantly without calling them "HOCs."
2. **Library integration where you don't control the consuming component's internals** — e.g., older Redux `connect()`, or React Router's legacy `withRouter`, both still exist and work as HOCs for class components that can't use hooks.
3. **Cross-cutting concerns that must wrap the ENTIRE render output**, not just inject data — e.g., an error boundary can only be a class component (see file 09) — wrapping a component with an error-boundary HOC is still a legitimate pattern: `withErrorBoundary(MyComponent)`.
4. **Component libraries exposing flexible rendering via a `render` prop** — e.g., some UI libraries (headless UI patterns, older versions of react-table, Downshift) use render props/child-as-function specifically so consumers can fully control markup while the library controls behavior/state — this pattern is sometimes called "headless components" and is still common, though many modern libraries now expose the same idea via custom hooks instead (e.g., Downshift-style logic now often exposed as `useCombobox()`).

## Interview model answer

"HOCs and render props were the pre-hooks way to share stateful logic between components — a HOC wraps a component and injects props, a render prop passes a function as `children` that receives shared state. Both work, but they add extra indirection: HOCs create wrapper components that clutter the tree and can collide on injected prop names, and render props can nest awkwardly. Hooks mostly replaced both because you can just call a function inside your component with no extra wrapping. That said, they're not obsolete — `React.memo` and `forwardRef` are HOCs, error boundaries still require a class-based wrapper since there's no hook equivalent, and some component libraries still expose flexible render-prop or headless-component APIs when the consumer needs full control over markup."

## See also
`examples/hoc-example.jsx` — `withLoading` HOC plus the equivalent custom hook version, side by side.
