# 04 — Flexbox

## What is Flexbox?

**What is it?**
Flexbox (Flexible Box Layout) is a **one-dimensional** layout system — it arranges items in a single row or a single column, and gives you powerful tools to distribute space, align items, and reorder them, even when their sizes are unknown/dynamic.

**Why was it invented / what problem does it solve?**
Before flexbox (pre-2012ish), layout relied on hacks:
- **Floats** — designed for wrapping text around images, not layout. Using floats for columns required manual "clearfix" hacks to stop parent containers from collapsing.
- **Tables/`display:table`** — rigid, meant for tabular data, bad semantics and poor responsiveness.
- **Inline-block** — left unwanted whitespace gaps between elements and needed `vertical-align` hacks.
- Centering something vertically was notoriously hard (`margin: 0 auto` only worked horizontally).

Flexbox was invented to directly solve *"lay these items out in a row/column, distribute leftover space, and align them"* — the layout problems developers actually had — without hacks.

**Real-world usage:** Navbars, button groups, form rows, card headers, centering any single element (modal dialogs, loading spinners), equal-height columns, and space-between layouts (e.g. logo left, nav links right). Flexbox is used in essentially every production UI today for component-level layout.

**How to explain in an interview (simple English):**
"Flexbox is for laying things out in a single line — a row or a column — and it's great at distributing space and aligning items, even centering things, which used to require hacks with floats or tables. It's one-dimensional: you're either working across a row or down a column, not both at once — that's what Grid is for."

---

## Setting Up: Container and Items

```css
.container {
  display: flex; /* or inline-flex */
}
```
Any direct child of a flex container automatically becomes a **flex item** — no extra setup needed on children.

---

## Flex Container Properties

| Property | Values | What it does |
|---|---|---|
| `flex-direction` | `row` (default) \| `row-reverse` \| `column` \| `column-reverse` | Sets the main axis direction |
| `flex-wrap` | `nowrap` (default) \| `wrap` \| `wrap-reverse` | Whether items wrap to new lines when they don't fit |
| `justify-content` | `flex-start` \| `flex-end` \| `center` \| `space-between` \| `space-around` \| `space-evenly` | Aligns items along the **main axis** |
| `align-items` | `stretch` (default) \| `flex-start` \| `flex-end` \| `center` \| `baseline` | Aligns items along the **cross axis** |
| `align-content` | same as align-items values | Aligns whole *rows* of wrapped items along the cross axis (only matters with wrapping) |
| `gap` | e.g. `16px` | Space between items — no more manual margins on every item |

```css
.navbar {
  display: flex;
  justify-content: space-between; /* logo left, links right */
  align-items: center;            /* vertically center everything */
  gap: 20px;
}
```

**Main axis vs cross axis:** if `flex-direction: row`, the main axis is horizontal and the cross axis is vertical (and vice versa for `column`). `justify-content` always works on the main axis, `align-items` always on the cross axis — this swap is a very common interview trip-up.

---

## Flex Item Properties

| Property | What it does |
|---|---|
| `flex-grow` | How much an item **expands** to fill leftover space (default `0` = don't grow) |
| `flex-shrink` | How much an item **shrinks** when space is tight (default `1` = can shrink) |
| `flex-basis` | The item's starting/ideal size before growing/shrinking (like a preferred `width`) |
| `flex` (shorthand) | `flex: <grow> <shrink> <basis>` — e.g. `flex: 1 1 0` |
| `align-self` | Overrides `align-items` for just this one item |
| `order` | Changes visual order without touching HTML (default `0`) |

```css
.item {
  flex: 1; /* shorthand for flex-grow:1, flex-shrink:1, flex-basis:0 — "take an equal share" */
}
```

**How `flex: 1` became the "equal columns" idiom:** if every item has `flex: 1`, they all grow equally to fill the container, resulting in equal-width columns regardless of content length.

---

## Common Flexbox Interview Patterns

### 1. Centering anything (horizontally + vertically)
```css
.center-wrapper {
  display: flex;
  justify-content: center; /* horizontal */
  align-items: center;     /* vertical */
  height: 100vh;
}
```
This single 3-line pattern replaced years of "how do I vertically center a div" hacks (`vertical-align`, absolute positioning with negative margins, table-cell tricks).

### 2. Equal-width (or equal-height) columns
```css
.row { display: flex; }
.col { flex: 1; }        /* all columns share space equally */
/* height equalizes automatically too, because align-items defaults to "stretch" */
```

### 3. Sticky footer (footer always at bottom, even on short pages)
```css
body { display: flex; flex-direction: column; min-height: 100vh; }
main { flex: 1; }  /* main grows to fill remaining space, pushing footer down */
```

### 4. Space between items (classic navbar)
```css
.navbar { display: flex; justify-content: space-between; align-items: center; }
```

### 5. Wrapping card layout with `gap`
```css
.cards { display: flex; flex-wrap: wrap; gap: 16px; }
.card  { flex: 1 1 250px; } /* grow/shrink, but prefer 250px, wraps when too narrow */
```

---

## Flexbox vs Old Techniques — Why It Won

| Problem | Old (float/table) approach | Flexbox approach |
|---|---|---|
| Vertical centering | Table-cell hack or absolute + negative margin | `align-items: center` |
| Equal-height columns | JS or table layout | `align-items: stretch` (default) |
| Space distribution | Manual margin math | `justify-content: space-between` |
| Reordering visually | Reorder the HTML itself | `order` property |
| Clearing float side-effects | `clearfix` hack | Not needed — flex items don't float |

---

## How to Explain Flexbox End-to-End in an Interview

"Flexbox solves one-dimensional layout — a row or a column. You turn on `display: flex` on a parent, and its direct children become flex items automatically. `justify-content` controls spacing along the main direction (the axis flex-direction points), and `align-items` controls the perpendicular direction. Items can grow or shrink to fill space using `flex-grow`/`flex-shrink`, and `flex: 1` is the common shorthand for 'take an equal share.' It replaced float and table hacks for things like centering, navbars, and equal-height columns."

---

## Quick Summary Table

| Concept | One-liner |
|---|---|
| `display: flex` | Turns children into flex items automatically |
| Main axis | Direction set by `flex-direction`; controlled by `justify-content` |
| Cross axis | Perpendicular to main axis; controlled by `align-items` |
| `flex: 1` | Item grows/shrinks to take an equal share of space |
| `gap` | Modern replacement for manual item margins |
| Centering trick | `justify-content: center; align-items: center;` |
