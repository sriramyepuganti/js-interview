/**
 * streams-demo.js
 *
 * No npm install needed — uses only Node built-ins (stream, fs).
 * Run with: node streams-demo.js
 *
 * Demonstrates: a Readable stream generating data -> a Transform stream that
 * uppercases it -> a Writable stream that writes it to disk, all piped together.
 * Also explains backpressure in comments at the point where it actually matters.
 */

const { Readable, Transform, Writable } = require('stream');
const fs = require('fs');
const path = require('path');

const OUTPUT_FILE = path.join(__dirname, 'streams-demo-output.txt');
const TOTAL_CHUNKS = 100000; // generate a decent amount of data to make streaming meaningful

// ---------------------------------------------------------------------------
// 1) READABLE STREAM: generates data on demand instead of having it all in memory upfront.
//    Node calls _read() whenever it wants more data ("pull" model) -- this is what lets
//    a Readable stream represent an effectively unbounded/huge data source cheaply.
// ---------------------------------------------------------------------------
let chunksProduced = 0;

const numberSource = new Readable({
  read(size) {
    if (chunksProduced >= TOTAL_CHUNKS) {
      this.push(null); // push(null) signals "end of stream" -- fires the 'end' event downstream
      return;
    }
    const line = `line ${chunksProduced}: some generated text\n`;
    chunksProduced++;
    // push() returns false if the internal buffer is now over its highWaterMark --
    // that's the Readable side's signal that backpressure should apply, though when using
    // .pipe() (below), Node handles pausing/resuming this stream for us automatically.
    this.push(line);
  },
});

// ---------------------------------------------------------------------------
// 2) TRANSFORM STREAM: receives a chunk, transforms it, and passes it on.
//    This is the "computed output from input" stream type.
// ---------------------------------------------------------------------------
const uppercaseTransform = new Transform({
  transform(chunk, encoding, callback) {
    const upper = chunk.toString().toUpperCase();
    // callback(error, transformedChunk) -- calling this is what signals "I'm done with
    // this chunk, you can send me the next one." If you delay calling callback(), you are
    // intentionally applying backpressure upstream because the source will wait for you.
    callback(null, upper);
  },
});

// ---------------------------------------------------------------------------
// 3) WRITABLE STREAM: the destination. Here we use a real file write stream, but the
//    important concept is the write() return value and 'drain' event, explained below.
// ---------------------------------------------------------------------------
const fileWriter = fs.createWriteStream(OUTPUT_FILE);

console.log(`Streaming ${TOTAL_CHUNKS} generated lines -> uppercase transform -> ${OUTPUT_FILE}`);

// ---------------------------------------------------------------------------
// BACKPRESSURE, explained via .pipe():
// .pipe() automatically wires up the following behavior for us:
//   - it writes each chunk from the source into the destination
//   - if destination.write() returns false (its internal buffer is full / over highWaterMark),
//     .pipe() PAUSES the source stream (readable.pause())
//   - once the destination emits 'drain' (it has caught up and can accept more), .pipe()
//     RESUMES the source (readable.resume())
// Without .pipe() (i.e., manually calling .write() in a 'data' handler), you'd have to
// implement this pause/resume/drain dance yourself, or risk buffering unbounded data in
// memory if the source produces faster than the destination can consume.
// ---------------------------------------------------------------------------
numberSource
  .pipe(uppercaseTransform)
  .pipe(fileWriter);

fileWriter.on('finish', () => {
  // 'finish' fires once all data has been flushed to the underlying file.
  console.log('Done writing. Check streams-demo-output.txt');
  const stats = fs.statSync(OUTPUT_FILE);
  console.log(`Output file size: ${(stats.size / 1024).toFixed(1)} KB`);
});

// Always handle 'error' on every stream in a pipeline -- an unhandled stream error
// will crash the process.
numberSource.on('error', (err) => console.error('Source error:', err));
uppercaseTransform.on('error', (err) => console.error('Transform error:', err));
fileWriter.on('error', (err) => console.error('Writer error:', err));
