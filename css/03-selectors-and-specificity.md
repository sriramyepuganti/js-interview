# 03 — Selectors and Specificity

## What are Selectors?

**What is it?**
A selector is the pattern that tells CSS *which* HTML elements a rule applies to — from simple tag names to complex combinations of attributes, state, and structure.

**Why was it invented?**
Real pages need to target elements precisely — not just "all paragraphs" but "the second list item inside a nav that's currently hovered." Selectors evolved (CSS1 → CSS3/Selectors Level 4) to give authors this fine-grained targeting without needing extra classes or JS for every state.

**Real-world usage:** Selector choice directly affects maintainability and performance — overly broad selectors (`div span`) cause unintended side effects; overly specific ones (`#page .wrap .row .col span`) make future overrides painful.

**How to explain in an interview:** "Selectors are the part of a CSS rule that decides which elements get styled. Simple ones target a tag or class; combinators and pseudo-classes let you target relationships and states, like the last child of a list or a link being hovered."

---

## Selector Types Reference

| Selector | Example | Matches |
|---|---|---|
| Universal | `*` | Every element |
| Type/element | `p` | All `<p>` tags |
| Class | `.card` | Elements with `class="card"` |
| ID | `#header` | The element with `id="header"` |
| Attribute | `[type="text"]` | Elements with that exact attribute/value |
| Attribute (contains) | `[class*="col-"]` | Attribute value contains substring |
| Descendant | `nav a` | Any `<a>` anywhere inside `nav` (any depth) |
| Child | `nav > a` | `<a>` that is a **direct** child of `nav` |
| Adjacent sibling | `h2 + p` | The `<p>` immediately after an `h2` (same parent) |
| General sibling | `h2 ~ p` | Any `<p>` after an `h2`, same parent (not just immediate) |
| Group | `h1, h2, h3` | Any of the listed selectors |

```css
nav a { color: blue; }        /* all links anywhere inside nav */
nav > a { color: red; }       /* only links that are direct children of nav */
h2 + p { font-weight: bold; } /* only the paragraph right after an h2 */
```

---

## Pseudo-classes vs Pseudo-elements

**What is it?**
- **Pseudo-classes** (single colon `:`) target elements in a certain **state** or **position** — they don't create new HTML, they select existing elements conditionally.
- **Pseudo-elements** (double colon `::`) let you style a **sub-part of an element** that doesn't otherwise exist as its own DOM node — CSS generates it.

**Why invented?**
Before pseudo-classes, styling "the link the user is currently hovering" or "every odd row" required JavaScript to add/remove classes dynamically. Pseudo-classes push that logic into pure CSS, which is faster and simpler. Pseudo-elements let you add small decorative content/styling (like a tooltip arrow, or a bullet-like `::before` icon) without adding extra markup.

```css
a:hover { color: orange; }         /* state: mouse over */
li:first-child { font-weight: bold; }  /* structural position */
input:focus { outline: 2px solid blue; }
tr:nth-child(even) { background: #f2f2f2; } /* zebra striping */

p::first-line { font-weight: bold; }   /* sub-part: just the first line */
.tooltip::before { content: "▲"; }     /* generated content, no extra HTML tag needed */
```

Common pseudo-classes: `:hover`, `:focus`, `:active`, `:visited`, `:first-child`, `:last-child`, `:nth-child(n)`, `:not()`, `:checked`, `:disabled`, `:empty`.
Common pseudo-elements: `::before`, `::after`, `::first-line`, `::first-letter`, `::placeholder`, `::selection`.

**Real-world usage:** `::before`/`::after` are used constantly for icons, decorative shapes, clearfixes, and tooltips without adding extra `<div>`s. `:nth-child` powers zebra-striped tables and "every 3rd card in a grid" styling.

**How to explain in an interview:** "Pseudo-classes select real elements based on state or position, like `:hover` or `:first-child`. Pseudo-elements target a part of an element that isn't a real DOM node, like `::before`, which lets you insert decorative content purely through CSS."

---

## Specificity — How the Score is Calculated

