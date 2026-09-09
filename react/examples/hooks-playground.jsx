// Drop this file into any React sandbox / CRA / Vite app (e.g. src/HooksPlayground.jsx)
// and render <HooksPlayground /> somewhere to see every core hook in action.
// No extra dependencies needed beyond "react" itself.

import React, {
  useState,
  useEffect,
  useRef,
  useReducer,
  useMemo,
  useCallback,
} from 'react';

// ---------------------------------------------------------------------------
// 1. useState — local component state
// WHY: function components need a way to hold values that persist across
// renders and trigger a re-render when changed. useState is the simplest tool.
// ---------------------------------------------------------------------------
function UseStateDemo() {
  const [count, setCount] = useState(0);

  return (
    <section>
      <h3>useState</h3>
      <p>Count: {count}</p>
      {/* functional updater form avoids stale-value bugs when clicking fast/twice */}
      <button onClick={() => setCount((c) => c + 1)}>+1</button>
      <button onClick={() => setCount((c) => c - 1)}>-1</button>
    </section>
  );
}

// ---------------------------------------------------------------------------
// 2. useEffect — side effects after render, with a dependency array
// WHY: things like subscriptions, timers, and DOM/browser API syncing need to
// happen AFTER React has committed the render to the screen, not during it.
// ---------------------------------------------------------------------------
function UseEffectDemo() {
  const [seconds, setSeconds] = useState(0);

  useEffect(() => {
    // Setup: start a timer.
    const id = setInterval(() => {
      // Functional updater — avoids the classic "stale closure" bug where the
      // interval callback would otherwise always see `seconds` from the render
      // it was created in (staying stuck at 1 forever).
      setSeconds((s) => s + 1);
    }, 1000);

    // Cleanup: runs when the component unmounts (or before the effect re-runs).
    // Without this, the interval would keep running forever -> memory leak.
    return () => clearInterval(id);
  }, []); // empty deps = run once on mount, clean up once on unmount

  useEffect(() => {
    // A second, separate effect — demonstrates that effects run for their
    // OWN reason, and re-run only when THEIR OWN dependencies change.
    document.title = `Elapsed: ${seconds}s`;
  }, [seconds]);

  return (
    <section>
      <h3>useEffect</h3>
      <p>Seconds elapsed: {seconds} (also updating the browser tab title)</p>
    </section>
  );
}

// ---------------------------------------------------------------------------
// 3. useRef — mutable value that does NOT cause a re-render, and DOM access
// WHY: sometimes you need to remember something across renders (like a
// previous value) or reach into the real DOM node, without triggering React's
// render cycle just because that value changed.
// ---------------------------------------------------------------------------
function UseRefDemo() {
  const inputRef = useRef(null); // will hold the actual <input> DOM node
  const renderCountRef = useRef(0); // a counter that survives renders silently

  renderCountRef.current += 1; // mutating this does NOT cause a re-render

  return (
    <section>
      <h3>useRef</h3>
      <input ref={inputRef} placeholder="Click the button to focus me" />
      <button onClick={() => inputRef.current.focus()}>Focus input</button>
      <p>
        This component has rendered {renderCountRef.current} time(s) — updating
        this ref does NOT itself cause a re-render (unlike state).
      </p>
    </section>
  );
}

// ---------------------------------------------------------------------------
// 4. useReducer — centralized, predictable state transitions
// WHY: once state logic has multiple related actions (increment, decrement,
// reset), a single reducer function is easier to read/test than many
// scattered setState calls, especially as complexity grows.
// ---------------------------------------------------------------------------
function counterReducer(state, action) {
  switch (action.type) {
    case 'increment':
      return { count: state.count + 1 };
    case 'decrement':
      return { count: state.count - 1 };
    case 'reset':
      return { count: action.payload };
    default:
      throw new Error(`Unknown action type: ${action.type}`);
  }
}

function UseReducerDemo() {
  const [state, dispatch] = useReducer(counterReducer, { count: 0 });

  return (
    <section>
      <h3>useReducer</h3>
      <p>Count: {state.count}</p>
      <button onClick={() => dispatch({ type: 'decrement' })}>-</button>
      <button onClick={() => dispatch({ type: 'increment' })}>+</button>
      <button onClick={() => dispatch({ type: 'reset', payload: 0 })}>
        Reset
      </button>
    </section>
  );
}

// ---------------------------------------------------------------------------
// 5. useMemo — memoize an expensive computed VALUE
// WHY: without memoizing, `expensiveCalculation` would re-run on EVERY render
// of this component, even when only the unrelated `unrelatedClicks` state
// changes. useMemo skips recomputation unless `number` itself changes.
// ---------------------------------------------------------------------------
function expensiveCalculation(number) {
  console.log('Running expensive calculation...');
  let result = 0;
  for (let i = 0; i < 1_000_000; i++) {
    result += number;
  }
  return result;
}

function UseMemoDemo() {
  const [number, setNumber] = useState(1);
  const [unrelatedClicks, setUnrelatedClicks] = useState(0);

  // Only recalculates when `number` changes -- clicking "unrelated" button
  // below will NOT re-trigger the console.log above.
  const result = useMemo(() => expensiveCalculation(number), [number]);

  return (
    <section>
      <h3>useMemo</h3>
      <p>
        Expensive result for {number}: {result}
      </p>
      <button onClick={() => setNumber((n) => n + 1)}>
        Increase number (triggers recalculation)
      </button>
      <button onClick={() => setUnrelatedClicks((c) => c + 1)}>
        Unrelated clicks: {unrelatedClicks} (does NOT trigger recalculation)
      </button>
    </section>
  );
}

// ---------------------------------------------------------------------------
// 6. useCallback — memoize a FUNCTION reference for a memoized child
// WHY: React.memo does a shallow prop comparison. Without useCallback, a new
// function is created every render, making the memoized child re-render
// anyway even though nothing it cares about actually changed.
// ---------------------------------------------------------------------------
const MemoizedButton = React.memo(function MemoizedButton({ onClick, label }) {
  console.log(`Rendering button: ${label}`);
  return <button onClick={onClick}>{label}</button>;
});

function UseCallbackDemo() {
  const [count, setCount] = useState(0);
  const [otherState, setOtherState] = useState(0);

  // Stable reference across renders (functional updater means we don't even
  // need `count` in the dependency array).
  const handleIncrement = useCallback(() => {
    setCount((c) => c + 1);
  }, []);

  return (
    <section>
      <h3>useCallback</h3>
      <p>Count: {count}</p>
      {/* Open the console: clicking "Re-render parent" will NOT log
          "Rendering button" again, because handleIncrement's reference is
          stable and MemoizedButton's props didn't actually change. */}
      <MemoizedButton onClick={handleIncrement} label="Increment (memoized)" />
      <button onClick={() => setOtherState((s) => s + 1)}>
        Re-render parent only ({otherState})
      </button>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Root component — render this one in your app
// ---------------------------------------------------------------------------
export default function HooksPlayground() {
  return (
    <div style={{ display: 'grid', gap: '24px', padding: '16px' }}>
      <h2>Hooks Playground</h2>
      <UseStateDemo />
      <UseEffectDemo />
      <UseRefDemo />
      <UseReducerDemo />
      <UseMemoDemo />
      <UseCallbackDemo />
    </div>
  );
}
