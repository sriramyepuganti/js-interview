# 03. Forms and Validation

## What is an HTML Form?

**What is it?**
A `<form>` is a container that collects user input (text, choices, files) and sends it somewhere — traditionally to a server, but in modern SPAs, usually intercepted by JavaScript and sent via `fetch`.

```html
<form action="/submit" method="POST">
  <label for="email">Email</label>
  <input type="email" id="email" name="email" required />
  <button type="submit">Submit</button>
</form>
```

**Why was it invented / what problem does it solve?**
Before JavaScript existed at all, forms were the *only* way a web page could send user data back to a server — think classic search boxes, login pages, guestbooks from the 90s. The browser handles the entire request/response cycle natively: collect field values, URL-encode them, send an HTTP request, and reload the page with the response. This "it just works without JS" behavior is still valuable today for progressive enhancement and accessibility.

**Real-time / real-world usage**
Every signup page, login page, checkout flow, search bar, and settings page uses forms. Even in React apps where you intercept `onSubmit`, you're still building on top of native form semantics (labels, input types, required attributes) for validation and accessibility.

**How to explain this in an interview (simple English)**
"A form groups related inputs together and defines how/where they get submitted. Even in modern JS apps where we handle submission ourselves, we still use real `<form>` and `<input>` elements because the browser gives us free validation, accessibility, and keyboard behavior (like Enter-to-submit) for free."

---

## Common Input Types

**What is it?**
The `type` attribute on `<input>` changes both the on-screen control *and* the built-in validation/behavior the browser applies — for free, with zero JS.

```html
<input type="text" />       <!-- plain text -->
<input type="email" />      <!-- validates "something@something.tld" shape -->
<input type="password" />   <!-- masks characters -->
<input type="number" />     <!-- numeric keypad on mobile, spinner arrows -->
<input type="tel" />        <!-- numeric keypad on mobile, no built-in format validation -->
<input type="url" />        <!-- validates URL shape -->
<input type="date" />       <!-- native date picker -->
<input type="checkbox" />   <!-- boolean toggle, multiple can be checked -->
<input type="radio" />      <!-- pick one from a group (same `name`) -->
<input type="file" />       <!-- file upload -->
<input type="search" />     <!-- adds a clear (x) button in most browsers -->
<input type="range" />      <!-- slider -->
<input type="color" />      <!-- native color picker -->
<input type="hidden" />     <!-- data sent with the form but not shown to the user -->
```

**Why was it invented / what problem does it solve?**
Before HTML5 (pre-2014), almost everything was `type="text"`, and developers had to write custom JavaScript to validate emails, show date pickers, or restrict input to numbers. HTML5 added ~13 new input types specifically so browsers (and especially mobile OSes) could provide the *right keyboard, right UI control, and baseline validation* automatically — better UX, less JS.

**Real-time / real-world usage**
Mobile checkout forms specifically pick `type="tel"` for phone numbers (numeric keypad, no OTP-friendly autocorrect) and `type="email"` for email (shows `@` key prominently on the mobile keyboard). Getting the `type` right is a small thing that measurably improves mobile form completion rates.

**How to explain this in an interview (simple English)**
"Input types aren't just about validation — they change the actual keyboard/UI the browser shows, especially on mobile. `type="email"` gives you an `@` key and validates the shape; `type="tel"` gives a numeric keypad. Picking the correct type is free UX + free validation."

---

## Other Native Form Controls: `select`, `textarea`, `datalist`, `output`, `progress`, `meter`

**What is it?**
Beyond `<input>`, HTML has several other dedicated form-related elements, each solving a distinct UI problem natively, without needing a custom-built JS widget:

