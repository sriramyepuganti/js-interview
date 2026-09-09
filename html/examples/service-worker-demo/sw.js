// sw.js — the service worker itself.
//
// IMPORTANT: this file runs in its own background thread/context.
// It has NO access to the DOM, `window`, or the page that registered it.
// It only receives lifecycle events (install/activate/fetch) and can talk
// to the page via postMessage if needed (not used in this simple demo).

// Bump this version string any time you change what's being pre-cached —
// the browser treats a byte-different sw.js as a "new" service worker,
// which goes through install -> waiting -> activate again.
const CACHE_NAME = 'pwa-demo-v1';

// The "app shell" — the minimal set of files needed for the page to at
// least render something, even with zero network connection.
const PRECACHE_FILES = ['index.html', 'index.js', 'manifest.json'];

// -----------------------------------------------------------------------
// INSTALL: fires once, the first time this exact sw.js is registered
// (or whenever its byte content changes). This is where we pre-cache the
// app shell so it's available offline from the very first load.
// -----------------------------------------------------------------------
self.addEventListener('install', (event) => {
  console.log('[sw] installing...');

  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE_NAME);
      await cache.addAll(PRECACHE_FILES); // fetch + store each file in one go

      // Without this, a newly-installed service worker sits in "waiting"
      // state until every open tab using the OLD service worker is closed.
      // skipWaiting() forces it straight to activation instead.
      await self.skipWaiting();
    })()
  );
});

// -----------------------------------------------------------------------
// ACTIVATE: fires once this service worker actually takes control.
// Good place to clean up old caches from previous versions.
// -----------------------------------------------------------------------
self.addEventListener('activate', (event) => {
  console.log('[sw] activating...');

  event.waitUntil(
    (async () => {
      const cacheKeys = await caches.keys();
      await Promise.all(
        cacheKeys
          .filter((key) => key !== CACHE_NAME) // delete every cache except the current one
          .map((key) => caches.delete(key))
      );

      // clients.claim() lets this service worker start controlling any
      // ALREADY-OPEN pages immediately, instead of waiting for the next
      // full navigation/reload.
      await self.clients.claim();
    })()
  );
});

// -----------------------------------------------------------------------
// FETCH: fires for EVERY network request the page makes (HTML, JS, CSS,
// images, API calls) while this service worker is in control.
//
// Strategy used here: "cache-first, fall back to network, then cache
// whatever the network returns" — good for demo purposes because it means
// after the very first successful load, the page keeps working offline.
// -----------------------------------------------------------------------
self.addEventListener('fetch', (event) => {
  event.respondWith(
    (async () => {
      const cache = await caches.open(CACHE_NAME);
      const cachedResponse = await cache.match(event.request);

      if (cachedResponse) {
        // Already have it — serve instantly, no network round-trip needed.
        return cachedResponse;
      }

      try {
        const networkResponse = await fetch(event.request);
        // Cache a CLONE of the response — a Response body can only be
        // read once, and we need one copy for the cache and one to return.
        cache.put(event.request, networkResponse.clone());
        return networkResponse;
      } catch (err) {
        // Network failed (offline) AND we had nothing cached for this
        // request — nothing more we can do for this specific demo.
        console.log('[sw] fetch failed and nothing cached for:', event.request.url);
        throw err;
      }
    })()
  );
});