**What is it?**
A numeric-like weight assigned to every selector, used to resolve conflicts when multiple rules target the same element with the same importance. Specificity is usually represented as a tuple of four categories, from most to least powerful:

**(inline, IDs, classes/attributes/pseudo-classes, elements/pseudo-elements)**

| Category | Weight | Examples |
|---|---|---|
| Inline style | (1,0,0,0) | `style="color:red"` |
| ID selectors | (0,1,0,0) | `#header` |
| Classes, attribute selectors, pseudo-classes | (0,0,1,0) | `.btn`, `[type=text]`, `:hover` |
| Elements, pseudo-elements | (0,0,0,1) | `div`, `::before` |
| Universal selector `*`, combinators (`>`, `+`, `~`) | (0,0,0,0) | Add no specificity |

You compare left to right, category by category — a single ID beats *any number* of classes; a single class beats *any number* of elements.

**Worked examples:**

```css
div { color: black; }                    /* (0,0,0,1) */
.text { color: blue; }                   /* (0,0,1,0) → beats div */
#main .text { color: green; }            /* (0,1,1,0) → beats .text alone */
#main #title { color: red; }             /* (0,2,0,0) → beats #main .text */
div.text#title { color: purple; }        /* (0,1,1,1) */
```

`#main #title` (0,2,0,0) beats `#main .text` (0,1,1,0) because you compare the ID column first: 2 > 1.

**`!important`** overrides normal specificity entirely (see file 01) — it's a separate, higher tier, not part of this scoring.

**Real-world usage:** This is one of the most common senior-CSS interview topics — being asked to calculate specificity for a few given rules and predict which one wins.

**How to explain in an interview:** "Specificity is scored in four buckets: inline styles, IDs, classes/attributes/pseudo-classes, and elements. You compare bucket by bucket from most to least powerful — one ID always beats any number of classes, and one class always beats any number of elements. If it's a complete tie, the rule declared later in the CSS wins."

---

## `:is()`, `:where()`, `:not()` — quick specificity notes

- `:not(selector)` — specificity is that of its *argument* (i.e., `:not(.btn)` counts as a class, `(0,0,1,0)`).
- `:is(selector-list)` — takes the specificity of its *most specific* argument.
- `:where(selector-list)` — **always contributes zero specificity**, regardless of its arguments — useful for writing overridable base styles (see file 10).

```css
:where(.card, .panel) h2 { color: black; } /* specificity of just "h2" — (0,0,0,1) — easy to override */
```

---

## Common Specificity Gotchas

1. **Source order tie-breaks equal specificity** — if two selectors score identically, whichever is defined *later* in the cascade wins, regardless of which file it's in.
2. **IDs are "too strong" in practice** — a single `#id` selector can be nearly impossible to override without another ID or `!important`, which is why many teams avoid styling by ID at all (reserve IDs for JS hooks/anchors, style with classes).
3. **`!important` + specificity interplay** — two `!important` rules still resolve by specificity between themselves; the "important tier" just jumps them above all non-important rules first.
4. **Inline `style` attribute** beats *any* selector-based specificity (short of `!important` in a stylesheet), which is why inline styles are hard to override from CSS files — one reason to avoid inline styles in production HTML.
5. **Universal selector and combinators add zero specificity** — `div > p` is only as specific as `div` + `p` combined (0,0,0,2), the `>` itself contributes nothing.

**How to explain in an interview:** "The most common trap is thinking selector length equals strength — a long chain of elements can still lose to a single class or ID. Also, when specificity ties exactly, it's not about who's 'more specific looking,' it's literally whichever rule appears later in the source."

---

## Quick Summary Table

| Concept | One-liner |
|---|---|
| Descendant vs child | `a b` = anywhere inside; `a > b` = direct child only |
| Pseudo-class | Targets state/position of a real element (`:hover`, `:nth-child`) |
| Pseudo-element | Targets a generated sub-part (`::before`, `::first-line`) |
| Specificity order | inline > ID > class/attr/pseudo-class > element/pseudo-element |
| Tie-break | Last rule in source order wins |
| `:where()` | Selector list with zero added specificity |
