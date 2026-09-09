// Drop this file into any React sandbox / CRA / Vite app (e.g. src/SuspenseLazyLoading.jsx)
// and render <SuspenseLazyLoadingExample /> somewhere.
//
// NOTE: React.lazy() expects to import from a SEPARATE file (that's the whole
// point — it's a separate code-split chunk). Since this is a single
// drop-in example file, we simulate a "lazily loaded module" with a small
// helper that returns a dynamic-import-shaped promise. In a REAL app, you'd
// delete the `simulateLazyImport` helper and just point React.lazy directly
// at `() => import('./HeavyComponent')` (a real separate file).

import React, { Suspense, useState } from 'react';

// ---------------------------------------------------------------------------
// In a real app, this would be its own file, e.g. "./HeavyChart.jsx", and you
// would NOT need the wrapper below — you'd just do:
//
//   const HeavyChart = React.lazy(() => import('./HeavyChart'));
//
// which tells the bundler to split HeavyChart into its own JS chunk that's
// only downloaded when it's actually needed (e.g. when this component first
// renders), instead of bloating the initial bundle everyone downloads.
// ---------------------------------------------------------------------------
function HeavyChart({ data }) {
  console.log('HeavyChart module executed (imagine this being a big charting library)');
  return (
    <div style={{ border: '1px solid green', padding: 12 }}>
      <strong>Heavy Chart Component (loaded on demand)</strong>
      <ul>
        {data.map((point) => (
          <li key={point}>{point}</li>
        ))}
      </ul>
    </div>
  );
}

// Simulates what a real `import('./HeavyChart')` dynamic import returns:
// a Promise that resolves to a module object with a `default` export.
// Includes an artificial delay so you can actually SEE the Suspense fallback.
function simulateLazyImport() {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({ default: HeavyChart });
    }, 1500); // pretend this is the network time to download the chunk
  });
}

// This is the real API surface you'd use in production:
//   const HeavyChart = React.lazy(() => import('./HeavyChart'));
const LazyHeavyChart = React.lazy(simulateLazyImport);

export default function SuspenseLazyLoadingExample() {
  const [showChart, setShowChart] = useState(false);

  return (
    <div style={{ padding: 16 }}>
      <h2>React.lazy + Suspense (Code Splitting)</h2>
      <p>
        Click the button below. The "chunk" for HeavyChart only starts
        loading at that point (not on initial page load) — check the console
        for the "module executed" log, which only appears AFTER you click.
      </p>
      <button onClick={() => setShowChart(true)}>Show heavy chart</button>

      {showChart && (
        // Suspense shows the fallback while LazyHeavyChart's code is still
        // downloading. Once the dynamic import resolves, React swaps the
        // fallback out for the real component automatically.
        <Suspense fallback={<p>Loading chart module...</p>}>
          <LazyHeavyChart data={['Point A', 'Point B', 'Point C']} />
        </Suspense>
      )}

      {/*
        ROUTE-BASED CODE SPLITTING (most common real-world usage) looks like:

        const Home = React.lazy(() => import('./routes/Home'));
        const Settings = React.lazy(() => import('./routes/Settings'));

        <Suspense fallback={<PageSpinner />}>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/settings" element={<Settings />} />
          </Routes>
        </Suspense>

        This way, a user who never visits "/settings" never downloads that
        route's JS at all.
      */}
    </div>
  );
}
