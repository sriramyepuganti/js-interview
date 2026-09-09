# 15 — React 19 / Latest React Features (2024–2026)

This file covers what's new in **React 19** that isn't in files 01-14 — the biggest set of API changes since hooks themselves. A lot of this is aimed squarely at killing manual `useState` + `useEffect` boilerplate around **forms, async actions, and refs**, plus two ecosystem-level shifts (the React Compiler, document metadata support) that change advice given elsewhere in this folder.

---

## 1. The `use()` API

**What is it?** A new function (not technically a "hook" in the traditional sense, but it lives in `react` and is used inside components) that lets you **read the value of a Promise or a Context** directly during render. Unlike every other hook, `use()` can be called **conditionally** — inside `if` statements, loops, after early returns — because it isn't tracked by the same "call order" linked-list mechanism described in file 03 section 10.

```jsx
import { use, Suspense } from 'react';

function Comments({ commentsPromise }) {
  // `use()` unwraps the promise. If it's not resolved yet, this component
  // "suspends" — React walks up to the nearest <Suspense> and shows its fallback.
  const comments = use(commentsPromise);
  return comments.map((c) => <p key={c.id}>{c.text}</p>);
}

function Page({ commentsPromise }) {
  return (
    <Suspense fallback={<p>Loading comments...</p>}>
      <Comments commentsPromise={commentsPromise} />
    </Suspense>
  );
}
```

Reading context conditionally (impossible with `useContext`):
```jsx
function Button({ show }) {
  if (!show) return null;
  // Illegal with useContext (hooks can't be conditional) — perfectly legal with use()
  const theme = use(ThemeContext);
  return <button className={theme}>Click</button>;
}
```

