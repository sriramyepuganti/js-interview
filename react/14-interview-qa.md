# 14 — Rapid-Fire Senior React Interview Q&A (2025/2026)

Crisp answers, 2-6 lines each. Grouped by theme. Use these for quick review right before an interview.

---

## Core Concepts

**1. What is the Virtual DOM and why does React use it?**
A lightweight in-memory JS representation of the UI tree. React diffs the new tree against the old one and applies only the minimal real DOM changes needed, avoiding expensive direct DOM manipulation on every state change.

**2. What is reconciliation?**
The algorithm React uses to compare the old and new Virtual DOM trees and compute the minimal set of real DOM updates. It uses heuristics (same-type elements update in place, different types remount, `key` identifies list items) to keep diffing fast (roughly O(n) instead of a naive O(n³) tree diff).

**3. Explain reconciliation to a junior dev.**
"Imagine you have a checklist of what the page should look like now vs a second ago. React compares the two lists item by item. If an item is the same type, it just updates what changed about it. If the type is totally different, it throws that piece away and builds a new one. For lists, we give each item a `key` so React knows which item is which, even if their order changed."

**4. What is Fiber?**
React's reconciliation engine (since React 16) that makes rendering work interruptible and prioritizable, instead of one big synchronous recursive call stack. It's the foundation for concurrent features like `useTransition`, `Suspense`, and streaming SSR.

**5. Why does React need `key` on list items?**
Without a stable key, React matches old/new children by array index. Any insertion/removal/reorder shifts indices, making React think unrelated items changed — causing wasted re-renders and, worse, DOM nodes carrying stale local/uncontrolled state (e.g., an input value visually "jumping" to the wrong row).

**6. Why shouldn't you use array index as a key?**
It works fine for static, never-reordered lists, but breaks as soon as items can be added, removed, filtered, or reordered — the index no longer maps to the same logical item across renders, causing UI/state mismatches.

**7. How does JSX get compiled?**
Babel or your bundler's compiler turns JSX into `React.createElement(...)` calls (classic runtime) or `jsx(...)` calls from `react/jsx-runtime` (automatic runtime, React 17+), producing plain JS objects describing the UI — not real DOM nodes.

**8. Why did the JSX runtime change in React 17?**
So files could use JSX without needing `import React from 'react'` just for the compiler's sake — the new runtime auto-imports the `jsx` function, reducing boilerplate and slightly improving bundle output.

---

## Hooks

**9. Why can't hooks be called conditionally or inside loops?**
React matches hooks to their internal state by call order (like a linked list), not by name. If the number/order of hook calls differs between renders, React assigns state to the wrong hook, corrupting behavior. Order must be identical on every render.

**10. What's the difference between useMemo and useCallback?**
`useMemo` memoizes a computed **value**; `useCallback` memoizes a **function reference**. `useCallback(fn, deps)` is equivalent to `useMemo(() => fn, deps)`.

**11. When does useMemo/useCallback actually help?**
When the computation is genuinely expensive, or when you need a stable reference so a `React.memo` child or an effect's dependency array doesn't see a "new" object/function every render. Wrapping everything by default adds overhead without benefit — it's not free.

**12. What's the difference between useEffect and useLayoutEffect?**
`useEffect` runs asynchronously after the browser paints (non-blocking, preferred default). `useLayoutEffect` runs synchronously before paint — use it only when you must measure/adjust the DOM before the user sees anything, to avoid visual flicker.

**13. What's a stale closure bug in useEffect, and how do you fix it?**
It happens when an effect's callback captures an old render's variable value because that value is missing from the dependency array (e.g., a `setInterval` always reading the initial `count`). Fix by adding the missing dependency, or by using the functional updater form (`setCount(c => c + 1)`) which doesn't need the value from the closure at all.

**14. What causes an infinite re-render loop with useEffect?**
Usually a dependency array containing a freshly-created object/array/function (new reference every render) that the effect itself indirectly recreates by updating state — the effect never "settles" because its dependency never equals the previous render's by reference. Fix: depend on primitive values, or memoize the object/function with useMemo/useCallback.

**15. Why does useReducer exist when we have useState?**
It centralizes complex or interdependent state transition logic into one pure, testable reducer function, dispatched via named actions — better than scattering many related `setState` calls across a component, especially for state machines or multi-field forms.

**16. What is useImperativeHandle for?**
Combined with `forwardRef`, it lets a component control exactly what's exposed when a parent attaches a ref — e.g., exposing only `.focus()` instead of the whole raw DOM node. Should be rare; prefer declarative props over imperative APIs when possible.

**17. What does useDebugValue do?**
Nothing functional — it just labels a custom hook's value in React DevTools for easier debugging. No runtime/behavioral effect.

