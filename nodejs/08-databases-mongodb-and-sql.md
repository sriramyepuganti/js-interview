# 08. Databases: MongoDB & SQL

## MongoDB — what and why
**What is it?** MongoDB is a **document-oriented NoSQL database**. Instead of rows in tables with a fixed schema, it stores data as flexible JSON-like documents (BSON internally) grouped into **collections**.

**Why was it invented?** Relational databases require you to define a rigid schema up front and use JOINs to combine related tables. For applications with rapidly evolving or naturally nested/hierarchical data (e.g., a product with variable attributes, a user profile with nested preferences), constantly running migrations for every schema tweak is painful. MongoDB lets each document in a collection have a different shape, models nested/related data as embedded documents (avoiding some JOINs), and was built from the start with horizontal scaling (sharding) in mind for large, distributed datasets.

**Real-world usage:** Content management systems, catalogs with varied product attributes, activity/event logs, applications with fast-iterating schemas early in a product's life, and any system that needs to scale writes horizontally across many machines.

---

## Mongoose — schema, CRUD, and why an ODM at all
**What is it?** Mongoose is an **ODM (Object-Document Mapper)** for MongoDB in Node — it lets you define a **schema** (even though MongoDB itself is schema-less) and gives you validation, defaults, middleware ("hooks"), and a friendlier query API on top of the raw MongoDB driver.

**Why was it invented?** Working with the raw MongoDB driver, you get plain JS objects with no validation, no defaults, and no built-in structure — easy to accidentally save malformed documents. Mongoose adds a validation/structure layer voluntarily on top of a schema-less database, catching bugs (wrong types, missing required fields) before they ever reach the database.

```js
const mongoose = require('mongoose');
await mongoose.connect('mongodb://localhost/mydb'); // modern connect returns a Promise

const personSchema = new mongoose.Schema({
  name: { type: String, required: true },
  age: { type: Number, min: 0 },
  nationality: String,
  createdAt: { type: Date, default: Date.now },
});

const Person = mongoose.model('Person', personSchema);

// CREATE
const p = await Person.create({ name: 'Sriram', age: 28, nationality: 'India' });

// READ
const all = await Person.find({ nationality: 'India' });
const one = await Person.findById(p._id);

// UPDATE
await Person.updateOne({ _id: p._id }, { $set: { age: 29 } });

// DELETE
await Person.deleteOne({ _id: p._id });
```
See `examples/mongoose-crud-example.js` for the full runnable version including an aggregation example.

---

## Aggregation Pipeline
**What is it?** A pipeline of **stages**, each transforming the documents flowing through it, similar to piping data through a series of processing steps (`$match` -> `$group` -> `$sort`, etc.) — conceptually like SQL's `WHERE` + `GROUP BY` + `ORDER BY`, but expressed as a sequence of stages rather than one query.

| Stage | What it does | SQL rough equivalent |
|---|---|---|
| `$match` | Filters documents | `WHERE` |
| `$group` | Groups documents and computes aggregates (`$sum`, `$avg`, `$min`, `$max`, `$push`, `$first`, `$last`) | `GROUP BY` |
| `$project` | Reshapes documents — include/exclude/compute fields | `SELECT` column list |
| `$sort` | Orders documents | `ORDER BY` |
| `$limit` / `$skip` | Pagination | `LIMIT` / `OFFSET` |
| `$unwind` | Flattens an array field into one document per array element | (no direct SQL equivalent — like exploding an array) |

```js
// Example: total order value per customer, only for completed orders, top 5 spenders
const results = await Order.aggregate([
  { $match: { status: 'completed' } },
  { $group: { _id: '$customerId', totalSpent: { $sum: '$amount' }, orderCount: { $sum: 1 } } },
  { $sort: { totalSpent: -1 } },
  { $limit: 5 },
]);
```

---

## Indexing — why and how
**What is it?** An index is a data structure (usually a B-tree) that lets the database find matching documents/rows without scanning every single one.

**Why was it invented?** Without an index, `db.users.find({ email: 'x@y.com' })` on a 10-million-document collection means scanning all 10 million documents (a "collection scan") — painfully slow. An index on `email` lets MongoDB jump almost directly to matches.

```js
// Create an index in Mongoose (via schema)
const userSchema = new mongoose.Schema({
  email: { type: String, unique: true, index: true },
});

// Or directly:
db.users.createIndex({ email: 1 });  // ascending index
db.users.dropIndex('email_1');
```
**Trade-off:** Indexes speed up reads but slow down writes slightly (every insert/update has to update the index too) and consume extra disk/memory — so you index fields you actually query/sort/filter by often, not everything.

---