**Why was it invented / what problem does it solve?**
- Before `use()`, consuming a promise inside a component meant manual `useState`/`useEffect` juggling (`isLoading`, `error`, `data`) or reaching for a library. `use()` lets Suspense handle the "waiting" UI declaratively, the same way it already did for `React.lazy` (file 09) — now generalized to *any* promise, not just component code-splitting.
- It also removes an artificial restriction: plain hooks *must* run unconditionally every render (file 03's Rules of Hooks), which is annoying when you genuinely only need a value sometimes. `use()` is exempt from that rule by design.

**Real-world usage:** Reading a promise passed down from a Server Component into a Client Component (a very common Next.js App Router pattern — the server starts the fetch and passes the *promise itself*, not the awaited value, letting the client stream in and suspend on it). Conditionally reading context in a component that early-returns.

**How to explain in an interview (simple English):** "`use()` lets me unwrap a promise or read context inside a component, and — unlike `useState` or `useContext` — I'm allowed to call it conditionally, because React doesn't track it by call-order the way it does normal hooks. Its main real-world use is consuming a promise that a Server Component started and passed down, letting Suspense show a fallback until it resolves, without me writing any manual loading-state code."

---

## 2. Actions and `useActionState`

**What is it?** "Actions" is React 19's umbrella term for **async functions passed to things like `<form action={...}>` or a button's `formAction`** — React automatically tracks their pending state, handles errors, and manages the returned result, instead of you wiring that up by hand. `useActionState` is the hook that ties an action function to that tracked state.

```jsx
import { useActionState } from 'react';

async function updateName(previousState, formData) {
  const name = formData.get('name');
  if (!name) return { error: 'Name is required' };
  await saveNameToServer(name);
  return { error: null, success: true };
}

function NameForm() {
  // [state, formAction, isPending] — state is whatever the action function returned,
  // formAction is what you pass to <form action={...}>, isPending is tracked automatically.
  const [state, formAction, isPending] = useActionState(updateName, { error: null });

  return (
    <form action={formAction}>
      <input name="name" />
      <button disabled={isPending}>{isPending ? 'Saving...' : 'Save'}</button>
      {state.error && <p style={{ color: 'red' }}>{state.error}</p>}
    </form>
  );
}
```

**Why was it invented / what problem does it solve?** Before React 19, every form submission repeated the same boilerplate:

| Old manual pattern (pre-19) | `useActionState` (React 19) |
|---|---|
| `const [isPending, setIsPending] = useState(false)` | Built in — `isPending` returned for you |
| `const [error, setError] = useState(null)` | Built in — part of whatever `state` your action returns |
| `onSubmit={async (e) => { e.preventDefault(); setIsPending(true); try { ... } catch(e) { setError(e) } finally { setIsPending(false) } }}` | `<form action={formAction}>` — React calls your action, tracks pending/error itself |
| Manual `e.preventDefault()` + reading `e.target.elements` | React passes a `FormData` object directly to your action |
| Race conditions if the user double-submits, no auto-disable | React automatically prevents duplicate in-flight submissions of the same form |

This is a direct replacement for the classic "manual `useState` + `useEffect`/async handler" form-submission pattern that shows up constantly in React codebases and interview take-home tests.

**Real-world usage:** Any form — login, signup, "add comment," settings pages, checkout steps — where you want pending/error state without hand-rolling three separate `useState` calls per form.

**How to explain in an interview (simple English):** "Actions let me pass an async function straight to a form, and React 19 automatically tracks pending, error, and result state for that function — so I don't need three separate `useState` calls and a try/catch/finally wrapper just to submit a form. `useActionState` gives me back `[state, formAction, isPending]`: I render `state` for the result/error, hook `formAction` into the form, and use `isPending` to disable the button while it's running."

---

## 3. `useFormStatus` — reading a parent form's pending state without prop drilling

**What is it?** A hook that lets a component **nested inside a `<form>`** read that form's current submission status (`pending`, `data`, `method`, `action`) — without the form having to pass that status down as a prop.

```jsx
import { useFormStatus } from 'react-dom';

// This button doesn't need any props at all — it reads the enclosing <form>'s
// pending state directly, no matter how deeply it's nested inside that form.
function SubmitButton() {
  const { pending } = useFormStatus();
  return <button disabled={pending}>{pending ? 'Submitting...' : 'Submit'}</button>;
}

function SignupForm({ action }) {
  return (
    <form action={action}>
      <input name="email" />
      <SubmitButton /> {/* knows the form is pending without being told */}
    </form>
  );
}
```

**Why was it invented / what problem does it solve?** Before this, a reusable `<SubmitButton>` component had no way to know whether *its* enclosing form was submitting unless the parent explicitly passed an `isPending` prop down — classic prop drilling (file 05), and it broke encapsulation because every parent form had to remember to wire that prop through. `useFormStatus` lets a generic, reusable submit button (or a loading spinner, or a "form is disabled" overlay) work correctly inside **any** form automatically, like a mini form-scoped context that React sets up for you for free.

**Important nuance (interview trap):** `useFormStatus` must be called from a component that is a **descendant** of the `<form>`, not the component that renders the `<form>` itself — calling it in the same component as the `<form>` tag always returns `pending: false`.

**Real-world usage:** Shared/design-system `<SubmitButton>` or `<FormSpinner>` components used across many different forms in a codebase, where each form's action differs but the "am I submitting?" UI logic should be identical and reusable.

**How to explain in an interview (simple English):** "`useFormStatus` lets a child component read whether its parent `<form>` is currently submitting, without the form passing that down as a prop. It's most useful for a reusable submit button component used inside lots of different forms — each one automatically knows its own form's pending state with zero prop drilling."

---

## 4. `useOptimistic` — optimistic UI with automatic rollback

**What is it?** A hook that lets you show a **temporary "optimistic" state immediately** (before an async action finishes), and automatically **reverts to the real state** once the action settles — success just confirms the optimistic value, failure rolls it back.

```jsx
import { useOptimistic, useState, useRef } from 'react';

function CommentList({ comments, addCommentAction }) {
  const [optimisticComments, addOptimisticComment] = useOptimistic(
    comments,
    (currentComments, newCommentText) => [
      ...currentComments,
      { id: 'temp', text: newCommentText, sending: true }, // shown instantly, marked as "sending"
    ]
  );

  async function submitComment(formData) {
    const text = formData.get('comment');
    addOptimisticComment(text);       // show it NOW, before the network call even starts
    await addCommentAction(text);     // real server call — updates `comments` when it resolves
  }

  return (
    <>
      {optimisticComments.map((c) => (
        <p key={c.id} style={{ opacity: c.sending ? 0.5 : 1 }}>{c.text}</p>
      ))}
      <form action={submitComment}>
        <input name="comment" />
        <button>Post</button>
      </form>
    </>
  );
}
```

**Why was it invented / what problem does it solve?** Optimistic UI (showing the "would-be" result instantly instead of waiting for a round-trip, e.g. liking a post, sending a chat message) used to require **manually** managing a temporary local copy of state, merging it with the real data when the request resolved, and manually rolling it back on error — easy to get subtly wrong (duplicate items, stuck optimistic entries after a failed request, races between two in-flight updates). `useOptimistic` handles the merge-and-revert bookkeeping for you: if the underlying async action throws, React automatically discards the optimistic update and falls back to the last real `comments` value.

**Real-world usage:** Chat apps (message appears instantly, "sending..." indicator, then confirms), social feeds (like/heart button toggles instantly), to-do apps (item appears checked-off immediately while the save request is in flight).

**How to explain in an interview (simple English):** "`useOptimistic` lets me show the UI as if an async action already succeeded, immediately, while the real request is still in flight — like a comment appearing right away instead of waiting for the server. If the action fails, React automatically reverts to the real state for me. Before this, I'd have to hand-roll a temporary state variable, merge it with the real data, and manually undo it on error — this hook does that bookkeeping automatically."

---

## 5. Server Actions (`"use server"`)

**What is it?** A directive you put at the top of a function (or a whole file) to mark it as code that **only ever runs on the server**, but can be **called directly from a Client Component** — like calling a function, no hand-built API route/endpoint required, even though under the hood it's a network request.

```jsx
// actions.js
'use server'; // everything exported from this file becomes a server action

export async function addComment(formData) {
  const text = formData.get('comment');
  await db.comments.insert({ text }); // direct DB access — this code NEVER ships to the browser
}
```

```jsx
// CommentForm.jsx
'use client';
import { addComment } from './actions';

function CommentForm() {
  // Passing a server action straight into a form's `action` prop — clicking
  // Submit triggers a request to the server, runs addComment there, and the
  // component tree updates when it resolves. No fetch(), no API route file needed.
  return (
    <form action={addComment}>
      <input name="comment" />
      <button>Post</button>
    </form>
  );
}
```

**Why was it invented / what problem does it solve?**
1. Removes the need to hand-write a separate REST/API endpoint **just** to let a client component trigger a server-side mutation — the function *is* the endpoint.
2. Combines naturally with `useActionState`/`useOptimistic`/`useFormStatus` above — a Server Action is exactly the kind of async function those hooks are designed to wrap, giving you full pending/error/optimistic UI around a real server mutation with very little code.
3. Keeps sensitive logic (DB credentials, secret keys) genuinely server-only, the same guarantee Server Components (file 13) give for *reading* data — Server Actions extend that to *writing*/mutating data.

**Real-world usage:** Form submissions that mutate a database (adding a comment, updating a profile, checkout) in Next.js App Router apps — the mainstream framework implementing this as of 2025/2026, same caveat as RSC in file 13: Server Actions require framework-level wiring, not usable in a plain CRA/Vite SPA.

**How to explain in an interview (simple English):** "Server Actions let a client component call a function that only runs on the server — marked with `'use server'` — directly, without me building a separate API route. React handles the network call under the hood. It pairs naturally with `useActionState` and `useOptimistic`: the server action does the real mutation, and those hooks give me pending/error/optimistic UI around it almost for free."

---

## 6. `ref` as a normal prop — `forwardRef` is no longer required for simple cases

**What is it?** In React 19, **function components can accept `ref` as a plain prop**, just like any other prop — you no longer need to wrap a component in `forwardRef` just to let a parent attach a ref to it.

```jsx
// React 19 — no forwardRef needed for the simple case
function FancyInput({ placeholder, ref }) {
  return <input placeholder={placeholder} ref={ref} />;
}

// Parent
const inputRef = useRef(null);
<FancyInput ref={inputRef} placeholder="Search..." />
```

Pre-19 (still works, and still needed for the `useImperativeHandle` case covered in file 03 section 8 — exposing a *curated* API instead of the raw DOM node):
```jsx
const FancyInput = React.forwardRef((props, ref) => (
  <input placeholder={props.placeholder} ref={ref} />
));
```

**Why was it invented / what problem does it solve?** `forwardRef` was pure ceremony for the common case of "just let the ref reach the underlying DOM node" — an extra wrapper function, an extra concept to teach, and a common source of "why doesn't my ref work" bugs for developers who forgot to wrap a component in it. Removing the requirement for the simple pass-through case removes boilerplate with no loss of capability.

**Important nuance (interview trap):** `forwardRef` **still exists** and is still needed when you want `useImperativeHandle`-style control over exactly what the ref exposes (file 03 section 8) — React 19 just removes the requirement for the *plain pass-through* case. Don't say "forwardRef is gone" — say "it's no longer *required* for simple ref forwarding."

**Real-world usage:** Any custom input/wrapper component (`<Card>`, `<CustomInput>`, `<Modal>`) that just needs to let a parent focus/scroll-to/measure the underlying DOM node — the vast majority of real-world ref-forwarding use cases.

**How to explain in an interview (simple English):** "Before React 19, if you wanted a parent to attach a ref to a function component, you had to wrap it in `forwardRef`, even for the simplest pass-through case. React 19 lets function components just accept `ref` as a normal prop, so that wrapper is no longer required for simple cases. `forwardRef` isn't removed though — it's still there for the `useImperativeHandle` case where you want to expose a curated API instead of the raw DOM node."

---

## 7. Context as a direct provider — `<SomeContext value={...}>`

**What is it?** React 19 lets you render a Context object **directly as a provider component**, without the `.Provider` part.

```jsx
const ThemeContext = createContext('light');

// React 19 — shorter, same behavior as ThemeContext.Provider
function App() {
  return (
    <ThemeContext value="dark">
      <Toolbar />
    </ThemeContext>
  );
}

// Pre-19 (still works — file 05's examples use this form, and it's not going away)
function App() {
  return (
    <ThemeContext.Provider value="dark">
      <Toolbar />
    </ThemeContext.Provider>
  );
}
```

**Why was it invented / what problem does it solve?** Purely an ergonomics simplification — `<Context.Provider>` was the only way to render a context provider since Context's introduction, and `.Provider` was extra ceremony that didn't add clarity once developers were already familiar with the pattern. Everything about Context's actual behavior (file 05 — prop-drilling fix, all-consumers-re-render-on-change pitfall, splitting contexts by concern) is **unchanged**; this is syntax sugar only.

**Real-world usage:** Any place file 05's `.Provider` examples are used — new code can use the shorter form; existing `.Provider` code doesn't need to be migrated (both forms work side by side).

**How to explain in an interview (simple English):** "React 19 lets you render a context object directly as `<MyContext value={...}>` instead of `<MyContext.Provider value={...}>` — it's the exact same Context mechanism underneath, just shorter to write. All the usual Context tradeoffs — re-rendering every consumer on value change, splitting contexts by concern — are unchanged."

---

## 8. Document metadata support — `<title>`, `<meta>`, `<link>` rendered directly in components

**What is it?** React 19 lets you render `<title>`, `<meta>`, and `<link>` tags **directly inside any component**, anywhere in the tree — React automatically **hoists them into `<head>`** at render time, even if the component rendering them is deeply nested.

```jsx
function BlogPost({ post }) {
  return (
    <article>
      {/* These don't need to live in a layout/head component — React moves them
          into <head> automatically, no matter how deep this component is nested. */}
      <title>{post.title} — My Blog</title>
      <meta name="description" content={post.excerpt} />
      <link rel="canonical" href={`https://myblog.com/posts/${post.slug}`} />

      <h1>{post.title}</h1>
      <p>{post.body}</p>
    </article>
  );
}
```

**Why was it invented / what problem does it solve?** Before this, setting a per-page `<title>` or meta description from deep inside a component tree required either a dedicated library (`react-helmet`/`react-helmet-async`) or framework-specific APIs (Next.js's old `<Head>` component, or a `metadata` export in the App Router). Now it's built directly into React itself — any component, including ones rendered deep inside a page (a specific blog post, a specific product card) can just render the tag it needs, and React handles moving it to `<head>` correctly, including de-duplication (e.g., only one `<title>` wins) and cleanup when the component unmounts.

**Real-world usage:** Per-page SEO titles/descriptions set from the component that actually has the relevant data (a `ProductPage` component setting its own `<title>` from `product.name`, rather than a top-level layout having to somehow know about it), Open Graph tags, canonical links — all without a third-party library.

**How to explain in an interview (simple English):** "React 19 lets me render `<title>`, `<meta>`, and `<link>` tags directly inside any component, and React automatically hoists them up into the document `<head>` for me — even if that component is deeply nested. This replaces the need for something like `react-helmet` for a lot of common cases, since the page's own data-owning component can just set its own SEO tags directly."

---

## 9. The React Compiler — automatic memoization

**What is it?** A build-time tool (works as a Babel/SWC plugin) that **automatically analyzes your component code and inserts memoization for you** — the equivalent of automatically wrapping the right values in `useMemo`, the right functions in `useCallback`, and the right components in `React.memo`, without you writing any of those calls by hand.

```jsx
// You write plain code, no memoization hooks at all:
function ProductList({ products, filter }) {
  const filtered = products.filter((p) => p.category === filter); // looks like it re-runs every render...
  const handleClick = (id) => console.log('clicked', id);          // ...and a "new" function every render...
  return filtered.map((p) => <ProductRow key={p.id} product={p} onClick={handleClick} />);
}

