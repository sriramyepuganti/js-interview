# 06. Performance and SEO (HTML-Level)

This file focuses on the performance and SEO decisions you make *in HTML itself* — markup, attributes, and `<head>` metadata — as opposed to JS/bundler-level optimizations.

---

## Critical Rendering Path

**What is it?**
The Critical Rendering Path (CRP) is the sequence of steps the browser takes from receiving HTML/CSS/JS bytes to actually painting pixels on screen: **Parse HTML → build DOM → parse CSS → build CSSOM → combine into Render Tree → Layout (calculate positions/sizes) → Paint (draw pixels) → Composite (layer onto screen).**

**Why was it invented / what problem does it solve?**
Understanding this pipeline is what lets you answer "why is my page slow to show content" precisely instead of guessing. Every performance optimization technique (minifying CSS, deferring JS, lazy-loading images, preloading fonts) exists to shorten or unblock some specific step in this path.

Key blocking behaviors:
- **CSS is render-blocking by default** — the browser won't paint anything until it has the full CSSOM, because it doesn't want to paint content and then immediately repaint it once styles arrive (avoids a flash of unstyled content).
- **Synchronous `<script>` tags block HTML parsing** — the parser pauses, downloads, and executes the script before continuing (see `01-html-fundamentals.md` for `async`/`defer`).

**Real-time / real-world usage**
This is the mental model behind Lighthouse/PageSpeed Insights scores — most of their top recommendations ("eliminate render-blocking resources," "reduce unused CSS," "minimize main-thread work") map directly to steps in the CRP.

**How to explain this in an interview (simple English)**
"The Critical Rendering Path is the sequence: parse HTML into DOM, parse CSS into CSSOM, combine into a render tree, calculate layout, then paint and composite pixels. CSS blocks rendering, and synchronous scripts block HTML parsing — so most performance techniques (deferring JS, minimizing CSS, preloading key resources) exist to shorten this path so the user sees meaningful content sooner."

---

## Lazy Loading Images

**What is it?**
`loading="lazy"` is a native HTML attribute that tells the browser to defer loading an image (or iframe) until it's about to scroll into the viewport, instead of downloading it immediately on page load.

```html
<!-- Loads immediately: use for above-the-fold, immediately visible images -->
<img src="hero-banner.jpg" alt="Hero banner" loading="eager" />

<!-- Loads only when nearing the viewport: use for below-the-fold images -->
<img src="product-2.jpg" alt="Product 2" loading="lazy" width="400" height="300" />

<iframe src="video-embed.html" loading="lazy"></iframe>
```

**Why was it invented / what problem does it solve?**
Before this attribute (added to browsers around 2019), lazy loading required JavaScript — an `IntersectionObserver` watching each image and manually swapping `src` in. That's extra JS shipped, extra complexity, and a risk of images never loading if JS fails. Native `loading="lazy"` does the same thing with zero JS, better performance, and works even if JS is disabled/slow to load.

**Why it matters for performance:** downloading every image on a long page (e.g., a product listing with 100 items) up front wastes bandwidth and delays the browser's ability to prioritize what's actually visible — directly hurting metrics like LCP (see below).

**Important detail:** always include `width` and `height` (or `aspect-ratio` in CSS) on lazy images. Without them, the browser doesn't know how much space to reserve before the image loads, causing layout shift (bad for CLS) once it finally does load.

**Real-time / real-world usage**
Product listing pages, image-heavy blogs, and social media feeds all lazy-load everything below the first screen, while keeping the hero/first visible image eager so it appears immediately.

**How to explain this in an interview (simple English)**
"`loading=\"lazy\"` tells the browser to only download an image when it's about to enter the viewport, saving bandwidth and speeding up initial load. It's native, so no JS needed. I'd keep it off for above-the-fold images (so they load immediately) and always set `width`/`height` to avoid layout shift when the image finally loads."

---

## Resource Hints: preload, prefetch, preconnect

**What is it?**
These are `<link>` tags in `<head>` that give the browser hints about resources it will need soon, so it can start fetching them *earlier* than it normally would discover them.

