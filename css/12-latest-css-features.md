# 12 — Latest CSS Features (2023–2026)

File 10 covered the "modern CSS" wave that's now widely known (custom properties, `:has()`, `:is()`/`:where()`, container queries, `clamp()`/`min()`/`max()`, logical properties). This file covers the **next wave** — features that shipped broadly across browsers roughly 2023–2025 and are increasingly showing up in senior interviews because they solve problems that used to require JavaScript or a preprocessor.

---

## Cascade Layers (`@layer`)

**What is it?**
A way to explicitly group CSS rules into named **layers**, and control which layer wins **regardless of selector specificity**. Layers are compared *before* specificity — a layer declared later always beats an earlier layer, even if the earlier layer's selector is more specific.

```css
/* Declare layer order up front (order matters, not declaration position later) */
@layer reset, base, components, utilities;

@layer reset {
  * { margin: 0; padding: 0; box-sizing: border-box; }
}

@layer base {
  h1 { font-size: 2rem; color: #222; }
}

@layer components {
  .card h1 { font-size: 1.2rem; } /* higher specificity, but LOWER layer than utilities */
}

@layer utilities {
  .text-lg { font-size: 1.5rem; } /* wins over .card h1 above, even with a single class,
                                      because "utilities" is a later layer */
}
```

**Why it was invented / what problem it solves:**
Before layers, the cascade only had specificity + source order to resolve conflicts. This meant CSS architecture (resets → base → components → utilities → overrides) had to be enforced by *convention* and file load order alone — one accidental high-specificity selector in an early file could beat a later "utility" class, breaking the intended override hierarchy. Teams using utility-first CSS (Tailwind) or design systems needed a way to say "no matter how specific this component selector is, my utility classes should always be able to override it." Cascade layers make that a hard, explicit rule instead of a fragile convention.

**Key mental model (interview favorite):**
- Layered CSS is compared **layer-by-layer first**. Whichever named layer comes later in the `@layer` order wins, no matter the specificity of the rule inside it.
- Only *after* layers are equal does specificity get compared as normal.
- Unlayered CSS (regular rules outside any `@layer` block) always wins over **any** layered CSS — it's treated as "the highest layer."

**Real-world usage:** Tailwind CSS v4 uses cascade layers internally (`@layer base, components, utilities`) so utility classes reliably override component classes. Design systems and CSS resets (e.g., `@layer reset`) use it to guarantee resets never accidentally out-specificity a later intentional style.

**How to explain in an interview (simple English):** "Cascade layers let you group CSS into named buckets and decide which bucket wins overall, before specificity is even considered. So I can put my reset in an early layer and my utility classes in a later layer, and the utility class always wins — even a single class over a super-specific selector — because layer order beats specificity."

---

## Native CSS Nesting

**What is it?**
Writing nested selectors **directly in plain CSS**, with the same `&` (parent-reference) syntax Sass popularized — no build step required. Browsers parse and resolve it natively.

```css
.card {
  padding: 16px;
  border: 1px solid #ddd;

  & h2 {              /* compiles conceptually to ".card h2" */
    margin-top: 0;
  }

  &:hover {            /* ".card:hover" */
    border-color: #3498db;
  }

  &.featured {          /* ".card.featured" */
    border-color: gold;
  }

  @media (min-width: 600px) {   /* media queries can nest too */
    padding: 24px;
  }
}
```

**Why it was invented / what problem it solves:**
Nesting was one of the *original* reasons teams adopted Sass/Less (file 09) — writing `.card { &:hover {} }` is far more readable than repeating `.card` and `.card:hover` as separate flat rules. Once nesting became native, one of Sass's biggest selling points stopped requiring a build tool at all. This is part of a larger trend: native CSS has been closing the gap that used to justify a preprocessor.

