# 02 — Components, Props, State

## 1. Function vs Class Components

**What is it?**
A component is a JS function (or class) that takes inputs (`props`) and returns a description of UI (JSX). React supports two ways to write one: function components and class components.

```jsx
// Function component (modern, standard)
function Welcome(props) {
  return <h1>Hello, {props.name}</h1>;
}

// Class component (legacy, from his old notes)
class Welcome extends React.Component {
  render() {
    return <h1>Hello, {this.props.name}</h1>;
  }
}
```

**Why the shift happened:**
Class components existed because, before React 16.8 (2019), only classes could hold local state and lifecycle methods (`componentDidMount`, `componentDidUpdate`, etc.) — function components were "dumb" and stateless. Hooks (`useState`, `useEffect`, ...) were introduced specifically to let function components do everything classes could, **without the downsides of classes**:
- No more `this` binding headaches (`this.withBind = this.withBind.bind(this)` boilerplate you'll recognize from old notes).
- Easier to share stateful logic between components (custom hooks vs HOC/render-props wrapper hell — see file 04/08).
- Related logic could live together (e.g., subscribe/unsubscribe in one `useEffect`) instead of split across `componentDidMount` and `componentWillUnmount`.
- Smaller bundle size, better minification, easier to statically analyze.

**Status today (important for interviews):** Class components are **legacy / maintenance mode**. React core team has said there's no plan to remove them, but **all new code should use function components + hooks**. The only thing classes can still do that hooks (as of React 18) cannot is **error boundaries** in their full class form — though the community library `react-error-boundary` wraps this so you rarely write a class yourself anymore (see file 09).

| | Class Component | Function Component (Hooks) |
|---|---|---|
| State | `this.state` + `this.setState()` | `useState` / `useReducer` |
| Side effects | `componentDidMount`, `componentDidUpdate`, `componentWillUnmount` | `useEffect` / `useLayoutEffect` |
| `this` binding | Required, error-prone | Not needed |
| Code reuse | HOC / render props | Custom hooks (simpler) |
| Error boundaries | Yes (`componentDidCatch`, `getDerivedStateFromError`) | No native hook equivalent — use `react-error-boundary` |
| Status in 2025/2026 | Legacy, maintenance only | Standard, all new code |

**How to explain in an interview:**
"Class components were the only way to have state and lifecycle before hooks existed. Hooks, added in React 16.8, let function components do the same things with less boilerplate and easier logic reuse. Today classes are considered legacy — you'll see them in older codebases and for error boundaries occasionally, but all new code is written with function components and hooks."

---

## 2. Props vs State

**What is it?**
- **Props** — data passed **into** a component from its parent. Read-only from the receiving component's perspective.
- **State** — data owned and managed **inside** a component, that can change over time and triggers a re-render when updated.

```jsx
function Counter({ initialValue }) {   // initialValue is a PROP
  const [count, setCount] = useState(initialValue); // count is STATE
  return <button onClick={() => setCount(count + 1)}>{count}</button>;
}
```

**Why this separation exists:**
React enforces "props are immutable" (mentioned explicitly in the old notes) because components must behave like **pure functions** with respect to their props — same props in, same UI out, no side mutation. This predictability is what makes the Virtual-DOM diffing model work: React can trust that if props/state haven't changed, it doesn't need to re-render (this is literally what `React.memo` checks, see file 06).

If a child could freely mutate the props object it receives, the parent's data would change underneath it unpredictably, breaking the "single source of truth" model and making bugs very hard to trace.

**One-way data flow:**
Data flows **down** the tree via props. To send data back **up**, a child calls a **callback function** passed to it as a prop (this is exactly the `emit`/`readIt` pattern from the old `functionalComponent.jsx`/`classComponents.jsx` notes — `props.emit("message from child")`). There's no built-in "two-way binding" like older frameworks had — you always pass a function down for the child to call.

```jsx
function Parent() {
  const [msg, setMsg] = useState('');
  return <Child onSend={(text) => setMsg(text)} />; // pass callback down
}
function Child({ onSend }) {
  return <button onClick={() => onSend('hello from child')}>Send</button>;
}
```

**Lifting state up:** When two sibling components need to share state, you move (“lift”) that state to their closest common parent, and pass it down as props to both — this was in the old notes too, and it's still the first tool you reach for before jumping to Context or a state library.

**How to explain in an interview:**
"Props are inputs a component receives from its parent and must treat as read-only. State is data a component owns locally that can change and causes it to re-render. Data always flows one direction — down through props — so if a child needs to affect a parent, it does so by calling a callback function the parent passed down as a prop, not by mutating anything directly."

---

## 3. Controlled vs Uncontrolled Components

**What is it?**
This applies specifically to form inputs.
- **Controlled**: the input's value is driven by React state — `<input value={state} onChange={...} />`. React is the single source of truth.
- **Uncontrolled**: the input manages its own value internally in the DOM; React reads it only when needed, usually via a `ref` — `<input ref={inputRef} />` then `inputRef.current.value`.

```jsx
// Controlled
function ControlledInput() {
  const [text, setText] = useState('');
  return <input value={text} onChange={(e) => setText(e.target.value)} />;
}

// Uncontrolled
function UncontrolledInput() {
  const inputRef = useRef(null);
  const handleSubmit = () => alert(inputRef.current.value);
  return <>
    <input ref={inputRef} defaultValue="" />
    <button onClick={handleSubmit}>Submit</button>
  </>;
}
```

**Why both exist:**
Controlled components give you instant access to the value for validation, conditional UI, formatting — but re-render on every keystroke. Uncontrolled components skip that re-render cost and are simpler for "just grab the value on submit" cases, or when integrating with non-React code/libraries that expect to manage their own DOM (e.g., some file inputs, or third-party widgets).

**Real-world usage:** Most form libraries (Formik, React Hook Form) default to **uncontrolled** inputs with refs internally for performance — they only trigger re-renders on submit/validation, not every keystroke, which matters a lot in forms with 50+ fields.

**How to explain in an interview:**
"Controlled inputs keep the value in React state, so React is the source of truth and you get real-time access for things like validation. Uncontrolled inputs let the DOM hold the value and you pull it out via a ref when you need it — less re-rendering, useful for simple forms or large forms where per-keystroke re-renders would hurt performance. Modern form libraries like React Hook Form lean uncontrolled internally for that reason."

---

## 4. Composition vs Inheritance

**What is it?**
Composition means building complex components by combining simpler ones together (nesting components, passing `children`, passing components as props). Inheritance means one component extends another via class inheritance (`class Dog extends Animal`).

**Why React recommends composition over inheritance:**
There's no strong use case for inheriting one component from another in React (component hierarchies map to UI structure, not "is-a" relationships like OOP class hierarchies). Composition is more flexible: a component that doesn't know its children ahead of time can just render `{props.children}`.

```jsx
function Card({ children }) {
  return <div className="card-panel">{children}</div>;
}

// usage — composition, not inheritance
<Card>
  <h2>Title</h2>
  <p>Some content passed in from the outside</p>
</Card>
```

Composition also covers "specialization" — a more specific component built by configuring a general one via props, instead of inheriting from it:
```jsx
function Dialog({ title, message }) {
  return <FancyBorder color="blue"><h1>{title}</h1><p>{message}</p></FancyBorder>;
}
```

**How to explain in an interview:**
"React favors composition — nesting and configuring components via props/children — over class inheritance. UI structures naturally map to trees of composed components, not 'is-a' relationships, so there's rarely a real need to extend one component from another. `props.children` is the main mechanism: a generic wrapper component doesn't need to know what's inside it ahead of time."

---

## 5. Class Component Lifecycle Methods — the Full List

**What is it?**
Section 1 mentioned that classes have "lifecycle methods" in passing — this section is the complete list, in the exact order each one fires, plus its hook equivalent. Interviewers frequently ask this directly ("walk me through a class component's lifecycle") even at teams that write zero class components day-to-day, because it's also how they probe whether you *actually* understand what `useEffect`'s dependency array is standing in for.

A class component's life has three phases: **Mounting** (first appears), **Updating** (re-renders from new props/state), and **Unmounting** (removed from the tree).

**Mounting — in order:**
```jsx
class Example extends React.Component {
  constructor(props) {
    super(props);
    // 1. Set up initial this.state, bind methods. No side effects, no DOM access —
    //    the component isn't in the DOM yet.
    this.state = { count: 0 };
  }

  static getDerivedStateFromProps(props, state) {
    // 2. Rare. Fires right before EVERY render (mount AND update). Must be a pure
    //    function — derives state from incoming props. No `this`, no side effects.
    return null; // return null to signal "no state change from this"
  }

  render() {
    // 3. Pure. Returns JSX describing the UI. No side effects/DOM mutations here.
    return <div>{this.state.count}</div>;
  }

  componentDidMount() {
    // 4. Runs ONCE, right after the component is first inserted into the real DOM.
    //    This is where side effects belong: fetch data, subscribe, measure the DOM.
    //    Equivalent to: useEffect(() => { ... }, [])
    fetchData().then((data) => this.setState({ data }));
  }
}
```

**Updating — in order (triggered by new props, `setState`, or `forceUpdate`):**
```jsx
class Example extends React.Component {
  static getDerivedStateFromProps(props, state) {
    // 1. Fires again before every re-render, same as during mount.
    return null;
  }

  shouldComponentUpdate(nextProps, nextState) {
    // 2. Return false to SKIP re-rendering entirely — a manual performance escape
    //    hatch. This is the class-era ancestor of what React.memo's shallow prop
    //    comparison does automatically for function components (see file 06).
    return nextProps.id !== this.props.id;
  }

  render() {
    // 3. Same as mounting.
    return <div>{this.state.count}</div>;
  }

  getSnapshotBeforeUpdate(prevProps, prevState) {
    // 4. Fires right BEFORE the DOM is actually updated to match the new render.
    //    Used to capture something about the DOM as it currently is (before the
    //    update lands) — e.g., scroll position, so it can be restored afterward.
    //    Whatever you return here is passed as the 3rd argument to componentDidUpdate.
    return this.listRef.scrollHeight;
  }

  componentDidUpdate(prevProps, prevState, snapshot) {
    // 5. Fires AFTER the DOM has been updated. Compare prevProps/prevState manually
    //    to know "what actually changed" — hooks handle this automatically via the
    //    useEffect dependency array instead of manual if-checks here.
    //    Equivalent to: useEffect(() => { ... }, [deps])
    if (snapshot !== null) {
      this.listRef.scrollTop += this.listRef.scrollHeight - snapshot;
    }
  }
}
```

**Unmounting:**
```jsx
componentWillUnmount() {
  // Cleanup: cancel subscriptions, clear timers/intervals, abort in-flight fetches.
  // Equivalent to: the cleanup function RETURNED from useEffect.
  clearInterval(this.timerId);
  this.subscription.unsubscribe();
}
```

**Real-world usage of the less-common ones:**
- `getDerivedStateFromProps` — very rare in practice; almost every case people reached for it is now better solved by computing the derived value directly in `render`/the function body, or (in hooks) just during render, without storing it in state at all.
- `getSnapshotBeforeUpdate` — the textbook use case is exactly the chat-list/scroll-position example above: a chat log that auto-prepends older messages when you scroll up shouldn't visually "jump" — you capture the scroll height *before* the DOM updates, then adjust `scrollTop` by the delta *after*, in `componentDidUpdate`. There is genuinely no clean hooks equivalent for this exact "read the DOM right before mutation, use that value right after" pairing — you'd reach for `useLayoutEffect` plus a ref to store the pre-update measurement yourself.
- `shouldComponentUpdate` — superseded by `React.memo` + `PureComponent` (a class base that does the same shallow-compare automatically without writing `shouldComponentUpdate` by hand) for function/class components respectively.

**Full mapping to hooks (the table to memorize):**

| Class lifecycle method | Phase | Hook equivalent |
|---|---|---|
| `constructor` | Mount | `useState` initial value |
| `getDerivedStateFromProps` | Mount + Update | Compute the value directly during render (no hook needed) |
| `render` | Mount + Update | The function component body itself |
| `componentDidMount` | Mount | `useEffect(() => {...}, [])` |
| `shouldComponentUpdate` | Update | `React.memo` (shallow prop compare) |
| `getSnapshotBeforeUpdate` | Update | No direct hook equivalent — `useLayoutEffect` + a ref |
| `componentDidUpdate` | Update | `useEffect(() => {...}, [deps])` |
| `componentWillUnmount` | Unmount | The cleanup function returned from `useEffect` |
| `getDerivedStateFromError` / `componentDidCatch` | Error | No hook equivalent — this is why error boundaries must still be classes (see file 09) |

**How to explain in an interview:**
"Mounting goes constructor, `getDerivedStateFromProps`, render, then `componentDidMount`. Updating re-runs `getDerivedStateFromProps`, then `shouldComponentUpdate` as an optional bail-out, then render, `getSnapshotBeforeUpdate`, and `componentDidUpdate`. Unmounting is just `componentWillUnmount` for cleanup. Hooks collapse most of this: `useState` replaces the constructor's initial state, `useEffect` with an empty array covers `componentDidMount`, the same `useEffect` with a dependency array covers `componentDidUpdate`, and its cleanup function covers `componentWillUnmount`. The two that don't map cleanly are `getSnapshotBeforeUpdate`, which needs `useLayoutEffect` plus a ref to replicate, and error-boundary methods, which have no hook equivalent at all."

---

## 6. Type-Checking Props: PropTypes vs TypeScript

**What is it?**
Both are ways to catch "you passed the wrong shape of data into this component" bugs before they cause a runtime crash or a silent wrong render — they just catch them at different times:

- **`prop-types`** — a small runtime library. You declare the expected shape of `props` on a component, and if a caller passes the wrong type, React logs a **console warning in development** (nothing happens in production — it's stripped/ignored).
```jsx
import PropTypes from 'prop-types';

function UserCard({ name, age, onSelect }) {
  return <div onClick={() => onSelect(name)}>{name} ({age})</div>;
}

UserCard.propTypes = {
  name: PropTypes.string.isRequired,
  age: PropTypes.number,
  onSelect: PropTypes.func.isRequired,
};
```

- **TypeScript** — a compile-time type system layered on top of JS. Prop mismatches are caught **while writing code, in the editor, and again at build time** — before the code ever runs, not just as a dev-console warning after it renders with bad data.
```tsx
type UserCardProps = {
  name: string;
  age?: number;
  onSelect: (name: string) => void;
};

function UserCard({ name, age, onSelect }: UserCardProps) {
  return <div onClick={() => onSelect(name)}>{name} ({age})</div>;
}
```

**Why was this invented / what problem does it solve?**
Plain JS gives you zero guarantees about what a component actually receives — `<UserCard name={42} onSelect="not a function" />` compiles and renders fine, then fails (or worse, silently misbehaves) somewhere downstream, often far from where the mistake was actually made. `prop-types` was React's first answer to this (2017-era, split out of React core into its own package), giving teams a lightweight, no-build-step way to self-document a component's contract and catch misuse in dev. TypeScript solves the same underlying problem far more thoroughly: it type-checks props (and state, refs, event handlers, hook return values — everything, not just component boundaries), catches mistakes **before** code ever runs, and gives real editor autocomplete/refactoring support that a runtime-only check like `prop-types` can't provide.

**Real-world / real-time usage:**
- `prop-types` still shows up in older codebases and some plain-JS (non-TypeScript) projects/libraries that want lightweight runtime documentation without adopting a whole type system, but it has been steadily abandoned industry-wide in favor of TypeScript.
- TypeScript is the **default expectation** for senior React roles and virtually all new production React codebases today (`create-vite --template react-ts`, Next.js's default template, etc.). Typing props is the single most common everyday use, but senior-level TS+React usage goes further:
  - Typing `useState`/`useReducer` generically: `useState<User | null>(null)`.
  - Typing children explicitly: `{ children: React.ReactNode }` (or `React.ReactElement` for a single required element).
  - Discriminated unions for props that vary by a `variant`/`type` field, so TypeScript forces you to handle every case:
    ```tsx
    type ButtonProps =
      | { variant: 'link'; href: string }
      | { variant: 'button'; onClick: () => void };
    ```
  - Typing custom hooks' return values (tuples like `useState` returns, or an object) so consumers get full autocomplete.
  - Generic components (`function List<T>({ items, renderItem }: { items: T[]; renderItem: (item: T) => React.ReactNode })`) for reusable components that work across different data shapes without losing type safety.

**How to explain in an interview (simple English):**
"`prop-types` is a runtime library — it checks the shape of props while the app is running and logs a dev-only console warning if something's wrong, but by then the component has already rendered with bad data at least once. TypeScript checks types at compile time, in the editor, before the code ever runs, and it covers far more than just props — state, refs, hook returns, event handlers. Because of that, the industry has largely moved from `prop-types` to TypeScript for anything beyond small/legacy projects. In my own work I default to TypeScript, type props with an explicit `type`/`interface`, use discriminated unions when a component's valid prop combinations depend on a `variant` field, and type custom hooks' return values so consumers get autocomplete instead of just hoping they pass the right thing."

## See also
- Side-by-side runnable comparison in `examples/proptypes-vs-typescript.jsx` (and its `.tsx` twin).