```html
<!-- select + optgroup: a dropdown, grouped -->
<label for="country">Country</label>
<select id="country" name="country">
  <optgroup label="North America">
    <option value="us">United States</option>
    <option value="ca">Canada</option>
  </optgroup>
  <optgroup label="Europe">
    <option value="de">Germany</option>
    <option value="fr" selected>France</option>
  </optgroup>
</select>

<!-- textarea: multi-line free text -->
<label for="bio">Bio</label>
<textarea id="bio" name="bio" rows="4" maxlength="500"></textarea>

<!-- datalist: an editable input with a suggestion dropdown (NOT a closed list like select) -->
<label for="browser">Favorite browser</label>
<input id="browser" name="browser" list="browserOptions" />
<datalist id="browserOptions">
  <option value="Chrome"></option>
  <option value="Firefox"></option>
  <option value="Safari"></option>
</datalist>

<!-- output: displays the result of a calculation, often tied to a form control -->
<form oninput="totalOut.value = Number(qty.value) * 9.99">
  <input id="qty" name="qty" type="number" value="1" min="1" />
  <output id="totalOut" name="totalOut" for="qty">9.99</output>
</form>

<!-- progress: a determinate progress bar (e.g. file upload) -->
<progress value="70" max="100">70%</progress>

<!-- meter: a scalar measurement within a known range (e.g. disk usage, password strength) -->
<meter value="6" min="0" max="10" low="3" high="8" optimum="10">6 out of 10</meter>
```

| Element | Purpose | Key detail |
|---|---|---|
| `<select>` + `<option>` / `<optgroup>` | A closed dropdown — user must pick from the provided options | `<optgroup label="...">` visually/semantically groups related options |
| `<textarea>` | Multi-line plain text input | `rows`/`cols` set the visible size (not a length limit); `maxlength` limits characters |
| `<datalist>` + `list` attribute on `<input>` | An *editable* text input with autocomplete-style suggestions | Unlike `<select>`, the user can still type a value that isn't in the list |
| `<output>` | Semantically marks an element as the *result* of a calculation/user action | `for="id1 id2"` associates it with the input(s) that produced the result, for assistive tech |
| `<progress>` | A determinate (`value`/`max`) or indeterminate (no `value`) task-completion bar | Native styling can be customized via `::-webkit-progress-bar`/`::-moz-progress-bar` or the newer `appearance` property |
| `<meter>` | A gauge for a value within a range (disk quota, battery, rating) — **not** for generic task progress | `low`/`high`/`optimum` let the browser render it green/yellow/red automatically based on where the value falls |