**Important gotcha (common interview trap):** Without `&`, a nested simple selector is still valid — `.card { h2 { ... } }` behaves like descendant selector `.card h2`. But if the nested selector could be ambiguous with a declaration (rare edge cases), the `&` is required. Also, browser support for *unprefixed* nesting is fairly recent (Chrome 112+, late 2023) — older interview answers assumed you needed Sass for this.

**Real-world usage:** New projects skip Sass purely for nesting/variables now, reaching for a preprocessor only for loops/math/mixins. Component-scoped stylesheets (one file per component) read much more like the DOM tree they style.

**How to explain in an interview:** "Native CSS nesting lets you write `.card { &:hover { ... } }` directly in plain CSS, the same syntax Sass used to require a build step for. It's one of the reasons teams increasingly skip Sass for new projects — you only really need a preprocessor now for things plain CSS still can't do, like loops or math functions."

---

## Scroll-Driven Animations (`animation-timeline`, `scroll-timeline`, `view-timeline`)

**What is it?**
A way to drive a CSS `@keyframes` animation's progress by **scroll position** instead of time — no `scroll` event listener, no `requestAnimationFrame`, no JavaScript at all.

Two flavors:
- **`scroll()` / `scroll-timeline`** — progress tied to how far the *scroll container itself* has scrolled (e.g., a reading progress bar).
- **`view()` / `view-timeline`** — progress tied to how far a *specific element* has scrolled through the visible viewport (e.g., fade/slide an element in as it enters view, and back out as it leaves).

```css
/* Example 1: a "reading progress" bar tied to page scroll */
.progress-bar {
  animation: grow-progress linear;
  animation-timeline: scroll(root); /* driven by the root scroller's scroll position */
}
@keyframes grow-progress {
  from { transform: scaleX(0); }
  to   { transform: scaleX(1); }
}

/* Example 2: fade + slide an element in as it scrolls into view */
.reveal {
  animation: fade-slide-in linear both;
  animation-timeline: view();       /* driven by this element's position in the viewport */
  animation-range: entry 0% cover 40%; /* start animating on entry, done by 40% into view */
}
@keyframes fade-slide-in {
  from { opacity: 0; transform: translateY(40px); }
  to   { opacity: 1; transform: translateY(0); }
}
```

**Why it was invented / what problem it solves:**
"Reveal on scroll" and "parallax-style" effects were previously done with a `scroll` event listener (often throttled/debounced for performance) that measured `window.scrollY` and manually updated styles or `IntersectionObserver` thresholds every frame. That's extra JS, extra main-thread work, and jank risk. Scroll-driven animations let the **browser's compositor** handle it directly — smoother, and it keeps working even while JS is busy or blocked, because it's not tied to the main thread's event loop the same way.

**Real-world usage:** Reading-progress bars at the top of articles, image/section fade-ins on scroll (a huge trend on marketing/landing pages), parallax hero sections, and "sticky number counters" tied to scroll position — all now achievable in pure CSS on supporting browsers.

**How to explain in an interview:** "Scroll-driven animations let a `@keyframes` animation's progress be tied to scroll position instead of time, using `animation-timeline: scroll()` or `view()`. It replaces a lot of what used to require a scroll event listener or IntersectionObserver in JS — like fade-in-on-scroll effects — and it's smoother because the browser can run it off the main thread."

---

## CSS Anchor Positioning (`anchor()`, `position-anchor`)

**What is it?**
A native way to position one element **relative to another arbitrary element** (its "anchor") anywhere in the DOM — not just a direct ancestor — without JavaScript measuring `getBoundingClientRect()`.

```css
/* The anchor element */
.trigger-button {
  anchor-name: --my-anchor;
}

/* The positioned element (e.g., a tooltip or popover) */
.tooltip {
  position: fixed;
  position-anchor: --my-anchor;
  top: anchor(--my-anchor bottom);   /* just below the button */
  left: anchor(--my-anchor left);    /* aligned to the button's left edge */

  /* automatically flip to the other side if there's no room */
  position-try-fallbacks: flip-block;
}
```