**18. How would you write a custom hook, and why use one over an HOC?**
A custom hook is a plain function starting with `use` that calls other hooks internally to share stateful logic — no wrapper component needed, unlike an HOC, so no wrapper-hell in the component tree and no injected-prop-name collisions.

---

## Components & Rendering

**19. Are class components dead?**
Not removed, but legacy/maintenance-mode. All new code uses function components + hooks. The one thing hooks still can't fully replace is error boundaries, which require class lifecycle methods (`getDerivedStateFromError`, `componentDidCatch`).

**20. What's the difference between controlled and uncontrolled components?**
Controlled: the input's value lives in React state, React is the source of truth (`value` + `onChange`). Uncontrolled: the DOM manages the value itself, read via `ref` when needed. Uncontrolled avoids a re-render per keystroke — form libraries often use it internally for performance on large forms.

**21. What is prop drilling and how do you avoid it?**
Passing a prop through many intermediate components that don't use it themselves, just to reach a deeply nested consumer. Fixes: component composition (pass the already-built child down), Context for low-frequency shared values, or a state library for frequently-changing shared state.

**22. Why does React favor composition over inheritance?**
UI structures map naturally to trees of composed, configurable components (via props/children), not "is-a" class hierarchies. `props.children` covers most cases where you'd reach for inheritance in OOP.

**23. What's wrong with this code?**
```jsx
function Parent() {
  const [count, setCount] = useState(0);
  function Child() { return <div>Hi</div>; } // defined INSIDE Parent's render
  return <Child />;
}
```
`Child` is redefined as a brand-new component identity on every render of `Parent`, forcing React to fully unmount and remount it every time — losing any internal state and hurting performance. Fix: define `Child` outside `Parent`, at module scope.

---

## Context & State Management

**24. Why was Context invented, and what's its main performance pitfall?**
It solves prop drilling by letting deeply nested components read a value directly. Pitfall: every consumer of a context re-renders whenever the Provider's value changes, even if the consumer only cares about part of it — fixed by splitting into multiple smaller contexts by concern and memoizing the Provider's value.

**25. Context vs Redux — when do you use which?**
Context is for low-frequency, broadly-needed values (theme, auth, locale) — it's dependency injection, not a full state management solution. Redux (or Zustand/Jotai) suits frequently-changing, complex, cross-cutting state where you need selector-based subscriptions and/or devtools.

**26. How would you prevent prop drilling in a large app?**
First try composition (pass already-rendered children/components down instead of raw data). If that's insufficient, use Context for rarely-changing shared values, splitting contexts by concern. For frequently-changing or widely-read state, use a store with selectors (Zustand, Redux Toolkit) instead.

**27. What problem does Redux Toolkit solve compared to classic Redux?**
Removes most boilerplate: `createSlice` auto-generates action types/creators, and lets you write "mutating-looking" reducer code safely (via Immer under the hood) instead of manual immutable spreads. It's now the officially recommended way to write Redux.

**28. Why did many teams move away from putting server data in Redux?**
Because API data isn't really "app state" — it needs caching, refetching, deduping, retries — problems that hand-written thunks/reducers solve poorly. Tools like React Query/RTK Query handle this automatically, which is why many teams now split: server state → React Query, client/UI state → something lighter (or nothing at all).

**29. What's the difference between server state and client state?**
Server state is data owned by a backend that can go stale and needs caching/synchronization (API responses). Client state is purely local UI concerns (modal open/closed, form input, theme). They need different tools — React Query for the former, useState/Context/small stores for the latter.

**30. Zustand vs Redux Toolkit — when would you pick Zustand?**
Zustand has far less boilerplate (no actions/reducers/Provider ceremony required) and no forced structure — good for small-to-medium apps or teams wanting a simple global store without Redux's conventions. Redux Toolkit still wins when you need its middleware ecosystem, strict structure, or Redux DevTools time-travel debugging at scale.

---

## Performance

**31. When is React.memo actually useful?**
When a component re-renders often due to parent re-renders but its own props rarely change, and its render work is non-trivial. It's ineffective (and adds overhead) if props include freshly-created objects/functions each render — pair it with useMemo/useCallback on the parent side.

**32. How would you optimize a slow list with thousands of items?**
Virtualize it (react-window / TanStack Virtual) so only visible rows (plus a small buffer) exist in the DOM at once, instead of rendering everything. Also ensure list items are memoized and don't receive new object/function props each render.

**33. How would you debug a component that re-renders too often?**
Use React DevTools Profiler to record a session and see which components rendered and why (parent re-render passing new prop references, or a context value change). Apply a targeted fix — memoize that specific prop/value, split that specific context, or move state further down the tree — rather than guessing.

