# 01 — CSS Fundamentals: What, Why, Cascade, Specificity, Inheritance, Units

## What is CSS?

**What is it?**
CSS (Cascading Style Sheets) is the language that describes *how* HTML elements look and are laid out on a page — colors, spacing, fonts, positioning, responsiveness — everything visual, separate from the content (HTML) and behavior (JS).

**Why was it invented / what problem does it solve?**
In the early web, styling was written directly inside HTML tags (`<font color="red">`, `bgcolor` attributes, inline `style` on every tag). This mixed *content* and *presentation* in one place, making pages hard to maintain — changing a color meant editing hundreds of HTML files. CSS was invented (1996, CSS1) to separate **structure (HTML)** from **presentation (CSS)**, so:
- One CSS file can style thousands of HTML pages.
- Designers can change the look without touching markup or logic.
- The same content can be re-styled entirely for print, mobile, dark mode, etc.

This is the core software principle of **separation of concerns** applied to the web.

**Real-world usage:** Every production website/app uses CSS for layout and theming. Component libraries (Material UI, Bootstrap) are essentially pre-built CSS + JS bundles. A senior dev is expected to reason about *why* a style isn't applying, not just how to write selectors.

**How to explain in an interview (simple English):**
"CSS separates how a page looks from what a page contains. HTML says 'this is a heading,' CSS says 'make it blue and centered.' Keeping them separate means one stylesheet can restyle an entire site, and teams can split work between markup and design without stepping on each other."

---

## Basic Syntax

```css
selector {
  property: value;
}

/* example */
h1 {
  color: navy;
  font-size: 24px;
}
```

- **Selector** — which element(s) to target (`h1`, `.class`, `#id`).
- **Declaration block** — `{ }` containing one or more `property: value;` pairs.
- **Comment** — `/* like this */` (no `//` in CSS).

Three ways to attach CSS to HTML:
1. **External** — `<link rel="stylesheet" href="style.css">` (best practice: cacheable, reusable, separates concerns).
2. **Internal** — `<style>...</style>` in `<head>` (fine for demos/small pages).
3. **Inline** — `style="color:red"` on a tag (highest specificity, hardest to maintain, avoid in production except for dynamic JS-driven styles).

---

## The Cascade

**What is it?**
The "cascade" is the algorithm the browser uses to decide *which* CSS rule wins when multiple rules target the same element and property. The order is roughly:
1. **Origin & importance** — user-agent (browser default) styles < author (your) styles < `!important` author styles < user-agent `!important` (rare).
2. **Specificity** — more specific selectors win (see file 03).
3. **Source order** — if specificity ties, the rule that appears *later* in the CSS wins.

**Why was it invented?**
Multiple stylesheets (browser defaults, your CSS, third-party libraries) can all target the same element. Without a deterministic rule-resolution order, results would be unpredictable. The cascade gives a consistent, rule-based way to resolve conflicts.

```css
p { color: blue; }
p { color: green; } /* wins — same specificity, comes later */
```

**Real-world usage:** Debugging "why isn't my CSS applying" is 90% understanding the cascade — a later stylesheet, a more specific selector, or an `!important` elsewhere is overriding you.

**How to explain in an interview:** "The cascade is the tie-breaker system CSS uses when several rules could apply to the same element. It checks importance first, then specificity, then whichever rule was written last wins."

---

## Specificity (quick intro — full breakdown in file 03)

**What is it?**
A scoring system that decides which selector "wins" when two rules with equal importance target the same element.

Rough weight order (highest to lowest):
1. Inline styles
2. IDs (`#header`)
3. Classes, attributes, pseudo-classes (`.btn`, `[type="text"]`, `:hover`)
4. Elements, pseudo-elements (`div`, `::before`)

```css
#nav .link { color: red; }   /* ID + class → higher specificity */
.link { color: blue; }        /* loses even though it's written later */
```

**Real-world usage:** Overly specific selectors (`#page .container .row .col .btn`) make future overrides painful — a common code-review complaint in large CSS codebases.

