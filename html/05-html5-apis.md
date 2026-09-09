# 05. HTML5 APIs

This file covers the browser platform APIs that HTML5 introduced (or that are commonly grouped under "HTML5 APIs" in interviews): Web Storage, IndexedDB, Service Workers/PWA, Web Workers, Drag and Drop, Geolocation, Canvas, and Web Components.

---

## Web Storage: localStorage vs sessionStorage vs Cookies

**What is it?**
All three are ways to store small pieces of data in the browser, tied to a specific origin (domain), but they differ in lifetime, size, and whether the data is sent to the server automatically.

**Why was it invented / what problem does it solve?**
Cookies were the *only* client-side storage mechanism for a long time, but they were designed for a completely different purpose: telling the server "remember this session" — they're automatically attached to every HTTP request, which is wasteful and slow if you're storing anything bigger than a small token. `localStorage`/`sessionStorage` (part of the Web Storage API, HTML5) were introduced to give web pages a simple key-value store *purely on the client*, with much higher capacity, that never gets sent over the network.

```js
// localStorage — persists until explicitly cleared
localStorage.setItem('theme', 'dark');
console.log(localStorage.getItem('theme')); // "dark"
localStorage.removeItem('theme');
localStorage.clear(); // wipes everything for this origin

// sessionStorage — cleared when the tab/window closes
sessionStorage.setItem('draftText', 'Hello world');

// cookies — set via document.cookie, sent to server with every matching request
document.cookie = "user=John; path=/; expires=Tue, 19 Jan 2038 03:14:07 GMT; Secure; SameSite=Strict";
```

| | `localStorage` | `sessionStorage` | Cookies |
|---|---|---|---|
| Capacity | ~5–10 MB | ~5–10 MB | ~4 KB |
| Lifetime | Until explicitly cleared | Until tab/window closes | Set via `expires`/`max-age`, or session-only |
| Sent to server automatically? | No | No | **Yes**, on every matching request (adds overhead) |
| Scope | Per origin, shared across all tabs | Per origin, **per tab** (each tab gets its own) | Per origin + path, shared across tabs |
| Accessible from JS | Yes (unless `HttpOnly`, which only applies to cookies) | Yes | Yes, unless `HttpOnly` flag set |
| Typical use case | Theme preference, cached non-sensitive data, feature flags | Multi-step form drafts, wizard state within one tab | Auth session tokens, anything the server needs on every request |

