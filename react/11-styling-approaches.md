# 11 — Styling Approaches

## 1. His old approaches (still valid, still common today)

### Inline styles
```jsx
<div style={{ backgroundColor: 'red' }}>inline styles</div>
```
A plain JS object, camelCase properties. Good for one-off, dynamic, computed styles (e.g., a position calculated from state). Bad for anything reusable — no pseudo-classes (`:hover`), no media queries, no selector reuse, and it always wins CSS specificity battles, which can surprise you.

### Plain CSS file
```jsx
import './index.css';
<div className="error-icon">error text</div>
```
```css
.error-icon { color: red; border: 1px solid red; }
```
Simple, familiar, but **global scope** — a class name like `.error-icon` can clash with an unrelated `.error-icon` defined elsewhere in a large codebase, since CSS has no built-in module boundaries.

### CSS Modules
```jsx
import styles from './index.module.css';
<div className={styles.errorIcon}>error text</div>
```
```css
/* index.module.css */
.errorIcon { color: green; border: green; }
```
**Why invented:** Solves the global-scope collision problem above. The build tool automatically renames `.errorIcon` to something unique per file at build time (e.g., `_errorIcon_a1b2c`), so styles are effectively scoped to the component/file that imports them, while still being plain, familiar CSS syntax.

---

## 2. CSS-in-JS: styled-components (also in his old notes)

```jsx
import styled from 'styled-components';

const Flex = styled.div`
  display: flex;
  justify-content: center;
  color: ${props => props.color};
`;

<Flex color="red">styled components</Flex>
```

**Why invented:** Lets you write actual CSS syntax but scoped automatically per component (no class name collisions at all, similar guarantee to CSS Modules but without needing a separate `.css` file), AND lets styles be dynamic based on props/theme directly in the same file as the component logic — one file, one concern.

**Trade-offs (important for a senior "how do you choose" answer):**
- Runtime cost: traditional CSS-in-JS libraries (styled-components, Emotion) inject `<style>` tags and compute class names **at runtime** in the browser — this adds JS execution overhead and can hurt performance on large pages compared to plain static CSS. This became a bigger criticism as the ecosystem matured, and directly motivated the rise of "zero-runtime" CSS-in-JS approaches (e.g., vanilla-extract, or compiling styled-components at build time) and the renewed popularity of utility-first CSS (Tailwind, below).
- Extra bundle size (the library itself).
- Great DX: colocation of styles and logic, dynamic theming via props/`ThemeProvider`, no separate CSS files to keep in sync.
- Server-side rendering requires extra setup (to extract critical CSS) — adds complexity in SSR frameworks.

---

## 3. Tailwind CSS (utility-first) — the big 2020s shift

**What is it?** Instead of writing custom CSS classes/selectors, you compose pre-defined utility classes directly in markup:
```jsx
<div className="flex justify-center items-center text-red-500 border border-red-500 rounded p-2">
  error text
</div>
```

**Why invented:** Traditional CSS (even with Modules/CSS-in-JS) still requires you to *invent and maintain* a naming/organization scheme (BEM, SMACSS, etc.) and constantly context-switch between markup and stylesheet files. Tailwind's bet: with a comprehensive, consistent utility set, you almost never need custom CSS at all, styling stays colocated with markup (similar colocation benefit as CSS-in-JS but with zero runtime cost — it's all compiled/purged to a static CSS file at build time), and a design system's constraints (spacing scale, color palette) are enforced by the utility classes themselves.

**Trade-offs:**
- Markup can get visually noisy/verbose (`className` strings can get long) — mitigated with component extraction or tools like `clsx`/`cva` for variant management.
- Learning curve: memorizing/looking up utility names.
- No runtime cost — compiles to static CSS via a build step (PurgeCSS-style tree-shaking removes unused utilities), which is genuinely fast in production, unlike traditional CSS-in-JS.
- Very fast to prototype with once the team knows the utility vocabulary; strong ecosystem (shadcn/ui, Headless UI) built on top of it, which is a big reason for its dominance in new projects today.

---

## 4. Comparison Table — "How do you choose a styling strategy?" (senior interview answer material)

| Approach | Scoping | Runtime cost | Dynamic styling | Colocation with component | Best for |
|---|---|---|---|---|---|
| Inline styles | N/A (per-element) | None | Excellent (pure JS) | Perfect | One-off computed styles |
| Plain CSS | Global (collision risk) | None | Poor (needs class toggling) | Poor (separate file) | Small apps, quick prototypes |
| CSS Modules | File-scoped (auto) | None | OK (className switching) | OK (separate file, but scoped) | Teams wanting plain CSS + safety, no extra runtime |
| styled-components / Emotion | Component-scoped (auto) | Some (runtime style injection) | Excellent (props → CSS) | Excellent | Component libraries needing rich dynamic theming, teams OK with the runtime trade-off |
| Tailwind | N/A (utility classes, no collisions by design) | None (compiled away) | Good (conditional class composition) | Excellent (in markup) | Fast-moving teams, design-system-driven products, performance-sensitive apps |