```html
<!-- preload: "I will definitely need this very soon, fetch it with high priority now" -->
<link rel="preload" href="/fonts/main.woff2" as="font" type="font/woff2" crossorigin />
<link rel="preload" href="/hero.jpg" as="image" />

<!-- prefetch: "I probably need this for the NEXT page/navigation, fetch it at low priority when idle" -->
<link rel="prefetch" href="/next-page.html" />

<!-- preconnect: "I'll be talking to this origin soon, do the DNS + TCP + TLS handshake now" -->
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />

<!-- dns-prefetch: lighter version of preconnect, just resolves DNS ahead of time -->
<link rel="dns-prefetch" href="https://api.example.com" />
```

| Hint | Priority | Use case | Analogy |
|---|---|---|---|
| `preload` | High, immediate | Critical resource for *this* page (hero image, main font, critical CSS) that the browser wouldn't otherwise discover early enough | "Get this now, I need it in the next second" |
| `prefetch` | Low, idle-time | Resource likely needed for the *next* navigation | "Grab this later when you're free, I'll probably need it soon" |
| `preconnect` | Network setup only | You know you'll fetch from a third-party origin (CDN, font host, API) soon | "Start the handshake with this server now so the actual request is instant later" |

**Why was it invented / what problem does it solve?**
The browser normally only discovers a resource once it encounters the tag/reference for it while parsing (e.g., a font referenced inside CSS is only discovered *after* CSS finishes downloading and parsing). That delay is wasted time for genuinely critical resources. These hints let developers manually tell the browser "start this earlier than you'd normally find out about it," directly shortening the Critical Rendering Path for the resources that matter most.

**Real-time / real-world usage**
- `preload` for a custom web font used in the hero heading, so it's not blank/using a fallback font (FOUT) longer than necessary.
- `preconnect` to Google Fonts, a CDN, or a payment gateway domain before the user needs it, so the actual request when it happens has zero handshake delay.
- `prefetch` for the "next step" page in a checkout flow, once the user reaches step 1, so step 2 loads instantly.

**How to explain this in an interview (simple English)**
"`preload` says 'fetch this now, I need it very soon' — used for critical fonts/images the browser wouldn't discover early enough on its own. `prefetch` says 'fetch this quietly for the likely next page.' `preconnect` sets up the network connection (DNS+TCP+TLS) to a third-party origin ahead of time so the real request later has no handshake delay."

---

## Meta Tags for SEO

**What is it?**
`<head>` metadata that search engines and social platforms read to understand and represent your page, without any of it being visible on the page itself.

```html
<head>
  <title>Senior Frontend Engineer Roles | MyJobsSite</title>
  <meta name="description" content="Browse senior frontend engineer jobs updated daily. Filter by location, salary, and tech stack." />
  <link rel="canonical" href="https://example.com/jobs/senior-frontend" />
  <meta name="robots" content="index, follow" />

  <!-- Open Graph: controls how the link looks when shared on social media -->
  <meta property="og:title" content="Senior Frontend Engineer Roles" />
  <meta property="og:description" content="Browse senior frontend engineer jobs updated daily." />
  <meta property="og:image" content="https://example.com/og-image.png" />
  <meta property="og:url" content="https://example.com/jobs/senior-frontend" />

  <!-- Twitter Card: same idea, for Twitter/X previews -->
  <meta name="twitter:card" content="summary_large_image" />
</head>
```

