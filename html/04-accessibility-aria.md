# 04. Accessibility (a11y) and ARIA

## Why Accessibility Matters

**What is it?**
Web accessibility means building pages that people with disabilities (visual, motor, auditory, cognitive) can actually use — via screen readers, keyboard-only navigation, voice control, or magnification.

**Why was it invented / what problem does it solve?**
Without deliberate effort, websites naturally exclude people who can't use a mouse (motor impairments), can't see the screen (blind/low-vision users relying on screen readers), or can't perceive color differences (color blindness) or sound (deaf users). Accessibility guidelines (like WCAG) exist to give developers a concrete, testable checklist instead of vague good intentions.

Three concrete reasons it matters in a professional context:

| Reason | Detail |
|---|---|
| **Legal** | Many countries have laws (ADA in the US, EN 301 549 in the EU, RPWD Act in India) requiring digital accessibility for public-facing and government services. Companies get sued/fined for inaccessible sites — this is a real, recurring lawsuit category. |
| **UX** | Accessible design (clear focus states, good contrast, logical tab order) improves usability for *everyone*, not just disabled users — e.g., captions help in noisy environments, larger tap targets help everyone on mobile. |
| **SEO** | Semantic, well-structured, accessible markup is exactly what search engine crawlers parse best — accessibility and SEO best practices overlap heavily (alt text, heading hierarchy, meaningful link text). |

**Real-time / real-world usage**
Enterprise clients, government contracts, and large companies often *require* WCAG 2.1 AA compliance contractually. Accessibility audits are a standard part of QA in mature engineering orgs, and "was this feature checked for a11y" is a real code review question at senior level.

**How to explain this in an interview (simple English)**
"Accessibility means making sure people using screen readers, keyboards only, or assistive tech can fully use the site. It matters for legal compliance, better UX for everyone, and it overlaps a lot with SEO because both rely on clean, semantic, well-labeled markup."

---

## WCAG Basics

**What is it?**
WCAG (Web Content Accessibility Guidelines) is the standard reference for accessibility, organized around 4 principles, remembered by the acronym **POUR**:

| Principle | Meaning | Example |
|---|---|---|
| **Perceivable** | Content must be presentable in ways users can perceive | Alt text for images, captions for video, sufficient color contrast |
| **Operable** | Interface must be usable via multiple input methods | Full keyboard navigation, no time-limited actions without extension |
| **Understandable** | Content and UI behavior must be predictable | Clear labels, consistent navigation, error messages that explain how to fix |
| **Robust** | Content must work across current and future tools | Valid, semantic HTML that works with various assistive tech |

Conformance levels: **A** (minimum), **AA** (the common legal/industry target — e.g. 4.5:1 text contrast ratio), **AAA** (highest, rarely mandated).

**Real-time / real-world usage**
"AA compliance" is the phrase you'll hear most in real jobs — it's the level most companies target for legal/contract requirements.

**How to explain this in an interview (simple English)**
"WCAG is the standard for web accessibility, built around 4 principles: Perceivable, Operable, Understandable, Robust (POUR). Most companies target WCAG 2.1 AA compliance, which covers things like color contrast ratios, keyboard operability, and clear labeling."

---

## ARIA Roles and Attributes

**What is it?**
ARIA (Accessible Rich Internet Applications) is a set of HTML attributes that tell assistive technology extra information about an element's role, state, or properties — used **only** when native HTML semantics aren't enough.

```html
<!-- role: tells assistive tech what this element functionally is -->
<div role="button" tabindex="0">Custom Button</div>

<!-- aria-label: accessible name when there's no visible text -->
<button aria-label="Close dialog">✕</button>

<!-- aria-hidden: hides purely decorative content from screen readers -->
<span aria-hidden="true">🎉</span>

<!-- aria-live: announces dynamic content changes without moving focus
     "polite": waits for the screen reader to finish its current sentence (status messages)
     "assertive": interrupts immediately (time-sensitive errors, e.g. "session expiring") -->
<div aria-live="polite" id="statusMessage"></div>
<div aria-live="assertive" id="urgentError"></div>

<!-- aria-expanded / aria-controls: describes state of a collapsible widget -->
<button aria-expanded="false" aria-controls="menu">Menu</button>
<ul id="menu" hidden>...</ul>

<!-- aria-describedby: links an element to extra descriptive text (e.g. form errors) -->
<input aria-describedby="emailError" />
<span id="emailError">Please enter a valid email</span>
```

### The First Rule of ARIA

