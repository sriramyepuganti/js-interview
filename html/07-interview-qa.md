# 07. HTML Interview Q&A (Rapid Fire, Senior Level)

Crisp answers you can say out loud. Grouped by topic, but treat this as a rapid-fire list — most senior interviews mix these freely.

---

### Semantic HTML

**1. What is semantic HTML and why does it matter?**
Semantic HTML uses tags that describe the meaning of content (`<header>`, `<article>`, `<nav>`) instead of generic boxes (`<div>`). It matters because screen readers use it to navigate, search engines use it to understand structure, and other developers can read the code without needing class names to explain what things are.

**2. Explain like I'm 5: what's the difference between `<div>` and `<section>`?**
A `<div>` is like an unlabeled box — it holds stuff but says nothing about what's inside. A `<section>` is a labeled box that says "everything inside me is one themed group," usually with its own heading.

**3. When would you use `<article>` vs `<section>`?**
Use `<article>` when the content would make sense on its own if pulled out of the page — like a blog post or news story. Use `<section>` for a themed chunk that's part of a larger whole, like a chapter within that article.

**4. How many `<main>` elements can a page have?**
Exactly one. It marks the single, unique main content area of the page, and shouldn't be nested inside `<article>`, `<aside>`, `<header>`, or `<footer>`.

**5. Scenario: your team built an entire page out of `<div>`s with class names like `header`, `nav`, `footer`. What's wrong, and how would you fix it?**
It works visually but has zero semantic meaning — screen readers can't identify these regions, and SEO crawlers get a weaker structural signal. I'd replace the wrapping `div`s with the matching semantic tags (`header`, `nav`, `footer`) since they carry the same meaning to assistive tech and search engines for free, with no visual change needed.

---

### Accessibility

**6. What is ARIA and when should you use it?**
ARIA (Accessible Rich Internet Applications) is a set of attributes that add accessibility info for custom widgets that don't have a native HTML equivalent, like tabs or comboboxes. The golden rule: use a native element if one exists (`<button>` instead of `<div role="button">`) — ARIA is a last resort, not a first choice.

**7. Explain like I'm 5: why shouldn't I build a button with a `<div>` and `onclick`?**
Because a real `<button>` already knows how to be a button — it responds to Tab, Enter, and Space automatically, and screen readers announce it as "button" out of the box. A `<div>` knows none of that; you'd have to manually rebuild all of it yourself, and you'll probably miss something.

**8. What's the difference between `tabindex="0"` and `tabindex="-1"`?**
`tabindex="0"` puts an element into the natural tab order (Tab key can reach it). `tabindex="-1"` removes it from the tab order but still lets you focus it programmatically with `.focus()` — commonly used for focus-trapping inside modals.

**9. Why shouldn't you use a placeholder instead of a label?**
Placeholders disappear once the user starts typing, aren't reliably announced by all screen readers, and don't remain visible for reference. A real `<label>` linked with `for`/`id` stays visible and is always announced.

**10. Scenario: a modal dialog opens, but keyboard users can still tab into content behind it. What's missing?**
Focus management/trapping. When the modal opens, focus should move inside it, Tab should cycle only within its focusable elements, and closing it should return focus to the button that opened it — otherwise keyboard/screen reader users get lost behind the modal.

**11. What does `alt=""` (empty alt) mean vs a missing `alt` attribute?**
`alt=""` explicitly tells screen readers "this image is decorative, skip it" — a valid, intentional choice. A missing `alt` attribute is different: some screen readers will read out the file name or URL, which is noisy and unhelpful.

**12. What are WCAG conformance levels?**
A, AA, and AAA — A is minimum, AA is the common industry/legal target (e.g., 4.5:1 contrast ratio for normal text), AAA is the strictest and rarely mandated.

---

### Forms

**13. What's the difference between GET and POST form submission?**
GET appends form data to the URL as a query string — visible, bookmarkable, has length limits, no file uploads. POST sends data in the request body — hidden from the URL, supports file uploads, no practical length limit.

**14. Why do we need `enctype="multipart/form-data"`?**
It's required whenever a form includes a file upload (`<input type="file">`), because the default encoding (`application/x-www-form-urlencoded`) can't represent binary file data.

**15. Explain like I'm 5: what does the `required` attribute do?**
It tells the browser "don't let the form submit if this box is empty" — the browser blocks submission itself and shows a little error bubble, no JavaScript needed.

