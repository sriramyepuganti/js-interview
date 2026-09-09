# 05 — CSS Grid

## What is CSS Grid?

**What is it?**
CSS Grid is a **two-dimensional** layout system — it lets you control rows and columns *at the same time*, placing items precisely into a grid of cells, unlike flexbox which only handles one direction at a time.

**Why was it invented / what problem does it solve?**
Flexbox is excellent for one-dimensional layout, but real page layouts (a header, sidebar, main content, footer) are inherently **two-dimensional** — you need to control both rows and columns together, and have items span multiple rows/columns. Before Grid, developers faked 2D layouts with nested flexbox containers, floats, or frameworks' 12-column grid systems (Bootstrap's grid) built entirely out of floats/flexbox + fixed math. Grid (2017, widely supported) was designed specifically to solve true 2D page and component layout natively, without nesting hacks or a fixed column count.

**Real-world usage:** Full page layouts (header/sidebar/content/footer), image galleries, dashboard widgets, responsive card grids that reflow automatically, and "holy grail" layouts. Modern design systems use Grid for macro/page-level layout and Flexbox for micro/component-level layout (this pairing is itself a common interview question — see the decision table below).

**How to explain in an interview (simple English):**
"Grid lets you lay things out in rows and columns at the same time, like a spreadsheet. Flexbox is one direction only. So for full page layouts — header, sidebar, content, footer — Grid is the natural fit, because you're controlling both axes together, not just a single row or column."

---

## Setting Up a Grid

```css
.container {
  display: grid;
  grid-template-columns: 200px 1fr 100px; /* 3 columns: fixed, flexible, fixed */
  grid-template-rows: 80px 1fr 60px;      /* 3 rows: header, content, footer */
  gap: 16px;
}
```

Children of a grid container automatically become **grid items** and are placed into cells left-to-right, top-to-bottom, following the defined tracks — unless you place them explicitly.

---

## The `fr` Unit

**What is it?**
`fr` stands for "fraction" — it represents a share of the *leftover available space* in the grid container, after fixed-size tracks are subtracted.

```css
.container {
  display: grid;
  grid-template-columns: 200px 1fr 2fr;
  /* 200px is fixed; remaining space is split 1:2 between columns 2 and 3 */
}
```

**Why it matters:** `fr` is what makes Grid layouts fluid without using percentages or manual `calc()` math — it's purpose-built for "split remaining space in this ratio."

---

## `grid-template-areas` (named layout regions)

**What is it?**
A way to describe a layout visually, using named strings that map directly to how the layout looks — extremely readable for page-level layouts.

```css
.page {
  display: grid;
  grid-template-columns: 200px 1fr;
  grid-template-rows: auto 1fr auto;
  grid-template-areas:
    "header header"
    "sidebar content"
    "footer footer";
  gap: 16px;
  min-height: 100vh;
}

.header  { grid-area: header; }
.sidebar { grid-area: sidebar; }
.content { grid-area: content; }
.footer  { grid-area: footer; }
```

**Real-world usage:** This is the cleanest, most maintainable way to write a full page skeleton — you can literally read the layout shape from the CSS, and reflow it entirely for mobile by redefining `grid-template-areas` inside a media query (no HTML changes needed).

---

## `auto-fit` vs `auto-fill` — Responsive Card Grids Without Media Queries

**What is it?**
`repeat()` combined with `auto-fit`/`auto-fill` and `minmax()` creates a grid that automatically adds/removes columns based on available width — no media query needed.

```css
.cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 16px;
}
```
This says: "fit as many 220px-minimum columns as possible, and let them grow (`1fr`) to fill remaining space."

| | `auto-fill` | `auto-fit` |
|---|---|---|
| Behavior when there are fewer items than columns that would fit | Keeps empty tracks reserved (invisible, but taking space) | Collapses empty tracks to 0 width, letting real items stretch to fill the row |
| Typical use | Rarely — you usually want `auto-fit` for cards/galleries | Nearly always — this is the go-to for responsive card grids |

**Real-world usage:** This single-line responsive grid pattern replaced dozens of manual breakpoints (`@media (min-width:...) { grid-template-columns: repeat(3, 1fr); }` etc.) for common gallery/card layouts.

**How to explain in an interview:** "`repeat(auto-fit, minmax(220px, 1fr))` tells the browser to fit as many columns of at least 220px as possible, and stretch them to fill the row. It gives you a responsive grid without writing a single media query."

---

## Placing Items Explicitly

```css
.item {
  grid-column: 1 / 3; /* start at column line 1, end before line 3 → spans 2 columns */
  grid-row: 2 / 4;     /* spans 2 rows */
}
/* shorthand */
.item2 {
  grid-column: span 2; /* span 2 columns from wherever it's auto-placed */
}
```

