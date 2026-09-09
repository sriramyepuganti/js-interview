// Drop this file into any React sandbox / CRA / Vite app (e.g. src/PerformanceOptimization.jsx)
// and render <PerformanceOptimization /> somewhere. Open the browser console
// to see the render logs described in the comments. No extra dependencies needed.

import React, { useState, useMemo, useCallback } from 'react';

// ---------------------------------------------------------------------------
// A child component wrapped in React.memo — React will skip re-rendering it
// if its props are shallowly equal to the previous render's props.
// ---------------------------------------------------------------------------
const ExpensiveListItem = React.memo(function ExpensiveListItem({ label, onSelect }) {
  console.log(`  -> Rendering ExpensiveListItem: ${label}`);
  return <li onClick={() => onSelect(label)}>{label}</li>;
});

// ---------------------------------------------------------------------------
// BEFORE: without useCallback, `handleSelect` below is a NEW function on
// every render of the parent, which means EVERY ExpensiveListItem re-renders
// on every parent render too, even though React.memo is applied —
// because the shallow prop comparison sees a "different" onSelect every time.
//
// AFTER: wrapping the handler in useCallback with a stable dependency array
// gives it a STABLE reference across renders, so React.memo's comparison
// actually succeeds and unrelated re-renders are skipped.
// ---------------------------------------------------------------------------
export default function PerformanceOptimization() {
  const [items] = useState(['Apple', 'Banana', 'Cherry', 'Date', 'Elderberry']);
  const [selected, setSelected] = useState(null);
  const [unrelatedTick, setUnrelatedTick] = useState(0); // simulates unrelated re-renders

  // --- useCallback: stable function reference -----------------------------
  // Try commenting out the `useCallback` wrapper (just use a plain arrow
  // function instead) and watch the console: EVERY ExpensiveListItem will
  // log a re-render whenever "Trigger unrelated re-render" is clicked, even
  // though `items` and `selected` never affect what THEY render.
  const handleSelect = useCallback((label) => {
    setSelected(label);
  }, []); // no dependencies needed — setSelected's updater form isn't even used here,
          // but this callback doesn't reference any changing values, so [] is correct.

  // --- useMemo: expensive derived value ------------------------------------
  // Without useMemo, this "expensive" sort+filter would re-run on EVERY
  // render of this component -- including when `unrelatedTick` changes,
  // which has nothing to do with `items` or `selected`.
  const sortedItems = useMemo(() => {
    console.log('Computing sortedItems (expensive operation)...');
    return [...items].sort(); // pretend this is a heavy computation
  }, [items]);

  return (
    <div style={{ padding: 16 }}>
      <h2>Performance Optimization: React.memo + useMemo + useCallback</h2>

      <button onClick={() => setUnrelatedTick((t) => t + 1)}>
        Trigger unrelated re-render (tick: {unrelatedTick})
      </button>
      <p>
        Click the button above and check the console:
        <br />
        - "Computing sortedItems..." should <strong>NOT</strong> log again
        (useMemo skips recomputation since `items` didn't change).
        <br />
        - "Rendering ExpensiveListItem" should <strong>NOT</strong> log again
        for any item (React.memo + stable useCallback reference means their
        props are unchanged).
      </p>

      <p>Selected: {selected ?? 'none'}</p>

      <ul>
        {sortedItems.map((label) => (
          <ExpensiveListItem key={label} label={label} onSelect={handleSelect} />
        ))}
      </ul>

      {/*
        WITHOUT these optimizations, the equivalent broken version would look
        like this — every render creates new references, defeating memo:

        const handleSelect = (label) => setSelected(label); // new fn every render
        const sortedItems = [...items].sort(); // recalculated every render

        Clicking "Trigger unrelated re-render" would then re-run the sort AND
        re-render every single ExpensiveListItem, none of which is necessary.
      */}
    </div>
  );
}