**Why it was invented / what problem it solves:**
Tooltips, dropdowns, popovers, and comboboxes have always needed to be positioned relative to a **trigger element that isn't their DOM parent** (they're often rendered at the end of `<body>` to escape `overflow: hidden`/z-index issues). Historically this required a JS positioning library (Popper.js, Floating UI) to measure both elements' positions on every scroll/resize and recalculate. Anchor positioning moves that entire calculation into the browser's native layout engine — including automatically flipping to the other side of the anchor if there isn't enough room (`position-try-fallbacks`), which used to be nontrivial collision-detection logic in JS.

**Real-world usage:** Native `<select>`-style dropdowns, custom tooltips, popovers (often paired with the HTML `popover` attribute), and context menus that need to "hug" a button or icon anywhere on the page without a JS positioning library.

**How to explain in an interview:** "Anchor positioning lets you say 'position this element relative to that other element,' even if they're not related in the DOM — like a tooltip anchored to a button rendered elsewhere in the tree. Before this, you needed a JS library like Popper or Floating UI to calculate that position on every scroll and resize. It's brand new (2024–2025), currently strongest in Chromium browsers."

---

## `@property` (Typed / Registered Custom Properties)

**What is it?**
A way to formally **register** a custom property with a specific syntax type, an initial value, and whether it inherits — turning a plain `--variable` (which the browser treats as an opaque string) into a properly typed value the browser understands well enough to **animate/interpolate**.

```css
@property --progress {
  syntax: "<percentage>";   /* tells the browser this is a percentage, not just text */
  inherits: false;
  initial-value: 0%;
}

.bar {
  --progress: 0%;
  background: conic-gradient(#3498db var(--progress), #eee 0);
  transition: --progress 0.6s ease; /* THIS is what plain --vars can't do */
}

.bar:hover {
  --progress: 75%;
}
```

**Why it was invented / what problem it solves:**
Plain `--variable: 50%` is just a string token to the browser — it has no concept of "this is a number/percentage/color that can be smoothly interpolated between two values." That's why `transition: --my-var 0.3s` silently does nothing useful on an unregistered custom property; the browser can't compute in-between values for something it doesn't know the type of. `@property` fixes this by declaring a `syntax` (a real CSS value type), which unlocks smooth animation/transition of custom properties — something previously only possible by animating a *real* CSS property indirectly (like animating a gradient's stop position via `background-position` tricks) or using JavaScript.

**Real-world usage:** Animated circular progress indicators/gauges (via `conic-gradient` + an animatable `--progress`), animated gradient angles, and any component-level design token that needs to be smoothly transitioned rather than jumping instantly.

**How to explain in an interview:** "`@property` lets you register a custom property with a real type — like `<percentage>` or `<color>` — instead of it just being an opaque string. That's the difference: a plain `--var` can't be smoothly transitioned or animated because the browser doesn't know what kind of value it is, but a registered `@property` custom property can, because now the browser knows how to interpolate between two values of that type."

---

## `color-mix()`, Relative Color Syntax, and Wide-Gamut Color (`oklch`/`oklab`)

**What is it?**
Three related color upgrades:
- **`color-mix()`** — mixes two colors by a percentage, natively in CSS, in a chosen color space.
- **Relative color syntax** — derive a new color *from* an existing one by adjusting individual channels (e.g., "take this color but make it 20% lighter").
- **`oklch()`/`oklab()`** — newer, perceptually-uniform, wide-gamut color spaces that produce more predictable lightness/hue adjustments than `hsl()`, and can represent more vivid colors than `sRGB` (the space `rgb()`/`hex` are limited to).

