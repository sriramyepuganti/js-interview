# 08. Latest HTML Platform Features (2023–2026)

These are native browser features shipped recently that senior interviewers increasingly ask about, precisely *because* they replace patterns that used to require a JS library (modals, popovers, page transitions) or a bundler feature (import maps). Knowing these signals you keep up with the platform, not just React/Vue idioms.

Browser support note: most of these are Chromium-first. Where a feature isn't yet universal (Safari/Firefox), that's called out — always mention this trade-off in an interview, it shows maturity.

---

## The `<dialog>` Element

**What is it?**
`<dialog>` is a native HTML element for modal (and non-modal) dialogs/popups. The browser handles focus trapping, a backdrop, `Escape`-to-close, and accessibility semantics (`role="dialog"`) automatically — no ARIA hand-rolling, no JS focus-trap library.

```html
<dialog id="confirmDialog">
  <form method="dialog">
    <p>Are you sure you want to delete this item?</p>
    <button value="cancel">Cancel</button>
    <button value="confirm">Delete</button>
  </form>
</dialog>

<button id="openBtn">Delete item</button>

<script>
  const dialog = document.getElementById('confirmDialog');
  document.getElementById('openBtn').addEventListener('click', () => {
    dialog.showModal(); // modal: traps focus, shows ::backdrop, blocks page interaction
    // dialog.show();  // non-modal alternative: no backdrop, page stays interactive
  });

  dialog.addEventListener('close', () => {
    console.log('Dialog closed with value:', dialog.returnValue); // "cancel" or "confirm"
  });
</script>
```

**Why was it invented / what problem does it solve?**
Before `<dialog>`, every "modal" was a `<div>` with `position: fixed`, a manually built backdrop, and JS to: trap Tab focus inside it, restore focus to the trigger button on close, close on `Escape`, and add `role="dialog"` + `aria-modal="true"` by hand. Teams either wrote this themselves (easy to get wrong — see interview Q10 in file 07 about focus leaking behind a modal) or pulled in a library just for a modal. `<dialog>` moves all of that correctness into the browser itself.

**Real-time / real-world usage**
Confirmation dialogs, "sign up" modals, image lightboxes, cookie-consent banners. Design systems (MUI, shadcn/ui, native Chakra-style libraries) are increasingly building their `Modal`/`Dialog` components as a thin wrapper around native `<dialog>` instead of reimplementing focus-trapping in JS.

**How to explain this in an interview (simple English)**
"`<dialog>` is a built-in modal element. Calling `.showModal()` gives you a backdrop, focus trapping, and Escape-to-close for free — things teams used to hand-roll with a `<div>` and a focus-trap library. `.show()` gives you a non-modal version. It also has a built-in `close` event and `returnValue`, so `<form method="dialog">` can close it and report which button was pressed without any JS."

---

## Popover API

**What is it?**
A native way to build "popover" UI — tooltips, dropdown menus, comboboxes, toast notifications — using a plain `popover` attribute instead of building visibility logic, positioning z-index stacking, and light-dismiss (click-outside-to-close) behavior yourself.

```html
<button popovertarget="infoPopover" popovertargetaction="toggle">
  More info
</button>

<div id="infoPopover" popover>
  <p>This popover closes automatically if you click outside it or press Escape.</p>
</div>
```

- `popover` attribute on the target element turns it into a popover: hidden by default, rendered in the browser's **top layer** (above everything, no z-index wars), and automatically light-dismissed (click outside / Escape closes it).
- `popovertarget="id"` on a `<button>` links it to the popover by id.
- `popovertargetaction="toggle" | "show" | "hide"` controls what the button does (defaults to `toggle`).

```html
<!-- popover="manual" opts out of light-dismiss / only-one-open-at-a-time behavior -->
<div id="toast" popover="manual">Saved!</div>
```

