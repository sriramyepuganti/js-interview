/**
 * oauth-pkce-demo.js
 *
 * No npm install needed — uses only Node built-ins (crypto).
 * Run with: node oauth-pkce-demo.js
 *
 * This does NOT talk to a real OAuth provider (that needs a registered client_id and a
 * live redirect) — instead it demonstrates the actual CRYPTOGRAPHIC MECHANICS of PKCE
 * (Proof Key for Code Exchange), which is the part interviewers actually probe:
 * generating a code_verifier, deriving its code_challenge, and proving why an attacker
 * who only intercepts the authorization code (not the verifier) can't complete the flow.
 *
 * See 07-authentication-and-security.md for the full Authorization Code + PKCE flow.
 */

const crypto = require('crypto');

// -----------------------------------------------------------------------------
// STEP 1 (happens on YOUR app, before redirecting the user to the provider's login page):
// Generate a random code_verifier, and derive a code_challenge from it via SHA-256 + base64url.
// The verifier is kept secret on your app/device; only the CHALLENGE is sent to the provider
// in the initial redirect URL.
// -----------------------------------------------------------------------------
function base64url(buffer) {
  return buffer
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, ''); // base64url has no padding
}

function generatePkcePair() {
  const codeVerifier = base64url(crypto.randomBytes(32)); // 43-128 char random string, per spec
  const codeChallenge = base64url(
    crypto.createHash('sha256').update(codeVerifier).digest()
  );
  return { codeVerifier, codeChallenge };
}

const { codeVerifier, codeChallenge } = generatePkcePair();

console.log('--- Step 1: generated on YOUR app, before redirecting to the provider ---');
console.log('  code_verifier (kept secret, stored locally):', codeVerifier);
console.log('  code_challenge (sent in the login redirect URL):', codeChallenge);

console.log('\n--- Step 1b: what the redirect URL would look like ---');
const authUrl =
  `https://provider.example.com/oauth/authorize` +
  `?client_id=YOUR_CLIENT_ID` +
  `&redirect_uri=https://myapp.com/callback` +
  `&response_type=code` +
  `&scope=profile` +
  `&code_challenge=${codeChallenge}` +
  `&code_challenge_method=S256`;
console.log(' ', authUrl);

// -----------------------------------------------------------------------------
// STEP 2: the provider authenticates the user, then redirects back with a short-lived
// authorization `code` (simulated here, since we're not hitting a real provider).
// -----------------------------------------------------------------------------
const simulatedAuthCode = base64url(crypto.randomBytes(16));
console.log('\n--- Step 2: provider redirects back with an authorization code ---');
console.log('  authorization_code (simulated):', simulatedAuthCode);

// -----------------------------------------------------------------------------
// STEP 3: your BACKEND exchanges the code for a token, presenting the ORIGINAL
// code_verifier. The provider independently re-derives the challenge from the verifier
// you send now, and checks it matches the challenge you sent back in Step 1.
// -----------------------------------------------------------------------------
function providerVerifiesPkce(receivedVerifier, originalChallenge) {
  const rederivedChallenge = base64url(
    crypto.createHash('sha256').update(receivedVerifier).digest()
  );
  return rederivedChallenge === originalChallenge;
}

console.log('\n--- Step 3: token exchange -- your backend presents the ORIGINAL verifier ---');
const legitimateExchangeOk = providerVerifiesPkce(codeVerifier, codeChallenge);
console.log('  Legitimate exchange (correct verifier) succeeds:', legitimateExchangeOk);

// -----------------------------------------------------------------------------
// THE ATTACK SCENARIO: an attacker intercepts the authorization `code` in transit
// (Step 2) but never saw the code_verifier (it was never transmitted anywhere until
// Step 3, and only your backend holds it). Without PKCE, having the code alone would be
// enough to redeem a token. WITH PKCE, the attacker's exchange attempt fails:
// -----------------------------------------------------------------------------
console.log('\n--- Attack scenario: attacker stole the code, but never saw the verifier ---');
const attackerGuessedVerifier = base64url(crypto.randomBytes(32)); // attacker has to guess
const attackerExchangeOk = providerVerifiesPkce(attackerGuessedVerifier, codeChallenge);
console.log('  Attacker exchange (wrong/guessed verifier) succeeds:', attackerExchangeOk);
console.log('\nThis is exactly why PKCE protects public clients (SPAs/mobile apps) that');
console.log('cannot safely hold a client_secret: stealing the code alone is not enough.');