**16. How does the browser validate a form before JavaScript even runs?**
Through native validation attributes (`required`, `pattern`, `min`, `max`, `minlength`, `type="email"`, etc.) and the Constraint Validation API (`element.checkValidity()`, `element.validity`) — this all runs automatically on submit unless the form has `novalidate`.

**17. What is `FormData` used for?**
It automatically collects all named fields (including files) from a `<form>` element into an object you can pass directly as a `fetch` request body — useful especially for file uploads, since it handles the multipart encoding for you.

**18. Scenario: you're building a checkout form and want custom error messages styled consistently, not the browser's native tooltip. How would you approach it?**
Add `novalidate` on the form to suppress native tooltips, but keep the validation attributes (`required`, `pattern`) so I can still call `input.checkValidity()`/`input.validity` in JS, and render my own styled error elements linked via `aria-describedby` so they're still accessible.

---

### HTML5 APIs

**19. `localStorage` vs `sessionStorage` vs cookies — when would you use each?**
`localStorage` for data that should persist across sessions and tabs (theme preference). `sessionStorage` for data scoped to a single tab that shouldn't persist (a multi-step form draft). Cookies for anything the server needs on every request, like auth tokens — ideally `HttpOnly` so JS can't read them.

**20. Explain like I'm 5: what is IndexedDB?**
It's like a mini database that lives inside your browser, so a web app can save a lot of organized data and still work even without internet.

**21. What's the difference between `localStorage` and IndexedDB?**
`localStorage` is synchronous, string-only, and small (~5-10MB) — fine for simple key-value settings. IndexedDB is asynchronous, supports structured objects/files, has indexes for querying, and can hold much larger amounts of data — used for offline-first apps.

**22. What can a service worker NOT do?**
It can't access the DOM, the `window` object, or the parent page directly — it runs in a separate thread with no UI access.

**23. Walk me through the service worker lifecycle.**
Install → the SW downloads and typically pre-caches critical assets. Activate → the new SW takes control (often after cleaning up old caches); it may sit in a "waiting" state until old tabs close, unless `skipWaiting()` is called. Fetch → the SW intercepts every network request the page makes and can respond from cache, network, or a mix.

**24. Name a few service worker caching strategies and when to use them.**
Cache-first for static assets that rarely change (images, fonts); network-first for content that should be fresh but can fall back offline; stale-while-revalidate for content that should load instantly from cache while quietly updating in the background; network-only for things that must always be live (POST requests).

**25. What makes a website an installable PWA?**
A web app manifest (`manifest.json` describing name, icons, start URL, display mode), a registered service worker, and HTTPS — together these let the browser offer an "Install" prompt and let the app run in its own window.

**26. What problem do Web Workers solve?**
JavaScript is single-threaded by default, so heavy computation freezes the UI. Web Workers run JS on a separate thread, communicating only via `postMessage`, so long tasks don't block scrolling/clicking.

**27. What are Web Components?**
A native browser feature set — Custom Elements (define your own HTML tags with JS-backed behavior) and Shadow DOM (an isolated, style-scoped mini-DOM inside an element) — used to build reusable, framework-agnostic UI components.

**28. What's the difference between `open` and `closed` shadow DOM mode?**
In `open` mode, `element.shadowRoot` is accessible from outside JS. In `closed` mode, it returns `null` — fully encapsulated, even from external scripts.

**29. When would you pick Canvas over SVG (or vice versa)?**
Canvas for pixel-heavy, performance-critical graphics with many frequently redrawn objects, like games or real-time visualizations — but it blurs when scaled and each shape isn't individually inspectable. SVG for icons/charts/diagrams that need to stay sharp at any size and be interactive/stylable via CSS, but it doesn't scale well to thousands of DOM nodes.

**30. Scenario: you need an offline-capable note-taking web app. Which HTML5 APIs would you combine?**
Service Worker to cache the app shell and enable offline loading, IndexedDB to store the actual notes locally (structured, queryable, large capacity), and a background sync (via the service worker) to push changes to the server once connectivity returns.

---

### Performance and SEO

**31. What is the Critical Rendering Path?**
The sequence the browser follows to show pixels: parse HTML into the DOM, parse CSS into the CSSOM, combine them into a render tree, compute layout, then paint and composite. Performance techniques exist to shorten or unblock steps in this path.

**32. Why is CSS render-blocking but not always JS?**
The browser withholds painting until it has the full CSSOM so it doesn't paint unstyled content and then immediately repaint (avoiding a flash of unstyled content). JS isn't inherently render-blocking, but a plain `<script>` tag without `async`/`defer` *does* block HTML parsing, because the script could use `document.write()` or otherwise change what comes next.

