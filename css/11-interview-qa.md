# 11 — Rapid-Fire Interview Q&A

Crisp answers for the most commonly and recently asked senior CSS interview questions. Read top to bottom the night before an interview.

---

**1. What's the difference between `display: none` and `visibility: hidden`?**
`display: none` removes the element entirely — no space is reserved, and it's removed from the accessibility tree. `visibility: hidden` hides it visually but keeps its space in the layout, and screen readers may still skip it but the box remains.

**2. What's the difference between `box-sizing: content-box` and `border-box`?**
`content-box` (default) means `width`/`height` only measure the content — padding/border add extra size on top. `border-box` means `width`/`height` include padding and border, so the element's total rendered size never exceeds what you set.

**3. How is specificity calculated?**
Compare four buckets in order: inline styles, ID selectors, classes/attributes/pseudo-classes, then elements/pseudo-elements. Higher bucket always wins regardless of how many lower-bucket selectors you stack. Equal specificity → last rule in source order wins.

**4. Specificity puzzle: `#nav .item` vs `.nav-item.active` — which wins?**
`#nav .item` = (0,1,1,0). `.nav-item.active` = (0,0,2,0). Compare left to right: ID column, 1 vs 0 → `#nav .item` wins, even though the other selector has two classes.

**5. Specificity puzzle: two rules with identical specificity — which wins?**
Whichever rule is declared **later** in the CSS source (or in a later-loaded stylesheet), regardless of file name or "how specific it looks."

**6. Does `!important` beat inline styles?**
An `!important` declaration in a stylesheet beats a normal inline style. But an inline style with `!important` beats a stylesheet `!important`, because inline importance is still evaluated as the highest-priority tier.

**7. Name 5 ways to center a div (horizontally and vertically).**
(a) `display: flex; justify-content: center; align-items: center;`
(b) `display: grid; place-items: center;`
(c) `position: absolute; top:50%; left:50%; transform: translate(-50%,-50%);`
(d) `margin: 0 auto;` (horizontal-only, needs a fixed width)
(e) Table-cell trick: `display: table-cell; vertical-align: middle; text-align: center;` (legacy).

**8. Why doesn't `margin: 0 auto` center something vertically?**
`auto` margins only resolve based on **available width** in normal block flow — the browser has no defined "leftover vertical space" concept for block elements the same way, so `margin: 0 auto` only centers horizontally, not vertically.

**9. What is a Block Formatting Context (BFC), and why does it matter?**
A BFC is an isolated rendering region where block-level boxes lay out independently of the outside page — floats and margins inside it don't leak out, and it doesn't let outside floats overlap into it. It matters because it fixes "collapsed parent height around floated children" and stops certain margin-collapsing behavior.

**10. How do you create a new BFC?**
`overflow: hidden` (or `auto`/`scroll`), `display: flow-root` (modern, no side effects), `display: inline-block`, `position: absolute`/`fixed`, or `float` on the element itself.

**11. Why does a container collapse to zero height when its children are floated?**
Floated elements are taken out of normal flow, so the parent doesn't "see" their height when calculating its own — unless the parent establishes a BFC (e.g., `overflow: hidden` or `display: flow-root`), which forces it to account for floated content.

**12. What's the "clearfix" hack and why was it needed?**
Before `display: flow-root`, developers added an empty pseudo-element after floated children (`.clearfix::after { content: ""; display: table; clear: both; }`) to force the parent to expand and contain the floats. It's largely obsolete now — `display: flow-root` does the same job with a single clean property.

**13. Why does `z-index: 9999` on a child sometimes still not show on top?**
Because `z-index` only compares elements within the same stacking context. If the child's parent creates its own stacking context with a lower z-index (or none) than a sibling context, the child can never escape and beat that outside sibling, no matter how high its own z-index is.

**14. What creates a new stacking context?**
`position` (relative/absolute/fixed/sticky) + a `z-index` value, `opacity < 1`, `transform`, `filter`, `will-change`, `isolation: isolate`, and the root element.

**15. Explain the difference between `absolute` and `fixed` positioning.**
`absolute` positions relative to the nearest ancestor with non-static positioning (or the page if none exists) and scrolls with the page. `fixed` positions relative to the viewport and stays in place regardless of scrolling.

