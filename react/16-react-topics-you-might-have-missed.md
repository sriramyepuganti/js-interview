# 16 — React Topics You Might Have Missed

A grab-bag of fundamental-to-advanced React topics that come up in senior interviews but don't fit neatly into files 01-15: Portals, Fragments, StrictMode, two React 18 hooks that didn't make it into file 03 (`useSyncExternalStore`, `useId`), the React 18 automatic-batching behavior change, micro-frontends at an awareness level, and React-specific accessibility concerns. (The full class-component lifecycle method list lives in file 02, section 5, since it's a direct extension of that file's Function vs Class Components section.)

---

## 1. Portals (`ReactDOM.createPortal`)

**What is it?**
A way to render a child component's output into a **different DOM node** than the one it's logically nested inside in the React tree — while it still behaves like a normal React child for everything else (context, event bubbling, prop flow).

```jsx
import { createPortal } from 'react-dom';

function Modal({ children, onClose }) {
  return createPortal(
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        {children}
      </div>
    </div>,
    document.getElementById('modal-root') // a DOM node OUTSIDE the app's normal React root, usually a sibling of #root in index.html
  );
}

// Usage — logically nested deep inside the component tree...
function App() {
  const [open, setOpen] = useState(false);
  return (
    <div className="app-container" style={{ overflow: 'hidden' }}>
      <button onClick={() => setOpen(true)}>Open modal</button>
      {open && <Modal onClose={() => setOpen(false)}>Hello from a portal!</Modal>}
    </div>
  );
}
```

**Why it was invented — the actual problem it solves:**
CSS properties like `overflow: hidden`, `z-index` stacking contexts, and `transform` on an ancestor create **containment** that a normal child can't visually escape, no matter how high its own `z-index` is set. A modal, tooltip, or dropdown rendered as a normal nested child of a scrollable card or a `transform`-ed carousel item can get **visually clipped or trapped behind other elements** — CSS alone can't fix this if the ancestor's `overflow`/stacking context is load-bearing for its own layout.

A portal renders the modal's actual DOM node as a sibling of `<body>` (or wherever you mount it) — completely outside that ancestor's stacking/overflow context — while `Modal` still lives logically inside `App` in React's tree: it still receives props from its parent, still has access to any Context providers above it, and clicks inside it still bubble up through React's synthetic event system to handlers on its logical (not DOM) ancestors.

**Real-world usage:** modals/dialogs, tooltips, dropdown menus, toast/notification systems — basically any UI that needs to visually render "on top of everything" regardless of where it's used in the component tree.

**Key nuance (common interview trap):** Portals only change **where the DOM node ends up** — everything else about React's tree (context, event bubbling order, prop flow, effect timing) stays exactly as if the child were rendered in place. This is different from an `<iframe>`, which would isolate everything.

**How to explain in an interview:**
"A portal lets me render a component's DOM output into a completely different part of the actual DOM tree — usually a dedicated `#modal-root` node right before `</body>` — while keeping it a normal child in React's tree for props, context, and event bubbling. I reach for it for modals, tooltips, and dropdowns, because a normal nested child can get visually clipped by an ancestor's `overflow: hidden` or trapped behind other elements by a `z-index` stacking context that CSS alone can't escape — rendering the DOM node as a sibling of the whole app avoids that entirely."

---

## 2. Fragments (`<>...</>` / `React.Fragment`, keyed fragments)

**What is it?**
A Fragment lets a component return multiple sibling elements from `render`/a function body **without** wrapping them in an actual extra DOM node like a `<div>`.

```jsx
// Without Fragment — this REQUIRES a wrapper element, since a component can only
// return one root node
function Glossary() {
  return (
    <div> {/* unwanted wrapper div — shows up in the real DOM for no reason */}
      <dt>JSX</dt>
      <dd>A syntax extension for JS...</dd>
    </div>
  );
}

// With Fragment — no extra DOM node at all
function Glossary() {
  return (
    <>
      <dt>JSX</dt>
      <dd>A syntax extension for JS...</dd>
    </>
  );
}
```

