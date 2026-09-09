# 07 — State Management: Evolution and Choices

This is the classic senior "how would you architect state for this app" interview topic. It builds directly on his old `redux.jsx` / `actions/action.js` / `reducers/reducer.js` pattern — showing exactly how that evolved.

---

## 1. Classic Redux (his old pattern) — what it was and why

**What is it?** A single, centralized, immutable store. State only changes by **dispatching an action object**, which a **pure reducer function** processes to produce the next state. Components connect to the store via `connect()` (`mapStateToProps`/`mapDispatchToProps`) — exactly what his old `redux.jsx` does.

```js
// His old pattern:
// actions/action.js
export function increment() { return { type: 'INCREMENT' }; }
export function fetchData() {
  return dispatch => fetch(url).then(res => res.json())
    .then(json => dispatch({ type: 'API_SUCCESS', payload: json }));
} // redux-thunk middleware — lets action creators return functions, not just objects

// reducers/reducer.js
export const reducer = (state = 0, action) => {
  switch (action.type) {
    case 'INCREMENT': return state + 1;
    default: return state;
  }
};
export default combineReducers({ reducer, apiCall });

// component
const mapStateToProps = (state) => ({ counter: state });
const mapDispatchToProps = (dispatch) => ({ increment: () => dispatch(increment()) });
export default connect(mapStateToProps, mapDispatchToProps)(Redux);
```

**Why it was invented (2015 era):** Before Redux, large apps (especially with frameworks like early Backbone/Angular 1 or ad-hoc React+Flux) suffered from unpredictable state mutations scattered across the codebase — any component could mutate shared state directly, making bugs nearly impossible to trace ("who changed this and when?"). Redux's rules — single source of truth, state is read-only (only changed via dispatched actions), changes made by pure functions (reducers) — made state changes **traceable, predictable, and testable**, and enabled powerful tooling like Redux DevTools (time-travel debugging, action replay).

**Why it fell out of favor for new projects (by itself):** Massive boilerplate. For one simple counter, you needed: action type constants, action creator functions, a reducer, `combineReducers`, `mapStateToProps`, `mapDispatchToProps`, `connect()` wiring — several files just to add one number. Also, correctly maintaining **immutability** by hand (`{...state, field: newValue}`, careful array spreading) was error-prone — his old notes even flag it: *"reducer breaks the main Redux principle: immutability"* when doing `state.arr.push(2)` directly.

---

## 2. Redux Toolkit (RTK) — the modern, official way to write Redux

**What is it?** The official, opinionated Redux package that eliminates almost all the old boilerplate. `createSlice` auto-generates action types and action creators from reducer function names, and lets you write reducers as if you were mutating state directly (it uses Immer internally to produce immutable updates safely under the hood).

```js
// counterSlice.js — replaces actions/action.js + reducers/reducer.js entirely
import { createSlice } from '@reduxjs/toolkit';

const counterSlice = createSlice({
  name: 'counter',
  initialState: { value: 0 },
  reducers: {
    increment: (state) => { state.value += 1; }, // looks mutating, but Immer makes it safe/immutable
    decrement: (state) => { state.value -= 1; },
  },
});
export const { increment, decrement } = counterSlice.actions; // action creators AUTO-generated
export default counterSlice.reducer;

// store.js
import { configureStore } from '@reduxjs/toolkit';
export const store = configureStore({ reducer: { counter: counterSlice.reducer } }); // thunk + devtools built in

// Component — modern hooks API replaces connect()/mapStateToProps entirely
function Counter() {
  const count = useSelector((state) => state.counter.value);
  const dispatch = useDispatch();
  return <button onClick={() => dispatch(increment())}>{count}</button>;
}
```

**Why it was invented:** The Redux team itself acknowledged the old pattern had too much boilerplate and too many footguns (accidental mutation, forgetting `combineReducers`, manual immutable-update patterns). RTK is now the **officially recommended** way to write Redux — "plain Redux" (the old pattern) is considered legacy.

**RTK Query** — RTK's built-in solution for **server state** (API data), replacing hand-written thunks like his old `fetchData()`:
```js
const api = createApi({
  baseQuery: fetchBaseQuery({ baseUrl: 'https://jsonplaceholder.typicode.com' }),
  endpoints: (builder) => ({
    getPosts: builder.query({ query: () => '/posts' }),
  }),
});
export const { useGetPostsQuery } = api;

// Component
function Posts() {
  const { data, isLoading, error } = useGetPostsQuery(); // caching, loading/error states, refetching — all automatic
}
```

---

## 3. Why the industry moved beyond Redux for MOST apps — client state vs server state

The big mental-model shift in the last 4-5 years: **not all state is the same kind of state.**