**16. Why do you need `position: relative` on a parent before using `position: absolute` on a child?**
Without it, the browser looks further up the ancestor chain for a positioned element, and if none exists, positions the child relative to the entire page — not the intended container.

**17. How does `position: sticky` differ from `fixed`?**
`sticky` behaves like `relative` (stays in flow) until the scroll position crosses a threshold (like `top: 0`), then behaves like `fixed` — but only within the bounds of its containing block, not the whole page.

**18. Why might `position: sticky` fail to work?**
A parent has `overflow: hidden/auto/scroll` that clips the sticky boundary, the containing block doesn't have enough height for a scroll threshold to matter, or no `top`/`bottom` offset was actually set.

**19. Flexbox: what's the difference between `justify-content` and `align-items`?**
`justify-content` aligns items along the **main axis** (the direction set by `flex-direction`). `align-items` aligns items along the **cross axis** (perpendicular to the main axis).

**20. Flexbox: what does `flex: 1` actually mean?**
Shorthand for `flex-grow: 1; flex-shrink: 1; flex-basis: 0%;` — the item ignores its natural content size as a starting point and grows/shrinks to take an equal share of available space alongside siblings with the same value.

**21. How do you make equal-height columns without JavaScript?**
Use flexbox: `display:flex` on the container. `align-items` defaults to `stretch`, so all flex items automatically match the height of the tallest item.

**22. How do you build a responsive card grid without writing media queries?**
`display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 16px;` — the browser fits as many 220px-minimum columns as possible and stretches them to fill remaining space.

**23. What's the real difference between `auto-fit` and `auto-fill`?**
Both create as many tracks as fit. `auto-fill` keeps extra empty tracks reserved (invisible but taking space) if there aren't enough items. `auto-fit` collapses those empty tracks to zero width, letting actual items stretch to fill the row.

**24. When would you choose Grid over Flexbox?**
When you need to control rows and columns together (2D layout) — like a full page skeleton with header/sidebar/content/footer — versus flexbox, which only controls a single row or column at a time.

**25. What does the `fr` unit mean in Grid?**
A fraction of the *leftover* space in the grid container after fixed-size tracks are subtracted — e.g., `1fr 2fr` splits remaining space in a 1:2 ratio.

**26. Why is `rem` generally preferred over `em` for font-sizing across a whole app?**
`em` is relative to the current element's font-size, so nested elements with `em` sizing can compound unpredictably. `rem` is always relative to the root font-size, so it stays consistent and predictable no matter how deeply nested the element is.

**27. Why do CSS custom properties (`--variable`) beat Sass variables for theming?**
Sass variables are resolved at compile time and become fixed values in the output CSS — they can't change after the build. CSS custom properties are resolved live in the browser, so you can flip a theme (e.g., toggling `data-theme="dark"`) instantly, without a rebuild.

**28. What does `:where()` do differently from `:is()`?**
Both group selector lists, but `:is()` takes on the specificity of its most specific argument, while `:where()` always contributes zero specificity — useful for writing base/reset styles that remain trivially overridable.

**29. What problem does `:has()` solve that CSS couldn't do before?**
It lets you select a parent (or an earlier sibling) based on its descendants/following content — e.g., styling a `<label>` red only if its paired `<input>` is `:invalid` — something that previously required JavaScript to toggle a class.

**30. What's the difference between a media query and a container query?**
A media query reacts to the whole browser viewport's size. A container query reacts to the size of a specific parent container, letting the same reusable component adapt differently depending on where it's placed on the page.

**31. Why should you animate `transform`/`opacity` instead of `top`/`left`/`width` for smooth animations?**
`transform`/`opacity` can be handled purely in the compositing step (often GPU-accelerated), skipping layout recalculation and repaint. Animating `top`/`left`/`width` forces the browser to recompute layout on every frame, which is slower and can cause jank.

**32. What's the difference between `transition` and `animation`?**
`transition` animates between two states (A → B) and needs a trigger like `:hover` or a class toggle. `animation` with `@keyframes` defines a self-running multi-step sequence that doesn't need a triggering event and can loop infinitely.

**33. What is margin collapsing, and when does it NOT happen?**
Adjacent vertical margins between block elements merge into the larger single margin instead of adding together. It does NOT happen with horizontal margins, flex/grid item margins, or when padding/border/a new BFC separates the two margins.

