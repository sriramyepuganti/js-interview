# 06 — Positioning and Stacking Context

## The `position` Property

**What is it?**
`position` controls *how* an element is placed in the document — whether it follows normal document flow or is pulled out and placed relative to some reference point, using `top`/`right`/`bottom`/`left` (the "offset properties," which only work on non-static positioning).

**Why was it invented?**
Normal document flow (block/inline flow) only lets elements stack top-to-bottom or sit inline. Real UIs need things like tooltips, modals, sticky headers, and dropdowns that break out of normal flow or track a scroll position — `position` values were introduced to give precise control over this.

| Value | Behavior |
|---|---|
| `static` (default) | Normal flow. Offset properties (`top`, etc.) do nothing. |
| `relative` | Stays in normal flow, but offsets are applied **relative to its own normal position**. Also — importantly — becomes a positioning **reference point** for any `absolute` descendants. |
| `absolute` | Removed from normal flow entirely (doesn't take up space for siblings). Positioned relative to the **nearest ancestor with `position` other than `static`** (or the viewport/initial containing block if none exists). |
| `fixed` | Removed from normal flow. Positioned relative to the **viewport**, stays in place even when the page scrolls. |
| `sticky` | Behaves like `relative` until a scroll threshold is crossed, then "sticks" like `fixed` within its containing block. |

```css
.dropdown-wrapper { position: relative; }     /* becomes the reference point */
.dropdown-menu {
  position: absolute;
  top: 100%;   /* just below the wrapper */
  left: 0;
}
```

**Real-world usage:**
- `relative` — small nudges, and (most importantly) as an anchor for absolutely-positioned children (tooltips, dropdowns, badges on icons).
- `absolute` — dropdown menus, modal close buttons, badges/notification dots pinned to a corner of an icon.
- `fixed` — sticky navbars that always float over content, "back to top" buttons, chat widgets.
- `sticky` — table headers that stick while scrolling a long table, sidebar sections that stick once reached, sticky section titles in a long list (like iOS Contacts app style headers).

**How to explain in an interview (simple English):**
"`static` is default flow. `relative` nudges an element from its own position but keeps its space, and it also becomes an anchor for any `absolute` children inside it. `absolute` completely removes the element from flow and positions it relative to the nearest ancestor that isn't static. `fixed` is like absolute but always relative to the screen/viewport, ignoring scroll. `sticky` is a hybrid — normal until you scroll past a point, then it sticks like fixed."

---

## The `absolute` + `relative` Pairing (Very Common Interview Question)

**Why do `absolute` elements need a `relative` (or similarly positioned) ancestor?**
Without one, an `absolute` element positions itself relative to the entire page (the initial containing block) — which is rarely what you want. Wrapping it in a `relative` (or `absolute`/`fixed`) parent scopes the positioning to that smaller container.

```css
.card { position: relative; }               /* scoping anchor */
.badge {
  position: absolute;
  top: -8px; right: -8px;                    /* sits at the corner of .card, not the page */
}
```

**Gotcha:** If you forget `position: relative` on `.card`, the badge would jump to the top-right corner of the *whole page* (or nearest positioned ancestor further up) instead of the card — a very common real bug.

---

## `sticky` Details

```css
thead th {
  position: sticky;
  top: 0;          /* sticks to the top of its scrolling container once reached */
  background: white; /* needed — sticky elements need an opaque bg to not show content scrolling underneath */
}
```

**Gotcha:** `sticky` only works within the boundaries of its **containing block** — if any ancestor has `overflow: hidden`, `overflow: auto`, or a fixed height that clips it, sticky can silently fail to stick past that ancestor's boundary.

---

## `z-index` and Stacking Contexts

**What is it?**
`z-index` controls which element appears "on top" when elements visually overlap, but it only works within the concept of a **stacking context** — a self-contained hierarchy of layers.

**Why was it invented?**
Once elements can overlap (via `position`, transforms, etc.), the browser needs a rule for deciding paint order. `z-index` gives authors direct control over that order — but only relative to *siblings within the same stacking context*.

```css
.modal-overlay { position: fixed; z-index: 1000; }
.dropdown { position: absolute; z-index: 10; }
```

**Rules:**
- `z-index` only applies to elements with a `position` other than `static` (or flex/grid items, which can use `z-index` even without explicit positioning).
- A higher `z-index` wins **only when comparing elements in the same stacking context**.
- A new stacking context is created by many things, not just `z-index` — e.g., `position` + `z-index` together, `opacity < 1`, `transform`, `filter`, `will-change`, `isolation: isolate`, and a few others.

**The classic gotcha:** A child with `z-index: 9999` can still appear *behind* another element, if its parent already created a stacking context with a lower `z-index` (or no `z-index` at all) than that other element's stacking context. The child's `z-index` is only compared against its siblings *inside its own parent's stacking context* — it can never "escape" and compete directly with elements outside that context.

```css
.parent-a { position: relative; z-index: 1; }  /* creates stacking context #1 */
  .child-a { position: absolute; z-index: 9999; } /* trapped inside context #1 */

.parent-b { position: relative; z-index: 2; }  /* creates stacking context #2 — wins over #1 */
  .child-b { position: absolute; z-index: 1; }

/* child-a (z-index 9999) still renders BELOW child-b (z-index 1),
   because parent-a's whole context (z-index:1) loses to parent-b's context (z-index:2) first. */
```

**How to explain in an interview:** "z-index doesn't compare globally across the whole page — it only compares elements within the same stacking context. If a parent creates its own stacking context with a low z-index, none of its children can ever visually beat a sibling context with a higher z-index, no matter how high the child's own z-index is set. This is why huge z-index values like 99999 sometimes 'don't work' — the real fix is usually raising the z-index of the correct ancestor, not the child."

**Real-world usage:** Modals, tooltips, sticky headers, and dropdown menus all fight z-index battles in real apps — a common production bug is "my modal shows up behind the header" because of exactly this stacking-context trap.

---

## Common Pitfalls Summary

1. **Forgetting `position: relative` on the parent** before using `absolute` on a child → child positions relative to the page instead of the intended container.
2. **`z-index` "not working"** → check if an ancestor created a new stacking context that's already losing to a sibling context.
3. **`sticky` not sticking** → an ancestor with `overflow: hidden/auto/scroll` or insufficient height is clipping the sticky boundary.
4. **`fixed` inside a transformed ancestor** → any ancestor with `transform`, `filter`, `perspective`, or `will-change` set turns into the containing block for `fixed`/`absolute` descendants, breaking "relative to viewport" expectations.
5. **Overlapping elements without opaque backgrounds** → `sticky`/`fixed` headers need a solid background, or content scrolling underneath will visibly show through.

---

## Quick Summary Table

| Value | Removed from flow? | Positioned relative to |
|---|---|---|
| `static` | No | Normal flow, offsets ignored |
| `relative` | No | Its own normal position |
| `absolute` | Yes | Nearest non-static ancestor (or page) |
| `fixed` | Yes | Viewport (ignores scroll) |
| `sticky` | No (until threshold) | Normal flow, then viewport within its container |

| Concept | One-liner |
|---|---|
| Stacking context | An isolated z-index comparison group; children can't escape it |
| `z-index` trap | High child z-index still loses if its parent's context loses |
| `isolation: isolate` | Forces a new stacking context deliberately, without side effects |