| Kind of state | Examples | Best tool |
|---|---|---|
| **Server state** (data that lives on a server, can go stale, needs caching/refetching/dedup) | API responses — posts, users, products | **React Query / TanStack Query**, RTK Query, SWR |
| **Client/UI state** (belongs purely to the app's UI) | Modal open/closed, form input, theme, selected tab | `useState`/`useReducer`, or Zustand/Jotai for cross-component |
| **Global-but-simple app state** | Current user session, feature flags | Context (low frequency) or a small store |

The old-school approach of shoving **server data** into Redux (like `apiCall` in his old reducer) forces you to hand-write loading/error/caching/refetch/retry/dedup logic yourself — that's exactly what React Query / RTK Query now do automatically (see file 07 continued below and file "custom-hooks" `useFetch` for the manual version). This realization — "most of my Redux state was actually just cached server responses" — is why many teams dropped Redux entirely and kept only a tiny bit of local/global UI state.

---

## 4. Modern lightweight alternatives

### Zustand
**What is it?** A minimal global store — no boilerplate, no Provider wrapping required, just a hook.
```js
import { create } from 'zustand';

const useCounterStore = create((set) => ({
  count: 0,
  increment: () => set((state) => ({ count: state.count + 1 })),
}));

function Counter() {
  const { count, increment } = useCounterStore(); // any component, no Provider needed
  return <button onClick={increment}>{count}</button>;
}
```
**Why chosen:** Redux-like centralized store benefits (single source of truth, devtools support available), but with a fraction of the setup — no actions/reducers/dispatch ceremony required, though you *can* structure it that way if you want.

### Jotai (atomic state)
**What is it?** State is built from small independent "atoms" instead of one big tree; components subscribe only to the atoms they use.
```js
import { atom, useAtom } from 'jotai';

const countAtom = atom(0);
function Counter() {
  const [count, setCount] = useAtom(countAtom); // only re-renders when THIS atom changes
  return <button onClick={() => setCount((c) => c + 1)}>{count}</button>;
}
```
**Why chosen:** Solves the Context "everything re-renders" problem (file 05) at the state-management layer — fine-grained subscriptions by design, good for apps with lots of small independent pieces of shared state.

### Context + useReducer
**What is it?** Combine `useReducer` (for structured state transitions) with `Context` (to make the state/dispatch available without prop drilling) — a "poor man's Redux" using only built-in React.
```js
const CounterContext = createContext();
function CounterProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, { count: 0 });
  return <CounterContext.Provider value={{ state, dispatch }}>{children}</CounterContext.Provider>;
}
```
**Why chosen:** Zero extra dependencies, good enough for small-to-medium apps with a handful of shared state slices. Same performance caveats as plain Context apply (file 05) — not ideal for frequently-updating or large shared state.

---

## 5. Comparison Table (the one to memorize for interviews)

| | Redux (classic) | Redux Toolkit | Zustand | Jotai | Context + useReducer | React Query / TanStack Query |
|---|---|---|---|---|---|---|
| Boilerplate | High | Low | Very low | Very low | Low (built-in) | Low |
| Best for | — (legacy) | Complex client state, need devtools/middleware | Simple-to-medium global client state | Fine-grained atomic state | Small apps, few shared values | **Server state** (API data): caching, refetch, dedup |
| DevTools | Yes | Yes | Optional | Optional | No | Yes (query inspector) |
| Handles caching/refetch of API data? | No (manual) | RTK Query add-on | No | No | No | **Yes — its whole purpose** |
| Learning curve | High | Medium | Low | Low | Low | Medium |
| Extra dependency? | Yes | Yes | Yes (tiny) | Yes (tiny) | No | Yes |

## 6. How to answer "How would you architect state for a new app?" (model senior answer)

"I start by separating **server state** from **client/UI state** — they have different needs. For server state (anything fetched from an API), I use React Query or RTK Query, because caching, refetching, retries, and loading/error states are largely solved problems I don't want to hand-roll. For client state, I keep it as local as possible first — `useState`/`useReducer` in the component that owns it. If multiple distant components genuinely need to share UI state, I reach for Context for low-frequency values (theme, auth), or a lightweight store like Zustand for state that changes often or is read from many unrelated places — because Context re-renders every consumer on any change, while Zustand/Jotai support fine-grained subscriptions. I'd only introduce full Redux Toolkit if the app has genuinely complex, cross-cutting client state logic and the team benefits from its middleware/devtools ecosystem — for most modern apps, that's no longer the default choice it used to be."

## See also
`examples/redux-toolkit-example/` — `store.js`, `counterSlice.js`, `Counter.jsx` showing the modern RTK pattern as a direct upgrade of the old `redux.jsx`/`action.js`/`reducer.js` files.