**34. Why might a parent element appear to have unexpected top margin/space you never set?**
Its first child's `margin-top` "collapsed through" the parent (margin collapsing between parent and first child), effectively pushing the parent's visible position down. Fix with padding, a border, `overflow:hidden`, or `display: flow-root` on the parent.

**35. What's the mobile-first approach and why is it the industry default?**
Write base CSS for the smallest screen, then use `min-width` media queries to progressively add complexity for larger screens. It's preferred because most traffic is mobile, and mobile devices don't have to download/override desktop-oriented CSS they don't need.

**36. What does the viewport meta tag do, and why is it mandatory for responsive design?**
`<meta name="viewport" content="width=device-width, initial-scale=1">` tells mobile browsers to use the real device width instead of a fake, zoomed-out desktop-width default. Without it, media queries won't trigger correctly on real phones.

**37. What's the difference between inline, inline-block, and block elements?**
`block` takes full available width and starts on a new line (`div`, `p`). `inline` only takes as much width as its content and doesn't force a new line, and ignores `width`/`height`/vertical margin (`span`, `a`). `inline-block` behaves like inline (flows with text, no forced new line) but respects `width`/`height`/margin like a block.

**38. Why is overusing `!important` considered bad practice?**
It breaks the normal cascade/specificity resolution — once one rule uses it, overriding it later requires either another `!important` (with equal/higher specificity) or restructuring the CSS, which snowballs into unmaintainable "important wars" over time.

**39. What's the difference between `:nth-child()` and `:nth-of-type()`?**
`:nth-child(n)` counts an element's position among **all** siblings regardless of tag, then checks if it matches both the position and the selector's tag. `:nth-of-type(n)` counts position only among siblings of the **same tag type**, ignoring other tag types in between.

**40. "My CSS isn't applying at all — what do you check first?"**
In order: (1) Is the selector actually correct/matching the element? (2) Is a more specific rule or one loaded later overriding it? (3) Is there a typo in the property/class name? (4) Is the file even linked/loaded (check Network tab)? (5) Is the browser caching an old version (hard refresh)? (6) Is an inherited or `!important` rule elsewhere winning?

**41. What are cascade layers (`@layer`), and how do they change how conflicts are resolved?**
`@layer` groups CSS rules into named layers that are compared **before** specificity — a rule in a later-declared layer always beats a rule in an earlier layer, no matter how specific the earlier rule's selector is. Unlayered CSS always beats any layered CSS. It's used so utility classes (or overrides) can reliably win over component styles without a specificity arms race.

**42. If `.card h1` is in `@layer base` and `.text-lg` is in `@layer utilities` (declared after `base`), which wins?**
`.text-lg` wins, even though `.card h1` has higher specificity (two elements/one combinator vs. one class). Layer order is checked first — `utilities` comes after `base`, so it wins outright before specificity is even compared.

**43. Do you still need Sass for nesting in 2026?**
Not just for nesting — native CSS nesting (`.card { &:hover { ... } } `) is supported in all modern browsers now. Sass is still useful for things native CSS doesn't have, like loops, math functions, and mixins, but nesting alone is no longer a reason to add a build step.

**44. How do scroll-driven animations (`animation-timeline`) differ from a `scroll` event listener in JS?**
`animation-timeline: scroll()` or `view()` ties a `@keyframes` animation's progress directly to scroll position, computed by the browser — no JS listener, no manual style updates on every scroll tick, and it can run smoothly off the main thread. A `scroll` event listener requires throttling/debouncing and manually recalculating styles in JS on every frame.

**45. What problem does CSS anchor positioning (`anchor()`) solve that a library like Popper.js/Floating UI used to solve?**
It lets you position an element (like a tooltip) relative to another element anywhere in the DOM — not just a direct ancestor — purely in CSS, including automatic flipping to the other side if there's no room (`position-try-fallbacks`). Previously this positioning math (and recalculating it on every scroll/resize) had to be done in JS by a library like Popper or Floating UI.

