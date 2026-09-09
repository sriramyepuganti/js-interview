/**
 * debounce-throttle.js
 * Run with: node debounce-throttle.js
 *
 * Implements both debounce and throttle from scratch, with usage examples.
 * See ../11-memory-and-performance.md and ../10-design-patterns.md for context.
 */

// ---------------------------------------------------------------------------
// DEBOUNCE — waits until activity STOPS for `delay` ms, then runs ONCE.
// Real-world use: search-as-you-type — don't fire an API call on every
// keystroke, only after the user pauses typing.
// ---------------------------------------------------------------------------
function debounce(fn, delay) {
  let timerId; // closure variable — persists between calls to the returned function

  return function (...args) {
    const context = this; // preserve caller's `this`, in case fn relies on it
    clearTimeout(timerId); // cancel any previously scheduled call — resets the "quiet period"
    timerId = setTimeout(() => {
      fn.apply(context, args);
    }, delay);
  };
}

// ---------------------------------------------------------------------------
// THROTTLE — guarantees fn runs at MOST once per `delay` ms, no matter how
// often the triggering event fires.
// Real-world use: scroll/resize handlers — you want periodic updates, but
// not on every single scroll event (could fire hundreds of times per second).
// ---------------------------------------------------------------------------
function throttle(fn, delay) {
  let isWaiting = false; // closure flag — persists between calls

  return function (...args) {
    const context = this;
    if (isWaiting) return; // ignore calls while we're in the "cooldown" window

    fn.apply(context, args); // run immediately on the first call
    isWaiting = true;

    setTimeout(() => {
      isWaiting = false; // cooldown over — next call is allowed to run immediately again
    }, delay);
  };
}

// A slightly more useful throttle that also runs the LAST call after cooldown
// (common real-world enhancement — many UI libraries do this by default)
function throttleWithTrailingCall(fn, delay) {
  let isWaiting = false;
  let pendingArgs = null;

  return function (...args) {
    const context = this;
    if (isWaiting) {
      pendingArgs = args; // remember the latest call to run once cooldown ends
      return;
    }
    fn.apply(context, args);
    isWaiting = true;

    setTimeout(function tick() {
      if (pendingArgs) {
        fn.apply(context, pendingArgs);
        pendingArgs = null;
        setTimeout(tick, delay); // keep the cooldown going for the trailing call too
      } else {
        isWaiting = false;
      }
    }, delay);
  };
}


// ---------------------------------------------------------------------------
// USAGE EXAMPLES
// ---------------------------------------------------------------------------

function fetchSearchResults(query) {
  console.log(`[API CALL] Searching for: "${query}" at ${new Date().toISOString()}`);
}

function handleScroll(scrollY) {
  console.log(`[SCROLL HANDLER] scrollY = ${scrollY} at ${new Date().toISOString()}`);
}

const debouncedSearch = debounce(fetchSearchResults, 300);
const throttledScroll = throttle(handleScroll, 500);

console.log("=== Debounce demo: simulating fast typing 'h', 'he', 'hel', 'hell', 'hello' ===");
console.log("(Only ONE API call should fire, ~300ms after the LAST keystroke, with the final value)");
["h", "he", "hel", "hell", "hello"].forEach((query, i) => {
  setTimeout(() => debouncedSearch(query), i * 50); // simulate keystrokes 50ms apart (faster than the 300ms debounce delay)
});
// Expected: only "hello" gets logged, once, ~300ms after the last keystroke.
// Every earlier call gets cancelled by clearTimeout before it has a chance to run.

setTimeout(() => {
  console.log("\n=== Throttle demo: simulating rapid scroll events every 100ms for 1.2s ===");
  console.log("(With a 500ms throttle, only every ~5th event should actually trigger the handler)");
  let scrollPos = 0;
  const interval = setInterval(() => {
    scrollPos += 50;
    throttledScroll(scrollPos);
  }, 100);
  setTimeout(() => clearInterval(interval), 1200);
  // Expected: handler fires immediately at scrollY=50, then again roughly every 500ms
  // (at ~550, ~1050...), NOT on every single 100ms tick.
}, 1000);
