# 10 — Client-Side Routing

## 1. Why do SPAs need routing at all?

**What is it?** In a traditional multi-page website, navigating to `/about` means the browser makes a fresh HTTP request and the server returns a whole new HTML page. In a Single Page Application (SPA), there's only **one** actual HTML page ever loaded — "routing" is the JS-side illusion of navigating between "pages" by swapping which components render, based on the current URL, **without a full page reload**.

**Why was this invented?** Full page reloads throw away all JS state and re-download/re-parse the whole app shell on every navigation — slow and jarring. Client-side routing keeps the app "alive" in memory (state, WebSocket connections, etc. persist) and only swaps the visible components, using the browser's History API (`pushState`/`replaceState`) to update the URL bar without triggering a real navigation — this is exactly what "browserHistory" in his old notes refers to.

**Real-world usage:** Every modern SPA — dashboards, admin panels, e-commerce sites, social apps.

---

## 2. His old pattern (React Router v5-era) vs modern React Router (v6.4+)

His old `router.jsx` used the v5 API:
```jsx
import { BrowserRouter as Router, Switch, Route, Link, Redirect } from 'react-router-dom';

<Router>
  <Switch>
    <Route exact path="/class"><ClassComponent /></Route>
    <Route path="/hooks"><Hooks initialCount={0} /></Route>
    <Route exact path="/" component={RouterLinks} />
  </Switch>
</Router>
```
Plus a hand-rolled auth guard (`ProtectedRoute`) wrapping `<Route>` with conditional rendering/redirect logic.

**What changed by v6 (and v6.4+ "data APIs"), and why:**

| Old (v5) | Modern (v6+) | Why the change |
|---|---|---|
| `<Switch>` | `<Routes>` | Clearer name; also gets smarter automatic "best match" route ranking instead of first-match-wins |
| `component={X}` / `render={() => <X/>}` props on `<Route>` | `element={<X />}` | Simpler mental model — just pass JSX, no special-cased props |
| Manually nested `<Route>` + manual layout composition | **Nested routes** render into `<Outlet />` automatically | Cleaner layout sharing — parent route renders shared UI once, children fill in the `<Outlet />` slot |
| No built-in data loading | **`loader`**/`action` functions per route (Data APIs, v6.4+) | Route-level data fetching, so data starts loading *before* the component even renders — eliminates loading spinners nested inside components for the common case |
| Manual `ProtectedRoute` wrapper doing conditional render+redirect | Same idea still used, but often combined with a `loader` that redirects via `redirect()` before rendering starts | Cleaner: auth check can happen at the routing layer, before any UI attempts to render |
| `useHistory()` | `useNavigate()` | Renamed/refactored API surface |
| N/A | `useParams()`, `useLoaderData()`, `useSearchParams()` | New hooks for reading route params/data/query strings |

### Modern example (equivalent to his old app, updated):
```jsx
import { createBrowserRouter, RouterProvider, Outlet, Link, useNavigate, useParams, redirect } from 'react-router-dom';

function Layout() {
  return (
    <>
      <nav>
        <Link to="/hooks">Hooks</Link> | <Link to="/redux">Redux</Link>
      </nav>
      <Outlet /> {/* matched child route renders here */}
    </>
  );
}

const router = createBrowserRouter([
  {
    path: '/',
    element: <Layout />,
    children: [
      { path: 'hooks', element: <HooksPage /> },
      { path: 'user/:id', element: <UserPage />, loader: ({ params }) => fetchUser(params.id) },
      {
        path: 'dashboard',
        loader: () => (isAuthenticated() ? null : redirect('/login')), // auth guard, at the route layer
        element: <Dashboard />,
      },
    ],
  },
]);

function App() { return <RouterProvider router={router} />; }

// Inside UserPage:
function UserPage() {
  const user = useLoaderData();   // data already loaded before this component rendered
  const { id } = useParams();     // route param, e.g. "user/42" -> id === "42"
  const navigate = useNavigate();
  return <button onClick={() => navigate('/hooks')}>{user.name} — go to hooks</button>;
}
```

**Why `loader`/`action` (Data APIs) matter:** They move data-fetching out of `useEffect`-inside-component and into the router itself, so:
- Data starts fetching **as soon as navigation starts**, in parallel with rendering the new route's code — instead of "render component → then `useEffect` fires → then fetch starts" (a wasted round trip called a "fetch-on-render waterfall").
- `action` functions handle form submissions/mutations (e.g., a "create post" form) with built-in pending states and automatic revalidation of `loader` data afterward — reducing manual `useState` for submission status.

**How to explain the evolution in an interview:** "React Router evolved from purely component-driven routing — where each route just renders a component and you fetch data yourself inside it — to a data-aware router. From v6.4 onward, routes can define `loader` and `action` functions, so data fetching and mutations are tied to the route itself and start before/alongside rendering, not after. This removes a lot of manual loading-state juggling and fixes the classic waterfall where you render first, then discover you need to fetch."

---

## 3. Nested Routes & Layouts

**What is it?** Routes can be nested so a parent route renders a shared layout (nav bar, sidebar) once, and matching child routes render into a placeholder (`<Outlet />`) inside that layout — instead of every page re-declaring the nav bar.

```jsx
{
  path: '/app',
  element: <AppShell />, // renders <Sidebar /> + <Outlet />
  children: [
    { path: 'settings', element: <Settings /> },
    { path: 'profile', element: <Profile /> },
  ],
}
```
Navigating between `/app/settings` and `/app/profile` re-renders only what's inside `<Outlet />` — `<AppShell />` (and the sidebar inside it) isn't torn down and rebuilt.

---

## 4. Core Hooks Cheat Sheet

| Hook | Purpose |
|---|---|
| `useNavigate()` | Programmatic navigation (`navigate('/path')`), replaces old `useHistory().push()` |
| `useParams()` | Read dynamic segments of the current URL (`/user/:id` → `{ id }`) |
| `useSearchParams()` | Read/update the `?query=string` part of the URL |
| `useLoaderData()` | Access data returned by that route's `loader` function |
| `useLocation()` | Access the current location object (pathname, search, state) |

## How to explain client-side routing overall, in an interview

"Client-side routing simulates page navigation inside a single-page app by swapping rendered components based on the URL, using the History API instead of triggering full page reloads — this keeps app state alive across navigation and avoids re-downloading the whole app shell. React Router is the standard library for this. Modern React Router (v6.4+) added a data layer — `loader` and `action` functions tied to each route — so data fetching starts as soon as navigation begins instead of after the component renders, avoiding fetch-on-render waterfalls, and nested routes let shared layouts persist across child route changes via `<Outlet />`."