// The React Compiler analyzes this at build time and automatically memoizes
// `filtered` and `handleClick` under the hood — roughly as if you'd hand-written:
// const filtered = useMemo(() => products.filter(p => p.category === filter), [products, filter]);
// const handleClick = useCallback((id) => console.log('clicked', id), []);
// ...except you never had to write it, and never have to keep the dependency array correct.
```

**Why was it invented / what problem does it solve?** File 06 of this folder teaches the manual rules: don't overuse `useMemo`/`useCallback`, only reach for them when profiling shows a real need, watch out for wrong/missing dependency arrays causing stale bugs or busted memoization. All of that is **manual, error-prone work** that a compiler can, in many common cases, do correctly and automatically — the same way TypeScript's compiler catches type errors a human might miss by hand. The React team built the Compiler specifically because "remembering to memoize the right things, with the right dependencies" was one of the most common sources of both bugs (stale closures) and wasted effort (over-memoizing cheap things) in real codebases.

**What this changes about file 06's advice (important nuance):**
- In a codebase that has **adopted the React Compiler**, manual `useMemo`/`useCallback`/`React.memo` become **escape hatches for edge cases the compiler can't safely handle**, not the default recommendation — the compiler handles the common cases automatically and correctly, with no dependency-array bugs possible since it's generated, not hand-maintained.
- In a codebase that **hasn't adopted it** (still the majority of real-world codebases as of 2025/2026 — adoption is gradual and it requires opting in, plus code that follows the Rules of Hooks/purity), all of file 06's manual guidance is still exactly correct and still exactly what interviewers expect you to know.
- **The compiler doesn't replace understanding *why* memoization matters** — it just automates *applying* it. If the compiler can't verify a component is "safe" to memoize (e.g., code that isn't strictly following the Rules of Hooks, or has side effects during render), it skips that component, and manual memoization knowledge is still needed to reason about why.

**Real-world usage:** New projects and gradually-migrating existing ones (Meta itself uses it internally at scale as of the transition period). Not yet universal — many production codebases in interviews will still be pre-Compiler, so both the manual skill (file 06) and the awareness that the Compiler exists are expected of a senior candidate.

**How to explain in an interview (simple English):** "The React Compiler is a build-time tool that automatically memoizes components, values, and functions for you — roughly what you'd get from hand-writing the right `useMemo`/`useCallback`/`React.memo` calls, but generated correctly and automatically instead of maintained by hand. It doesn't remove the need to *understand* memoization — if the compiler can't prove a component is safe to memoize, it skips it — but in a codebase that's adopted it, manual memoization becomes more of an escape hatch than the default first move. I still need the manual skills because plenty of real codebases haven't adopted the compiler yet."

**See also:** file `06-performance-optimization.md` now has a short section near the top flagging this same nuance.

---

## 10. `useTransition` / `useDeferredValue` — what's new on top of file 09's coverage

File 09 (section 3) already covers the core mental model of `useTransition` and `useDeferredValue` — that coverage is accurate and unchanged. Two React 19 additions worth knowing on top of it:

**`useDeferredValue`'s new second argument — an initial value:**
```jsx
// React 19: second argument is the value to use on the VERY FIRST render,
// before React has anything to "defer" yet (e.g., before any prop has arrived).
const deferredValue = useDeferredValue(value, initialValue);
```
Why it matters: previously, on first render, `useDeferredValue` just returned `value` itself (nothing to defer from yet) — now you can explicitly say "show this placeholder value on the very first render" instead, which is useful when the real `value` starts as something not meant to be shown directly (e.g., `undefined` while a parent is still resolving what to pass down).

**`useTransition` / `startTransition` can now wrap async functions directly**, and React tracks the pending state across the whole async function, not just the synchronous part:
```jsx
const [isPending, startTransition] = useTransition();

