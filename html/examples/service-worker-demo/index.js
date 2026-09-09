// index.js — runs on the main page (NOT inside the service worker).
// This is where we register the service worker and trigger some demo actions.

const statusEl = document.getElementById('status');

function setStatus(message) {
  statusEl.textContent = message;
  console.log(message);
}

// ---------------------------------------------------------------------
// Register the service worker.
// "serviceWorker" in navigator is a feature-detection check — older
// browsers simply won't have this API, so we guard against that first.
// ---------------------------------------------------------------------
document.getElementById('registerBtn').addEventListener('click', async () => {
  if (!('serviceWorker' in navigator)) {
    setStatus('Service workers are not supported in this browser.');
    return;
  }

  try {
    // sw.js MUST be served from the same origin, and its scope defaults
    // to the directory it lives in (here: everything under this folder).
    const registration = await navigator.serviceWorker.register('sw.js');
    setStatus('Service worker registered successfully.\nScope: ' + registration.scope);
  } catch (err) {
    setStatus('Service worker registration failed: ' + err.message);
  }
});

// ---------------------------------------------------------------------
// Make a fetch request that the service worker will intercept.
// When online: the SW fetches from the network and caches the response.
// When offline (after the first successful fetch): the SW serves the
// previously-cached response instead of failing.
// ---------------------------------------------------------------------
document.getElementById('fetchBtn').addEventListener('click', async () => {
  try {
    const res = await fetch('https://jsonplaceholder.typicode.com/todos/1');
    const data = await res.json();
    setStatus('Fetched data (see console for full payload):\n' + JSON.stringify(data, null, 2));
  } catch (err) {
    setStatus('Fetch failed (are you offline with nothing cached yet?): ' + err.message);
  }
});

// ---------------------------------------------------------------------
// Optional: detect when a NEW service worker takes over control of the
// page (e.g. after you edit sw.js and it activates). Useful for showing
// a "new version available, please refresh" banner in real apps.
// ---------------------------------------------------------------------
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    console.log('A new service worker has taken control of this page.');
  });
}
