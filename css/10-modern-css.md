# 10 — Modern CSS Features

## CSS Custom Properties (Variables)

**What is it?**
Native CSS variables, declared with `--name: value;` and read with `var(--name)`. Unlike Sass variables, they live in the actual DOM/CSSOM and are resolved by the **browser at runtime**, not by a build tool ahead of time.

```css
:root {
  --primary-color: #3498db;
  --spacing-md: 16px;
}

.button {
  background: var(--primary-color);
  padding: var(--spacing-md);
}
```

**Why they were invented / what problem they solve:**
Sass variables (file 09) are baked into the compiled CSS permanently — they can't respond to anything happening in the browser. Teams needed a way to change values **live**, without recompiling: dark mode toggles, user-customizable themes, JS-driven dynamic styling, and responsive value changes inside media queries. Native CSS variables solve this because they can be:
- Reassigned at any point in the cascade (e.g., a different value inside a media query, or scoped to a specific component/class).
- Changed live via JavaScript (`element.style.setProperty('--primary-color', 'red')`) without touching a stylesheet or triggering a rebuild.
- Scoped like normal CSS — cascade and inherit, so a variable set on `.dark-theme` only affects things inside it.

**Why they're better than preprocessor variables specifically for runtime theming:**
```css
:root {
  --bg: white;
  --text: black;
}
[data-theme="dark"] {
  --bg: #111;
  --text: #eee;
}
body {
  background: var(--bg);
  color: var(--text);
}
```
```js
// toggle theme instantly, no CSS rebuild, no page reload
document.documentElement.setAttribute('data-theme', 'dark');
```
A Sass variable could never do this — `$bg` is gone after compilation, replaced by a fixed value in the output CSS. This single capability (live runtime reassignment) is *the* core reason CSS variables are considered a strict upgrade over Sass variables for theming use cases, even though Sass still has other useful features (mixins, loops, math functions) that plain CSS custom properties don't replace.