**Why it was invented — the actual problem it solves:**
Before Fragments (React 16+), every component that needed to return sibling elements was forced to wrap them in a real DOM element (usually a `div`), even when that wrapper had **no semantic or styling purpose** — just existing to satisfy "a component must return one root node." This causes real problems, not just "extra HTML noise":
- **Breaks CSS layouts that depend on direct parent-child relationships** — e.g., a CSS Grid or Flexbox parent expecting its *immediate* children to be grid/flex items breaks if a component wraps its output in an unrelated `div`, since now the grid's real children are that one `div`, not the intended items.
- **Invalid HTML in some cases** — e.g., a component meant to render `<tr>` rows inside a `<table>`, or `<dt>`/`<dd>` pairs inside a `<dl>`, cannot legally wrap those in a `div` without breaking the table/definition-list semantics.
- **Unnecessary DOM bloat** at scale — thousands of pointless wrapper `div`s across a large app add real (if small) memory/layout cost.

**Keyed Fragments** — the short `<>` syntax can't take a `key`, but `<React.Fragment key={...}>` can. Needed specifically when Fragments themselves are the items in a list (so each needs a stable identity, same reasoning as file 01's `key` section):

```jsx
function Glossary({ terms }) {
  return (
    <dl>
      {terms.map((term) => (
        // Each Fragment IS the list item here — it needs a key just like any
        // other element would, but the short <> syntax doesn't support props/key.
        <React.Fragment key={term.id}>
          <dt>{term.title}</dt>
          <dd>{term.description}</dd>
        </React.Fragment>
      ))}
    </dl>
  );
}
```

**Real-world usage:** returning `<tr>`s from a row-rendering component used inside a `<table>`, returning `<dt>`/`<dd>` pairs into a `<dl>` (as above), grid/flex layouts where the parent needs its real children to be the grid/flex items, and simply avoiding "div soup" in the DOM inspector for components that don't need a wrapper element at all.

**How to explain in an interview:**
"Fragments let a component return multiple sibling elements without an extra wrapper DOM node. Before Fragments, you were forced to wrap output in something like a `div` just to satisfy 'one root element per component,' which could break CSS Grid/Flexbox layouts that expect direct children, or produce invalid HTML if the real parent needs to be a `table` or `dl`. The short `<>...</>` syntax covers most cases; I reach for the explicit `<React.Fragment key={...}>` form specifically when the Fragments themselves are items in a list and need a stable key."

---

## 3. `React.StrictMode`

**What is it?**
A wrapper component (`<StrictMode>...</StrictMode>`, usually placed around the whole app in `main.jsx`/`index.js`) that enables extra **development-only** checks and warnings. It renders nothing itself and has **zero effect on the production build**.

```jsx
import { StrictMode } from 'react';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>
);
```

**What it actually does in development:**
1. **Double-invokes** certain functions to help you find impure/unsafe code:
   - Component function bodies (render logic) are called twice per render in dev.
   - `useState`/`useReducer`/`useMemo` **initializer** functions run twice.
   - As of React 18, effects mount → unmount → mount again on initial mount (`useEffect`/`useLayoutEffect` setup and cleanup both fire twice) — this is the big one that surprises people migrating to React 18, since it can make a `componentDidMount`-style effect *look* like it's running twice in a way it never did before.
2. Warns about legacy/deprecated APIs (old string refs, legacy context API, some deprecated lifecycle method names).
3. Helps detect unexpected side effects during render (since render must be a pure function of props/state — no mutating a variable outside its own scope, no random side effects during the render body itself).

**Why invented — the actual problem it solves:**
React's concurrent rendering model (Fiber/Concurrent React, see file 01/09) means React may **start rendering, throw the work away, and render again** without ever committing the first attempt (for prioritization reasons) — or, with effects specifically, React may need to mount/unmount/remount a component's effects to prepare for future features like reusable component state across navigations. If a component's render logic or an effect's setup/cleanup is **not actually idempotent/pure** — e.g., an effect's cleanup doesn't fully undo what its setup did, or a render body mutates something outside itself — that impurity becomes an invisible landmine that might only surface as a rare, hard-to-reproduce bug in production under specific timing. StrictMode intentionally double-invokes these functions in dev, on every render, so that impure code **breaks loudly and immediately** during development instead of shipping silently and failing unpredictably for users later.