## Replica Sets & Sharding — simply explained
- **Replica Set:** Multiple copies of the same data (one **primary**, several **secondaries**) for **high availability** — if the primary goes down, a secondary is automatically elected as the new primary. This is about *durability and uptime*, not scaling write capacity.
  ```
  mongod --port "PORT" --dbpath "PATH" --replSet "myReplicaSet"
  ```
- **Sharding:** Splitting one large dataset **across multiple machines** (shards), each holding a portion of the data, based on a **shard key**. This is about *scaling* — a single machine's disk/RAM/CPU can't hold or serve an arbitrarily large dataset, so sharding distributes it.

**Simple analogy:** Replica set = multiple identical backup copies of the same book, so if one copy is destroyed you still have the content. Sharding = splitting one giant encyclopedia into multiple volumes stored in different libraries, so no single library needs to hold the whole thing.

**Backup/restore:**
```
mongodump   # exports data to a dump directory
mongorestore  # restores data from a dump directory
```

---

## MongoDB vs SQL (Postgres) — "how would you pick a database?"
This is a classic senior-level question. The honest answer is "it depends on your data shape and access patterns," not "NoSQL is always better/worse."

| | MongoDB (NoSQL) | PostgreSQL (SQL) |
|---|---|---|
| Schema | Flexible, per-document | Fixed, enforced by the database |
| Relationships | Embedding (denormalize) or manual references; JOIN-like `$lookup` exists but is less optimized than SQL JOINs | Native JOINs, foreign keys, referential integrity enforced by the DB |
| Transactions | Multi-document transactions supported (since v4.0) but historically a weaker point | Mature, strong ACID transactions across many tables, decades of tooling |
| Scaling | Built for horizontal scaling (sharding) from the ground up | Traditionally vertical scaling; horizontal scaling (e.g., Citus) is more effort |
| Best fit | Rapidly evolving schemas, document/nested data, huge write-heavy horizontally distributed workloads, catalogs/logs/content | Complex relational data with strong consistency needs — financial systems, inventory with strict constraints, anything needing complex multi-table JOINs/reporting |
| Data integrity | Enforced at the application/schema (Mongoose) layer, weaker at the DB layer itself | Enforced at the DB layer (constraints, foreign keys, unique, checks) — harder to bypass |

**How to answer "how would you pick a database" in an interview:**
> "I'd look at the shape of the data and the consistency needs first. If the data is naturally relational with strict integrity requirements — think financial transactions, orders referencing customers and products with foreign key constraints — I'd lean toward PostgreSQL, since the database itself enforces those relationships and ACID transactions are mature there. If the data is more document-like, the schema is expected to evolve quickly, or I need to scale writes horizontally across many nodes, I'd lean toward MongoDB. In practice, many real systems use both — a relational store for core transactional data and MongoDB (or Redis) for logs, catalogs, or caching."

---

## ORMs / ODMs — purpose (Mongoose, Prisma)
**What is it?** An ORM (Object-Relational Mapper, for SQL) or ODM (Object-Document Mapper, for document DBs) lets you interact with the database using JS/TS objects and methods instead of writing raw queries by hand, plus it usually adds schema validation, migrations, and type safety.

**Why was it invented?** Writing raw SQL/queries by hand for every operation is repetitive, error-prone (injection risks if done carelessly — see file 07), and doesn't give you compile-time safety. ORMs/ODMs abstract this, and modern ones (Prisma) generate fully typed query clients from your schema.

| | Mongoose (ODM) | Prisma (ORM, mainly SQL, some Mongo support) |
|---|---|---|
| Target DB | MongoDB | PostgreSQL, MySQL, SQLite, SQL Server (+ MongoDB, less mature) |
| Schema definition | JS schema objects at runtime | `schema.prisma` file, compiled into a typed client |
| Type safety | Add TypeScript types manually or via plugins | Auto-generated TypeScript types from schema — very strong type safety |
| Migrations | Not built-in (schema changes are mostly implicit since Mongo is schema-less) | Built-in migration system (`prisma migrate`) |
| Query style | Mongoose query builder / methods | Prisma Client — fully typed, autocomplete-friendly |
| Maturity/ecosystem | Long-established for Mongo | Newer, rapidly popular for SQL-based Node/TS projects |

---

## Connection pooling — why you never open a new DB connection per request
**What is it?** A connection pool is a small, pre-established set of open, reusable database connections that your app's queries borrow from and return to, instead of opening a brand-new TCP connection (plus, for SQL, a fresh auth handshake) for every single query.