function handleClick() {
  startTransition(async () => {
    await saveToServer(); // isPending stays true across this whole await, automatically
    setStatus('saved');
  });
}
```
Pre-19, `startTransition`'s callback was expected to be synchronous — an `await` inside it wouldn't keep `isPending` true for the async portion. This is the same underlying mechanism Actions (section 2) build on.

**How to explain in an interview (simple English):** "The core `useTransition`/`useDeferredValue` model from React 18 hasn't changed — what's new in 19 is `useDeferredValue` accepting an initial value for the very first render, and `startTransition` now correctly tracking pending state across an entire `async` function, not just its synchronous part — which is also the same mechanism that powers Actions."

---

## Summary Table

| Feature | Problem it solves | Old way |
|---|---|---|
| `use()` | Read a promise/context conditionally, unify "waiting for data" under Suspense | `useState`/`useEffect` loading flags |
| `useActionState` | Form pending/error/data state | Manual `useState` x3 + try/catch/finally |
| `useFormStatus` | Read parent form's pending state from a child | Prop drilling `isPending` down manually |
| `useOptimistic` | Instant UI + auto-revert-on-error | Manual temp state + manual merge/rollback |
| Server Actions (`"use server"`) | Call server-side mutations directly from a form/client component | Hand-built API route + `fetch()` |
| `ref` as a prop | Ref forwarding without ceremony | Mandatory `forwardRef` wrapper |
| `<Context value={}>` | Shorter provider syntax | `<Context.Provider value={}>` |
| Document metadata (`<title>`, `<meta>`, `<link>`) | Per-component SEO tags, auto-hoisted to `<head>` | `react-helmet` / framework-specific `<Head>` |
| React Compiler | Automatic memoization | Manual `useMemo`/`useCallback`/`React.memo` |
| `useDeferredValue` initial value / async `startTransition` | First-render placeholder value; pending tracked across `await` | No initial value option; pending didn't cover async portion |

## See also
`examples/react-19-features.jsx` — `useActionState` + `useFormStatus` + `useOptimistic` combined in one optimistic "add a comment" form, with inline comments on what React 19 automates vs what used to be hand-written.