```css
/* color-mix(): blend two colors without a preprocessor function */
.button:hover {
  background: color-mix(in srgb, var(--brand-color) 80%, white 20%);
}

/* Relative color syntax: derive a lighter variant FROM an existing color */
.button:active {
  /* take --brand-color, keep hue/chroma, reduce lightness channel (oklch) */
  background: oklch(from var(--brand-color) calc(l - 0.15) c h);
}

/* oklch(): perceptually uniform lightness -- equal L steps LOOK equally spaced,
   unlike hsl() where equal lightness numbers can look very different per hue */
:root {
  --brand-color: oklch(65% 0.2 250); /* lightness, chroma, hue */
}
```

**Why they were invented / what problem they solve:**
Sass has had color functions (`darken()`, `lighten()`, `mix()`) for years, but they were **compile-time only** — you couldn't darken a color that was itself a runtime CSS variable (e.g., a user's custom brand color picked at runtime). `color-mix()` and relative color syntax bring that capability natively, working on *any* color value, including one set dynamically via JS. Separately, `hsl()`'s lightness channel doesn't match human color *perception* consistently across different hues (e.g., `hsl(60, 100%, 50%)` yellow looks much brighter than `hsl(240, 100%, 50%)` blue at the "same" lightness) — `oklch()` fixes this so that adjusting lightness produces visually consistent results across any hue, and it can access more saturated colors than `sRGB` allows (useful on modern wide-gamut/HDR displays).