**Real-time / real-world usage**
- `localStorage`: remembering UI preferences (dark mode toggle, sidebar collapsed state), caching non-sensitive API responses to reduce repeat network calls.
- `sessionStorage`: keeping a multi-step signup wizard's in-progress data if the user accidentally refreshes, without persisting it forever.
- Cookies: authentication (especially with `HttpOnly` + `Secure` + `SameSite` flags so JavaScript *can't* read the token, protecting against XSS-based token theft) — this is why session-based auth still leans on cookies even in SPA-heavy apps.

**How to explain this in an interview (simple English)**
"`localStorage` persists forever until cleared and is shared across tabs. `sessionStorage` is scoped to one tab and clears when that tab closes. Cookies are small (4KB) but get sent automatically with every HTTP request, which is why they're best for auth tokens the server needs to see — and ideally marked `HttpOnly` so JavaScript can't read them, protecting against XSS token theft. `localStorage`/`sessionStorage` never leave the browser on their own."

---

## IndexedDB

**What is it?**
IndexedDB is a low-level, transactional, NoSQL database built into the browser. Unlike `localStorage` (only strings, ~5-10MB), IndexedDB stores structured data (objects, blobs, files) with indexes for fast querying, and can hold hundreds of MBs to GBs depending on the browser/device.

**Why was it invented / what problem does it solve?**
`localStorage` is synchronous (blocks the main thread) and can only store strings, making it unsuitable for large or complex datasets. IndexedDB was designed so web apps could work **offline** with real query capability — think an email client, a note-taking app, or a PWA that needs to work without network access, storing potentially thousands of structured records efficiently and asynchronously (so it never freezes the UI).

### Core concepts

| Term | Meaning |
|---|---|
| Database | The top-level container, opened with a name + version |
| Object store | Like a "table" — holds records, analogous to a collection |
| `keyPath` | Which property of the stored object acts as its primary key |
| Index | A secondary lookup path for querying by a non-primary field |
| Transaction | All reads/writes happen inside a transaction scoped to specific object stores |
| `onupgradeneeded` | Fires only when the DB is created for the first time, or the version number increases — this is where you create/modify object stores and indexes |

```js
const request = indexedDB.open('userDB', 1);

// Fires only on first creation or version bump — schema changes go here
request.onupgradeneeded = (event) => {
  const db = event.target.result;
  const store = db.createObjectStore('customers', { keyPath: 'ssn' });
  store.createIndex('byName', 'name', { unique: false });
  store.createIndex('byEmail', 'email', { unique: true });
};

request.onsuccess = (event) => {
  const db = event.target.result;

  // CREATE
  const addTxn = db.transaction('customers', 'readwrite');
  addTxn.objectStore('customers').add({ ssn: '123', name: 'Sriram', email: 's@x.com' });

  // READ
  const readTxn = db.transaction('customers', 'readonly');
  const getReq = readTxn.objectStore('customers').get('123');
  getReq.onsuccess = () => console.log(getReq.result);

  // UPDATE (put replaces the record with the same key)
  const updateTxn = db.transaction('customers', 'readwrite');
  updateTxn.objectStore('customers').put({ ssn: '123', name: 'Sriram Sai', email: 's@x.com' });

  // DELETE
  const deleteTxn = db.transaction('customers', 'readwrite');
  deleteTxn.objectStore('customers').delete('123');
};

request.onerror = (event) => console.error('DB error:', event.target.errorCode);
```

**Real-time / real-world usage**
Offline-first apps (Gmail offline mode, Notion, Figma's local cache, PWAs in general) use IndexedDB to store data locally so the app is usable without network, then sync to the server when connectivity returns. Libraries like Dexie.js or `idb` are commonly used in production to wrap the verbose native API with promises.

**How to explain this in an interview (simple English)**
"IndexedDB is a browser-based NoSQL database for storing large, structured, queryable data asynchronously — unlike `localStorage`, which is synchronous, string-only, and small. It's the backbone of offline-first apps: you read/write locally in a transaction, and `onupgradeneeded` is where you define your schema, similar to a migration."

---

## Service Workers and PWA Basics

**What is it?**
A service worker is a JavaScript file that runs in a separate background thread from your page, acts as a **programmable network proxy** sitting between your app and the network, and keeps running even when the page/tab isn't open. It's the core technology that makes Progressive Web Apps (PWAs) possible — installable, offline-capable web apps.

**Why was it invented / what problem does it solve?**
Before service workers, web apps had no way to intercept network requests or work offline — if there was no connection, the app just failed to load. Native apps could always open (even offline) and sync later; the web had no equivalent. Service workers (introduced ~2015, standardized as part of the broader push toward PWAs) close that gap by giving the browser a script that can cache assets/API responses and decide, per request, whether to serve from cache or network.

### What a service worker *can't* and *can* do

| Cannot | Can |
|---|---|
| Access the DOM | Intercept and control network requests (`fetch` event) |
| Access `window` directly | Cache assets and API responses |
| Block the main thread's rendering (it's a separate thread) | Handle push notifications and background sync |
| Run without HTTPS (except on `localhost`) | Serve as an offline fallback |

### Lifecycle: install → activate → fetch

```
1. Browser downloads sw.js, registers it → "install" event fires
   → typically used to pre-cache critical assets (app shell)
2. Old service worker still controls the page until all tabs using it close
   → new one sits in "waiting" state unless self.skipWaiting() is called
3. "activate" event fires when the new SW takes control
   → typically used to clean up old caches
4. "fetch" event fires for every network request the page makes
   → the SW can respond with a cached response, network response, or custom logic
```

```js
// Registering the service worker (in your main page's JS)
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/sw.js');
}
```

```js
// sw.js — minimal cache-first strategy
const CACHE_NAME = 'app-v1';
const PRECACHE = ['/', '/index.css', '/index.js'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE))
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((cached) => cached || fetch(event.request))
  );
});
```

### Caching strategies (pick based on the data's freshness needs)

| Strategy | Behavior | Best for |
|---|---|---|
| **Cache only** | Always serve from cache, never hit network | Assets that never change (versioned/hashed files) |
| **Network only** | Always hit network, no cache involved | Data that must always be fresh (POST requests, live prices) |
| **Cache first** | Serve from cache if present, else fetch + cache it | Non-critical static assets (images, fonts, CSS) |
| **Network first** | Try network, fall back to cache on failure | Frequently-updated content that should still work offline |
| **Stale-while-revalidate** | Serve cached copy immediately, fetch a fresh copy in the background for next time | High-traffic, semi-fresh content (feed data) |

### PWA basics: manifest.json

```json
{
  "name": "My App",
  "short_name": "App",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#ffffff",
  "theme_color": "#000000",
  "icons": [{ "src": "/icon-192.png", "sizes": "192x192", "type": "image/png" }]
}
```
Linked via `<link rel="manifest" href="/manifest.json">`. The manifest is what allows a browser to show an "Install App" prompt and lets the app run in its own window, without browser chrome — this, combined with a registered service worker and HTTPS, is what qualifies a site as an installable PWA.

**Real-time / real-world usage**
Twitter Lite, Starbucks, and many e-commerce sites ship PWAs so users in low-connectivity regions still get an app-like, installable, offline-tolerant experience without going through an app store.

**How to explain this in an interview (simple English)**
"A service worker is a background script that intercepts network requests, acting like a proxy between the app and the network. It has an install → activate → fetch lifecycle, can't touch the DOM directly, but can cache assets and enable offline support. Combined with a web app manifest, it's what makes a site installable as a PWA."

---

## Web Workers

**What is it?**
A Web Worker runs JavaScript in a separate background thread, completely isolated from the main (UI) thread — so heavy computation doesn't freeze the page.

**Why was it invented / what problem does it solve?**
JavaScript in the browser is single-threaded by default: any long-running synchronous code (heavy computation, big data processing) blocks the main thread, freezing scrolling, clicks, and rendering. Web Workers give you a real second thread to offload that work to, communicating with the main thread only via message passing (no shared memory, no DOM access from the worker).

```js
// main.js
const worker = new Worker('worker.js');
worker.postMessage({ command: 'start', data: [1, 2, 3] });
worker.onmessage = (e) => console.log('Result from worker:', e.data);

// worker.js
onmessage = (e) => {
  const result = e.data.data.map((n) => n * 2); // heavy work happens here, off the main thread
  postMessage(result);
};
```

**Real-time / real-world usage**
Image/video processing, large data-set sorting/filtering, complex calculations in data-viz dashboards, and syntax-highlighting engines (like in-browser code editors) run in Web Workers to keep the UI responsive.

**How to explain this in an interview (simple English)**
"Web Workers let you run JavaScript on a separate thread so heavy computation doesn't block the page from rendering or responding to clicks. You communicate with them only through `postMessage`/`onmessage` — they can't touch the DOM directly, which keeps things thread-safe."

---

## Drag and Drop API

**What is it?**
A native browser API letting users drag an element and drop it onto a target, without any external library, using a set of drag-related DOM events.

```html
<div id="drag-item" draggable="true">Drag me</div>
<div id="drop-zone">Drop here</div>

<script>
  const item = document.getElementById('drag-item');
  const zone = document.getElementById('drop-zone');

  item.addEventListener('dragstart', (e) => {
    e.dataTransfer.setData('text/plain', 'drag-item'); // attach data to carry to the drop target
  });

  zone.addEventListener('dragover', (e) => {
    e.preventDefault(); // required — without this, drop is disallowed by default
  });

  zone.addEventListener('drop', (e) => {
    e.preventDefault();
    const id = e.dataTransfer.getData('text/plain');
    zone.appendChild(document.getElementById(id));
  });
</script>
```

**Why was it invented / what problem does it solve?**
Drag-and-drop is a very natural interaction pattern (reordering a list, uploading a file by dropping it, kanban boards) that used to require heavy, fragile mouse-event-tracking hacks. The native API standardizes this with dedicated events (`dragstart`, `dragover`, `dragenter`, `dragleave`, `drop`, `dragend`) and a `dataTransfer` object to carry data between source and target.

**Real-time / real-world usage**
File upload zones ("drag a file here"), Kanban boards (Trello-style card reordering), drag-to-reorder lists. In practice, many production apps still use a library (`react-dnd`, `dnd-kit`, `SortableJS`) on top of/instead of the raw API for smoother cross-browser behavior and touch support (native HTML5 drag-and-drop has weak mobile/touch support).

**How to explain this in an interview (simple English)**
"The Drag and Drop API gives native browser events for dragging elements — `dragstart` on the source, `dragover`/`drop` on the target, with a `dataTransfer` object to pass data between them. `dragover` needs `preventDefault()` or the drop is blocked by default. It's commonly wrapped by libraries in production because native touch support is limited."

---

## Geolocation API

**What is it?**
A browser API that (with user permission) returns the device's current geographic coordinates.

```js
navigator.geolocation.getCurrentPosition(
  (position) => {
    console.log(position.coords.latitude, position.coords.longitude);
  },
  (error) => console.error('Geolocation failed:', error.message),
  { enableHighAccuracy: true, timeout: 5000 }
);

// watchPosition keeps calling back as the location updates (e.g., live navigation)
const watchId = navigator.geolocation.watchPosition((pos) => console.log(pos));
navigator.geolocation.clearWatch(watchId); // stop watching
```

**Why was it invented / what problem does it solve?**
Location-aware experiences (maps, "stores near me," ride-hailing) needed a standard, privacy-respecting way to ask the user for their location, rather than relying on IP-based guessing (inaccurate) or third-party plugins. It's permission-gated by design — the browser always prompts the user first.

**Real-time / real-world usage**
"Use my current location" buttons on delivery/food apps, map-centering on load, ride-sharing pickup detection.

**How to explain this in an interview (simple English)**
"The Geolocation API asks the user for permission and returns coordinates via `getCurrentPosition`. `watchPosition` is used when you need continuous updates, like live tracking. It always requires explicit user consent — the browser handles the permission prompt."

---

## History API (`pushState`, `replaceState`, `popstate`)

**What is it?**
The History API lets JavaScript manipulate the browser's URL and back/forward navigation stack *without* triggering a full page reload — it's the foundation every client-side router (React Router, Vue Router, Next.js's router) is built on.

```js
// Push a new URL onto the history stack WITHOUT reloading the page
history.pushState({ page: 'profile' }, '', '/profile');
// The address bar now shows /profile, and the back button will return here —
// but the browser did NOT make a network request or reload anything.

// Replace the current entry instead of adding a new one (no new back-button stop)
history.replaceState({ page: 'profile-edit' }, '', '/profile/edit');

// Fires when the user clicks Back/Forward (but NOT when you call pushState yourself)
window.addEventListener('popstate', (event) => {
  console.log('Navigated to:', location.pathname, 'state:', event.state);
  renderPageFor(location.pathname); // the app must manually re-render based on the new URL
});
```

| Method/Event | What it does |
|---|---|
| `history.pushState(state, title, url)` | Adds a new entry to the browser's session history, changes the URL, keeps the current page's JS/DOM state alive |
| `history.replaceState(state, title, url)` | Same as `pushState`, but overwrites the current entry instead of adding a new one |
| `popstate` event | Fires when the user navigates via Back/Forward (or `history.back()`/`.forward()`) — **does not fire** for your own `pushState`/`replaceState` calls, so you must manually render after those too |
| `history.back()` / `.forward()` / `.go(n)` | Programmatically move through the history stack, same as clicking the browser buttons |

**Why was it invented / what problem does it solve?**
Before this API (part of HTML5), the only way to change the URL was a full navigation (`location.href = ...`), which always reloaded the entire page from the server — incompatible with the SPA model where you want to update the URL (for bookmarking, sharing, and working back/forward buttons) *without* losing in-memory app state or re-downloading JS/CSS. `pushState`/`popstate` decouple "the URL changed" from "the page reloaded," which is exactly what client-side routing needs.

**Real-time / real-world usage**
Every SPA router (React Router's `<Link>`, Next.js's `<Link>` in client-navigation mode, Vue Router) calls `pushState` under the hood when you navigate, and listens for `popstate` to re-render the right view when the user hits Back. It's also used for state that should be bookmarkable/shareable without a full reload — filter/sort parameters on a product listing page, a currently-open tab, or a modal's open/closed state reflected in the URL.

**How to explain this in an interview (simple English)**
"`pushState` changes the URL and adds a history entry without reloading the page — that's literally how SPA routers make the back button work while staying a single-page app. `replaceState` does the same but doesn't add a new back-button stop, useful for things like redirects or filter updates. The `popstate` event fires only on Back/Forward navigation, not when you call `pushState` yourself, so the app has to manually trigger a re-render after both cases."

---

## Intersection Observer API

**What is it?**
A browser API that lets you efficiently detect when an element enters or exits the viewport (or another scrollable ancestor), without manually calculating scroll positions on every `scroll` event.

```js
const observer = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        console.log(`${entry.target.dataset.id} is now visible`);
        entry.target.classList.add('visible'); // e.g. trigger a fade-in animation
        // observer.unobserve(entry.target); // stop watching once triggered, if you only need it once
      }
    });
  },
  {
    root: null,        // null = the browser viewport (default); pass an element to observe within a scroll container instead
    rootMargin: '0px 0px 200px 0px', // "start considering it visible 200px before it actually enters"
    threshold: 0.5,     // fire when 50% of the element is visible (0 = any pixel, 1 = fully visible)
  }
);

document.querySelectorAll('.card').forEach((card) => observer.observe(card));
```

| Option | Meaning |
|---|---|
| `root` | The scrollable container to check intersection against (defaults to the viewport) |
| `rootMargin` | Grows/shrinks the root's bounding box before intersection is calculated — commonly used to trigger slightly *before* an element is actually on-screen |
| `threshold` | What fraction of the target must be visible before the callback fires (can be an array for multiple trigger points) |
| `entry.isIntersecting` | Boolean — whether the target currently overlaps the root, at the given threshold |

**Why was it invented / what problem does it solve?**
Before this API, detecting "is this element visible yet" meant listening to the `scroll` event and manually calling `getBoundingClientRect()` on every handler firing — `scroll` fires extremely frequently, so this had to be throttled/debounced by hand, ran on the main thread, and forced synchronous layout reads (`getBoundingClientRect` triggers a reflow if layout is "dirty"), making it a common source of scroll-jank. `IntersectionObserver` moves this calculation off the critical path — the browser notifies you asynchronously, batched, and without forcing layout thrashing.

**Real-time / real-world usage**
- Infinite scroll / "load more" lists: observe a sentinel element at the bottom of the list; when it intersects, fetch the next page.
- Custom lazy-loading (for cases native `loading="lazy"` doesn't cover, like background images set via CSS, or lazy-mounting a heavy component/video only when scrolled into view).
- Scroll-triggered animations ("fade in as you scroll"), and analytics ("was this ad actually seen for at least 1 second," i.e. viewability tracking).
- Sticky-header/nav active-state highlighting (which section is currently in view).

**How to explain this in an interview (simple English)**
"`IntersectionObserver` tells you when an element enters or leaves the viewport (or a scroll container) without you having to listen to `scroll` events and manually check positions — which used to be janky because `scroll` fires constantly and reading element positions forces layout recalculation. I'd use it for infinite scroll, custom lazy-loading beyond what `loading=\"lazy\"` covers, and scroll-triggered animations. `rootMargin` lets me trigger slightly before the element is actually visible, and `threshold` controls what percentage must be visible to count."

---

## Canvas Basics

**What is it?**
`<canvas>` is an HTML element that exposes a 2D (or WebGL/3D) drawing API — you draw pixels programmatically via JavaScript, rather than describing shapes declaratively (as you would with SVG).

```html
<canvas id="clockCanvas" width="200" height="200"></canvas>
<script>
  const canvas = document.getElementById('clockCanvas');
  const ctx = canvas.getContext('2d');

  ctx.beginPath();
  ctx.arc(100, 100, 80, 0, Math.PI * 2); // circle: x, y, radius, startAngle, endAngle
  ctx.fillStyle = '#222';
  ctx.fill();
</script>
```

Canvas vs SVG:

| | Canvas | SVG |
|---|---|---|
| Model | Pixel-based (bitmap), draw via JS calls | Vector-based (DOM elements per shape) |
| Scaling | Blurs/pixelates when scaled | Scales infinitely, crisp at any size |
| Elements in DOM | One single `<canvas>` element | One DOM node per shape — inspectable/stylable via CSS |
| Best for | Games, real-time graphics, image manipulation, large numbers of moving objects | Icons, charts, diagrams, illustrations that need to stay crisp and interactive |
| Performance at scale | Better for thousands of frequently-redrawn objects | Degrades with very large numbers of DOM nodes |

**Why was it invented / what problem does it solve?**
Before Canvas, drawing custom graphics (charts, games, image filters) in the browser required Flash or Java applets — external, non-native plugins. Canvas (HTML5) gave the browser a native, high-performance surface for pixel-level drawing controlled entirely by JavaScript.

**Real-time / real-world usage**
Charting libraries (Chart.js), browser-based games, image editors (cropping/filters), and generating dynamic images from other elements (e.g., rendering an SVG or DOM snapshot to an image using `XMLSerializer` + a `Blob` URL drawn into an `<img>`, a common pattern for exporting a UI element as a downloadable PNG).

```js
// Example: converting an SVG element into a downloadable image (a common real pattern)
const svg = document.querySelector('svg');
const svgString = new XMLSerializer().serializeToString(svg);
const blob = new Blob([svgString], { type: 'image/svg+xml' });
const url = URL.createObjectURL(blob);

const img = new Image();
img.onload = () => {
  document.body.append(img);
  URL.revokeObjectURL(url); // free the memory once the image has loaded
};
img.src = url;
```

**How to explain this in an interview (simple English)**
"Canvas gives you a pixel-based drawing surface controlled entirely by JavaScript — good for games, real-time graphics, and image manipulation. SVG is vector-based and DOM-based, so it stays crisp at any size and each shape is inspectable/stylable, but it doesn't scale well to thousands of objects. Pick Canvas for performance-heavy, pixel-level work; pick SVG for icons/charts that need to stay sharp and interactive."

---

## Web Components: Custom Elements + Shadow DOM

**What is it?**
Web Components is a set of native browser APIs (no framework required) for building reusable, encapsulated UI elements: **Custom Elements** (define your own HTML tags) and **Shadow DOM** (a scoped, isolated mini-DOM inside an element, so its internal markup/styles don't leak out or get affected by the outside page).

```js
class UserCard extends HTMLElement {
  constructor() {
    super(); // must call super() first in the constructor

    // Attach a shadow root — creates an isolated DOM subtree
    this.attachShadow({ mode: 'open' });

    const style = document.createElement('style');
    style.textContent = `
      .card { border: 1px solid #ccc; padding: 8px; border-radius: 8px; }
    `; // this CSS is scoped — it never leaks out to affect the rest of the page

    const wrapper = document.createElement('div');
    wrapper.className = 'card';
    wrapper.textContent = this.getAttribute('name') || 'Unknown user';

    this.shadowRoot.append(style, wrapper);
  }

  // Lifecycle callbacks
  connectedCallback() {
    console.log('added to the page');
  }
  disconnectedCallback() {
    console.log('removed from the page');
  }
  static get observedAttributes() {
    return ['name'];
  }
  attributeChangedCallback(attr, oldVal, newVal) {
    console.log(`${attr} changed from ${oldVal} to ${newVal}`);
  }
}

customElements.define('user-card', UserCard);
```

```html
<user-card name="Sriram"></user-card>
```

### Custom element lifecycle callbacks

| Callback | Fires when |
|---|---|
| `connectedCallback` | Element is inserted into the DOM |
| `disconnectedCallback` | Element is removed from the DOM |
| `adoptedCallback` | Element is moved to a new document (rare, e.g. via `document.adoptNode`) |
| `attributeChangedCallback` | An observed attribute changes value |

### `open` vs `closed` shadow mode

| Mode | Access from outside |
|---|---|
| `open` | `element.shadowRoot` returns the shadow root — accessible from JS outside the component |
| `closed` | `element.shadowRoot` returns `null` — fully encapsulated, even from outside JS |

**Why was it invented / what problem does it solve?**
Before Web Components, "reusable UI components" only existed at the framework level (React components, Angular components) — there was no native browser mechanism to define a custom tag with encapsulated markup/styles/behavior that worked across *any* framework or even with no framework at all. Web Components solve the "CSS leaking in/out" problem specifically: normally all CSS on a page is global, so a `.card` class in one part of the app can accidentally clash with a `.card` class somewhere else. Shadow DOM creates a real style/DOM boundary, similar in spirit to what CSS Modules or Styled Components achieve in userland, but done natively by the browser.

**Real-time / real-world usage**
Design systems that need to be framework-agnostic (usable in React, Angular, plain HTML, etc. from the exact same underlying implementation) are often built as Web Components — e.g., Adobe Spectrum, Ionic, and many companies' shared internal component libraries use this pattern specifically so one component library serves multiple frontend stacks.

**How to explain this in an interview (simple English)**
"Custom Elements let you define your own HTML tags with JavaScript-backed behavior, using lifecycle hooks like `connectedCallback`. Shadow DOM gives that element its own isolated DOM subtree and scoped CSS, so styles don't leak in or out — like a built-in version of CSS Modules. Together they're called Web Components, and they're framework-agnostic, which makes them popular for shared design systems used across multiple frontend stacks."

---

## Light DOM vs Shadow DOM (and Composing Them with `<slot>`)

**What is it?**
**Light DOM** is just the regular, ordinary DOM — specifically, it refers to the markup an AUTHOR (the person USING your custom element) writes as children between your element's tags, e.g. everything between `<user-card>` and `</user-card>` in `<user-card><span>Sriram</span></user-card>`. It's called "light" simply to contrast it with "shadow" — there's nothing special about it; it's normal, visible, page-level DOM, fully accessible to global CSS and `document.querySelector`. **Shadow DOM**, as covered above, is the encapsulated, internal DOM subtree a component attaches to ITSELF via `attachShadow()` — it belongs to the component's own implementation, not the author using it, and is normally invisible to global CSS.

The key idea that trips people up: a custom element can have **both at once** — Light DOM (what the USER of the component wrote as children) and Shadow DOM (what the COMPONENT ITSELF renders internally) — and the `<slot>` element is the bridge that lets you PROJECT the Light DOM content into a specific position inside the Shadow DOM, instead of the two staying completely separate.

```html
<!-- Light DOM: what the AUTHOR writes when using the component -->
<user-card>
  <span slot="username">Sriram</span>
  <span slot="role">Senior Developer</span>
</user-card>
```

```js
class UserCard extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });

    // This is the component's OWN internal markup — the Shadow DOM.
    // <slot name="..."> is a placeholder: it says "project whatever Light DOM
    // content was marked with a matching slot='...' attribute, HERE."
    this.shadowRoot.innerHTML = `
      <style>
        .card { border: 1px solid #ccc; padding: 12px; border-radius: 8px; }
        .role { color: gray; font-size: 0.85em; }
      </style>
      <div class="card">
        <strong><slot name="username">Anonymous</slot></strong>
        <div class="role"><slot name="role">No role set</slot></div>
      </div>
    `;
    // Note: the fallback text ("Anonymous", "No role set") only shows if the
    // author didn't provide any Light DOM content for that slot at all.
  }
}
customElements.define('user-card', UserCard);
```

Rendered result: the browser takes the Light DOM `<span slot="username">Sriram</span>` and displays it wherever `<slot name="username">` appears inside the Shadow DOM — visually "flattened" together, but the two DOM trees remain logically and structurally separate (`element.shadowRoot` only ever shows the Shadow DOM's own markup; `element.children`/`innerHTML` on the element itself only ever shows the Light DOM the author wrote).

**A default (unnamed) `<slot>`** — with no `name` attribute — catches any Light DOM content that ISN'T assigned to a specific named slot:
```html
<div class="card">
  <slot></slot> <!-- catches ALL of the author's children that have no slot="..." attribute -->
</div>
```

**Why was it invented / what problem does it solve?**
Without slots, a component's Shadow DOM would be entirely self-contained and closed off — there'd be no way for the person USING the component to inject their own custom content into a specific spot inside it (e.g., a custom icon inside a `<my-button>`, or a custom header inside a `<my-modal>`) without breaking encapsulation by reaching into the shadow root directly. `<slot>` solves this the same way React's `children`/`props.children` (or Vue's `<slot>`, which directly inspired this) solves the "let the consumer inject their own markup into a specific spot" problem — except this version is a native browser primitive, not framework-specific.

**Real-time / real-world usage**
Any native Web Component library that needs to let consumers customize part of a component's rendered output without touching its internal implementation — e.g., a `<my-modal>` component exposing a `header` slot and a default slot for body content, or a `<my-tab-panel>` exposing a slot per tab, while keeping the actual tab-switching logic and styles fully encapsulated inside its Shadow DOM.

**How to explain this in an interview (simple English)**
"Light DOM is just the normal markup someone writes as children of my custom element — ordinary, global-CSS-visible DOM. Shadow DOM is the component's own internal, encapsulated markup. A `<slot>` inside my Shadow DOM is a placeholder that says 'project the author's Light DOM content here' — a named slot (`slot='role'`) grabs children with a matching `slot='role'` attribute, and an unnamed `<slot>` grabs everything else. It's the native browser equivalent of React's `children` prop — it lets consumers customize specific parts of my component's output without breaking the encapsulation Shadow DOM otherwise provides."

---

## Quick Summary Table

| API | One-line purpose |
|---|---|
| localStorage/sessionStorage | Client-only key-value storage, never sent to server |
| Cookies | Small storage automatically sent with every matching HTTP request; used for auth |
| IndexedDB | Async, structured, queryable browser database for large/offline data |
| Service Worker | Background network proxy enabling offline support and PWA installability |
| Web Worker | Runs JS on a separate thread to avoid blocking the UI |
| Drag and Drop API | Native events (`dragstart`/`dragover`/`drop`) for drag interactions |
| Geolocation API | Permission-gated access to device coordinates |
| History API | `pushState`/`replaceState` change the URL without a reload; `popstate` fires on Back/Forward — the basis of SPA routing |
| Intersection Observer | Async, efficient viewport-visibility detection — infinite scroll, custom lazy-loading, scroll animations |
| Canvas | Pixel-based drawing surface for graphics/games/image manipulation |
| Web Components | Native, framework-agnostic reusable elements with style/DOM encapsulation |
| Light DOM vs Shadow DOM | Light DOM = author's normal children markup; Shadow DOM = component's own encapsulated internals; `<slot>` projects Light DOM content into a Shadow DOM position |