**33. Explain like I'm 5: what does `loading="lazy"` do?**
It tells the browser "don't bother downloading this picture until the user is about to scroll near it" — saves data and speeds up the parts of the page people actually see first.

**34. Why should you never lazy-load your LCP (hero) image?**
Because `loading="lazy"` delays the download until the browser thinks it's about to enter the viewport — but the LCP element needs to load and render as early as possible. Lazy-loading it directly hurts your Largest Contentful Paint score.

**35. Difference between `preload`, `prefetch`, and `preconnect`?**
`preload` = fetch this critical resource now, high priority, for this page. `prefetch` = fetch this at low priority for the likely next page/navigation. `preconnect` = set up the DNS/TCP/TLS connection to a third-party origin ahead of time so the real request has no handshake delay.

**36. What causes Cumulative Layout Shift (CLS), and how do you prevent it at the HTML level?**
Content shifting unexpectedly during load — usually images/embeds/ads without reserved space. Fix by always setting `width`/`height` or `aspect-ratio` on images and embeds so the browser reserves the correct space before the content loads.

**37. What's the difference between `rel="canonical"` and `meta name="robots" content="noindex"`?**
`canonical` tells search engines "this URL is the authoritative version" when the same content is reachable via multiple URLs, consolidating SEO signals into one. `noindex` tells search engines "don't index this page at all," even though `canonical` still allows indexing of the specified target.

