/**
 * clustering-example.js
 *
 * No npm install needed — uses only Node built-ins (cluster, os, http).
 * Run with: node clustering-example.js
 * Then hit it with: curl http://localhost:3000/  (repeat a few times, or use a load
 * testing tool like `autocannon` or `ab`) and watch different worker PIDs handle requests.
 *
 * Demonstrates the `cluster` module: the primary process forks one worker per CPU core,
 * and all workers share the same listening port -- the OS/Node load-balances incoming
 * connections across them. This is how a Node app uses ALL cores of a machine, since a
 * single Node process only uses one core for JS execution.
 *
 * NOTE: this is for an I/O-bound web server scaling across cores -- NOT for parallelizing
 * one CPU-heavy computation (that's what worker_threads is for -- see file 09).
 */

const cluster = require('cluster');
const os = require('os');
const http = require('http');

const PORT = 3000;

if (cluster.isPrimary) {
  const cpuCount = os.cpus().length;
  console.log(`[primary ${process.pid}] Detected ${cpuCount} CPU cores. Forking ${cpuCount} workers...`);

  // Fork one worker process per CPU core. Each worker is a FULL, separate copy of this
  // script (running the `else` branch below), with its own memory/event loop.
  for (let i = 0; i < cpuCount; i++) {
    cluster.fork();
  }

  // If a worker crashes for any reason, replace it -- basic self-healing so one crashed
  // worker doesn't permanently reduce your server's capacity.
  cluster.on('exit', (worker, code, signal) => {
    console.log(`[primary] Worker ${worker.process.pid} died (code: ${code}, signal: ${signal}). Restarting...`);
    cluster.fork();
  });

  cluster.on('online', (worker) => {
    console.log(`[primary] Worker ${worker.process.pid} is online`);
  });
} else {
  // -----------------------------------------------------------------------
  // WORKER PROCESS CODE: this runs once per forked worker.
  // All workers bind to the SAME port -- the OS (via Node's internal handling)
  // distributes incoming connections across them, typically round-robin on most platforms.
  // -----------------------------------------------------------------------
  http.createServer((req, res) => {
    // A tiny bit of artificial "work" so requests take a non-zero amount of time,
    // making it easier to observe multiple workers handling concurrent requests.
    let sum = 0;
    for (let i = 0; i < 1e6; i++) sum += i;

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      handledByWorkerPid: process.pid,
      message: 'Hello from a clustered Node server!',
    }));
  }).listen(PORT, () => {
    console.log(`[worker ${process.pid}] Listening on port ${PORT}`);
  });
}

// In production, you'd typically use PM2 (`pm2 start server.js -i max`) instead of
// hand-rolling this cluster.fork() logic -- it adds zero-downtime reloads, log
// aggregation, and monitoring on top of the same underlying idea. See file 11.