**Why it does NOT double-invoke in production:**
The double-invoking is purely a development diagnostic tool — it's not something users need protection from, and doing it in production would double the actual work (double network calls in effects, double expensive computations) for zero benefit to end users. React strips this behavior out of the production build entirely, so there's no runtime cost or behavior change for real users — StrictMode's checks only ever run in development.

**Real-world usage / common gotcha:** After upgrading to React 18, a team sees their `useEffect(() => { fetchData() }, [])` firing twice on mount in dev and panics that "React is broken" — it's StrictMode surfacing that the effect's cleanup doesn't actually cancel the in-flight fetch, which was always a latent bug (e.g., a race condition risk), just newly visible.

**How to explain in an interview:**
"StrictMode is a development-only wrapper that intentionally double-invokes component render functions, state initializers, and — since React 18 — effect setup/cleanup on mount, specifically to surface code that isn't actually pure/idempotent, before it becomes a hard-to-reproduce production bug caused by React's concurrent rendering discarding and re-running work. It has zero effect in production — no extra renders, no extra network calls — React strips all of that out of the production build, since it's purely a dev-time diagnostic, not a real behavior users need."

---

## 4. `useSyncExternalStore` (React 18)

**What is it?**
A hook specifically for safely subscribing a component to **external mutable state** — state that lives outside React entirely (a third-party store library, `window` APIs like `navigator.onLine`, a global event emitter) — and reading its current value, in a way that's guaranteed correct under React 18's concurrent rendering.

```jsx
import { useSyncExternalStore } from 'react';

// A tiny external store (not React state at all — just a plain JS object + listeners)
const onlineStore = {
  listeners: new Set(),
  subscribe(listener) {
    window.addEventListener('online', listener);
    window.addEventListener('offline', listener);
    this.listeners.add(listener);
    return () => {
      window.removeEventListener('online', listener);
      window.removeEventListener('offline', listener);
      this.listeners.delete(listener);
    };
  },
  getSnapshot() {
    return navigator.onLine;
  },
};

function useOnlineStatus() {
  return useSyncExternalStore(
    onlineStore.subscribe.bind(onlineStore), // subscribe(callback) => unsubscribe function
    onlineStore.getSnapshot.bind(onlineStore) // getSnapshot() => current value, synchronously
  );
}

function StatusBadge() {
  const isOnline = useOnlineStatus();
  return <span>{isOnline ? 'Online' : 'Offline'}</span>;
}
```

**Why it was invented — the actual problem it solves ("tearing"):**
Before React 18's concurrent rendering, a naive "subscribe to an external store" custom hook (using `useState` + `useEffect` to subscribe/set state on change) mostly worked fine, because rendering was always synchronous and atomic. Concurrent rendering changes that: React can now pause a render partway through, work on something more urgent, and resume later. If the external store's value **changes in between** the paused and resumed parts of that same render, different parts of the UI reading that same external store during that one render could end up showing **inconsistent values simultaneously** — some components showing the old value, others showing the new one, all within what's supposed to be one consistent screen — a bug class called **"tearing."**

`useSyncExternalStore` is React's own built-in solution: it guarantees that all components reading the same external store during a single render see the **same, consistent snapshot** of that store, even under concurrent rendering/time-slicing, and it forces a synchronous re-render if the store changes mid-render to guarantee that consistency — something you cannot safely hand-roll with plain `useState`/`useEffect` yourself.

