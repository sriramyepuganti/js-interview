/**
 * child-process-methods-demo.js
 *
 * No npm install needed — uses only Node built-ins (child_process, path).
 * Run with: node child-process-methods-demo.js
 *
 * Demonstrates all four child_process methods side by side, so the differences in
 * shell-parsing, buffering vs streaming, and IPC are visible rather than just described:
 *   - exec()      : shell-parsed, buffers ALL output, hands it to you in one callback
 *   - execFile()  : no shell, buffers output (same as exec, but safer with dynamic args)
 *   - spawn()     : no shell, STREAMS output chunk by chunk (never buffers the whole thing)
 *   - fork()      : spawns another NODE script, with a structured-message IPC channel
 *
 * See 09-microservices-and-scaling.md for the full explanation and comparison table.
 */

const { exec, execFile, spawn, fork } = require('child_process');
const path = require('path');

console.log('--- 1) exec(): shell-parsed, buffered ---');
console.log('(Runs via a shell, so pipes/globs work, but string-building a command from');
console.log(' untrusted input here would be a command-injection risk -- same family of bug');
console.log(' as SQL injection, see file 07.)\n');

exec('echo "hello from exec" | tr a-z A-Z', (err, stdout, stderr) => {
  if (err) return console.error('exec error:', err);
  console.log('  exec() got the FULL buffered output at once:', stdout.trim());

  runExecFile();
});

function runExecFile() {
  console.log('\n--- 2) execFile(): no shell, buffered, safer with dynamic args ---');
  // 'node' with a version flag -- execFile runs the executable directly, args passed as an
  // array, never concatenated into a shell string, so this is safe even with untrusted args.
  execFile(process.execPath, ['--version'], (err, stdout) => {
    if (err) return console.error('execFile error:', err);
    console.log('  execFile() ran `node --version` directly (no shell):', stdout.trim());

    runSpawn();
  });
}

function runSpawn() {
  console.log('\n--- 3) spawn(): no shell, STREAMS output instead of buffering it ---');
  // Ask node to print 3 lines with small delays, to show data arriving as separate chunks
  // rather than all at once at the end (the way exec/execFile hand it to you).
  const child = spawn(process.execPath, ['-e', `
    for (let i = 1; i <= 3; i++) {
      console.log('spawned line ' + i);
    }
  `]);

  child.stdout.on('data', (chunk) => {
    // In a real long-running process (ffmpeg, a log tail), THIS is where you'd process
    // each chunk as it arrives, instead of waiting for the whole thing to finish.
    process.stdout.write(`  spawn() streamed chunk: ${chunk}`);
  });

  child.on('close', (code) => {
    console.log(`  spawn() child exited with code ${code}`);
    runFork();
  });
}

function runFork() {
  console.log('\n--- 4) fork(): spawns another Node script, with structured-message IPC ---');
  const childPath = path.join(__dirname, 'child-process-fork-child.js');
  const child = fork(childPath);

  child.send({ n: 21 }); // send a real JS object, not just a text string

  child.on('message', (msg) => {
    console.log('  [parent] received back from forked child:', msg); // { doubled: 42 }
    console.log('\nAll four child_process methods demonstrated. Exiting.');
  });

  child.on('exit', () => {
    // Nothing else to clean up here — the child called process.exit() itself once done.
  });
}