| Tag | Purpose |
|---|---|
| `<title>` | Single most important on-page SEO signal; shown as the clickable headline in search results |
| `meta name="description"` | The snippet text shown under the title in search results (doesn't directly boost ranking, but drives click-through rate) |
| `link rel="canonical"` | Tells search engines "this is the authoritative URL," preventing duplicate-content penalties when the same content is reachable via multiple URLs |
| `meta name="robots"` | Controls crawling/indexing behavior (`noindex`, `nofollow`, etc.) |
| Open Graph (`og:*`) | Controls the preview card when shared on Facebook/LinkedIn/etc. |
| `twitter:card` | Controls the preview card on Twitter/X |

**Why was it invented / what problem does it solve?**
Search engines and social platforms can't "see" a page visually — they parse structured signals. Without these tags, a shared link shows a broken/generic preview, and search engines might index the wrong URL as canonical or show a poor auto-generated snippet. These tags give you direct control over both.

**Real-time / real-world usage**
Every production marketing/content page has a defined title/description/OG image, usually generated dynamically per page in frameworks (Next.js `<Head>`, or server-rendered meta tags) so each product/blog/job posting gets a unique, accurate preview.

**How to explain this in an interview (simple English)**
"Meta tags in `<head>` don't affect what users see on the page, but they control how search engines and social platforms understand and preview it — `title`/`description` for search snippets, `canonical` to avoid duplicate-content issues, and Open Graph/Twitter Card tags for how the link preview looks when shared."

---

## Structured Data: Microdata and `schema.org` (Rich Snippets)

**What is it?**
Structured data is a standardized way of labeling *what a piece of content actually is* (a product, a recipe, a review, an event) so search engines can understand it well enough to show enhanced results — star ratings, price, availability, breadcrumbs — directly in search results, not just a plain blue link. `schema.org` is the shared vocabulary (types like `Product`, `Recipe`, `Review`) that both approaches below plug into.

There are two ways to add it; **JSON-LD is the modern, strongly recommended approach** (Google explicitly prefers it), while microdata is the older, HTML-attribute-based approach you should still recognize.

```html
<!-- Microdata: attributes woven directly into existing HTML -->
<div itemscope itemtype="https://schema.org/Product">
  <h1 itemprop="name">Wireless Noise-Cancelling Headphones</h1>
  <img itemprop="image" src="/headphones.jpg" alt="Wireless Noise-Cancelling Headphones" />
  <p itemprop="description">Over-ear headphones with 30-hour battery life.</p>
  <div itemprop="offers" itemscope itemtype="https://schema.org/Offer">
    <span itemprop="priceCurrency" content="USD">$</span>
    <span itemprop="price" content="199.99">199.99</span>
    <link itemprop="availability" href="https://schema.org/InStock" />
  </div>
</div>

<!-- JSON-LD: a separate <script> block, doesn't touch your visible markup at all -->
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "Product",
  "name": "Wireless Noise-Cancelling Headphones",
  "image": "/headphones.jpg",
  "description": "Over-ear headphones with 30-hour battery life.",
  "offers": {
    "@type": "Offer",
    "priceCurrency": "USD",
    "price": "199.99",
    "availability": "https://schema.org/InStock"
  }
}
</script>
```

| Attribute/keyword | Meaning |
|---|---|
| `itemscope` | Marks an element as the root of one structured "item" (one `Product`, one `Review`, etc.) |
| `itemtype="https://schema.org/Product"` | Declares which schema.org vocabulary/type this item represents |
| `itemprop="name"` | Maps this element's content to a specific property defined by that type |
| JSON-LD `<script type="application/ld+json">` | The same data, expressed as plain JSON, completely decoupled from the visible HTML |

**Why was it invented / what problem does it solve?**
Search engines can statistically guess a lot about a page, but they can't reliably tell "is this number a price, a rating, or a phone number?" from visual layout alone. Structured data removes the guesswork by explicitly labeling content against a shared, agreed-upon vocabulary (`schema.org`, backed by Google/Microsoft/Yahoo/Yandex jointly), which is what unlocks **rich snippets** — star ratings, price ranges, "in stock" badges, recipe cook times, and event dates shown directly in search results, well before a user even clicks through.

**Real-time / real-world usage**
- E-commerce PDPs mark up `Product`/`Offer`/`AggregateRating` so search results show price and star ratings directly.
- Recipe sites mark up `Recipe` (cook time, ingredients, calories) to get the recipe carousel/card treatment in Google.
- Job boards mark up `JobPosting` to appear in Google's dedicated job search experience.
- Most production sites today use **JSON-LD** exclusively (it's easier to generate server-side without restructuring visible markup, and easier to validate) — microdata is mostly seen in older codebases or CMS themes, but interviewers still expect you to recognize `itemscope`/`itemprop`/`itemtype` on sight.
- Google's Rich Results Test tool is the standard way to validate structured data before shipping it.

**How to explain this in an interview (simple English)**
"Structured data labels content with a shared vocabulary from schema.org — like `Product`, `Recipe`, `Review` — so search engines can show rich snippets: star ratings, prices, stock status, directly in search results. There are two syntaxes: microdata, which uses `itemscope`/`itemtype`/`itemprop` attributes woven into your existing HTML, and JSON-LD, a `<script type=\"application/ld+json\">` block that's fully decoupled from the visible markup. JSON-LD is what Google recommends and what most production sites use today, but I'd recognize microdata attributes if I saw them in older code."

---

## Responsive Images: `srcset`, `sizes`, and `<picture>` for Art Direction

**What is it?**
Two related but distinct problems, both solved at the HTML level without any JS:

1. **Resolution switching** — serving a bigger or smaller version of the *same* image depending on the device's screen size/density, so a phone doesn't download a 4K desktop hero image.
2. **Art direction** — serving a *differently cropped/composed* image depending on viewport (e.g., a tight portrait crop on mobile vs. a wide landscape shot on desktop), because simply scaling one image down doesn't work well for every layout.

```html
<!-- 1. Resolution switching with srcset + sizes (same image, different sizes) -->
<img
  src="photo-800.jpg"
  srcset="
    photo-400.jpg   400w,
    photo-800.jpg   800w,
    photo-1600.jpg 1600w
  "
  sizes="(max-width: 600px) 100vw, 50vw"
  alt="Product photo"
  loading="lazy"
/>

<!-- 2. Art direction with <picture> (different crops per breakpoint) -->
<picture>
  <source media="(max-width: 600px)" srcset="hero-portrait-crop.jpg" />
  <source media="(min-width: 601px)" srcset="hero-wide-landscape.jpg" />
  <img src="hero-wide-landscape.jpg" alt="Team celebrating a product launch" />
</picture>
```

| Piece | Meaning |
|---|---|
| `srcset="file 400w, file 800w"` | Lists candidate image files with their **intrinsic width** (`w` = width descriptor, not a CSS pixel size) — the browser picks the best one for the current viewport and device pixel ratio |
| `sizes="(max-width: 600px) 100vw, 50vw"` | Tells the browser how wide the image will actually be *rendered* at each breakpoint, so it can do the math against `srcset` widths and pick the right file — without this, the browser has to guess |
| `<picture>` + `<source media="...">` | Lets you swap the *entire image source* (not just resolution) per media query — this is the only correct tool for art direction, `srcset`/`sizes` alone can't change composition/cropping |
| Fallback `<img>` inside `<picture>` | Required — used if no `<source>` matches, and is what actually receives `alt`, `loading`, `width`/`height` |

**Why was it invented / what problem does it solve?**
Before `srcset`/`sizes`/`<picture>` (added in HTML5.1, ~2014–2017), developers either shipped one large "one-size-fits-all" image (wasting bandwidth on mobile) or wrote JavaScript to swap `src` based on screen width (extra complexity, and a flash of the wrong image before JS ran). These features let the *browser itself* pick the optimal image — before any JS runs, based on real device capabilities (viewport, pixel density, network speed via `Save-Data` hints in some browsers) — which is both simpler and faster.

`srcset`/`sizes` solves resolution switching (same content, different pixel dimensions — a pure performance optimization). `<picture>` solves art direction (different content/crop per breakpoint — a design decision), and note that the format-switching use case shown earlier in this file (WebP/AVIF/JPEG fallback via `<picture>` + `type=`) is a *third*, separate use of `<picture>`'s source-selection mechanism — same tag, three different jobs (format, resolution/art-direction).

**Real-world usage**
- E-commerce product images: `srcset`/`sizes` so a phone downloads a ~400px image instead of the same 1600px file used on a 4K desktop monitor.
- Marketing/hero banners: `<picture>` with `media` queries so mobile gets a tightly-cropped portrait hero instead of a tiny, hard-to-read sliver of a wide desktop banner scaled down.
- News sites with author photos or article heroes commonly combine both: `<picture>` for art direction across breakpoints, with `srcset` inside each `<source>` for resolution switching within that breakpoint.

**How to explain this in an interview (simple English)**
"`srcset` with `sizes` lets the browser itself pick the best-sized version of the *same* image for the current screen, which saves bandwidth on smaller devices — that's resolution switching. `<picture>` with `<source media=\"...\">` is for art direction: serving a genuinely different crop or composition per breakpoint, not just a smaller file, because a wide banner just doesn't work visually when squeezed onto a phone. Both run natively, before any JavaScript, so there's no flash of the wrong image."

---

## Image Formats: WebP / AVIF

**What is it?**
Modern, more efficient image formats than JPEG/PNG, offering significantly smaller file sizes at similar visual quality.

```html
<!-- The <picture> element lets the browser pick the best supported format -->
<picture>
  <source srcset="photo.avif" type="image/avif" />
  <source srcset="photo.webp" type="image/webp" />
  <img src="photo.jpg" alt="Fallback for older browsers" loading="lazy" />
</picture>
```

| Format | Typical size vs JPEG | Browser support | Notes |
|---|---|---|---|
| JPEG | Baseline | Universal | Lossy, no transparency |
| PNG | Larger, lossless | Universal | Supports transparency, best for graphics/screenshots |
| WebP | ~25–35% smaller than JPEG | Very wide (all modern browsers) | Supports transparency + lossy/lossless |
| AVIF | ~50% smaller than JPEG | Wide in modern browsers, some gaps in older ones | Best compression, newest format |

**Why was it invented / what problem does it solve?**
Images are usually the single biggest contributor to page weight. Newer formats use better compression algorithms to deliver the same visual quality at a fraction of the file size, directly improving load time and LCP — with the `<picture>` fallback pattern ensuring older browsers still get a working image.

**Real-time / real-world usage**
E-commerce sites with thousands of product images serve WebP/AVIF via `<picture>` (or automatically via image CDNs like Cloudinary/Imgix that transform format based on the requesting browser's `Accept` header) to cut bandwidth costs and improve load speed at scale.

**How to explain this in an interview (simple English)**
"WebP and AVIF are modern image formats that compress much better than JPEG/PNG — AVIF can be roughly half the size at similar quality. I'd use `<picture>` with multiple `<source>` tags so the browser picks the best format it supports, falling back to JPEG for older browsers."

---

## Core Web Vitals (as they relate to HTML)

**What is it?**
Core Web Vitals are Google's standardized metrics for real-world page experience, directly influencing search ranking:

| Metric | Measures | Good threshold | HTML-level levers |
|---|---|---|---|
| **LCP** (Largest Contentful Paint) | Time until the largest visible content element (usually a hero image or heading) renders | ≤ 2.5s | `loading="eager"` on the LCP image (never lazy-load it!), `preload` on critical hero image/font, avoid render-blocking CSS/JS above the fold |
| **CLS** (Cumulative Layout Shift) | How much visible content unexpectedly shifts during load | ≤ 0.1 | Always set `width`/`height` (or `aspect-ratio`) on images/embeds/ads, reserve space for dynamically injected content (banners, ads), avoid injecting content above existing content without reserved space |
| **INP** (Interaction to Next Paint) | Responsiveness — delay between a user interaction (click/tap) and the next visual update | ≤ 200ms | Mostly a JS-thread issue (heavy handlers, large re-renders), but keeping the DOM tree lean and avoiding excessive event listeners on large HTML trees helps |

**Why was it invented / what problem does it solve?**
Older performance metrics (like generic "page load time") didn't correlate well with actual perceived user experience. Core Web Vitals were built by measuring what users actually complain about: "the page took forever to show anything" (LCP), "things jumped around while I was trying to click something" (CLS), and "the page felt janky/unresponsive when I tapped something" (INP, which replaced FID in 2024).

**Real-time / real-world usage**
Core Web Vitals scores are visible in Google Search Console and directly factor into SEO ranking (as part of Google's "page experience" signals), so performance work is often prioritized by business/marketing teams specifically because of its SEO impact, not just UX.

**How to explain this in an interview (simple English)**
"Core Web Vitals measure real user experience: LCP is how fast the main content appears — I'd never lazy-load the hero image and I'd preload critical fonts. CLS is about unexpected layout jumps — fixed by always reserving space with width/height or aspect-ratio on images and embeds. INP measures how responsive the page feels to clicks/taps, which is mostly a JS performance concern, but a lean DOM helps too."

---

## Quick Summary Table

| Technique | Effect |
|---|---|
| `loading="lazy"` | Defer offscreen images/iframes, saves bandwidth, must not use on LCP image |
| `preload` | Fetch a critical resource earlier than the browser would discover it |
| `prefetch` | Fetch a likely-next-page resource at low priority |
| `preconnect` | Warm up DNS/TCP/TLS to a third-party origin ahead of time |
| `title`/`meta description` | Core on-page SEO signals shown in search results |
| `rel="canonical"` | Avoids duplicate-content SEO penalties |
| Open Graph tags | Control social share preview cards |
| Structured data (JSON-LD / microdata) | Labels content with schema.org vocabulary so search engines can render rich snippets (ratings, price, stock) |
| `srcset` + `sizes` | Browser picks the right image resolution for the current viewport/density automatically |
| `<picture>` + `<source media>` | Art direction — swap the entire image (different crop/composition) per breakpoint |
| WebP/AVIF via `<picture>` | Smaller images, faster load, with fallback for older browsers |
| `width`/`height` on images | Prevents layout shift (CLS) |
| LCP / CLS / INP | The three Core Web Vitals; each has concrete HTML-level fixes |