**How to explain in an interview:** "Specificity is like a scorecard — IDs score more than classes, classes score more than plain elements. The higher score wins, regardless of order, unless it's a tie — then the last rule written wins."

---

## Inheritance

**What is it?**
Some CSS properties automatically pass down from a parent element to its children, even if the child has no rule of its own for that property.

**Why was it invented?**
Without inheritance, you'd have to explicitly set `font-family`, `color`, `line-height` etc. on *every single element*. Inheritance lets you set text-related properties once on `body` or `html` and have the whole page pick them up — much less repetition.

- **Inherited by default:** `color`, `font-family`, `font-size`, `line-height`, `text-align`, `visibility`.
- **NOT inherited by default:** `margin`, `padding`, `border`, `width`, `height`, `background` (box-model/layout properties — because every box usually needs its own).

```css
body { font-family: Arial, sans-serif; color: #333; }
/* every element inherits this font and color unless overridden */
```

You can force inheritance or reset it with keywords:
```css
.child {
  color: inherit;   /* explicitly take parent's value */
  all: unset;       /* reset everything to inherited/initial */
}
```

**Real-world usage:** Setting base typography once on `body`/`html` and letting the whole app inherit it is standard practice — it's why design systems define a global font stack at the root.

**How to explain in an interview:** "Inheritance means a child element automatically gets certain parent styles, like font and color, unless you override them. It's mostly text-related properties — box-model stuff like margin and width don't inherit because every element usually needs its own size."

---

## Global Values: `initial`, `inherit`, `unset`, `revert`

**What is it?**
Four special keywords that can be assigned to **any** CSS property, used to explicitly reset a value instead of hand-typing what you think the "normal" value should be.

| Keyword | What it does |
|---|---|
| `initial` | Resets the property to its **spec-defined default** value (e.g., `display: initial` → `inline`, the CSS spec's default for a generic element), ignoring both the browser's UA stylesheet and inheritance. |
| `inherit` | Forces the property to take its **parent's computed value**, even for properties that don't normally inherit (like `border` or `width`). |
| `unset` | Acts like `inherit` **if the property is naturally inheritable** (e.g. `color`), or like `initial` **if it isn't** (e.g. `margin`) — it "does what you'd expect" without you needing to know the inheritance table by heart. |
| `revert` | Resets the property to what it would be from the **browser's default (user-agent) stylesheet** — undoing your own and any author CSS, but keeping the browser's built-in default (e.g. `revert`-ing `display` on a `<button>` gives back the browser's native button `display` value, not the CSS spec's generic `inline` default). |

**Why they were invented / what problem they solve:**
Before these keywords, "resetting" a property meant guessing and hand-typing a value (`margin: 0`, `display: block`) — which only works if you already know what the reset value *should* be, and doesn't distinguish "the CSS spec's default" from "the browser's built-in default for this specific element." These four keywords give explicit, spec-defined ways to say exactly *which* kind of "reset" you mean, without memorizing per-property defaults.

```css
.widget button {
  all: unset;           /* strip every inherited/author style back to a sane baseline */
}

.card {
  border: inherit;       /* force border to match the parent's, even though border doesn't inherit by default */
}

.legacy-override {
  color: initial;        /* back to CSS-spec default (black), ignoring inherited body color */
}

.opt-out {
  all: revert;            /* "forget my stylesheet entirely, give me back the browser's native look" */
}
```

**Real-world usage:** `all: unset` (or `all: revert`) on a `<button>`/`<a>` that's being restyled to look like plain text/an icon — it strips inherited button chrome and author overrides in one line instead of manually zeroing out `border`, `background`, `padding`, `font`, etc. one by one. `revert` specifically is handy when a global reset (`* { all: unset }`) accidentally nukes native form control usability, and you want a few elements to fall back to the browser's actual native behavior rather than a blank slate.

**How to explain in an interview:** "`initial` resets to the CSS spec's default value. `inherit` forces the parent's value even on properties that don't normally inherit. `unset` picks whichever of those two makes sense automatically based on whether the property is naturally inheritable. `revert` is the odd one out — it resets to the *browser's own default styling* for that element, not the CSS spec's generic default, which matters for things like native buttons where the spec default and the browser's actual default aren't the same."

---

## `!important`

**What is it?**
A modifier you add to a declaration to force it to override normal cascade/specificity rules (except another `!important` with higher specificity, or inline styles).

```css
p { color: red !important; }
p { color: blue; } /* loses — red wins no matter the order or normal specificity */
```

**Why was it invented?**
Sometimes you need to guarantee a style applies regardless of what else is loaded — e.g., overriding third-party CSS you can't edit directly, or a utility class that must always win.

**Real-world usage / the catch:** `!important` is widely considered a code smell when overused — it breaks the normal cascade, making future overrides require *more* `!important`s, snowballing into unmaintainable CSS ("`!important` wars"). Legitimate uses: utility classes (`.hidden { display: none !important; }`) that must never be silently overridden, or patching third-party widget styles you don't control.

**How to explain in an interview:** "`!important` forces a rule to win over normal cascade rules. It's useful as an escape hatch — like utility classes that must always apply — but overusing it is a red flag because it makes CSS harder to override predictably later."

---

## Units: px / em / rem / % / vh / vw

| Unit | Relative to | Use case |
|---|---|---|
| `px` | Fixed, absolute | Borders, shadows, precise 1px lines — things that shouldn't scale with text |
| `%` | Parent element's size | Fluid widths, e.g. `width: 50%` of a container |
| `em` | The **current element's font-size** (or parent's, for font-size itself) | Spacing that should scale *with* nearby text (e.g. padding relative to button text) |
| `rem` | The **root (`html`) font-size** | Font sizes and spacing across the whole app — predictable, doesn't compound |
| `vh` / `vw` | 1% of viewport height / width | Full-screen sections, hero banners, responsive sizing tied to screen, not parent |

