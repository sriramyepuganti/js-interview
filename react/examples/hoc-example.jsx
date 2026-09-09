// Drop this file into any React sandbox / CRA / Vite app (e.g. src/HocExample.jsx)
// and render <HocExample /> somewhere. No extra dependencies needed.

import React, { useState, useEffect } from 'react';

// ---------------------------------------------------------------------------
// APPROACH 1: Higher-Order Component (the "old way", pre-hooks)
// A function that takes a component and returns a NEW component wrapping it
// with extra behavior (in this case: a loading state).
// ---------------------------------------------------------------------------
function withLoading(WrappedComponent) {
  // Returns a brand new component. Note: this ADDS a wrapper to the
  // component tree (visible in React DevTools as an extra layer), and if two
  // different HOCs both injected a prop called e.g. "loading", they'd
  // silently collide.
  return function WithLoadingComponent({ isLoading, ...passThroughProps }) {
    if (isLoading) {
      return <p>Loading...</p>;
    }
    return <WrappedComponent {...passThroughProps} />;
  };
}

// A plain "dumb" component that doesn't know anything about loading state.
function UserList({ users }) {
  return (
    <ul>
      {users.map((u) => (
        <li key={u.id}>{u.name}</li>
      ))}
    </ul>
  );
}

// Wrap it with the HOC to get loading behavior "for free".
const UserListWithLoading = withLoading(UserList);

function HocDemo() {
  const [isLoading, setIsLoading] = useState(true);
  const [users, setUsers] = useState([]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setUsers([{ id: 1, name: 'Sriramsai' }, { id: 2, name: 'Alex' }]);
      setIsLoading(false);
    }, 1000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <section>
      <h3>Approach 1: HOC (withLoading)</h3>
      <UserListWithLoading isLoading={isLoading} users={users} />
    </section>
  );
}

// ---------------------------------------------------------------------------
// APPROACH 2: Equivalent custom hook version (the modern way)
// Same shared "loading" behavior, but expressed as a hook — no wrapper
// component added to the tree, no prop-name collision risk, and it's
// immediately obvious where `isLoading` comes from by reading the function
// body top to bottom.
// ---------------------------------------------------------------------------
function useLoadingSimulation(delay = 1000) {
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), delay);
    return () => clearTimeout(timer);
  }, [delay]);

  return isLoading;
}

function UserListWithHook() {
  const [users, setUsers] = useState([]);
  const isLoading = useLoadingSimulation(1000);

  useEffect(() => {
    // In a real app this would be a fetch(); simulated here for the demo.
    const timer = setTimeout(() => {
      setUsers([{ id: 1, name: 'Sriramsai' }, { id: 2, name: 'Alex' }]);
    }, 1000);
    return () => clearTimeout(timer);
  }, []);

  if (isLoading) return <p>Loading...</p>;
  return (
    <ul>
      {users.map((u) => (
        <li key={u.id}>{u.name}</li>
      ))}
    </ul>
  );
}

// ---------------------------------------------------------------------------
// Root component
// ---------------------------------------------------------------------------
export default function HocExample() {
  return (
    <div style={{ padding: 16, display: 'grid', gap: 16 }}>
      <h2>HOC vs Custom Hook (withLoading)</h2>
      <HocDemo />
      <section>
        <h3>Approach 2: Custom hook (useLoadingSimulation) — no wrapper component</h3>
        <UserListWithHook />
      </section>
      <p>
        Both approaches produce the same visible result. The HOC version adds
        an extra "WithLoadingComponent" layer to the React tree in DevTools;
        the hook version doesn't add anything — it's just a function call
        inside the component that already needed the data.
      </p>
    </div>
  );
}
