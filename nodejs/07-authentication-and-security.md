# 07. Authentication and Security

## Sessions vs JWT
**What is it?**
- **Session-based auth:** after login, the server creates a session record (often stored server-side in memory/Redis/DB) and gives the browser a cookie containing just a session ID. On each request, the server looks up that ID to find out who the user is.
- **JWT (JSON Web Token) auth:** after login, the server issues a signed token containing the user's claims (id, role, expiry) directly inside it. The client sends this token on each request (usually in an `Authorization: Bearer <token>` header), and the server just **verifies the signature** — no server-side lookup needed.

**Why was JWT invented / when did it start mattering more?** Sessions require server-side storage, which is awkward once you have **multiple server instances** behind a load balancer (session data has to be shared — sticky sessions or a shared store like Redis) or you're calling **other services** (mobile apps, third-party APIs, microservices) that aren't naturally cookie-based. JWTs are **stateless** — any server that knows the signing secret/public key can verify the token without a shared session store, which fits REST APIs, mobile clients, and microservices architectures much better.

```js
// Session-based (simplified)
app.use(session({ secret: 'shh', resave: false, saveUninitialized: false }));
app.post('/login', (req, res) => {
  // ... verify credentials ...
  req.session.userId = user.id; // stored server-side; cookie just holds a session ID
  res.send('logged in');
});

// JWT-based (simplified) — see examples/jwt-auth-example.js for the full runnable version
const jwt = require('jsonwebtoken');
app.post('/login', (req, res) => {
  // ... verify credentials ...
  const token = jwt.sign({ userId: user.id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '1h' });
  res.json({ token });
});
```

### Comparison table

