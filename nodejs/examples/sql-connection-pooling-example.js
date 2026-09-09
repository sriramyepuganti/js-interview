/**
 * sql-connection-pooling-example.js
 *
 * REQUIRES INFRASTRUCTURE — needs `npm install pg` and a real running Postgres instance
 * to actually execute (DB_HOST/DB_USER/DB_PASSWORD/DB_NAME env vars). Not run as part of
 * this repo's runnable examples for that reason — but the code below is correct and is
 * the standard, production-shaped pattern for the `pg` driver.
 *
 * See 08-databases-mongodb-and-sql.md ("Connection pooling") for the full explanation of
 * why a pool exists at all and what breaks if you forget client.release().
 */

const { Pool } = require('pg');

// A single Pool instance should be created ONCE per process (module scope, like the
// Lambda "cache the client outside the handler" pattern in file 14) and reused for every
// query -- never create a new Pool per request.
const pool = new Pool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  max: 20,                        // hard cap on concurrent connections this pool will open
  idleTimeoutMillis: 30000,       // close a connection after 30s of sitting idle in the pool
  connectionTimeoutMillis: 5000,  // fail fast rather than hang if the pool is exhausted
});

// Log pool-level errors (e.g., an idle connection unexpectedly dropped by the DB) so they
// don't become invisible/unhandled -- ties back to the uncaughtException/unhandledRejection
// discussion in file 11: a pool error event left unhandled can crash the process.
pool.on('error', (err) => {
  console.error('Unexpected error on an idle pg client:', err);
});

/**
 * Simple query -- pool.query() transparently borrows a connection, runs the query, and
 * returns the connection to the pool for you. Correct for any SINGLE, standalone query.
 */
async function getUserById(id) {
  const { rows } = await pool.query('SELECT id, name, email FROM users WHERE id = $1', [id]);
  return rows[0] || null;
}

/**
 * Multi-statement TRANSACTION -- must explicitly check out ONE dedicated connection via
 * pool.connect() and reuse it for every statement, since pool.query() alone could hand
 * different calls to different connections, breaking atomicity.
 */
async function transferFunds(fromAccountId, toAccountId, amount) {
  const client = await pool.connect(); // check out a single connection for this whole transaction
  try {
    await client.query('BEGIN');

    const { rows: fromRows } = await client.query(
      'SELECT balance FROM accounts WHERE id = $1 FOR UPDATE', // FOR UPDATE locks the row against concurrent transfers
      [fromAccountId]
    );
    if (!fromRows.length || fromRows[0].balance < amount) {
      throw new Error('Insufficient funds');
    }

    await client.query('UPDATE accounts SET balance = balance - $1 WHERE id = $2', [amount, fromAccountId]);
    await client.query('UPDATE accounts SET balance = balance + $1 WHERE id = $2', [amount, toAccountId]);

    await client.query('COMMIT');
    return { success: true };
  } catch (err) {
    await client.query('ROLLBACK'); // undo BOTH writes if anything failed
    throw err;
  } finally {
    // CRITICAL: always release, even on error/throw -- forgetting this leaks a connection
    // out of the pool permanently. Enough leaks under load and the pool silently starves,
    // which looks like "the database is down" but is actually this bug.
    client.release();
  }
}

/**
 * Graceful shutdown -- close the pool's connections cleanly on SIGTERM, consistent with
 * the graceful shutdown pattern in file 11.
 */
async function closePool() {
  await pool.end();
  console.log('Pool has ended — all connections closed');
}

module.exports = { pool, getUserById, transferFunds, closePool };
