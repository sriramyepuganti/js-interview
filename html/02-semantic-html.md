# 02. Semantic HTML

## Semantic vs Non-Semantic Elements

**What is it?**
A **semantic element** is a tag whose name clearly describes the *meaning/purpose* of the content inside it — to both the browser and the developer reading the code. A **non-semantic element** (`<div>`, `<span>`) tells you nothing about the content; it's a generic box that only means something because of a class name or CSS you added.

```html
<!-- Non-semantic: no meaning without reading classnames -->
<div class="header">
  <div class="nav">...</div>
</div>

<!-- Semantic: meaning is obvious from the tag itself -->
<header>
  <nav>...</nav>
</header>
```

**Why was it invented / what problem does it solve?**
In the early web (and through the `<div>`-soup era of the 2000s), developers built entire pages out of nested `<div>`s and `<span>`s with class names like `class="header"`, `class="mainContent"`. This worked visually but:
- Screen readers had no way to say "this is navigation" vs "this is the main content" — everything was just an anonymous box.
- Search engines had no strong signal about which part of the page was the actual article vs sidebar/ads.
- Developers reading someone else's markup had to rely on class names (which could be named anything, or nothing).

HTML5 (published as a stable recommendation around 2014) introduced dedicated semantic tags — `header`, `nav`, `main`, `article`, `section`, `aside`, `footer`, `figure`, `figcaption`, `time`, `mark` — specifically to fix this. They carry meaning in the browser's accessibility tree automatically, with zero extra work.

**Why semantics matter (the 3 real reasons)**

| Reason | Explanation |
|---|---|
| **Accessibility** | Screen readers use semantic tags to build a navigable outline (e.g., "jump to navigation," "jump to main content"). A blind user can skip straight to `<main>` instead of tabbing through the entire header/nav every time. |
| **SEO** | Search engine crawlers weight content inside `<article>`/`<main>`/`<h1>` more meaningfully than content in generic `<div>`s, and can better understand page structure for rich snippets. |
| **Maintainability** | A developer opening the file for the first time can understand the page layout at a glance, without reading CSS or class names. Semantic tags are self-documenting code. |

**Real-time / real-world usage**
Any production page layout (blog, dashboard, e-commerce PDP) uses semantic tags for the page skeleton, and reserves `<div>`/`<span>` purely for styling hooks that have no inherent meaning (a wrapper for a grid, a flex container, an icon wrapper).

**How to explain this in an interview (simple English)**
"Semantic tags like `<header>`, `<nav>`, `<main>` describe what the content *is*, not just how it looks. This helps screen readers navigate the page, helps search engines understand structure, and makes the code self-explanatory for other developers. `<div>` and `<span>` are semantically meaningless — they're only for grouping/styling when no meaningful tag fits."

---

## The Core Semantic Tags

```html
<body>
  <header>
    <!-- Site/page header: logo, title, sometimes nav -->
    <h1>My Blog</h1>
    <nav>
      <!-- Primary navigation links -->
      <a href="/">Home</a>
      <a href="/about">About</a>
    </nav>
  </header>

  <main>
    <!-- The ONE main content area of the page (only one per page) -->
    <article>
      <!-- Self-contained, independently distributable content (a blog post, news story) -->
      <h2>Article Title</h2>
      <section>
        <!-- A thematic grouping of content, usually with its own heading -->
        <h3>Introduction</h3>
        <p>...</p>
      </section>
    </article>

    <aside>
      <!-- Content tangentially related to main content: sidebars, ads, related links -->
      <h4>Related Posts</h4>
    </aside>
  </main>

  <footer>
    <!-- Site/page footer: copyright, links, contact info -->
    <p>&copy; 2026 My Blog</p>
  </footer>
</body>
```

### `header` vs `nav` vs `main` vs `article` vs `section` vs `aside` vs `footer`