**46. Why can't you smoothly `transition` a plain `--custom-property`, and what fixes it?**
A plain `--variable` is just an opaque string to the browser — it doesn't know if it's a color, a percentage, or a length, so it can't compute in-between values to animate. Registering it with `@property` (giving it a `syntax` like `<percentage>`) tells the browser its real type, which unlocks smooth transitions/animations of that custom property.

**47. What's the practical advantage of `oklch()` over `hsl()` for a design system's color palette?**
`oklch()`'s lightness channel is perceptually uniform — the same lightness value looks equally bright across every hue. `hsl()`'s lightness doesn't match human perception consistently (e.g., yellow and blue at the "same" HSL lightness look very different in brightness), which makes generating a predictable, evenly-stepped color scale harder.

**48. What does CSS Subgrid actually solve, and how would you use it?**
It lets a nested grid item inherit its parent's actual row/column tracks via `grid-template-columns: subgrid` (or rows), instead of creating independent tracks. It's used when items inside sibling grid cells (e.g., cards in a row) need their internal sections — title, body, footer — to align across the row, which previously needed matched fixed heights or JS measuring.

**49. What's the difference between `:focus-visible` and `:focus`, and why did `:focus-visible` become the default for outline styling?**
`:focus` matches any focus, including a mouse click. `:focus-visible` only matches when the browser decides focus should be visibly indicated — generally keyboard/programmatic focus, not a mouse click. It became the default because developers used to write `outline: none` to avoid the "ugly" click-triggered ring — a well-known accessibility anti-pattern that broke keyboard navigation. `:focus-visible` keeps mouse clicks visually clean while preserving the keyboard focus ring.

**50. How does `:focus-within` differ from `:focus-visible`?**
`:focus-within` matches a **parent/ancestor** element whenever it or any of its descendants currently has focus — e.g., highlighting an entire form row when the input inside it is focused. `:focus-visible` only ever matches the focused element itself, and only under the "should visibly show a ring" condition. They solve different problems: one is about *which element* to style (a container vs. the target), the other is about *when* to show a visual indicator.

**51. What's the difference between `object-fit: cover` and `object-fit: contain`?**
`cover` scales the image/video to fill the entire box while preserving aspect ratio, cropping whatever overflows. `contain` scales it to fit entirely inside the box while preserving aspect ratio, which can leave empty space (letterboxing) if the ratios don't match.

**52. What's the difference between `filter` and `backdrop-filter`?**
`filter` applies an effect (blur, grayscale, etc.) to the element and its own content. `backdrop-filter` applies that same kind of effect to whatever is *behind* the element, visible through it — that's the mechanism glassmorphism/frosted-glass UI relies on.

**53. Why can't you just use `filter: blur()` on a translucent overlay to get a frosted-glass effect?**
`filter` on the overlay blurs the overlay's *own* content (including any text/icons on it), not what's behind it. To blur only the background showing through, you need `backdrop-filter`, which specifically targets what's behind the element.

