# 01 — JSX, Virtual DOM, and Rendering

## 0. Library vs Framework — and Why React Is a Library

**What is it?**
A **library** is a tool YOU call, on your own terms, to solve a specific problem — you're in control of the overall structure of your app, and you decide when/where to bring the library in. A **framework** calls YOUR code — it dictates the overall structure/flow of the application (routing, file layout, data fetching conventions), and you fill in the blanks it defines ("inversion of control").

```js
// Library (you're in control — you call it, when and how you want):
import { useState } from "react";
function Counter() {
  const [count, setCount] = useState(0); // YOU decide where/when to call this
  return <button onClick={() => setCount(count + 1)}>{count}</button>;
}

// Framework (it's in control — it calls YOUR code, according to ITS rules):
// Next.js App Router: just by naming a file `app/products/page.js`,
// the FRAMEWORK decides when to call your default export, what props it receives,
// and how routing/data-fetching happens — you didn't wire any of that up yourself.
export default function ProductsPage() { /* Next.js calls this for you */ }
```

**Why does this distinction matter?**
React itself is famously a **library**, not a framework — it only handles the view layer (rendering UI from state). It deliberately does NOT ship an opinionated answer for routing, data fetching, or project structure, which is why the ecosystem has many competing choices (React Router vs TanStack Router, Redux vs Zustand vs Context). Frameworks BUILT ON TOP of React (Next.js, Remix) add that missing opinionated structure — file-based routing, data-loading conventions, bundling setup — turning "React the library" into a full framework experience. This is why "is React a library or a framework?" is a classic senior interview question: the correct answer is "React itself is a library; Next.js/Remix are frameworks built on top of it."

**Real-world usage:** Choosing "just React" (library, maximum flexibility, more setup decisions) vs Next.js/Remix (framework, opinionated conventions, faster to start, less flexibility) is one of the first architectural decisions on any new frontend project.

**How to explain in an interview (simple English):**
"A library is code I call when I need it — I stay in control of my app's structure. A framework calls my code according to its own rules — it controls the overall flow and I fill in the pieces it expects. React is a library: it only solves rendering/UI-from-state, and deliberately leaves routing and data-fetching unopinionated. Next.js and Remix are frameworks built on top of React that add that missing structure — which is exactly why the answer to 'is React a library or a framework' is 'it's a library, though it's often used inside a framework built on top of it.'"

---

## 1. What is JSX?

**What is it?**
JSX (JavaScript XML) is a syntax extension for JavaScript that lets you write HTML-looking markup directly inside JS code. `<h1>Hello</h1>` is not a string or HTML — it's a compact way to describe a JavaScript object.

**Why was it invented / what problem does it solve?**
Before React, UI libraries separated "logic" (JS) and "template" (HTML) into different files/languages (like Angular templates or jQuery string concatenation). React's insight: markup and the logic that drives it are tightly coupled (a button's presence depends on state, event handlers, conditional rendering) — so **keeping them in the same file, in the same language, is easier to reason about than separating them**. JSX gives you the readability of HTML with the full power of JavaScript (variables, functions, conditionals) in the same place, instead of a limited templating language.

It also solves the **declarative vs imperative** problem:

- Imperative (old-school DOM manipulation): you tell the browser *how* to change, step by step.
  ```js
  const btn = document.createElement('button');
  btn.textContent = 'Click me';
  btn.addEventListener('click', () => { count++; span.textContent = count; });
  document.body.appendChild(btn);
  ```
- Declarative (React/JSX): you describe *what* the UI should look like for a given state, and React figures out the DOM operations.
  ```jsx
  <button onClick={() => setCount(count + 1)}>Clicked {count} times</button>
  ```
  You never touch `document.createElement` or `appendChild` — you just describe the end result for each state, and React handles the diffing/patching.

**Real-world usage:** Every React component you write. Also used by React Native (JSX → native views instead of DOM), and by frameworks like Next.js/Remix that build on top of React.

**How to explain in an interview (simple English):**
"JSX lets me write UI markup inside JavaScript so the rendering logic and the markup live together instead of being split across templates and controllers. It's not understood by the browser directly — it's compiled to plain JS function calls. It makes the code declarative: I describe what the UI should look like for the current state, not the steps to mutate the DOM."