**34. What's a common performance anti-pattern with Context?**
Putting all app state into one big context object recreated every render — every consumer re-renders on any change. Fix: split into multiple contexts by concern and `useMemo` the Provider's value.

**35. Is useMemo/useCallback always a good idea?**
No — for cheap computations/functions, the memoization overhead (storing values, comparing dependency arrays) can outweigh the benefit and hurts readability. Use them when profiling shows a real expensive computation or when referential stability is specifically required (memoized child, effect dependency).

---

## Error Handling, Suspense, Concurrent Features

**36. Why must error boundaries be class components?**
They rely on `static getDerivedStateFromError` and `componentDidCatch`, lifecycle methods with no current hook equivalent. In practice, most codebases use the `react-error-boundary` library instead of hand-writing the class.

**37. What can't an error boundary catch?**
Errors in event handlers, errors in async code (promises/setTimeout), errors during SSR, and errors thrown inside the boundary itself — those need manual try/catch or the `useErrorBoundary` hook from `react-error-boundary`.

**38. What is Suspense, and how has its use expanded?**
Originally for showing a fallback while a lazily-loaded component's code downloads (`React.lazy` + `Suspense`). Now extended to data fetching — Suspense-enabled data sources (TanStack Query's suspense mode, Server Components) can "throw a promise" that Suspense catches, unifying "waiting for code" and "waiting for data" under one declarative boundary.

**39. What's the difference between useTransition and useDeferredValue?**
`useTransition` wraps a state **update** you control, marking it low-priority so it won't block more urgent updates (like typing), and gives you an `isPending` flag. `useDeferredValue` wraps a **value** you already have (often one you don't control the update for) and lets React lazily "catch up" that value under heavy load.

---

## Routing, SSR, Modern React

**40. How has React Router evolved from v5 to v6.4+?**
`<Switch>` became `<Routes>`, `component`/`render` props became `element={<X/>}`, nested routes now use `<Outlet />` for shared layouts, and Data APIs (`loader`/`action`) let routes fetch/mutate data starting alongside navigation instead of after the component renders — avoiding fetch-on-render waterfalls.

**41. Why does SSR help SEO and perceived performance?**
The server sends fully-rendered HTML immediately, which crawlers can read without executing JS, and which the browser can paint before any JS has downloaded/run — much faster "time to first meaningful content" than pure client-side rendering.

**42. What is hydration, and why can it be slow?**
The process of attaching React's event listeners/state to server-rendered HTML so it becomes interactive. It's slow because the browser still needs to download and run roughly the same JS as a CSR app would, and historically hydration was all-or-nothing across the whole page. Streaming SSR and selective hydration (React 18) mitigate this by hydrating/streaming in chunks and prioritizing what the user is interacting with.

**43. What problem do React Server Components solve?**
They let components run only on the server and never ship their JS to the browser at all, directly accessing backend resources (DB, filesystem) without a separate API layer, and removing the "fetch in useEffect, then spinner" pattern for initial data — dramatically shrinking client bundle size for non-interactive content.

**44. Server Component vs Client Component — how do you decide?**
Server Components are for "what to show" — static/data-fetching content with no interactivity. Client Components (`'use client'`) are for "what's interactive" — anything needing hooks, state, or event handlers. Build mostly with Server Components and drop Client Components in only at the interactive leaves.

---

## Styling & Testing

**45. How do you choose a styling approach for a new project?**
Depends on team size, performance budget, and dynamism needs: plain CSS/CSS Modules for simple apps with zero runtime cost; styled-components/Emotion when rich dynamic theming and colocation matter more than the runtime cost; Tailwind for fast-moving, performance-sensitive, design-system-driven products since it compiles away with zero runtime cost.

**46. Why does React Testing Library discourage testing implementation details?**
Because tests that assert on internal state/methods break during refactors even when user-facing behavior hasn't changed, producing false negatives that erode trust in the suite. Testing via what the user sees/does (roles, text, realistic interactions) keeps tests resilient to implementation changes.

**47. Unit vs integration vs E2E — how do you balance them?**
Mostly integration tests (best confidence-to-effort ratio for typical features), targeted unit tests for tricky pure logic (custom hooks, reducers, utilities), and a small number of E2E tests for critical flows (checkout, auth) since they're slow and more brittle.

---

## Scenario / "What's Wrong With This Code" Snippets

**48. Missing keys:**
```jsx
{items.map(item => <li>{item.name}</li>)} // no key at all
```
Problem: React can't reliably track list items across renders — you'll get a console warning, and updates/reorders may cause incorrect DOM reuse and lost per-item state. Fix: `<li key={item.id}>`.

