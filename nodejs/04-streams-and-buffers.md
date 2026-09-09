# 04. Streams and Buffers

## Buffers — why does JavaScript need a special binary data type?
**What is it?** `Buffer` is a Node global class for holding raw binary data — a fixed-length sequence of bytes, allocated outside the normal V8 JS heap.

**Why was it invented?** Plain JavaScript strings are UTF-16 text — great for text, bad for binary data (images, video chunks, TCP packets, file contents that aren't necessarily valid text). Before typed arrays existed in JS, there was no good way to represent "a chunk of raw bytes" efficiently. Node needed this constantly — reading files, handling TCP sockets, working with images/encodings — so it introduced `Buffer` early on. Today, `Buffer` is actually built as a subclass of JavaScript's standard `Uint8Array` (a **TypedArray**, part of the language spec since ES2015), so it plays nicely with modern JS binary APIs while adding Node-specific convenience methods (like easy encoding conversions).

```js
const buf = Buffer.from('hello', 'utf-8');
console.log(buf);            // <Buffer 68 65 6c 6c 6f>  (raw bytes, in hex)
console.log(buf.toString()); // 'hello' (decode back to a string)
console.log(buf.length);     // 5 (byte length, not character count — matters for multi-byte chars!)

const empty = Buffer.alloc(10);   // 10 zero-filled bytes, safe default
```

**Real-world usage:** Reading a file with `fs.readFile` (without an encoding) gives you a `Buffer`, not a string. Every chunk you get from a network socket or an HTTP request body is a `Buffer` until you decide to decode it. Image/video processing, cryptography (hashing raw bytes), and protocol parsing (binary protocols) all lean on `Buffer`.

**How to explain it in an interview:**
> "Buffer exists because JS strings are text (UTF-16), but servers constantly deal with raw binary data — file bytes, network packets, images. Buffer represents a fixed chunk of bytes outside the V8 heap, and it's actually built on top of JS's own `Uint8Array` typed array, so it's both Node-specific and standards-based."

---

## Streams — why were they invented?
**What is it?** A stream is an abstraction for reading or writing data **piece by piece (in chunks)**, instead of loading the entire thing into memory at once.

**Why was it invented?** Imagine reading a 4GB video file with `fs.readFile()` — it would try to load the *entire* 4GB into memory before you can do anything with it. That's slow, wasteful, and can crash your process if the file is bigger than available memory. Streams solve this by processing data incrementally: read a small chunk, do something with it, read the next chunk — memory usage stays roughly constant regardless of the total data size. This is the same idea as "don't try to hold Niagara Falls in a bucket — put a pipe on it and let the water flow through."

**Real-world usage:** Serving large video/audio files over HTTP, uploading/downloading large files, processing large CSV/log files line by line, piping compressed data through gzip on the fly, proxying an HTTP request/response without buffering the whole body.

### The 4 types of streams

| Type | Direction | Real use case |
|---|---|---|
| **Readable** | You read from it | `fs.createReadStream()` — reading a file; incoming HTTP request body (`req` in a server) |
| **Writable** | You write to it | `fs.createWriteStream()` — writing a file; outgoing HTTP response (`res`) |
| **Duplex** | Both read and write, independent of each other | A TCP socket (`net.Socket`) — you read and write on the same connection |
| **Transform** | A Duplex stream where output is *computed* from input | `zlib.createGzip()` — data goes in raw, comes out compressed; a CSV-to-JSON converter |

```js
const fs = require('fs');
const zlib = require('zlib');

// Readable -> Transform -> Writable, all piped together
fs.createReadStream('input.txt')
  .pipe(zlib.createGzip())          // Transform: compresses chunks as they pass through
  .pipe(fs.createWriteStream('input.txt.gz')); // Writable: writes compressed chunks to disk
```

### Key stream events
- **`data`** — fired when a chunk is available to read (Readable streams, in "flowing" mode).
- **`end`** — fired when there's no more data to read (Readable streams).
- **`error`** — fired when something goes wrong (must be handled, or Node will crash the process on an unhandled stream error).
- **`finish`** — fired when all data has been flushed to the underlying system (Writable streams).

```js
const readable = fs.createReadStream('big.log');
readable.on('data', (chunk) => console.log(`Got ${chunk.length} bytes`));
readable.on('end', () => console.log('No more data'));
readable.on('error', (err) => console.error('Stream error:', err));
```

---

## Backpressure — explained simply
**What is it?** Backpressure is what happens when a **Writable** destination can't keep up with how fast a **Readable** source is producing data. If you don't handle this, the fast producer keeps stuffing data into memory faster than the consumer can drain it — leading to unbounded memory growth (basically a memory leak / potential crash).

**Why does `.pipe()` matter here?** `.pipe()` automatically manages backpressure for you: it pauses the Readable source when the Writable's internal buffer is full, and resumes it once the Writable signals it's ready for more (via the `drain` event). This is one of the main reasons to prefer `.pipe()` (or async iteration) over manually listening to `data` events and calling `write()` yourself.

**Simple analogy:** You're filling a bottle (Writable) from a hose (Readable). If the hose sprays faster than the bottle can accept, water overflows everywhere (memory bloat/crash) unless something turns down the hose (pauses the Readable) until the bottle catches up.

```js
// Manual backpressure handling if NOT using .pipe():
function writeData(readable, writable) {
  const chunk = readable.read();
  if (chunk === null) return;

  const canWriteMore = writable.write(chunk);
  if (!canWriteMore) {
    // writable's internal buffer is full — pause and wait for 'drain'
    readable.pause();
    writable.once('drain', () => {
      readable.resume();
      writeData(readable, writable);
    });
  } else {
    writeData(readable, writable);
  }
}
```

**Real-world usage:** Streaming a large file to an HTTP response over a slow client connection — if you ignored backpressure and just blasted `write()` calls, Node would buffer the entire unsent file in memory waiting for the slow network, potentially exhausting memory under load with many slow clients. `.pipe()` protects you from this automatically.

**How to explain streams + backpressure in an interview:**
> "Streams let you process data in chunks instead of loading everything into memory — critical for large files or network data. There are four types: Readable, Writable, Duplex, and Transform. Backpressure is the mechanism that prevents a fast data producer from overwhelming a slow consumer's memory — `.pipe()` handles this automatically by pausing the source when the destination's buffer is full and resuming it once it drains."

See `examples/streams-demo.js` for a runnable Readable -> Transform -> Writable pipeline with backpressure comments.

---

## Quick Reference

| Concept | One-liner |
|---|---|
| Buffer | Raw byte storage for binary data; built on `Uint8Array` |
| Stream | Process data in chunks instead of all at once |
| Readable | Source you read from (file, request body) |
| Writable | Destination you write to (file, response) |
| Duplex | Both directions independently (socket) |
| Transform | Duplex where output is derived from input (gzip) |
| Backpressure | Preventing a fast producer from overwhelming a slow consumer |
| `.pipe()` | Connects streams and auto-manages backpressure |
