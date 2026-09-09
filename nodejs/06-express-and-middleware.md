# 06. Express and Middleware

## What does a web framework solve that raw `http` doesn't?
**What is it?** Node's built-in `http` module lets you create a server and handle requests/responses, but it gives you almost nothing beyond the raw plumbing — no routing, no request body parsing, no easy way to compose reusable request-handling logic. Express (and similar frameworks) is a thin layer on top that adds routing, middleware, and conveniences.

**Why was it invented?** With raw `http`, even something simple becomes verbose and repetitive:
```js
const http = require('http');
const url = require('url');

http.createServer((req, res) => {
  const parsed = url.parse(req.url, true); // req.url alone has no query params/body parsing built in
  if (req.method === 'GET' && parsed.pathname === '/') {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('Hello World!');
  } else if (req.method === 'POST' && parsed.pathname === '/post') {
    // you'd have to manually collect req 'data' events to read the body...
  } else {
    res.writeHead(404);
    res.end('Not found');
  }
}).listen(8000);
```
Every route needs manual method/path checking, manual body reading, manual everything. Express was invented to remove this boilerplate: give it declarative routes, and let a chain of small reusable functions (middleware) handle cross-cutting concerns (logging, auth, parsing) without repeating yourself per route.

**Real-world usage:** Express remains one of the most widely used Node web frameworks for REST APIs, server-rendered sites, and BFF layers, even though newer, faster alternatives exist (see Fastify comparison below).

---

## Middleware — the core concept
**What is it?** A middleware is just a function with the signature `(req, res, next)` that sits in the request/response pipeline. It can inspect/modify `req`/`res`, and it must either send a response or call `next()` to pass control to the next middleware/route handler in line.

**Why was it invented?** Almost every request needs some combination of: logging, authentication, parsing the body, setting headers, handling errors — and you don't want to copy-paste that logic into every single route handler. Middleware lets you write that logic **once** and plug it into the pipeline for whichever routes need it (or all of them).

**Simple mental model:** Think of it like an airport security line — each checkpoint (middleware) can inspect/modify you, then wave you through (`next()`) to the next checkpoint, or stop you entirely (send a response, e.g., "access denied").

```js
const express = require('express');
const app = express();

// A logging middleware — runs for every request because no path is specified
app.use((req, res, next) => {
  console.log(`${req.method} ${req.url} at ${new Date().toISOString()}`);
  next(); // MUST call next(), or the request hangs forever
});

app.get('/', (req, res) => {
  res.send('Hello world!');
});

app.listen(3000, () => console.log('server started'));
```

---

## Routing
**What is it?** Mapping an HTTP method + URL path to a handler function.

```js
app.get('/', (req, res) => res.send('Hello world!'));
app.post('/post', (req, res) => res.send("You just called POST /post"));
app.all('/test', (req, res) => res.send("Any HTTP method works here"));

app.get('/users/:id', (req, res) => {
  res.send('User id: ' + req.params.id); // route params via req.params
});

app.get('/pattern/:id([0-9]{5})', (req, res) => { // regex-constrained param
  res.send('5-digit id: ' + req.params.id);
});
```

### `express.Router` — for modularity
**Why was it invented?** Defining every route directly on `app` gets messy fast in a real app with dozens/hundreds of routes. `Router` lets you group related routes (e.g., all `/users/*` routes) into their own file/module and mount them under a path prefix.
```js
// routes/users.js
const express = require('express');
const router = express.Router();

router.get('/', (req, res) => res.send('list users'));
router.post('/', (req, res) => res.send('create user'));
router.get('/:id', (req, res) => res.send('get user ' + req.params.id));

module.exports = router;

// app.js
const usersRouter = require('./routes/users');
app.use('/users', usersRouter); // all routes above are now prefixed with /users
```
**Real-world usage:** Organizing a large API by resource/feature (`routes/users.js`, `routes/orders.js`, `routes/auth.js`), each with its own Router, keeps `app.js` clean and each feature's routes self-contained.

---

## Request parsing (body-parsing)
**What is it?** By default, Express doesn't parse the incoming request body for you — `req.body` would be `undefined` unless you add parsing middleware.

**Why was it invented?** The raw HTTP body is just a stream of bytes; someone has to decide the encoding (JSON? form-urlencoded? multipart for file uploads?) and buffer/parse it. This used to require the separate `body-parser` package; Express now **has this built in**.