**49. Stale closure in useEffect:**
```jsx
useEffect(() => {
  const id = setInterval(() => setCount(count + 1), 1000);
  return () => clearInterval(id);
}, []); // `count` is missing from deps
```
Problem: the interval callback always reads `count` from the render when the effect was created (closure captured the initial value) — count only ever becomes 1, then keeps resetting to `0 + 1`. Fix: use the functional updater `setCount(c => c + 1)`, which doesn't depend on `count` at all.

**50. Infinite re-render loop from object/array deps:**
```jsx
function Component({ userId }) {
  const options = { userId }; // new object every render
  useEffect(() => {
    fetchData(options).then(setData);
  }, [options]); // "options" is a new reference every render → effect always thinks deps changed
}
```
If `fetchData`'s result triggers a state update (as it will here via `setData`), the component re-renders, creating a brand-new `options` object again, which the effect sees as "changed," running again — forever. Fix: depend on the primitive `userId` directly, not a freshly-created wrapper object: `}, [userId])` and construct `options` inside the effect.

---

## React 19 / Latest React (2024-2026)

**51. What is `use()`, and how is it different from other hooks?**
`use()` reads the value of a Promise or Context during render. Unlike `useState`/`useContext`, it can be called **conditionally** — inside `if`s, loops, after early returns — because React doesn't track it via the call-order linked-list mechanism other hooks rely on. If the promise isn't resolved yet, the component suspends and the nearest `<Suspense>` shows its fallback.

**52. What problem does `useActionState` solve?**
It replaces the classic manual form-submission pattern of three separate `useState` calls (`isPending`, `error`, `data`) plus a try/catch/finally wrapper around `onSubmit`. You pass an action function to `useActionState`, hook the returned `formAction` into `<form action={...}>`, and React automatically tracks pending/error/result state for you.

**53. What does `useFormStatus` do, and what's the common mistake with it?**
It lets a component nested inside a `<form>` read that form's pending state (`pending`, `data`, `method`, `action`) without prop drilling — useful for a reusable `<SubmitButton>` used across many forms. The common mistake: calling it in the *same* component that renders the `<form>` tag itself — it only works in a **descendant** of the form, otherwise `pending` is always `false`.

**54. How does `useOptimistic` work, and what happens on failure?**
It shows a temporary "optimistic" UI state immediately (e.g., a comment appearing before the server confirms it), while the real async action runs in the background. On success, the optimistic value is confirmed by the real data; on failure, React automatically reverts to the last real state — no manual rollback code needed.

**55. What is a Server Action, and what does `"use server"` actually mark?**
`"use server"` marks a function as server-only code that a Client Component can still call directly, like a normal function call, even though it's a network request under the hood. It removes the need to hand-build a separate API route just to let the client trigger a server-side mutation, and pairs naturally with `useActionState`/`useOptimistic` for pending/error/optimistic UI around that mutation.

**56. Do you still need `forwardRef` in React 19?**
Not for the simple case — function components can now accept `ref` as a plain prop, so a pure pass-through (e.g., forwarding a ref to an underlying `<input>`) no longer needs `forwardRef`. It's still needed when you want `useImperativeHandle`-style control over exactly what the ref exposes, instead of the raw DOM node.

**57. What's new about rendering Context providers in React 19?**
You can render a context object directly as `<MyContext value={...}>` instead of `<MyContext.Provider value={...}>` — purely shorter syntax for the exact same mechanism. All of Context's usual behavior (re-rendering every consumer on value change, needing to split contexts by concern) is unchanged.

**58. How does React 19 handle `<title>`/`<meta>`/`<link>` tags?**
You can render them directly inside any component, anywhere in the tree, and React automatically hoists them into `<head>` — including de-duplication and cleanup on unmount. This covers a lot of what `react-helmet` or framework-specific `<Head>` components used to be needed for, letting the component that owns the relevant data (e.g., a specific product page) set its own SEO tags directly.

**59. What is the React Compiler, and does it mean you never need `useMemo`/`useCallback` again?**
It's a build-time tool that automatically inserts memoization (roughly equivalent to `useMemo`/`useCallback`/`React.memo`) for you, based on statically analyzing your component code. It doesn't remove the need to *understand* memoization — if it can't prove a component is safe to auto-memoize (e.g., code that breaks the Rules of Hooks/purity), it skips it. In a compiler-adopted codebase, manual memoization becomes more of an escape hatch than the default; most real-world codebases haven't adopted it yet, so the manual skill is still expected in interviews.

**60. What's new about `useTransition` and `useDeferredValue` in React 19?**
`useDeferredValue` now accepts an optional second argument — an initial value to use on the very first render, before there's anything to defer from yet. `startTransition` can now wrap an `async` function directly, and React keeps `isPending` true across the whole `await`, not just the synchronous portion — the same underlying mechanism that Actions build on.

---