**Real-world usage:** this hook is mostly consumed indirectly — state-management libraries (Redux's React bindings, Zustand, Jotai, Recoil) rewrote their internals on top of `useSyncExternalStore` specifically so they'd be safe under React 18 concurrent features, without every app author needing to know this hook exists. You'd reach for it directly mainly when subscribing to a non-React browser API or a hand-rolled store (network status, a WebSocket connection state, a custom pub-sub cache) and want it to be safe.

**How to explain in an interview:**
"`useSyncExternalStore` is the React 18 way to subscribe a component to state that lives outside React — a third-party store or a browser API like `navigator.onLine`. Before concurrent rendering, a homemade `useState` + `useEffect` subscription hook worked fine, but under React 18's interruptible rendering, if the external value changes mid-render, different components could end up showing inconsistent snapshots of the same store during one render — a bug called tearing. `useSyncExternalStore` guarantees every consumer sees a consistent snapshot and forces a synchronous re-render if the store changes mid-render. Most people don't call it directly — library authors like Redux/Zustand/Jotai rewrote their React bindings on top of it so their libraries are automatically safe."

---

## 5. `useId` (React 18)

**What is it?**
A hook that generates a unique, stable ID string for a component instance — stable across re-renders, and (crucially) **identical between the server-rendered HTML and the client's hydration pass**.

```jsx
import { useId } from 'react';

function LabeledInput({ label }) {
  const id = useId(); // e.g. ":r0:" — a unique, stable string for THIS component instance
  return (
    <>
      <label htmlFor={id}>{label}</label>
      <input id={id} type="text" />
    </>
  );
}

// Rendering two instances gives each a DIFFERENT, but each stable, id — no collisions
<LabeledInput label="Name" />
<LabeledInput label="Email" />
```

**Why it was invented — the actual problem it solves:**
Accessibility attributes like `htmlFor`/`id` pairs, `aria-describedby`, and `aria-labelledby` require a **unique id string** to link two elements together. The obvious naive approaches both break in real apps:
- `Math.random()` or an incrementing module-level counter generates a **different** id on the server render vs the client's hydration render (since the counter resets, or randomness differs), causing a hydration mismatch — React detects the server HTML's `id="3"` doesn't match the client's freshly-computed `id="7"` and either warns loudly or, worse, silently breaks the `aria-*` linkage.
- Hardcoding a static id string works for exactly one instance of a component on the page — render the same component twice (e.g., the same form field component used in two different modals) and you get **duplicate ids**, which is invalid HTML and breaks the accessibility linkage for both instances (a screen reader `aria-describedby` can only correctly resolve one `id` if it's duplicated).

`useId` solves both: it's generated deterministically from the component's actual position in the tree (not randomness or a mutable counter), so the **exact same id is produced on the server and during client hydration**, and each component instance gets its own unique value, so rendering the same component many times never collides.

**Real-world usage:** linking a `<label>` to its `<input>` via `htmlFor`/`id`, `aria-describedby` pointing from an input to its error/hint text, `aria-labelledby` for custom widgets, any case needing a unique DOM id inside a reusable component that might render multiple times on one page — especially in an SSR app where id mismatches would otherwise cause hydration warnings.

**Important nuance (interview trap):** `useId` is **not** meant for React `key` props in a list — it's for accessibility/DOM-linking ids, and generates one id per component instance, not a list of ids for dynamic data.

**How to explain in an interview:**
"`useId` generates a unique id string per component instance that's guaranteed to match between server-rendered HTML and the client's hydration pass — solving both the 'random ids cause a hydration mismatch' problem and the 'hardcoded ids collide when the same component renders twice on one page' problem. I use it for accessibility attribute pairs — linking a label to an input via `htmlFor`/`id`, or wiring up `aria-describedby` — inside components that might be rendered more than once."

---

## 6. Automatic Batching (React 18 behavior change)

**What is it?**
"Batching" means React groups multiple `setState` calls that happen close together into a **single** re-render, instead of re-rendering once per `setState` call. Before React 18, this only happened **inside React event handlers** (`onClick`, `onChange`, etc.). React 18 made batching **automatic everywhere** — including inside promises, `setTimeout`, native (non-React) event listeners, and any other async callback.

```jsx
// PRE-REACT-18 behavior:
function handleClick() {
  // Inside a React event handler — these were ALREADY batched into one re-render.
  setCount(c => c + 1);
  setFlag(f => !f);
  // -> only 1 re-render, even pre-18
}

function handleTimeout() {
  setTimeout(() => {
    // PRE-18: NOT batched — this caused TWO separate re-renders, one per setState,
    // because setTimeout's callback runs OUTSIDE any React event handler.
    setCount(c => c + 1); // re-render #1 (pre-18)
    setFlag(f => !f);     // re-render #2 (pre-18)
  }, 1000);
}

// REACT 18+ behavior: automatic batching means the setTimeout case above now ALSO
// only causes ONE re-render — same for promise .then() callbacks, native DOM event
// listeners added via addEventListener, and any other async context.
```

**Why this matters — the actual problem it solves:**
Pre-18, the inconsistency was a real source of subtle bugs and wasted renders: the exact same two `setState` calls could cause 1 re-render or 2 re-renders depending on *what kind of callback* they happened to run inside — purely an implementation detail of React's own internals, invisible from just reading the calling code. This made "how many times will this component re-render" hard to reason about, and made things like reading intermediate/half-updated state between two batched-in-React-handler-but-not-batched-in-a-promise updates inconsistent depending on context. React 18's automatic batching makes the rule simple and universal: **multiple `setState` calls in the same synchronous block of code always batch into one re-render, regardless of where that code runs** — event handler, promise callback, timeout, or native event listener.

**The escape hatch — `flushSync`:** on the rare occasion you genuinely need a `setState` to apply and re-render **immediately**, synchronously, before the next line of code runs (e.g., measuring the DOM right after a state change, in code that can't wait for React's normal batching), `react-dom`'s `flushSync` forces an immediate, unbatched render:
```jsx
import { flushSync } from 'react-dom';

function handleClick() {
  flushSync(() => {
    setCount(c => c + 1); // this update is applied and re-rendered IMMEDIATELY
  });
  // DOM here is already updated to reflect the new count
  console.log(divRef.current.textContent); // reflects the new value already
}
```

**Real-world usage:** this is a behavior you benefit from automatically without changing any code — the main thing to actually know for an interview is *that the change happened*, *why* (consistency, plus fewer wasted renders in async-heavy code like WebSocket handlers or multiple chained promises), and that `flushSync` exists as the rare manual override.

**How to explain in an interview:**
"Before React 18, `setState` calls were only automatically batched into a single re-render inside React's own event handlers — the same two `setState` calls inside a `setTimeout` or a promise callback would cause two separate re-renders instead of one, purely because of where the code happened to run. React 18 made batching automatic everywhere — promises, timeouts, native event listeners, any async callback — so multiple state updates in the same tick always collapse into one re-render, regardless of context. If you genuinely need a synchronous, immediate, unbatched update — like measuring the DOM right after a state change — `flushSync` from `react-dom` is the manual escape hatch."

---

## 7. Micro-Frontends / Module Federation

**What is it?**
An architecture pattern where a large application is split into **independently built and independently deployable** frontend applications ("micro-frontends"), each owned by a different team, then **composed together at runtime** into what looks to the end user like one seamless app. **Module Federation** (a Webpack 5 / Rspack feature) is the most common technical mechanism used to implement this for React apps specifically — it lets one app expose specific modules/components at a URL, and another app dynamically load and render them at runtime, each with its own independent build/deploy pipeline.

```js
// App A's webpack config — EXPOSES a component for other apps to consume
// (simplified illustrative config, not runnable as-is)
new ModuleFederationPlugin({
  name: 'checkoutApp',
  filename: 'remoteEntry.js',
  exposes: {
    './CheckoutWidget': './src/CheckoutWidget',
  },
});

// App B's webpack config — CONSUMES App A's component at runtime, over the network
new ModuleFederationPlugin({
  name: 'shellApp',
  remotes: {
    checkoutApp: 'checkoutApp@https://checkout.example.com/remoteEntry.js',
  },
});

// Inside App B's React code — imports and renders App A's component as if it were local
const CheckoutWidget = React.lazy(() => import('checkoutApp/CheckoutWidget'));
```

**Why it was invented — the actual problem it solves:**
Once an organization grows to many teams working on one large React app (or one large monolithic SPA), a single shared codebase/build/deploy pipeline becomes an organizational bottleneck: every team's change goes through the same CI pipeline, the same release train, and a bug in one team's feature can block deploys for everyone else, or one team's outdated dependency choice can hold back the whole app's upgrade path. Micro-frontends let each team **own, build, test, and deploy their slice of the product independently** — a checkout team can ship a fix to checkout without waiting on or coordinating with the search team's release, and teams can even use different versions of shared libraries (with some added complexity/cost for that flexibility) if truly necessary.

**Real-world usage:** large e-commerce platforms, enterprise dashboards composed of many product teams' widgets, and any org large enough that "one team, one deploy pipeline, one whole app" has become a genuine coordination bottleneck. It's explicitly a **trade-off**, not a free win — added runtime complexity (loading remote bundles over the network, versioning/compatibility between shared dependencies like React itself, harder cross-app debugging) means most small-to-medium apps/teams should NOT reach for this, and it's usually only justified once org size (not app size) makes a shared pipeline the actual bottleneck.

**How to explain in an interview (awareness-level answer is enough for most roles):**
"Micro-frontends split a large app into independently deployable pieces owned by separate teams, composed together at runtime instead of built as one monolith. For React specifically, Module Federation (a Webpack/Rspack feature) is the common way to do this — one app exposes components/modules that another app dynamically imports over the network at runtime, each with its own build and deploy pipeline. It solves an organizational scaling problem — many teams blocked on one shared release train — more than a technical one, and it's a real trade-off: added runtime complexity, harder cross-app debugging, and shared-dependency versioning headaches, so it's usually only worth it once team/org size, not app size, has made a single shared pipeline the actual bottleneck."

---

## 8. React-Specific Accessibility (a11y) Concerns

Accessibility is frequently underexplored in interview prep, but senior candidates are expected to know these three specifically React-flavored a11y patterns, beyond generic "use semantic HTML" advice.

### 8a. Focus trapping in modals

**What is it?** When a modal/dialog opens, keyboard focus should move **into** the modal, and `Tab`/`Shift+Tab` should cycle only among the modal's own focusable elements — not "leak" focus back out to the (visually hidden/inert) page behind it. When the modal closes, focus should return to whatever element opened it.

**Why it matters:** without a focus trap, a keyboard-only or screen-reader user can `Tab` right out of an open modal into page content that's supposed to be inaccessible/hidden behind the modal overlay — confusing, and a genuine accessibility failure (WCAG 2.4.3 "Focus Order"), not just a nice-to-have polish detail.

```jsx
import { useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';

function Modal({ onClose, children }) {
  const modalRef = useRef(null);
  const previouslyFocusedElement = useRef(null);

  useEffect(() => {
    previouslyFocusedElement.current = document.activeElement; // remember what opened the modal
    modalRef.current?.focus(); // move focus INTO the modal on open

    return () => {
      previouslyFocusedElement.current?.focus(); // return focus to the opener on close
    };
  }, []);

  function handleKeyDown(e) {
    if (e.key === 'Escape') onClose();
    if (e.key !== 'Tab') return;

    // Trap Tab/Shift+Tab within the modal's own focusable elements only.
    const focusable = modalRef.current.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    const first = focusable[0];
    const last = focusable[focusable.length - 1];

    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus(); // wrap from first to last
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus(); // wrap from last to first
    }
  }

  return createPortal(
    <div
      ref={modalRef}
      role="dialog"
      aria-modal="true"
      tabIndex={-1}
      onKeyDown={handleKeyDown}
    >
      {children}
    </div>,
    document.getElementById('modal-root')
  );
}
```
In real codebases, this is almost always handled by a library (`focus-trap-react`, Radix UI's `Dialog`, Headless UI) rather than hand-rolled — but interviewers expect you to know *why* it's needed and roughly how it works, even if you'd reach for a library in practice.

### 8b. `aria-live` regions for dynamic content announcements

**What is it?** An attribute that tells screen readers to **automatically announce** content changes inside that element, even though nothing about focus moved there — necessary because screen readers otherwise only announce content when focus lands on it, and a lot of React-driven UI updates content **without** moving focus at all (a toast notification appearing, a form validation error appearing after submit, a "3 new results" counter updating after a filter).

```jsx
function ToastContainer({ message }) {
  return (
    // "polite" = announce after the user's current screen-reader activity finishes
    // (don't interrupt them mid-sentence). Use "assertive" only for urgent/critical
    // messages that genuinely need to interrupt (rare — most UI should be "polite").
    <div aria-live="polite" role="status" style={visuallyHiddenIfEmpty(message)}>
      {message}
    </div>
  );
}

function SearchResults({ results }) {
  return (
    <>
      {/* Visually hidden live region — announces the count change without any
          visible UI change, since sighted users already see the list update */}
      <div aria-live="polite" className="sr-only">
        {results.length} results found
      </div>
      <ul>{results.map((r) => <li key={r.id}>{r.name}</li>)}</ul>
    </>
  );
}
```

**Why it matters for React specifically:** React apps update the DOM constantly and often without moving focus (that's the whole point of a reactive UI) — a sighted user visually notices a new error message or updated count instantly, but a screen-reader user gets **zero feedback** unless that region is marked `aria-live` (or the content update happens to land inside something focus already points at). This is one of the most common a11y gaps in real React codebases, precisely because it's invisible in a purely visual code review or manual sighted QA pass.

### 8c. Managing focus after route navigation in an SPA

**What is it?** In a traditional multi-page site, navigating to a new page causes the browser to reset focus to the top of the new document automatically. In a React SPA (client-side routing, file 10), navigating between "pages" is really just a state/DOM update — the browser does **not** automatically reset or move focus anywhere, so focus can be left sitting on a now-removed or now-irrelevant element (e.g., a "View details" link that no longer exists after routing to the detail page), leaving a screen-reader user with no cue that navigation even happened.

```jsx
// Simplified pattern used with React Router — move focus to the new page's
// heading (or a dedicated route-announcer element) after every navigation.
import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';

function RouteAnnouncer() {
  const location = useLocation();
  const announcerRef = useRef(null);

  useEffect(() => {
    // Move focus to a dedicated, visually-hidden or heading element on every
    // route change, so screen readers announce "navigated" and keyboard users'
    // focus doesn't stay stranded on a removed element.
    announcerRef.current?.focus();
  }, [location.pathname]);

  return <h1 ref={announcerRef} tabIndex={-1} className="sr-only">Page changed</h1>;
}
```

**Why it matters:** this is a gap that's entirely invisible to sighted mouse users (who just see the new page appear) but breaks the navigation experience completely for keyboard/screen-reader users — a classic "our manual QA never catches this" a11y issue, and specific to SPA client-side routing rather than something server-rendered multi-page sites ever had to solve.

**How to explain all three in an interview:**
"React's reactive, focus-agnostic DOM updates create accessibility gaps that traditional multi-page sites didn't have. Modals need an explicit focus trap — moving focus in on open, cycling Tab within the modal, and restoring it to the trigger element on close — usually via a library like Radix or focus-trap-react rather than hand-rolled. Dynamic content that appears without moving focus, like toasts or live result counts, needs an `aria-live` region so screen readers announce the change at all. And SPA client-side navigation doesn't reset focus the way a real page load does, so I move focus to the new page's heading (or a dedicated announcer element) on every route change so screen reader and keyboard users get feedback that navigation happened."

---

## Summary Table

| Topic | Core problem it solves | Where else in this repo it connects |
|---|---|---|
| Portals | Escaping an ancestor's `overflow`/`z-index` for modals/tooltips | File 09 (Suspense/error boundaries render trees), accessibility section 8a above |
| Fragments (incl. keyed) | Avoiding wrapper `div`s that break CSS Grid/Flexbox or invalid HTML nesting | File 01 (`key` prop) |
| `React.StrictMode` | Surfacing impure render/effect code in dev before it's a prod bug | File 01 (Fiber/concurrent rendering), file 09 (concurrent rendering) |
| `useSyncExternalStore` | Preventing "tearing" when subscribing to non-React state under concurrent rendering | File 07 (state management libraries now use this internally) |
| `useId` | Stable, SSR-safe unique ids for `aria-*`/`htmlFor` linkage | File 13 (hydration mismatches) |
| Automatic batching | Consistent, predictable re-render count regardless of async context | File 03 (`useState` batching pitfalls) |
| Micro-frontends / Module Federation | Independently deployable apps for large multi-team orgs | — (architecture/system-design adjacent) |
| Focus trap / `aria-live` / route-focus | Accessibility gaps unique to reactive, focus-agnostic DOM updates | File 10 (routing) |

## See also
`examples/react-topics-you-might-have-missed.jsx` — a Portal-based modal with a basic focus trap, a keyed-Fragment list example, and a `useId` + `useSyncExternalStore` mini demo, all with inline comments.
