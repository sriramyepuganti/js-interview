# 12 — Testing React Applications

## 1. Why testing matters (beyond "it's good practice")

**What is it?** Automated tests that verify your components behave correctly, run as part of CI, and catch regressions before they reach production.

**Why it matters for senior engineers specifically:** At senior level, you're often responsible for a codebase's long-term health, not just shipping one feature. Tests are what let a team **refactor with confidence** — change implementation details without fear of silently breaking behavior — and catch regressions automatically instead of relying on manual QA or, worse, users finding bugs in production.

---

## 2. React Testing Library (RTL) Philosophy: "Test behavior, not implementation"

**What is it?** The dominant testing library for React components, built around one guiding principle stated directly in its docs: *"The more your tests resemble the way your software is used, the more confidence they can give you."*

**Why it was invented:** Its predecessor, Enzyme, encouraged testing **implementation details** — e.g., asserting a component's internal state (`wrapper.state('count')`) or calling internal methods directly (`wrapper.instance().handleClick()`). This is fragile: refactoring a component (switching from class to function, renaming internal state) breaks tests **even though user-facing behavior never changed** — false negatives that erode trust in the test suite and slow teams down. RTL deliberately makes it hard/awkward to reach into internals, and instead encourages querying the DOM the way a **real user** would — by visible text, labels, roles — and interacting via realistic events.

```jsx
// Enzyme-style (implementation detail testing) — AVOID this mindset
expect(wrapper.state('count')).toBe(1);
wrapper.instance().increment();

// RTL-style (behavior testing) — what actually matters to a user
render(<Counter />);
await userEvent.click(screen.getByRole('button', { name: /increment/i }));
expect(screen.getByText('Count: 1')).toBeInTheDocument();
```

---

## 3. Unit vs Integration vs E2E

| Level | What it tests | Tools | Speed | Example |
|---|---|---|---|---|
| Unit | One function/hook/component in isolation | Jest/Vitest + RTL, `renderHook` | Fast | Does `useDebounce` delay updates correctly? |
| Integration | Multiple components/hooks working together, as a user would experience a feature | RTL + mocked network layer (MSW) | Medium | Does submitting the login form navigate to the dashboard? |
| E2E (End-to-End) | The whole real app, in a real browser, against a real (or staging) backend | Playwright, Cypress | Slow | Can a user sign up, log in, and complete a checkout? |

**Senior-level guidance (often asked):** Follow the "testing trophy/pyramid" idea — write **mostly integration tests** with RTL (they give the most confidence per unit of effort for typical UI features), a healthy number of focused unit tests for tricky pure logic (custom hooks, utility functions, reducers), and a small number of E2E tests for the most critical user flows (checkout, auth) since they're slow and more brittle to maintain.

---

## 4. Mocking API calls

**Why:** Tests should be fast, deterministic, and not depend on a real network/backend being available.

### Mock Service Worker (MSW) — the modern standard
```js
// Intercepts actual fetch/XHR calls at the network level, so component code
// doesn't need ANY special test-only branching — it calls fetch() normally.
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';

const server = setupServer(
  http.get('/api/user', () => HttpResponse.json({ name: 'Sriramsai' }))
);

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

test('shows user name after fetch', async () => {
  render(<Profile userId={1} />);
  expect(await screen.findByText('Sriramsai')).toBeInTheDocument(); // findBy* waits for async UI
});
```
**Why MSW over jest.mock('fetch')-style mocking:** it mocks at the network boundary rather than replacing your fetch calls with fake implementations, so the component code under test is identical to production code — you're testing real request/response handling, just against fake data.

---

## 5. Common Patterns Cheat Sheet

| API | Purpose |
|---|---|
| `render(<Component />)` | Mounts the component into a test DOM (jsdom) |
| `screen.getByRole/getByText/getByLabelText` | Query the rendered output the way a user/assistive tech would |
| `screen.queryBy...` | Like `getBy` but returns `null` instead of throwing — use when asserting something is **absent** |
| `screen.findBy...` | Async version — waits for the element to appear (for async UI updates) |
| `userEvent.click/type/...` | Simulates realistic user interaction (preferred over the older, lower-level `fireEvent`) |
| `fireEvent` | Lower-level DOM event dispatch — still used, but `userEvent` better simulates real browser behavior (e.g., focus, full key sequences) |
| `waitFor(() => expect(...))` | Waits/retries an assertion until it passes or times out — for async state changes not tied to a specific new element appearing |

```jsx
test('increments count on click', async () => {
  render(<Counter />);
  const button = screen.getByRole('button', { name: /increment/i });
  await userEvent.click(button);
  expect(screen.getByText('Count: 1')).toBeInTheDocument();
});
```

---

## 6. What NOT to test (senior-level judgment)

- Don't test third-party library internals (React Router, React Query) — trust they work; test how *your* code uses them.
- Don't assert on CSS class names or DOM structure unless it's directly meaningful to the user (e.g., `aria-invalid` on a form field matters; an internal `div` wrapper's class name usually doesn't).
- Don't over-mock to the point the test no longer resembles real usage — e.g., mocking a custom hook entirely so the integration between component and hook is never actually verified.

## How to explain testing philosophy in an interview (simple English)

"I follow the React Testing Library philosophy: test what the user sees and does, not internal implementation details like component state or private methods — that way tests survive refactors and only fail when actual behavior breaks. I lean toward integration tests for most features since they give the best confidence-to-effort ratio, use focused unit tests for tricky pure logic like custom hooks or reducers, and reserve a small number of slow E2E tests for critical flows like checkout or auth. For API calls, I mock at the network level with MSW so the component code under test is identical to production code, not a special test-only path."