## Topics You Might Have Missed (Lifecycle, Portals, Fragments, StrictMode, a11y)

**61. Walk me through a class component's full lifecycle, in order.**
Mounting: `constructor` → `getDerivedStateFromProps` → `render` → `componentDidMount`. Updating: `getDerivedStateFromProps` → `shouldComponentUpdate` → `render` → `getSnapshotBeforeUpdate` → `componentDidUpdate`. Unmounting: `componentWillUnmount`. See file 02 section 5 for the full code + hook-equivalent mapping.

**62. What's `getSnapshotBeforeUpdate` for, and why doesn't it have a clean hooks equivalent?**
It fires right before the DOM is mutated to match a new render, letting you capture something about the current DOM (e.g., scroll height) before it changes; its return value is passed as the third argument to `componentDidUpdate` so you can act on it after the DOM updates (e.g., adjusting `scrollTop` to prevent a visual jump in a chat list). There's no single hook that replicates this exact "read-before, act-after" pairing — you'd approximate it with `useLayoutEffect` plus a ref holding the pre-update measurement.

**63. How does `shouldComponentUpdate` relate to `React.memo`?**
`shouldComponentUpdate` is the class-era, fully manual way to bail out of re-rendering by returning `false` based on comparing next vs current props/state yourself. `React.memo` is the function-component equivalent, but it does an automatic shallow prop comparison rather than requiring you to write the comparison logic by hand (though it does accept a custom comparator as a second argument).

**64. Why do portals exist — what problem can't plain CSS solve?**
An ancestor's `overflow: hidden` or a `z-index` stacking context can visually clip or bury a normal nested child no matter what `z-index` you give the child itself, since CSS containment is about DOM position, not just paint order. `createPortal` renders the child's actual DOM node elsewhere (typically as a sibling of the whole app), escaping that ancestor's containment entirely, while it stays a normal child in React's tree for props, context, and event bubbling.

**65. Does a portal change how events bubble in React?**
No — despite rendering into a different DOM subtree, a portal's contents still bubble events through React's tree according to their logical (React) position, not their DOM position. A click inside a portal-rendered modal still triggers `onClick` handlers on its logical parent in the component tree, exactly as if it weren't portaled at all.

**66. Why do Fragments exist — why not just use a `div`?**
Components must return one root node, and before Fragments that forced a wrapper `div` even with no semantic purpose — which can break CSS Grid/Flexbox layouts expecting direct children to be the grid/flex items, or produce invalid HTML (e.g., wrapping `<tr>`s or `<dt>`/`<dd>` pairs in a `div` inside a `table`/`dl`). Fragments return multiple siblings with zero extra DOM node.

**67. When do you need `<React.Fragment key={...}>` instead of the short `<>` syntax?**
When Fragments themselves are the items being mapped over in a list — the short `<>` syntax doesn't accept props, so if each list item needs a `key` (same reasoning as keying any list item), you need the explicit `React.Fragment` form.

**68. What does `React.StrictMode` actually do, and why doesn't it affect production?**
In development, it double-invokes component render bodies, state-initializer functions, and (since React 18) effect setup/cleanup on mount, specifically to surface code that isn't pure/idempotent before it becomes a rare, hard-to-reproduce bug under concurrent rendering. It's stripped out of the production build entirely, since it's a dev-time diagnostic — doubling effects/renders in production would just double real work (network calls, computations) for zero end-user benefit.

**69. Why does an effect fire twice on mount in React 18 development, and is that a bug?**
It's StrictMode intentionally mounting → unmounting → remounting a component's effects once in development, to catch effects whose cleanup doesn't fully undo their setup (e.g., not canceling an in-flight fetch). It's not a bug in React — it's usually exposing a real latent bug in the effect's cleanup logic that was always there but invisible before.

**70. What is "tearing," and what hook did React 18 add to prevent it?**
Tearing is when different parts of the UI show inconsistent values from the same external (non-React) store within a single render, because concurrent rendering can pause and resume a render while the store changes in between. `useSyncExternalStore` prevents this by guaranteeing every consumer reads a consistent snapshot and forcing a synchronous re-render if the store changes mid-render.

**71. Why can't you just use `Math.random()` or a module-level counter for ids needed by `aria-describedby`/`htmlFor`?**
A counter or random value typically produces a different id on the server render vs the client's hydration render, causing a hydration mismatch; a hardcoded static id collides if the same component renders more than once on a page. `useId` generates an id deterministically from the component's position in the tree, so it's both stable across server/client hydration and unique per instance.

**72. What changed about `setState` batching in React 18?**
Pre-18, multiple `setState` calls only batched into one re-render inside React's own event handlers — the same calls inside a `setTimeout`, promise `.then()`, or a native event listener caused one re-render per call. React 18 made batching automatic in all of those contexts too, so the number of re-renders no longer depends on what kind of callback the code happens to run inside.

