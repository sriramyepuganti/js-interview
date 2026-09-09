# 08 — Animations and Transitions

## Transitions vs Animations vs Keyframes

**What is it?**
- **`transition`** — smoothly animates a property from its current value to a new value, triggered by a state change (`:hover`, class toggle, etc.). Only goes A → B.
- **`animation` + `@keyframes`** — defines a multi-step sequence (0% → 50% → 100%, etc.) that can run automatically, loop, reverse, and doesn't need a triggering state change.

**Why were they invented?**
Before CSS transitions/animations (pre-2009ish), any smooth visual effect — a fading tooltip, a sliding panel — required JavaScript manually updating styles on a timer (`setInterval`) or using libraries like jQuery's `.animate()`. This was CPU-heavy (JS-driven) and janky. Native CSS transitions/animations moved this work to the browser's rendering engine, which can run it far more efficiently (often on the GPU, see below).

```css
/* Transition — needs a trigger like :hover or a class change */
.button {
  background: steelblue;
  transition: background 0.3s ease, transform 0.2s ease;
}
.button:hover {
  background: darkslateblue;
  transform: translateY(-2px);
}

/* Animation — runs on its own via @keyframes, doesn't need a trigger */
@keyframes spin {
  from { transform: rotate(0deg); }
  to   { transform: rotate(360deg); }
}
.spinner {
  animation: spin 1s linear infinite;
}
```

| | `transition` | `animation` |
|---|---|---|
| Trigger needed? | Yes — a state/class change | No — runs automatically on element render |
| Steps | Only start → end (2 states) | Any number of steps via `@keyframes` (0%, 25%, 50%...) |
| Looping | No (fires once per trigger) | Yes, via `animation-iteration-count: infinite` |
| Typical use | Hover effects, focus states, toggles | Loading spinners, attention-grabbers, entrance effects |

**Real-world usage:**
- Transitions: button hover states, dropdown open/close fades, form input focus glow, toggle switches.
- Animations: loading spinners, skeleton screen shimmer, pulsing "new" badges, page-load entrance animations.

**How to explain in an interview (simple English):**
"Transition is for animating between two states — like a button's normal color and its hover color — and it needs something to trigger it, like `:hover`. Animation with `@keyframes` is for multi-step sequences that can run on their own without a trigger, and can loop forever, like a loading spinner."

---

## Key Transition/Animation Properties

```css
.el {
  transition-property: background, transform; /* which properties animate */
  transition-duration: 0.3s;
  transition-timing-function: ease-in-out;     /* speed curve */
  transition-delay: 0.1s;
  /* shorthand: */
  transition: background 0.3s ease-in-out 0.1s;
}

.el2 {
  animation-name: spin;
  animation-duration: 1s;
  animation-timing-function: linear;
  animation-iteration-count: infinite;
  animation-direction: alternate;  /* reverses every other cycle */
  animation-fill-mode: forwards;   /* keeps the last keyframe's styles after finishing */
  /* shorthand: */
  animation: spin 1s linear infinite alternate forwards;
}
```

Common timing functions: `linear` (constant speed), `ease`/`ease-in-out` (natural acceleration/deceleration — most common default for UI), `ease-in` (slow start), `ease-out` (slow end), or a custom `cubic-bezier()`.

---

## `transform`

**What is it?**
A property that visually moves, rotates, scales, or skews an element **without affecting document flow** — other elements don't shift to accommodate a transformed element, because layout is calculated as if the transform didn't happen.

```css
.el {
  transform: translateX(20px) rotate(10deg) scale(1.1);
}
```

Common functions: `translate(x, y)`, `translateX()/translateY()`, `scale()`, `rotate()`, `skew()`.

**Why it's preferred over animating `top`/`left`/`width`/`margin` for motion:**
Changing layout properties (`top`, `left`, `width`, `margin`) forces the browser to recompute layout for potentially the whole page on every frame (called "layout thrashing" or reflow), which is slow. `transform` (and `opacity`) can often be handled purely by the **compositor** — a separate, cheap step that doesn't touch layout or repainting — making animations dramatically smoother, especially on lower-powered devices.

**Real-world usage:** Any smooth drag/hover/entrance animation in production (card lift on hover, modal slide-in, drawer/sidebar open) uses `transform`, not `top`/`left`, specifically for this performance reason.

---

## 3D Transforms: `perspective`, `transform-style`, `backface-visibility`

**What is it?**
The 2D `transform` functions covered above (`translate`, `scale`, `rotate`) all operate on a flat plane. A separate set of 3D functions (`rotateX()`, `rotateY()`, `rotate3d()`, `translateZ()`) move elements through a *third* axis (depth), but need three supporting properties to actually look three-dimensional instead of just squashing:
- **`perspective`** — set on the **parent** of the 3D-transformed element(s); defines how strong the "camera distance" effect is (smaller value = more dramatic/close-up 3D distortion). Without it, 3D rotations render flat with no depth illusion.
- **`transform-style: preserve-3d`** — tells a parent to let its children's 3D transforms exist in the same shared 3D space, instead of flattening each child onto its own separate 2D plane (the default).
- **`backface-visibility: hidden`** — hides an element once it's rotated enough (e.g., past 90°) that its "back" would be facing the viewer — essential for card-flip effects so you don't see a mirrored version of the front face through the back.

