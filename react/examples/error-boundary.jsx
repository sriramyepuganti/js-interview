// Drop this file into any React sandbox / CRA / Vite app (e.g. src/ErrorBoundaryExample.jsx)
// and render <ErrorBoundaryExample /> somewhere. No extra dependencies needed
// (this uses a hand-written class, matching how the underlying mechanism
// actually works — in real projects, prefer the `react-error-boundary`
// npm package for a hook-friendly API, but it wraps this exact same idea).

import React from 'react';

// ---------------------------------------------------------------------------
// ErrorBoundary MUST be a class component. There is currently no hook
// equivalent for `getDerivedStateFromError` / `componentDidCatch` — this is
// one of the few remaining cases where you're required to write a class.
// ---------------------------------------------------------------------------
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  // Called during the "render" phase when a descendant throws.
  // Return a state update to trigger the fallback UI on the next render.
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  // Called during the "commit" phase — safe to run side effects here, like
  // logging to an error-reporting service (Sentry, Datadog, etc).
  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    // logErrorToMyService(error, errorInfo); // in a real app
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ border: '1px solid red', padding: 12 }}>
          <h3>Something went wrong.</h3>
          <p>{this.state.error?.message}</p>
          <button onClick={() => this.setState({ hasError: false, error: null })}>
            Try again
          </button>
        </div>
      );
    }
    // No error: just render children normally.
    return this.props.children;
  }
}

// ---------------------------------------------------------------------------
// A component that throws once a certain condition is met, to demonstrate
// the boundary catching it.
// ---------------------------------------------------------------------------
function BuggyCounter() {
  const [count, setCount] = React.useState(0);

  if (count === 3) {
    // Simulates a real rendering error. NOTE: an error boundary only catches
    // errors thrown DURING RENDERING (or in lifecycle methods) of its
    // children — not errors inside event handlers directly (that's why we
    // throw here, inside render, rather than inside the onClick handler).
    throw new Error('Boom! Counter reached 3.');
  }

  return (
    <button onClick={() => setCount((c) => c + 1)}>
      Clicked {count} times (throws at 3)
    </button>
  );
}

// ---------------------------------------------------------------------------
// IMPORTANT LIMITATION (documented, not demoed live, to keep this simple):
// Error boundaries do NOT catch errors thrown inside event handlers:
//
//   function BuggyButton() {
//     return <button onClick={() => { throw new Error('nope'); }}>Click</button>;
//   }
//
// This error would NOT be caught by ErrorBoundary — it would just show up
// as an uncaught error in the console. For event-handler/async errors, use
// a normal try/catch, or the `useErrorBoundary()` hook from the
// `react-error-boundary` library, which can manually trigger the fallback.
// ---------------------------------------------------------------------------

export default function ErrorBoundaryExample() {
  return (
    <div style={{ padding: 16 }}>
      <h2>Error Boundary Example</h2>
      <p>Each counter below is wrapped in its own error boundary, so if one
        crashes, the other keeps working.</p>
      <ErrorBoundary>
        <BuggyCounter />
      </ErrorBoundary>
      <hr />
      <ErrorBoundary>
        <BuggyCounter />
      </ErrorBoundary>
    </div>
  );
}