**73. How do you force an immediate, unbatched, synchronous update if you truly need one?**
`flushSync` from `react-dom` wraps a state update to force React to apply it and re-render immediately, before the next line of code runs — used rarely, e.g., when you need to read the DOM immediately after a state change in code that can't wait for React's normal batched/async update timing.

**74. What's the actual accessibility problem with a modal that doesn't trap focus?**
A keyboard or screen-reader user can `Tab` right out of the open modal into page content that's supposed to be hidden/inert behind the overlay — a real WCAG focus-order failure, not just cosmetic. A proper implementation moves focus into the modal on open, cycles `Tab`/`Shift+Tab` only among the modal's own focusable elements, and restores focus to the triggering element on close.

**75. Why do toast notifications and live result counts need `aria-live`, when sighted users see them fine?**
React updates the DOM constantly without moving focus, which is invisible to sighted users but gives screen-reader users zero feedback unless the changed region is marked `aria-live` — screen readers otherwise only announce content when focus actually lands on it. `aria-live="polite"` announces the change without interrupting the user's current activity; `aria-live="assertive"` is reserved for genuinely urgent interruptions.

**76. Why does client-side routing need special handling for focus, when server-rendered multi-page sites don't?**
A full page load resets browser focus to the top of the new document automatically; SPA client-side navigation is just a DOM/state update, so focus can stay stranded on a now-removed element with no signal to screen-reader/keyboard users that navigation happened. The fix is moving focus explicitly to the new page's heading or a dedicated announcer element on every route change.

**77. What problem do micro-frontends and Module Federation solve, and when are they NOT worth it?**
They let independent teams build, test, and deploy their slice of a large app independently, composed together at runtime, instead of everyone sharing one release pipeline that becomes an organizational bottleneck. It's a trade-off, not a free win — added runtime complexity, shared-dependency version management, and harder cross-app debugging mean small-to-medium apps/teams should generally avoid it; it's usually only justified once team/org size (not app complexity) has made a single shared pipeline the real bottleneck.

## Type-Checking & Animation (Added — Audit Follow-Up)

**78. What's the actual difference between `prop-types` and TypeScript for a React component?**
`prop-types` is a runtime check — a caller passing the wrong prop shape only produces a console warning in development, after the component has already rendered once with the bad data, and it does nothing at all in production. TypeScript checks types at compile time, in the editor and at build, before the code ever runs, and covers far more than component boundaries — state, refs, hook return values, event handlers. Because of that, the industry has largely moved from `prop-types` to TypeScript outside of small/legacy plain-JS projects.

**79. How would you type a component whose valid props depend on a `variant` field (e.g., a link-styled button vs. a click-handler button)?**
A discriminated union: `type ButtonProps = { variant: 'link'; href: string } | { variant: 'button'; onClick: () => void }`. TypeScript then narrows which fields are valid/required inside the component based on which `variant` was passed, and — unlike `prop-types` — actively rejects a caller who mixes fields from the wrong branch (e.g., passing `onClick` alongside `variant="link"`) at build time.

**80. Why can't CSS alone animate a component "on the way out" when it unmounts?**
React removes the DOM node the instant a component unmounts — there's no window of time left for a CSS transition to play on an element that's already gone from the DOM. Historically this was hacked around with a `setTimeout` delaying the actual removal to match the CSS transition's duration. Libraries like Framer Motion solve it properly with `AnimatePresence`, which delays a child's removal from the DOM until its declared `exit` animation finishes.

**81. When would you reach for a library like Framer Motion instead of a plain CSS transition?**
For anything that needs to animate a component on unmount (`AnimatePresence` + `exit`), animate layout changes when sibling elements are added/removed/resized (the `layout` prop), or drive animation from gestures/physics (drag, spring-based motion) rather than a fixed duration/easing curve. For a simple hover or focus color change with no mount/unmount concerns, plain CSS `transition` is simpler and has zero added JS cost — pulling in an animation library for that would be over-engineering.

**82. Is React a library or a framework?**

---

## Tricky Gotchas & Common Misconceptions (Added — Follow-Up)

**83. How many times does `expensiveInit()` actually run here across a mount and two re-renders?**
```jsx
function List() {
  const [todos, setTodos] = useState(expensiveInit()); // called directly
  const [tags] = useState(() => expensiveInit());       // lazy initializer
  // ...component re-renders twice later for unrelated reasons
}
```
`expensiveInit()` called directly runs on **every single render** — mount and both re-renders, three calls total — because JS evaluates that expression before `useState` ever sees it; React only *uses* the mount-time result and silently discards the other two. The lazy form `() => expensiveInit()` runs **once, ever** — React only invokes the function itself during the initial render and never calls it again on subsequent renders, since it just returns the already-stored state. This is exactly why the docs recommend always passing a function reference, not a call, when the initial value is expensive to compute.