**54. How is `clip-path` different from just using `overflow: hidden`?**
`overflow: hidden` only clips to a rectangle (the element's box). `clip-path` can clip to any custom shape — a circle, polygon, or path — and content outside that shape is also not clickable/interactive, not just visually hidden.

**55. How would you build a horizontally-scrolling carousel that snaps to each slide without JavaScript?**
`scroll-snap-type: x mandatory` on the scrolling container, `scroll-snap-align: start` (or `center`) on each slide. The browser handles snapping natively on scroll-end, including touch/trackpad momentum — no scroll-event listeners needed.

**56. What does the `contain` property actually buy you that you don't get by default?**
By default, a layout/paint change anywhere can force the browser to reconsider the rest of the page, since nothing guarantees the change won't ripple outward. `contain: layout paint` (or `content`/`strict`) tells the browser a subtree is isolated, so it can skip recalculating everything outside it — a real performance win on pages with many independent widgets (chat lists, dashboards).

**57. Why would you write a print stylesheet instead of just letting the browser print the page as-is?**
Screen layouts (navbars, buttons, dark backgrounds, hover-only UI) waste ink and look broken on paper. `@media print` lets you hide non-print elements, force a light background, expand link text (since links aren't clickable on paper), and control page breaks — common for invoices and printable reports.

**58. How do CSS counters differ from just hardcoding numbers in your markup?**
`counter-reset`/`counter-increment` auto-number elements purely via CSS, so inserting or removing an item automatically renumbers everything correctly — no manual renumbering, and no JS required to keep numbers in sync with the DOM.

**59. What's the actual "switch" that makes logical properties like `margin-inline-start` flip for RTL languages?**
The `direction` property (`ltr`/`rtl`), typically driven by `dir="rtl"` on `<html>` set by an i18n library based on locale. Logical properties resolve relative to whatever `direction` is currently set — but `direction` alone doesn't fix everything; directional icons and hardcoded `text-align: left` still need explicit RTL handling.

**60. What's the practical difference between Eric Meyer's CSS reset and normalize.css?**
Eric Meyer's reset zeroes out virtually everything (margins, list styles, borders) so you rebuild from a blank slate. normalize.css instead preserves sensible browser defaults and only patches actual cross-browser *inconsistencies*. Most modern projects use neither in full anymore — just a minimal reset (`box-sizing: border-box` plus a couple of small defaults) since browsers are far more consistent today.

**61. If you need fine-grained scrollbar styling (custom thumb radius, hover color), why can't you rely only on `scrollbar-width`/`scrollbar-color`?**
Those standard properties are intentionally simple (just a width keyword and two colors). Detailed styling — thumb border-radius, hover states, separate corner styling — still requires the older WebKit-only `::-webkit-scrollbar` pseudo-element family, which only works in Chromium/Safari-based browsers.

**62. What is CSS Houdini, at a high level?**
A set of low-level APIs that expose parts of the browser's actual CSS rendering engine to JavaScript, so developers can write custom CSS behavior (like a custom `paint()` worklet used as a `background-image`) that runs as a genuine part of the rendering pipeline instead of a JS-layered workaround. `@property` (typed custom properties) is the most mainstream feature to have shipped out of this effort.

**63. What's the difference between `initial`, `inherit`, `unset`, and `revert`?**
`initial` resets to the CSS spec's default value. `inherit` forces the parent's computed value even on properties that don't normally inherit. `unset` automatically picks `inherit` if the property is naturally inheritable, or `initial` if it isn't. `revert` is different from all three — it resets to the *browser's own native default* for that element (its user-agent stylesheet value), not the CSS spec's generic default, which matters for elements like `<button>` where those two defaults differ.

**64. Why does `100vh` behave badly on mobile browsers, and what fixes it?**
Mobile browsers show/hide their address bar/toolbar while scrolling, but `100vh` is traditionally pinned to the *largest* possible viewport (toolbar hidden) — so on first load, with the toolbar visible, a `100vh` section is actually taller than what's visible, cutting off content. `100dvh` (dynamic viewport height) fixes this by live-tracking the real visible viewport height as the toolbar animates.

**65. What does `env(safe-area-inset-bottom)` do and when would you need it?**
It returns the padding needed to avoid a device's physical screen intrusions — like an iPhone's home-indicator gesture bar or notch — so a fixed bottom nav or fullscreen header doesn't render underneath them. It needs a fallback value (`env(safe-area-inset-bottom, 0px)`) and typically requires `viewport-fit=cover` in the viewport meta tag to take effect.

**66. What's the difference between `prefers-color-scheme` and `forced-colors`?**
`prefers-color-scheme` detects the user's OS-level light/dark preference, letting a site default to the right theme with zero JavaScript. `forced-colors: active` detects a fundamentally different thing — an accessibility mode (like Windows High Contrast Mode) where the OS is *overriding* most of your custom colors entirely; you use it to adjust layout details (like adding a border to a background-image-only button) rather than to fight the user's chosen palette.

**67. Why doesn't a 3D `rotateY()` transform look three-dimensional by default?**
Because it's missing `perspective` — set on the *parent* — which defines the simulated camera distance that creates the depth illusion. Without it, a 3D rotation just looks flattened/squashed. `transform-style: preserve-3d` is also needed if you want nested children to share the same 3D space instead of each flattening onto its own plane.

**68. What does `backface-visibility: hidden` do, and why does a card-flip effect need it?**
It hides an element once it's been rotated far enough (past 90°) that its "back" is facing the viewer. Without it, a flipped card shows a mirrored, backwards version of whichever face has rotated away, instead of cleanly disappearing so the other face can take its place.

**69. What's the difference between `grid-auto-flow: row` (default) and `grid-auto-flow: row dense`?**
The default sparse algorithm never moves an auto-placed item backwards to fill a gap — if a spanning item doesn't fit in the next slot, the browser leaves that slot empty and moves on. `dense` backfills those earlier gaps with later items that do fit, producing a tightly-packed, masonry-like layout without any JavaScript.

**70. Why is `calc()` necessary — why can't you just write `100% - 250px` directly as a value?**
Plain CSS values can't mix unit types — you can't combine a percentage and a pixel value in one raw declaration. `calc()` is the only native way to do that arithmetic, and it's also the underlying mechanism `clamp()`, `min()`, and `max()` are built on top of.

**71. What's the practical difference between BEM, SMACSS, and ITCSS?**
BEM is a *naming convention* (what to call a class). SMACSS is a *categorization system* (which of five buckets — base/layout/module/state/theme — a rule belongs in, based on its purpose). ITCSS is a *load-order architecture* (ordering the whole codebase from generic to specific so load order and specificity increase together). They're not mutually exclusive — a codebase can use ITCSS for file ordering, SMACSS-style categories within that, and BEM names within each category.

**72. What's the legitimate, non-legacy use case for `float` today?**
Wrapping text/inline content around an image or shape, like a magazine layout — its original purpose, especially combined with `shape-outside` for non-rectangular wrapping. The layout use case (float-based multi-column page grids) is legacy and should use Flexbox/Grid instead, but `float` itself isn't deprecated for its original text-wrapping job.

**73. What does `display: contents` actually do, and why would you use it?**
It removes an element's own box from rendering entirely (no background, border, or box) while its children render as if they were direct children of its parent. It's used to "unwrap" a wrapper `<div>` you can't remove from the HTML (e.g., required by a CMS or component library) so Grid/Flexbox treats the *grandchildren* as the real items instead of treating the wrapper itself as a single item.

**74. Why is `text-overflow: ellipsis` alone not enough to truncate text?**
`text-overflow: ellipsis` only defines what to display at a truncation point — it does nothing without `white-space: nowrap` (to force the text onto one line) and `overflow: hidden` (to actually clip the overflow it's marking). All three properties are required together.

**75. What's the difference between `overflow-wrap: break-word` and `word-break: break-all`?**
`overflow-wrap: break-word` only breaks a word mid-way as a last resort, if it would otherwise overflow its container. `word-break: break-all` is more aggressive — it allows breaking anywhere, even when it isn't strictly necessary — typically used for CJK text or unbroken strings like long URLs/hashes.

**76. What's the difference between a variable font and a regular web font?**
A regular `@font-face` font file covers exactly one weight/style. A variable font is a single file that encodes a continuous *range* of a design axis (like weight 100–900), so you can pick any exact value (`font-weight: 550`) instead of being limited to the handful of static weights a foundry chose to ship as separate files — one network request instead of several.

**77. What's the difference between `linear-gradient()`, `radial-gradient()`, and `conic-gradient()`?**
`linear-gradient()` transitions colors along a straight line/angle. `radial-gradient()` transitions outward from a center point in expanding rings. `conic-gradient()` transitions colors *around* a center point, like a color wheel or pie chart — which is why it's the standard trick for CSS-only circular progress indicators.

**78. Why would you use `table-layout: fixed` instead of the default `auto`?**
`auto` forces the browser to inspect every cell's content across the whole table before finalizing column widths — slow on large tables, and it lets one unusually long cell value distort an entire column. `fixed` commits to column widths upfront, which renders faster and lets you safely truncate overflowing cell content with `text-overflow: ellipsis`.

**79. Why doesn't `vertical-align: middle` vertically center a `<div>`?**
`vertical-align` only has a real effect on `inline`, `inline-block`, and `table-cell` elements — it aligns them relative to their surrounding line box or table row, not the whole block-level box. For centering a block element, use Flexbox or Grid instead.

**80. What is `currentColor` and what's a real use for it?**
A color keyword that always resolves to the element's own current `color` value. It's commonly used so an SVG icon's `fill` or an element's `border-color` automatically tracks the text color (e.g., on hover) without repeating the same color value in multiple properties — it's also the default fallback value for `border-color` if none is explicitly set.