**38. Scenario: PageSpeed Insights flags "render-blocking resources." What HTML-level changes would you make?**
Add `defer` to non-critical scripts (or move them to the end of `<body>`), inline critical above-the-fold CSS and load the rest asynchronously (or split CSS so only what's needed for first paint is render-blocking), and `preload` truly critical resources like the main font, while removing anything unused from the head.

**39. What are the three Core Web Vitals, and what does each measure?**
LCP (Largest Contentful Paint) = how fast the main visible content renders. CLS (Cumulative Layout Shift) = how much content unexpectedly jumps during load. INP (Interaction to Next Paint) = how responsive the page feels after a user interaction. All three now factor into Google's search ranking.

**40. Why do WebP/AVIF matter for performance, and how do you support older browsers?**
They compress significantly better than JPEG/PNG at similar visual quality, directly reducing page weight and improving LCP. Use `<picture>` with multiple `<source>` elements (AVIF, then WebP) and a JPEG/PNG `<img>` fallback, so the browser automatically picks the best format it supports.

---

---

### Latest HTML Platform Features (2023–2026)

**41. Why would you use native `<dialog>` instead of a `div`-based modal?**
Because `<dialog>.showModal()` gives you a backdrop, automatic focus trapping, and Escape-to-close for free, plus correct accessibility semantics out of the box. A `div`-based modal requires manually reimplementing all of that in JS, and it's easy to miss a case, like the classic bug where keyboard focus leaks into content behind the modal.

**42. Explain like I'm 5: what does the Popover API do?**
It lets you make a little box (like a dropdown or tooltip) pop up over everything else just by adding a `popover` attribute and a `popovertarget` on a button — no JavaScript needed to open/close it, and it automatically disappears if you click somewhere else or press Escape.

**43. What specific rendering problem does the Popover API's "top layer" solve?**
It solves clipping: normally a dropdown positioned inside a parent with `overflow: hidden` or a low `z-index` context gets visually cut off or buried. Because popovers render in the browser's top layer, they sit above everything regardless of any ancestor's `overflow` or stacking context — no z-index wars.

**44. What is the Invoker Commands API, and why does it exist even though we already have `<dialog>` and popovers?**
It's a new (2025) `command`/`commandfor` attribute pair that lets a button declaratively control another element — like `command="show-modal" commandfor="myDialog"` — with zero JavaScript wiring. Even with native `<dialog>` and popovers, you still needed a few lines of JS to call `.showModal()` on click; Invoker Commands remove that last bit of glue code and standardize the pattern for custom component actions too.

**45. What problem does Declarative Shadow DOM solve that regular Shadow DOM doesn't?**
Regular Shadow DOM is attached via JavaScript (`attachShadow()`), so on a server-rendered page the component's internal markup doesn't exist until JS runs, causing a flash of unstyled/empty content. Declarative Shadow DOM lets the shadow root's HTML be written directly in the server response using `<template shadowrootmode="open">`, so the browser attaches it while parsing HTML, before any JS executes.

**46. What are import maps, and what problem do they solve for native ES modules?**
Native `<script type="module">` only understands relative paths or full URLs in `import` statements — it can't resolve a bare name like `import _ from "lodash"` on its own. An import map (`<script type="importmap">`) lets you declare a mapping from friendly package names to real URLs, so the browser can resolve bare specifiers itself, enabling real dependency usage without a bundler.

**47. What's the difference between `fetchpriority="high"` and `<link rel="preload">`?**
`fetchpriority="high"` re-prioritizes a resource the browser was already going to fetch, just earlier/more urgently in its queue — lightweight. `preload` is heavier-handed: it forces the browser to fetch a resource immediately even if it wouldn't normally prioritize it yet. Use `fetchpriority` to nudge priority on something like the correct LCP image among several above-the-fold images; use `preload` for something the browser genuinely wouldn't discover early enough on its own (like a font referenced deep inside CSS).

**48. Explain like I'm 5: what is the View Transitions API?**
It lets a website smoothly fade or morph from one look to another — like a thumbnail growing into a full photo — and the browser does the hard animation work itself. You just tell it "update the page now" inside `document.startViewTransition()`, and it automatically takes a before-and-after picture and blends them.

**49. Why was the `<search>` element added when `role="search"` already existed?**
`role="search"` worked, but it was an ARIA patch on a generic element (`div` or `form`) — an extra attribute developers had to remember to add. `<search>` makes it a real semantic HTML landmark, just like `<nav>` or `<header>`, so search regions get first-class meaning directly from the tag name, with no ARIA required.

**50. Scenario: you're building a custom overlay (not native `<dialog>`) and need to prevent keyboard users from tabbing into the page behind it. What's the cleanest fix?**
Set the `inert` attribute on the background content container while the overlay is open (`content.inert = true`), then remove it when the overlay closes. It removes the entire subtree from both the tab order and the accessibility tree in one shot, instead of manually setting `tabindex="-1"` and `aria-hidden="true"` on every focusable descendant and tracking them to restore later.

**51. What does `decoding="async"` do, and how does it differ from `loading="lazy"`?**
`loading="lazy"` controls *when* the browser starts downloading an image (deferred until near the viewport). `decoding="async"` controls how the browser handles the CPU work of turning downloaded image bytes into paintable pixels — letting it happen off the critical path instead of potentially blocking the painting of other ready content. They solve different problems and are commonly used together on the same image.

**52. What does the HTML Sanitizer API (`Element.setHTML`) protect against, and why not just use `innerHTML`?**
It protects against XSS: assigning untrusted user content via `innerHTML` executes any `<script>` tags or inline event handlers (`onerror`, `onclick`) embedded in it. `element.setHTML()` sanitizes the string first, natively stripping those dangerous parts while keeping safe formatting tags, doing in the browser what a library like DOMPurify does today in userland.

---

### Topics You Might Have Missed

**53. What's the difference between `srcset`/`sizes` and `<picture>` — when would you use each?**
`srcset` + `sizes` is for resolution switching: the same image content at different pixel dimensions, letting the browser pick the best-sized file for the current viewport/density — a pure performance optimization. `<picture>` with `<source media="...">` is for art direction: serving a genuinely different crop or composition per breakpoint (e.g., a tight portrait crop on mobile vs. a wide landscape on desktop), which `srcset` alone can't do since it only varies size, not content.

**54. Scenario: your hero banner looks great on desktop but is an unreadable sliver on mobile. How do you fix this at the HTML level?**
This is an art-direction problem, not a resolution problem, so `srcset` alone won't fix it. I'd use `<picture>` with a `<source media="(max-width: 600px)">` pointing to a separately cropped, mobile-optimized image, and keep the wide desktop image as the fallback `<img>`.

**55. Why does `sizes` matter if you already have `srcset`?**
`srcset` only lists candidate files and their intrinsic widths — it doesn't tell the browser how big the image will actually be rendered on the page. `sizes` fills that gap (e.g., "100vw on mobile, 50vw on desktop") so the browser can correctly match a rendered size against the available `srcset` candidates instead of guessing.

**56. What does the `sandbox` attribute on an `iframe` actually do, and what's the danger of combining `allow-scripts` with `allow-same-origin`?**
`sandbox` strips a third-party `iframe` down to near-zero privileges by default (no scripts, forms, popups, or same-origin access), and you re-enable only what's needed. Combining `allow-scripts` and `allow-same-origin` together is dangerous because the sandboxed frame's own JS can then remove its `sandbox` attribute from within, effectively escaping the sandbox entirely — so that pairing should only be used for fully trusted content.

**57. Explain like I'm 5: what is Content Security Policy (CSP)?**
It's a list of "approved sources" you give the browser for scripts, images, and other resources. Even if something bad sneaks into your page's HTML, the browser will refuse to run it if it's not on the approved list — like a bouncer checking IDs at a door, even for guests who already got inside.

**58. Why is CSP considered "defense in depth" against XSS rather than the primary fix?**
Because the primary fix is always sanitizing/escaping untrusted input before it ever reaches the DOM. CSP is a safety net for when that sanitization is missed somewhere — even if an attacker's `<script>` tag makes it into the page, a strict CSP (especially one blocking inline scripts) means the browser still won't execute it.

**59. What's the security difference between `element.innerHTML = userInput` and `element.textContent = userInput`?**
`innerHTML` parses the string as real HTML — if `userInput` contains something like `<img src=x onerror="...">`, that handler executes immediately, which is a classic XSS vector. `textContent` never parses its input as markup; it's inserted as literal characters, so the same malicious string would just show up as visible text on the page, harmless.

**60. What's the difference between `textContent` and `innerText`?**
`textContent` returns/sets all text nodes regardless of CSS, including text inside `display: none` elements, and is fast since it doesn't need layout info. `innerText` only returns text that's actually visually rendered (it respects CSS visibility and line breaks), but it's slower because it has to force a layout/reflow to figure out what's visible.

**61. Scenario: you need to render a comment field that supports bold/italic/links, but the content comes from users. How do you do it safely?**
I wouldn't assign the raw string to `innerHTML` directly. I'd sanitize it first — either with a library like DOMPurify or the native `Element.setHTML()` sanitizer API — which strips dangerous tags/attributes (`<script>`, `onerror`, `javascript:` URLs) while preserving safe formatting tags, and only then assign the cleaned result to `innerHTML`.

**62. Why would a screen reader fail to correctly announce a plain `<table><tr><td>` grid of numbers, and how do you fix it?**
Without `<th>`/`scope`, a screen reader has no way to associate a data cell with its column or row header — it just reads an isolated number with zero context. The fix is using `<th scope="col">` for column headers and `<th scope="row">` for row headers, plus a `<caption>` describing the table, so the screen reader can announce something like "142, September, West Region" instead of just "142".

**63. What's the practical benefit of `<thead>` beyond semantics?**
Browsers can repeat the `<thead>` row(s) automatically at the top of every page when a long table is printed, and `<tbody>`/`<tfoot>` let you independently scroll or style header/body/footer sections in CSS — benefits you lose with an unstructured `<table><tr><td>` layout.

**64. Why does `autoplay` on a `<video>` usually require `muted` as well?**
Browsers block autoplay-with-sound by default as an anti-annoyance/UX policy — unexpected audio on page load is one of the most common complaints users have. Pairing `autoplay` with `muted` is the one combination browsers reliably allow without a user gesture.

**65. When would you use inline `<svg>` instead of `<img src="icon.svg">`?**
When the icon needs to be styled or scripted by the page — e.g., changing `fill` to match text color on hover, animating a path, or reacting to a theme toggle. Inline SVG becomes real DOM, so page CSS/JS can reach every shape inside it; an `<img>`-referenced SVG is opaque and isolated, which is simpler and cacheable but can't be styled from outside.

**66. What's the real-world use case for `data-*` attributes, and why not just use a class name?**
`data-*` cleanly separates "how this looks" (`class`, reserved for CSS) from "what this element means to JS" (a state, an ID, a test hook). Common uses: JS behavior hooks (`data-action="close-modal"`) read via event delegation, passing server-rendered IDs into client JS (`data-product-id`), and test selectors (`data-testid`) that won't break when CSS classes are refactored — overloading `class` for these purposes (`class="js-delete-btn"`) mixes concerns and is fragile.

---

### Newly Added Topics (Character Encoding, Native Form Controls, ARIA Landmarks, History/Intersection Observer APIs, Structured Data, `<details>`, Global Attributes)

**67. What happens if a page is missing `<meta charset="UTF-8">` or declares the wrong charset?**
The browser may decode the page's bytes using the wrong rulebook, producing "mojibake" — garbled characters like `Ã©` instead of `é`, or visible replacement characters (`�`). Always declare `UTF-8` explicitly and make sure the server actually serves the bytes as UTF-8 to match.

**68. Why do we need HTML entities like `&lt;` and `&amp;` at all?**
Because `<` and `&` have special meaning to the HTML parser (`<` starts a tag, `&` starts an entity) — writing them literally in text would either break the markup or be misinterpreted. Entities let you display those reserved characters as plain text instead. This is also why assigning user input to `textContent` (rather than building raw HTML strings) is safe — the browser auto-escapes these characters for you.

**69. What's the difference between `<select>` and `<datalist>`?**
`<select>` is a closed dropdown — the user can only choose one of the exact options provided. `<datalist>` pairs with a normal `<input list="...">` and only offers *suggestions* — the user can still type any value, including one not in the list. Don't use `<datalist>` when you need to force a value from a fixed set.

**70. What's the difference between `<progress>` and `<meter>`?**
`<progress>` represents how much of a *task* is complete (determinate or indeterminate) — file uploads, wizard steps. `<meter>` represents a *scalar value within a known range*, like a gauge — disk usage, password strength, a rating. They're not interchangeable: `<meter>` isn't about "how much is done," it's about "where does this value fall."

**71. What ARIA landmark role does `<nav>` carry automatically, and why does that matter?**
`<nav>` implicitly carries `role="navigation"`. It matters because it means using the real semantic tag already gives screen readers the same "jump to this landmark" capability that `role="navigation"` on a `div` would require you to add by hand — semantic HTML tags aren't just nicer names, they come with real ARIA semantics built in for free.

**72. Scenario: a page has two `<nav>` elements — a main menu and a footer link list. How would a screen reader user tell them apart when jumping between landmarks?**
By default they'd both just announce as "navigation," which is ambiguous. Give each a distinct `aria-label` (e.g. `aria-label="Primary"` and `aria-label="Footer"`) so landmark navigation announces them as separate, identifiable regions.

**73. How does `history.pushState` make single-page apps work with the browser's back button?**
`pushState` changes the URL and adds an entry to the browser's session history without triggering a full page reload, so the address bar and back/forward buttons behave normally while the app stays a single in-memory page. The `popstate` event then fires when the user actually clicks Back/Forward, letting the app re-render the correct view — but `popstate` does *not* fire for your own `pushState`/`replaceState` calls, so the app must handle rendering after both cases itself.

**74. Why is `IntersectionObserver` preferred over listening to the `scroll` event to detect visibility?**
`scroll` fires very frequently and forces you to manually call `getBoundingClientRect()` in the handler, which can trigger a layout reflow and cause jank — all on the main thread. `IntersectionObserver` reports visibility changes asynchronously and efficiently, off that hot path, without you writing throttling logic yourself.

**75. Scenario: you need infinite scroll on a product list. Which native API would you reach for, and how?**
`IntersectionObserver`. Place an invisible "sentinel" element at the bottom of the list and observe it; when it intersects the viewport (`entry.isIntersecting`), fetch and append the next page of products, and keep observing the new sentinel position.

**76. What's the difference between microdata and JSON-LD for structured data, and which does Google prefer?**
Microdata uses `itemscope`/`itemtype`/`itemprop` attributes woven directly into your visible HTML. JSON-LD is a separate `<script type="application/ld+json">` block containing the same information as plain JSON, fully decoupled from the visible markup. Google explicitly recommends JSON-LD because it's easier to generate and validate without restructuring your page's HTML.

**77. Explain like I'm 5: what does `<details>`/`<summary>` do?**
It's a built-in "click to expand" box — you click the `<summary>` line and the content underneath shows or hides, with no JavaScript needed, and it already works correctly with the keyboard and screen readers.

**78. How do you make multiple `<details>` elements behave like a single accordion, where opening one closes the others?**
Give them the same `name` attribute (e.g. `name="faq-group"`). Newer browsers automatically treat same-named `<details>` elements as an exclusive group — no JS required.

**79. What's the risk with `contenteditable`, and what's it actually used for?**
`contenteditable="true"` makes any element directly editable, which is the raw primitive most rich-text/WYSIWYG editors (comment boxes, simplified CMS editors) are built on top of — but the HTML it produces on edit/paste is often messy and browser-inconsistent, so real editors layer sanitization/normalization logic on top rather than trusting the raw output directly.

**80. Why should you be cautious with the `autofocus` attribute, and how many should a page have?**
`autofocus` immediately steals keyboard focus the instant the page loads, which can skip past something more important (a cookie banner, a skip link) for a keyboard or screen reader user who wasn't expecting it. A page should have at most one `autofocus` element, and only where jumping straight to it is genuinely the right UX, like a search-first homepage.

---

### Tricky Gotchas and Common Misconceptions

**81. What happens if you write `<form id="outer"><input name="a"><form id="inner"><input name="b"></form></form>`? Does the browser produce two nested forms?**
HTML explicitly forbids nesting `<form>` elements — a `<form>` can't be a descendant of another `<form>`. When the parser hits the inner `<form>` start tag while already inside an open form, it's a parse error and the token is simply ignored: no second form element is created, and both inputs end up as children of the single outer form. So `document.querySelectorAll('form')` on that markup returns just one form, not two, and both `a` and `b` submit as part of the same form.

**82. Two elements on a page share `id="user-name"` by mistake. What does `document.getElementById('user-name')` return, and does the browser throw an error?**
Nothing errors — duplicate `id`s are invalid HTML per spec (`id` must be unique in a document), but browsers don't enforce that at parse time. `getElementById` simply returns the first matching element in document order and silently ignores the rest. This makes duplicate-id bugs sneaky: `querySelector('#user-name')` also returns only the first, but `querySelectorAll('[id="user-name"]')` will reveal both, and a CSS rule like `#user-name { color: red }` will style every one of them, not just one.

**83. A `<label for="qty">Quantity</label>` points at a `disabled` `<input id="qty">`. Does clicking the label do anything?**
No. Labels work by forwarding focus and the default click action to their associated control, but a `disabled` control can't receive focus or be activated at all — the browser has already taken it out of the interaction path. So clicking the label does nothing observable: no focus, no `input`/`change` event, nothing. This is true whether the association is via `for`/`id` or by physically wrapping the input inside the `<label>`; disabling the control neutralizes the label either way.

**84. A `<form>` contains `<button onclick="doSomething()">Recalculate</button>` with no `type` attribute. What happens when a user clicks it?**
It submits the form and reloads/navigates the page, in addition to running `doSomething()`. Inside a `<form>`, a `<button>` with no explicit `type` defaults to `type="submit"` — this is one of the most common real-world bugs: a developer adds a button purely to trigger some JS, the form submits unexpectedly, and (if there's no `action`) the page just reloads, wiping out any in-progress state. The fix is always to add `type="button"` explicitly whenever a button inside a form isn't meant to submit it.

**85. Is `<img src="cat.png">` (no trailing slash) valid HTML5, or do you need `<img src="cat.png" />`?**
`<img>` is valid exactly as written — void elements like `img`, `br`, `input`, and `hr` never have a closing tag or content, so there's nothing to "close." The trailing slash you sometimes see (`<img />`) is a leftover XHTML convention; HTML5 parsers accept it but completely ignore it, so it has zero effect either way. It only causes trouble if attribute quoting is missing right before it, e.g. `<img src=cat.png/>`, where the slash gets swallowed into the unquoted `src` value instead of being discarded.

**86. What does the browser actually do with `<div/>Hello</div>`?**
The self-closing slash on `<div/>` is silently ignored — it only has real closing power on void elements and foreign elements like SVG/MathML, not on ordinary HTML elements. So `<div/>` is treated as a plain, still-open `<div>`, "Hello" becomes its text content, and the following `</div>` is what actually closes it — there's no second, sibling `<div>`. Writing `<div />` expecting a self-closing tag (a common JSX habit) silently does the opposite of what you'd expect in real HTML parsing.

**87. A page has `<script>console.log(document.getElementById('footer'))</script>` sitting in the `<head>`, before `<footer id="footer">` appears in the `<body>`. What gets logged?**
`null`. A plain `<script>` with no `defer`/`async` runs synchronously at exactly the point the parser reaches it, and parsing pauses until it finishes — but at that moment, everything after that point in the document, including the `<footer>`, hasn't been parsed into the DOM yet. This is exactly why old-school scripts were placed at the very bottom of `<body>`, and exactly what `defer` fixes today: it still runs before `DOMContentLoaded`, but only after the whole document has been parsed.

**88. If you want content completely invisible to a screen reader, does it matter whether you use `display: none`, `visibility: hidden`, or `aria-hidden="true"`?**
For screen readers specifically, `display: none` and `visibility: hidden` both work — either one removes the element from the accessibility tree entirely, so assistive tech skips it just like sighted users don't see it. `aria-hidden="true"` also removes it from the accessibility tree, but with one crucial difference: it does nothing visually — the element stays fully visible on screen while being invisible to assistive tech, which is the opposite of what most people assume and can create a confusing mismatch (sighted users see it, screen reader users don't) if misused.

**89. You turn a `<div>` into a button with `<div role="button" tabindex="0" onclick="...">`. Is it now keyboard-equivalent to a real `<button>`?**
Not automatically. A native `<button>` fires its click behavior on both Enter and Space by default. A `<div>`, even with `role="button"` and `tabindex="0"`, only gets `onclick` triggered by an actual mouse/pointer click — pressing Space or Enter on it does nothing unless you add your own `keydown` listener that checks for both keys and manually invokes the same action (and calls `preventDefault()` on Space, since the browser's default behavior for Space is to scroll the page). `role="button"` only changes what's *announced*; it grants none of the *behavior* for free.

**90. Is `<b>Warning</b>` semantically the same as `<strong>Warning</strong>`? What about `<i>` vs `<em>`?**
No — despite rendering identically (bold/italic) by default, they mean different things. `<strong>` and `<em>` carry real semantic weight — importance and stress emphasis, respectively — which screen readers can use to change intonation, and which carries meaning independent of any CSS. `<b>` and `<i>` are purely stylistic ("make this bold/italic for some non-important reason," like a keyword or a foreign phrase), with no implication of importance or emphasis to assistive technology. Swapping one pair for the other silently loses or fabricates semantic meaning even though the page looks unchanged.

**91. You set `autocomplete="off"` on a login form's password field to stop the browser from offering to save it. Does that actually work?**
Usually not, in most modern browsers. Password managers deliberately override `autocomplete="off"` on username/password fields — browsers decided that letting users save and autofill credentials is more important for security and usability than honoring that specific request, so the save prompt and autofill suggestions still appear anyway. `autocomplete="off"` still works for genuinely different-purpose fields (a one-time code, a CAPTCHA answer), just not reliably for the login use case most developers reach for it for.

**92. `<input type="number" id="qty">` — after the user types 5, what does `document.getElementById('qty').value` return: the number `5` or the string `"5"`?**
The string `"5"` — `HTMLInputElement.value` is always a string, no matter what the `type` attribute is. If you need the actual numeric value without manually parsing it, use `.valueAsNumber` instead, which returns a real `Number` (or `NaN` if the field is empty or not a valid number). Forgetting this and doing arithmetic directly on `.value` (e.g. `input.value + 1`) is a classic bug that produces string concatenation like `"51"` instead of `6`.

**93. A form has an unchecked `<input type="checkbox" name="subscribe">` and a `<input type="text" name="promo" disabled value="SAVE10">`. When the form is submitted (or read via `new FormData(form)`), what values come through for `subscribe` and `promo`?**
Neither key appears at all — not as `false`/empty, but completely absent from the submitted data. Only "successful" controls are included: a checkbox only contributes its value when checked, and a `disabled` control is excluded from submission entirely regardless of its value. This trips people up on the server side expecting `subscribe: false`; if you need to know a checkbox was deliberately left unchecked, you have to infer it from the key's absence, or add a hidden fallback input.

**94. Does `<input type="hidden" name="token" required>` actually block form submission if the value is somehow empty?**
No — `required` has no effect on `type="hidden"` inputs. The spec explicitly excludes hidden inputs from constraint validation altogether (a user can't be expected to "fill out" a field they can't see), so `required`, `:invalid`, and `checkValidity()` simply don't apply to it, no matter what's in `value`. Anything a hidden field needs to guarantee (like a non-empty CSRF token) has to be enforced by the code that sets its value or validated server-side — the browser will let the form submit either way.

**95. What's wrong with setting `tabindex="1"`, `tabindex="2"`, `tabindex="3"` on three elements to control their tab order?**
Any positive `tabindex` value hijacks the natural DOM-order tab sequence — elements with positive values are visited first, in ascending numeric order, before any `tabindex="0"` or naturally focusable elements, regardless of where they actually sit visually or in the markup. This is widely considered an anti-pattern because it's fragile (adding one new interactive element later means renumbering everything) and creates a tab order that no longer matches the visual/reading order, confusing keyboard and screen reader users. The correct fix is to reorder the actual DOM/source order and use `tabindex="0"` if a non-natively-focusable element needs to join the normal tab sequence.

---

## Quick Self-Check

If you can answer all 95 of these out loud, in your own words, in under 6 lines each, you're in solid shape for a senior HTML-focused interview round. Pair this with the deeper explanations in files 01–06 (file 08 for the newest platform features, file 09 for security/tables/media/SVG/`data-*`/global-attribute gaps) for the "why" behind each answer.