**84. Does `useMemo` guarantee its cached value will never be recomputed as long as the dependencies haven't changed?**
No, and this is a common false assumption. `useMemo` is documented purely as a performance hint, not a semantic guarantee — React explicitly reserves the right to throw away a memo cache even with unchanged deps (e.g., in development when you edit the component's file, or if the component suspends during initial mount, with more such cases possible in the future as features like virtualized-list support evolve). Relying on `useMemo` to skip a side effect or to enforce "only compute this once" for correctness (not just speed) is a bug waiting to happen — use a `ref` or state for anything that actually needs that guarantee.

**85. Why doesn't the counter on screen update in this code?**
```jsx
function Counter() {
  const countRef = useRef(0);
  return <button onClick={() => { countRef.current++; }}>{countRef.current}</button>;
}
```
Mutating `.current` on a ref never schedules a re-render — refs are explicitly designed to be "invisible" to React's rendering system, a plain mutable box that persists across renders without notifying React that anything changed. The button's click handler is updating `countRef.current` correctly (log it and you'll see it climbing), but since nothing tells React to re-render, the JSX expression `{countRef.current}` never gets re-evaluated against the DOM. Fix: use `useState` for anything that needs to be reflected in the rendered output.

**86. What does this click handler actually set `count` to, and why?**
```jsx
function handleClick() {
  setCount(count + 1);
  setCount(count + 1);
}
```
It ends at `count + 1`, not `count + 2` — a classic trap. Both calls close over the *same* `count` value from the render that created `handleClick` (say `count` is `0`), so both calls literally compute `0 + 1` and queue the same replacement value `1` twice; React only keeps the final state, which is `1`. Swapping to the functional updater form (`setCount(c => c + 1)` twice) fixes it, because each updater receives the *previous queued* value as its argument rather than the stale closed-over variable, correctly compounding to `2`.

**87. If you call `setCount(count)` with a value identical to the current state, does the component re-render?**
This is a common misconception — most people assume any `setState` call always triggers a re-render. React explicitly bails out here: if the new value is `Object.is`-equal to the current state, React skips re-rendering the component's children entirely, purely as an optimization. Note the subtlety though — React may still call your component's function body once more before deciding to skip (so don't rely on the render function itself never running), but the actual commit/re-render of the tree is skipped.

**88. Why doesn't the UI update after this "update"?**
```jsx
function TodoList() {
  const [todos, setTodos] = useState([{ id: 1, done: false }]);
  function toggle() {
    todos[0].done = !todos[0].done; // mutate in place
    setTodos(todos);                // same array reference
  }
}
```
The content changed, but the reference didn't — `setTodos(todos)` passes back the exact same array object React already has in state, and React's bail-out check is reference-based (`Object.is`), not a deep content comparison. Since the reference is unchanged, React assumes nothing changed and skips re-rendering, even though `done` is now flipped in memory. This is precisely why React state must be treated as immutable: fix by passing a new array/object (`setTodos([{ ...todos[0], done: !todos[0].done }])`), which gives React a new reference to actually detect as different.

**89. Does wrapping a component in `React.memo` stop it from re-rendering when a Context value it reads changes?**
No — this is a frequent point of confusion. `React.memo`'s bail-out only compares the component's own **props**; it has no visibility into, and does nothing to gate, values read via `useContext` inside that component. If the component calls `useContext(SomeContext)` and the Provider's value changes, the component re-renders unconditionally, regardless of `memo` and regardless of whether its props stayed identical. Memoizing a component is not a substitute for splitting contexts by concern if the real problem is an over-broad Provider value.

**90. What actually gets logged when this button is clicked, and why?**
```jsx
function Timer() {
  const [count, setCount] = useState(0);
  function handleClick() {
    setTimeout(() => {
      console.log(count); // logs the OLD count, not the current one
    }, 3000);
  }
  return <button onClick={() => { setCount(count + 1); handleClick(); }}>Click</button>;
}
```
It logs whatever `count` was at the moment that particular click's render happened, not whatever `count` is three seconds later. `handleClick` is a fresh function created on every render, and each instance closes over that render's `count` binding permanently — the `setTimeout` callback capturing it doesn't magically "see" future re-renders. Clicking rapidly five times queues five timers, each faithfully logging its own render's stale snapshot (`0, 1, 2, 3, 4`), which surprises developers who expect it to log the latest value each time.

**91. React 18 added automatic batching everywhere — so do two `setState` calls fired from two separate `setTimeout` callbacks that each run at a different moment still get merged into a single render?**
No — this is where the "batches everything now" mental model breaks down. Automatic batching groups state updates that occur within the *same* synchronous block of execution before control returns to the browser; it doesn't retroactively merge updates from two callbacks that fire at genuinely different times. If one `setTimeout` fires at the 100ms mark and another at 200ms, each is its own separate task with its own batch and its own render — React can't know at the first render that a second, unrelated update is coming later. Batching removes the *type* of callback (event handler vs. timer vs. promise) as a factor, but multiple updates still need to happen in the same tick to be merged.

**92. How many times does this line print when `<Panel />` first mounts under `StrictMode` in development?**
```jsx
function Panel() {
  console.log('rendering'); // plain log, directly in the render body
  return <div>Panel</div>;
}
```
Twice. In development, `StrictMode` intentionally calls every component's function body twice on each render (not just on mount) specifically to help surface impure logic that mutates something or produces different output on a repeated call — the second call's result is the one actually used. This is a distinct mechanism from the separate "mount → unmount → remount" cycle StrictMode applies to *effects* (which only happens once, on initial mount, and doesn't touch a plain `console.log` sitting directly in the render body).

**93. `<li key={index}>` — does this always cause bugs?**
No, and assuming it's unconditionally wrong is itself a trap. Using the array index as `key` is completely safe for a list that only ever grows by appending new items to the end, since every existing item keeps the same index across renders — nothing about their identity-to-position mapping changes. It breaks specifically when items can be inserted at the front/middle, removed, or reordered: every item after the change point now sits at a different index than before, so React matches each shifted position against the *previous* item that lived there, incorrectly reusing that old item's DOM node (and any of its uncontrolled/local state, like focus or an input's typed value) for what is now logically a different item.

**94. If a component only destructures one field from a context value, does it skip re-rendering when a *different* field on that same value changes?**
```jsx
const { name } = useContext(UserContext); // only reads `name`
// Provider's value is { name: 'Sam', age: 30 } — `age` changes elsewhere
```
No — this is a very common misconception, especially among developers coming from Redux's `useSelector`. Destructuring happens *inside* the component's function body, after React has already decided to re-render it — `useContext` itself has no concept of "only subscribe to this one field." Any change to the Provider's `value` re-renders every consumer wholesale, whether that consumer reads one field or all of them. Genuine field-level subscriptions require a different mechanism entirely (an external store with `useSyncExternalStore`, or a selector-based library), not plain Context.

**95. In a class component, if you call `this.setState({ count: this.state.count + 1 })` and immediately log `this.state.count` on the next line, what do you see?**
The *old* value, not the incremented one — a trap for anyone assuming `setState` mutates `this.state` synchronously. `setState` doesn't apply immediately; it queues a pending state transition, and React (inside a React-controlled context like an event handler or lifecycle method) processes and batches that queue before re-rendering and only then updates the live `this.state` object. Reading `this.state` on the very next line still sees the pre-update snapshot — the fix for logic that needs the new value is either the updater-function form of `setState` or acting in `componentDidUpdate`/a callback passed as `setState`'s second argument.

**96. If a component throws an error partway through rendering, does the user see a half-updated UI before the error boundary catches it?**
No — this relies on a subtlety of React's two-phase architecture that's easy to get wrong. The render phase builds an entirely new work-in-progress Fiber tree off-screen and is not allowed to touch the real DOM at all; DOM mutations only happen afterward, in the synchronous commit phase, applied as one atomic batch. If a component throws during render, React simply discards that in-progress tree — since it was never committed, the actual DOM on screen is left completely untouched (still showing the last successfully committed UI) until the nearest error boundary re-renders its fallback.

**97. A parent passes a brand-new inline object as a prop to a child wrapped in `React.memo`. The object's *contents* are identical to last render's — does `memo` still block the re-render?**
No — and this catches people who think `memo` does a deep-equality check. `React.memo`'s default comparator is a *shallow* comparison of each prop, and for an object/array/function prop that means comparing by reference (`Object.is`), not by contents. `{ theme: 'dark' }` created fresh on every parent render is a new reference every time even though it's structurally identical to the previous one, so the shallow check reports "changed" and `memo` re-renders the child anyway. `memo` only pays off when the parent avoids recreating that prop each render (e.g., hoisting a constant object outside the component, or wrapping it in `useMemo`).
React is a library — it only solves the view layer (rendering UI from state) and deliberately ships no built-in opinion on routing or data fetching, which is why you're free to choose React Router, TanStack Router, Redux, Zustand, etc. A framework, by contrast, calls YOUR code according to ITS own rules ("inversion of control") and dictates overall app structure. Next.js and Remix are frameworks built ON TOP of React — they add the opinionated routing/data-fetching structure React itself leaves out. See file 01.