---

## 2. How JSX Compiles

**What is it?**
JSX is not valid JavaScript. A build tool (Babel, or the compiler built into Vite/Next.js) transforms it into regular function calls **before** the code ever reaches the browser.

**Old transform (React <17, classic runtime):**
```jsx
const element = <h1 className="greeting">Hello</h1>;
```
compiles to:
```js
const element = React.createElement(
  'h1',
  { className: 'greeting' },
  'Hello'
);
```
This is why old codebases always had `import React from 'react'` even if `React` was never explicitly used in the code — the compiled output needed `React.createElement` in scope.

**New transform (React 17+, automatic/jsx-runtime):**
```js
import { jsx as _jsx } from 'react/jsx-runtime';
const element = _jsx('h1', { className: 'greeting', children: 'Hello' });
```
Now the compiler auto-imports the `jsx` function from `react/jsx-runtime`, so you **no longer need `import React from 'react'`** in every file just to use JSX (you still need it for hooks like `React.useState`, unless you import them by name).

**What `React.createElement` actually returns** — a plain JS object (a "React element"), NOT a real DOM node:
```js
{
  type: 'h1',
  props: { className: 'greeting', children: 'Hello' },
  key: null,
  ref: null,
  $$typeof: Symbol(react.element)
}
```
This object is a lightweight description — "I want an h1 here with this class and this text." React reads this tree of objects and decides how to update the real DOM.

**Real-world usage:** Understanding this matters when debugging weird JSX behavior (e.g., why `<>fragment</>` shorthand exists, why conditionally rendering `false`/`null`/`undefined` renders nothing, why every JSX tag must return a single root element/Fragment).

**How to explain in an interview:**
"JSX is syntactic sugar. Babel or the bundler's compiler turns `<div>hi</div>` into a `React.createElement` (or `jsx()` in the new runtime) call that returns a plain JavaScript object describing the element — not a real DOM node. React then uses that object tree to figure out what the actual DOM should look like."

---

## 3. The Virtual DOM

**What is it?**
The Virtual DOM (VDOM) is a lightweight, in-memory JavaScript representation of the actual DOM tree. It's just nested plain objects (the React elements from above), not real browser DOM nodes.

**Why was it invented?**
Direct DOM manipulation is expensive — every time you touch the real DOM (change a style, add a node), the browser may recalculate layout, repaint, etc. If you naively update the DOM on every small state change, performance suffers, especially with big lists/trees.

React's approach:
1. Keep a JS object tree (Virtual DOM) representing "what the UI should look like."
2. When state changes, build a **new** Virtual DOM tree.
3. Compare (diff) the new tree against the previous one.
4. Compute the **minimal set of real DOM changes** needed and apply only those ("reconciliation").

This trades a bit of extra JS work (cheap, happens in memory) for far fewer expensive real DOM operations.

**Real-world usage:** This is why React feels fast for UI-heavy apps with frequent updates (chat apps, dashboards, forms) — you write "re-render everything" style code, but React only touches what actually changed in the real DOM.

**How to explain in an interview:**
"The Virtual DOM is React's cheap, in-memory copy of the UI tree. Instead of directly mutating the browser DOM on every state change — which is slow — React builds a new virtual tree, compares it with the old one, and only applies the specific changes needed to the real DOM. This diffing step is called reconciliation."

> Side note (from old notes): Shadow DOM is a *different, unrelated browser feature* used for scoping CSS/markup inside Web Components — it's not related to React's Virtual DOM. Don't confuse the two in interviews.

---

## 4. Reconciliation & the Diffing Algorithm

**What is it?**
Reconciliation is the algorithm React uses to figure out the difference between two Virtual DOM trees (old vs new) and decide which real DOM operations are needed.

