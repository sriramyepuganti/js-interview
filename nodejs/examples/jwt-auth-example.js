/**
 * jwt-auth-example.js
 *
 * Requires: `npm install jsonwebtoken express` to actually run this as a server.
 * (jsonwebtoken for signing/verifying tokens, express just to demo it as middleware.)
 * Run with: node jwt-auth-example.js  (after npm install in some folder containing this file)
 *
 * Demonstrates a minimal JWT auth flow:
 *  - POST /login verifies credentials (faked here) and issues a signed JWT
 *  - a middleware verifies the JWT on protected routes using the same secret
 *  - GET /profile is a protected route that requires a valid token
 */

const express = require('express');
const jwt = require('jsonwebtoken');

const app = express();
app.use(express.json());

// In real production code, NEVER hardcode this -- load it from an environment variable
// (see file 11 on config management), and use a long, random, secret value.
const JWT_SECRET = process.env.JWT_SECRET || 'dev-only-secret-do-not-use-in-production';

// Fake "database" of users, with a pre-hashed password. In real code, use bcrypt
// (see file 07) -- this demo skips real hashing to keep the example focused on JWT itself.
const FAKE_USERS = [
  { id: 1, username: 'sriram', password: 'password123', role: 'admin' },
];

// -----------------------------------------------------------------------
// LOGIN ROUTE: verify credentials, then SIGN a new JWT containing the user's claims.
// The token is self-contained -- anyone who can verify the signature can trust the
// claims inside it, without looking anything up server-side. That's what makes JWT
// "stateless" (see file 07 for the sessions-vs-JWT trade-off).
// -----------------------------------------------------------------------
app.post('/login', (req, res) => {
  const { username, password } = req.body;
  const user = FAKE_USERS.find((u) => u.username === username && u.password === password);

  if (!user) {
    return res.status(401).json({ error: 'Invalid username or password' });
  }

  // sign(payload, secret, options) -- payload should be minimal, non-sensitive claims only
  // (never put a password or other secret INSIDE the token -- it's only signed, not encrypted,
  // so anyone can decode and read the payload, they just can't forge/modify it undetected).
  const token = jwt.sign(
    { userId: user.id, role: user.role },
    JWT_SECRET,
    { expiresIn: '1h' } // short expiry limits the damage window if a token is ever stolen
  );

  res.json({ token });
});

// -----------------------------------------------------------------------
// MIDDLEWARE: verifies the JWT on protected routes.
// Expects an "Authorization: Bearer <token>" header, as is conventional for JWT-based APIs.
// -----------------------------------------------------------------------
function verifyToken(req, res, next) {
  const authHeader = req.headers.authorization; // e.g. "Bearer eyJhbGciOi..."
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }

  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err) {
      // Covers both an invalid signature (tampered/forged token) AND an expired token --
      // err.name would be 'TokenExpiredError' or 'JsonWebTokenError' if you want to
      // distinguish them for a more specific client-facing error message.
      return res.status(403).json({ error: 'Invalid or expired token' });
    }
    req.user = decoded; // attach decoded claims (userId, role) to the request for downstream use
    next();
  });
}

// -----------------------------------------------------------------------
// PROTECTED ROUTE: only reachable with a valid token.
// -----------------------------------------------------------------------
app.get('/profile', verifyToken, (req, res) => {
  res.json({ message: 'Protected data', userId: req.user.userId, role: req.user.role });
});

// -----------------------------------------------------------------------
// ROLE-BASED EXAMPLE: reusing the same decoded claims for authorization, not just authentication.
// -----------------------------------------------------------------------
function requireAdmin(req, res, next) {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access only' });
  }
  next();
}

app.get('/admin-only', verifyToken, requireAdmin, (req, res) => {
  res.json({ message: 'Welcome, admin!' });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`JWT auth example listening on http://localhost:${PORT}`);
  console.log('Try:');
  console.log(`  curl -X POST http://localhost:${PORT}/login -H "Content-Type: application/json" -d '{"username":"sriram","password":"password123"}'`);
  console.log(`  curl http://localhost:${PORT}/profile -H "Authorization: Bearer <token from login>"`);
});