**Why was it invented / what problem does it solve?**
Each of these existed as a real, recurring UI need long before HTML had a native answer for it, and each used to require custom JS + ARIA to be accessible: a dropdown built from `<div>`s needs full keyboard/ARIA combobox behavior reimplemented by hand; a "did you mean...?" text suggestion box needed a JS-built autocomplete widget; a progress bar needed a `<div>` with `role="progressbar"` and manually-updated `aria-valuenow`. Native elements give you correct keyboard behavior, screen reader announcements, and mobile-appropriate UI (e.g., `<select>` opens the OS's native picker on mobile) for free, with zero ARIA hand-rolling.

**Real-time / real-world usage**
- `<select>`: country/state pickers, sort-order dropdowns, plan selection.
- `<textarea>`: comments, bios, support ticket descriptions, feedback forms.
- `<datalist>`: "search a city" fields that suggest but don't force a choice, tag input helpers.
- `<output>`: live totals in a shopping cart/quantity calculator, BMI/loan calculators.
- `<progress>`: file upload progress, multi-step wizard progress, video buffering indicators.
- `<meter>`: password strength meters, storage quota usage ("6.2 GB of 10 GB used"), battery/signal-style gauges.

**How to explain this in an interview (simple English)**
"`<select>`/`<optgroup>` give you a native, accessible dropdown — mobile browsers even swap in their own picker UI. `<textarea>` is for multi-line text. `<datalist>` is different from `<select>` — it's a normal text input with *suggestions*, the user can still type something not on the list. `<output>` semantically marks a calculated result and links back to its inputs via `for`. `<progress>` is for task completion (determinate or not), and `<meter>` is for a value within a range, like a gauge — and it's not interchangeable with `<progress>`, since `<meter>` is about *where a value sits*, not *how much of a task is done*."

---

## Native Validation Attributes

**What is it?**
The browser can validate form fields *before* anything is submitted, using plain HTML attributes — no JavaScript required.

```html
<form>
  <input type="text" required minlength="3" maxlength="20" />
  <input type="number" min="18" max="99" step="1" />
  <input type="text" pattern="[A-Za-z]{3,}" title="At least 3 letters, no numbers" />
  <input type="email" required />
  <button type="submit">Submit</button>
</form>
```

| Attribute | What it does |
|---|---|
| `required` | Field must be filled before submit |
| `minlength` / `maxlength` | Text length bounds |
| `min` / `max` | Numeric or date bounds |
| `step` | Increment granularity for number/date/range |
| `pattern` | Regex the value must match |
| `type` | Built-in shape validation (email, url, number) |
| `novalidate` (on `<form>`) | Disables native validation entirely (you handle it in JS) |

**Why was it invented / what problem does it solve?**
Before HTML5, *all* validation was custom JavaScript — every team wrote (and re-wrote, and got wrong) the same email regex, the same "field is empty" check. Native validation attributes standardize the most common 80% of validation rules directly in markup: faster to write, works even if JS fails to load, and gives consistent built-in error messages and focus behavior across the page.

The browser exposes this through the **Constraint Validation API** in JS:

```js
const input = document.querySelector('input');
input.checkValidity();       // true/false
input.validity.valueMissing; // true if required and empty
input.setCustomValidity('Custom error message'); // force a custom error
```

**Real-time / real-world usage**
Signup forms combine native validation (quick, built-in feedback) with JS validation (custom business rules like "username already taken," checked via API call) and CSS (`:invalid`, `:valid` pseudo-classes to style fields red/green).

```css
input:invalid { border-color: red; }
input:valid { border-color: green; }
```

**How to explain this in an interview (simple English)**
"HTML gives us basic validation for free using attributes like `required`, `pattern`, `min`, `max` — the browser blocks submission and shows a native error tooltip. This covers common cases without JS. For business-specific rules (like checking if a username is taken), we still need JavaScript, usually via the Constraint Validation API (`setCustomValidity`) so custom errors integrate with the native UI."

---

## Form Submission Mechanics

**What is it?**
When a form is submitted (Enter key, or a `type="submit"` button), the browser:
1. Runs native validation on all fields (unless `novalidate` is set). If anything fails, it stops and focuses the first invalid field.
2. Collects all successful form-associated elements' `name`/`value` pairs.
3. Encodes them based on `method` and `enctype`.
4. Sends the request and (by default) does a full page navigation to load the response.

```html
<form action="/login" method="POST" enctype="application/x-www-form-urlencoded">
```

| `method` | Where data goes | Notes |
|---|---|---|
| `GET` | Appended to URL as a query string | Visible in URL, bookmarkable, no file uploads, has length limits |
| `POST` | Sent in the request body | Not visible in URL, supports file uploads, no length limit |

| `enctype` | Use case |
|---|---|
| `application/x-www-form-urlencoded` (default) | Simple text fields |
| `multipart/form-data` | Required when uploading files (`<input type="file">`) |
| `text/plain` | Rarely used, debugging only |

**Why was it invented / what problem does it solve?**
This is literally how the web worked before AJAX existed (pre-2000s) — a full-page reload was the only mechanism for a page to "submit and get new data." Understanding it matters because modern JS form handling (`event.preventDefault()` + `fetch`) is explicitly *opting out* of this default browser behavior — you need to know what you're overriding and why.

**Real-time / real-world usage**
In an SPA (React/Vue), you almost always call `event.preventDefault()` in the submit handler to stop the native full-page reload, then send the data yourself via `fetch`/`axios` so the page doesn't refresh and you control the UX (loading spinners, inline errors, staying on the same page).

```js
form.addEventListener('submit', async (e) => {
  e.preventDefault(); // stop native GET/POST navigation
  const formData = new FormData(form);
  await fetch('/api/login', { method: 'POST', body: formData });
});
```

**How to explain this in an interview (simple English)**
"By default, submitting a form causes a full-page navigation — GET puts data in the URL, POST puts it in the request body. In SPAs we call `preventDefault()` to stop that native behavior and handle the submission ourselves with `fetch`, so we can update the UI without a full reload."

---

## FormData API

**What is it?**
`FormData` is a built-in JS object that automatically reads *all* the fields inside a `<form>` (including files) into a key-value structure you can send directly in a `fetch` request — no manual DOM querying needed.

```html
<form id="signupForm">
  <input name="username" value="sriram" />
  <input type="file" name="avatar" />
</form>

<script>
  const form = document.getElementById('signupForm');
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const formData = new FormData(form); // grabs every named field automatically
    formData.append('source', 'web');    // can add extra fields manually

    const res = await fetch('/api/signup', {
      method: 'POST',
      body: formData, // fetch sets the correct multipart Content-Type automatically
    });
  });
</script>
```

**Why was it invented / what problem does it solve?**
Before `FormData`, sending file uploads via JavaScript required manually building a `multipart/form-data` body string byte-by-byte — extremely painful. `FormData` gives you that for free by just pointing it at a `<form>` element (or building one manually with `.append()`), and it works seamlessly with `fetch`/`XMLHttpRequest`.

**Real-time / real-world usage**
Any form with a file upload (profile picture, resume upload, document attachment) uses `FormData`. It's also handy for building request bodies from mixed data (text fields + files) in a single request instead of separate JSON + file endpoints.

**How to explain this in an interview (simple English)**
"`FormData` automatically collects every input's name/value from a form, including files, and can be passed directly as a `fetch` body. It saves you from manually building `multipart/form-data` requests, which is especially useful for file uploads."

---

## Real-Time Example: Signup / Checkout Form Pattern

```html
<form id="checkoutForm" novalidate>
  <label for="cardNumber">Card Number</label>
  <input
    id="cardNumber"
    name="cardNumber"
    type="text"
    inputmode="numeric"
    pattern="[0-9]{16}"
    required
    aria-describedby="cardNumberError"
  />
  <span id="cardNumberError" role="alert"></span>

  <button type="submit">Pay Now</button>
</form>

<script>
  const form = document.getElementById('checkoutForm');
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const card = form.cardNumber;
    if (!card.checkValidity()) {
      document.getElementById('cardNumberError').textContent =
        'Please enter a valid 16-digit card number.';
      card.focus(); // send keyboard focus to the invalid field
      return;
    }
    // native validation passed — now submit via fetch, show loading state, etc.
  });
</script>
```

This combines: native attributes (`pattern`, `required`) for baseline checks, `novalidate` + custom JS for controlled error UX (so you can style errors consistently instead of relying on the browser's native tooltip), and `aria-describedby` so screen readers announce the error alongside the field.

---

## Quick Summary Table

| Concept | Key point |
|---|---|
| `<form>` | Native mechanism to collect + submit user input, works without JS |
| Input types | Change both UI/keyboard and built-in validation |
| Validation attributes | `required`, `pattern`, `min`/`max`, `minlength`/`maxlength` — free validation, no JS |
| `method` GET vs POST | GET = URL query string (visible, limited); POST = body (hidden, supports files) |
| `enctype` | Must be `multipart/form-data` for file uploads |
| `select`/`textarea`/`datalist`/`output`/`progress`/`meter` | Native controls for dropdowns, multi-line text, editable suggestions, calculated results, task progress, and range gauges — all accessible by default |
| `FormData` | Reads all form fields (incl. files) into a fetch-ready object |
| `preventDefault()` | Used in SPAs to stop native full-page submission and handle it via JS |