> "No ARIA is better than bad ARIA." If a native HTML element already provides the behavior/semantics you need, use it instead of recreating it with `div` + ARIA.

```html
<!-- Bad: reinventing a button, and you now must manually handle
     keyboard Enter/Space, focus styles, and role announcement -->
<div role="button" tabindex="0" onclick="submit()">Submit</div>

<!-- Good: native button gives you all of that for free -->
<button onclick="submit()">Submit</button>
```

**Why was it invented / what problem does it solve?**
As web apps became more interactive (custom dropdowns, tabs, modals, sliders) native HTML tags didn't have equivalents for many of these UI patterns. ARIA fills that gap so assistive technology can still understand *custom* widgets — but it is explicitly a "last resort" layer, not a replacement for using real semantic elements when they exist.

**Real-time / real-world usage**
Design systems (buttons, modals, tooltips, tabs, comboboxes) rely heavily on ARIA patterns from the [WAI-ARIA Authoring Practices Guide (APG)](https://www.w3.org/WAI/ARIA/apg/) to make custom components (that don't have a native HTML equivalent, like a "tabs" widget) accessible. A modal dialog, for instance, commonly uses `role="dialog"`, `aria-modal="true"`, and `aria-labelledby`.

**How to explain this in an interview (simple English)**
"ARIA attributes add accessibility information for cases where plain HTML isn't expressive enough — like custom widgets (tabs, modals, comboboxes). But the golden rule is: if a native tag already does the job, like `<button>`, use it instead of faking it with `div` + `role` + ARIA, because native elements give you keyboard support and semantics for free."

---

## ARIA Landmark Roles

**What is it?**
Landmark roles are a specific category of ARIA `role` values that mark out the major navigable regions of a page — the same regions that semantic HTML5 sectioning tags (`header`, `nav`, `main`, `footer`, `aside`) already represent. Screen readers expose a dedicated "jump to landmark" navigation mode (e.g., pressing `D` in NVDA, or using VoiceOver's Rotor) that lists exactly these regions, letting users skip directly to any of them instead of reading the page top to bottom.

```html
<!-- These pairs are functionally equivalent — the semantic tag already implies the role -->
<header>...</header>            <!-- implicit role="banner" -->
<nav>...</nav>                  <!-- implicit role="navigation" -->
<main>...</main>                <!-- implicit role="main" -->
<aside>...</aside>              <!-- implicit role="complementary" -->
<footer>...</footer>            <!-- implicit role="contentinfo" -->

<!-- Only needed when no matching semantic tag exists, or on a generic container -->
<div role="region" aria-label="Filters">...</div>
<form role="search">...</form>  <!-- superseded by the native <search> element, see file 08 -->
```

| Landmark role | Matching semantic tag | Purpose |
|---|---|---|
| `banner` | `<header>` (only when it's a *direct child of `<body>`*, i.e. the page-level header) | Site identity — logo, title, top-level nav |
| `navigation` | `<nav>` | A block of navigation links |
| `main` | `<main>` | The page's unique, dominant content |
| `complementary` | `<aside>` | Related-but-secondary content |
| `contentinfo` | `<footer>` (only the page-level one) | Copyright, site-wide links |
| `search` | `<search>` (or legacy `role="search"` on a `div`/`form`) | The page's search functionality |
| `region` | *(no dedicated tag — use `<section>` + `aria-label`)* | A generically important, labeled section not covered by another landmark |

**Why was it invented / what problem does it solve?**
Landmark roles predate HTML5's semantic tags — ARIA 1.0 defined them so pages built entirely out of `<div>`s (which was the norm before ~2014) could still expose a navigable region structure to screen readers via `role="banner"`, `role="navigation"`, etc. Once HTML5's sectioning elements shipped with these roles *built in* automatically, `role="banner"` etc. became mostly redundant on modern markup — but interviewers ask about this mapping specifically to test whether you understand that semantic HTML tags aren't just "nicer div names," they come with real, spec-defined ARIA semantics attached for free.

**Real-time / real-world usage**
A quick accessibility-audit checklist item is verifying a page has exactly the landmarks it should: one `banner`, one `main`, one `contentinfo`, and clearly labeled `navigation`/`complementary` regions if there are multiple of them (e.g., two `<nav>`s — main menu and footer links — should each get a distinct `aria-label` like `aria-label="Primary"` / `aria-label="Footer"` so a screen reader user can tell them apart when jumping between landmarks).

**How to explain this in an interview (simple English)**
"Landmark roles like `banner`, `navigation`, `main`, `complementary`, `contentinfo` mark the major regions of a page so screen reader users can jump straight to one instead of reading top to bottom. The good news is `<header>`, `<nav>`, `<main>`, `<aside>`, `<footer>` already carry these roles automatically — that's part of why using real semantic tags instead of `div`s matters. I'd only reach for `role="region"` with an `aria-label` when there's an important labeled section that doesn't match any of the built-in landmark tags, and I'd give multiple `<nav>`s distinct `aria-label`s so they're distinguishable in landmark navigation."

---

## Focus Management and Keyboard Navigation

**What is it?**
Focus management means controlling *where the keyboard focus is* as the user interacts with the page — critical for anyone who can't use a mouse (motor-impaired users, power users, screen reader users all navigate primarily via Tab/Shift+Tab/Enter/Space/Arrow keys).

### Key concepts

| Concept | What it does |
|---|---|
| `tabindex="0"` | Adds an element to the natural tab order (in DOM order) — use for custom interactive elements |
| `tabindex="-1"` | Removes from tab order but still focusable programmatically via `.focus()` — used for focus-trapping in modals |
| `tabindex` (positive number) | Manually overrides tab order — **avoid this**, it usually creates confusing, inconsistent navigation |
| `:focus` / `:focus-visible` (CSS) | Style the currently focused element — **never** remove focus outlines (`outline: none`) without providing a clear visual replacement |
| Focus trap | When a modal opens, focus should move inside it and Tab should cycle only within it until closed |
| Skip links | A hidden "Skip to main content" link, visible on focus, letting keyboard users bypass repetitive nav |

```html
<a class="skip-link" href="#main">Skip to main content</a>
<nav>...</nav>
<main id="main">...</main>

<style>
  .skip-link {
    position: absolute;
    left: -9999px;
  }
  .skip-link:focus {
    left: 0; /* becomes visible only when tabbed to */
  }
</style>
```

```js
// Basic focus trap pattern for a modal
function openModal(modalEl) {
  modalEl.removeAttribute('hidden');
  const focusable = modalEl.querySelectorAll('button, input, a, [tabindex]');
  focusable[0].focus(); // move focus into the modal on open

  modalEl.addEventListener('keydown', (e) => {
    if (e.key === 'Tab') {
      // wrap focus between first and last focusable elements
    }
    if (e.key === 'Escape') closeModal(modalEl);
  });
}
```

**Why was it invented / what problem does it solve?**
A sighted mouse user can click anywhere instantly; a keyboard-only or screen-reader user experiences the page strictly in the order focus moves. If focus isn't managed (e.g., opening a modal doesn't move focus into it, or closing it doesn't return focus to the trigger button), keyboard users get "lost" — they might tab behind a modal into content that's supposedly hidden, or lose their place entirely.

**Real-time / real-world usage**
Every modal, dropdown, and off-canvas menu in a production design system needs explicit focus management. This is one of the most commonly *failed* accessibility checks in real audits.

**How to explain this in an interview (simple English)**
"Focus management means making sure keyboard users always know where they are on the page. When a modal opens, focus should move into it and be trapped there until it closes, then return to the button that opened it. `tabindex='0'` adds custom elements to tab order, `tabindex='-1'` lets you focus something programmatically without it being tabbable."

---

## Alt Text and Images

**What is it?**
The `alt` attribute on `<img>` provides a text alternative that screen readers announce instead of the image, and that displays if the image fails to load.

```html
<!-- Informative image: describe what it conveys -->
<img src="chart.png" alt="Sales grew 40% from January to March 2026" />

<!-- Decorative image: empty alt tells screen readers to skip it entirely -->
<img src="divider-swirl.png" alt="" />

<!-- Functional image (e.g. inside a link/button): describe the action, not the picture -->
<a href="/cart"><img src="cart-icon.png" alt="View shopping cart" /></a>
```

**Why was it invented / what problem does it solve?**
A screen reader can't "see" an image — without `alt`, it either announces the filename (useless, e.g. "IMG_4821.jpg") or says nothing at all, both leaving a blind user with a gap in the content. `alt=""` (explicitly empty, not missing) is a real, valid pattern for purely decorative images — it tells the screen reader "skip this, it's noise, not content."

**Real-time / real-world usage**
E-commerce product images need descriptive alt text ("Red cotton crew-neck t-shirt, front view") both for accessibility and because alt text is indexed by image search (SEO benefit). Icon-only buttons must have accessible text via `alt`, `aria-label`, or visually-hidden text — never rely on an icon alone.

**How to explain this in an interview (simple English)**
"`alt` text describes an image for people who can't see it. If the image is purely decorative, use `alt=\"\"` so screen readers skip it. If it conveys information or is inside a clickable link, the alt text should describe the meaning or the action, not just restate 'image of...'."

---

## Accessible Forms

**What is it?**
An accessible form ensures every input has a clearly associated label, errors are announced, and the whole thing is fully operable by keyboard.

```html
<!-- Explicit label association via matching id/for -->
<label for="email">Email address</label>
<input id="email" name="email" type="email" required aria-describedby="emailHint" />
<span id="emailHint">We'll never share your email.</span>

<!-- Grouping related fields -->
<fieldset>
  <legend>Shipping Address</legend>
  <label for="street">Street</label>
  <input id="street" name="street" />
</fieldset>

<!-- Announcing validation errors -->
<input id="password" aria-invalid="true" aria-describedby="passwordError" />
<span id="passwordError" role="alert">Password must be at least 8 characters</span>
```

Key rules:
- Every input needs a real `<label>` (via `for`/`id`, or by wrapping the input) — a placeholder is **not** a label; it disappears on focus/input and isn't reliably announced.
- Group related fields with `<fieldset>` + `<legend>` (e.g., radio button groups, address sections).
- Use `aria-invalid="true"` and `aria-describedby` to link an input to its error message, and `role="alert"` so screen readers announce the error immediately when it appears.

**Why was it invented / what problem does it solve?**
Without a real `<label>`, a screen reader user tabbing to an input hears nothing about what it's for. Placeholder-as-label is one of the most common accessibility bugs in real production apps because it *looks* fine visually but leaves screen reader users guessing.

**Real-time / real-world usage**
Any login/signup/checkout form audited for accessibility gets checked first for: real labels, grouped fieldsets, and announced errors. This is a very common senior-level code review comment.

**How to explain this in an interview (simple English)**
"Every input needs a real `<label>` linked via `for`/`id` — placeholders don't count because they disappear and aren't reliable for screen readers. Related fields should be grouped in a `fieldset`/`legend`, and validation errors should use `aria-describedby` plus `role='alert'` so they're announced immediately."

---

## Screen Reader Basics

**What is it?**
A screen reader (VoiceOver on Mac/iOS, NVDA/JAWS on Windows, TalkBack on Android) converts on-screen content into speech (or braille output), and lets users navigate via keyboard shortcuts instead of visually scanning the page.

Key things screen readers rely on:
- **Heading hierarchy** (`h1`→`h6` in logical order) — used to build a jump-to-section outline.
- **Landmark regions** (`header`, `nav`, `main`, `footer`) — used to jump between major page areas.
- **Link text** — "click here" is bad; a screen reader user often browses a list of *all links on the page out of context*, so link text needs to make sense standalone ("Download the 2026 pricing PDF", not "click here").
- **Live regions** (`aria-live`) — for announcing dynamic updates (toast notifications, form errors) without requiring focus to move.

**Real-time / real-world usage**
A quick sanity test any developer can do: unplug your mouse and try to complete your own feature using only Tab/Shift+Tab/Enter/Space/Arrow keys, or turn on VoiceOver (Cmd+F5 on Mac) and try to use the page. This "keyboard-only + screen-reader smoke test" catches most obvious accessibility issues quickly.

**How to explain this in an interview (simple English)**
"Screen readers read the page aloud and let users navigate via headings, landmarks, and links rather than visually scanning. That's why heading order matters, link text needs to be descriptive out of context, and dynamic content changes should use `aria-live` so they get announced without forcing a focus change."

---

## Quick Summary Table

| Concept | Key point |
|---|---|
| Why a11y matters | Legal compliance, better UX for everyone, overlaps with SEO |
| WCAG | POUR principles; AA is the common target level |
| ARIA golden rule | Use native HTML elements first; ARIA is a last resort for custom widgets |
| Landmark roles | `banner`/`navigation`/`main`/`complementary`/`contentinfo` — already built into `header`/`nav`/`main`/`aside`/`footer` |
| `aria-live="polite"` vs `"assertive"` | Polite waits its turn to announce; assertive interrupts immediately for urgent messages |
| `tabindex="0"` vs `"-1"` | 0 = in tab order; -1 = focusable via JS only, not by tabbing |
| `alt=""` | Explicitly marks an image as decorative (skip it) |
| Placeholder ≠ label | Always use a real `<label>` |
| `aria-live` | Announces dynamic content changes without moving focus |
| Quick test | Try the feature with mouse unplugged / screen reader on |