| | Sessions | JWT |
|---|---|---|
| State | Stateful (server stores session data) | Stateless (all info is in the token) |
| Scaling across servers | Needs shared store (Redis) or sticky sessions | Any server with the secret can verify — no shared store needed |
| Revocation ("log this user out now") | Easy — delete the session record | Hard — token is valid until it expires unless you maintain a blocklist (which reintroduces state) |
| Best fit | Traditional server-rendered web apps, single backend | REST/GraphQL APIs, mobile apps, microservices, SPA + API pattern |
| Payload size on the wire | Small (just a session ID) | Larger (the whole token is sent every request) |
| Storage on client | HttpOnly cookie (safer, JS can't read it) | Often localStorage (riskier — readable by JS, so vulnerable to XSS) or a cookie |

**When to use which:** For a classic server-rendered app with one backend, sessions are simpler and easier to revoke. For a stateless REST API consumed by an SPA/mobile app, or a microservices setup where multiple services need to verify identity independently, JWT is the more natural fit — but store it carefully (see cookies section below) since client-side storage of tokens has its own risks.

**How to explain it in an interview:**
> "Sessions store user state server-side and give the client just a session ID in a cookie — simple, easy to revoke, but requires shared storage once you scale to multiple servers. JWTs are stateless — the token itself carries the user's identity, cryptographically signed, so any server can verify it without a shared store, which is why APIs and microservices favor JWT. The trade-off is revocation is harder with JWT, since a signed token stays valid until it expires unless you maintain some kind of blocklist."

---

## OAuth 2.0 and OpenID Connect (OIDC) — the basics
**What is it?** OAuth 2.0 is a **delegation/authorization** protocol — it lets a user grant one application limited access to their data on *another* service, without ever handing that first application their password for the second service. OpenID Connect (OIDC) is a thin identity layer **built on top of** OAuth 2.0 that adds "who is this user," standardizing login (authentication), which OAuth alone doesn't actually define.

**Why was it invented?** Before OAuth (2007-2012 era), the only way for App A to act on your behalf on Service B (e.g., "post to your Twitter") was for you to type your Service B password directly into App A — meaning App A now had your actual credentials, could do anything your account could do, forever, and you'd have to change your password to revoke access. OAuth solves this by having the user authenticate **directly with Service B** (never typing a password into App A at all), and Service B hands App A a **scoped, revocable token** — "this token can only read your profile and post tweets, and can be revoked independently, without changing your account password."

**The key distinction interviewers actually probe:**
- **Authentication** = "who are you?" (OIDC's job — it issues an **ID token**, a JWT describing the logged-in user).
- **Authorization** = "what are you allowed to do?" (OAuth's job — it issues an **access token**, used to call an API on the user's behalf with specific, limited **scopes**, e.g. `read:profile`).

**The Authorization Code flow (the one you should be able to describe end-to-end):**
1. Your app redirects the user's browser to the provider's (Google/GitHub/Okta/Auth0) login/consent screen, with your `client_id`, a `redirect_uri`, and the `scope`s you're requesting.
2. The user logs in **on the provider's own site** (your app never sees their password) and approves the requested scopes.
3. The provider redirects back to your `redirect_uri` with a short-lived, single-use **authorization code** in the URL.
4. Your **backend** (not the browser — this step needs your app's secret) exchanges that code, plus your `client_id`/`client_secret`, for an **access token** (and, for OIDC, an **ID token**) by calling the provider's token endpoint directly, server-to-server.
5. Your backend uses the access token to call the provider's API on the user's behalf (e.g., fetch their profile), and/or decodes the ID token to know who just logged in.

**PKCE (Proof Key for Code Exchange) — why modern flows require it:** for public clients that can't safely hold a `client_secret` (a mobile app, a browser-based SPA — the secret would be visible in the compiled app/JS bundle), an attacker who intercepts the authorization code in step 3 could redeem it themselves. PKCE fixes this: your app generates a random `code_verifier`, sends its hash (`code_challenge`) in step 1, and must present the original `code_verifier` in step 4 — so even if an attacker steals the authorization code, they can't complete the exchange without the verifier they never saw. PKCE is now recommended for **all** clients, not just public ones (see `examples/oauth-pkce-demo.js` for a runnable code_verifier/code_challenge generator).

```js
// Step 4, conceptually (server-to-server, using your client_secret) — not runnable standalone,
// needs a real registered OAuth app/provider:
const res = await fetch('https://provider.example.com/oauth/token', {
  method: 'POST',
  headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  body: new URLSearchParams({
    grant_type: 'authorization_code',
    code: authCodeFromRedirect,
    redirect_uri: 'https://myapp.com/callback',
    client_id: process.env.OAUTH_CLIENT_ID,
    client_secret: process.env.OAUTH_CLIENT_SECRET, // never exposed to the browser
    code_verifier: storedCodeVerifier, // PKCE — proves this backend started the flow
  }),
});
const { access_token, id_token } = await res.json();
```

**Real-world usage:** "Sign in with Google/GitHub" buttons (OIDC), a calendar app that reads your Google Calendar without ever seeing your Google password (OAuth access token, scoped to `calendar.readonly`), and API gateways that validate incoming access tokens per-request against the provider's public keys (JWKS) rather than maintaining their own login system at all. Passport.js's OAuth strategies (`passport-google-oauth20`, etc.) are the common way to wire this into an Express app without hand-rolling the redirect/exchange dance yourself.

**How OAuth/OIDC relates to sessions/JWT above:** they're not competitors — OAuth/OIDC is commonly the **login mechanism** ("prove who you are via Google"), and once your backend has verified the user's identity via the ID token, it still has to decide how *your own app* tracks that session afterward — which is exactly the sessions-vs-JWT decision already covered above. A very common real setup: OIDC for the initial login, then your own app-issued JWT (or session cookie) for subsequent requests, rather than passing the provider's tokens around forever.

**How to explain it in an interview:**
> "OAuth 2.0 is about authorization — letting an app act on a user's behalf with a scoped, revocable token, without ever seeing their password, via a redirect-based Authorization Code flow: the user logs in on the provider's site, the provider redirects back with a short-lived code, and my backend exchanges that code plus my client secret for an access token server-to-server. OpenID Connect adds authentication on top — an ID token telling me who actually logged in. For public clients like SPAs or mobile apps that can't safely hold a secret, PKCE closes the gap by requiring a locally-generated verifier that only the app that started the flow has, so a stolen authorization code alone isn't enough to complete the exchange."

---

## Password hashing — why plain hashing (MD5/SHA) isn't enough
**What is it?** Password hashing means never storing a user's actual password — instead storing a one-way transformed value, so even if the database leaks, attackers can't directly read passwords.

**Why is MD5/SHA-256 alone insecure for passwords?** MD5 and plain SHA-256 are **fast** hash functions — designed for speed (checksums, integrity checks), which is exactly the wrong property for password storage. Fast hashing means an attacker with a leaked database can try billions of password guesses per second (using GPUs) to find a match — this is a **brute-force/dictionary attack**, and precomputed **rainbow tables** make it even faster for unsalted hashes. **Salting** (adding a unique random value per password before hashing) defeats rainbow tables, but doesn't slow down brute force — you still need a **slow, purpose-built** algorithm.

`bcrypt` (and similarly `scrypt`, `argon2`) is designed to be deliberately slow and includes salting automatically, with a configurable "cost factor" you can increase over time as hardware gets faster.

```js
const bcrypt = require('bcrypt');

async function hashPassword(plain) {
  const saltRounds = 12; // higher = slower = more resistant to brute force, tune based on server capacity
  return bcrypt.hash(plain, saltRounds); // bcrypt generates + stores the salt internally, in the output string
}

async function checkPassword(plain, hash) {
  return bcrypt.compare(plain, hash); // never decrypt the hash — just compare a fresh hash of the input
}
```

**How to explain it in an interview:**
> "Never store plain passwords, and never rely on a fast general-purpose hash like MD5 or SHA-256 alone, because their speed makes brute-forcing leaked hashes cheap for attackers. Use a slow, salted, purpose-built algorithm like bcrypt or argon2 — salting defeats precomputed rainbow tables, and deliberate slowness makes brute force impractical at scale."

---

## OWASP basics relevant to Node APIs

### SQL / NoSQL Injection
**What is it?** Injection happens when user input is concatenated directly into a query instead of being treated as pure data, letting an attacker manipulate the query's logic.
```js
// VULNERABLE (SQL): string concatenation lets an attacker inject SQL
db.query(`SELECT * FROM users WHERE email = '${req.body.email}'`);
// Attacker sends: ' OR '1'='1  ->  query returns ALL users

// SAFE: parameterized query — the driver treats input strictly as data, never as SQL syntax
db.query('SELECT * FROM users WHERE email = ?', [req.body.email]);
```
```js
// VULNERABLE (NoSQL/MongoDB): if req.body.password is an object like { "$gt": "" },
// this can bypass the password check entirely because Mongo interprets it as an operator
User.findOne({ email: req.body.email, password: req.body.password });

// SAFE: validate/sanitize input types before querying (e.g., enforce password is a string),
// and use a schema validation library (Joi/Zod) at the API boundary
```

### XSS (Cross-Site Scripting)
**What is it?** An attacker injects malicious JS into content that gets rendered in another user's browser (e.g., a comment field that isn't escaped, later rendered as raw HTML).
**Mitigation:** Escape/encode all user-generated content before rendering as HTML (most modern template engines and React auto-escape by default), set a `Content-Security-Policy` header, and never use `dangerouslySetInnerHTML`/raw HTML insertion with unsanitized input.

### CSRF (Cross-Site Request Forgery)
**What is it?** A malicious site tricks a logged-in user's browser into submitting a request (e.g., a form) to your site, and because cookies are sent automatically by the browser, your server might treat it as a legitimate authenticated request.
**Mitigation:** CSRF tokens (a random token embedded in forms, verified server-side), and setting cookies with `SameSite=Strict` or `SameSite=Lax` (which stops the browser from sending the cookie on cross-site requests in the first place). Note: pure JWT-in-header APIs (not cookie-based) are naturally less exposed to CSRF, since CSRF exploits *automatic* cookie sending — but that pushes the risk to XSS if you store the JWT somewhere JS can read.

### `helmet.js`
**What is it?** A one-line Express middleware that sets a bundle of security-related HTTP headers (like `X-Content-Type-Options`, `Strict-Transport-Security`, a basic `Content-Security-Policy`) that browsers use to reduce common attack surfaces.
```js
const helmet = require('helmet');
app.use(helmet()); // sensible security headers, minimal effort
```

### Rate limiting
**What is it?** Restricting how many requests a client (by IP, API key, or user) can make in a time window — protects against brute-force login attempts, credential stuffing, and basic denial-of-service abuse.
```js
const rateLimit = require('express-rate-limit');

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,                  // limit each IP to 10 requests per window
  message: 'Too many login attempts, please try again later.',
});

app.post('/login', loginLimiter, loginHandler);
```

---

## Cookies: `httpOnly`, `secure`, `sameSite`
```js
res.cookie('token', jwtToken, {
  httpOnly: true,   // JS on the page CANNOT read this cookie — mitigates XSS stealing the token
  secure: true,      // only sent over HTTPS — mitigates network interception
  sameSite: 'lax',   // browser won't send this cookie on most cross-site requests — mitigates CSRF
});
```
- `httpOnly` — blocks `document.cookie` access from JS. Critical if you're storing a JWT or session ID in a cookie.
- `secure` — cookie is only transmitted over HTTPS.
- `sameSite` — controls whether the cookie is sent on cross-site requests (`Strict`, `Lax`, or `None`).

---

## CORS (Cross-Origin Resource Sharing) — explained simply
**What is it?** By default, browsers block a webpage from `siteA.com` from making requests to an API at `apiB.com` (a different "origin") using JS, unless the API explicitly says "this origin is allowed" via CORS headers.

**Why was it invented?** Without this restriction, any malicious website could silently make authenticated requests (using your logged-in cookies) to any other site's API on your behalf. CORS is a browser-enforced safety rule — it doesn't protect the server directly, but it stops browsers from letting arbitrary sites read responses from your API on behalf of a user who happens to be logged in elsewhere.
```js
const cors = require('cors');

app.use(cors({
  origin: 'https://myfrontend.com', // only this origin is allowed to call this API from browser JS
  credentials: true,                 // allow cookies to be sent cross-origin, if needed
}));
```
**How to explain CORS in an interview:**
> "CORS is a browser security mechanism, not a server security mechanism — it controls which origins are allowed to read a response when a webpage's JS makes a cross-origin request. Without proper CORS headers, browsers block the response from being read by JS on a different origin, which prevents malicious sites from silently using a logged-in user's session against your API."

---

## Quick Reference

| Concept | One-liner |
|---|---|
| Sessions | Stateful, server stores identity, client holds just an ID |
| JWT | Stateless, signed token carries identity, good for APIs/microservices |
| OAuth 2.0 | Delegated, scoped, revocable access to another service's API — never share your password with the app |
| OIDC | Identity layer on top of OAuth — issues an ID token answering "who logged in" |
| PKCE | Verifier/challenge pair that stops a stolen authorization code from being redeemed by an attacker |
| bcrypt | Slow, salted password hashing — resists brute force + rainbow tables |
| SQL/NoSQL injection | Never build queries by concatenating raw user input |
| XSS | Escape output; don't render untrusted input as raw HTML |
| CSRF | Use tokens + `SameSite` cookies to stop cross-site request forgery |
| helmet | One-line middleware for sensible security headers |
| Rate limiting | Cap requests per client to block brute force/abuse |
| httpOnly/secure/sameSite | Cookie flags that block JS access, force HTTPS, limit cross-site sending |
| CORS | Browser-enforced rule controlling which origins can read cross-origin API responses |
