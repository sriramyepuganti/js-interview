// Drop this file into any React sandbox / CRA / Vite app (e.g. src/CustomHooksExamples.jsx)
// and render <CustomHooksExamples /> somewhere. No extra dependencies needed.

import React, { useState, useEffect } from 'react';

// ---------------------------------------------------------------------------
// useFetch — a hand-rolled data-fetching hook.
// WHY build this by hand at all if React Query exists? Interviewers often ask
// you to implement this from scratch to check you understand effects,
// cleanup, and race conditions. In real production code, prefer TanStack
// Query (see 07-state-management.md) which handles caching/retries/dedup too.
// ---------------------------------------------------------------------------
function useFetch(url) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    // `ignore` guards against a race condition: if `url` changes again (or
    // the component unmounts) before this fetch resolves, we must not apply
    // this now-stale response on top of newer state.
    let ignore = false;

    setLoading(true);
    setError(null);

    fetch(url)
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP error: ${res.status}`);
        return res.json();
      })
      .then((json) => {
        if (!ignore) {
          setData(json);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (!ignore) {
          setError(err);
          setLoading(false);
        }
      });

    return () => {
      ignore = true; // cleanup: mark this effect's fetch as stale
    };
  }, [url]);

  return { data, loading, error };
}

function UseFetchDemo() {
  // A free public test API — swap for any real endpoint.
  const [postId, setPostId] = useState(1);
  const { data, loading, error } = useFetch(
    `https://jsonplaceholder.typicode.com/posts/${postId}`
  );

  return (
    <section>
      <h3>useFetch</h3>
      <button onClick={() => setPostId((id) => id + 1)}>Next post</button>
      {loading && <p>Loading...</p>}
      {error && <p style={{ color: 'red' }}>Error: {error.message}</p>}
      {data && (
        <div>
          <strong>{data.title}</strong>
          <p>{data.body}</p>
        </div>
      )}
    </section>
  );
}

// ---------------------------------------------------------------------------
// useDebounce — delay reacting to a fast-changing value.
// WHY: without this, typing in a search box would fire an API call on every
// keystroke. Debouncing waits until the user pauses typing before "settling"
// on a value.
// ---------------------------------------------------------------------------
function useDebounce(value, delay = 500) {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay);
    // If `value` changes again before `delay` elapses, this cleanup cancels
    // the pending update — that's the whole debounce mechanism.
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debouncedValue;
}

function UseDebounceDemo() {
  const [text, setText] = useState('');
  const debouncedText = useDebounce(text, 500);

  return (
    <section>
      <h3>useDebounce</h3>
      <input
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Type quickly..."
      />
      <p>Live value: {text}</p>
      <p>Debounced value (updates 500ms after you stop typing): {debouncedText}</p>
    </section>
  );
}

// ---------------------------------------------------------------------------
// useLocalStorage — behaves like useState but persists to localStorage.
// WHY: lets a value (like a theme preference) survive a page refresh without
// needing a backend, and without re-implementing the read/write logic every
// time you need this pattern.
// ---------------------------------------------------------------------------
function useLocalStorage(key, initialValue) {
  const [value, setValue] = useState(() => {
    // Lazy initializer: only runs ONCE on mount, not on every render.
    try {
      const stored = window.localStorage.getItem(key);
      return stored !== null ? JSON.parse(stored) : initialValue;
    } catch {
      // localStorage might be disabled (privacy mode) or contain bad JSON.
      return initialValue;
    }
  });

  useEffect(() => {
    try {
      window.localStorage.setItem(key, JSON.stringify(value));
    } catch {
      // Storage full/unavailable — not critical, fail silently.
    }
  }, [key, value]);

  return [value, setValue];
}

function UseLocalStorageDemo() {
  const [theme, setTheme] = useLocalStorage('demo-theme', 'light');

  return (
    <section>
      <h3>useLocalStorage</h3>
      <p>Current theme: {theme} (refresh the page — it persists!)</p>
      <button onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}>
        Toggle theme
      </button>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Root component
// ---------------------------------------------------------------------------
export default function CustomHooksExamples() {
  return (
    <div style={{ display: 'grid', gap: '24px', padding: '16px' }}>
      <h2>Custom Hooks Examples</h2>
      <UseFetchDemo />
      <UseDebounceDemo />
      <UseLocalStorageDemo />
    </div>
  );
}