**Why were `em`/`rem` invented (over `px`)?**
Accessibility: users can change their browser's default font size. `px` values ignore that (fixed), while `em`/`rem` scale proportionally, so text-heavy layouts remain readable and properly spaced when a user zooms or changes base font size.

**`em` vs `rem` — the compounding trap:**
```css
html { font-size: 16px; }

.parent { font-size: 1.5em; }   /* 24px (1.5 * 16) */
.child  { font-size: 1.5em; }   /* 36px (1.5 * 24) — compounds! */

.parent2 { font-size: 1.5rem; } /* 24px (1.5 * root 16px) */
.child2  { font-size: 1.5rem; } /* 24px — always relative to root, no compounding */
```
This is why most teams standardize on `rem` for font-size/spacing (predictable) and reserve `em` for component-internal spacing that should scale with that component's own font-size (e.g. icon size relative to button text).

**Real-world usage:**
- `rem` for font sizes and page-level spacing (design systems, Tailwind's scale is all `rem`-based).
- `%` and `vh`/`vw` for fluid/responsive containers and full-viewport sections.
- `px` for borders, box-shadows, and anything meant to stay crisp/fixed regardless of zoom.

**How to explain in an interview:** "`px` is fixed and doesn't respect user font-size preferences. `%` is relative to the parent. `em` is relative to the current font-size and can compound in nested elements, which gets confusing. `rem` is relative to the root font-size only, so it's predictable — that's why `rem` is the default choice for font sizes in most modern codebases. `vh`/`vw` are relative to the actual browser viewport, great for full-screen sections."

---

## Quick Summary Table

| Concept | One-liner |
|---|---|
| CSS | Separates presentation from HTML content |
| Cascade | Algorithm deciding which conflicting rule wins |
| Specificity | Scoring system: inline > ID > class > element |
| Inheritance | Text properties pass from parent to child automatically |
| `initial`/`inherit`/`unset`/`revert` | Explicit resets: spec default / parent's value / auto-pick / browser's native default |
| `!important` | Forces a rule to win; overuse is a maintainability smell |
| `px` | Fixed unit, ignores user font settings |
| `%` | Relative to parent |
| `em` | Relative to current font-size, can compound |
| `rem` | Relative to root font-size, predictable — preferred default |
| `vh`/`vw` | Relative to viewport height/width |