**Why was it invented / what problem does it solve?**
Building a dropdown/tooltip correctly used to require: `position: absolute` + manual z-index management (popovers routinely get clipped by a parent's `overflow: hidden`), a `document.addEventListener('click', ...)` listener to detect outside clicks and close it, and an `Escape` key handler. The **top layer** rendering solves the overflow/z-index clipping problem specifically — a popover is no longer a descendant of a clipped/scrolled container, so `overflow: hidden` on an ancestor can no longer hide it.

**Real-time / real-world usage**
Menu dropdowns, user profile flyouts, "..." action menus, non-critical toast notifications, tooltips on hover/focus. Increasingly paired with the CSS **Anchor Positioning API** (`anchor-name`/`position-anchor`) to position the popover relative to its trigger button without JS math.

**How to explain this in an interview (simple English)**
"The Popover API lets me make a dropdown or tooltip with just a `popover` attribute and `popovertarget` on the button — no JS for open/close logic. The browser renders it in a 'top layer' so it's never clipped by `overflow: hidden` on a parent, and it auto-closes on outside click or Escape. It's basically native light-dismiss UI."

---

## Invoker Commands API (`command` / `commandfor`)

**What is it?**
A very new (2025) declarative way to make a `<button>` control *another* element's behavior — like opening a `<dialog>` or a popover — using plain HTML attributes, with zero JavaScript.

```html
<button command="show-modal" commandfor="myDialog">Open dialog</button>
<dialog id="myDialog">
  <p>Hello from a dialog opened with zero JS!</p>
  <button command="close" commandfor="myDialog">Close</button>
</dialog>
```

- `commandfor="id"` — the target element this button controls.
- `command="..."` — the action to perform on that target. Built-in commands include `show-modal`, `close`, `request-close` (for `<dialog>`), and `toggle-popover`, `show-popover`, `hide-popover` (for popovers).
- You can also listen for a `CommandEvent` in JS to react to custom commands (`command="--my-custom-action"`, note the `--` prefix for author-defined commands), enabling fully declarative custom widgets.

```html
<!-- Custom command example -->
<button command="--increment" commandfor="counter">+1</button>
<div id="counter" data-count="0">0</div>

<script>
  document.getElementById('counter').addEventListener('command', (e) => {
    if (e.command === '--increment') {
      const el = e.target;
      const next = Number(el.dataset.count) + 1;
      el.dataset.count = next;
      el.textContent = next;
    }
  });
</script>
```

**Why was it invented / what problem does it solve?**
Even with `<dialog>` and the Popover API, you still needed a few lines of JS just to wire a button's `click` to `dialog.showModal()` or `popover.togglePopover()`. Invoker Commands remove that last bit of "glue JS" for the most common open/close interactions, and — more importantly — standardize a pattern for *any* button-controls-another-element interaction, including custom component behavior, all discoverable directly in the markup (readable without opening a JS file).

**Real-time / real-world usage**
Still bleeding-edge (Chrome 135+ as of 2025) — expect interviewers to ask "have you heard of it" rather than "have you shipped it in production." It's most relevant for design systems wanting fully declarative, JS-optional dialog/popover triggers, and progressive enhancement (the button still exists and is styleable even before JS/behavior loads, since the action is a plain attribute).

**How to explain this in an interview (simple English)**
"It's a brand-new attribute pair — `command` and `commandfor` — that lets a button control another element declaratively, like `command=\"show-modal\" commandfor=\"myDialog\"` to open a dialog with zero JavaScript. For custom behavior, you give it a `--custom-name` and listen for a `command` event in JS. It's the natural next step after `<dialog>` and the Popover API — removing the last few lines of wiring-up JS."

---

## Declarative Shadow DOM

**What is it?**
A way to define a Web Component's Shadow DOM directly in server-rendered/static HTML, using a `<template shadowrootmode="open">` inside the custom element — so the shadow root exists and is styled/rendered *before* any JavaScript runs.

```html
<user-card>
  <template shadowrootmode="open">
    <style>
      .card { border: 1px solid #ccc; padding: 1rem; border-radius: 8px; }
    </style>
    <div class="card"><slot></slot></div>
  </template>
  <p>Hello, I'm inside the shadow DOM's slot!</p>
</user-card>
```

The browser parses this `<template>` and automatically attaches it as the element's shadow root — no `element.attachShadow()` JS call needed for the *initial* render.

**Why was it invented / what problem does it solve?**
Regular Shadow DOM (see file 05) is created imperatively in JS (`this.attachShadow({ mode: 'open' })` inside a custom element's constructor). That means on first paint — especially with server-side rendering — the shadow content doesn't exist yet, causing a **flash of unstyled/empty content** until JS downloads, parses, and runs. Declarative Shadow DOM lets the *server* stream the shadow root's markup as part of the initial HTML response, so the component renders correctly even before hydration — critical for SSR-heavy frameworks and Web Components used without a framework at all.

**Real-time / real-world usage**
Used by frameworks/tools doing server-side rendering of Web Components (e.g., some Lit-based SSR setups) to avoid FOUC (flash of unstyled content) for custom elements. Less commonly hand-written by app developers directly — more of an SSR tooling/library concern, but a strong "do you understand modern Web Components" signal in interviews.

**How to explain this in an interview (simple English)**
"Normally, Shadow DOM is created with JavaScript, so on a server-rendered page there's a flash before it's attached. Declarative Shadow DOM lets you write the shadow root's HTML directly in the markup using `<template shadowrootmode=\"open\">`, so the browser attaches it during HTML parsing — before any JS runs. It fixes the SSR flash-of-unstyled-content problem for Web Components."

---

## Import Maps (`<script type="importmap">`)

**What is it?**
A native browser feature that lets you use **bare module specifiers** (like `import { debounce } from "lodash"`) in ES modules directly in the browser — without a bundler rewriting the import into a real URL.

```html
<script type="importmap">
{
  "imports": {
    "lodash": "https://cdn.jsdelivr.net/npm/lodash-es@4.17.21/lodash.js",
    "components/": "/js/components/"
  }
}
</script>

<script type="module">
  import debounce from "lodash";               // resolved via the import map
  import { UserCard } from "components/user-card.js"; // prefix mapping
</script>
```

**Why was it invented / what problem does it solve?**
Native ES modules (`<script type="module">`) require *full* specifiers — either relative paths (`./utils.js`) or full URLs. Writing `import _ from "lodash"` directly fails in the browser, because the browser doesn't know where "lodash" points to; only bundlers (Webpack, Vite) understood that mapping via `node_modules` resolution. Import maps bring that same "friendly package name → real URL" resolution natively to the browser, which is what makes bundler-free, "just use `<script type=module>`" development actually viable for real projects with dependencies.

**Real-time / real-world usage**
No-build/no-bundler prototyping, small internal tools, and JS frameworks/libraries that offer a CDN-only "no build step" usage mode (e.g., some Vue 3 / Lit / htm-based setups). Also used under the hood by browser-native module CDNs like esm.sh and JSPM's generated import maps.

**How to explain this in an interview (simple English)**
"Import maps let you write `import _ from \"lodash\"` in a native `<script type=\"module\">` and have the browser resolve `\"lodash\"` to a real URL, using a mapping you declare in a `<script type=\"importmap\">` tag. It's what makes bundler-free development with real package names possible in the browser."

---

## `fetchpriority` Attribute

**What is it?**
A hint attribute on `<img>`, `<link>`, and `<script>` that tells the browser how urgently to prioritize fetching that specific resource, overriding the browser's normal heuristic-based priority.

```html
<!-- This is the LCP image: tell the browser to fetch it ASAP, ahead of other images -->
<img src="hero.jpg" alt="Hero" fetchpriority="high" />

<!-- A below-the-fold decorative image: deprioritize it further -->
<img src="footer-decoration.png" alt="" fetchpriority="low" loading="lazy" />

<link rel="stylesheet" href="critical.css" fetchpriority="high" />
```

Values: `high`, `low`, `auto` (default — browser decides).

**Why was it invented / what problem does it solve?**
Browsers already assign internal fetch priorities (a `<link rel="stylesheet">` in `<head>` gets high priority automatically; an `<img>` below the fold gets low priority), but the browser's heuristics don't know your business logic — e.g., which of *several* above-the-fold images is the actual LCP element. Before `fetchpriority`, the only lever for this was `<link rel="preload">`, which is more heavy-handed (forces an early fetch even when the browser wouldn't otherwise consider it low priority). `fetchpriority` is a lighter-weight nudge on a resource the browser would fetch anyway, just re-prioritizing it in the queue.

**Real-time / real-world usage**
Directly targets **LCP** improvement: mark your actual hero/LCP image `fetchpriority="high"`, and deprioritize genuinely non-critical images (`fetchpriority="low"`) so bandwidth is spent on what matters first. Lighthouse explicitly recommends this ("Fetch Priority" audit) when it detects a likely LCP candidate that isn't prioritized.

**How to explain this in an interview (simple English)**
"`fetchpriority=\"high\"` tells the browser 'fetch this one first,' which I'd put on my actual LCP image if the browser's default heuristics don't already prioritize it correctly — for example when there are multiple above-the-fold images. It's lighter-weight than `preload`, since it just reorders the browser's own priority queue instead of forcing an early fetch."

---

## Web Share API (`navigator.share`)

**What is it?**
A JS API that opens the operating system's *native* share sheet (the same one you'd see sharing a photo from a phone's gallery app) directly from a web page, letting the user share a URL/text/files to any app installed on their device (Messages, WhatsApp, Email, etc.).

```html
<button id="shareBtn">Share this page</button>

<script>
  document.getElementById('shareBtn').addEventListener('click', async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: document.title,
          text: 'Check this out!',
          url: window.location.href,
        });
      } catch (err) {
        console.log('Share cancelled or failed:', err);
      }
    } else {
      // Fallback for browsers without support (e.g. desktop Firefox): copy link instead
      await navigator.clipboard.writeText(window.location.href);
      alert('Link copied to clipboard!');
    }
  });
</script>
```

**Why was it invented / what problem does it solve?**
Before this API, "share" buttons on websites meant hand-rolled buttons for each specific platform (a Twitter/X share link, a Facebook share link, a WhatsApp `wa.me` link) — a fixed, hardcoded list that couldn't include apps the website author didn't think of, and looked/behaved nothing like the OS's native sharing experience users already know. `navigator.share()` hands off to whatever the OS already has installed, giving users the exact share menu they'd get from any native app.

**Real-time / real-world usage**
Mobile web articles, e-commerce product pages ("share this product"), and PWAs use this for a native-feeling share button — always with a `navigator.share` feature check and a manual fallback (copy-to-clipboard or a custom share menu), since desktop browser support is inconsistent (Safari/Chrome on mobile support it well; some desktop browsers don't).

**How to explain this in an interview (simple English)**
"`navigator.share()` opens the phone's real native share sheet — the same one you get sharing a photo — instead of a custom row of hardcoded social icons. I'd feature-detect it (`if (navigator.share)`) and fall back to something like copy-link on browsers that don't support it, since support is mobile-first."

---

## View Transitions API

**What is it?**
A native browser API for animating between two visual states of a page — either two totally different DOM states on the *same* document (SPA-style route changes) or, more recently, across full navigations to a *different* document (cross-document/MPA view transitions) — using automatic screenshot-based crossfade/morph animations, styled with CSS instead of hand-written JS animation code.

```html
<style>
  /* Give an element a stable name so the browser tracks it across the transition */
  .hero-image {
    view-transition-name: hero;
  }

  /* Customize the default crossfade for this named element */
  ::view-transition-old(hero),
  ::view-transition-new(hero) {
    animation-duration: 0.4s;
  }
</style>

<script>
  function navigateTo(newState) {
    if (!document.startViewTransition) {
      renderNewState(newState); // fallback: just update the DOM, no animation
      return;
    }

    // startViewTransition takes a callback that updates the DOM;
    // the browser automatically captures before/after screenshots
    // and crossfades/morphs between them.
    document.startViewTransition(() => {
      renderNewState(newState);
    });
  }
</script>
```

```css
/* Cross-document (MPA) view transitions: opt in per page with plain CSS */
@view-transition {
  navigation: auto;
}
```

**Why was it invented / what problem does it solve?**
Smooth page/state transitions (a card expanding into a full detail view, a page crossfading to the next) traditionally required either a heavy JS animation library manually cloning/positioning elements mid-transition, or were simply skipped because they were too much effort for the payoff. `document.startViewTransition()` moves the hard part — capturing old/new visual states and generating the transition — into the browser engine itself; you just update the DOM inside the callback and style the transition with CSS pseudo-elements.

**Real-time / real-world usage**
SPA route transitions (product list → product detail morphing the thumbnail into the hero image), theme toggles (dark/light mode circular reveal animations are a popular showcase demo), and — since cross-document support landed — full traditional multi-page site navigations that now feel like an SPA without any JS routing at all.

**How to explain this in an interview (simple English)**
"`document.startViewTransition()` lets me animate between two DOM states — I give it a callback that updates the DOM, and the browser automatically crossfades/morphs old and new screenshots, styled via `::view-transition-old/new` in CSS. It used to take a JS animation library to do this well; now it's a native browser capability, and it even works for full page navigations now via the `@view-transition` CSS rule, not just SPA state changes."

---

## `<search>` Element

**What is it?**
A semantic landmark element introduced to wrap a page's search functionality (a search form, search input + filters, a search results form) — giving it the same kind of "this is a distinct region" meaning that `<nav>` or `<header>` already give their content.

```html
<search>
  <form action="/search" method="get">
    <label for="q">Search</label>
    <input type="search" id="q" name="q" />
    <button type="submit">Search</button>
  </form>
</search>
```

**Why was it invented / what problem does it solve?**
Before `<search>`, a search form was just a `<form>` (or a `<div>`) with no way to tell assistive technology "this specific region is the site's search functionality," distinct from a generic form (like a login form) or generic navigation. Screen reader users could jump between landmarks (`nav`, `main`, `header`) but had no dedicated landmark for "find the search box" — `<search>` fills that specific gap, similar in spirit to `role="search"` (which it effectively replaces with a real element).

**Real-time / real-world usage**
Site headers with a search bar, e-commerce site search + filter sidebars, and documentation sites' search widgets — wrap the whole search form (input, submit button, and any inline filters/autocomplete) in `<search>` so screen reader users can jump straight to it via landmark navigation.

**How to explain this in an interview (simple English)**
"`<search>` is a new semantic landmark, like `<nav>` or `<header>`, but specifically for wrapping a search form. It replaces the old workaround of `role=\"search\"` on a `<div>`/`<form>`, giving screen reader users a dedicated landmark to jump straight to a page's search functionality."

---

## `inert` Attribute

**What is it?**
A boolean HTML attribute that makes an entire subtree of the DOM — and everything inside it — completely non-interactive: unfocusable, unclickable, and skipped/hidden from assistive technology (removed from the accessibility tree), all with a single attribute and zero JS wiring per child element.

```html
<div id="pageContent" inert>
  <!-- Everything in here is now unclickable, untabbable, and invisible to screen readers -->
  <button>This button can't be clicked or tabbed to</button>
  <a href="/page">Nor can this link</a>
</div>

<dialog id="myDialog">...</dialog>

<script>
  const dialog = document.getElementById('myDialog');
  const content = document.getElementById('pageContent');

  function openDialog() {
    content.inert = true;   // freeze the rest of the page while modal is open
    dialog.showModal();
  }

  dialog.addEventListener('close', () => {
    content.inert = false;  // restore interactivity when the modal closes
  });
</script>
```

(Note: `<dialog>.showModal()` already applies this behavior automatically to everything *outside* the dialog — `inert` is most useful for your *own* custom overlay/modal-like patterns, or for disabling a whole section of the page, like a "loading" overlay, form-in-progress, or an inactive tab panel.)

**Why was it invented / what problem does it solve?**
Before `inert`, "freezing" a section of the page behind a modal meant manually setting `tabindex="-1"` on *every* focusable descendant, tracking and restoring their original `tabindex` values on close, and separately hiding the region from screen readers with `aria-hidden="true"` — easy to get wrong or forget an element (which is exactly the bug described in file 07's interview Q10: keyboard focus leaking into content behind a modal). `inert` does both (remove from tab order + remove from accessibility tree) for an entire subtree in one attribute, correctly, every time.

**Real-time / real-world usage**
Disabling background content behind a custom modal/overlay, freezing inactive tab panels so their contents aren't tabbable while hidden, and disabling a form section while an async action (like a payment submission) is in flight so users can't interact with stale UI.

**How to explain this in an interview (simple English)**
"`inert` makes a whole chunk of the DOM non-interactive in one shot — unfocusable, unclickable, and hidden from screen readers — without having to manually set `tabindex=\"-1\"` and `aria-hidden` on every child. It's exactly the fix for the classic 'focus leaks behind the modal' bug, and native `<dialog>` already does this automatically for content outside it when opened with `showModal()`."

---

## `decoding="async"` (quick note)

**What is it?**
An attribute on `<img>` that hints the browser can decode the image's pixel data off the main thread, asynchronously, instead of potentially blocking rendering of other content while decoding a large image.

```html
<img src="large-photo.jpg" alt="Large photo" decoding="async" loading="lazy" width="1200" height="800" />
```

Values: `async` (decode off the critical path, may show other content first), `sync` (decode and paint together — useful if you need the image to appear atomically with something else), `auto` (default — browser decides).

**Why was it invented / what problem does it solve?**
Decoding a large image (turning compressed JPEG/PNG bytes into raw pixels the GPU can paint) is CPU work. Without a hint, the browser's default behavior can sometimes delay painting *other* already-ready content until a big image finishes decoding. `decoding="async"` tells the browser it's safe to paint other content first and slot the image in once it's ready, avoiding that stall.

**Real-time / real-world usage**
Almost always paired with `loading="lazy"` on below-the-fold images in image-heavy pages (galleries, product grids) — it's a small, low-risk, low-effort addition alongside lazy-loading, with no real downside for typical content images.

**How to explain this in an interview (simple English)**
"`decoding=\"async\"` tells the browser it's fine to decode this image's pixels off the main thread and not hold up painting other content while it does. It's a small, free performance hint I'd add alongside `loading=\"lazy\"` on regular content images."

---

## HTML Sanitizer API (`Element.setHTML`)

**What is it?**
A native browser API for safely inserting untrusted/user-generated HTML into the DOM, automatically stripping dangerous content (like `<script>` tags, inline event handlers such as `onclick`, or `javascript:` URLs) — without needing a third-party sanitization library.

```html
<div id="commentBody"></div>

<script>
  const userComment = '<p>Nice post!</p><script>stealCookies()<' + '/script> <img src=x onerror="alert(1)">';

  const target = document.getElementById('commentBody');

  if (target.setHTML) {
    // Sanitizes automatically: strips <script>, onerror, javascript: URLs, etc.
    target.setHTML(userComment);
  } else {
    // Fallback for browsers without support: use a library like DOMPurify,
    // or at minimum fall back to textContent (loses formatting, but safe).
    target.textContent = userComment;
  }
</script>
```

**Why was it invented / what problem does it solve?**
Directly assigning untrusted HTML via `element.innerHTML = userInput` is a classic **XSS (Cross-Site Scripting)** vulnerability — any `<script>` tag or `onerror`/`onclick` attribute in that string executes with full access to the page (cookies, session, DOM). The conventional fix has always been a third-party library like DOMPurify. The Sanitizer API brings that same "strip anything dangerous, keep safe formatting tags" behavior natively into the browser, maintained and kept up-to-date with new attack vectors by browser vendors instead of an app dependency.

**Real-time / real-world usage**
Rendering user-generated content that legitimately needs *some* HTML (rich-text comments, markdown-rendered-to-HTML previews, pasted rich text) rather than plain text. Still early in browser support (Chrome/Edge ahead of Firefox/Safari as of 2025-2026) — in an interview, mention it as "the native direction this is heading," while noting DOMPurify remains the safe, universally-supported choice today.

**How to explain this in an interview (simple English)**
"`element.setHTML()` is a native way to insert untrusted HTML safely — it strips out `<script>` tags, inline event handlers, and other XSS vectors automatically, the same job DOMPurify does today as a library. I'd still feature-detect and fall back to a library or plain `textContent` for browsers that don't support it yet, since it's not universal across browsers yet."

---

## Quick Summary Table

| Feature | One-liner | Replaces |
|---|---|---|
| `<dialog>` | Native modal/non-modal dialog with focus trap + Escape-to-close | Hand-rolled `div` modal + focus-trap JS |
| Popover API (`popover`, `popovertarget`) | Native dropdown/tooltip with top-layer rendering + light-dismiss | Manual z-index/overflow/outside-click JS |
| Invoker Commands (`command`/`commandfor`) | Declarative button-controls-element wiring, zero JS for common cases | `button.addEventListener('click', ...)` glue code |
| Declarative Shadow DOM | Shadow root defined in server-rendered HTML via `<template shadowrootmode>` | `attachShadow()` JS call (avoids SSR flash) |
| Import maps | Bare module specifiers (`import x from "lodash"`) resolved natively | Bundler module resolution, for no-build setups |
| `fetchpriority` | Per-resource fetch priority hint (`high`/`low`) | Heavier `<link rel="preload">` for re-prioritizing |
| `navigator.share()` | Opens the OS's native share sheet | Hardcoded per-platform social share buttons |
| View Transitions API | Automatic before/after screenshot crossfade/morph, styled via CSS | Hand-written JS transition/animation libraries |
| `<search>` | Semantic landmark for a page's search functionality | `role="search"` on a generic `div`/`form` |
| `inert` | Makes a whole subtree unfocusable + hidden from a11y tree in one attribute | Manual `tabindex="-1"` + `aria-hidden` on every child |
| `decoding="async"` | Lets image pixel-decoding happen off the critical rendering path | No native hint; browser decided (sometimes blocking) |
| `Element.setHTML()` | Native HTML sanitization for untrusted content | DOMPurify / other third-party sanitizer libraries |
