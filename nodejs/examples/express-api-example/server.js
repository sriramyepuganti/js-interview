/**
 * server.js
 *
 * Requires: `npm install` in this folder first (installs express — see package.json).
 * Run with: node server.js
 *
 * A small Express app demonstrating:
 *  - built-in JSON body parsing middleware
 *  - a simple logging middleware (runs for every request)
 *  - a simple auth middleware (runs only for protected routes)
 *  - a couple of routes, including one that deliberately throws to show error handling
 *  - centralized error-handling middleware (must be defined LAST)
 */

const express = require('express');
const app = express();

// In-memory "database" just for this demo -- resets every time the server restarts.
const users = [
  { id: 1, name: 'Sriram', role: 'admin' },
  { id: 2, name: 'Asha', role: 'user' },
];

// -----------------------------------------------------------------------
// MIDDLEWARE 1: built-in body parser.
// Without this, req.body would be undefined for JSON request bodies.
// Modern Express has this built in -- no need for the separate 'body-parser' package.
// -----------------------------------------------------------------------
app.use(express.json());

// -----------------------------------------------------------------------
// MIDDLEWARE 2: request logger.
// No path given to app.use() -> runs for EVERY incoming request, before any route.
// Always calls next() so the request continues down the pipeline.
// -----------------------------------------------------------------------
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

// -----------------------------------------------------------------------
// MIDDLEWARE 3: simple auth check, used ONLY on specific routes (passed as an argument,
// not registered globally with app.use). It checks for a fake bearer token header.
// In a real app this would verify a JWT (see jwt-auth-example.js) or check a session.
// -----------------------------------------------------------------------
function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || authHeader !== 'Bearer demo-token') {
    // Instead of sending a response directly, we create an Error and pass it to next().
    // This routes control to the centralized error-handling middleware at the bottom,
    // keeping error formatting consistent across the whole app.
    const err = new Error('Unauthorized: missing or invalid token');
    err.status = 401;
    return next(err);
  }
  next(); // token looks valid (for demo purposes) -- proceed to the route handler
}

// -----------------------------------------------------------------------
// ROUTES
// -----------------------------------------------------------------------

// Public route -- no auth required.
app.get('/health', (req, res) => {
  res.json({ status: 'ok', uptime: process.uptime() });
});

// Public route -- list users.
app.get('/users', (req, res) => {
  res.json(users);
});

// Protected route -- requireAuth middleware runs BEFORE this handler.
app.get('/users/me', requireAuth, (req, res) => {
  res.json({ message: 'You are authenticated!', user: users[0] });
});

// Route demonstrating body parsing -- try POSTing JSON to this endpoint.
app.post('/users', requireAuth, (req, res) => {
  const { name, role } = req.body;
  if (!name) {
    const err = new Error('Missing required field: name');
    err.status = 400;
    throw err; // Express catches synchronous throws inside route handlers automatically
    // and forwards them to the error-handling middleware -- no need to call next(err)
    // manually for SYNCHRONOUS errors (async errors DO need explicit handling -- see below).
  }
  const newUser = { id: users.length + 1, name, role: role || 'user' };
  users.push(newUser);
  res.status(201).json(newUser);
});

// Route demonstrating that ASYNC errors must be forwarded explicitly with next(err) --
// Express does NOT automatically catch rejected promises in older versions (Express 5+
// improves this, but it's important to know the manual pattern for Express 4).
app.get('/simulate-async-error', async (req, res, next) => {
  try {
    await Promise.reject(new Error('Something failed in an async operation'));
  } catch (err) {
    next(err); // must explicitly pass to next() -- won't be caught automatically in Express 4
  }
});

// A route for a path that doesn't exist falls through to this 404 handler
// (registered after all real routes, before the error handler).
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// -----------------------------------------------------------------------
// CENTRALIZED ERROR-HANDLING MIDDLEWARE
// Express recognizes this by its 4-argument signature: (err, req, res, next).
// It MUST be registered last, after all other app.use()/routes, so that any
// next(err) call (or synchronous throw inside a route) ends up here.
// -----------------------------------------------------------------------
app.use((err, req, res, next) => {
  console.error('Error handler caught:', err.message);
  const status = err.status || 500;
  res.status(status).json({
    error: err.message || 'Internal Server Error',
    // In real production code, avoid leaking err.stack to the client -- log it server-side only.
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`);
  console.log('Try:');
  console.log(`  curl http://localhost:${PORT}/health`);
  console.log(`  curl http://localhost:${PORT}/users`);
  console.log(`  curl http://localhost:${PORT}/users/me                 (expect 401)`);
  console.log(`  curl -H "Authorization: Bearer demo-token" http://localhost:${PORT}/users/me`);
});