**Real-world usage:** Every modern light/dark mode toggle, white-label/multi-brand theming systems, and design token systems (Material Design 3, Tailwind's CSS variable mode) use custom properties as the underlying mechanism.

**How to explain in an interview (simple English):**
"CSS custom properties are like variables, but the browser resolves them live, not at build time like Sass. That means you can change a variable's value at runtime — like flipping a `data-theme` attribute to switch from light to dark — without rebuilding any CSS. Sass variables get hardcoded into the output CSS forever, so they can't do that."

---

## `:has()` — the "Parent Selector"

**What is it?**
A pseudo-class that selects an element **if it contains** something matching the given selector — effectively letting you style a parent based on its children/descendants, or a sibling based on a following sibling.

```css
/* Style a card differently if it contains an image */
.card:has(img) {
  padding: 0;
}

/* Style a form field's label red if its input is invalid */
label:has(+ input:invalid) {
  color: red;
}

/* Highlight a list item that contains a checked checkbox */
li:has(input:checked) {
  background: #eafaf1;
}
```

**Why it was invented:** For decades, CSS could only select based on ancestors → descendants (or siblings that come *after*), never "a parent based on what's inside it," or "an element based on a sibling that comes *before* it." That gap forced developers to add extra classes via JavaScript just to react to a child's state. `:has()` (sometimes called the "parent selector," finally shipped broadly ~2023) closes this gap natively.

**Real-world usage:** Form validation styling (style a label/wrapper red when its input is `:invalid`), styling a card differently depending on whether it has an image, and conditionally styling based on sibling checkbox/radio state — all without any JavaScript.

**How to explain in an interview:** "`:has()` lets you select a parent or earlier sibling based on what's inside it or after it — something CSS couldn't do before. Like styling a form label red only if the input next to it is invalid, without needing JavaScript to toggle a class."

---

## `:is()` and `:where()`

**What is it?**
Both let you group multiple selectors into one compact list, avoiding repetition.

```css
/* instead of writing this: */
header h1, header h2, header h3,
footer h1, footer h2, footer h3 { margin: 0; }

/* write this: */
:is(header, footer) :is(h1, h2, h3) { margin: 0; }
```

**Key difference (interview favorite):**
- `:is()` — takes the specificity of its **most specific** argument.
- `:where()` — **always has zero specificity**, no matter what's inside it.

```css
:where(.card, .panel) h2 { color: black; }  /* specificity = just "h2" → (0,0,0,1), easy to override later */
:is(.card, .panel) h2 { color: black; }     /* specificity = ".card h2" → (0,0,1,1), harder to override */
```

**Why they were invented:** Shortens repetitive selector lists (readability, smaller files), and `:where()` specifically was added so library/framework authors could ship base styles that are *trivially overridable* by any consumer's own single-class selector, instead of accidentally shipping high-specificity defaults that fight user overrides.

**How to explain in an interview:** "`:is()` and `:where()` both group selectors to avoid repetition, but `:where()` always contributes zero specificity, which makes it perfect for base/reset styles that should be easy for anyone to override later."

---

## Container Queries

Covered in depth in file 07 (Responsive Design) — quick recap here since it's a "modern CSS" highlight:

```css
.sidebar { container-type: inline-size; }
@container (min-width: 300px) {
  .widget { flex-direction: row; }
}
```
**One-liner:** Lets a component respond to its *container's* size instead of the whole viewport — critical for truly reusable components.

---

## `calc()` — Native CSS Math

**What is it?**
A function that lets you write a math expression directly as a CSS value, and — critically — **mix different units in the same expression** (something plain CSS values can never do on their own).

```css
.sidebar-content {
  width: calc(100% - 250px); /* full width, minus a fixed 250px sidebar -- mixes % and px */
}

.section {
  padding-top: calc(2rem + 2vh); /* mixes rem (fixed, root-relative) with vh (viewport-relative) */
}

:root { --gap: 16px; }
.grid { gap: calc(var(--gap) * 2); } /* works with custom properties too */
```

Supports `+`, `-`, `*`, `/`, and can be nested inside other functions (`clamp()`, `min()`, `max()`, or another `calc()`).

**Why it was invented / what problem it solves:**
Before `calc()`, mixing unit types was simply impossible in plain CSS — you couldn't say "100% of my parent's width, minus a fixed 250px sidebar" in one declaration; you had to either hardcode a percentage that happened to look right at one screen size, wrap things in extra container divs to fake the subtraction, or reach for JavaScript to measure and set an inline style. `calc()` (CSS3, broadly supported since ~2013) lets the browser do that arithmetic natively, live, recalculating whenever the referenced values (viewport size, a custom property) change.

**Real-world usage:** Fixed-width sidebar + fluid main content layouts (`calc(100% - 250px)`), sticky headers offsetting scroll targets (`scroll-margin-top: calc(var(--header-height) + 16px)`), and any spacing/sizing value that needs to combine a fixed and a relative unit in one number. It's also the *building block* underneath `clamp()`/`min()`/`max()` below — those functions are really just ergonomic wrappers for common `calc()`-style patterns.

**How to explain in an interview:** "`calc()` lets you do math directly in a CSS value, and the key reason it matters is it can mix unit types that otherwise couldn't combine — like `100% - 250px`, which you can't express any other way in plain CSS. It's evaluated live by the browser, so it stays correct if the referenced values change, like a viewport unit or a custom property."

---

## `clamp()`, `min()`, `max()`

**What is it?**
Native CSS math functions for picking values dynamically, built on the same underlying math engine as `calc()`.
- `min(a, b)` — picks the smaller of the two (useful as a "don't exceed" cap).
- `max(a, b)` — picks the larger of the two (useful as a "don't go below" floor).
- `clamp(min, preferred, max)` — combines both: a fluid preferred value, capped between a floor and ceiling.

```css
.container {
  width: min(90%, 1200px); /* fluid, but never wider than 1200px */
}
h1 {
  font-size: clamp(1.5rem, 5vw, 3rem); /* fluid typography, floor and ceiling */
}
```

**Why invented:** Previously this required multiple media query breakpoints just to cap/floor a single value. These functions let the browser compute it continuously, with one line, no breakpoints.

---

## Logical Properties

**What is it?**
Properties named by **flow direction** (`inline`/`block`) instead of fixed physical direction (`left`/`right`/`top`/`bottom`) — they automatically adapt to the text direction/writing mode of the page.

```css
/* Physical (old way) — breaks in RTL languages like Arabic/Hebrew */
.card { margin-left: 16px; padding-right: 8px; }

/* Logical (modern way) — automatically flips for RTL */
.card { margin-inline-start: 16px; padding-inline-end: 8px; }
```

| Physical | Logical equivalent |
|---|---|
| `width` | `inline-size` |
| `height` | `block-size` |
| `margin-left` / `margin-right` | `margin-inline-start` / `margin-inline-end` |
| `margin-top` / `margin-bottom` | `margin-block-start` / `margin-block-end` |
| `left` / `right` (positioning) | `inset-inline-start` / `inset-inline-end` |

**Why they were invented:** Global/multilingual products need to support right-to-left (RTL) languages (Arabic, Hebrew). With physical properties, every `margin-left` has to be manually mirrored to `margin-right` for RTL layouts (often via a whole separate stylesheet or `[dir="rtl"]` overrides). Logical properties encode "start" and "end" relative to the reading direction, so the same CSS automatically mirrors correctly — no duplicate RTL stylesheet needed.

**Real-world usage:** Any internationalized product (most large-scale consumer apps) uses logical properties to support RTL locales without maintaining a parallel mirrored stylesheet.

**How to explain in an interview:** "Logical properties use terms like `inline-start`/`inline-end` instead of `left`/`right`, so they automatically adapt to right-to-left languages. Instead of maintaining a separate RTL override stylesheet, the same CSS just works in both directions."

---

## Quick Summary Table

| Feature | One-liner |
|---|---|
| CSS custom properties | Runtime variables — can change live, unlike Sass variables |
| `:has()` | Style a parent/earlier sibling based on its contents — the "parent selector" |
| `:is()` | Groups selectors; takes specificity of its most specific argument |
| `:where()` | Groups selectors with zero specificity — great for overridable base styles |
| Container queries | Component responds to its container's size, not the viewport |
| `calc()` | Native math in CSS values; the only way to mix unit types (`100% - 250px`) |
| `clamp()`/`min()`/`max()` | Fluid values with floor/ceiling, no breakpoints needed |
| Logical properties | Direction-aware (`inline-start`/`block-end`) — auto-adapts for RTL languages |