```css
.flip-card {
  perspective: 1000px;           /* on the WRAPPER — sets the 3D "camera distance" */
}

.flip-card-inner {
  position: relative;
  width: 200px; height: 280px;
  transform-style: preserve-3d;  /* let .front and .back exist in the same 3D space */
  transition: transform 0.6s;
}

.flip-card:hover .flip-card-inner {
  transform: rotateY(180deg);    /* flips the whole inner wrapper */
}

.flip-card-front, .flip-card-back {
  position: absolute;
  inset: 0;
  backface-visibility: hidden;   /* each face disappears once it's facing away from the viewer */
}

.flip-card-back {
  transform: rotateY(180deg);     /* pre-rotated so it's "facing away" until the flip happens */
}
```

**Why it was invented / what problem it solves:**
Before native 3D transforms (and hardware-accelerated compositing), a "card flip" or 3D carousel effect required either faked perspective with skewed 2D transforms and manual shading (never quite convincing), or a JS/canvas/WebGL-based approach entirely — heavy for what's conceptually a simple UI flourish. Native 3D transforms let the browser's compositor calculate real perspective-projected transforms directly, animatable at 60fps like any other `transform` change, without touching layout.

**Real-world usage:** Flip-card UI (a pricing card that flips to show details, a flashcard study app), simple 3D carousels/cube transitions, and depth-based hover effects (a button that tilts slightly toward the cursor). A common production gotcha: forgetting `backface-visibility: hidden` makes a flipped card show a mirrored, backwards version of whichever face is currently turned away from the viewer.

**How to explain in an interview:** "3D transforms like `rotateY()` need `perspective` on a parent to actually look three-dimensional — without it, the rotation just looks squashed rather than turning in depth. `transform-style: preserve-3d` keeps nested elements in the same 3D space instead of flattening them individually, and `backface-visibility: hidden` hides an element once its rotated 'back' would be facing the viewer — that's the trick behind card-flip UI, so you don't see a mirrored version of the front through the back."

---

## `will-change` and GPU Acceleration Basics

**What is it?**
`will-change` is a hint to the browser: "I'm about to animate this property, prepare ahead of time" — it can promote the element to its own **compositing layer** (potentially GPU-accelerated) *before* the animation starts, avoiding a stutter on the first frame.

```css
.card {
  will-change: transform; /* browser can pre-optimize for an upcoming transform animation */
}
```

**Why it was invented:** Without a hint, browsers decide at animation-start time whether to promote an element to its own layer, which can cause a visible hitch right as the animation begins. `will-change` lets you pre-warn the browser.

**Caution (real-world gotcha):** Overusing `will-change` on many elements, or leaving it on permanently, wastes memory (each promoted layer consumes GPU memory) and can actually *hurt* performance. Best practice: add it right before the animation (e.g., on `:hover` via JS, or just before triggering a class), and remove it after the animation completes, rather than hardcoding it everywhere.

---

## Compositing Layers & Performance — the Rendering Pipeline (Simplified)

**What is it?**
The browser renders a frame in roughly these stages: **Style → Layout (reflow) → Paint → Composite**.
- **Layout** — calculates size/position of every element. Triggered by changes to `width`, `height`, `top`, `margin`, etc. Expensive — can cascade to the whole page.
- **Paint** — fills in pixels (colors, text, shadows, borders) for elements. Triggered by changes like `background-color`, `box-shadow`. Cheaper than layout, still can be costly.
- **Composite** — combines already-painted layers together on screen, applying transforms/opacity. Cheapest step, and can often run on the **GPU**, independent of the main JS/layout thread.

**Why this matters for animation choice:** `transform` and `opacity` are the only two properties that can be animated using *composite-only* changes — skipping layout and paint entirely. That's why senior devs specifically prefer animating `transform`/`opacity` over `top`/`left`/`width`/`background` for anything performance-sensitive (60fps animations, drag interactions, mobile).

| Animate this | Triggers | Performance |
|---|---|---|
| `top`, `left`, `width`, `margin` | Layout + Paint + Composite | Slow — can jank, especially on mobile |
| `background-color`, `box-shadow`, `color` | Paint + Composite | Medium |
| `transform`, `opacity` | Composite only | Fast — can be GPU-accelerated, smooth 60fps |

**How to explain in an interview:** "The browser's rendering pipeline goes layout, then paint, then composite. `transform` and `opacity` can skip straight to the compositing step, which is cheap and often GPU-accelerated, so animating those is much smoother than animating things like `width` or `top`, which force the browser to recalculate layout on every frame."

---

## Real-World Usage: Loading Spinners & Micro-interactions

```css
/* Simple loading spinner */
.spinner {
  width: 32px; height: 32px;
  border: 4px solid #eee;
  border-top-color: #333;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}
@keyframes spin {
  to { transform: rotate(360deg); }
}

/* Button micro-interaction */
.btn {
  transition: transform 0.15s ease, box-shadow 0.15s ease;
}
.btn:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 8px rgba(0,0,0,0.15);
}
.btn:active {
  transform: translateY(0);
}
```

**`prefers-reduced-motion`** — always respect users who've asked their OS to reduce motion (a real accessibility requirement, not optional in mature production apps):
```css
@media (prefers-reduced-motion: reduce) {
  * { animation-duration: 0.001ms !important; transition-duration: 0.001ms !important; }
}
```

---

## Quick Summary Table

| Concept | One-liner |
|---|---|
| `transition` | Animates A → B, needs a trigger (hover, class change) |
| `animation` + `@keyframes` | Multi-step sequence, runs automatically, can loop |
| `transform` | Moves/rotates/scales without affecting layout flow |
| `perspective` / `preserve-3d` / `backface-visibility` | Enable real 3D depth, shared 3D space for children, and hide rotated-away faces (card flips) |
| `will-change` | Hints browser to pre-optimize before an animation — use sparingly |
| Compositing | Cheapest render step; `transform`/`opacity` can skip layout+paint |
| `prefers-reduced-motion` | Accessibility media query to respect reduced-motion users |