**Why was it invented / what problem does it solve?** Opening a DB connection isn't free — a TCP handshake, then (for Postgres/MySQL) an authentication round-trip, typically costs single-digit-to-tens of milliseconds. If a busy API opened a fresh connection per incoming request, that setup cost would be paid on *every request*, and worse, the database itself has a hard limit on concurrent connections (Postgres defaults to `max_connections = 100`) — a traffic spike opening thousands of brand-new connections can exhaust that limit and start rejecting connections entirely, taking the DB down for everyone, not just the spike's cause. A pool amortizes the connection setup cost once, and caps how many connections your app can ever hold open at a time, protecting the database.

```js
// Node's `pg` driver — a real, runnable pattern (needs a live Postgres to actually connect;
// see examples/sql-connection-pooling-example.js for the fully commented version)
const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  max: 20,                     // hard cap on concurrent connections this pool will ever open
  idleTimeoutMillis: 30000,    // close idle connections after 30s of not being used
  connectionTimeoutMillis: 5000, // fail fast if the pool can't hand out a connection in time
});

async function getUserById(id) {
  // pool.query() borrows a connection, runs the query, and returns it to the pool automatically
  const { rows } = await pool.query('SELECT * FROM users WHERE id = $1', [id]);
  return rows[0];
}

// For a multi-statement TRANSACTION, you must check out ONE connection explicitly and
// reuse it for every statement in the transaction -- pool.query() alone gives a different
// (possibly different) connection per call, which would break transactional atomicity.
async function transferFunds(fromId, toId, amount) {
  const client = await pool.connect(); // check out a single dedicated connection
  try {
    await client.query('BEGIN');
    await client.query('UPDATE accounts SET balance = balance - $1 WHERE id = $2', [amount, fromId]);
    await client.query('UPDATE accounts SET balance = balance + $1 WHERE id = $2', [amount, toId]);
    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK'); // undo both writes if either statement failed
    throw err;
  } finally {
    client.release(); // ALWAYS return the connection to the pool, even on error
  }
}
```

**The gotcha interviewers probe:** forgetting `client.release()` (or throwing before it runs, without a `finally`) **leaks** a connection out of the pool permanently — do that enough times under load and the pool silently shrinks to zero usable connections, which looks exactly like "the database is down" in production, but is actually an application bug. This is why the transaction pattern above always releases in a `finally` block.

**Real-world usage:** Every production SQL-backed Node service (`pg`, `mysql2`) sizes its pool based on expected concurrency and the database's own connection limit — a common rule of thumb is `pool max × number of app instances < DB's max_connections`, since each horizontally-scaled instance runs its own separate pool. Mongoose/the MongoDB driver also pool connections under the hood by default (`maxPoolSize`, default 100) — the same underlying problem, just less visible day-to-day since you don't hand-manage it the way `pool.connect()`/`release()` requires for transactions.

**How to explain it in an interview:**
> "A connection pool keeps a capped set of already-established DB connections that queries borrow and return, instead of paying a fresh TCP-plus-auth handshake cost per query and risking exhausting the database's max connection limit under load. For a single query, most drivers let the pool handle borrow/return transparently — `pool.query()`. For a multi-statement transaction, I have to explicitly check out one connection with `pool.connect()`, run BEGIN/COMMIT/ROLLBACK on that same connection, and always release it in a `finally`, since forgetting to release it leaks a connection out of the pool permanently and can eventually starve the whole pool."

---

## Quick note: MongoDB transactions (multi-document)
Since the comparison table above calls out transactions as historically a MongoDB weak point, here's the modern shape (MongoDB 4.0+, requires a replica set):
```js
const session = await mongoose.startSession();
session.startTransaction();
try {
  await Account.updateOne({ _id: fromId }, { $inc: { balance: -amount } }, { session });
  await Account.updateOne({ _id: toId }, { $inc: { balance: amount } }, { session });
  await session.commitTransaction();
} catch (err) {
  await session.abortTransaction();
  throw err;
} finally {
  session.endSession();
}
```
Conceptually identical to the SQL `BEGIN`/`COMMIT`/`ROLLBACK` pattern above — the difference is you pass `{ session }` into every operation that should be part of the transaction.

---

**How to explain this section in an interview:**
> "MongoDB stores flexible JSON-like documents and is a good fit for evolving schemas and horizontal scaling, while a relational DB like Postgres is better where you need strict relationships, constraints, and mature ACID transactions. Mongoose adds a schema/validation layer on top of schema-less MongoDB and gives CRUD and aggregation pipeline support — stages like `$match`, `$group`, `$sort` chain together similar to SQL's WHERE/GROUP BY/ORDER BY. Indexing speeds up reads at the cost of slightly slower writes and more storage. Replica sets are about high availability through redundant copies; sharding is about horizontal scaling by splitting data across machines. For picking a database, it comes down to data shape, consistency needs, and scaling pattern, not one being universally better."