```js
// MODERN (Express 4.16+): no separate body-parser package needed
app.use(express.json());                          // parses application/json bodies into req.body
app.use(express.urlencoded({ extended: true }));   // parses form-urlencoded bodies into req.body

app.post('/form', (req, res) => {
  res.json(req.body);
});
```
For `multipart/form-data` (file uploads), you still need a dedicated middleware like `multer` — JSON/urlencoded parsing alone doesn't handle binary file streams:
```js
const multer = require('multer');
const upload = multer({ dest: 'uploads/' });

app.post('/upload', upload.single('avatar'), (req, res) => {
  res.json({ file: req.file, fields: req.body });
});
```
**Note (legacy vs modern):** the old `body-parser` package is what Express's built-in `express.json()`/`express.urlencoded()` are based on — if you see `require('body-parser')` in older code (as in the original notes), it's the same idea, just not built into Express yet at that time.

---

## Static file serving
**What is it?** Serving files (HTML, CSS, JS, images) directly from a folder on disk, as-is, without a custom route per file.
```js
app.use('/static', express.static('public'));
// A file at public/main.js is now available at GET /static/main.js
```
**Real-world usage:** Serving a built frontend bundle, or public assets (logos, downloadable PDFs) alongside an API.

---

## Cookies and Sessions (see file 07 for auth trade-offs)
```js
const cookieParser = require('cookie-parser');
app.use(cookieParser());

app.get('/set-cookie', (req, res) => {
  res.cookie('name', 'express').send('cookie set');
});

const session = require('express-session');
app.use(session({ secret: 'change-me', resave: false, saveUninitialized: false }));

app.get('/session', (req, res) => {
  req.session.views = (req.session.views || 0) + 1;
  res.send(`You visited ${req.session.views} times`);
});
```

## Basic auth middleware pattern
```js
function requireAuth(req, res, next) {
  if (req.session && req.session.userId) {
    return next(); // authenticated, proceed
  }
  const err = new Error('Not logged in');
  err.status = 401;
  next(err); // pass to error-handling middleware
}

app.get('/protected', requireAuth, (req, res) => {
  res.send('secret data');
});
```

## Centralized error-handling middleware
**What is it?** An Express middleware with **4 parameters** — `(err, req, res, next)` — Express recognizes this specific signature as an error handler and routes any error passed to `next(err)` here instead of the normal pipeline.

**Why was it invented?** Without it, every route would need its own repetitive try/catch + response-formatting logic for failures. A single error-handling middleware, placed **last**, centralizes "what does an error response look like" for the whole app.
```js
// Must be defined AFTER all other app.use()/routes
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({ error: err.message || 'Something broke!' });
});
```
**Real-world usage:** Consistent JSON error shapes across an entire API, centralized error logging/alerting hooks, hiding internal error details from clients in production while logging full stack traces server-side.

---

## View engines (brief — and why they're less central today)
**What is it?** A view engine (Pug, EJS, Handlebars) lets Express render server-side HTML templates with dynamic data.
```js
app.set('view engine', 'pug');
app.set('views', './views');

app.get('/dynamic', (req, res) => {
  res.render('dynamic', { name: 'Sriram' }); // renders views/dynamic.pug
});
```
**Why they're less common now:** Modern frontends are typically built as separate SPAs (React/Vue/Angular) or use frameworks like Next.js, consuming a backend purely as a JSON API. This decouples frontend and backend teams/deploys and lets the backend focus purely on data, not markup. Server-rendered view engines still show up for simple internal tools, admin dashboards, or SEO-driven server-side rendering, but the dominant modern pattern is **SPA/mobile app + REST/GraphQL API**, which is why file 07 focuses on API-friendly auth (JWT) rather than server-rendered session flows.

---

## Express vs Fastify (modern alternative)

| | Express | Fastify |
|---|---|---|
| Age/ecosystem | Older, huge plugin/middleware ecosystem | Newer, growing fast, smaller but modern ecosystem |
| Performance | Good, but slower than Fastify in benchmarks | Built for speed — schema-based validation & serialization are highly optimized |
| Validation | Manual or via extra libraries (Joi, express-validator) | Built-in JSON schema validation |
| TypeScript support | Bolted on via `@types/express` | Designed with better native TS support |
| Async support | Works, but older middleware may predate async/await conventions | Async/await first-class throughout |
| When to pick | Huge ecosystem needs, team familiarity, legacy compatibility | New projects prioritizing raw performance + built-in validation |

**How to explain Express + middleware in an interview:**
> "Express sits on top of Node's raw `http` module and adds routing and middleware so you don't reinvent request parsing, logging, and auth for every route. Middleware is just a `(req, res, next)` function chained in a pipeline — each one can modify the request/response or short-circuit it, and must call `next()` to continue. Centralized error handling uses a special 4-argument middleware `(err, req, res, next)` placed last, so any error passed via `next(err)` anywhere in the app funnels into one consistent error response. Modern apps often replace server-rendered view engines with a pure JSON API consumed by a separate frontend, and some teams choose Fastify over Express for better raw performance and built-in schema validation."