**Real-world usage:** Dashboard widgets/bento-grid layouts where some cards are bigger (span 2 columns, or 2 rows) than others.

---

## Implicit Grid: `grid-auto-rows`/`grid-auto-columns` and `grid-auto-flow: dense`

**What is it?**
`grid-template-columns`/`grid-template-rows` define the **explicit** grid — the tracks you named up front. If items overflow that (more items than defined cells, or items placed outside the named lines), the browser creates extra **implicit** tracks automatically. `grid-auto-rows`/`grid-auto-columns` control the *size* of those auto-created implicit tracks. `grid-auto-flow` controls *how* auto-placed items fill the grid — including a `dense` mode that back-fills earlier gaps instead of only ever moving forward.

```css
.gallery {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  grid-auto-rows: 120px;       /* any row the grid has to CREATE (beyond what's templated) is 120px tall */
  grid-auto-flow: row dense;   /* fill row-by-row, but backfill earlier empty cells if a later item fits there */
  gap: 8px;
}

.gallery .featured {
  grid-column: span 2;
  grid-row: span 2;             /* a bigger item that would otherwise leave a gap next to it */
}
```

**Why it matters / what problem it solves:**
Without `grid-auto-rows`, every implicitly-created row defaults to `auto` (sized to its content), which can produce uneven row heights in a grid where you only explicitly sized the columns. Without `dense`, the default `grid-auto-flow: row` (sparse) placement algorithm never moves an item backwards to fill a hole — if a spanning item (like a 2×2 "featured" card) doesn't fit in the next open slot, the algorithm leaves that slot empty and skips ahead, which is exactly the layout gap that made JS masonry libraries popular before `dense` existed.

**Real-world usage:** Photo/video galleries and "bento grid" dashboard layouts where some cells intentionally span 2 columns or 2 rows (a featured post, a big stat card) — `grid-auto-flow: dense` fills the resulting gaps with whatever smaller items come later in source order, giving a tightly-packed masonry-like look without any JavaScript layout calculation.

**How to explain in an interview:** "`grid-template-columns`/`rows` define the explicit grid I planned; `grid-auto-rows`/`columns` size any extra implicit tracks the browser has to create beyond that, so I'm not stuck with uneven `auto`-sized rows. `grid-auto-flow: dense` tells the browser to backfill earlier gaps left by bigger spanning items instead of just skipping ahead — that's the trick behind a lot of 'bento grid' or masonry-looking layouts without any JS."

---

## Grid vs Flexbox — Decision Table

| Question | Answer |
|---|---|
| Do you need to control **rows and columns together**? | Grid |
| Are you laying out a **single row or column** of items (navbar, button group)? | Flexbox |
| Is content size **driving** the layout (items should size to their content)? | Flexbox is usually more natural |
| Is the **layout structure** the priority (fixed page regions, card grid)? | Grid |
| Do items need to **overlap** or span multiple rows/columns? | Grid |
| Do you need items to **wrap and reflow** based on available space with minimal code? | Grid (`auto-fit`) for 2D grids, Flexbox (`flex-wrap`) for a single wrapping row |
| Full page skeleton (header/sidebar/content/footer)? | Grid |
| Centering a single item, or aligning a row of buttons? | Flexbox |

**Common real-world pairing:** Grid for the outer page/section layout, Flexbox *inside* each grid cell/component (e.g., a card that uses flexbox internally to align its icon + title + button) — nesting flex inside grid, and vice versa, is completely normal and expected.

**How to explain in an interview:** "If I need to control both rows and columns at once — like a page layout with header, sidebar, and footer — I reach for Grid. If I'm just laying out items in a single row or column, like a navbar or a toolbar, Flexbox is simpler and more natural. In practice most real UIs use both together: Grid for the page skeleton, Flexbox for the components inside each grid cell."

---

## Quick Summary Table

| Concept | One-liner |
|---|---|
| Grid | Two-dimensional layout — rows and columns together |
| `fr` | Splits leftover space by fraction/ratio |
| `grid-template-areas` | Named, readable layout regions |
| `auto-fit` + `minmax()` | Responsive grid without media queries |
| `auto-fill` vs `auto-fit` | fill reserves empty tracks; fit collapses them, stretching real items |
| `grid-auto-rows`/`columns` | Sizes implicit tracks the browser creates beyond your explicit template |
| `grid-auto-flow: dense` | Backfills earlier gaps from spanning items — masonry-like packing, no JS |
| Grid vs Flexbox | Grid = 2D structure; Flexbox = 1D row/column alignment |