| Tag | Meaning | Rule of thumb |
|---|---|---|
| `<header>` | Introductory content for its nearest section/page | Can appear multiple times (once per `article`/`section`, plus one for the page) |
| `<nav>` | A block of navigation links | Use for *major* navigation blocks only, not every list of links |
| `<main>` | The dominant, unique content of the document | Exactly **one** per page, not nested inside `article`/`aside`/`header`/`footer` |
| `<article>` | Independent, self-contained content that would make sense on its own (RSS feed item, forum post, blog post) | Ask: "would this make sense if pulled out and shown alone?" If yes → `article` |
| `<section>` | A thematic grouping of content, usually with a heading | Ask: "does this have its own heading and is it a distinct part of a larger whole?" |
| `<aside>` | Related-but-separate content | Sidebars, pull quotes, ad blocks, "related articles" |
| `<footer>` | Closing content for its nearest section/page | Copyright, footer nav, contact info |

**Why was it invented / what problem does it solve?**
Before these tags, there was no standard way to mark "this specific chunk is the main content" vs "this is supplementary." Assistive technology and browsers had to guess. These tags standardize the *outline* of a document the same way `<h1>`-`<h6>` standardize heading hierarchy.

**Real-time / real-world usage**
- News/blog sites: `article` per post, `section` for chapters within a long post, `aside` for "you may also like."
- Dashboards: `main` for the primary panel, `aside` for a collapsible sidebar nav/filters.
- E-commerce PDP: `main > article` for the product details, `aside` for "customers also bought."

**How to explain this in an interview (simple English)**
"`header`/`footer` are for intro/closing content of a section or page. `nav` is for major link groups. `main` is the one unique content area per page. `article` is standalone content that makes sense on its own — like a blog post. `section` is a themed chunk of content, usually with its own heading. `aside` is related-but-secondary content, like a sidebar."

---

## `div`/`span` vs Semantic Tags — When to Use Which

**What is it?**
`<div>` (block) and `<span>` (inline) are **generic containers with no semantic meaning**. They exist purely so you have something to attach a class/style/JS hook to when no meaningful HTML tag fits.

**Decision rule:**
1. Is there a tag that describes what this actually *is*? (navigation → `nav`, a button → `button`, a list → `ul`/`ol`, emphasis → `em`/`strong`) → use it.
2. Is this a distinguishable region of the page with layout/structural meaning (header/main content/sidebar/footer)? → use the semantic sectioning tag.
3. Is this purely a styling/layout wrapper with no meaning of its own (a flex row wrapping two buttons, a grid container)? → `div`/`span` is correct and *preferred* — don't force a semantic tag where none fits, that's "semantic tag abuse" and confuses screen readers just as much as div-soup does.

```html
<!-- Good: div used purely for layout, no fake semantics -->
<div class="button-row">
  <button>Cancel</button>
  <button>Save</button>
</div>

<!-- Bad: forcing semantics where none is needed -->
<section class="button-row">  <!-- a button row isn't a "thematic section" -->
  <button>Cancel</button>
</section>
```

**Real-time / real-world usage**
In component-based frameworks (React/Vue), you'll still see plenty of `div`s as layout wrappers (flex/grid containers) — that's correct and expected. The mistake to avoid is using `div` for things that *do* have semantic meaning (e.g., a `div onClick` pretending to be a button instead of using `<button>`, which breaks keyboard accessibility).

**How to explain this in an interview (simple English)**
"Use a semantic tag whenever one accurately describes the content's role. Use `div`/`span` only when you need a generic wrapper purely for styling/scripting and no meaningful tag applies. Don't force semantic tags where they don't belong, and don't use `div` for things like buttons or links that have dedicated semantic + accessible elements."

---

## Quick Summary Table

| Question | Answer |
|---|---|
| Why do semantic tags matter? | Accessibility (screen reader navigation), SEO (crawler understanding), maintainability (self-documenting code) |
| How many `<main>` per page? | Exactly one |
| `article` vs `section`? | `article` = stands alone independently; `section` = themed part of a larger whole |
| When to use `div`/`span`? | Only when no semantic tag fits — pure styling/scripting wrapper |
| Biggest semantic HTML mistake | Using `div onClick` instead of `<button>`, or nesting `<main>` inside `<article>` |