**Real-world usage:** Design systems generating hover/active/disabled color variants *from* a single runtime brand color (common in white-label/theming products where the brand color is user-chosen, not known at build time), and design tokens increasingly defined in `oklch()` for more predictable palette generation (Tailwind v4's default palette is defined in `oklch()`).

**How to explain in an interview:** "`color-mix()` and relative color syntax let you blend or derive colors natively in CSS from a runtime value — something Sass's `darken()`/`lighten()` couldn't do because those only worked on values known at build time. `oklch()` is a newer color space where lightness adjustments look visually consistent across every hue, unlike `hsl()`, which is why it's becoming the default for generating design system color scales."

---

## CSS Subgrid

**What is it?**
Lets a **grid item that is itself a grid container** inherit its parent's row/column tracks, instead of defining its own independent grid — so nested content can align to the *outer* grid's lines.

```css
.outer-grid {
  display: grid;
  grid-template-columns: 200px 1fr 1fr;
  gap: 16px;
}

.card {
  grid-column: span 2;
  display: grid;
  grid-template-columns: subgrid;  /* inherits the outer grid's column tracks */
  gap: 16px; /* can differ from the outer gap if needed */
}
```

**Why it was invented / what problem it solves:**
Without subgrid, a nested grid inside a grid item defines its **own independent tracks** — there was no native way to make a card's internal title/body/footer rows line up with a *sibling* card's internal rows across a row of cards (a very common "equal-height aligned sections" design requirement). Developers either hacked it with matched fixed heights, extra wrapper divs, or JavaScript measuring. Subgrid lets the inner grid literally reuse the outer grid's line definitions, so alignment is guaranteed structurally.

**Real-world usage:** Card grids where every card's title, body, and footer need to align horizontally across the row (e.g., a pricing table, a product grid) even though each card's content length varies.

**How to explain in an interview:** "Subgrid lets a nested grid inherit its parent's actual row/column tracks instead of creating its own. It's mainly used for card grids where you need every card's internal sections — title, body, footer — to line up with the cards next to it, which used to require either matching fixed heights or JavaScript."

---

## `text-wrap: balance` / `text-wrap: pretty`

**What is it?**
Two new values for controlling how the browser breaks lines of wrapped text, aimed at making text *look* better without manual `<br>` tags or JS line-measuring:
- `balance` — evens out the number of characters per line so a heading doesn't leave one lonely short word on the last line (best on short blocks: headings, pull quotes).
- `pretty` — applies better line-breaking heuristics to paragraph text to avoid orphans (a single short word alone on the last line) — designed for longer body text, more performance-friendly than `balance` for large text blocks.

```css
h1, h2 {
  text-wrap: balance;   /* headings wrap into visually even lines */
}

p {
  text-wrap: pretty;    /* paragraphs avoid ugly single-word last lines */
}
```

**Why it was invented / what problem it solves:**
Before this, a headline like "The Quick Brown Fox Jumps Over the Lazy Dog" might wrap as three uneven lines with a single word dangling on the last line — a well-known design nitpick that used to be fixed by manually inserting `<br>` tags at specific viewport widths, or via a JS library that measured text and inserted line breaks. `text-wrap` values give the browser's own line-breaking algorithm better goals, purely in CSS.

**Real-world usage:** Marketing headlines, hero sections, and pull quotes almost universally use `text-wrap: balance` now; blog/article body copy increasingly uses `text-wrap: pretty` to avoid single-word orphan lines.

**How to explain in an interview:** "`text-wrap: balance` evens out line lengths for short text like headings, and `text-wrap: pretty` improves line-breaking for longer paragraphs to avoid orphan words on the last line — both replace what used to require manually inserted `<br>` tags or a JS text-measuring library."

---

## `@scope`

**What is it?**
Lets you scope a block of CSS rules to apply **only within a specific DOM subtree**, without needing a build tool (CSS Modules) or a naming convention (BEM) to fake scoping.

```css
@scope (.card) to (.card-footer) {
  /* these rules ONLY apply inside .card, and STOP before .card-footer */
  h2 { color: #3498db; }
  p  { color: #444; }
}
```

- The `(.card)` part is the **scope root** — rules only apply inside it.
- The optional `to (.card-footer)` part is the **scope limit** — rules stop applying once a `.card-footer` boundary is reached, even if still nested inside `.card`. This avoids accidentally styling nested/unrelated components that happen to live inside the same root.

**Why it was invented / what problem it solves:**
BEM (file 09) and CSS Modules exist largely to *simulate* style scoping, either through naming discipline or a build step that rewrites class names. `@scope` provides real scoping natively: rules are contained to a subtree, which also means **lower specificity risk** — a generic selector like `h2` inside a `@scope` block won't leak out and affect every `h2` on the page, and won't fight with an identically-named `h2` rule used inside a *different* component's scope.

**Real-world usage:** Design systems shipping plain CSS (no build step) that still want component-level style isolation, and avoiding style collisions when embedding third-party or user-generated HTML blocks where you don't control every class name.

**How to explain in an interview:** "`@scope` lets you contain a set of CSS rules to a specific subtree of the DOM, natively — no BEM naming convention, no CSS Modules build step. You can even set a lower boundary with `to (...)` so the scoped styles stop before a nested component, which prevents accidental leakage into things that happen to live inside the same container."

---

## View Transitions API — the CSS Side (`::view-transition-old/new`, `view-transition-name`)

**What is it?**
A browser-native way to get **smooth animated transitions** between two DOM states (e.g., page A → page B, or before/after a UI change) by letting the browser automatically screenshot the old and new states and cross-fade/morph between them — the CSS side controls *how* that transition looks.

```css
/* Opt an element into its own named transition so it morphs individually
   instead of being lumped into the generic full-page cross-fade */
.hero-image {
  view-transition-name: hero-image;
}

/* Customize the generated pseudo-elements the browser creates automatically */
::view-transition-old(hero-image),
::view-transition-new(hero-image) {
  animation-duration: 0.4s;
}

::view-transition-old(root) {
  animation: fade-out 0.3s ease both;
}
::view-transition-new(root) {
  animation: fade-in 0.3s ease both;
}
@keyframes fade-out { to { opacity: 0; } }
@keyframes fade-in   { from { opacity: 0; } }
```

The JS side just triggers it:
```js
// Wrap a DOM update in document.startViewTransition() -- the browser
// automatically captures old/new snapshots and animates between them
document.startViewTransition(() => {
  updateDOM(); // e.g., swap page content, or toggle a class
});
```

**Why it was invented / what problem it solves:**
Smooth "shared element" transitions (like a thumbnail image growing into a full detail view, or a full cross-fade between pages) used to require careful manual JS animation of two overlapping elements, or a heavy client-side routing library with built-in transition support (common in SPA frameworks). The View Transitions API moves the *hard part* — capturing before/after visual states and interpolating between them — into the browser itself. CSS then just styles the generated `::view-transition-old/new` pseudo-elements like any other animation target.

**Real-world usage:** Native-feeling SPA route transitions, and (increasingly) full **multi-page app** transitions (MPA cross-document view transitions) — smooth animated navigation between separate full page loads, not just within a JS-routed SPA, is a genuinely new capability this API unlocks.

**How to explain in an interview:** "The View Transitions API lets the browser automatically snapshot the before/after DOM state and generate `::view-transition-old` and `::view-transition-new` pseudo-elements you can animate with normal CSS. It replaces a lot of manual JS-driven transition logic, and it's the first native way to get smooth animated transitions between full page navigations, not just within a single-page app."

---

## `:focus` vs `:focus-visible` vs `:focus-within`

**What is it?**
Three related but distinct focus pseudo-classes, frequently confused in interviews:

| Pseudo-class | Matches | Typical use |
|---|---|---|
| `:focus` | The element itself, whenever it has focus — **including mouse clicks** | Rarely used alone anymore for visible outlines, because it shows a focus ring even on a mouse click |
| `:focus-visible` | The element, **only when the browser decides focus should be visibly indicated** (keyboard/programmatic focus — generally NOT a mouse click on most elements) | The modern default for focus outline styling |
| `:focus-within` | A **parent/ancestor** element, when it or *any descendant* currently has focus | Highlighting an entire form row/fieldset when the input inside it is focused |

```css
/* Old approach -- shows an outline even on mouse clicks, which many found visually noisy */
button:focus { outline: 2px solid blue; }

/* Modern approach -- only shows the outline for keyboard/programmatic focus,
   keeps mouse clicks visually "clean" while still being keyboard-accessible */
button:focus-visible { outline: 2px solid blue; }
button:focus:not(:focus-visible) { outline: none; }

/* :focus-within -- highlight the whole row when the input inside it is focused */
.form-row:focus-within {
  background: #eef6ff;
}
```

**Why `:focus-visible` was invented:** Removing focus outlines entirely (`outline: none`) for aesthetic reasons was a rampant, well-known accessibility anti-pattern — it broke keyboard navigation for sighted keyboard users and screen magnifier users who rely on seeing the focus ring. But designers had a legitimate complaint too: a visible ring after every mouse click looked messy. `:focus-visible` encodes the browser's own heuristic for "does this focus event actually need a visible indicator" (keyboard/programmatic = yes, mouse click on a button = usually no), satisfying both concerns without JS.

**Real-world usage:** Nearly every modern component library (buttons, inputs, cards) uses `:focus-visible` instead of `:focus` for outline styling now. `:focus-within` is used for form field groups, search bars with an icon, and card components that should highlight when any interactive part inside them gets focus.

**How to explain in an interview:** "`:focus` matches focus from any source including a mouse click. `:focus-visible` only matches when the browser thinks focus should be visibly shown — mainly keyboard navigation — which is why it replaced `:focus` for outline styling; it avoids the old 'remove all outlines for looks, break keyboard accessibility' anti-pattern. `:focus-within` is different again — it matches a *parent* element when any descendant inside it has focus, useful for highlighting a whole form row."

---

## `accent-color`

**What is it?**
A single property that recolors the browser's **native** form control UI — checkboxes, radio buttons, range sliders, progress bars — to match a brand color, without replacing the control with custom-built HTML/CSS/JS.

```css
input[type="checkbox"],
input[type="radio"],
input[type="range"] {
  accent-color: #3498db;
}
```

**Why it was invented / what problem it solves:**
Native checkboxes/radios/sliders render with the OS's default blue/gray look, and for years the *only* way to brand-color them was to hide the native control entirely and rebuild it from scratch with custom `<span>`s/pseudo-elements and JS click handling to fake the interaction — a lot of code just to change a color, and easy to get wrong for accessibility (keyboard support, screen reader semantics of the real control get lost). `accent-color` lets you keep the real, fully-accessible native control and just recolor it.

**Real-world usage:** Any product wanting brand-consistent checkboxes/radios/toggles/sliders without rebuilding native form controls from scratch — a one-line fix for a previously multi-file component.

**How to explain in an interview:** "`accent-color` recolors native checkboxes, radios, and range sliders to match your brand color, without needing to rebuild them as custom components. Before this, brand-coloring a checkbox usually meant hiding the real input and faking one with divs and JS — which risked breaking accessibility. `accent-color` keeps the real accessible native control."

---

## `aspect-ratio`

**What is it?**
A property that locks an element's width-to-height ratio, so the browser calculates one dimension from the other automatically.

```css
.video-embed {
  aspect-ratio: 16 / 9;
  width: 100%;   /* height is calculated automatically to maintain 16:9 */
}

img {
  aspect-ratio: 1 / 1;  /* keeps a square box even before the image loads */
  object-fit: cover;     /* crop instead of stretch/distort */
}
```

**Why it was invented / what problem it solves:**
Before `aspect-ratio`, maintaining a ratio (e.g., a 16:9 video embed area, or a square avatar) required the "padding-top percentage hack" — an empty pseudo-element or wrapper with `padding-top: 56.25%` (for 16:9), exploiting the fact that percentage padding-top is calculated from the *width*. It worked but was unintuitive and hard to read. `aspect-ratio` also solves a real performance/UX problem: images without a defined size cause **layout shift** as they load (a Core Web Vitals metric, Cumulative Layout Shift) — reserving space via `aspect-ratio` before the image loads prevents that jump.

**Real-world usage:** Video/iframe embeds, image placeholders/skeletons that reserve space before load (directly improving CLS scores), and consistent avatar/thumbnail boxes across a grid.

**How to explain in an interview:** "`aspect-ratio` locks a width-to-height ratio so the browser computes one dimension from the other. It replaces the old 'padding-top percentage hack' for maintaining ratios like 16:9 video embeds, and it also helps Cumulative Layout Shift scores by reserving image space before the image actually loads."

---

## Quick Summary Table

| Feature | One-liner |
|---|---|
| `@layer` (cascade layers) | Named layers resolve cascade conflicts before specificity — later layer always wins |
| Native CSS nesting | Sass-style `&` nesting directly in plain CSS, no build step |
| Scroll-driven animations (`animation-timeline`) | Ties `@keyframes` progress to scroll position instead of time — no JS scroll listener |
| Anchor positioning (`anchor()`) | Position an element relative to any other element in the DOM, no JS positioning library |
| `@property` | Registers a typed custom property so it can be smoothly animated/transitioned |
| `color-mix()` / relative color / `oklch()` | Mix/derive colors from runtime values natively; `oklch()` gives perceptually consistent lightness |
| Subgrid | A nested grid inherits the parent grid's actual row/column tracks |
| `text-wrap: balance`/`pretty` | Browser-native better line-breaking for headings/paragraphs, no manual `<br>` |
| `@scope` | Native subtree-scoped CSS, no BEM convention or CSS Modules build step needed |
| View Transitions API | Browser auto-captures before/after DOM snapshots and animates between them via `::view-transition-old/new` |
| `:focus-visible` vs `:focus-within` | `:focus-visible` = keyboard-only focus ring; `:focus-within` = style a parent when any descendant is focused |
| `accent-color` | Recolors native checkboxes/radios/sliders without rebuilding them as custom components |
| `aspect-ratio` | Locks width:height ratio; replaces the old padding-top percentage hack, helps CLS |