## How to explain "how do you choose a styling strategy" in an interview (model answer)

"It depends on team size, performance budget, and how dynamic the styling needs to be. For a small app or quick prototype, plain CSS or CSS Modules is enough and has zero runtime cost. If the app needs heavy dynamic theming and the team values colocating styles with component logic, styled-components/Emotion is productive, but I'd flag the runtime cost on large pages. For most production apps today, especially ones built for performance and consistency, I lean toward Tailwind — it has no runtime cost since it compiles to static CSS, keeps styling colocated with markup, and its utility classes act as a built-in design system, though it does have a learning curve and can make markup verbose without discipline. I wouldn't pick just one dogmatically — I'd match the tool to the team's constraints."

---

## 5. Animation in React — Framer Motion (awareness level)

**What is it?**
Plain CSS transitions/`@keyframes` handle simple hover/fade effects fine, but they can't easily express things like "animate a value that depends on component state," "animate a component smoothly on mount AND unmount" (CSS alone can't animate something that's about to be removed from the DOM), or "drag this element and spring it back." **Framer Motion** is the dominant animation library in the React ecosystem that fills that gap with a declarative, component-based API:

```jsx
import { motion, AnimatePresence } from 'framer-motion';

function Toast({ message, onClose }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}   // starting state
      animate={{ opacity: 1, y: 0 }}     // state to animate to
      exit={{ opacity: 0, y: -20 }}      // state to animate to on unmount (needs AnimatePresence)
      transition={{ duration: 0.3 }}
      onClick={onClose}
    >
      {message}
    </motion.div>
  );
}

// AnimatePresence lets `exit` animations run BEFORE React actually removes
// the component from the DOM — something plain CSS/React alone can't do,
// since React normally unmounts a component (and its DOM node) immediately.
function ToastList({ toasts }) {
  return (
    <AnimatePresence>
      {toasts.map((t) => (
        <Toast key={t.id} message={t.message} onClose={t.onClose} />
      ))}
    </AnimatePresence>
  );
}
```

**Why was it invented / what problem does it solve?**
Before libraries like this, "animate on unmount" required manual hacks — delaying the actual state removal with a `setTimeout` matching the CSS transition duration, tracking an `isExiting` flag, and hoping the timing didn't drift. Framer Motion (and its predecessors like React Transition Group / React Spring) made animation **declarative and state-driven**, the same way React made UI declarative: you describe the `initial`/`animate`/`exit` states, and the library figures out the actual transition, handles interruptions (e.g., re-triggering an animation mid-flight) gracefully via physics-based springs instead of only fixed-duration easing curves, and — critically — solves the "animate something that's leaving the DOM" problem via `AnimatePresence`.

**Real-world / real-time usage:**
- Toast/notification enter-exit animations, modal/drawer open-close transitions, animated route transitions (fading between pages), drag-to-reorder lists, and "layout animations" (`layout` prop — automatically animates an element smoothly to its new position/size when surrounding layout changes, e.g., a list item shrinking when a sibling is deleted, without manually computing before/after positions).
- Common in marketing sites and product UIs that want polished micro-interactions (staggered list reveals, hover/tap scale effects via `whileHover`/`whileTap`) without hand-rolling CSS keyframes for every case.
- Awareness of `react-spring` (physics-based, slightly lower-level) and the CSS-only alternative (`transition`/`@keyframes`, still the right choice for simple hover/focus states with no mount/unmount concerns) rounds out a senior answer — the point isn't memorizing Framer Motion's full API, it's knowing **when reaching for an animation library is justified** versus over-engineering a simple CSS hover effect.

**How to explain in an interview (simple English):**
"For simple, static transitions — hover states, a color fade — plain CSS transitions are enough and have zero JS cost. Where CSS falls short is animating something that's leaving the DOM, or animating a value driven by component state/gestures like drag. Framer Motion solves that declaratively: you give it `initial`/`animate`/`exit` states and it handles the actual transition, and `AnimatePresence` specifically delays a component's removal from the DOM just long enough for its exit animation to finish. I'd reach for it for polished enter/exit and layout animations, but wouldn't pull in an animation library just for a basic hover effect that CSS already handles for free."

## See also
- Runnable enter/exit + layout animation demo in `examples/framer-motion-example.jsx`.