**Why was it invented?**
A generic tree-diffing algorithm is O(n³) in the worst case — way too slow for UI updates that need to happen many times per second. React's engineers built a set of **heuristics** that make diffing O(n) by assuming two things that are true for almost all UI:
1. Two elements of **different types** produce different trees (React won't try to diff a `<div>` against a `<span>` — it tears down the old and builds new).
2. Developers can hint at which list items are stable across renders using **`key`**.

**How the algorithm actually works (high level):**
- Compare root elements. If the type differs (`<div>` vs `<p>`), destroy old subtree, build new one from scratch (including unmounting/remounting children and losing their state).
- If the type is the same, keep the underlying DOM node and just update changed attributes/props, then recurse into children.
- For **lists of children**, without extra info React would compare index-by-index and could do wasteful work (e.g., inserting an item at the top shifts every other item's index, making React think ALL of them changed). This is where `key` comes in.

**Fiber (mentioned in old notes, still true today):**
React 16+ uses the **Fiber** reconciler, which turns rendering into an interruptible unit of work (instead of one large synchronous recursive call stack). This allows React to pause, prioritize, and resume rendering work — the foundation for **Concurrent Rendering** features like `useTransition`, `Suspense`, and time-slicing (covered in file 09).

**Real-world usage:** Every re-render in every React app goes through reconciliation. Understanding it explains why keys matter, why moving a component in the tree can remount it and lose state, and why "why did this re-render" is a core perf-debugging skill.

**How to explain in an interview:**
"Reconciliation is how React figures out the minimal DOM changes between renders. It walks the new virtual tree and old virtual tree together: same element type at the same position → update in place; different type → tear down and rebuild. For lists, React uses the `key` prop to match items across renders instead of relying on array position, so it can correctly detect inserts, removes, and reorders without throwing away unrelated DOM nodes and state."

---

## 5. Keys — Why They Matter

**What is it?**
`key` is a special prop you give to elements in a list so React can uniquely identify each item across renders.

**Why was it invented?**
Without keys, React matches old children to new children **by their position (index)** in the array. If you insert an item at the front of a list, every subsequent item's index shifts by one — React thinks *every* item after the insertion point "changed" (because the element that was at index 2 is now different content at index 2), so it needlessly updates/remounts DOM nodes and can lose internal component state (like an input's typed value, or animation state) attached to those items.

With stable, unique keys, React can match "the todo with id=42" across renders regardless of where it now sits in the array, and correctly do just an insert instead of a wave of updates.

**Real-world usage:** Rendering any dynamic list — todo apps, comment threads, table rows, chat messages. Bugs from wrong keys are extremely common in real codebases (e.g., using array index as key for a reorderable/filterable list causes inputs to show wrong values after reorder).

```jsx
// BAD: index as key when list can reorder/filter — causes stale UI state bugs
{todos.map((todo, index) => <TodoItem key={index} todo={todo} />)}

// GOOD: stable unique id as key
{todos.map((todo) => <TodoItem key={todo.id} todo={todo} />)}
```

**Common pitfall ("what's wrong with this code"-style):**
```jsx
// Each TodoItem has its own <input> for editing text.
// If you delete the first todo, using index as key causes the SECOND
// todo's input value to appear to "jump" into the first row,
// because React reuses the DOM node for index=0 and just updates its props/text
// — but any local uncontrolled DOM state on that node stays.
{todos.map((todo, i) => <input key={i} defaultValue={todo.text} />)}
```

**How to explain in an interview:**
"Keys tell React 'this is the same logical item across renders,' independent of its position in the array. Without a good key, React falls back to comparing by index, which breaks down as soon as items are added, removed, or reordered — you get unnecessary re-renders, and worse, DOM nodes carrying the wrong internal/uncontrolled state. The fix is always a stable, unique key like a database id — never the array index if the list can reorder or filter."

---

## Quick Comparison Table

| Concept | What it is | Why it exists |
|---|---|---|
| JSX | Syntax sugar for `React.createElement`/`jsx()` calls | Keep markup + logic together, declarative UI |
| React Element | Plain JS object describing a UI node | Cheap to create, compare, and throw away |
| Virtual DOM | Tree of React elements kept in memory | Avoid expensive direct DOM mutations |
| Reconciliation | Algorithm to diff old vs new VDOM tree | Make diffing fast (O(n)) using heuristics |
| Fiber | React's reconciliation engine (React 16+) | Interruptible, prioritized rendering (concurrent features) |
| `key` | Stable identity hint for list items | Correctly match items across renders, avoid state bugs |
